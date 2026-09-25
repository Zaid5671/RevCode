import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/client/queries";
import { DEFAULT_GAPS, type Gaps } from "@/domain/gaps";
import type { GapsResponse } from "@/domain/schemas";
import { GapsEditor } from "./GapsEditor";
import { apiError, renderWithClient, stubApi, type ApiCall } from "./testUtils";

const CUSTOM: Gaps = { 1: [2, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] };

function renderEditor(
  gaps: GapsResponse = { gaps: DEFAULT_GAPS, isDefault: true },
) {
  return renderWithClient(<GapsEditor />, {
    seed: (client) => client.setQueryData(queryKeys.gaps, gaps),
  });
}

const box = (revision: string, confidence: string) =>
  screen.getByRole("textbox", { name: `${revision} days for ${confidence}` });
const saveButton = () => screen.getByRole("button", { name: "Save" });

describe("GapsEditor", () => {
  it("shows the gaps, the days from solving, and that they are the defaults", () => {
    stubApi(() => undefined);
    renderEditor();

    expect(box("R1", "2 · Okay")).toHaveValue("3");
    expect(box("R3", "3 · Solid")).toHaveValue("30");
    const okay = screen.getByRole("row", { name: /2 · Okay/ });
    expect(within(okay).getAllByText("day 3 · 10 · 24")[0]).toBeVisible();
    expect(screen.getByText("Defaults")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Reset to defaults" }),
    ).not.toBeInTheDocument();
  });

  it("flags an invalid box and won't save until it is fixed", async () => {
    stubApi(() => undefined);
    const { user } = renderEditor();

    await user.clear(box("R2", "1 · Shaky"));
    await user.type(box("R2", "1 · Shaky"), "181");

    expect(box("R2", "1 · Shaky")).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("Each gap is a whole number of days from 1 to 180."),
    ).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    const shaky = screen.getByRole("row", { name: /1 · Shaky/ });
    expect(within(shaky).getAllByText("day 1 · – · –")[0]).toBeVisible();

    await user.clear(box("R2", "1 · Shaky"));
    await user.type(box("R2", "1 · Shaky"), "6");
    expect(
      screen.queryByText("Each gap is a whole number of days from 1 to 180."),
    ).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("saves the grid and then shows Saved and Custom", async () => {
    const calls = stubApi(({ method, body }) =>
      method === "PUT"
        ? {
            body: { gaps: (body as { gaps: Gaps }).gaps, isDefault: false },
          }
        : undefined,
    );
    const { user } = renderEditor();

    await user.clear(box("R1", "1 · Shaky"));
    await user.type(box("R1", "1 · Shaky"), "2");
    expect(screen.getByRole("row", { name: /1 · Shaky/ })).toHaveTextContent(
      "day 2 · 6 · 16",
    );
    await user.click(saveButton());

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls).toContainEqual<ApiCall>({
      method: "PUT",
      path: "/api/gaps",
      body: { gaps: CUSTOM },
    });
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.type(box("R1", "1 · Shaky"), "1");
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("shows why a save failed, and keeps the typed values", async () => {
    stubApi(({ method }) =>
      method === "PUT"
        ? apiError(400, "VALIDATION_ERROR", "Gaps must be 1 to 180 days.")
        : undefined,
    );
    const { user } = renderEditor();

    await user.clear(box("R1", "1 · Shaky"));
    await user.type(box("R1", "1 · Shaky"), "2");
    await user.click(saveButton());

    expect(
      await screen.findByText("Gaps must be 1 to 180 days."),
    ).toBeInTheDocument();
    expect(box("R1", "1 · Shaky")).toHaveValue("2");
    expect(saveButton()).toBeEnabled();
  });

  it("resets custom gaps to the defaults after asking", async () => {
    const calls = stubApi(({ method }) =>
      method === "DELETE"
        ? { body: { gaps: DEFAULT_GAPS, isDefault: true } }
        : undefined,
    );
    const { user } = renderEditor({ gaps: CUSTOM, isDefault: false });
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(box("R1", "1 · Shaky")).toHaveValue("2");

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "Reset your gaps to the defaults? Upcoming due dates will move.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Reset" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(calls).toContainEqual<ApiCall>({
      method: "DELETE",
      path: "/api/gaps",
      body: undefined,
    });
    expect(box("R1", "1 · Shaky")).toHaveValue("1");
    expect(screen.getByText("Defaults")).toBeInTheDocument();
  });

  it("opens and closes the reasoning behind the defaults", async () => {
    stubApi(() => undefined);
    const { user } = renderEditor();
    const reasoning = screen.getByText(/each gap is roughly 2–4 times/i);

    expect(reasoning).not.toBeVisible();
    await user.click(screen.getByText("Why these numbers?"));
    expect(reasoning).toBeVisible();
  });

  it("says when the gaps can't be loaded, and tries again", async () => {
    let fail = true;
    // A 4xx isn't retried, so the failure shows at once.
    const calls = stubApi(() =>
      fail
        ? apiError(404, "NOT_FOUND", "Not found.")
        : { body: { gaps: DEFAULT_GAPS, isDefault: true } },
    );
    const { user } = renderWithClient(<GapsEditor />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your settings.");
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Defaults")).toBeInTheDocument();
    expect(calls.every((c) => c.path === "/api/gaps")).toBe(true);
  });
});
