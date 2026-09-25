import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/client/queries";
import type { ProgressListResponse } from "@/domain/schemas";
import { SolveForm } from "./SolveForm";
import {
  TODAY,
  apiError,
  entry,
  problem,
  renderWithClient,
  stubApi,
} from "./testUtils";

const GAPS = {
  gaps: { 1: [1, 4, 10], 2: [4, 7, 14], 3: [5, 14, 30] },
  isDefault: false,
};

function setUp(solveReply: Parameters<typeof stubApi>[0] = () => undefined) {
  const calls = stubApi((call) => {
    if (call.path === "/api/gaps") return { body: GAPS };
    if (call.path === "/api/progress" && call.method === "GET") {
      return { body: { today: TODAY, entries: [] } };
    }
    return solveReply(call);
  });
  const onClose = vi.fn();
  const rendered = renderWithClient(
    <SolveForm problem={problem()} today={TODAY} onClose={onClose} />,
    { progress: [] },
  );
  return { calls, onClose, ...rendered };
}

describe("SolveForm", () => {
  it("defaults to the server's today and shows each first revision from the user's gaps", async () => {
    setUp();
    const date = screen.getByLabelText("Solved on");
    expect(date).toHaveValue(TODAY);
    expect(date).toHaveAttribute("max", TODAY);
    expect(
      await screen.findByRole("button", { name: "2 · Okay, R1 in 4 days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "1 · Shaky, R1 tomorrow" }),
    ).toBeInTheDocument();
  });

  it("saves on one confidence click, then closes", async () => {
    const saved = entry(1, { solvedOn: TODAY, confidence: 3 });
    const { calls, onClose, user, client } = setUp((call) =>
      call.method === "PUT" ? { body: saved } : undefined,
    );

    await user.click(screen.getByRole("button", { name: /3 · Solid/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(calls).toContainEqual({
      method: "PUT",
      path: "/api/progress/1",
      body: { solvedOn: TODAY, confidence: 3 },
    });
    expect(
      client.getQueryData<ProgressListResponse>(queryKeys.progress)?.entries,
    ).toContainEqual(saved);
  });

  it("stays open and says why when the save is refused", async () => {
    const { onClose, user } = setUp(() =>
      apiError(409, "TIMELINE_CONFLICT", "That date is in the future."),
    );

    await user.click(screen.getByRole("button", { name: /2 · Okay/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That date is in the future.",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /2 · Okay/ })).toBeEnabled();
  });

  it("blocks a date after today without sending anything", async () => {
    const { calls, user } = setUp();
    const date = screen.getByLabelText("Solved on");

    await user.clear(date);
    await user.type(date, "2026-09-24");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pick today or an earlier date.",
    );
    expect(screen.getByRole("button", { name: /2 · Okay/ })).toBeDisabled();
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("saves nothing when cancelled", async () => {
    const { calls, onClose, user } = setUp();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
});
