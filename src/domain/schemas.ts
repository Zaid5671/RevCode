// Zod schemas for every API request and response in PLAN.md §7, shared by server and client.
// Request schemas are strict (unknown keys rejected, §7.1); response schemas type what the server sends.
import { z } from "zod";
import { isValidCalendarDate, isValidTimeZone } from "./calendarDate";
import { CONFIDENCES, gapsSchema } from "./gaps";
import { REVISION_NUMBERS, REVISION_STATUSES } from "./schedule";

// ── Building blocks ─────────────────────────────────────────────────────────

export const calendarDateSchema = z.string().refine(isValidCalendarDate, {
  message: "Expected a real date as YYYY-MM-DD",
});

export const timeZoneSchema = z.string().refine(isValidTimeZone, {
  message: "Expected an IANA time zone such as Asia/Kolkata",
});

export const confidenceSchema = z.literal(CONFIDENCES);

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

/** Server timestamps (e.g. a note's `updatedAt`), sent as ISO 8601 strings. */
const timestampSchema = z.iso.datetime();

// Ids arrive as path or query strings. Catalog ids are SMALLINT, so anything above 32767
// is rejected here rather than reaching Postgres as an out-of-range error.
const MAX_SMALLINT = 32767;
const idStringSchema = z
  .string()
  .regex(/^[1-9]\d{0,4}$/, { message: "Expected a positive whole number" })
  .transform(Number)
  .pipe(z.number().max(MAX_SMALLINT));

const idSchema = z.number().int().min(1).max(MAX_SMALLINT);

// ── Path params and queries ─────────────────────────────────────────────────

export const problemIdParamsSchema = z.strictObject({
  problemId: idStringSchema,
});
export const categoryIdParamsSchema = z.strictObject({
  categoryId: idStringSchema,
});
export const revisionParamsSchema = z.strictObject({
  problemId: idStringSchema,
  n: z
    .enum(["1", "2", "3"])
    .transform((n) => Number(n))
    .pipe(z.literal(REVISION_NUMBERS)),
});

// ── Errors (§7.1) ───────────────────────────────────────────────────────────

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN_ORIGIN",
  "SESSION_NOT_FRESH",
  "NOT_FOUND",
  "CONFLICT",
  "TIMELINE_CONFLICT",
  "NOTE_CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "INTERNAL_ERROR",
] as const;
export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ── Health and profile ──────────────────────────────────────────────────────

export const healthResponseSchema = z.object({ ok: z.literal(true) });

export const meSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  /** `null` until set; the server treats it as UTC (§4.5). */
  timezone: z.string().nullable(),
  today: calendarDateSchema,
});
export type Me = z.infer<typeof meSchema>;

export const updateMeBodySchema = z.strictObject({ timezone: timeZoneSchema });
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

// ── Catalog ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  position: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export const problemSchema = z.object({
  id: idSchema,
  title: z.string(),
  leetcodeSlug: z.string(),
  /** Derived from the slug, never stored (§5.2). */
  leetcodeUrl: z.url(),
  difficulty: difficultySchema,
  categoryId: idSchema,
  position: z.number().int(),
  isPremium: z.boolean(),
});
export type Problem = z.infer<typeof problemSchema>;

export const catalogResponseSchema = z.object({
  categories: z.array(categorySchema),
  problems: z.array(problemSchema),
});
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;

// ── Progress ────────────────────────────────────────────────────────────────

const revisionNumberSchema = z.literal(REVISION_NUMBERS);

export const revisionSchema = z.object({
  number: revisionNumberSchema,
  status: z.enum(REVISION_STATUSES),
  date: calendarDateSchema,
});

/** The output of `computeSchedule` plus the problem's stored facts (§7). */
export const progressEntrySchema = z.object({
  problemId: idSchema,
  solvedOn: calendarDateSchema,
  confidence: confidenceSchema,
  revisions: z.tuple([revisionSchema, revisionSchema, revisionSchema]),
  next: revisionSchema.nullable(),
  isComplete: z.boolean(),
});
export type ProgressEntry = z.infer<typeof progressEntrySchema>;

export const progressListResponseSchema = z.object({
  today: calendarDateSchema,
  entries: z.array(progressEntrySchema),
});
export type ProgressListResponse = z.infer<typeof progressListResponseSchema>;

export const putProgressBodySchema = z.strictObject({
  solvedOn: calendarDateSchema,
  confidence: confidenceSchema,
});
export type PutProgressBody = z.infer<typeof putProgressBodySchema>;

