import { describe, expect, it } from "vitest";
import { buildCatalog, type SourceCatalog } from "./build-catalog";

const source: SourceCatalog = {
  categories: ["Arrays & Hashing", "Intervals"],
  problems: [
    {
      name: "Two Sum",
      difficulty: "Easy",
      category: "Arrays & Hashing",
      leetcode_url: "https://leetcode.com/problems/two-sum/",
      slug: "two-integer-sum",
    },
    {
      name: "Meeting Rooms",
      difficulty: "Easy",
      category: "Intervals",
      leetcode_url: "https://leetcode.com/problems/meeting-rooms",
      slug: "meeting-schedule",
    },
    {
      name: "Group Anagrams",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      leetcode_url: "https://leetcode.com/problems/group-anagrams/",
      slug: "anagram-groups",
    },
  ],
};

describe("buildCatalog", () => {
  it("numbers categories in file order", () => {
    expect(buildCatalog(source).categories).toEqual([
      { id: 1, name: "Arrays & Hashing", position: 1 },
      { id: 2, name: "Intervals", position: 2 },
    ]);
  });

  it("takes the LeetCode slug from the URL and keeps the NeetCode slug separately", () => {
    const [twoSum] = buildCatalog(source).problems;
    expect(twoSum).toMatchObject({
      leetcodeSlug: "two-sum",
      neetcodeSlug: "two-integer-sum",
    });
  });

  it("accepts a URL without a trailing slash", () => {
    expect(buildCatalog(source).problems[1]?.leetcodeSlug).toBe(
      "meeting-rooms",
    );
  });

  it("numbers problems in file order and positions within each category", () => {
    const problems = buildCatalog(source).problems;
    expect(problems.map((p) => [p.id, p.categoryId, p.position])).toEqual([
      [1, 1, 1],
      [2, 2, 1],
      [3, 1, 2],
    ]);
  });

  it("maps difficulty and flags Premium problems", () => {
    const problems = buildCatalog(source).problems;
    expect(problems.map((p) => [p.difficulty, p.isPremium])).toEqual([
      ["EASY", false],
      ["EASY", true],
      ["MEDIUM", false],
    ]);
  });

  it.each([
    [
      "an unknown category",
      { category: "Sorting" },
      /unknown category "Sorting"/,
    ],
    [
      "an unknown difficulty",
      { difficulty: "Insane" },
      /unknown difficulty "Insane"/,
    ],
    [
      "a non-LeetCode URL",
      { leetcode_url: "https://neetcode.io/problems/two-sum" },
      /unexpected leetcode_url/,
    ],
  ])("rejects %s", (_, change, message) => {
    const [first, ...rest] = source.problems;
    const broken = { ...source, problems: [{ ...first!, ...change }, ...rest] };
    expect(() => buildCatalog(broken)).toThrow(message);
  });
});
