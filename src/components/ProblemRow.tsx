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
  markDone: (
    problemId: number,
    revision: RevisionNumber,
    anchor: HTMLElement,
  ) => void;
};

const DASH = <span className="text-ink-faint">–</span>;

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
      className={`border-b border-line-soft last:border-b-0 hover:bg-surface-2 ${
        entry ? "cursor-pointer" : ""
      } ${entry?.isComplete ? "opacity-70" : ""}`}
    >
      <td className="px-2.5 py-1.5 font-mono text-xs text-ink-faint">
        <EditNumber
          problem={problem}
          solved={entry !== null}
          actions={actions}
        />
      </td>
      <td className="px-2.5 py-1.5">
        <ProblemTitle problem={problem} />
        {categoryName && (
          <span className="block text-[11px] text-ink-faint">
            {categoryName}
          </span>
        )}
      </td>
      <td className="px-2.5 py-1.5">
        <DifficultyBadge difficulty={problem.difficulty} />
      </td>
      <td className="px-2.5 py-1.5 whitespace-nowrap">
        <SolvedCheckbox
          problem={problem}
          solved={entry !== null}
          actions={actions}
        />
        {entry && (
          <span className="ml-1.5 align-middle font-mono text-xs">
            {formatShortDate(entry.solvedOn, today)}
          </span>
        )}
      </td>
      <td className="px-2.5 py-1.5">
        {entry ? (
          <ConfidenceSelect
            problemId={problem.id}
            title={problem.title}
            confidence={entry.confidence}
          />
        ) : (
          DASH
        )}
      </td>
      {([0, 1, 2] as const).map((i) => (
        <td key={i} className="px-2.5 py-1.5">
          {entry ? (
            <RevisionCell
              revision={entry.revisions[i]}
              today={today}
              onMarkDone={(anchor) =>
                actions.markDone(problem.id, entry.revisions[i].number, anchor)
              }
            />
          ) : (
            DASH
          )}
        </td>
      ))}
      <td className="px-2.5 py-1.5">
        {entry ? (
          <StatusLabel revision={entry.next ?? "complete"} today={today} />
        ) : (
          DASH
        )}
      </td>
      <td className="px-2.5 py-1.5 text-center">
        <NotesButton title={problem.title} hasNote={hasNote} />
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
      className="rounded px-0.5 hover:text-ink hover:underline"
    >
      {problem.position}
    </button>
  );
}

export function ProblemTitle({ problem }: { problem: Problem }) {
  return (
    <>
      <a
        href={problem.leetcodeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink hover:text-teal hover:underline"
      >
        {problem.title}
      </a>
      {problem.isPremium && (
        <span className="ml-1.5 rounded border border-line px-1 font-mono text-[10px] whitespace-nowrap text-ink-soft">
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
      className="size-4 cursor-pointer align-middle"
    />
  );
}