export const patchProgressBodySchema = z
  .strictObject({
    solvedOn: calendarDateSchema.optional(),
    confidence: confidenceSchema.optional(),
  })
  .refine(
    (body) => body.solvedOn !== undefined || body.confidence !== undefined,
    {
      message: "Send solvedOn, confidence or both",
    },
  );
export type PatchProgressBody = z.infer<typeof patchProgressBodySchema>;

export const putRevisionBodySchema = z.strictObject({
  completedOn: calendarDateSchema,
});
export type PutRevisionBody = z.infer<typeof putRevisionBodySchema>;

// ── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardItemSchema = z.object({
  problemId: idSchema,
  revision: revisionNumberSchema,
  dueDate: calendarDateSchema,
  /** Present only in the overdue list. */
  daysOverdue: z.number().int().min(1).optional(),
  hasNote: z.boolean(),
});
export type DashboardItem = z.infer<typeof dashboardItemSchema>;

export const dashboardStatsSchema = z.object({
  solved: z.object({
    total: z.number().int(),
    easy: z.number().int(),
    medium: z.number().int(),
    hard: z.number().int(),
  }),
  completedCycles: z.number().int(),
  notes: z.number().int(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const dashboardResponseSchema = z.object({
  today: calendarDateSchema,
  overdue: z.array(dashboardItemSchema),
  dueToday: z.array(dashboardItemSchema),
  dueTomorrow: z.array(dashboardItemSchema),
  next7Days: z.array(dashboardItemSchema),
  stats: dashboardStatsSchema,
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

// ── Gaps ────────────────────────────────────────────────────────────────────

export const gapsResponseSchema = z.object({
  gaps: gapsSchema,
  isDefault: z.boolean(),
});
export type GapsResponse = z.infer<typeof gapsResponseSchema>;

export const putGapsBodySchema = z.strictObject({ gaps: gapsSchema });
export type PutGapsBody = z.infer<typeof putGapsBodySchema>;

// ── Notes ───────────────────────────────────────────────────────────────────

/** Matches the database's `char_length(body) <= 20000`, which counts characters, not UTF-16 units. */
export const NOTE_MAX_CHARS = 20_000;

export const noteSummarySchema = z.object({
  problemId: idSchema,
  updatedAt: timestampSchema,
});
export type NoteSummary = z.infer<typeof noteSummarySchema>;

/** `GET /api/notes` */
export const noteSummaryListSchema = z.array(noteSummarySchema);

export const noteSchema = z.object({
  problemId: idSchema,
  body: z.string(),
  /** Increments on every save; conflict checks compare it (§5.3). */
  version: z.number().int().min(1),
  updatedAt: timestampSchema,
});
export type Note = z.infer<typeof noteSchema>;

/** `GET /api/categories/:categoryId/notes` */
export const categoryNotesSchema = z.array(noteSchema);

// Postgres `text` can't store a NUL character, so text that reaches the database rejects it.
const hasNoNul = (text: string) => !text.includes("\u0000");
const NO_NUL = { message: "Text can't contain a NUL character" };

export const putNoteBodySchema = z.strictObject({
  /** An empty or whitespace-only body deletes the note. */
  body: z
    .string()
    .refine(hasNoNul, NO_NUL)
    .refine((body) => [...body].length <= NOTE_MAX_CHARS, {
      message: `Notes are limited to ${NOTE_MAX_CHARS.toLocaleString("en-US")} characters`,
    }),
  /** The version the client loaded, or `null` for a new note. */
  baseVersion: z.number().int().min(1).nullable(),
});
export type PutNoteBody = z.infer<typeof putNoteBodySchema>;

export const noteSearchQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(200).refine(hasNoNul, NO_NUL),
});
export type NoteSearchQuery = z.infer<typeof noteSearchQuerySchema>;

export const noteSearchResultSchema = z.object({
  problemId: idSchema,
  snippet: z.string(),
  updatedAt: timestampSchema,
});
export type NoteSearchResult = z.infer<typeof noteSearchResultSchema>;

/** `GET /api/notes/search` */
export const noteSearchResultListSchema = z.array(noteSearchResultSchema);

export const notesExportQuerySchema = z.strictObject({
  categoryId: idStringSchema.optional(),
});
export type NotesExportQuery = z.infer<typeof notesExportQuerySchema>;
