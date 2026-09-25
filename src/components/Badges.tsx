import { formatRelativeDue, statusLabel } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision, RevisionStatus } from "@/domain/schedule";
import type { Difficulty } from "@/domain/schemas";

// DESIGN-BRIEF.md §1 "Status and difficulty". A difficulty is a coloured word and a status
// is a dot plus a label, so Hard never reads as Overdue, and no status is colour alone.

const DIFFICULTY = {
  EASY: { name: "Easy", className: "text-green" },
  MEDIUM: { name: "Medium", className: "text-amber" },
  HARD: { name: "Hard", className: "text-rose" },
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { name, className } = DIFFICULTY[difficulty];
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${className}`}>
      {name}
    </span>
  );
}

/** Statuses that need doing now read a little bolder. */
const URGENT = new Set<RevisionStatus>(["overdue", "due_today"]);

/** Text colour for each revision status. */
const STATUS_TEXT: Record<RevisionStatus, string> = {
  overdue: "text-rose",
  due_today: "text-amber",
  due_tomorrow: "text-blue",
  next_7_days: "text-blue",
  later: "text-ink-soft",
  done: "text-green",
  projected: "text-ink-faint",
};

const STATUS_DOT: Record<RevisionStatus, string> = {
  overdue: "bg-rose",
  due_today: "bg-amber",
  due_tomorrow: "bg-blue",
  next_7_days: "bg-blue",
  later: "bg-ink-faint",
  done: "bg-green",
  projected: "bg-ink-faint",
};

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-1.5 flex-none rounded-full ${className}`}
    />
  );
}

/** `● 3d late`, `● Today`, `● Fri 25 Sep`… for the next pending revision, or `● Complete`. */
export function StatusLabel({
  revision,
  today,
  prefix,
  relative = false,
}: {
  revision: Revision | "complete";
  today: CalendarDate;
  /** Text before the label, e.g. "R2" on the phone card. */
  prefix?: string;
  /**
   * The table's Next column: `● R2 · in 3 days`, since R1–R3 already show the date. Only
   * overdue and today are coloured words; the dot carries the rest.
   */
  relative?: boolean;
}) {
  if (relative && revision !== "complete") {
    const urgent = URGENT.has(revision.status);
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${
          urgent
            ? `font-semibold ${STATUS_TEXT[revision.status]}`
            : "font-medium text-ink"
        }`}
      >
        <Dot className={STATUS_DOT[revision.status]} />
        {`R${revision.number} · ${formatRelativeDue(revision.date, today)}`}
      </span>
    );
  }
  if (revision === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-green">
        <Dot className="bg-green" />
        Complete
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${STATUS_TEXT[revision.status]} ${
        URGENT.has(revision.status) ? "font-semibold" : "font-medium"
      }`}
    >
      <Dot className={STATUS_DOT[revision.status]} />
      {prefix && `${prefix} `}
      {statusLabel(revision, today)}
    </span>
  );
}
