import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeRevision,
  editSolve,
  unmarkSolved,
  undoRevision,
  listProgress,
  markSolved,
} from "@/server/modules/progress/progress.service";
import { replaceGaps } from "@/server/modules/gaps/gaps.service";
import { createUser } from "./helpers/users";

// Today is 2026-09-24 in UTC (and already 2026-09-25 in Asia/Tokyo).
const NOW = new Date("2026-09-24T18:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("markSolved", () => {
  it("creates an entry with its schedule, listed for that user", async () => {
    const user = await createUser();

    const entry = await markSolved(user, 1, {
      solvedOn: "2026-09-20",
      confidence: 2,
    });

    // Okay (2) gaps are 3, 7, 14 days. R1 was due 09-23, so it is overdue, and the
    // later revisions are projected as if R1 were done today.
    expect(entry).toEqual({
      problemId: 1,
      solvedOn: "2026-09-20",
      confidence: 2,
      revisions: [
        { number: 1, status: "overdue", date: "2026-09-23" },
        { number: 2, status: "projected", date: "2026-10-01" },
        { number: 3, status: "projected", date: "2026-10-15" },
      ],
      next: { number: 1, status: "overdue", date: "2026-09-23" },
      isComplete: false,
    });
    expect(await listProgress(user)).toEqual({
      today: "2026-09-24",
      entries: [entry],
    });
  });

  it("rejects a solve date after the user's today", async () => {
    const user = await createUser();
    await expect(
      markSolved(user, 1, { solvedOn: "2026-09-25", confidence: 2 }),
    ).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: { rule: "future", revision: null },
    });
    expect((await listProgress(user)).entries).toEqual([]);
  });

  it("judges future dates by the user's time zone", async () => {
    const user = await createUser({ timezone: "Asia/Tokyo" });
    const entry = await markSolved(user, 1, {
      solvedOn: "2026-09-25",
      confidence: 3,
    });
    expect(entry.solvedOn).toBe("2026-09-25");
    expect((await listProgress(user)).today).toBe("2026-09-25");
  });

  it("replaces the solve date and confidence and keeps completed revisions", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 1 });
    await completeRevision(user, 1, 1, "2026-09-12");

    const entry = await markSolved(user, 1, {
      solvedOn: "2026-09-11",
      confidence: 3,
    });

    // Solid (3) gaps are 5, 14, 30: R2 is due 14 days after R1.
    expect(entry.solvedOn).toBe("2026-09-11");
    expect(entry.confidence).toBe(3);
    expect(entry.revisions[0]).toEqual({
      number: 1,
      status: "done",
      date: "2026-09-12",
    });
    expect(entry.next).toEqual({
      number: 2,
      status: "next_7_days",
      date: "2026-09-26",
    });
  });

  it("rejects a new solve date after a completed revision", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 1 });
    await completeRevision(user, 1, 1, "2026-09-12");

    await expect(
      markSolved(user, 1, { solvedOn: "2026-09-13", confidence: 1 }),
    ).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: { rule: "order", revision: 1 },
    });
  });
});

