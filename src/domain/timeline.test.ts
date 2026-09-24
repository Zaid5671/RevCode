import { describe, expect, it } from "vitest";
import { validateTimeline, type Timeline } from "./timeline";

const TODAY = "2026-09-24";

const timeline = (
  solvedOn: string,
  r1: string | null = null,
  r2: string | null = null,
  r3: string | null = null,
): Timeline => ({ solvedOn, completed: [r1, r2, r3] });

describe("validateTimeline: rule 1, dates in order", () => {
  it.each([
    ["solved only", timeline("2026-09-01")],
    [
      "strictly increasing",
      timeline("2026-09-01", "2026-09-04", "2026-09-11", "2026-09-20"),
    ],
    [
      "all on the same day",
      timeline("2026-09-01", "2026-09-01", "2026-09-01", "2026-09-01"),
    ],
  ])("accepts %s", (_, value) => {
    expect(
      validateTimeline(value, { previous: null, today: TODAY }),
    ).toBeNull();
  });

  it.each([
    ["R1 before the solve", timeline("2026-09-05", "2026-09-04"), 1],
    ["R2 before R1", timeline("2026-09-01", "2026-09-10", "2026-09-09"), 2],
    [
      "R3 before R2",
      timeline("2026-09-01", "2026-09-02", "2026-09-10", "2026-09-09"),
      3,
    ],
  ] as const)("rejects %s", (_, value, revision) => {
    expect(
      validateTimeline(value, { previous: null, today: TODAY }),
    ).toMatchObject({
      rule: "order",
      revision,
    });
  });
});

describe("validateTimeline: rule 2, no skipped revision", () => {
  it.each([
    ["R2 without R1", timeline("2026-09-01", null, "2026-09-05"), 2],
    [
      "R3 without R2",
      timeline("2026-09-01", "2026-09-02", null, "2026-09-05"),
      3,
    ],
    ["R3 alone", timeline("2026-09-01", null, null, "2026-09-05"), 3],
  ] as const)("rejects %s", (_, value, revision) => {
    expect(
      validateTimeline(value, { previous: null, today: TODAY }),
    ).toMatchObject({
      rule: "skipped",
      revision,
    });
  });
});

describe("validateTimeline: rule 3, no future dates written in this request", () => {
  const TOMORROW = "2026-09-25";

  it("accepts a solve dated today", () => {
    expect(
      validateTimeline(timeline(TODAY), { previous: null, today: TODAY }),
    ).toBeNull();
  });

  it("rejects a solve dated tomorrow", () => {
    expect(
      validateTimeline(timeline(TOMORROW), { previous: null, today: TODAY }),
    ).toMatchObject({ rule: "future", revision: null });
  });

  it("rejects completing a revision tomorrow", () => {
    expect(
      validateTimeline(timeline("2026-09-20", TOMORROW), {
        previous: timeline("2026-09-20"),
        today: TODAY,
      }),
    ).toMatchObject({ rule: "future", revision: 1 });
  });

  it("does not re-check stored future dates (e.g. after a time zone change)", () => {
    const stored = timeline(TOMORROW, TOMORROW);
    expect(
      validateTimeline(stored, { previous: stored, today: TODAY }),
    ).toBeNull();
  });

  it("checks only the date being edited, not other stored future dates", () => {
    expect(
      validateTimeline(timeline("2026-09-23", TOMORROW), {
        previous: timeline("2026-09-20", TOMORROW),
        today: TODAY,
      }),
    ).toBeNull();
  });
});

describe("validateTimeline: rule 4, editing a completed revision", () => {
  const previous = timeline("2026-09-01", "2026-09-04", "2026-09-11");

  it("accepts a new date that keeps the order", () => {
    expect(
      validateTimeline(timeline("2026-09-01", "2026-09-06", "2026-09-11"), {
        previous,
        today: TODAY,
      }),
    ).toBeNull();
  });

  it("rejects a new date that breaks the order", () => {
    expect(
      validateTimeline(timeline("2026-09-01", "2026-09-12", "2026-09-11"), {
        previous,
        today: TODAY,
      }),
    ).toMatchObject({ rule: "order", revision: 2 });
  });

  it("rejects moving the solve date after a completed revision", () => {
    expect(
      validateTimeline(timeline("2026-09-05", "2026-09-04", "2026-09-11"), {
        previous,
        today: TODAY,
      }),
    ).toMatchObject({ rule: "order", revision: 1 });
  });
});

describe("validateTimeline: rule 5, undo only the latest revision", () => {
  const previous = timeline("2026-09-01", "2026-09-04", "2026-09-11");

  it("accepts undoing the latest revision", () => {
    expect(
      validateTimeline(timeline("2026-09-01", "2026-09-04"), {
        previous,
        today: TODAY,
      }),
    ).toBeNull();
  });

  it("rejects undoing an earlier revision", () => {
    expect(
      validateTimeline(timeline("2026-09-01", null, "2026-09-11"), {
        previous,
        today: TODAY,
      }),
    ).toMatchObject({ rule: "undo_not_latest", revision: 1 });
  });

  describe("with all three revisions done", () => {
    const allDone = timeline(
      "2026-09-01",
      "2026-09-04",
      "2026-09-11",
      "2026-09-20",
    );

    it("accepts undoing R3", () => {
      expect(
        validateTimeline(timeline("2026-09-01", "2026-09-04", "2026-09-11"), {
          previous: allDone,
          today: TODAY,
        }),
      ).toBeNull();
    });

    it("rejects undoing R2 while R3 is done", () => {
      expect(
        validateTimeline(
          timeline("2026-09-01", "2026-09-04", null, "2026-09-20"),
          {
            previous: allDone,
            today: TODAY,
          },
        ),
      ).toMatchObject({ rule: "undo_not_latest", revision: 2 });
    });

    it("rejects undoing R2 and R3 in one step", () => {
      expect(
        validateTimeline(timeline("2026-09-01", "2026-09-04"), {
          previous: allDone,
          today: TODAY,
        }),
      ).toMatchObject({ rule: "undo_not_latest", revision: 2 });
    });
  });
});
