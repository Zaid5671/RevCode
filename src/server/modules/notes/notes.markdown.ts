// The Markdown download (PLAN.md §8.4). Pure: the service loads the notes and passes
// them in catalog order.
import type { CalendarDate } from "@/domain/calendarDate";
import type { Difficulty } from "@/domain/schemas";

export type ExportNote = {
  /** The problem's number within its category, as on the Problems page. */
  position: number;
  title: string;
  difficulty: Difficulty;
  leetcodeUrl: string;
  body: string;
};

export type ExportSection = { category: string; notes: ExportNote[] };

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/**
 * `# Category`, then per note `## 4. Two Sum (Easy)`, the LeetCode link and the note as
 * written. Note bodies are not changed, apart from trailing whitespace.
 */
export function buildNotesMarkdown(sections: ExportSection[]): string {
  if (sections.length === 0) return "No notes yet.\n";
  const blocks = sections.flatMap(({ category, notes }) => [
    `# ${category}`,
    ...notes.flatMap((note) => [
      `## ${note.position}. ${note.title} (${DIFFICULTY_LABEL[note.difficulty]})`,
      `<${note.leetcodeUrl}>`,
      closeOpenFence(note.body.trimEnd()),
    ]),
  ]);
  return blocks.join("\n\n") + "\n";
}

// CommonMark code fences: up to 3 spaces, then 3+ backticks or tildes. A backtick
// fence's info string can't contain a backtick.
const FENCE = /^ {0,3}(`{3,}(?!.*`)|~{3,})/;
const CLOSING_FENCE = /^ {0,3}(`{3,}|~{3,}) *$/;

/**
 * A note that ends inside a code block would turn the rest of the file into code, so the
 * block is closed. The note's own text is unchanged.
 */
function closeOpenFence(body: string): string {
  let open: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    if (open === null) {
      open = FENCE.exec(line)?.[1] ?? null;
    } else {
      const fence = CLOSING_FENCE.exec(line)?.[1];
      if (fence && fence[0] === open[0] && fence.length >= open.length) {
        open = null;
      }
    }
  }
  return open === null ? body : `${body}\n${open}`;
}

/** `revcode-notes-YYYY-MM-DD.md`, or `revcode-notes-arrays-and-hashing-YYYY-MM-DD.md`. */
export function exportFilename(today: CalendarDate, category?: string): string {
  if (category === undefined) return `revcode-notes-${today}.md`;
  const slug = category
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `revcode-notes-${slug}-${today}.md`;
}
