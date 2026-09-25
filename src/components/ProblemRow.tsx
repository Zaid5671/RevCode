import { formatShortDate } from "@/client/format";
import type { ProblemRow as Row } from "@/client/problemsView";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import type { Problem } from "@/domain/schemas";
import { DifficultyBadge, StatusLabel } from "./Badges";
import { ConfidenceSelect } from "./ConfidencePicker";
import { NotesButton } from "./NotesButton";
import { RevisionCell } from "./RevisionCell";

/** The table's column headings, in the order ProblemRow renders its cells. */
export const COLUMNS = [
  "#",
  "Problem",
  "Diff",
  "Solved",
  "Conf",
  "R1",
  "R2",
  "R3",
  "Next",
  "Notes",
] as const;

/** What a row can open. ProblemTable shows one overlay at a time. */
export type RowActions = {
  solve: (problemId: number) => void;
  unmark: (problemId: number) => void;
  edit: (problemId: number) => void;
  note: (problemId: number) => void;
  markDone: (
    problemId: number,
    revision: RevisionNumber,
    anchor: HTMLElement,
  ) => void;
};

/** Each column's width and alignment, shared by its heading and its cells. */
export const COLUMN_CLASS: Record<(typeof COLUMNS)[number], string> = {
  "#": "w-12 px-4 text-center",
  Problem: "min-w-[240px] px-4",
  Diff: "w-20 px-3 text-center",
  Solved: "w-32 px-3",
  Conf: "w-16 px-3 text-center",
  R1: "w-28 px-3",
  R2: "w-28 px-3",
  R3: "w-28 px-3",
  Next: "w-36 px-3",
  Notes: "w-16 px-3 text-center",
};

const cell = (column: (typeof COLUMNS)[number]) =>
  `py-2.5 ${COLUMN_CLASS[column]}`;

/** One problem in the table (PLAN.md §8.3, DESIGN-BRIEF.md §4). */
export function ProblemRow({
  row: { problem, entry, hasNote },
  today,
  actions,
  categoryName,
}: {
  row: Row;
  today: CalendarDate;
  actions: RowActions;
  /** Shown under the title in the flat "Next due" list, where there are no folders. */
  categoryName?: string;
}) {
  return (
    <tr
      onClick={entry ? editOnClick(problem.id, actions) : undefined}
      className={`group border-b border-line-soft last:border-b-0 hover:bg-hover ${
        entry ? "cursor-pointer" : "opacity-75"
      }`}
    >
      <td className={`${cell("#")} font-mono text-ink-faint`}>
        <EditNumber
          problem={problem}
          solved={entry !== null}
          actions={actions}
        />
      </td>
      <td className={cell("Problem")}>
        <ProblemTitle problem={problem} solved={entry !== null} />
        {categoryName && (
          <span className="block text-[11px] text-ink-faint">
            {categoryName}
          </span>
        )}
      </td>
      <td className={cell("Diff")}>
        <DifficultyBadge difficulty={problem.difficulty} />
      </td>
      <td className={cell("Solved")}>
        <span className="flex items-center gap-2">
          <SolvedCheckbox
            problem={problem}
            solved={entry !== null}
            actions={actions}
          />
          {entry && (
            <span className="whitespace-nowrap text-ink-soft tabular-nums">
              {formatShortDate(entry.solvedOn, today)}
            </span>
          )}
        </span>
      </td>
      {/* An unsolved row leaves the rest of its cells blank. */}
      <td className={`${cell("Conf")} font-mono text-ink`}>
        {entry && (
          <ConfidenceSelect
            problemId={problem.id}
            title={problem.title}
            confidence={entry.confidence}
          />
        )}
      </td>
      {([0, 1, 2] as const).map((i) => (
        <td key={i} className={cell(`R${i + 1}` as "R1" | "R2" | "R3")}>
          {entry && (
            <RevisionCell
              revision={entry.revisions[i]}
              today={today}
              onMarkDone={(anchor) =>
                actions.markDone(problem.id, entry.revisions[i].number, anchor)
              }
            />
          )}
        </td>
      ))}
      <td className={cell("Next")}>
        {entry && (
          <StatusLabel
            revision={entry.next ?? "complete"}
            today={today}
            relative
          />
        )}
      </td>
      <td className={cell("Notes")}>
        <NotesButton
          title={problem.title}
          hasNote={hasNote}
          onClick={() => actions.note(problem.id)}
          revealOnHover={entry === null}
        />
      </td>
    </tr>
  );
}

// ── Pieces shared with the phone card ───────────────────────────────────────

/**
 * Clicking a solved row's empty space opens the Edit panel (DESIGN-BRIEF.md §4). Clicks on
 * its links and controls, and the end of a text selection, don't.
 */
export function editOnClick(problemId: number, actions: RowActions) {
  return (event: React.MouseEvent) => {
    const target = event.target as Element;
    if (target.closest("a, button, input, select, label, textarea")) return;
    if (window.getSelection()?.toString()) return;
    actions.edit(problemId);
  };
}

/**
 * The problem's `#`. On a solved problem it is also the keyboard way into the Edit panel,
 * since a row click works only with a pointer.
 */
export function EditNumber({
  problem,
  solved,
  actions,
}: {
  problem: Problem;
  solved: boolean;
  actions: RowActions;
}) {
  if (!solved) return <>{problem.position}</>;
  return (
    <button
      type="button"
      onClick={() => actions.edit(problem.id)}
      aria-label={`Edit ${problem.title}`}
      title="Edit"
      className="rounded px-0.5 hover:text-ink-strong hover:underline"
    >
      {problem.position}
    </button>
  );
}

export function ProblemTitle({
  problem,
  solved = true,
}: {
  problem: Problem;
  /** Unsolved titles are a step softer, as in the design. */
  solved?: boolean;
}) {
  return (
    <>
      <a
        href={problem.leetcodeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium group-hover:text-ink-strong hover:text-accent hover:underline ${
          solved ? "text-ink" : "text-ink-soft"
        }`}
      >
        {problem.title}
      </a>
      {problem.isPremium && (
        <span className="ml-2 rounded border border-line-strong px-1 font-mono text-[10px] whitespace-nowrap text-ink-faint">
          Premium
        </span>
      )}
    </>
  );
}

/**
 * Ticking opens the Solve dialog; unticking asks before unmarking. The box shows what the
 * server has, so it changes only once a save succeeds.
 */
export function SolvedCheckbox({
  problem,
  solved,
  actions,
}: {
  problem: Problem;
  solved: boolean;
  actions: RowActions;
}) {
  return (
    <input
      type="checkbox"
      checked={solved}
      onChange={() =>
        solved ? actions.unmark(problem.id) : actions.solve(problem.id)
      }
      aria-label={`Solved: ${problem.title}`}
      className="align-middle"
    />
  );
}
