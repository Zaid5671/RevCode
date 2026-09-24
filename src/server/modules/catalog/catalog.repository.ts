// SQL for the shared NeetCode 250 catalog (PLAN.md §5.2). Not per-user: every user sees
// the same categories and problems.
import type { CatalogResponse, Difficulty } from "@/domain/schemas";
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

export async function getCatalog(db: Queryable): Promise<CatalogResponse> {
  const [categories, problems] = await Promise.all([
    db.query<CatalogResponse["categories"][number]>(
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
      // Derived, never stored (§5.2).
      leetcodeUrl: `https://leetcode.com/problems/${row.leetcode_slug}/`,
      difficulty: row.difficulty,
      categoryId: row.category_id,
      position: row.position,
      isPremium: row.is_premium,
    })),
  };
}
