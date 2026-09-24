// Checks the committed catalog (PLAN.md §5.4). Its ids are permanent once seeded.
import { describe, expect, it } from "vitest";
import {
  PREMIUM_LEETCODE_SLUGS,
  type Catalog,
} from "../../scripts/build-catalog";
import catalogJson from "./catalog.json";

const catalog = catalogJson as Catalog;
const { categories, problems } = catalog;

const unique = <T>(values: T[]) => new Set(values).size === values.length;

describe("catalog.json", () => {
  it("has 18 categories with unique ids, names and positions", () => {
    expect(categories).toHaveLength(18);
    expect(unique(categories.map((c) => c.id))).toBe(true);
    expect(unique(categories.map((c) => c.name))).toBe(true);
    expect(unique(categories.map((c) => c.position))).toBe(true);
  });

  it("has 250 problems with unique ids and slugs", () => {
    expect(problems).toHaveLength(250);
    expect(unique(problems.map((p) => p.id))).toBe(true);
    expect(unique(problems.map((p) => p.leetcodeSlug))).toBe(true);
    expect(unique(problems.map((p) => p.neetcodeSlug))).toBe(true);
  });

  it("has valid LeetCode slugs and difficulties", () => {
    for (const p of problems) {
      expect(p.leetcodeSlug).toMatch(/^[a-z0-9-]+$/);
      expect(p.neetcodeSlug).toMatch(/^[a-z0-9-]+$/);
      expect(["EASY", "MEDIUM", "HARD"]).toContain(p.difficulty);
    }
  });

  it("puts every problem in an existing category, at a unique position", () => {
    const categoryIds = new Set(categories.map((c) => c.id));
    for (const p of problems) expect(categoryIds).toContain(p.categoryId);
    expect(unique(problems.map((p) => `${p.categoryId}:${p.position}`))).toBe(
      true,
    );
  });

  it("marks exactly the 7 Premium problems", () => {
    const premium = problems
      .filter((p) => p.isPremium)
      .map((p) => p.leetcodeSlug);
    expect(premium.toSorted()).toEqual([...PREMIUM_LEETCODE_SLUGS].sort());
  });
});
