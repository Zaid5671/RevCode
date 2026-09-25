"use client";

import { useId, useState } from "react";
import type { DashboardView, Reminder } from "@/client/dashboardView";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import { DifficultyBadge, StatusLabel } from "./Badges";
import { NotesButton } from "./NotesButton";
import { ProblemTitle } from "./ProblemRow";
import { RevisionDonePopover } from "./RevisionDonePopover";

type DoneTarget = {
  problemId: number;
  title: string;
  revision: RevisionNumber;
  anchor: HTMLElement;
};

/**
 * The dashboard's two lists (PLAN.md §8.2, DESIGN-BRIEF.md §3): "Revise now" (overdue and
 * due today, each with its status) and "Coming up" (tomorrow and the next 7 days, under
 * date headings). Side by side on wide screens. ✓ Done opens the date popover.
 */
export function ReminderPanel({ view }: { view: DashboardView }) {
  const [done, setDone] = useState<DoneTarget | null>(null);
  const onMarkDone = (reminder: Reminder, anchor: HTMLElement) =>
    setDone({
      problemId: reminder.problem.id,
      title: reminder.problem.title,
      revision: reminder.revision.number,
      anchor,
    });

  // Once the revision is done (here or in another tab) it leaves the lists, and the
  // popover goes with it. (React's "adjust state while rendering": no effect needed.)
  const stillDue = [
    ...view.reviseNow,
    ...view.comingUp.flatMap((g) => g.reminders),
  ].some(
    (r) =>
      r.problem.id === done?.problemId && r.revision.number === done.revision,
  );
  if (done && !stillDue) setDone(null);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <ReminderCard title="Revise now" count={view.reviseNow.length}>
        {view.reviseNow.length === 0 ? (
          <EmptyLine>Nothing to revise today — nice.</EmptyLine>
        ) : (
          <ul>
            {view.reviseNow.map((reminder) => (
              <ReminderRow
                key={`${reminder.problem.id}-${reminder.revision.number}`}
                reminder={reminder}
                today={view.today}
                showStatus
                onMarkDone={onMarkDone}
              />
            ))}
          </ul>
        )}
      </ReminderCard>
      <ReminderCard
        title="Coming up"
        count={view.comingUp.reduce((n, g) => n + g.reminders.length, 0)}
      >
        {view.comingUp.length === 0 ? (
          <EmptyLine>Nothing scheduled this week.</EmptyLine>
        ) : (
          view.comingUp.map((group, i) => (
            <DateGroup key={group.date} label={group.label} first={i === 0}>
              {group.reminders.map((reminder) => (
                <ReminderRow
                  key={`${reminder.problem.id}-${reminder.revision.number}`}
                  reminder={reminder}
                  today={view.today}
                  onMarkDone={onMarkDone}
                />
              ))}
            </DateGroup>
          ))
        )}
      </ReminderCard>
      {done && stillDue && (
        <RevisionDonePopover
          problemId={done.problemId}
          title={done.title}
          revision={done.revision}
          today={view.today}
          anchor={done.anchor}
          onClose={() => setDone(null)}
        />
      )}
    </div>
  );
}

/** A bordered card with a mono heading bar; `count` is left out while loading. */
export function ReminderCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface-head px-4 py-2.5 font-mono text-[11px]">
        <h2
          id={headingId}
          className="font-semibold tracking-wider text-ink-soft uppercase"
        >
          {title}
        </h2>
        {count !== undefined && (
          <span className="font-medium text-ink-faint">
            <span className="sr-only">(</span>
            {count}
            <span className="sr-only">)</span>
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function DateGroup({
  label,
  first,
  children,
}: {
  label: string;
  first: boolean;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className={`border-b border-line-soft bg-surface-head px-4 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-ink-faint uppercase ${
          first ? "" : "border-t"
        }`}
      >
        {label}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

/**
 * One due revision. Wide: title and category, badge, R1, status, Notes, ✓ Done in a line.
 * Phone: title with Notes and ✓ Done on the first line, badge, R1 and status below.
 */
function ReminderRow({
  reminder,
  today,
  showStatus = false,
  onMarkDone,
}: {
  reminder: Reminder;
  today: CalendarDate;
  /** Revise now shows each status; in Coming up the date heading says it. */
  showStatus?: boolean;
  onMarkDone: (reminder: Reminder, anchor: HTMLElement) => void;
}) {
  const { problem, revision } = reminder;
  return (
    <li className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line-soft px-3 py-2.5 text-xs first:border-t-0 hover:bg-hover md:flex-nowrap md:py-2 md:pl-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">
          <ProblemTitle problem={problem} />
        </p>
        <p className="truncate text-[11px] text-ink-faint">
          {reminder.categoryName}
        </p>
      </div>
      <div className="order-last flex w-full items-center gap-3 md:order-none md:w-auto">
        <span className="md:w-8 md:text-center">
          <DifficultyBadge difficulty={problem.difficulty} />
        </span>
        <span className="font-mono text-[11px] font-medium text-ink-faint md:w-6">
          R{revision.number}
        </span>
        {showStatus && (
          <span className="md:w-24">
            <StatusLabel revision={revision} today={today} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <NotesButton title={problem.title} hasNote={reminder.hasNote} />
        <button
          type="button"
          onClick={(event) => onMarkDone(reminder, event.currentTarget)}
          aria-label={`Mark R${revision.number} done: ${problem.title}`}
          className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface-3 px-2.5 py-1 font-medium whitespace-nowrap text-ink-soft hover:border-green-edge hover:bg-green-bg hover:text-green"
        >
          <span aria-hidden="true">✓</span> Done
        </button>
      </div>
    </li>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-4 text-[13px] text-ink-faint">{children}</p>;
}
