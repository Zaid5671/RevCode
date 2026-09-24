import { describe, expect, expectTypeOf, it } from "vitest";
import { DEFAULT_GAPS } from "./gaps";
import type { Schedule } from "./schedule";
import {
  calendarDateSchema,
  categoryIdParamsSchema,
  notesExportQuerySchema,
  noteSearchQuerySchema,
  NOTE_MAX_CHARS,
  patchProgressBodySchema,
  problemIdParamsSchema,
  progressEntrySchema,
  type ProgressEntry,
  putGapsBodySchema,
  putNoteBodySchema,
  putProgressBodySchema,
  putRevisionBodySchema,
  revisionParamsSchema,
  updateMeBodySchema,
} from "./schemas";

const accepts = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  value: unknown,
) => schema.safeParse(value).success;

describe("calendarDateSchema", () => {
  it.each([
    ["2026-09-24", true],
    ["2028-02-29", true],
    ["2026-02-30", false],
    ["2026-09-24T10:00:00Z", false],
    [20260924, false],
  ])("%j → %s", (value, expected) => {
    expect(accepts(calendarDateSchema, value)).toBe(expected);
  });
});

describe("path params", () => {
  it.each([
    ["1", 1],
    ["250", 250],
    ["32767", 32767],
  ])("problemId %j → %i", (value, expected) => {
    expect(problemIdParamsSchema.parse({ problemId: value })).toEqual({
      problemId: expected,
    });
  });

  it.each(["0", "-1", "01", "1.5", "1e2", "", " 5", "abc", "32768"])(
    "rejects problemId %j",
    (value) => {
      expect(accepts(problemIdParamsSchema, { problemId: value })).toBe(false);
    },
  );

  it("parses a category id the same way", () => {
    expect(categoryIdParamsSchema.parse({ categoryId: "18" })).toEqual({
      categoryId: 18,
    });
    expect(accepts(categoryIdParamsSchema, { categoryId: "0" })).toBe(false);
  });

  it.each([
    ["1", 1],
    ["3", 3],
  ])("revision n %j → %i", (n, expected) => {
    expect(revisionParamsSchema.parse({ problemId: "7", n })).toEqual({
      problemId: 7,
      n: expected,
    });
  });

  it.each(["0", "4", "01", "one"])("rejects revision n %j", (n) => {
    expect(accepts(revisionParamsSchema, { problemId: "7", n })).toBe(false);
  });
});

describe("progress bodies", () => {
  it("PUT accepts a solve date and confidence", () => {
    expect(
      putProgressBodySchema.parse({ solvedOn: "2026-09-24", confidence: 2 }),
    ).toEqual({
      solvedOn: "2026-09-24",
      confidence: 2,
    });
  });

  it.each([
    ["confidence 0", { solvedOn: "2026-09-24", confidence: 0 }],
    ["confidence 4", { solvedOn: "2026-09-24", confidence: 4 }],
    ["confidence 2.5", { solvedOn: "2026-09-24", confidence: 2.5 }],
    ["confidence as text", { solvedOn: "2026-09-24", confidence: "2" }],
    ["a bad date", { solvedOn: "2026-02-30", confidence: 2 }],
    ["a missing field", { confidence: 2 }],
    [
      "an unknown key",
      { solvedOn: "2026-09-24", confidence: 2, userId: "someone-else" },
    ],
  ])("PUT rejects %s", (_, body) => {
    expect(accepts(putProgressBodySchema, body)).toBe(false);
  });

  it.each([
    ["only a date", { solvedOn: "2026-09-20" }, true],
    ["only confidence", { confidence: 3 }, true],
    ["both", { solvedOn: "2026-09-20", confidence: 3 }, true],
    ["nothing", {}, false],
    ["an unknown key", { confidence: 3, revision1: "2026-09-21" }, false],
  ])("PATCH with %s → %s", (_, body, expected) => {
    expect(accepts(patchProgressBodySchema, body)).toBe(expected);
  });

  it.each([
    [{ completedOn: "2026-09-24" }, true],
    [{ completedOn: null }, false],
    [{}, false],
    [{ completedOn: "2026-09-24", n: 2 }, false],
  ])("revision body %j → %s", (body, expected) => {
    expect(accepts(putRevisionBodySchema, body)).toBe(expected);
  });
});

describe("updateMeBodySchema", () => {
  it.each([
    [{ timezone: "Asia/Kolkata" }, true],
    [{ timezone: "UTC" }, true],
    [{ timezone: "Mars/Base" }, false],
    [{ timezone: null }, false],
    [{ timezone: "UTC", email: "x@example.com" }, false],
  ])("%j → %s", (body, expected) => {
    expect(accepts(updateMeBodySchema, body)).toBe(expected);
  });
});

