import { formatShortDate, statusLabel } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision } from "@/domain/schedule";
import { STATUS_TEXT } from "./Badges";

/**
 * One of R1–R3 (PLAN.md §8.3): `✓ 18 Sep` when done, the due date and a ✓ button for the
 * next pending revision, or a faint `(9 Oct)` for a projected one.
 */
export function RevisionCell({
  revision,
  today,
}: {
  revision: Revision;
  today: CalendarDate;
}) {
  const date = formatShortDate(revision.date, today);
  const label = `R${revision.number}`;

  if (revision.status === "done") {
    return (
      <span className="font-mono text-xs whitespace-nowrap text-teal">
        <span aria-hidden="true">✓ </span>
        <span className="sr-only">{label} done on </span>
        {date}
      </span>
    );
  }

  if (revision.status === "projected") {
    return (
      <span className="font-mono text-xs whitespace-nowrap text-ink-faint">
        <span className="sr-only">{label} projected for </span>({date})
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap ${STATUS_TEXT[revision.status]}`}
    >
      <span className="sr-only">{label} due </span>
      {date}
      {/* Marking a revision done arrives with the date popover in Phase 6 part B. */}
      <button
        type="button"
        disabled
        aria-label={`Mark ${label} done (due ${statusLabel(revision, today)})`}
        className="rounded border border-line px-1 leading-4 text-ink-soft disabled:opacity-50"
      >
        ✓
      </button>
    </span>
  );
}
