// Progress rules (PLAN.md §4, §7.1). Every change runs in one transaction:
// lock the row → apply the change → check the timeline → write → compute the schedule.
import {
  compare,
  daysBetween,
  userToday,
  type CalendarDate,
} from "@/domain/calendarDate";
import type { Gaps } from "@/domain/gaps";
import {
  bucketFor,
  computeSchedule,
  type Bucket,
  type RevisionNumber,
} from "@/domain/schedule";
import type {
  DashboardResponse,
  Difficulty,
  PatchProgressBody,
  ProgressEntry,
  ProgressListResponse,
  PutProgressBody,
} from "@/domain/schemas";
import { validateTimeline } from "@/domain/timeline";
import type { SessionUser } from "@/server/auth";
import { pool, withTransaction } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadGaps } from "../gaps/gaps.service";
import { listNotes } from "../notes/notes.service";
import {
  deleteProgressRecord,
  insertProgressRecord,
  listProgressRecords,
  lockProgressRecord,
  updateProgressRecord,
  type ProgressRecord,
} from "./progress.repository";

/** The session user, as far as progress needs it. */
export type ProgressUser = Pick<SessionUser, "id" | "timezone">;

export async function listProgress(
  user: ProgressUser,
): Promise<ProgressListResponse> {
  const { today, records, gaps } = await loadProgress(user);
  return {
    today,
    entries: records.map((record) => toEntry(record, gaps, today)),
  };
}

type DueBucket = Exclude<Bucket, "later">;

const LIST_FOR_BUCKET = {
  overdue: "overdue",
  due_today: "dueToday",
  due_tomorrow: "dueTomorrow",
  next_7_days: "next7Days",
} as const satisfies Record<DueBucket, keyof DashboardResponse>;

const STATS_KEY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const satisfies Record<Difficulty, string>;

/**
 * GET /api/dashboard. Each solved problem's next pending revision (the only one with a
 * real due date) is listed by bucket, earliest due first; anything after today + 7 is left out.
 */
export async function getDashboard(
  user: ProgressUser,
): Promise<DashboardResponse> {
  const [{ today, records, gaps }, notes] = await Promise.all([
    loadProgress(user),
    listNotes(user.id),
  ]);
  const withNote = new Set(notes.map((note) => note.problemId));

  const dashboard: DashboardResponse = {
    today,
    overdue: [],
    dueToday: [],
    dueTomorrow: [],
    next7Days: [],
    stats: {
      solved: { total: records.length, easy: 0, medium: 0, hard: 0 },
      completedCycles: 0,
      // Every note counts, including notes on unsolved problems.
      notes: notes.length,
    },
  };

  for (const record of records) {
    dashboard.stats.solved[STATS_KEY[record.difficulty]] += 1;
    const { next } = computeSchedule(record, gaps, today);
    if (!next) {
      dashboard.stats.completedCycles += 1;
      continue;
    }
    const bucket = bucketFor(next.date, today);
    if (bucket === "later") continue;
    dashboard[LIST_FOR_BUCKET[bucket]].push({
      problemId: record.problemId,
      revision: next.number,
      dueDate: next.date,
      ...(bucket === "overdue"
        ? { daysOverdue: daysBetween(next.date, today) }
        : {}),
      hasNote: withNote.has(record.problemId),
    });
  }

  // Records arrive in problem order and the sort is stable, so equal dates keep that order.
  for (const list of Object.values(LIST_FOR_BUCKET)) {
    dashboard[list].sort((a, b) => compare(a.dueDate, b.dueDate));
  }
  return dashboard;
}

/**
 * PUT /api/progress/:problemId. Marks the problem solved, or replaces its solve date and
 * confidence. Completed revisions are kept, so the new solve date must still fit them.
 */
export function markSolved(
  user: ProgressUser,
  problemId: number,
  { solvedOn, confidence }: PutProgressBody,
): Promise<ProgressEntry> {
  return changeProgress(user, problemId, (current) => ({
    problemId,
    solvedOn,
    confidence,
    completed: current?.completed ?? [null, null, null],
  }));
}

