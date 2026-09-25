import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditDrawer } from "./EditDrawer";
import {
  TODAY,
  apiError,
  entry,
  problem,
  renderWithClient,
  stubApi,
} from "./testUtils";

// R1 and R2 done, R3 due: Two Sum, confidence 2.
const ENTRY = entry(1, {
  solvedOn: "2026-09-01",
  completed: ["2026-09-04", "2026-09-11", null],
});

function setUp(reply: Parameters<typeof stubApi>[0] = () => undefined) {
  const calls = stubApi((call) =>
    call.method === "GET"
      ? { body: { today: TODAY, entries: [ENTRY] } }
      : reply(call),
  );
  const onClose = vi.fn();
  const rendered = renderWithClient(
    <EditDrawer
      problem={problem()}
      entry={ENTRY}
      today={TODAY}
      onClose={onClose}
    />,
    { progress: [ENTRY] },
  );
  return { calls, onClose, ...rendered };
}

const line = (revision: string) =>
  screen.getByText(revision, { selector: "span" }).closest("li")!;

describe("EditDrawer", () => {
  it("offers undo only on the latest completed revision", () => {
    setUp();
    expect(within(line("R2")).getByRole("button", { name: "Undo R2" }));
    expect(
      within(line("R1")).queryByRole("button", { name: "Undo R1" }),
    ).not.toBeInTheDocument();
    expect(
      within(line("R3")).getByRole("button", { name: "Mark R3 done" }),
    ).toBeInTheDocument();
  });

  it("shows the server's timeline message under the revision being edited", async () => {
    const { calls, user } = setUp(() =>
      apiError(
        409,
        "TIMELINE_CONFLICT",
        "Revision 1 can't be after revision 2.",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Edit R1 date" }));
    const date = screen.getByLabelText("R1 done on");
    const r1 = date.closest("li")!;
    await user.clear(date);
    await user.type(date, "2026-09-12");
    await user.click(within(r1).getByRole("button", { name: "Save" }));

    expect(await within(r1).findByRole("alert")).toHaveTextContent(
      "Revision 1 can't be after revision 2.",
    );
    expect(calls).toContainEqual({
      method: "PUT",
      path: "/api/progress/1/revisions/1",
      body: { completedOn: "2026-09-12" },
    });
  });

  it("unmarks only after the confirmation, then closes", async () => {
    const { calls, onClose, user } = setUp((call) =>
      call.method === "DELETE" ? { status: 204 } : undefined,
    );

    await user.click(
      screen.getByRole("button", { name: "Unmark solved (your note is kept)" }),
    );
    expect(
      screen.getByText("Unmark Two Sum as solved? Your note is kept."),
    ).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "DELETE")).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Unmark" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls).toContainEqual({
      method: "DELETE",
      path: "/api/progress/1",
      body: undefined,
    });
  });

  it("keeps the panel open when the confirmation is cancelled", async () => {
    const { onClose, user } = setUp();

    await user.click(
      screen.getByRole("button", { name: "Unmark solved (your note is kept)" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByText("Unmark Two Sum as solved? Your note is kept."),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
