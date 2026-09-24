// Timeline rules for a solved problem (PLAN.md §4.4). Services turn a violation into a 409.
import { compare, type CalendarDate } from "./calendarDate";
import type { RevisionNumber, ScheduleInput } from "./schedule";

/** The stored dates of one solved problem. */
export type Timeline = Pick<ScheduleInput, "solvedOn" | "completed">;

export type TimelineViolation = {
  rule: "order" | "skipped" | "future" | "undo_not_latest";
  /** The revision that breaks the rule, or `null` for the solve date. */
  revision: RevisionNumber | null;
  message: string;
};

export type TimelineContext = {
  /** The stored timeline before this request, or `null` when the problem is being marked solved. */
  previous: Timeline | null;
  /** The user's today. */
  today: CalendarDate;
};

const INDEXES = [0, 1, 2] as const;
const revisionAt = (index: 0 | 1 | 2) => (index + 1) as RevisionNumber;

/**
 * Returns the first rule the proposed timeline breaks, or `null` if it is valid.
 * Rule 3 (no future dates) applies only to dates that differ from `previous`,
 * so stored dates never block an edit after the user changes time zone.
 */
export function validateTimeline(
  next: Timeline,
  { previous, today }: TimelineContext,
): TimelineViolation | null {
  return (
    findUndoOfEarlierRevision(next, previous) ??
    findSkippedOrOutOfOrder(next) ??
    findFutureDate(next, previous, today)
  );
}

// Rule 5: a request may undo only the most recent completed revision, one at a time.
function findUndoOfEarlierRevision(
  next: Timeline,
  previous: Timeline | null,
): TimelineViolation | null {
  if (!previous) return null;
  const latestDone = previous.completed.findLastIndex(Boolean);
  for (const index of INDEXES) {
    const undone = previous.completed[index] && !next.completed[index];
    if (undone && index !== latestDone) {
      return {
        rule: "undo_not_latest",
        revision: revisionAt(index),
        message: "Only the most recent revision can be undone.",
      };
    }
  }
  return null;
}

// Rules 1 and 2: solve ≤ R1 ≤ R2 ≤ R3, and no revision without the one before it.
function findSkippedOrOutOfOrder(next: Timeline): TimelineViolation | null {
  let previousEvent = next.solvedOn;
  let previousLabel = "the solve date";
  for (const index of INDEXES) {
    const revision = revisionAt(index);
    const date = next.completed[index];
    if (!date) continue;
    if (index > 0 && !next.completed[index - 1]) {
      return {
        rule: "skipped",
        revision,
        message: `Revision ${revision} needs Revision ${revision - 1} first.`,
      };
    }
    if (compare(date, previousEvent) < 0) {
      return {
        rule: "order",
        revision,
        message: `Revision ${revision} can't be before ${previousLabel}.`,
      };
    }
    previousEvent = date;
    previousLabel = `Revision ${revision}`;
  }
  return null;
}

// Rule 3: a date written in this request may not be after the user's today.
function findFutureDate(
  next: Timeline,
  previous: Timeline | null,
  today: CalendarDate,
): TimelineViolation | null {
  const isNewFutureDate = (
    date: CalendarDate | null,
    stored: CalendarDate | null,
  ) => date !== null && date !== stored && compare(date, today) > 0;

  if (isNewFutureDate(next.solvedOn, previous?.solvedOn ?? null)) {
    return {
      rule: "future",
      revision: null,
      message: "The solve date can't be in the future.",
    };
  }
  for (const index of INDEXES) {
    if (
      isNewFutureDate(next.completed[index], previous?.completed[index] ?? null)
    ) {
      const revision = revisionAt(index);
      return {
        rule: "future",
        revision,
        message: `Revision ${revision} can't be in the future.`,
      };
    }
  }
  return null;
}
