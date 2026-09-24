// Revision scheduling (PLAN.md §4.3). Due dates are derived from stored facts on every read.
import { addDays, compare, type CalendarDate } from "./calendarDate";
import type { Confidence, Gaps } from "./gaps";

export const BUCKETS = [
  "overdue",
  "due_today",
  "due_tomorrow",
  "next_7_days",
  "later",
] as const;
export type Bucket = (typeof BUCKETS)[number];

export const REVISION_STATUSES = ["done", ...BUCKETS, "projected"] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

export const REVISION_NUMBERS = [1, 2, 3] as const;
export type RevisionNumber = (typeof REVISION_NUMBERS)[number];

export type Revision = {
  number: RevisionNumber;
  status: RevisionStatus;
  /** Completion date when done, due date for the next pending revision, otherwise projected. */
  date: CalendarDate;
};

type Triple<T> = readonly [T, T, T];

export type ScheduleInput = {
  solvedOn: CalendarDate;
  confidence: Confidence;
  /** Completion dates of revisions 1–3, `null` while pending. */
  completed: Triple<CalendarDate | null>;
};

export type Schedule = {
  revisions: [Revision, Revision, Revision];
  /** The first pending revision, the only one with a real due date. */
  next: Revision | null;
  isComplete: boolean;
};

export function bucketFor(due: CalendarDate, today: CalendarDate): Bucket {
  if (compare(due, today) < 0) return "overdue";
  if (due === today) return "due_today";
  if (due === addDays(today, 1)) return "due_tomorrow";
  if (compare(due, addDays(today, 7)) <= 0) return "next_7_days";
  return "later";
}

export function computeSchedule(
  { solvedOn, confidence, completed }: ScheduleInput,
  gaps: Readonly<Gaps>,
  today: CalendarDate,
): Schedule {
  const gap = gaps[confidence];
  const revisions: Revision[] = [];
  let anchor = solvedOn;
  let next: Revision | null = null;

  for (const index of [0, 1, 2] as const) {
    const number = (index + 1) as RevisionNumber;
    const completedOn = completed[index];
    if (completedOn) {
      revisions.push({ number, status: "done", date: completedOn });
      anchor = completedOn;
    } else if (!next) {
      const due = addDays(anchor, gap[index]);
      next = { number, status: bucketFor(due, today), date: due };
      revisions.push(next);
      // If it is late, later revisions assume it gets done today.
      anchor = compare(due, today) > 0 ? due : today;
    } else {
      const projected = addDays(anchor, gap[index]);
      revisions.push({ number, status: "projected", date: projected });
      anchor = projected;
    }
  }

  return {
    revisions: revisions as Schedule["revisions"],
    next,
    isComplete: next === null,
  };
}