describe("completeRevision", () => {
  it("completes the next revision and schedules the one after it", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-20", confidence: 2 });

    const entry = await completeRevision(user, 1, 1, "2026-09-24");

    expect(entry.revisions).toEqual([
      { number: 1, status: "done", date: "2026-09-24" },
      { number: 2, status: "next_7_days", date: "2026-10-01" },
      { number: 3, status: "projected", date: "2026-10-15" },
    ]);
  });

  it("edits the date of a completed revision", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-04");
    await completeRevision(user, 1, 2, "2026-09-11");

    const entry = await completeRevision(user, 1, 1, "2026-09-05");

    expect(entry.revisions[0].date).toBe("2026-09-05");
    expect(entry.revisions[1]).toEqual({
      number: 2,
      status: "done",
      date: "2026-09-11",
    });
  });

  it("marks the problem complete after the third revision", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-04");
    await completeRevision(user, 1, 2, "2026-09-11");

    const entry = await completeRevision(user, 1, 3, "2026-09-24");

    expect(entry.isComplete).toBe(true);
    expect(entry.next).toBeNull();
  });

  it.each([
    {
      case: "a skipped revision",
      n: 2 as const,
      date: "2026-09-24",
      conflict: { rule: "skipped", revision: 2 },
    },
    {
      case: "a revision before the solve date",
      n: 1 as const,
      date: "2026-09-19",
      conflict: { rule: "order", revision: 1 },
    },
    {
      case: "a revision in the future",
      n: 1 as const,
      date: "2026-09-25",
      conflict: { rule: "future", revision: 1 },
    },
  ])("rejects $case", async ({ n, date, conflict }) => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-20", confidence: 2 });

    await expect(completeRevision(user, 1, n, date)).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: conflict,
    });
    const [entry] = (await listProgress(user)).entries;
    expect(entry?.revisions[0].status).not.toBe("done");
  });

  it("rejects an out-of-order edit of an earlier revision", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-04");
    await completeRevision(user, 1, 2, "2026-09-11");

    await expect(
      completeRevision(user, 1, 1, "2026-09-12"),
    ).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: { rule: "order", revision: 2 },
    });
  });

  it("returns NOT_FOUND for a problem that isn't solved", async () => {
    const user = await createUser();
    await expect(
      completeRevision(user, 1, 1, "2026-09-24"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("undoRevision", () => {
  it("undoes the latest completed revision", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-04");
    await completeRevision(user, 1, 2, "2026-09-11");

    const entry = await undoRevision(user, 1, 2);

    // R2 is due again, 7 days after R1.
    expect(entry.revisions[0].status).toBe("done");
    expect(entry.next).toEqual({
      number: 2,
      status: "overdue",
      date: "2026-09-11",
    });
  });

  it("rejects undoing a revision that isn't the latest", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-04");
    await completeRevision(user, 1, 2, "2026-09-11");

    await expect(undoRevision(user, 1, 1)).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: { rule: "undo_not_latest", revision: 1 },
    });
  });

  it("rejects undoing a revision that isn't done", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });

    await expect(undoRevision(user, 1, 1)).rejects.toMatchObject({
      code: "TIMELINE_CONFLICT",
      details: { rule: "not_done", revision: 1 },
    });
  });

  it("returns NOT_FOUND for a problem that isn't solved", async () => {
    const user = await createUser();
    await expect(undoRevision(user, 1, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("editSolve", () => {
  it("recalculates pending dates on a confidence change and keeps completed ones", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 1 });
    await completeRevision(user, 1, 1, "2026-09-11");

    const entry = await editSolve(user, 1, { confidence: 3 });

    // Shaky (1) would put R2 4 days after R1; Solid (3) puts it 14 days after.
    expect(entry.solvedOn).toBe("2026-09-10");
    expect(entry.revisions[0]).toEqual({
      number: 1,
      status: "done",
      date: "2026-09-11",
    });
    expect(entry.next).toEqual({
      number: 2,
      status: "due_tomorrow",
      date: "2026-09-25",
    });
  });

  it("changes only the solve date when that is all it gets", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 2 });

    const entry = await editSolve(user, 1, { solvedOn: "2026-09-12" });

    expect(entry.confidence).toBe(2);
    expect(entry.next?.date).toBe("2026-09-15");
  });

  it("returns NOT_FOUND for a problem that isn't solved", async () => {
    const user = await createUser();
    await expect(editSolve(user, 1, { confidence: 2 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("still edits a row whose stored date is in the future after a time zone change", async () => {
    // Solved on Tokyo's today, which is still tomorrow in UTC.
    const user = await createUser({ timezone: "Asia/Tokyo" });
    await markSolved(user, 1, { solvedOn: "2026-09-25", confidence: 2 });

    const entry = await editSolve({ ...user, timezone: null }, 1, {
      confidence: 3,
    });

    expect(entry.solvedOn).toBe("2026-09-25");
    expect(entry.confidence).toBe(3);
  });
});

describe("gap changes", () => {
  it("move pending due dates and leave completed dates alone", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 2 });
    await completeRevision(user, 1, 1, "2026-09-13");

    await replaceGaps(user.id, {
      1: [1, 4, 10],
      2: [3, 2, 14],
      3: [5, 14, 30],
    });

    const [entry] = (await listProgress(user)).entries;
    expect(entry?.revisions[0]).toEqual({
      number: 1,
      status: "done",
      date: "2026-09-13",
    });
    expect(entry?.next).toEqual({
      number: 2,
      status: "overdue",
      date: "2026-09-15",
    });
  });
});

describe("unmarkSolved", () => {
  it("removes the problem from the user's progress", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-10", confidence: 2 });
    await markSolved(user, 2, { solvedOn: "2026-09-10", confidence: 2 });

    await unmarkSolved(user, 1);

    const { entries } = await listProgress(user);
    expect(entries.map((entry) => entry.problemId)).toEqual([2]);
  });

  it("succeeds for a problem that isn't solved, e.g. already unmarked in another tab", async () => {
    const user = await createUser();
    await expect(unmarkSolved(user, 1)).resolves.toBeUndefined();
  });
});

describe("isolation", () => {
  it("keeps one user's progress away from another's reads and writes", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    await markSolved(owner, 1, { solvedOn: "2026-09-10", confidence: 2 });
    await completeRevision(owner, 1, 1, "2026-09-13");

    expect((await listProgress(intruder)).entries).toEqual([]);
    await expect(
      editSolve(intruder, 1, { confidence: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      completeRevision(intruder, 1, 2, "2026-09-20"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(undoRevision(intruder, 1, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await unmarkSolved(intruder, 1);

    const [entry] = (await listProgress(owner)).entries;
    expect(entry).toMatchObject({ problemId: 1, confidence: 2 });
    expect(entry?.revisions[0].date).toBe("2026-09-13");
  });
});
