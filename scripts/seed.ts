// Upserts the catalog from db/seed/catalog.json by id, in one transaction (PLAN.md §5.4).
// Rows that already match are left alone, so a second run changes nothing. Never deletes.
import { readFileSync } from "node:fs";
import type pg from "pg";
import { CATALOG_PATH, type Catalog } from "./build-catalog";
import { runIfMain, withDirectClient } from "./cli";

export type SeedResult = {
  categories: { inserted: number; updated: number };
  problems: { inserted: number; updated: number };
};

// xmax = 0 marks a freshly inserted row; otherwise the upsert updated an existing one.
type UpsertRow = { inserted: boolean };

function tallyUpserts(rows: UpsertRow[]) {
  const inserted = rows.filter((r) => r.inserted).length;
  return { inserted, updated: rows.length - inserted };
}

export async function seedCatalog(
  client: pg.ClientBase,
  catalog: Catalog,
): Promise<SeedResult> {
  await client.query("BEGIN");
  try {
    const categories = await client.query<UpsertRow>(
      `INSERT INTO category (id, name, position)
       SELECT id, name, position
       FROM jsonb_to_recordset($1::jsonb) AS c (id SMALLINT, name TEXT, position SMALLINT)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, position = EXCLUDED.position
         WHERE (category.name, category.position) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.position)
       RETURNING (xmax = 0) AS inserted`,
      [JSON.stringify(catalog.categories)],
    );

    const problems = await client.query<UpsertRow>(
      `INSERT INTO problem
         (id, leetcode_slug, neetcode_slug, title, difficulty, category_id, position, is_premium)
       SELECT id, "leetcodeSlug", "neetcodeSlug", title, difficulty, "categoryId", position, "isPremium"
       FROM jsonb_to_recordset($1::jsonb) AS p (
         id SMALLINT, "leetcodeSlug" TEXT, "neetcodeSlug" TEXT, title TEXT, difficulty TEXT,
         "categoryId" SMALLINT, position SMALLINT, "isPremium" BOOLEAN)
       ON CONFLICT (id) DO UPDATE
         SET leetcode_slug = EXCLUDED.leetcode_slug,
             neetcode_slug = EXCLUDED.neetcode_slug,
             title         = EXCLUDED.title,
             difficulty    = EXCLUDED.difficulty,
             category_id   = EXCLUDED.category_id,
             position      = EXCLUDED.position,
             is_premium    = EXCLUDED.is_premium
         WHERE (problem.leetcode_slug, problem.neetcode_slug, problem.title, problem.difficulty,
                problem.category_id, problem.position, problem.is_premium)
               IS DISTINCT FROM
               (EXCLUDED.leetcode_slug, EXCLUDED.neetcode_slug, EXCLUDED.title, EXCLUDED.difficulty,
                EXCLUDED.category_id, EXCLUDED.position, EXCLUDED.is_premium)
       RETURNING (xmax = 0) AS inserted`,
      [JSON.stringify(catalog.problems)],
    );

    await client.query("COMMIT");
    return {
      categories: tallyUpserts(categories.rows),
      problems: tallyUpserts(problems.rows),
    };
  } catch (error) {
    // If the connection dropped, ROLLBACK fails too; keep the original error.
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

runIfMain(import.meta.url, async () => {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
  const result = await withDirectClient((client) =>
    seedCatalog(client, catalog),
  );
  const { categories: c, problems: p } = result;
  console.log(
    `Seeded catalog. Categories: ${c.inserted} inserted, ${c.updated} updated. ` +
      `Problems: ${p.inserted} inserted, ${p.updated} updated.`,
  );
});
