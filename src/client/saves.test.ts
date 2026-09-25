import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { SaveTracker, isRetryable } from "./saves";

const network = () =>
  new ApiError(0, "NETWORK_ERROR", "Couldn't reach RevCode.");
const server = () => new ApiError(500, "INTERNAL_ERROR", "Something broke.");
const refused = () =>
  new ApiError(409, "TIMELINE_CONFLICT", "These dates are out of order.");

describe("isRetryable", () => {
  it.each([
    ["a network failure", network(), true],
    ["a 500", server(), true],
    ["a 503", new ApiError(503, "INTERNAL_ERROR", "Down."), true],
    ["a 400", new ApiError(400, "VALIDATION_ERROR", "Bad."), false],
    ["a 404", new ApiError(404, "NOT_FOUND", "Not found."), false],
    ["a 409 timeline conflict", refused(), false],
    ["a 409 conflict", new ApiError(409, "CONFLICT", "Conflict."), false],
    // The save went through; only the answer was odd. Re-sending isn't the fix.
    ["a bad response", new ApiError(200, "BAD_RESPONSE", "Odd."), false],
    ["an error that isn't an ApiError", new Error("bug"), false],
  ])("%s → %s", (_, error, expected) => {
    expect(isRetryable(error)).toBe(expected);
  });
});

describe("SaveTracker", () => {
  it("starts as saved, with nothing to retry", () => {
    expect(new SaveTracker().getSnapshot()).toEqual({
      state: "saved",
      canRetry: false,
    });
  });

  it("shows saving while a save is pending, then saved", () => {
    const tracker = new SaveTracker();
    tracker.started("p:1", 1);
    expect(tracker.getSnapshot().state).toBe("saving");
    tracker.succeeded("p:1", 1);
    expect(tracker.getSnapshot()).toEqual({ state: "saved", canRetry: false });
  });

  it("offers a retry for a network or server failure", () => {
    const tracker = new SaveTracker();
    tracker.started("p:1", 1);
    tracker.failed("p:1", 1, network(), vi.fn());
    expect(tracker.getSnapshot()).toEqual({ state: "failed", canRetry: true });
  });

  it("shows a refused save as failed, without a retry", () => {
    const tracker = new SaveTracker();
    tracker.started("p:1", 1);
    tracker.failed("p:1", 1, refused(), vi.fn());
    expect(tracker.getSnapshot()).toEqual({ state: "failed", canRetry: false });
  });

  it("keeps showing a failure after another problem saves", () => {
    const tracker = new SaveTracker();
    tracker.started("p:1", 1);
    tracker.failed("p:1", 1, network(), vi.fn());
    tracker.started("p:2", 2);
    tracker.succeeded("p:2", 2);
    expect(tracker.getSnapshot()).toEqual({ state: "failed", canRetry: true });
  });

  it("shows saving while anything is pending, even with a failure elsewhere", () => {
    const tracker = new SaveTracker();
    tracker.started("p:1", 1);
    tracker.failed("p:1", 1, network(), vi.fn());
    tracker.started("p:2", 2);
    expect(tracker.getSnapshot().state).toBe("saving");
  });

  it("drops a failure once a newer save of the same problem starts", () => {
    const tracker = new SaveTracker();
    const retry = vi.fn();
    tracker.started("p:1", 1);
    tracker.failed("p:1", 1, network(), retry);
    tracker.started("p:1", 2);
    tracker.succeeded("p:1", 2);
    expect(tracker.getSnapshot()).toEqual({ state: "saved", canRetry: false });
    tracker.retry();
    expect(retry).not.toHaveBeenCalled();
  });

  it("ignores the result of a save that a newer one of the same problem replaced", () => {
    const tracker = new SaveTracker();
    const retry = vi.fn();
    tracker.started("p:1", 1);
    tracker.started("p:1", 2);
    tracker.failed("p:1", 1, network(), retry);
    expect(tracker.getSnapshot().state).toBe("saving");
    tracker.succeeded("p:1", 2);
    expect(tracker.getSnapshot()).toEqual({ state: "saved", canRetry: false });
    tracker.retry();
    expect(retry).not.toHaveBeenCalled();
  });

  it("retries every retryable failure once, and never a refused one", () => {
    const tracker = new SaveTracker();
    const retryA = vi.fn();
    const retryB = vi.fn();
    const retryRefused = vi.fn();
    tracker.failed("p:1", 1, network(), retryA);
    tracker.failed("p:2", 2, server(), retryB);
    tracker.failed("p:3", 3, refused(), retryRefused);

    tracker.retry();
    tracker.retry();

    expect(retryA).toHaveBeenCalledTimes(1);
    expect(retryB).toHaveBeenCalledTimes(1);
    expect(retryRefused).not.toHaveBeenCalled();
  });

  it("dismisses a refused failure, but not a retryable or pending one", () => {
    const tracker = new SaveTracker();
    tracker.failed("p:1", 1, refused(), vi.fn());
    tracker.failed("p:2", 2, network(), vi.fn());
    tracker.started("p:3", 3);

    tracker.dismissRefused("p:1");
    tracker.dismissRefused("p:2");
    tracker.dismissRefused("p:3");
    tracker.succeeded("p:3", 3);

    expect(tracker.getSnapshot()).toEqual({ state: "failed", canRetry: true });
    tracker.dismissRefused("p:2");
    expect(tracker.getSnapshot()).toEqual({ state: "failed", canRetry: true });
  });

  it("notifies subscribers on change and keeps the snapshot stable otherwise", () => {
    const tracker = new SaveTracker();
    const listener = vi.fn();
    const unsubscribe = tracker.subscribe(listener);
    const before = tracker.getSnapshot();
    expect(tracker.getSnapshot()).toBe(before);

    tracker.started("p:1", 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(tracker.getSnapshot()).not.toBe(before);

    unsubscribe();
    tracker.succeeded("p:1", 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
