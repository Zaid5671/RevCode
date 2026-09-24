import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/server/auth";
import {
  completeRevision,
  getDashboard,
  markSolved,
} from "@/server/modules/progress/progress.service";
import { saveNote } from "@/server/modules/notes/notes.service";
import { createUser } from "./helpers/users";

// Today is 2026-09-24 in UTC and already 2026-09-25 in Asia/Tokyo.
const NOW = new Date("2026-09-24T18:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

// Catalog difficulties: 1, 2, 3 are EASY; 6, 11, 12 are MEDIUM; 22 is HARD.
// Okay (2) gaps are 3, 7, 14 days; Shaky (1) gaps are 1, 4, 10.
async function solveWithRevisions(
  user: SessionUser,
  problemId: number,
  confidence: 1 | 2 | 3,
  solvedOn: string,
  revisions: string[] = [],
) {
  await markSolved(user, problemId, { solvedOn, confidence });
  for (const [index, date] of revisions.entries()) {
    await completeRevision(user, problemId, (index + 1) as 1 | 2 | 3, date);
  }
}

describe("getDashboard", () => {
  it("buckets each next revision around the user's today and counts progress", async () => {
    const user = await createUser();
    const other = await createUser();
    await solveWithRevisions(user, 1, 2, "2026-09-20"); // R1 due 09-23
    await solveWithRevisions(user, 2, 2, "2026-09-18"); // R1 due 09-21
    await solveWithRevisions(user, 6, 2, "2026-09-21"); // R1 due 09-24
    await solveWithRevisions(user, 11, 2, "2026-09-22"); // R1 due 09-25
    await solveWithRevisions(user, 22, 2, "2026-09-20", ["2026-09-24"]); // R2 due 10-01, +7
    await solveWithRevisions(user, 3, 1, "2026-09-20", [
      "2026-09-21",
      "2026-09-22",
    ]); // R3 due 10-02, +8: not listed
    await solveWithRevisions(user, 12, 2, "2026-09-01", [
      "2026-09-04",
      "2026-09-11",
      "2026-09-24",
    ]); // complete
    await solveWithRevisions(other, 4, 2, "2026-09-20");

    expect(await getDashboard(user)).toEqual({
      today: "2026-09-24",
      overdue: [
        {
          problemId: 2,
          revision: 1,
          dueDate: "2026-09-21",
          daysOverdue: 3,
          hasNote: false,
        },
        {
          problemId: 1,
          revision: 1,
          dueDate: "2026-09-23",
          daysOverdue: 1,
          hasNote: false,
        },
      ],
      dueToday: [
        { problemId: 6, revision: 1, dueDate: "2026-09-24", hasNote: false },
      ],
      dueTomorrow: [
        { problemId: 11, revision: 1, dueDate: "2026-09-25", hasNote: false },
      ],
      next7Days: [
        { problemId: 22, revision: 2, dueDate: "2026-10-01", hasNote: false },
      ],
      stats: {
        solved: { total: 7, easy: 3, medium: 3, hard: 1 },
        completedCycles: 1,
        notes: 0,
      },
    });
  });

  it("uses the user's time zone for today", async () => {
    const user = await createUser({ timezone: "Asia/Tokyo" });
    await solveWithRevisions(user, 11, 2, "2026-09-22"); // R1 due 09-25
    await solveWithRevisions(user, 6, 2, "2026-09-21"); // R1 due 09-24

    const dashboard = await getDashboard(user);

    expect(dashboard.today).toBe("2026-09-25");
    expect(dashboard.dueToday.map((item) => item.problemId)).toEqual([11]);
    expect(dashboard.overdue).toEqual([
      {
        problemId: 6,
        revision: 1,
        dueDate: "2026-09-24",
        daysOverdue: 1,
        hasNote: false,
      },
    ]);
    expect(dashboard.dueTomorrow).toEqual([]);
  });

  it("marks items that have a note and counts only this user's notes", async () => {
    const user = await createUser();
    const other = await createUser();
    await solveWithRevisions(user, 1, 2, "2026-09-20"); // R1 due 09-23, overdue
    await solveWithRevisions(user, 6, 2, "2026-09-21"); // R1 due 09-24, today
    await solveWithRevisions(user, 12, 2, "2026-09-01", [
      "2026-09-04",
      "2026-09-11",
      "2026-09-24",
    ]); // complete: not listed, but its note counts
    const note = { body: "notes", baseVersion: null };
    await saveNote(user.id, 1, note);
    await saveNote(user.id, 2, note); // a note on an unsolved problem counts too
    await saveNote(user.id, 12, note);
    await saveNote(other.id, 6, note);
    await saveNote(other.id, 3, note);

    const dashboard = await getDashboard(user);

    expect(dashboard.overdue).toEqual([
      expect.objectContaining({ problemId: 1, hasNote: true }),
    ]);
    expect(dashboard.dueToday).toEqual([
      expect.objectContaining({ problemId: 6, hasNote: false }),
    ]);
    expect(dashboard.stats.notes).toBe(3);
  });

  it("is empty for a user with no progress", async () => {
    const user = await createUser();
    expect(await getDashboard(user)).toEqual({
      today: "2026-09-24",
      overdue: [],
      dueToday: [],
      dueTomorrow: [],
      next7Days: [],
      stats: {
        solved: { total: 0, easy: 0, medium: 0, hard: 0 },
        completedCycles: 0,
        notes: 0,
      },
    });
  });
});
