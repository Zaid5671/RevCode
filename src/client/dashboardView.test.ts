import { describe, expect, it } from "vitest";
import type {
  CatalogResponse,
  DashboardItem,
  DashboardResponse,
  Problem,
} from "@/domain/schemas";
import { buildDashboard, nextToSolve } from "./dashboardView";

// Wed 23 Sep 2026, the brief's sample day (DESIGN-BRIEF.md §3).
const TODAY = "2026-09-23";

function problem(id: number, title: string, categoryId: number): Problem {
  const slug = title.toLowerCase().replaceAll(" ", "-");
  return {
    id,
    title,
    leetcodeSlug: slug,
    leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
    difficulty: "EASY",
    categoryId,
    position: id,
    isPremium: false,
  };
}

const CATALOG: CatalogResponse = {
  categories: [
    { id: 1, name: "Arrays & Hashing", position: 1 },
    { id: 2, name: "Sliding Window", position: 2 },
    { id: 3, name: "Stack", position: 3 },
  ],
  problems: [
    problem(1, "Two Sum", 1),
    problem(2, "Group Anagrams", 1),
    problem(3, "Majority Element", 1),
    problem(4, "Valid Anagram", 1),
    problem(5, "Permutation in String", 2),
    problem(6, "Valid Parentheses", 3),
    problem(7, "Implement Stack Using Queues", 3),
  ],
};

function item(
  problemId: number,
  revision: 1 | 2 | 3,
  dueDate: string,
  extra: Partial<DashboardItem> = {},
): DashboardItem {
  return { problemId, revision, dueDate, hasNote: false, ...extra };
}

const STATS: DashboardResponse["stats"] = {
  solved: { total: 86, easy: 40, medium: 36, hard: 10 },
  completedCycles: 21,
  notes: 12,
};

function dashboard(lists: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    today: TODAY,
    overdue: [],
    dueToday: [],
    dueTomorrow: [],
    next7Days: [],
    stats: STATS,
    ...lists,
  };
}

// The brief's sample reminders.
const SAMPLE = dashboard({
  overdue: [
    item(5, 1, "2026-09-20", { daysOverdue: 3 }),
    item(6, 2, "2026-09-22", { daysOverdue: 1, hasNote: true }),
  ],
  dueToday: [item(3, 1, TODAY)],
  dueTomorrow: [item(2, 1, "2026-09-24", { hasNote: true })],
  next7Days: [
    item(1, 2, "2026-09-25"),
    item(7, 2, "2026-09-25"),
    item(4, 3, "2026-09-30"),
  ],
});

