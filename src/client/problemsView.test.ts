import { describe, expect, it } from "vitest";
import type {
  Category,
  Difficulty,
  Problem,
  ProgressEntry,
} from "@/domain/schemas";
import type { RevisionStatus } from "@/domain/schedule";
import {
  DEFAULT_FILTERS,
  buildRows,
  filtersToQuery,
  groupRows,
  isFiltering,
  matchesFilters,
  parseFilters,
  rowStatus,
  sortByNextDue,
  type Filters,
  type ProblemRow,
} from "./problemsView";

// ── Fixtures ────────────────────────────────────────────────────────────────

const ARRAYS: Category = { id: 1, name: "Arrays & Hashing", position: 1 };
const POINTERS: Category = { id: 2, name: "Two Pointers", position: 2 };

function problem(
  id: number,
  title: string,
  categoryId: number,
  position: number,
  difficulty: Difficulty = "EASY",
): Problem {
  const slug = title.toLowerCase().replaceAll(" ", "-");
  return {
    id,
    title,
    leetcodeSlug: slug,
    leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
    difficulty,
    categoryId,
    position,
    isPremium: false,
  };
}

/** A solved problem whose next pending revision has `status`, or a complete one. */
function entry(
  problemId: number,
  next: { status: RevisionStatus; date: string } | "complete",
): ProgressEntry {
  const done = {
    number: 1 as const,
    status: "done" as const,
    date: "2026-09-01",
  };
  if (next === "complete") {
    return {
      problemId,
      solvedOn: "2026-08-30",
      confidence: 2,
      revisions: [
        done,
        { number: 2, status: "done", date: "2026-09-05" },
        { number: 3, status: "done", date: "2026-09-15" },
      ],
      next: null,
      isComplete: true,
    };
  }
  const pending = { number: 2 as const, ...next };
  return {
    problemId,
    solvedOn: "2026-08-30",
    confidence: 2,
    revisions: [
      done,
      pending,
      { number: 3, status: "projected", date: "2026-12-01" },
    ],
    next: pending,
    isComplete: false,
  };
}

const TWO_SUM = problem(1, "Two Sum", ARRAYS.id, 1);
const GROUP_ANAGRAMS = problem(2, "Group Anagrams", ARRAYS.id, 2, "MEDIUM");
const TOP_K = problem(3, "Top K Frequent Elements", ARRAYS.id, 3, "MEDIUM");
const VALID_PALINDROME = problem(4, "Valid Palindrome", POINTERS.id, 1);
const TRAPPING = problem(5, "Trapping Rain Water", POINTERS.id, 2, "HARD");

const row = (
  p: Problem,
  e: ProgressEntry | null = null,
  hasNote = false,
): ProblemRow => ({ problem: p, entry: e, hasNote });

const filters = (overrides: Partial<Filters>): Filters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

// ── URL filters ─────────────────────────────────────────────────────────────

describe("parseFilters", () => {
  it("gives the defaults for an empty query", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
    expect(DEFAULT_FILTERS).toEqual({
      q: "",
      category: null,
      difficulty: null,
      status: "all",
      sort: "neetcode",
    });
  });

  it("reads every filter", () => {
    const params = new URLSearchParams(
      "q=two&category=3&difficulty=HARD&status=overdue&sort=next",
    );
    expect(parseFilters(params)).toEqual({
      q: "two",
      category: 3,
      difficulty: "HARD",
      status: "overdue",
      sort: "next",
    });
  });

  it("falls back to the default for a value it doesn't know", () => {
    const params = new URLSearchParams(
      "category=abc&difficulty=easy&status=bogus&sort=title",
    );
    expect(parseFilters(params)).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(new URLSearchParams("category=0")).category).toBe(null);
    expect(parseFilters(new URLSearchParams("category=2.5")).category).toBe(
      null,
    );
  });
});

describe("filtersToQuery", () => {
  it("is empty for the defaults", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe("");
  });

  it("writes only the values that differ from the defaults", () => {
    expect(filtersToQuery(filters({ status: "notes", sort: "next" }))).toBe(
      "status=notes&sort=next",
    );
  });

  it("round-trips through parseFilters", () => {
    const all = filters({
      q: "two sum",
      category: 2,
      difficulty: "MEDIUM",
      status: "week",
      sort: "next",
    });
    expect(parseFilters(new URLSearchParams(filtersToQuery(all)))).toEqual(all);
  });
});

