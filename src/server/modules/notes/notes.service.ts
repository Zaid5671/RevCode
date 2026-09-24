// Notes rules (PLAN.md §8.4). Notes are independent of progress: they exist on unsolved
// problems and survive "unmark solved". Saves compare the note's `version` with the one
// the client loaded, so a stale tab can't overwrite newer text.
import {
  leetcodeUrl,
  type Note,
  type NoteSearchResult,
  type NoteSummary,
  type PutNoteBody,
} from "@/domain/schemas";
import { userToday } from "@/domain/calendarDate";
import type { ZonedUser } from "@/server/auth";
import { pool } from "@/server/db";
import { AppError } from "@/server/errors";
// Catalog has no service (§3), so notes use its repository directly.
import { findCategory, problemExists } from "../catalog/catalog.repository";
import {
  buildNotesMarkdown,
  exportFilename,
  type ExportSection,
} from "./notes.markdown";
import {
  deleteNoteRecord,
  findNote,
  findNotesContaining,
  insertNote,
  listNotesForExport,
  listNotesInCategory,
  listNoteSummaries,
  updateNote,
} from "./notes.repository";
import { snippetFor } from "./notes.snippet";

/** GET /api/notes. Which problems have a note, in catalog order. */
export function listNotes(userId: string): Promise<NoteSummary[]> {
  return listNoteSummaries(pool, userId);
}

/** GET /api/notes/:problemId */
export async function getNote(
  userId: string,
  problemId: number,
): Promise<Note> {
  const note = await findNote(pool, userId, problemId);
  if (!note) throw new AppError("NOT_FOUND", "This problem has no note.");
  return note;
}

/** GET /api/categories/:categoryId/notes. The category's notes in catalog order. */
export async function listCategoryNotes(
  userId: string,
  categoryId: number,
): Promise<Note[]> {
  const [category, notes] = await Promise.all([
    findCategory(pool, categoryId),
    listNotesInCategory(pool, userId, categoryId),
  ]);
  if (!category) throw noSuchCategory();
  return notes;
}

/** GET /api/notes/search. Notes containing `q` (ignoring case), in catalog order. */
export async function searchNotes(
  userId: string,
  q: string,
): Promise<NoteSearchResult[]> {
  const notes = await findNotesContaining(pool, userId, q);
  return notes.map((note) => ({
    problemId: note.problemId,
    snippet: snippetFor(note.body, q),
    updatedAt: note.updatedAt,
  }));
}

/**
 * PUT /api/notes/:problemId. Creates the note (`baseVersion: null`) or updates it; an
 * empty or whitespace-only body deletes it and returns `undefined` (204). A problem that
 * isn't in the catalog is 404 in every case. Only the paths that write nothing check
 * this; a create on an unknown problem fails on the foreign key (23503 → 404).
 */
export async function saveNote(
  userId: string,
  problemId: number,
  { body, baseVersion }: PutNoteBody,
): Promise<Note | undefined> {
  if (body.trim() === "") {
    // With no note loaded there is nothing to delete, even if another tab has since
    // created one. Otherwise delete only the version the client saw.
    if (baseVersion === null) {
      await requireProblem(problemId);
      return undefined;
    }
    if (await deleteNoteRecord(pool, userId, problemId, baseVersion)) {
      return undefined;
    }
    const current = await findNote(pool, userId, problemId);
    if (current) throw noteConflict(current.version);
    // Already deleted elsewhere: the outcome the client asked for.
    await requireProblem(problemId);
    return undefined;
  }

  const saved =
    baseVersion === null
      ? await insertNote(pool, userId, problemId, body)
      : await updateNote(pool, userId, problemId, body, baseVersion);
  if (saved) return saved;
  const current = await findNote(pool, userId, problemId);
  if (!current) await requireProblem(problemId);
  throw noteConflict(current?.version ?? null);
}

/**
 * GET /api/notes/export. One category's notes (its heading alone if it has none), or
 * every category that has notes. Dated with the user's today.
 */
export async function exportNotes(
  user: ZonedUser,
  categoryId?: number,
): Promise<{ filename: string; markdown: string }> {
  const [category, rows] = await Promise.all([
    categoryId === undefined ? null : findCategory(pool, categoryId),
    listNotesForExport(pool, user.id, categoryId),
  ]);
  if (categoryId !== undefined && !category) throw noSuchCategory();

  // Rows come in catalog order, so each category's rows are consecutive.
  const sections: ExportSection[] = category
    ? [{ category: category.name, notes: [] }]
    : [];
  for (const row of rows) {
    let section = sections.at(-1);
    if (section?.category !== row.category_name) {
      section = { category: row.category_name, notes: [] };
      sections.push(section);
    }
    section.notes.push({
      position: row.position,
      title: row.title,
      difficulty: row.difficulty,
      leetcodeUrl: leetcodeUrl(row.leetcode_slug),
      body: row.body,
    });
  }

  return {
    filename: exportFilename(userToday(user.timezone), category?.name),
    markdown: buildNotesMarkdown(sections),
  };
}

/** DELETE /api/notes/:problemId. Succeeds whether or not there was a note (204). */
export async function deleteNote(
  userId: string,
  problemId: number,
): Promise<void> {
  await deleteNoteRecord(pool, userId, problemId);
}

async function requireProblem(problemId: number): Promise<void> {
  if (!(await problemExists(pool, problemId))) {
    throw new AppError("NOT_FOUND", "There is no such problem.");
  }
}

function noSuchCategory(): AppError {
  return new AppError("NOT_FOUND", "There is no such category.");
}

/**
 * The note changed since the client loaded it. `currentVersion` (`null` if the note was
 * deleted) lets the editor resend with it to overwrite.
 */
function noteConflict(currentVersion: number | null): AppError {
  return new AppError(
    "NOTE_CONFLICT",
    "This note was changed in another tab or device.",
    { currentVersion },
  );
}
