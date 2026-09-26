// Dashboard rules (PLAN.md §8.2, DESIGN-BRIEF.md §3): the API's four lists become "Revise
// now" and "Coming up" (grouped by date), joined with the catalog, plus the stats strip.
import type { CalendarDate } from "@/domain/calendarDate";
import type { Bucket, Revision } from "@/domain/schedule";
import type {
  CatalogResponse,
  DashboardItem,
  DashboardResponse,
  Problem,
  ProgressEntry,
} from "@/domain/schemas";
import { formatRelativeDue, statusLabel } from "./format";

export type Reminder = {
  problem: Problem;
  categoryName: string;
  /** The due revision, with the status of the list it came from. */
  revision: Revision;
  hasNote: boolean;
};

export type ReminderGroup = {
  date: CalendarDate;
  /** "Tomorrow", "Fri 25 Sep". */
  label: string;
  /** "in 5 days"; null for Tomorrow, whose label already says it. */
  relative: string | null;
  reminders: Reminder[];
};

/** The first unsolved problem in NeetCode order, for the "Next to solve" line. */
export type NextProblem = {
  problem: Problem;
  categoryName: string;
};

export type DashboardStatsView = {
  solved: number;
  total: number;
  solvedPercent: number;
  overdue: number;
  dueToday: number;
  /** Tomorrow and the next 7 days: everything in "Coming up". */
  next7Days: number;
  complete: number;
};

export type DashboardView = {
  today: CalendarDate;
  reviseNow: Reminder[];
  comingUp: ReminderGroup[];
  stats: DashboardStatsView;
};

export function buildDashboard(
  dashboard: DashboardResponse,
  catalog: CatalogResponse,
): DashboardView {
  const problems = new Map(catalog.problems.map((p) => [p.id, p]));
  const categoryNames = new Map(catalog.categories.map((c) => [c.id, c.name]));

  function reminders(items: DashboardItem[], status: Bucket): Reminder[] {
    return items.flatMap((item) => {
      const problem = problems.get(item.problemId);
      if (!problem) return [];
      return [
        {
          problem,
          categoryName: categoryNames.get(problem.categoryId) ?? "",
          revision: { number: item.revision, status, date: item.dueDate },
          hasNote: item.hasNote,
        },
      ];
    });
  }

  // The server sorts each list by due date, so equal dates are already next to each other.
  const comingUp: ReminderGroup[] = [];
  for (const reminder of [
    ...reminders(dashboard.dueTomorrow, "due_tomorrow"),
    ...reminders(dashboard.next7Days, "next_7_days"),
  ]) {
    const last = comingUp.at(-1);
    if (last?.date === reminder.revision.date) last.reminders.push(reminder);
    else
      comingUp.push({
        date: reminder.revision.date,
        label: statusLabel(reminder.revision, dashboard.today),
        relative:
          reminder.revision.status === "due_tomorrow"
            ? null
            : formatRelativeDue(reminder.revision.date, dashboard.today),
        reminders: [reminder],
      });
  }

  const solved = dashboard.stats.solved.total;
  const total = catalog.problems.length;
  return {
    today: dashboard.today,
    reviseNow: [
      ...reminders(dashboard.overdue, "overdue"),
      ...reminders(dashboard.dueToday, "due_today"),
    ],
    comingUp,
    stats: {
      solved,
      total,
      solvedPercent: total > 0 ? Math.round((solved / total) * 100) : 0,
      overdue: dashboard.overdue.length,
      dueToday: dashboard.dueToday.length,
      next7Days: dashboard.dueTomorrow.length + dashboard.next7Days.length,
      complete: dashboard.stats.completedCycles,
    },
  };
}

/**
 * The first problem the user hasn't solved, in NeetCode order (category position, then
 * problem position, as on the Problems page); null once all are solved.
 */
export function nextToSolve(
  catalog: CatalogResponse,
  entries: readonly Pick<ProgressEntry, "problemId">[],
): NextProblem | null {
  const categories = new Map(catalog.categories.map((c) => [c.id, c]));
  const solved = new Set(entries.map((e) => e.problemId));
  const position = (p: Problem) => categories.get(p.categoryId)?.position ?? 0;
  const problem = catalog.problems
    .filter((p) => !solved.has(p.id))
    .toSorted((a, b) => position(a) - position(b) || a.position - b.position)
    .at(0);
  return problem
    ? {
        problem,
        categoryName: categories.get(problem.categoryId)?.name ?? "",
      }
    : null;
}
