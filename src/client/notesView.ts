// What the Notes section shows (PLAN.md §8.4, DESIGN-BRIEF.md §5): counts per category,
// which category `/notes` opens, one category as a document, and search results. Pure, so
// it's tested without a browser.
import type { Confidence } from "@/domain/gaps";
import type {
  CatalogResponse,
  Category,
  Note,
  NoteSearchResult,
  NoteSummary,
  Problem,
  ProgressEntry,
} from "@/domain/schemas";

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

/** The categories in NeetCode order. */
function orderedCategories(catalog: CatalogResponse): Category[] {
  return [...catalog.categories].sort(byPosition);
}

/** Every problem in catalog order: by category, then by `#`. */
function orderedProblems(catalog: CatalogResponse): Problem[] {
  const rank = new Map(
    orderedCategories(catalog).map((c, index) => [c.id, index]),
  );
  return [...catalog.problems].sort(
    (a, b) =>
      (rank.get(a.categoryId) ?? 0) - (rank.get(b.categoryId) ?? 0) ||
      byPosition(a, b),
  );
}

/** How many notes each category has, 0 included. */
export function countNotes(
  catalog: CatalogResponse,
  index: readonly NoteSummary[],
): Map<number, number> {
  const counts = new Map(catalog.categories.map((c) => [c.id, 0]));
  const categoryOf = new Map(catalog.problems.map((p) => [p.id, p.categoryId]));
  for (const { problemId } of index) {
    const categoryId = categoryOf.get(problemId);
    if (categoryId !== undefined)
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
}

/** What `/notes` opens: the first category with notes, else the first category. */
export function defaultCategoryId(
  catalog: CatalogResponse,
  index: readonly NoteSummary[],
): number {
  const counts = countNotes(catalog, index);
  const categories = orderedCategories(catalog);
  const category =
    categories.find((c) => (counts.get(c.id) ?? 0) > 0) ?? categories[0];
  if (!category) throw new Error("The catalog has no categories");
  return category.id;
}

/** The `[categoryId]` of `/notes/[categoryId]`, or null when it isn't a known category. */
export function parseCategoryParam(
  param: string,
  catalog: CatalogResponse,
): number | null {
  if (!/^[1-9]\d*$/.test(param)) return null;
  const id = Number(param);
  return catalog.categories.some((c) => c.id === id) ? id : null;
}

export type DocumentItem = {
  problem: Problem;
  /** Null for a problem without a note (shown only with "Show problems without notes"). */
  note: Note | null;
  /** Null while unsolved. */
  confidence: Confidence | null;
};

/** One category as a document: its problems in NeetCode order, with their notes. */
export function categoryDocument(
  catalog: CatalogResponse,
  categoryId: number,
  notes: readonly Note[],
  entries: readonly ProgressEntry[],
  withoutNotes: boolean,
): DocumentItem[] {
  const noteFor = new Map(notes.map((n) => [n.problemId, n]));
  const confidenceFor = new Map(
    entries.map((e) => [e.problemId, e.confidence]),
  );
  return catalog.problems
    .filter((p) => p.categoryId === categoryId)
    .sort(byPosition)
    .map((problem) => ({
      problem,
      note: noteFor.get(problem.id) ?? null,
      confidence: confidenceFor.get(problem.id) ?? null,
    }))
    .filter((item) => withoutNotes || item.note !== null);
}

export type SearchHit = {
  problem: Problem;
  categoryName: string;
  /** The server's snippet of the note text, or null when only the name matched. */
  snippet: string | null;
  nameMatch: boolean;
  updatedAt: string;
};

/**
 * The search results: notes whose text matches (from the server), plus notes whose
 * problem name matches (found here, since the server searches note text only), each
 * once, in catalog order.
 */
export function searchHits(
  catalog: CatalogResponse,
  index: readonly NoteSummary[],
  results: readonly NoteSearchResult[],
  q: string,
): SearchHit[] {
  const query = q.trim().toLowerCase();
  const categoryName = new Map(catalog.categories.map((c) => [c.id, c.name]));
  const edited = new Map(index.map((n) => [n.problemId, n.updatedAt]));
  const fromText = new Map(results.map((r) => [r.problemId, r]));

  const hits: SearchHit[] = [];
  for (const problem of orderedProblems(catalog)) {
    const text = fromText.get(problem.id);
    const nameMatch =
      query !== "" &&
      edited.has(problem.id) &&
      problem.title.toLowerCase().includes(query);
    if (!text && !nameMatch) continue;
    hits.push({
      problem,
      categoryName: categoryName.get(problem.categoryId) ?? "",
      snippet: text?.snippet ?? null,
      nameMatch,
      updatedAt: edited.get(problem.id) ?? text?.updatedAt ?? "",
    });
  }
  return hits;
}

export type TextPart = { text: string; match: boolean };

/** Splits `text` around every case-insensitive occurrence of the trimmed query. */
export function highlightParts(text: string, q: string): TextPart[] {
  const query = q.trim().toLowerCase();
  if (query === "") return [{ text, match: false }];
  const lower = text.toLowerCase();
  const parts: TextPart[] = [];
  let from = 0;
  for (
    let at = lower.indexOf(query);
    at !== -1;
    at = lower.indexOf(query, from)
  ) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + query.length), match: true });
    from = at + query.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts;
}
