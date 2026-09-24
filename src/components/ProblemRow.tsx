import { formatShortDate } from "@/client/format";
import type { ProblemRow as Row } from "@/client/problemsView";
import type { CalendarDate } from "@/domain/calendarDate";
import { DifficultyBadge, StatusLabel } from "./Badges";
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

const DASH = <span className="text-ink-faint">–</span>;

/** One problem in the table (PLAN.md §8.3, DESIGN-BRIEF.md §4). */
export function ProblemRow({
  row: { problem, entry, hasNote },
  today,
  categoryName,
}: {
  row: Row;
  today: CalendarDate;
  /** Shown under the title in the flat "Next due" list, where there are no folders. */
  categoryName?: string;
}) {
  return (
    <tr
      className={`border-b border-line-soft last:border-b-0 hover:bg-surface-2 ${
        entry?.isComplete ? "opacity-70" : ""
      }`}
    >
      <td className="px-2.5 py-1.5 font-mono text-xs text-ink-faint">
        {problem.position}
      </td>
      <td className="px-2.5 py-1.5">
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink hover:text-teal hover:underline"
        >
          {problem.title}
        </a>
        {problem.isPremium && (
          <span className="ml-1.5 rounded border border-line px-1 font-mono text-[10px] text-ink-soft">
            Premium
          </span>
        )}
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
        {/* Ticking opens the Solve dialog in Phase 6 part B. */}
        <input
          type="checkbox"
          checked={entry !== null}
          readOnly
          aria-label={`Solved: ${problem.title}`}
          className="size-4 align-middle"
        />
        {entry && (
          <span className="ml-1.5 align-middle font-mono text-xs">
            {formatShortDate(entry.solvedOn, today)}
          </span>
        )}
      </td>
      <td className="px-2.5 py-1.5 font-mono text-xs">
        {entry ? entry.confidence : DASH}
      </td>
      {([0, 1, 2] as const).map((i) => (
        <td key={i} className="px-2.5 py-1.5">
          {entry ? (
            <RevisionCell revision={entry.revisions[i]} today={today} />
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
