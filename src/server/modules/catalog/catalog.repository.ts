// SQL for the shared NeetCode 250 catalog (PLAN.md §5.2). Not per-user: every user sees
// the same categories and problems.
import {
  leetcodeUrl,
  type Category,
  type CatalogResponse,
  type Difficulty,
} from "@/domain/schemas";
import type { Queryable } from "@/server/db";

type ProblemRow = {
  id: number;
  title: string;
  leetcode_slug: string;
  difficulty: Difficulty;
  category_id: number;
  position: number;
  is_premium: boolean;
};

export async function findCategory(
  db: Queryable,
  categoryId: number,
): Promise<Category | null> {
  const { rows } = await db.query<Category>(
    "SELECT id, name, position FROM category WHERE id = $1",
    [categoryId],
  );
  return rows[0] ?? null;
}

export async function problemExists(
  db: Queryable,
  problemId: number,
): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM problem WHERE id = $1", [
    problemId,
  ]);
  return rows.length > 0;
}

export async function getCatalog(db: Queryable): Promise<CatalogResponse> {
  const [categories, problems] = await Promise.all([
    db.query<Category>(
      "SELECT id, name, position FROM category ORDER BY position",
    ),
    db.query<ProblemRow>(
      `SELECT id, title, leetcode_slug, difficulty, category_id, position, is_premium
       FROM problem ORDER BY category_id, position`,
    ),
  ]);
  return {
    categories: categories.rows,
    problems: problems.rows.map((row) => ({
      id: row.id,
      title: row.title,
      leetcodeSlug: row.leetcode_slug,
      leetcodeUrl: leetcodeUrl(row.leetcode_slug),
      difficulty: row.difficulty,
      categoryId: row.category_id,
      position: row.position,
      isPremium: row.is_premium,
    })),
  };
}
