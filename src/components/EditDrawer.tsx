"use client";

import { useId, useState } from "react";
import { formatShortDate } from "@/client/format";
import { useProgressSave } from "@/client/mutations";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Revision } from "@/domain/schedule";
import type { Problem, ProgressEntry } from "@/domain/schemas";
import { DifficultyBadge, StatusLabel } from "./Badges";
import { LINK_BUTTON, PRIMARY_BUTTON, SECONDARY_BUTTON } from "./buttonStyles";
import { ConfidenceSelect } from "./ConfidencePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { DateField, FieldError, dateProblem } from "./DateField";
import { CloseButton, Dialog } from "./Dialog";

/**
 * The Edit panel (PLAN.md §8.3, DESIGN-BRIEF.md §7), opened by clicking a solved row:
 * change the solve date or confidence; complete, edit or undo revisions; unmark solved.
 * The server checks the timeline rules (§4.4); its message appears under the line that
 * was being changed.
 */
export function EditDrawer({
  problem,
  entry,
  today,
  onClose,
}: {
  problem: Problem;
  entry: ProgressEntry;
  /** The server's today for this user. */
  today: CalendarDate;
  onClose: () => void;
}) {
  const titleId = useId();
  const [confirmingUnmark, setConfirmingUnmark] = useState(false);
  const latestDone = entry.revisions.findLast((r) => r.status === "done");

  return (
    <Dialog placement="drawer" onClose={onClose} labelledBy={titleId}>
      <div className="flex min-h-full flex-col gap-5 p-5">
        <header className="flex items-start gap-3">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-[17px] leading-snug font-semibold"
          >
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent hover:underline"
            >
              {problem.title}
              <span aria-hidden="true" className="text-ink-faint">
                {" "}
                ↗
              </span>
            </a>
          </h2>
          <span className="pt-1">
            <DifficultyBadge difficulty={problem.difficulty} />
          </span>
          <CloseButton onClick={onClose} />
        </header>

        <SolvedOnField
          // A new stored date (saved here or elsewhere) starts the field afresh.
          key={entry.solvedOn}
          problemId={problem.id}
          solvedOn={entry.solvedOn}
          today={today}
        />

        <div className="flex items-start gap-3">
          <span className="pt-0.5 text-[13px] text-ink-soft">Confidence</span>
          <ConfidenceSelect
            problemId={problem.id}
            title={problem.title}
            confidence={entry.confidence}
            fullError
          />
        </div>

        <section>
          <h3 className="mb-1.5 text-[13px] text-ink-soft">Revisions</h3>
          <ul className="flex flex-col divide-y divide-line-soft border-y border-line-soft">
            {entry.revisions.map((revision, i) => (
              <RevisionLine
                key={`${revision.number}-${revision.status}-${revision.date}`}
                problemId={problem.id}
                revision={revision}
                today={today}
                min={i === 0 ? entry.solvedOn : entry.revisions[i - 1]!.date}
                canUndo={revision === latestDone}
              />
            ))}
          </ul>
        </section>

        <div className="mt-auto border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={() => setConfirmingUnmark(true)}
            className="text-[13px] text-rose underline underline-offset-2 hover:no-underline"
          >
            Unmark solved (your note is kept)
          </button>
        </div>
      </div>
      {confirmingUnmark && (
        <UnmarkConfirm
          problem={problem}
          onCancel={() => setConfirmingUnmark(false)}
          onDone={onClose}
        />
      )}
    </Dialog>
  );
}

function SolvedOnField({
  problemId,
  solvedOn,
  today,
}: {
  problemId: number;
  solvedOn: CalendarDate;
  today: CalendarDate;
}) {
  const [value, setValue] = useState(solvedOn);
  const save = useProgressSave("edit", problemId);
  const changed = value !== solvedOn;
  // Only a changed date is checked against today (§4.4 rule 3).
  const problemWithDate = changed ? dateProblem(value, { today }) : null;

  return (
    <form
      className="flex flex-wrap items-start gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ problemId, solvedOn: value });
      }}
    >
      <DateField
        label="Solved on"
        value={value}
        max={today}
        onChange={(next) => {
          save.reset();
          setValue(next);
        }}
        error={problemWithDate ?? (save.isError ? save.error.message : null)}
      />
      {changed && (
        <>
          <button
            type="submit"
            disabled={problemWithDate !== null || save.isPending}
            className={PRIMARY_BUTTON}
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              save.reset();
              setValue(solvedOn);
            }}
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
        </>
      )}
    </form>
  );
}

