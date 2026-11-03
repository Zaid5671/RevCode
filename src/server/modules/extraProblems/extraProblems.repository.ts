import type { CalendarDate } from "@/domain/calendarDate";
import type { Confidence } from "@/domain/gaps";
import type { Difficulty } from "@/domain/schemas";
import type { Queryable } from "@/server/db";

export type ExtraProblemRow = {
  id: string;
  user_id: string;
  title: string;
  leetcode_slug: string;
  difficulty: Difficulty;
  solved_on: CalendarDate;
  confidence: Confidence;
  revision1_completed_on: CalendarDate | null;
  revision2_completed_on: CalendarDate | null;
  revision3_completed_on: CalendarDate | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, user_id, title, leetcode_slug, difficulty, solved_on, confidence,
  revision1_completed_on, revision2_completed_on, revision3_completed_on,
  created_at, updated_at`;

export async function findCatalogProblemBySlug(
  db: Queryable,
  slug: string,
): Promise<{ id: number; title: string; difficulty: Difficulty } | null> {
  const { rows } = await db.query<{
    id: number;
    title: string;
    difficulty: Difficulty;
  }>(
    "SELECT id, title, difficulty FROM problem WHERE leetcode_slug = $1",
    [slug],
  );
  return rows[0] ?? null;
}

export async function findExtraProblemBySlug(
  db: Queryable,
  userId: string,
  slug: string,
): Promise<ExtraProblemRow | null> {
  const { rows } = await db.query<ExtraProblemRow>(
    `SELECT ${COLUMNS} FROM user_extra_problem WHERE user_id = $1 AND leetcode_slug = $2`,
    [userId, slug],
  );
  return rows[0] ?? null;
}

export async function findExtraProblemById(
  db: Queryable,
  userId: string,
  id: string,
): Promise<ExtraProblemRow | null> {
  const { rows } = await db.query<ExtraProblemRow>(
    `SELECT ${COLUMNS} FROM user_extra_problem WHERE user_id = $1 AND id = $2`,
    [userId, id],
  );
  return rows[0] ?? null;
}

export async function lockExtraProblemById(
  db: Queryable,
  userId: string,
  id: string,
): Promise<ExtraProblemRow | null> {
  const { rows } = await db.query<ExtraProblemRow>(
    `SELECT ${COLUMNS} FROM user_extra_problem WHERE user_id = $1 AND id = $2 FOR UPDATE`,
    [userId, id],
  );
  return rows[0] ?? null;
}

export async function listAllExtraProblemRows(
  db: Queryable,
  userId: string,
): Promise<ExtraProblemRow[]> {
  const { rows } = await db.query<ExtraProblemRow>(
    `SELECT ${COLUMNS} FROM user_extra_problem
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function insertExtraProblem(
  db: Queryable,
  userId: string,
  data: {
    title: string;
    leetcodeSlug: string;
    difficulty: Difficulty;
    solvedOn: CalendarDate;
    confidence: Confidence;
  },
): Promise<ExtraProblemRow> {
  const { rows } = await db.query<ExtraProblemRow>(
    `INSERT INTO user_extra_problem (
       user_id, title, leetcode_slug, difficulty, solved_on, confidence
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [
      userId,
      data.title,
      data.leetcodeSlug,
      data.difficulty,
      data.solvedOn,
      data.confidence,
    ],
  );
  return rows[0]!;
}

export async function updateExtraProblem(
  db: Queryable,
  userId: string,
  id: string,
  data: {
    title?: string;
    difficulty?: Difficulty;
    solvedOn?: CalendarDate;
    confidence?: Confidence;
    completed?: [CalendarDate | null, CalendarDate | null, CalendarDate | null];
  },
): Promise<ExtraProblemRow> {
  const updates: string[] = ["updated_at = now()"];
  const values: unknown[] = [userId, id];
  let paramIndex = 3;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex++}`);
    values.push(data.difficulty);
  }
  if (data.solvedOn !== undefined) {
    updates.push(`solved_on = $${paramIndex++}`);
    values.push(data.solvedOn);
  }
  if (data.confidence !== undefined) {
    updates.push(`confidence = $${paramIndex++}`);
    values.push(data.confidence);
  }
  if (data.completed !== undefined) {
    updates.push(`revision1_completed_on = $${paramIndex++}`);
    values.push(data.completed[0]);
    updates.push(`revision2_completed_on = $${paramIndex++}`);
    values.push(data.completed[1]);
    updates.push(`revision3_completed_on = $${paramIndex++}`);
    values.push(data.completed[2]);
  }

  const { rows } = await db.query<ExtraProblemRow>(
    `UPDATE user_extra_problem
     SET ${updates.join(", ")}
     WHERE user_id = $1 AND id = $2
     RETURNING ${COLUMNS}`,
    values,
  );
  return rows[0]!;
}

export async function deleteExtraProblem(
  db: Queryable,
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await db.query(
    "DELETE FROM user_extra_problem WHERE user_id = $1 AND id = $2",
    [userId, id],
  );
  return (result.rowCount ?? 0) > 0;
}

