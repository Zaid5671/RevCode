import { formatShortDate } from "@/client/format";
import type { ProblemRow as Row } from "@/client/problemsView";
import type { CalendarDate } from "@/domain/calendarDate";
import { DifficultyBadge, StatusLabel } from "./Badges";
import { ConfidenceSelect } from "./ConfidencePicker";
import { NotesButton } from "./NotesButton";
import {
  EditNumber,
  ProblemTitle,
  SolvedCheckbox,
  editOnClick,
  type RowActions,
} from "./ProblemRow";
import { MarkDoneButton } from "./RevisionCell";

const SEP = (
  <span aria-hidden="true" className="text-ink-faint">
    ·
  </span>
);

/**
 * A problem on a phone (DESIGN-BRIEF.md §4), in two lines:
 *
 *   4  Two Sum  E                                 📝
 *   ✓ 16 Sep · conf 2 · R1 ✓ 18 Sep · ● R2 Fri 25 Sep ✓
 */
export function ProblemCard({
  row: { problem, entry, hasNote },
  today,
  actions,
  categoryName,
}: {
  row: Row;
  today: CalendarDate;
  actions: RowActions;
  categoryName?: string;
}) {
  return (
    <li
      onClick={entry ? editOnClick(problem.id, actions) : undefined}
      className={`border-b border-line-soft px-3 py-2.5 last:border-b-0 ${
        entry ? "cursor-pointer" : ""
      } ${entry?.isComplete ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="w-6 flex-none pt-0.5 font-mono text-xs text-ink-faint">
          <EditNumber
            problem={problem}
            solved={entry !== null}
            actions={actions}
          />
        </span>
        <div className="min-w-0 flex-1 text-[13.5px]">
          <ProblemTitle problem={problem} />{" "}
          <DifficultyBadge difficulty={problem.difficulty} />
          {categoryName && (
            <span className="block text-[11px] text-ink-faint">
              {categoryName}
            </span>
          )}
        </div>
        <NotesButton title={problem.title} hasNote={hasNote} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-8 font-mono text-xs">
        <span className="inline-flex items-center gap-1.5">
          <SolvedCheckbox
            problem={problem}
            solved={entry !== null}
            actions={actions}
          />
          {entry ? (
            formatShortDate(entry.solvedOn, today)
          ) : (
            <span aria-hidden="true" className="font-sans text-ink-faint">
              Not solved
            </span>
          )}
        </span>
        {entry && (
          <>
            {SEP}
            <span className="inline-flex items-center gap-1 text-ink-soft">
              conf
              <ConfidenceSelect
                problemId={problem.id}
                title={problem.title}
                confidence={entry.confidence}
              />
            </span>
            {entry.revisions
              .filter((r) => r.status === "done")
              .map((r) => (
                <span key={r.number} className="inline-flex gap-2">
                  {SEP}
                  <span className="text-teal">
                    R{r.number} <span aria-hidden="true">✓ </span>
                    <span className="sr-only">done on </span>
                    {formatShortDate(r.date, today)}
                  </span>
                </span>
              ))}
            {SEP}
            {entry.next ? (
              <span className="inline-flex items-center gap-1.5">
                <StatusLabel
                  revision={entry.next}
                  today={today}
                  prefix={`R${entry.next.number}`}
                />
                <MarkDoneButton
                  label={`Mark R${entry.next.number} done`}
                  onClick={(anchor) =>
                    actions.markDone(problem.id, entry.next!.number, anchor)
                  }
                />
              </span>
            ) : (
              <StatusLabel revision="complete" today={today} />
            )}
          </>
        )}
      </div>
    </li>
  );
}
