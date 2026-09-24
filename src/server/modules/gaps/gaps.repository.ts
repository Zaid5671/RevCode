// SQL for user_gap (PLAN.md §5.3): one row per confidence the user has customised.
import {
  CONFIDENCES,
  type Confidence,
  type Gaps,
  type RevisionGaps,
} from "@/domain/gaps";
import type { Queryable } from "@/server/db";

export type StoredGaps = Partial<Record<Confidence, RevisionGaps>>;

type GapRow = { confidence: Confidence; r1: number; r2: number; r3: number };

export async function findGaps(
  db: Queryable,
  userId: string,
): Promise<StoredGaps> {
  const { rows } = await db.query<GapRow>(
    "SELECT confidence, r1, r2, r3 FROM user_gap WHERE user_id = $1",
    [userId],
  );
  return Object.fromEntries(
    rows.map((row) => [row.confidence, [row.r1, row.r2, row.r3]]),
  );
}

export async function upsertGaps(
  db: Queryable,
  userId: string,
  gaps: Gaps,
): Promise<void> {
  const rows = CONFIDENCES.map((confidence) => ({
    confidence,
    r1: gaps[confidence][0],
    r2: gaps[confidence][1],
    r3: gaps[confidence][2],
  }));
  await db.query(
    `INSERT INTO user_gap (user_id, confidence, r1, r2, r3)
     SELECT $1, confidence, r1, r2, r3
     FROM jsonb_to_recordset($2::jsonb) AS g (confidence SMALLINT, r1 SMALLINT, r2 SMALLINT, r3 SMALLINT)
     ON CONFLICT (user_id, confidence) DO UPDATE
       SET r1 = EXCLUDED.r1, r2 = EXCLUDED.r2, r3 = EXCLUDED.r3`,
    [userId, JSON.stringify(rows)],
  );
}

export async function deleteGaps(db: Queryable, userId: string): Promise<void> {
  await db.query("DELETE FROM user_gap WHERE user_id = $1", [userId]);
}
