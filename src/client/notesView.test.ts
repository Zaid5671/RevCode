import { describe, expect, it } from "vitest";
import type {
  CatalogResponse,
  Category,
  Note,
  Problem,
  ProgressEntry,
} from "@/domain/schemas";
import {
  categoryDocument,
  countNotes,
  defaultCategoryId,
  highlightParts,
  parseCategoryParam,
  searchHits,
} from "./notesView";

// ── Fixtures ────────────────────────────────────────────────────────────────

const ARRAYS: Category = { id: 1, name: "Arrays & Hashing", position: 1 };
const POINTERS: Category = { id: 2, name: "Two Pointers", position: 2 };
const STACK: Category = { id: 3, name: "Stack", position: 3 };

function problem(
  id: number,
  title: string,
  categoryId: number,
  position: number,
): Problem {
  const slug = title.toLowerCase().replaceAll(" ", "-");
  return {
    id,
    title,
    leetcodeSlug: slug,
    leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
    difficulty: "EASY",
    categoryId,
    position,
    isPremium: false,
  };
}

// Deliberately out of order, to check that results follow the catalog.
const CATALOG: CatalogResponse = {
  categories: [POINTERS, STACK, ARRAYS],
  problems: [
    problem(12, "Valid Palindrome", 2, 2),
    problem(2, "Two Sum", 1, 2),
    problem(1, "Contains Duplicate", 1, 1),
    problem(3, "Group Anagrams", 1, 3),
    problem(11, "Reverse String", 2, 1),
    problem(21, "Min Stack", 3, 1),
  ],
};

const AT = "2026-09-20T10:00:00.000Z";
const summary = (problemId: number) => ({ problemId, updatedAt: AT });
const note = (problemId: number, body = "text"): Note => ({
  problemId,
  body,
  version: 1,
  updatedAt: AT,
});

function entry(problemId: number, confidence: 1 | 2 | 3): ProgressEntry {
  return {
    problemId,
    solvedOn: "2026-09-01",
    confidence,
    revisions: [
      { number: 1, status: "done", date: "2026-09-03" },
      { number: 2, status: "done", date: "2026-09-10" },
      { number: 3, status: "done", date: "2026-09-20" },
    ],
    next: null,
    isComplete: true,
  };
}

// ── countNotes ──────────────────────────────────────────────────────────────

