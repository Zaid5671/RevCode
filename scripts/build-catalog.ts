// Builds db/seed/catalog.json from the supplied NeetCode list (PLAN.md §5.4).
// Run once, review, commit. After that, catalog ids are permanent.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, runIfMain } from "./cli";

const SOURCE_PATH = path.join(REPO_ROOT, "data", "neetcode_250_complete.json");
export const CATALOG_PATH = path.join(REPO_ROOT, "db", "seed", "catalog.json");

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type CatalogCategory = { id: number; name: string; position: number };

export type CatalogProblem = {
  id: number;
  leetcodeSlug: string;
  neetcodeSlug: string;
  title: string;
  difficulty: Difficulty;
  categoryId: number;
  position: number;
  isPremium: boolean;
};

export type Catalog = {
  categories: CatalogCategory[];
  problems: CatalogProblem[];
};

type SourceProblem = {
  name: string;
  difficulty: string;
  category: string;
  leetcode_url: string;
  slug: string;
};

export type SourceCatalog = { categories: string[]; problems: SourceProblem[] };

// The source file has no Premium flags; these are LeetCode's Premium problems in the list.
export const PREMIUM_LEETCODE_SLUGS: readonly string[] = [
  "encode-and-decode-strings",
  "walls-and-gates",
  "graph-valid-tree",
  "number-of-connected-components-in-an-undirected-graph",
  "alien-dictionary",
  "meeting-rooms",
  "meeting-rooms-ii",
];

const LEETCODE_URL = /^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/?$/;

const DIFFICULTIES: Record<string, Difficulty> = {
  Easy: "EASY",
  Medium: "MEDIUM",
  Hard: "HARD",
};

export function buildCatalog(source: SourceCatalog): Catalog {
  const categories = source.categories.map((name, i) => ({
    id: i + 1,
    name,
    position: i + 1,
  }));
  const categoryIds = new Map(categories.map((c) => [c.name, c.id]));
  const nextPosition = new Map<number, number>();

  const problems = source.problems.map((p, i): CatalogProblem => {
    const where = `problem ${i + 1} ("${p.name}")`;
    const leetcodeSlug = LEETCODE_URL.exec(p.leetcode_url)?.[1];
    if (!leetcodeSlug)
      throw new Error(`${where}: unexpected leetcode_url "${p.leetcode_url}"`);
    const difficulty = DIFFICULTIES[p.difficulty];
    if (!difficulty)
      throw new Error(`${where}: unknown difficulty "${p.difficulty}"`);
    const categoryId = categoryIds.get(p.category);
    if (!categoryId)
      throw new Error(`${where}: unknown category "${p.category}"`);

    const position = (nextPosition.get(categoryId) ?? 0) + 1;
    nextPosition.set(categoryId, position);

    return {
      id: i + 1,
      leetcodeSlug,
      neetcodeSlug: p.slug,
      title: p.name,
      difficulty,
      categoryId,
      position,
      isPremium: PREMIUM_LEETCODE_SLUGS.includes(leetcodeSlug),
    };
  });

  return { categories, problems };
}

function main() {
  const source = JSON.parse(readFileSync(SOURCE_PATH, "utf8")) as SourceCatalog;
  const catalog = buildCatalog(source);
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");

  const premium = catalog.problems.filter((p) => p.isPremium).length;
  console.log(
    `Wrote ${path.relative(REPO_ROOT, CATALOG_PATH)}: ${catalog.categories.length} categories, ` +
      `${catalog.problems.length} problems (${premium} Premium).`,
  );
}

runIfMain(import.meta.url, main);