/**
 * `R1  ✓ 18 Sep  edit · undo`, `R2  due Fri 25 Sep  ✓ done` or `R3  (9 Oct)`. Editing a
 * done revision and completing the next one share one inline date form.
 */
function RevisionLine({
  problemId,
  revision,
  today,
  min,
  canUndo,
}: {
  problemId: number;
  revision: Revision;
  today: CalendarDate;
  /** The previous event's date: the solve date for R1, else the previous revision's. */
  min: CalendarDate;
  canUndo: boolean;
}) {
  const [date, setDate] = useState<string | null>(null);
  const complete = useProgressSave("completeRevision", problemId);
  const undo = useProgressSave("undoRevision", problemId);
  const label = `R${revision.number}`;
  const done = revision.status === "done";
  const pendingNow = !done && revision.status !== "projected";
  const unchanged = done && date === revision.date;
  const problemWithDate =
    date === null || unchanged ? null : dateProblem(date, { today, min });
  const error = complete.isError
    ? complete.error.message
    : undo.isError
      ? undo.error.message
      : null;

  function open(initial: CalendarDate) {
    complete.reset();
    undo.reset();
    setDate(initial);
  }

  return (
    <li className="py-2 text-[13px]">
      {date === null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="w-6 font-mono text-xs text-ink-faint">{label}</span>
          {done ? (
            <span className="text-[13px] text-green">
              <span aria-hidden="true">✓ </span>
              <span className="sr-only">done on </span>
              {formatShortDate(revision.date, today)}
            </span>
          ) : pendingNow ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              due <StatusLabel revision={revision} today={today} />
            </span>
          ) : (
            <span className="text-[13px] text-ink-faint">
              <span className="sr-only">projected for </span>(
              {formatShortDate(revision.date, today)})
            </span>
          )}
          <span className="ml-auto flex gap-3">
            {done && (
              <button
                type="button"
                onClick={() => open(revision.date)}
                aria-label={`Edit ${label} date`}
                className={LINK_BUTTON}
              >
                edit
              </button>
            )}
            {done && canUndo && (
              <button
                type="button"
                disabled={undo.isPending}
                onClick={() => {
                  complete.reset();
                  undo.mutate({ problemId, revision: revision.number });
                }}
                aria-label={`Undo ${label}`}
                className={LINK_BUTTON}
              >
                {undo.isPending ? "undoing…" : "undo"}
              </button>
            )}
            {pendingNow && (
              <button
                type="button"
                onClick={() => open(today)}
                aria-label={`Mark ${label} done`}
                className="rounded-control border border-line px-2 py-0.5 text-xs text-ink hover:bg-surface-2"
              >
                ✓ done
              </button>
            )}
          </span>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (unchanged) return setDate(null);
            complete.mutate(
              { problemId, revision: revision.number, completedOn: date },
              { onSuccess: () => setDate(null) },
            );
          }}
        >
          <DateField
            label={`${label} done on`}
            value={date}
            min={min}
            max={today}
            onChange={(next) => {
              complete.reset();
              setDate(next);
            }}
            error={problemWithDate}
            autoFocus
          />
          <button
            type="submit"
            disabled={problemWithDate !== null || complete.isPending}
            className={PRIMARY_BUTTON}
          >
            {complete.isPending ? "Saving…" : done ? "Save" : "Done"}
          </button>
          <button
            type="button"
            onClick={() => {
              complete.reset();
              setDate(null);
            }}
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
        </form>
      )}
      {error && <FieldError>{error}</FieldError>}
    </li>
  );
}

/** "Unmark Two Sum as solved? Your note is kept." (DESIGN-BRIEF.md §7). */
export function UnmarkConfirm({
  problem,
  onCancel,
  onDone,
}: {
  problem: Problem;
  onCancel: () => void;
  onDone: () => void;
}) {
  const save = useProgressSave("unmark", problem.id);
  return (
    <ConfirmDialog
      message={`Unmark ${problem.title} as solved? Your note is kept.`}
      confirmLabel="Unmark"
      pending={save.isPending}
      error={save.isError ? save.error.message : null}
      onCancel={onCancel}
      onConfirm={() =>
        save.mutate({ problemId: problem.id }, { onSuccess: onDone })
      }
    />
  );
}