describe("buildDashboard", () => {
  it("puts overdue then due-today revisions in Revise now, in the server's order", () => {
    const { reviseNow } = buildDashboard(SAMPLE, CATALOG);
    expect(
      reviseNow.map((r) => [
        r.problem.title,
        r.revision.number,
        r.revision.status,
      ]),
    ).toEqual([
      ["Permutation in String", 1, "overdue"],
      ["Valid Parentheses", 2, "overdue"],
      ["Majority Element", 1, "due_today"],
    ]);
  });

  it("gives each reminder its due date, category name and note flag", () => {
    const [first, second] = buildDashboard(SAMPLE, CATALOG).reviseNow;
    expect(first).toMatchObject({
      categoryName: "Sliding Window",
      revision: { number: 1, status: "overdue", date: "2026-09-20" },
      hasNote: false,
    });
    expect(second).toMatchObject({ categoryName: "Stack", hasNote: true });
  });

  it("groups Coming up by due date, labelled Tomorrow or with the weekday", () => {
    const { comingUp } = buildDashboard(SAMPLE, CATALOG);
    expect(
      comingUp.map((g) => [
        g.date,
        g.label,
        g.reminders.map((r) => r.problem.title),
      ]),
    ).toEqual([
      ["2026-09-24", "Tomorrow", ["Group Anagrams"]],
      ["2026-09-25", "Fri 25 Sep", ["Two Sum", "Implement Stack Using Queues"]],
      ["2026-09-30", "Wed 30 Sep", ["Valid Anagram"]],
    ]);
    expect(comingUp[0]?.reminders[0]?.revision.status).toBe("due_tomorrow");
    expect(comingUp[1]?.reminders[0]?.revision.status).toBe("next_7_days");
  });

  it("says how far away each date group is, except Tomorrow", () => {
    const { comingUp } = buildDashboard(SAMPLE, CATALOG);
    expect(comingUp.map((g) => g.relative)).toEqual([
      null,
      "in 2 days",
      "in 7 days",
    ]);
  });

  it("counts the stats strip, with Next 7 days including tomorrow", () => {
    expect(buildDashboard(SAMPLE, CATALOG).stats).toMatchObject({
      solved: 86,
      overdue: 2,
      dueToday: 1,
      next7Days: 4,
      complete: 21,
    });
  });

  it("rounds the solved percentage against the whole catalog", () => {
    const full = {
      ...CATALOG,
      problems: Array.from({ length: 250 }, (_, i) =>
        problem(i + 1, `P${i}`, 1),
      ),
    };
    const { stats } = buildDashboard(dashboard(), full);
    expect(stats).toMatchObject({ solved: 86, total: 250, solvedPercent: 34 });
  });

  it("has empty lists and zero counts when nothing is due", () => {
    const view = buildDashboard(
      dashboard({
        stats: {
          ...STATS,
          solved: { ...STATS.solved, total: 0 },
          completedCycles: 0,
        },
      }),
      CATALOG,
    );
    expect(view.reviseNow).toEqual([]);
    expect(view.comingUp).toEqual([]);
    expect(view.stats).toMatchObject({
      solved: 0,
      solvedPercent: 0,
      overdue: 0,
      dueToday: 0,
      next7Days: 0,
      complete: 0,
    });
  });

  it("skips a reminder whose problem isn't in the catalog", () => {
    const view = buildDashboard(
      dashboard({ dueToday: [item(999, 1, TODAY), item(3, 1, TODAY)] }),
      CATALOG,
    );
    expect(view.reviseNow.map((r) => r.problem.id)).toEqual([3]);
  });
});

describe("nextToSolve", () => {
  const solved = (...ids: number[]) => ids.map((problemId) => ({ problemId }));

  it("is the first problem for a new user", () => {
    expect(nextToSolve(CATALOG, [])).toMatchObject({
      problem: { title: "Two Sum" },
      categoryName: "Arrays & Hashing",
    });
  });

  it("skips solved problems, in NeetCode order", () => {
    expect(nextToSolve(CATALOG, solved(1, 2, 3, 4))).toMatchObject({
      problem: { title: "Permutation in String" },
      categoryName: "Sliding Window",
    });
  });

  it("finds a gap left earlier in the order", () => {
    expect(nextToSolve(CATALOG, solved(1, 3, 4, 5))?.problem.title).toBe(
      "Group Anagrams",
    );
  });

  it("orders by category position, then problem position, not by the catalog's array order", () => {
    const shuffled: CatalogResponse = {
      categories: [
        { id: 2, name: "Sliding Window", position: 2 },
        { id: 1, name: "Arrays & Hashing", position: 1 },
      ],
      problems: [
        { ...problem(5, "Permutation in String", 2), position: 1 },
        { ...problem(2, "Group Anagrams", 1), position: 2 },
        { ...problem(1, "Two Sum", 1), position: 1 },
      ],
    };
    expect(nextToSolve(shuffled, solved(1))?.problem.title).toBe(
      "Group Anagrams",
    );
  });

  it("is null once every problem is solved", () => {
    expect(nextToSolve(CATALOG, solved(1, 2, 3, 4, 5, 6, 7))).toBeNull();
  });
});
