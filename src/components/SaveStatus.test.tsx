import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceSelect } from "./ConfidencePicker";
import { SaveStatus } from "./SaveStatus";
import { TODAY, apiError, entry, renderWithClient, stubApi } from "./testUtils";

const ENTRY = entry(1, { solvedOn: "2026-09-20", confidence: 2 });

type Reply = ReturnType<Parameters<typeof stubApi>[0]>;

/** A confidence select (one kind of save) beside the header's save status. */
function setUp(replyToSave: (attempt: number) => Reply) {
  let attempt = 0;
  const calls = stubApi((call) => {
    if (call.method === "GET") {
      return { body: { today: TODAY, entries: [ENTRY] } };
    }
    attempt += 1;
    return replyToSave(attempt);
  });
  const rendered = renderWithClient(
    <>
      <SaveStatus />
      <ConfidenceSelect problemId={1} title="Two Sum" confidence={2} />
    </>,
    { progress: [ENTRY] },
  );
  const saves = () => calls.filter((c) => c.method === "PATCH");
  return { saves, ...rendered };
}

const select = () => screen.getByLabelText("Confidence for Two Sum");
const status = () => screen.getByRole("status");

describe("SaveStatus", () => {
  it("offers a retry after a network failure, and the retry sends the same save", async () => {
    const { saves, user } = setUp((attempt) =>
      attempt === 1 ? "network-error" : { body: { ...ENTRY, confidence: 3 } },
    );

    await user.selectOptions(select(), "3");
    await waitFor(() => expect(status()).toHaveTextContent("Couldn't save"));
    expect(screen.getByText("Not saved")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() => expect(status()).toHaveTextContent("Saved"));
    expect(saves()).toHaveLength(2);
    expect(saves()[1]).toEqual(saves()[0]);
  });

  it("shows a refused save as failed, without a retry", async () => {
    const { user } = setUp(() =>
      apiError(404, "NOT_FOUND", "There is no such problem."),
    );

    await user.selectOptions(select(), "3");

    await waitFor(() => expect(status()).toHaveTextContent("Couldn't save"));
    expect(
      screen.queryByRole("button", { name: "retry" }),
    ).not.toBeInTheDocument();
  });

  it("drops a failed save once a newer save of the same problem succeeds", async () => {
    const { saves, user } = setUp((attempt) =>
      attempt === 1 ? "network-error" : { body: { ...ENTRY, confidence: 1 } },
    );

    await user.selectOptions(select(), "3");
    await waitFor(() => expect(status()).toHaveTextContent("Couldn't save"));
    await user.selectOptions(select(), "1");

    await waitFor(() => expect(status()).toHaveTextContent("Saved"));
    expect(
      screen.queryByRole("button", { name: "retry" }),
    ).not.toBeInTheDocument();
    expect(saves().map((c) => c.body)).toEqual([
      { confidence: 3 },
      { confidence: 1 },
    ]);
  });
});