/** PATCH /api/progress/:problemId. Changes the solve date, the confidence, or both. */
export function editSolve(
  user: ProgressUser,
  problemId: number,
  changes: PatchProgressBody,
): Promise<ProgressEntry> {
  return changeProgress(user, problemId, (current) => {
    const solved = requireSolved(current);
    return {
      ...solved,
      solvedOn: changes.solvedOn ?? solved.solvedOn,
      confidence: changes.confidence ?? solved.confidence,
    };
  });
}

/**
 * DELETE /api/progress/:problemId. Removes the progress record, revisions included; a
 * problem that isn't solved is already in that state, so this succeeds either way (204).
 * The problem's note is stored separately and is kept (§4.4 rule 6).
 */
export async function unmarkSolved(
  user: ProgressUser,
  problemId: number,
): Promise<void> {
  await deleteProgressRecord(pool, user.id, problemId);
}

/**
 * PUT /api/progress/:problemId/revisions/:n. Completes the next pending revision, or
 * edits the date of a completed one. Skipping a revision is a timeline conflict.
 */
export function completeRevision(
  user: ProgressUser,
  problemId: number,
  n: RevisionNumber,
  completedOn: CalendarDate,
): Promise<ProgressEntry> {
  return changeProgress(user, problemId, (current) => {
    const solved = requireSolved(current);
    return {
      ...solved,
      completed: withRevision(solved.completed, n, completedOn),
    };
  });
}

/** DELETE /api/progress/:problemId/revisions/:n. Only the latest completed revision. */
export function undoRevision(
  user: ProgressUser,
  problemId: number,
  n: RevisionNumber,
): Promise<ProgressEntry> {
  return changeProgress(user, problemId, (current) => {
    const solved = requireSolved(current);
    if (solved.completed[n - 1] === null) {
      throw new AppError(
        "TIMELINE_CONFLICT",
        `Revision ${n} isn't done, so there is nothing to undo.`,
        { rule: "not_done", revision: n },
      );
    }
    return { ...solved, completed: withRevision(solved.completed, n, null) };
  });
}

function requireSolved(record: ProgressRecord | null): ProgressRecord {
  if (!record) {
    throw new AppError("NOT_FOUND", "This problem isn't marked solved.");
  }
  return record;
}

function withRevision(
  completed: ProgressRecord["completed"],
  n: RevisionNumber,
  date: CalendarDate | null,
): ProgressRecord["completed"] {
  const next = [...completed] as [
    CalendarDate | null,
    CalendarDate | null,
    CalendarDate | null,
  ];
  next[n - 1] = date;
  return next;
}

/**
 * Applies `change` to the problem's stored record (or `null` when it isn't solved) in one
 * transaction. The row lock keeps two tabs from both passing validation; a concurrent
 * first insert fails with a unique violation instead (409 CONFLICT).
 */
async function changeProgress(
  user: ProgressUser,
  problemId: number,
  change: (current: ProgressRecord | null) => ProgressRecord,
): Promise<ProgressEntry> {
  const today = userToday(user.timezone);
  return withTransaction(async (client) => {
    const current = await lockProgressRecord(client, user.id, problemId);
    const next = change(current);

    const violation = validateTimeline(next, { previous: current, today });
    if (violation) {
      throw new AppError("TIMELINE_CONFLICT", violation.message, {
        rule: violation.rule,
        revision: violation.revision,
      });
    }

    const saved = current
      ? await updateProgressRecord(client, user.id, next)
      : await insertProgressRecord(client, user.id, next);
    return toEntry(saved, await loadGaps(client, user.id), today);
  });
}

/** The user's today, solved problems and gaps: what every read of progress starts from. */
async function loadProgress(user: ProgressUser) {
  const [records, gaps] = await Promise.all([
    listProgressRecords(pool, user.id),
    loadGaps(pool, user.id),
  ]);
  return { today: userToday(user.timezone), records, gaps };
}

function toEntry(
  record: ProgressRecord,
  gaps: Gaps,
  today: CalendarDate,
): ProgressEntry {
  return {
    problemId: record.problemId,
    solvedOn: record.solvedOn,
    confidence: record.confidence,
    ...computeSchedule(record, gaps, today),
  };
}
