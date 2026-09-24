import { describe, expect, it } from "vitest";
import { DEFAULT_GAPS } from "./gaps";
import { bucketFor, computeSchedule } from "./schedule";

const TODAY = "2026-09-24";

describe("bucketFor", () => {
  it.each([
    ["2026-08-01", "overdue"],
    ["2026-09-23", "overdue"],
    ["2026-09-24", "due_today"],
    ["2026-09-25", "due_tomorrow"],
    ["2026-09-26", "next_7_days"],
    ["2026-10-01", "next_7_days"],
    ["2026-10-02", "later"],
    ["2027-01-01", "later"],
  ])("due %s → %s", (due, expected) => {
    expect(bucketFor(due, TODAY)).toBe(expected);
  });

  it("counts across a month end", () => {
    expect(bucketFor("2026-10-07", "2026-09-30")).toBe("next_7_days");
    expect(bucketFor("2026-10-08", "2026-09-30")).toBe("later");
    expect(bucketFor("2026-10-01", "2026-09-30")).toBe("due_tomorrow");
  });
});

const SOLVED = "2026-09-01";
const NONE = [null, null, null] as const;

/** `[status, date]` for each of the three revisions, for compact expectations. */
const summary = (schedule: ReturnType<typeof computeSchedule>) =>
  schedule.revisions.map((r) => [r.status, r.date]);

describe("computeSchedule: fresh solve with default gaps", () => {
  // Days from solve if all on time (PLAN.md §4.1): 1/5/15, 3/10/24, 5/19/49.
  it.each([
    [1, "due_tomorrow", "2026-09-02", "2026-09-06", "2026-09-16"],
    [2, "next_7_days", "2026-09-04", "2026-09-11", "2026-09-25"],
    [3, "next_7_days", "2026-09-06", "2026-09-20", "2026-10-20"],
  ] as const)("confidence %i", (confidence, r1Status, r1, r2, r3) => {
    const schedule = computeSchedule(
      { solvedOn: SOLVED, confidence, completed: NONE },
      DEFAULT_GAPS,
      SOLVED,
    );
    expect(summary(schedule)).toEqual([
      [r1Status, r1],
      ["projected", r2],
      ["projected", r3],
    ]);
    expect(schedule.next).toEqual({ number: 1, status: r1Status, date: r1 });
    expect(schedule.isComplete).toBe(false);
  });
});

describe("computeSchedule: progress through the cycle", () => {
  const schedule = (
    completed: readonly [string | null, string | null, string | null],
    today: string,
  ) =>
    computeSchedule(
      { solvedOn: SOLVED, confidence: 2, completed },
      DEFAULT_GAPS,
      today,
    );

  it("R1 on time: R2 is due 7 days later, R3 projected 14 after that", () => {
    expect(summary(schedule(["2026-09-04", null, null], "2026-09-04"))).toEqual(
      [
        ["done", "2026-09-04"],
        ["next_7_days", "2026-09-11"],
        ["projected", "2026-09-25"],
      ],
    );
  });

  it("all three on time completes the cycle", () => {
    const result = schedule(
      ["2026-09-04", "2026-09-11", "2026-09-25"],
      "2026-09-30",
    );
    expect(summary(result)).toEqual([
      ["done", "2026-09-04"],
      ["done", "2026-09-11"],
      ["done", "2026-09-25"],
    ]);
    expect(result.next).toBeNull();
    expect(result.isComplete).toBe(true);
  });

  it("R1 late shifts R2 and R3 later", () => {
    expect(summary(schedule(["2026-09-08", null, null], "2026-09-08"))).toEqual(
      [
        ["done", "2026-09-08"],
        ["next_7_days", "2026-09-15"],
        ["projected", "2026-09-29"],
      ],
    );
  });

  it("R1 early shifts R2 and R3 earlier", () => {
    expect(summary(schedule(["2026-09-02", null, null], "2026-09-02"))).toEqual(
      [
        ["done", "2026-09-02"],
        ["next_7_days", "2026-09-09"],
        ["projected", "2026-09-23"],
      ],
    );
  });

  it("allows revisions on the solve day and on the same day as each other", () => {
    const result = computeSchedule(
      { solvedOn: SOLVED, confidence: 1, completed: [SOLVED, SOLVED, null] },
      DEFAULT_GAPS,
      SOLVED,
    );
    expect(summary(result)).toEqual([
      ["done", SOLVED],
      ["done", SOLVED],
      ["later", "2026-09-11"],
    ]);
  });

  it("an overdue R1 makes projections start from today", () => {
    const result = computeSchedule(
      { solvedOn: SOLVED, confidence: 1, completed: NONE },
      DEFAULT_GAPS,
      "2026-09-10",
    );
    expect(summary(result)).toEqual([
      ["overdue", "2026-09-02"],
      ["projected", "2026-09-14"],
      ["projected", "2026-09-24"],
    ]);
  });

  it("an overdue R2 makes the R3 projection start from today", () => {
    expect(summary(schedule(["2026-09-04", null, null], "2026-09-20"))).toEqual(
      [
        ["done", "2026-09-04"],
        ["overdue", "2026-09-11"],
        ["projected", "2026-10-04"],
      ],
    );
  });

  it("an R1 due today stays the anchor for the projections", () => {
    expect(summary(schedule(NONE, "2026-09-04"))).toEqual([
      ["due_today", "2026-09-04"],
      ["projected", "2026-09-11"],
      ["projected", "2026-09-25"],
    ]);
  });

  it.each([
    ["2026-09-11", "later"],
    ["2026-09-30", "overdue"],
  ] as const)(
    "R3 next: today %s → %s, due 14 days after R2",
    (today, status) => {
      const result = schedule(["2026-09-04", "2026-09-11", null], today);
      expect(result.next).toEqual({ number: 3, status, date: "2026-09-25" });
      expect(result.isComplete).toBe(false);
    },
  );
});

