import { formatShortDate, statusLabel } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision, RevisionStatus } from "@/domain/schedule";

/** The due pill: tinted when it needs doing now, neutral when it is coming up. */
const NEUTRAL_PILL = "border-line-strong bg-surface-3 text-ink";
const PILL: Partial<Record<RevisionStatus, string>> = {
  overdue: "border-rose-edge bg-rose-bg text-rose",
  due_today: "border-amber-edge bg-amber-bg text-amber",
};

/** Dates line up in their columns: Inter with even-width digits. */
const DATE = "font-sans tabular-nums";

/**
 * An empty circle that turns into a tick while its button (a `group/done`) is hovered.
 * The ✓ on its own only ever means "done".
 */
function DoneCircle() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path
        d="M5.5 8.2 7.2 9.9 10.6 6.4"
        className="opacity-0 group-hover/done:opacity-100"
      />
    </svg>
  );
}

/**
 * One of R1–R3 (PLAN.md §8.3): `✓ 18 Sep` when done, a `28 Sep ○` pill for the next
 * pending revision (the pill is the button that marks it done), or a faint `9 Oct` for a
 * projected one.
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
      <span className={`${DATE} font-medium whitespace-nowrap text-green`}>
        <span aria-hidden="true">✓ </span>
        <span className="sr-only">{label} done on </span>
        {date}
      </span>
    );
  }

  if (revision.status === "projected") {
    return (
      <span className={`${DATE} whitespace-nowrap text-ink-faint`}>
        <span className="sr-only">{label} projected for </span>
        {date}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => onMarkDone(event.currentTarget)}
      aria-label={`Mark ${label} done (due ${statusLabel(revision, today)})`}
      title="Mark done"
      className={`group/done inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-medium whitespace-nowrap hover:brightness-125 ${DATE} ${
        PILL[revision.status] ?? NEUTRAL_PILL
      }`}
    >
      <span>{date}</span>
      <DoneCircle />
    </button>
  );
}

/** The small ○ beside a due date on the phone card. */
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
      className="group/done inline-flex size-6 items-center justify-center rounded text-ink-soft hover:bg-green-bg hover:text-green"
    >
      <DoneCircle />
    </button>
  );
}
