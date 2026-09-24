// SQL for user_problem (PLAN.md §5.3). Stores facts only: solve date, confidence and
// revision completion dates. Every query is scoped to the session user's id.
import type { CalendarDate } from "@/domain/calendarDate";
import type { Confidence } from "@/domain/gaps";
import type { Difficulty } from "@/domain/schemas";
import type { ScheduleInput } from "@/domain/schedule";
import type { Queryable } from "@/server/db";

/** One solved problem's stored facts. */
export type ProgressRecord = ScheduleInput & { problemId: number };

type DbRow = {
  problem_id: number;
  solved_on: CalendarDate;
  confidence: Confidence;
  revision1_completed_on: CalendarDate | null;
  revision2_completed_on: CalendarDate | null;
  revision3_completed_on: CalendarDate | null;
};

const COLUMNS = `problem_id, solved_on, confidence,
  revision1_completed_on, revision2_completed_on, revision3_completed_on`;

function toRecord(row: DbRow): ProgressRecord {
  return {
    problemId: row.problem_id,
    solvedOn: row.solved_on,
    confidence: row.confidence,
    completed: [
      row.revision1_completed_on,
      row.revision2_completed_on,
      row.revision3_completed_on,
    ],
  };
}

/** Every solved problem, in catalog id order, with its difficulty (for the dashboard stats). */
export async function listProgressRecords(
  db: Queryable,
  userId: string,
): Promise<(ProgressRecord & { difficulty: Difficulty })[]> {
  const { rows } = await db.query<DbRow & { difficulty: Difficulty }>(
    `SELECT ${COLUMNS}, problem.difficulty
     FROM user_problem JOIN problem ON problem.id = user_problem.problem_id
     WHERE user_problem.user_id = $1
     ORDER BY problem_id`,
    [userId],
  );
  return rows.map((row) => ({ ...toRecord(row), difficulty: row.difficulty }));
}

/** The record for one problem, locked until the transaction ends; `null` if not solved. */
export async function lockProgressRecord(
  db: Queryable,
  userId: string,
  problemId: number,
): Promise<ProgressRecord | null> {
  const { rows } = await db.query<DbRow>(
    `SELECT ${COLUMNS} FROM user_problem
     WHERE user_id = $1 AND problem_id = $2
     FOR UPDATE`,
    [userId, problemId],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/** Inserts a new record, or fails with 23505 if another request inserted it first. */
export async function insertProgressRecord(
  db: Queryable,
  userId: string,
  record: ProgressRecord,
): Promise<ProgressRecord> {
  const { rows } = await db.query<DbRow>(
    `INSERT INTO user_problem (user_id, problem_id, solved_on, confidence,
       revision1_completed_on, revision2_completed_on, revision3_completed_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      userId,
      record.problemId,
      record.solvedOn,
      record.confidence,
      ...record.completed,
    ],
  );
  return toRecord(rows[0]!);
}

export async function updateProgressRecord(
  db: Queryable,
  userId: string,
  record: ProgressRecord,
): Promise<ProgressRecord> {
  const { rows } = await db.query<DbRow>(
    `UPDATE user_problem
     SET solved_on = $3, confidence = $4, revision1_completed_on = $5,
         revision2_completed_on = $6, revision3_completed_on = $7, updated_at = now()
     WHERE user_id = $1 AND problem_id = $2
     RETURNING ${COLUMNS}`,
    [
      userId,
      record.problemId,
      record.solvedOn,
      record.confidence,
      ...record.completed,
    ],
  );
  return toRecord(rows[0]!);
}

export async function deleteProgressRecord(
  db: Queryable,
  userId: string,
  problemId: number,
): Promise<void> {
  await db.query(
    "DELETE FROM user_problem WHERE user_id = $1 AND problem_id = $2",
    [userId, problemId],
  );
}