describe("isFiltering", () => {
  it("is false for the defaults, a blank search and a sort alone", () => {
    expect(isFiltering(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltering(filters({ q: "   " }))).toBe(false);
    expect(isFiltering(filters({ sort: "next" }))).toBe(false);
  });

  it("is true for any search or filter", () => {
    expect(isFiltering(filters({ q: "two" }))).toBe(true);
    expect(isFiltering(filters({ category: 1 }))).toBe(true);
    expect(isFiltering(filters({ difficulty: "EASY" }))).toBe(true);
    expect(isFiltering(filters({ status: "unsolved" }))).toBe(true);
  });
});

// ── Rows ────────────────────────────────────────────────────────────────────

describe("rowStatus", () => {
  it("is unsolved without an entry, complete when all revisions are done", () => {
    expect(rowStatus(null)).toBe("unsolved");
    expect(rowStatus(entry(1, "complete"))).toBe("complete");
  });

  it("is the bucket of the next pending revision", () => {
    expect(rowStatus(entry(1, { status: "overdue", date: "2026-09-20" }))).toBe(
      "overdue",
    );
    expect(rowStatus(entry(1, { status: "later", date: "2026-10-20" }))).toBe(
      "later",
    );
  });
});

describe("buildRows", () => {
  it("puts problems in NeetCode order with their progress and note flag", () => {
    const solved = entry(TRAPPING.id, "complete");
    const rows = buildRows(
      {
        categories: [POINTERS, ARRAYS],
        problems: [TRAPPING, TWO_SUM, VALID_PALINDROME],
      },
      [solved],
      [{ problemId: TWO_SUM.id, updatedAt: "2026-09-20T10:00:00.000Z" }],
    );
    expect(rows).toEqual([
      row(TWO_SUM, null, true),
      row(VALID_PALINDROME),
      row(TRAPPING, solved),
    ]);
  });
});

describe("matchesFilters", () => {
  const overdue = row(
    TWO_SUM,
    entry(TWO_SUM.id, { status: "overdue", date: "2026-09-20" }),
  );
  const unsolvedWithNote = row(GROUP_ANAGRAMS, null, true);
  const complete = row(TRAPPING, entry(TRAPPING.id, "complete"));

  it("matches everything with the defaults", () => {
    for (const r of [overdue, unsolvedWithNote, complete]) {
      expect(matchesFilters(r, DEFAULT_FILTERS)).toBe(true);
    }
  });

  it("searches titles, ignoring case and surrounding spaces", () => {
    expect(matchesFilters(overdue, filters({ q: "  two SUM " }))).toBe(true);
    expect(matchesFilters(overdue, filters({ q: "anagram" }))).toBe(false);
  });

  it("filters by category and difficulty", () => {
    expect(matchesFilters(overdue, filters({ category: ARRAYS.id }))).toBe(
      true,
    );
    expect(matchesFilters(complete, filters({ category: ARRAYS.id }))).toBe(
      false,
    );
    expect(matchesFilters(complete, filters({ difficulty: "HARD" }))).toBe(
      true,
    );
    expect(matchesFilters(overdue, filters({ difficulty: "HARD" }))).toBe(
      false,
    );
  });

  it("filters by status", () => {
    const due = (status: RevisionStatus) =>
      row(TOP_K, entry(TOP_K.id, { status, date: "2026-09-25" }));
    expect(
      matchesFilters(unsolvedWithNote, filters({ status: "unsolved" })),
    ).toBe(true);
    expect(matchesFilters(overdue, filters({ status: "unsolved" }))).toBe(
      false,
    );
    expect(matchesFilters(overdue, filters({ status: "overdue" }))).toBe(true);
    expect(matchesFilters(due("due_today"), filters({ status: "today" }))).toBe(
      true,
    );
    expect(
      matchesFilters(due("due_tomorrow"), filters({ status: "tomorrow" })),
    ).toBe(true);
    expect(
      matchesFilters(due("next_7_days"), filters({ status: "week" })),
    ).toBe(true);
    expect(
      matchesFilters(due("due_tomorrow"), filters({ status: "week" })),
    ).toBe(false);
    expect(matchesFilters(due("later"), filters({ status: "later" }))).toBe(
      true,
    );
    expect(matchesFilters(complete, filters({ status: "complete" }))).toBe(
      true,
    );
    expect(matchesFilters(overdue, filters({ status: "complete" }))).toBe(
      false,
    );
    expect(matchesFilters(unsolvedWithNote, filters({ status: "notes" }))).toBe(
      true,
    );
    expect(matchesFilters(overdue, filters({ status: "notes" }))).toBe(false);
  });

  it("needs every filter to match", () => {
    const f = filters({ q: "two", difficulty: "EASY", status: "overdue" });
    expect(matchesFilters(overdue, f)).toBe(true);
    expect(matchesFilters(overdue, { ...f, status: "today" })).toBe(false);
  });
});

describe("groupRows", () => {
  const rows = [
    row(
      TWO_SUM,
      entry(TWO_SUM.id, { status: "due_today", date: "2026-09-23" }),
    ),
    row(GROUP_ANAGRAMS, entry(GROUP_ANAGRAMS.id, "complete")),
    row(TOP_K),
    row(
      VALID_PALINDROME,
      entry(VALID_PALINDROME.id, { status: "overdue", date: "2026-09-20" }),
    ),
    row(
      TRAPPING,
      entry(TRAPPING.id, { status: "due_today", date: "2026-09-23" }),
    ),
  ];

  it("counts solved and due (overdue + today) per category, in category order", () => {
    const groups = groupRows([POINTERS, ARRAYS], rows, DEFAULT_FILTERS);
    expect(groups.map((g) => g.category.id)).toEqual([ARRAYS.id, POINTERS.id]);
    expect(groups[0]).toMatchObject({
      solved: 2,
      total: 3,
      due: 1,
      urgency: "due_today",
    });
    expect(groups[1]).toMatchObject({
      solved: 2,
      total: 2,
      due: 2,
      urgency: "overdue",
    });
    expect(groups[0]!.rows.map((r) => r.problem.id)).toEqual([1, 2, 3]);
  });

  it("has no urgency when nothing is due", () => {
    const [arrays] = groupRows(
      [ARRAYS],
      [row(TWO_SUM), row(GROUP_ANAGRAMS)],
      DEFAULT_FILTERS,
    );
    expect(arrays).toMatchObject({
      solved: 0,
      total: 2,
      due: 0,
      urgency: null,
    });
  });

  it("lists only matching rows but keeps the counts for the whole category", () => {
    const groups = groupRows(
      [ARRAYS, POINTERS],
      rows,
      filters({ status: "unsolved" }),
    );
    expect(groups[0]!.rows.map((r) => r.problem.id)).toEqual([TOP_K.id]);
    expect(groups[0]).toMatchObject({ solved: 2, total: 3 });
    expect(groups[1]!.rows).toEqual([]);
  });
});

describe("sortByNextDue", () => {
  it("puts the earliest due revision first, then the rest in NeetCode order", () => {
    const rows = [
      row(TWO_SUM),
      row(
        GROUP_ANAGRAMS,
        entry(GROUP_ANAGRAMS.id, { status: "later", date: "2026-10-10" }),
      ),
      row(TOP_K, entry(TOP_K.id, "complete")),
      row(
        VALID_PALINDROME,
        entry(VALID_PALINDROME.id, { status: "overdue", date: "2026-09-20" }),
      ),
      row(
        TRAPPING,
        entry(TRAPPING.id, { status: "later", date: "2026-10-10" }),
      ),
    ];
    expect(sortByNextDue(rows).map((r) => r.problem.id)).toEqual([
      VALID_PALINDROME.id,
      GROUP_ANAGRAMS.id,
      TRAPPING.id,
      TWO_SUM.id,
      TOP_K.id,
    ]);
  });

  it("doesn't change the input", () => {
    const rows = [
      row(TWO_SUM),
      row(
        TRAPPING,
        entry(TRAPPING.id, { status: "overdue", date: "2026-09-20" }),
      ),
    ];
    sortByNextDue(rows);
    expect(rows.map((r) => r.problem.id)).toEqual([TWO_SUM.id, TRAPPING.id]);
  });
});
