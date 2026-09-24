import { describe, expect, it } from "vitest";
import {
  buildNotesMarkdown,
  exportFilename,
  type ExportNote,
} from "./notes.markdown";

const TWO_SUM: ExportNote = {
  position: 4,
  title: "Two Sum",
  difficulty: "EASY",
  leetcodeUrl: "https://leetcode.com/problems/two-sum/",
  body: "## Approach\nHash map: value → index.",
};

const GROUP_ANAGRAMS: ExportNote = {
  position: 6,
  title: "Group Anagrams",
  difficulty: "MEDIUM",
  leetcodeUrl: "https://leetcode.com/problems/group-anagrams/",
  body: "Sort each word as the key.",
};

const TWO_INTEGER_SUM_II: ExportNote = {
  position: 3,
  title: "Two Integer Sum II",
  difficulty: "HARD",
  leetcodeUrl: "https://leetcode.com/problems/two-sum-ii/",
  body: "Two pointers.",
};

describe("buildNotesMarkdown", () => {
  it("writes a category heading, then each note under its problem heading and link", () => {
    const markdown = buildNotesMarkdown([
      { category: "Arrays & Hashing", notes: [TWO_SUM, GROUP_ANAGRAMS] },
    ]);

    expect(markdown).toBe(
      [
        "# Arrays & Hashing",
        "",
        "## 4. Two Sum (Easy)",
        "",
        "<https://leetcode.com/problems/two-sum/>",
        "",
        "## Approach",
        "Hash map: value → index.",
        "",
        "## 6. Group Anagrams (Medium)",
        "",
        "<https://leetcode.com/problems/group-anagrams/>",
        "",
        "Sort each word as the key.",
        "",
      ].join("\n"),
    );
  });

  it("writes several categories in the order given", () => {
    const markdown = buildNotesMarkdown([
      { category: "Arrays & Hashing", notes: [GROUP_ANAGRAMS] },
      { category: "Two Pointers", notes: [TWO_INTEGER_SUM_II] },
    ]);

    expect(markdown).toBe(
      [
        "# Arrays & Hashing",
        "",
        "## 6. Group Anagrams (Medium)",
        "",
        "<https://leetcode.com/problems/group-anagrams/>",
        "",
        "Sort each word as the key.",
        "",
        "# Two Pointers",
        "",
        "## 3. Two Integer Sum II (Hard)",
        "",
        "<https://leetcode.com/problems/two-sum-ii/>",
        "",
        "Two pointers.",
        "",
      ].join("\n"),
    );
  });

  it("keeps the note text as written, but drops trailing blank lines so spacing stays even", () => {
    const markdown = buildNotesMarkdown([
      {
        category: "Arrays & Hashing",
        notes: [{ ...TWO_SUM, body: "  indented\n\n\n**bold**  \n\n\n" }],
      },
    ]);

    expect(markdown).toContain(
      "<https://leetcode.com/problems/two-sum/>\n\n  indented\n\n\n**bold**\n",
    );
    expect(markdown.endsWith("**bold**\n")).toBe(true);
  });

  it("closes a code block the note left open, so the next note isn't swallowed", () => {
    const markdown = buildNotesMarkdown([
      {
        category: "Arrays & Hashing",
        notes: [
          { ...TWO_SUM, body: "Code:\n```python\nseen = {}" },
          GROUP_ANAGRAMS,
        ],
      },
    ]);

    expect(markdown).toContain(
      "Code:\n```python\nseen = {}\n```\n\n## 6. Group Anagrams (Medium)",
    );
  });

  it("leaves closed code blocks alone, including fences of another kind inside them", () => {
    const body = [
      "~~~~md",
      "```",
      "not a fence here",
      "~~~",
      "~~~~~",
      "````js",
      "x",
      "````  ",
    ].join("\n");
    const markdown = buildNotesMarkdown([
      { category: "Arrays & Hashing", notes: [{ ...TWO_SUM, body }] },
    ]);

    expect(markdown.endsWith(`\n\n${body.trimEnd()}\n`)).toBe(true);
  });

  it("closes an unclosed block with a fence of the same kind and length", () => {
    const markdown = buildNotesMarkdown([
      {
        category: "Arrays & Hashing",
        notes: [{ ...TWO_SUM, body: "~~~~\ncode\n~~~\n```" }],
      },
    ]);

    expect(markdown.endsWith("~~~~\ncode\n~~~\n```\n~~~~\n")).toBe(true);
  });

  it("writes only the heading for a category with no notes", () => {
    expect(
      buildNotesMarkdown([{ category: "Arrays & Hashing", notes: [] }]),
    ).toBe("# Arrays & Hashing\n");
  });

  it("says there are no notes when there are no categories at all", () => {
    expect(buildNotesMarkdown([])).toBe("No notes yet.\n");
  });
});

describe("exportFilename", () => {
  it("names the all-notes file by date", () => {
    expect(exportFilename("2026-09-24")).toBe("revcode-notes-2026-09-24.md");
  });

  it("adds the category's name in lowercase, with & as 'and'", () => {
    expect(exportFilename("2026-09-24", "Arrays & Hashing")).toBe(
      "revcode-notes-arrays-and-hashing-2026-09-24.md",
    );
  });

  it("turns any other characters into single dashes", () => {
    expect(exportFilename("2026-09-24", "1-D Dynamic Programming")).toBe(
      "revcode-notes-1-d-dynamic-programming-2026-09-24.md",
    );
    expect(exportFilename("2026-09-24", "  Heap / Priority Queue ")).toBe(
      "revcode-notes-heap-priority-queue-2026-09-24.md",
    );
  });
});
