// What the Problems page shows (PLAN.md §8.3): rows in NeetCode order, the filters kept in
// the URL, category groups and the "next due" sort. Pure, so it's tested without a browser.
import { compare } from "@/domain/calendarDate";
import type { Bucket } from "@/domain/schedule";
import {
  DIFFICULTIES,
  type CatalogResponse,
  type Category,
  type Difficulty,
  type NoteSummary,
  type Problem,
  type ProgressEntry,
} from "@/domain/schemas";

// ── Filters ─────────────────────────────────────────────────────────────────

/** URL values of the Status select. `week` is "Next 7 days" (tomorrow not included). */
export const STATUS_FILTERS = [
  "all",
  "unsolved",
  "overdue",
  "today",
  "tomorrow",
  "week",
  "later",
  "complete",
  "notes",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORTS = ["neetcode", "next"] as const;
export type Sort = (typeof SORTS)[number];

export type Filters = {
  q: string;
  category: number | null;
  difficulty: Difficulty | null;
  status: StatusFilter;
  sort: Sort;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  category: null,
  difficulty: null,
  status: "all",
  sort: "neetcode",
};

function oneOf<T extends string>(
  values: readonly T[],
  value: string | null,
): T | null {
  return values.find((v) => v === value) ?? null;
}

/** Reads the filters from the URL. Anything it doesn't recognise falls back to the default. */
export function parseFilters(params: URLSearchParams): Filters {
  const category = params.get("category") ?? "";
  return {
    q: params.get("q") ?? DEFAULT_FILTERS.q,
    category: /^[1-9]\d{0,4}$/.test(category) ? Number(category) : null,
    difficulty: oneOf(DIFFICULTIES, params.get("difficulty")),
    status:
      oneOf(STATUS_FILTERS, params.get("status")) ?? DEFAULT_FILTERS.status,
    sort: oneOf(SORTS, params.get("sort")) ?? DEFAULT_FILTERS.sort,
  };
}

/** The query string for `filters`, with only the values that differ from the defaults. */
export function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== null)
    params.set("category", String(filters.category));
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.status !== DEFAULT_FILTERS.status)
    params.set("status", filters.status);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params.toString();
}

/** True when a search or filter narrows the rows. Sorting alone doesn't. */
export function isFiltering(filters: Filters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.category !== null ||
    filters.difficulty !== null ||
    filters.status !== "all"
  );
}

// ── Rows ────────────────────────────────────────────────────────────────────

export type ProblemRow = {
  problem: Problem;
  /** `null` while unsolved. */
  entry: ProgressEntry | null;
  hasNote: boolean;
};

export type RowStatus = "unsolved" | "complete" | Bucket;

export function rowStatus(entry: ProgressEntry | null): RowStatus {
  if (!entry) return "unsolved";
  if (!entry.next) return "complete";
  // The next pending revision always has a bucket; only the others are done or projected.
  return entry.next.status as Bucket;
}

/** Every catalog problem in NeetCode order (category position, then problem position). */
export function buildRows(
  catalog: CatalogResponse,
  entries: readonly ProgressEntry[],
  notes: readonly NoteSummary[],
): ProblemRow[] {
  const categoryPosition = new Map(
    catalog.categories.map((c) => [c.id, c.position]),
  );
  const entryFor = new Map(entries.map((e) => [e.problemId, e]));
  const withNote = new Set(notes.map((n) => n.problemId));
  return catalog.problems
    .toSorted(
      (a, b) =>
        (categoryPosition.get(a.categoryId) ?? 0) -
          (categoryPosition.get(b.categoryId) ?? 0) || a.position - b.position,
    )
    .map((problem) => ({
      problem,
      entry: entryFor.get(problem.id) ?? null,
      hasNote: withNote.has(problem.id),
    }));
}

const STATUS_MATCH: Record<
  Exclude<StatusFilter, "all" | "notes">,
  RowStatus
> = {
  unsolved: "unsolved",
  overdue: "overdue",
  today: "due_today",
  tomorrow: "due_tomorrow",
  week: "next_7_days",
  later: "later",
  complete: "complete",
};

export function matchesFilters(row: ProblemRow, filters: Filters): boolean {
  const q = filters.q.trim().toLowerCase();
  if (q && !row.problem.title.toLowerCase().includes(q)) return false;
  if (filters.category !== null && row.problem.categoryId !== filters.category)
    return false;
  if (filters.difficulty && row.problem.difficulty !== filters.difficulty)
    return false;
  if (filters.status === "all") return true;
  if (filters.status === "notes") return row.hasNote;
  return rowStatus(row.entry) === STATUS_MATCH[filters.status];
}

// ── Category groups ─────────────────────────────────────────────────────────

export type CategoryGroup = {
  category: Category;
  /** The rows that match the filters. */
  rows: ProblemRow[];
  /** Counts over the whole category, whatever the filters. */
  solved: number;
  total: number;
  /** Overdue + due today: the same revisions as the dashboard's "Revise now". */
  due: number;
  /** The most urgent of those, which colours the count. */
  urgency: "overdue" | "due_today" | null;
};

/** One group per category, in category order. `rows` must be in NeetCode order. */
export function groupRows(
  categories: readonly Category[],
  rows: readonly ProblemRow[],
  filters: Filters,
): CategoryGroup[] {
  return categories
    .toSorted((a, b) => a.position - b.position)
    .map((category) => {
      const all = rows.filter((r) => r.problem.categoryId === category.id);
      const statuses = all.map((r) => rowStatus(r.entry));
      const overdue = statuses.filter((s) => s === "overdue").length;
      const today = statuses.filter((s) => s === "due_today").length;
      return {
        category,
        rows: all.filter((r) => matchesFilters(r, filters)),
        solved: all.filter((r) => r.entry).length,
        total: all.length,
        due: overdue + today,
        urgency: overdue ? "overdue" : today ? "due_today" : null,
      };
    });
}

/**
 * The "Next due first" sort: one flat list, earliest due revision first. Rows with nothing
 * due (unsolved or complete) follow in their existing order, which is NeetCode order.
 */
export function sortByNextDue(rows: readonly ProblemRow[]): ProblemRow[] {
  return rows.toSorted((a, b) => {
    const dueA = a.entry?.next?.date;
    const dueB = b.entry?.next?.date;
    if (dueA && dueB) return compare(dueA, dueB);
    if (dueA) return -1;
    if (dueB) return 1;
    return 0;
  });
}
