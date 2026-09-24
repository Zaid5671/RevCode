// Notes rules (PLAN.md §8.4). Notes are independent of progress: they exist on unsolved
// problems and survive "unmark solved". Saves compare the note's `version` with the one
// the client loaded, so a stale tab can't overwrite newer text.
import type {
  Note,
  NoteSearchResult,
  NoteSummary,
  PutNoteBody,
} from "@/domain/schemas";
import { pool } from "@/server/db";
import { AppError } from "@/server/errors";
import { categoryExists } from "../catalog/catalog.repository";
import {
  deleteNoteRecord,
  findNote,
  findNotesContaining,
  insertNote,
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
  const [exists, notes] = await Promise.all([
    categoryExists(pool, categoryId),
    listNotesInCategory(pool, userId, categoryId),
  ]);
  if (!exists) throw new AppError("NOT_FOUND", "There is no such category.");
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
 * empty or whitespace-only body deletes it and returns `undefined` (204).
 */
export async function saveNote(
  userId: string,
  problemId: number,
  { body, baseVersion }: PutNoteBody,
): Promise<Note | undefined> {
  if (body.trim() === "") {
    // With no note loaded there is nothing to delete, even if another tab has since
    // created one. Otherwise delete only the version the client saw.
    if (
      baseVersion === null ||
      (await deleteNoteRecord(pool, userId, problemId, baseVersion))
    ) {
      return undefined;
    }
    const current = await findNote(pool, userId, problemId);
    // Already deleted elsewhere: the outcome the client asked for.
    if (!current) return undefined;
    throw noteConflict(current.version);
  }

  const saved =
    baseVersion === null
      ? await insertNote(pool, userId, problemId, body)
      : await updateNote(pool, userId, problemId, body, baseVersion);
  if (saved) return saved;
  const current = await findNote(pool, userId, problemId);
  throw noteConflict(current?.version ?? null);
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

/** DELETE /api/notes/:problemId. Succeeds whether or not there was a note (204). */
export async function deleteNote(
  userId: string,
  problemId: number,
): Promise<void> {
  await deleteNoteRecord(pool, userId, problemId);
}