const CUSTOM_GAPS = {
  1: [2, 2, 2],
  2: [10, 20, 30],
  3: [60, 90, 180],
} as const satisfies typeof DEFAULT_GAPS;

describe("computeSchedule: custom gaps", () => {
  it("uses the user's gaps for the problem's confidence", () => {
    const result = computeSchedule(
      { solvedOn: SOLVED, confidence: 2, completed: NONE },
      CUSTOM_GAPS,
      SOLVED,
    );
    expect(summary(result)).toEqual([
      ["later", "2026-09-11"],
      ["projected", "2026-10-01"],
      ["projected", "2026-10-31"],
    ]);
  });
});

describe("computeSchedule: changing confidence or gaps recalculates pending dates only", () => {
  // Each case: the same stored facts under two settings; completed dates must not move.
  it.each([
    [
      "confidence 1 → 3, before any revision",
      { confidence: 1, gaps: DEFAULT_GAPS },
      { confidence: 3, gaps: DEFAULT_GAPS },
      NONE,
      "2026-09-01",
      [
        ["due_tomorrow", "2026-09-02"],
        ["projected", "2026-09-06"],
        ["projected", "2026-09-16"],
      ],
      [
        ["next_7_days", "2026-09-06"],
        ["projected", "2026-09-20"],
        ["projected", "2026-10-20"],
      ],
    ],
    [
      "confidence 1 → 3, mid-cycle",
      { confidence: 1, gaps: DEFAULT_GAPS },
      { confidence: 3, gaps: DEFAULT_GAPS },
      ["2026-09-03", null, null],
      "2026-09-03",
      [
        ["done", "2026-09-03"],
        ["next_7_days", "2026-09-07"],
        ["projected", "2026-09-17"],
      ],
      [
        ["done", "2026-09-03"],
        ["later", "2026-09-17"],
        ["projected", "2026-10-17"],
      ],
    ],
    [
      "confidence 1 → 3, while overdue",
      { confidence: 1, gaps: DEFAULT_GAPS },
      { confidence: 3, gaps: DEFAULT_GAPS },
      ["2026-09-03", null, null],
      "2026-09-30",
      [
        ["done", "2026-09-03"],
        ["overdue", "2026-09-07"],
        ["projected", "2026-10-10"],
      ],
      [
        ["done", "2026-09-03"],
        ["overdue", "2026-09-17"],
        ["projected", "2026-10-30"],
      ],
    ],
    [
      "default → custom gaps, before any revision",
      { confidence: 2, gaps: DEFAULT_GAPS },
      { confidence: 2, gaps: CUSTOM_GAPS },
      NONE,
      "2026-09-01",
      [
        ["next_7_days", "2026-09-04"],
        ["projected", "2026-09-11"],
        ["projected", "2026-09-25"],
      ],
      [
        ["later", "2026-09-11"],
        ["projected", "2026-10-01"],
        ["projected", "2026-10-31"],
      ],
    ],
    [
      "default → custom gaps, mid-cycle",
      { confidence: 2, gaps: DEFAULT_GAPS },
      { confidence: 2, gaps: CUSTOM_GAPS },
      ["2026-09-04", null, null],
      "2026-09-04",
      [
        ["done", "2026-09-04"],
        ["next_7_days", "2026-09-11"],
        ["projected", "2026-09-25"],
      ],
      [
        ["done", "2026-09-04"],
        ["later", "2026-09-24"],
        ["projected", "2026-10-24"],
      ],
    ],
    [
      "default → custom gaps, while overdue",
      { confidence: 2, gaps: DEFAULT_GAPS },
      { confidence: 2, gaps: CUSTOM_GAPS },
      ["2026-09-04", null, null],
      "2026-10-15",
      [
        ["done", "2026-09-04"],
        ["overdue", "2026-09-11"],
        ["projected", "2026-10-29"],
      ],
      [
        ["done", "2026-09-04"],
        ["overdue", "2026-09-24"],
        ["projected", "2026-11-14"],
      ],
    ],
  ] as const)(
    "%s",
    (_, before, after, completed, today, expectedBefore, expectedAfter) => {
      const run = ({ confidence, gaps }: typeof before | typeof after) =>
        summary(
          computeSchedule(
            { solvedOn: SOLVED, confidence, completed },
            gaps,
            today,
          ),
        );
      expect(run(before)).toEqual(expectedBefore);
      expect(run(after)).toEqual(expectedAfter);
    },
  );
});

describe("computeSchedule: calendar edges", () => {
  it.each([
    ["month end", 2, "2026-01-29", ["2026-02-01", "2026-02-08", "2026-02-22"]],
    ["year end", 3, "2026-12-20", ["2026-12-25", "2027-01-08", "2027-02-07"]],
    [
      "February in a leap year",
      1,
      "2028-02-27",
      ["2028-02-28", "2028-03-03", "2028-03-13"],
    ],
    [
      "February in a non-leap year",
      1,
      "2027-02-27",
      ["2027-02-28", "2027-03-04", "2027-03-14"],
    ],
    [
      "solved on 29 February",
      1,
      "2028-02-29",
      ["2028-03-01", "2028-03-05", "2028-03-15"],
    ],
  ] as const)("%s", (_, confidence, solvedOn, expectedDates) => {
    const result = computeSchedule(
      { solvedOn, confidence, completed: NONE },
      DEFAULT_GAPS,
      solvedOn,
    );
    expect(result.revisions.map((r) => r.date)).toEqual(expectedDates);
  });
});