describe("countNotes", () => {
  it("counts each category's notes", () => {
    const counts = countNotes(CATALOG, [summary(1), summary(3), summary(12)]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
  });

  it("gives 0 for a category without notes", () => {
    expect(countNotes(CATALOG, [summary(1)]).get(3)).toBe(0);
  });

  it("ignores a note for a problem the catalog doesn't have", () => {
    const counts = countNotes(CATALOG, [summary(999)]);
    expect([...counts.values()]).toEqual([0, 0, 0]);
  });
});

// ── defaultCategoryId ───────────────────────────────────────────────────────

describe("defaultCategoryId", () => {
  it("is the first category, in catalog order, that has notes", () => {
    expect(defaultCategoryId(CATALOG, [summary(21), summary(12)])).toBe(2);
  });

  it("is the first category when there are no notes", () => {
    expect(defaultCategoryId(CATALOG, [])).toBe(1);
  });
});

// ── parseCategoryParam ──────────────────────────────────────────────────────

describe("parseCategoryParam", () => {
  it("reads a category id from the URL", () => {
    expect(parseCategoryParam("2", CATALOG)).toBe(2);
  });

  it.each(["0", "99", "abc", "1.5", "", "-1", "01x"])("rejects %j", (param) => {
    expect(parseCategoryParam(param, CATALOG)).toBeNull();
  });
});

// ── categoryDocument ────────────────────────────────────────────────────────

describe("categoryDocument", () => {
  it("lists the category's problems with notes, in NeetCode order", () => {
    const items = categoryDocument(CATALOG, 1, [note(3), note(1)], [], false);
    expect(items.map((i) => i.problem.id)).toEqual([1, 3]);
    expect(items.map((i) => i.note?.problemId)).toEqual([1, 3]);
  });

  it("includes problems without notes, with a null note, when asked", () => {
    const items = categoryDocument(CATALOG, 1, [note(3)], [], true);
    expect(items.map((i) => [i.problem.id, i.note?.problemId ?? null])).toEqual(
      [
        [1, null],
        [2, null],
        [3, 3],
      ],
    );
  });

  it("gives a solved problem's confidence, and null for an unsolved one", () => {
    const items = categoryDocument(
      CATALOG,
      1,
      [note(1), note(2)],
      [entry(2, 3)],
      false,
    );
    expect(items.map((i) => i.confidence)).toEqual([null, 3]);
  });

  it("leaves out notes from other categories", () => {
    const items = categoryDocument(CATALOG, 1, [note(12)], [], false);
    expect(items).toEqual([]);
  });
});

// ── searchHits ──────────────────────────────────────────────────────────────

describe("searchHits", () => {
  it("returns note-text matches with their snippets, in catalog order", () => {
    const hits = searchHits(
      CATALOG,
      [summary(12), summary(2)],
      [
        { problemId: 12, snippet: "two pointers", updatedAt: AT },
        { problemId: 2, snippet: "hash map", updatedAt: AT },
      ],
      "a",
    );
    expect(hits.map((h) => [h.problem.id, h.snippet, h.categoryName])).toEqual([
      [2, "hash map", "Arrays & Hashing"],
      [12, "two pointers", "Two Pointers"],
    ]);
  });

  it("adds problems with a note whose name matches, ignoring case", () => {
    const hits = searchHits(CATALOG, [summary(2), summary(1)], [], "TWO sum");
    expect(hits.map((h) => [h.problem.id, h.snippet, h.nameMatch])).toEqual([
      [2, null, true],
    ]);
  });

  it("doesn't list a problem twice when its name and its note both match", () => {
    const hits = searchHits(
      CATALOG,
      [summary(2)],
      [{ problemId: 2, snippet: "two sum idea", updatedAt: AT }],
      "two sum",
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ snippet: "two sum idea", nameMatch: true });
  });

  it("doesn't match the name of a problem without a note", () => {
    expect(searchHits(CATALOG, [summary(1)], [], "two sum")).toEqual([]);
  });

  it("uses the trimmed query for names", () => {
    const hits = searchHits(CATALOG, [summary(21)], [], "  stack ");
    expect(hits.map((h) => h.problem.id)).toEqual([21]);
  });

  it("drops a result for a problem the catalog doesn't have", () => {
    const hits = searchHits(
      CATALOG,
      [],
      [{ problemId: 999, snippet: "x", updatedAt: AT }],
      "x",
    );
    expect(hits).toEqual([]);
  });

  it("gives the date the note was edited", () => {
    const later = "2026-09-25T08:00:00.000Z";
    const hits = searchHits(
      CATALOG,
      [{ problemId: 2, updatedAt: later }],
      [],
      "two",
    );
    expect(hits[0]?.updatedAt).toBe(later);
  });
});

// ── highlightParts ──────────────────────────────────────────────────────────

describe("highlightParts", () => {
  it("marks every match, ignoring case", () => {
    expect(highlightParts("Hash map, then HASH set", "hash")).toEqual([
      { text: "Hash", match: true },
      { text: " map, then ", match: false },
      { text: "HASH", match: true },
      { text: " set", match: false },
    ]);
  });

  it("returns the text unmarked when nothing matches", () => {
    expect(highlightParts("no luck", "hash")).toEqual([
      { text: "no luck", match: false },
    ]);
  });

  it("uses the trimmed query and treats regex characters literally", () => {
    expect(highlightParts("a.b and axb", " a.b ")).toEqual([
      { text: "a.b", match: true },
      { text: " and axb", match: false },
    ]);
  });

  it("returns the text unmarked for an empty query", () => {
    expect(highlightParts("text", "  ")).toEqual([
      { text: "text", match: false },
    ]);
  });
});
