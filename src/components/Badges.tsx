import { statusLabel } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision, RevisionStatus } from "@/domain/schedule";
import type { Difficulty } from "@/domain/schemas";

// DESIGN-BRIEF.md §1 "Status and difficulty". A difficulty is a filled badge and a status
// is a dot plus a label, so Hard never reads as Overdue, and no status is colour alone.

const DIFFICULTY = {
  EASY: {
    letter: "E",
    name: "Easy",
    className: "border-green-edge bg-green-bg text-green",
  },
  MEDIUM: {
    letter: "M",
    name: "Medium",
    className: "border-amber-edge bg-amber-bg text-amber",
  },
  HARD: {
    letter: "H",
    name: "Hard",
    className: "border-rose-edge bg-rose-bg text-rose",
  },
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { letter, name, className } = DIFFICULTY[difficulty];
  return (
    <span
      title={name}
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] leading-4 font-medium ${className}`}
    >
      <span aria-hidden="true">{letter}</span>
      <span className="sr-only">{name}</span>
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
}: {
  revision: Revision | "complete";
  today: CalendarDate;
  /** Text before the label, e.g. "R2" on the phone card. */
  prefix?: string;
}) {
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
