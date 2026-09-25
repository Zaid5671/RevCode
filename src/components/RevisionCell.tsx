import { formatShortDate, statusLabel } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision, RevisionStatus } from "@/domain/schedule";

/** The tinted chip of a due revision, by how soon it is due. */
const CHIP: Partial<Record<RevisionStatus, string>> = {
  overdue: "border-rose-edge bg-rose-bg text-rose",
  due_today: "border-amber-edge bg-amber-bg text-amber",
  due_tomorrow: "border-blue-edge bg-blue-bg text-blue",
  next_7_days: "border-blue-edge bg-blue-bg text-blue",
  later: "border-line-strong bg-surface-3 text-ink",
};

/**
 * One of R1–R3 (PLAN.md §8.3): `✓ 18 Sep` when done, a tinted `28 Sep ✓` chip for the next
 * pending revision (the chip is the button that marks it done), or a faint `(9 Oct)` for
 * a projected one.
 */
export function RevisionCell({
  revision,
  today,
  onMarkDone,
}: {
  revision: Revision;
  today: CalendarDate;
  /** Opens the "done" popover next to the chip it is given. */
  onMarkDone: (anchor: HTMLElement) => void;
}) {
  const date = formatShortDate(revision.date, today);
  const label = `R${revision.number}`;

  if (revision.status === "done") {
    return (
      <span className="font-mono font-medium text-green">
        <span aria-hidden="true">✓ </span>
        <span className="sr-only">{label} done on </span>
        {date}
      </span>
    );
  }

  if (revision.status === "projected") {
    return (
      <span className="font-mono text-ink-faint">
        <span className="sr-only">{label} projected for </span>({date})
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => onMarkDone(event.currentTarget)}
      aria-label={`Mark ${label} done (due ${statusLabel(revision, today)})`}
      title="Mark done"
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono hover:brightness-125 ${
        CHIP[revision.status] ?? ""
      }`}
    >
      <span>{date}</span>
      <span aria-hidden="true">✓</span>
    </button>
  );
}

/** The small ✓ beside a due date on the phone card. */
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
      className="inline-flex size-5 items-center justify-center rounded border border-line-strong bg-surface-3 text-[11px] text-ink-soft hover:border-green-edge hover:bg-green-bg hover:text-green"
    >
      ✓
    </button>
  );
}
