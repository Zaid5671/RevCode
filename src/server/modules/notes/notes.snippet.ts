// The text shown for a note search result (GET /api/notes/search): a window of the note
// around the first match, on one line. Lengths count characters (code points), so an
// emoji is never split.

const SNIPPET_LENGTH = 120;
/** Characters of context kept before the match. */
const LEAD = 40;

const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

export function snippetFor(body: string, query: string): string {
  const text = collapseWhitespace(body);
  const chars = [...text];
  if (chars.length <= SNIPPET_LENGTH) return text;

  const escaped = collapseWhitespace(query).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const unitIndex = text.search(new RegExp(escaped, "iu"));
  // Postgres matched the note, but its case rules can differ from JavaScript's; if the
  // match can't be located here, show the start of the note.
  const matchAt = unitIndex < 0 ? 0 : [...text.slice(0, unitIndex)].length;

  const end = Math.min(
    chars.length,
    Math.max(matchAt - LEAD, 0) + SNIPPET_LENGTH,
  );
  const start = Math.max(end - SNIPPET_LENGTH, 0);
  return (
    (start > 0 ? "…" : "") +
    chars.slice(start, end).join("") +
    (end < chars.length ? "…" : "")
  );
}
