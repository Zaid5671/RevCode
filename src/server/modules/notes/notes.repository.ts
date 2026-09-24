// SQL for problem_note (PLAN.md §5.3). Every query is scoped to the session user's id.
// Lists come in catalog order: category position, then problem position.
import type { Note, NoteSummary } from "@/domain/schemas";
import type { Queryable } from "@/server/db";

type NoteRow = {
  problem_id: number;
  body: string;
  version: number;
  updated_at: Date;
};

const COLUMNS =
  "problem_note.problem_id, body, version, problem_note.updated_at";

const IN_CATALOG_ORDER = `
  JOIN problem ON problem.id = problem_note.problem_id
  JOIN category ON category.id = problem.category_id`;
const CATALOG_ORDER = "ORDER BY category.position, problem.position";

function toNote(row: NoteRow): Note {
  return {
    problemId: row.problem_id,
    body: row.body,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listNoteSummaries(
  db: Queryable,
  userId: string,
): Promise<NoteSummary[]> {
  const { rows } = await db.query<Pick<NoteRow, "problem_id" | "updated_at">>(
    `SELECT problem_note.problem_id, problem_note.updated_at
     FROM problem_note ${IN_CATALOG_ORDER}
     WHERE problem_note.user_id = $1
     ${CATALOG_ORDER}`,
    [userId],
  );
  return rows.map((row) => ({
    problemId: row.problem_id,
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function findNote(
  db: Queryable,
  userId: string,
  problemId: number,
): Promise<Note | null> {
  const { rows } = await db.query<NoteRow>(
    `SELECT ${COLUMNS} FROM problem_note
     WHERE user_id = $1 AND problem_id = $2`,
    [userId, problemId],
  );
  return rows[0] ? toNote(rows[0]) : null;
}

export async function listNotesInCategory(
  db: Queryable,
  userId: string,
  categoryId: number,
): Promise<Note[]> {
  const { rows } = await db.query<NoteRow>(
    `SELECT ${COLUMNS} FROM problem_note ${IN_CATALOG_ORDER}
     WHERE problem_note.user_id = $1 AND problem.category_id = $2
     ${CATALOG_ORDER}`,
    [userId, categoryId],
  );
  return rows.map(toNote);
}

/** Notes whose body contains `text`, ignoring case. `%`, `_` and `\` match themselves. */
export async function findNotesContaining(
  db: Queryable,
  userId: string,
  text: string,
): Promise<Note[]> {
  const pattern = `%${text.replace(/[\\%_]/g, "\\$&")}%`;
  const { rows } = await db.query<NoteRow>(
    `SELECT ${COLUMNS} FROM problem_note ${IN_CATALOG_ORDER}
     WHERE problem_note.user_id = $1 AND body ILIKE $2 ESCAPE '\\'
     ${CATALOG_ORDER}`,
    [userId, pattern],
  );
  return rows.map(toNote);
}

/** Inserts a new note at version 1; `null` if the user already has a note on this problem. */
export async function insertNote(
  db: Queryable,
  userId: string,
  problemId: number,
  body: string,
): Promise<Note | null> {
  const { rows } = await db.query<NoteRow>(
    `INSERT INTO problem_note (user_id, problem_id, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, problem_id) DO NOTHING
     RETURNING ${COLUMNS}`,
    [userId, problemId, body],
  );
  return rows[0] ? toNote(rows[0]) : null;
}

/**
 * Replaces the body only if the stored version is still `baseVersion`, and moves the
 * version up by one; `null` if the note is gone or has another version.
 */
export async function updateNote(
  db: Queryable,
  userId: string,
  problemId: number,
  body: string,
  baseVersion: number,
): Promise<Note | null> {
  const { rows } = await db.query<NoteRow>(
    `UPDATE problem_note
     SET body = $3, version = version + 1, updated_at = now()
     WHERE user_id = $1 AND problem_id = $2 AND version = $4
     RETURNING ${COLUMNS}`,
    [userId, problemId, body, baseVersion],
  );
  return rows[0] ? toNote(rows[0]) : null;
}

/**
 * Deletes the note; with `baseVersion`, only if the stored version is still that one.
 * Returns whether a row was deleted.
 */
export async function deleteNoteRecord(
  db: Queryable,
  userId: string,
  problemId: number,
  baseVersion?: number,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM problem_note
     WHERE user_id = $1 AND problem_id = $2
       AND ($3::integer IS NULL OR version = $3)`,
    [userId, problemId, baseVersion ?? null],
  );
  return rowCount === 1;
}
