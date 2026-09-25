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
  onMarkDone,
}: {
  revision: Revision;
  today: CalendarDate;
  /** Opens the "done" popover next to the ✓ button it is given. */
  onMarkDone: (anchor: HTMLElement) => void;
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
      <MarkDoneButton
        label={`Mark ${label} done (due ${statusLabel(revision, today)})`}
        onClick={onMarkDone}
      />
    </span>
  );
}

/** The small ✓ beside a due date. */
export function MarkDoneButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (anchor: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      aria-label={label}
      title="Mark done"
      className="rounded border border-line px-1 leading-4 text-ink-soft hover:border-teal hover:bg-teal-bg hover:text-teal"
    >
      ✓
    </button>
  );
}