describe("putGapsBodySchema", () => {
  it("accepts a full gaps table", () => {
    expect(accepts(putGapsBodySchema, { gaps: DEFAULT_GAPS })).toBe(true);
  });

  it("rejects out-of-range gaps and unknown keys", () => {
    expect(
      accepts(putGapsBodySchema, { gaps: { ...DEFAULT_GAPS, 1: [0, 4, 10] } }),
    ).toBe(false);
    expect(
      accepts(putGapsBodySchema, { gaps: DEFAULT_GAPS, reset: true }),
    ).toBe(false);
  });
});

describe("putNoteBodySchema", () => {
  it.each([
    ["a new note", { body: "## Approach", baseVersion: null }, true],
    ["an update", { body: "## Approach", baseVersion: 3 }, true],
    ["an empty body (deletes the note)", { body: "", baseVersion: 3 }, true],
    [
      "a whitespace body (deletes the note)",
      { body: "  \n ", baseVersion: 3 },
      true,
    ],
    [
      "exactly the limit",
      { body: "a".repeat(NOTE_MAX_CHARS), baseVersion: null },
      true,
    ],
    [
      "one over the limit",
      { body: "a".repeat(NOTE_MAX_CHARS + 1), baseVersion: null },
      false,
    ],
    // Postgres text can't hold a NUL character; storing one would be a 500.
    ["a NUL character", { body: "a\u0000b", baseVersion: null }, false],
    ["a missing baseVersion", { body: "x" }, false],
    ["baseVersion 0", { body: "x", baseVersion: 0 }, false],
    ["a fractional baseVersion", { body: "x", baseVersion: 1.5 }, false],
    [
      "an unknown key",
      { body: "x", baseVersion: null, updatedAt: "2026-09-24" },
      false,
    ],
  ])("%s → %s", (_, body, expected) => {
    expect(accepts(putNoteBodySchema, body)).toBe(expected);
  });

  it("counts characters as Postgres does, so emoji count once", () => {
    // "😀" is two UTF-16 units in JavaScript but one character in char_length().
    const atLimit = "😀".repeat(NOTE_MAX_CHARS);
    expect(
      accepts(putNoteBodySchema, { body: atLimit, baseVersion: null }),
    ).toBe(true);
    expect(
      accepts(putNoteBodySchema, { body: atLimit + "😀", baseVersion: null }),
    ).toBe(false);
  });
});

describe("note queries", () => {
  it("trims the search text and requires some", () => {
    expect(noteSearchQuerySchema.parse({ q: "  hash map " })).toEqual({
      q: "hash map",
    });
    expect(accepts(noteSearchQuerySchema, { q: "   " })).toBe(false);
    expect(accepts(noteSearchQuerySchema, {})).toBe(false);
  });

  it("rejects a NUL character in the search text", () => {
    expect(accepts(noteSearchQuerySchema, { q: "a\u0000b" })).toBe(false);
  });

  it("export takes an optional category id", () => {
    expect(notesExportQuerySchema.parse({})).toEqual({});
    expect(notesExportQuerySchema.parse({ categoryId: "4" })).toEqual({
      categoryId: 4,
    });
    expect(accepts(notesExportQuerySchema, { categoryId: "x" })).toBe(false);
  });
});

describe("progressEntrySchema", () => {
  it("describes a ProgressEntry: the schedule plus the problem's facts", () => {
    const entry = {
      problemId: 1,
      solvedOn: "2026-09-01",
      confidence: 2,
      revisions: [
        { number: 1, status: "done", date: "2026-09-04" },
        { number: 2, status: "next_7_days", date: "2026-09-11" },
        { number: 3, status: "projected", date: "2026-09-25" },
      ],
      next: { number: 2, status: "next_7_days", date: "2026-09-11" },
      isComplete: false,
    };
    expect(progressEntrySchema.parse(entry)).toEqual(entry);
    expect(
      accepts(progressEntrySchema, {
        ...entry,
        revisions: entry.revisions.slice(0, 2),
      }),
    ).toBe(false);
  });
});

describe("schemas stay in step with the domain types", () => {
  // Checked by `npm run typecheck`; a drift between the two definitions fails it.
  it("ProgressEntry carries computeSchedule's output unchanged", () => {
    expectTypeOf<
      Pick<ProgressEntry, keyof Schedule>
    >().toEqualTypeOf<Schedule>();
  });
});
