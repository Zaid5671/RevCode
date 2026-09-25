"use client";

import { useId, useState } from "react";
import { useProgressSave } from "@/client/mutations";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import { PRIMARY_BUTTON } from "./buttonStyles";
import { DateField, FieldError, dateProblem } from "./DateField";
import { Dialog } from "./Dialog";

/**
 * Marks the next pending revision done (PLAN.md §8.2–8.3): a date, today by default and
 * changeable to an earlier day, then Done. Opened by the ✓ beside a due date, here and on
 * the dashboard. It closes once the server confirms; a failure stays here with its message.
 */
export function RevisionDonePopover({
  problemId,
  title,
  revision,
  today,
  min,
  anchor,
  onClose,
}: {
  problemId: number;
  title: string;
  revision: RevisionNumber;
  /** The server's today for this user. */
  today: CalendarDate;
  /** The previous event (solve date or previous revision); the server checks it anyway. */
  min?: CalendarDate;
  anchor: HTMLElement;
  onClose: () => void;
}) {
  const headingId = useId();
  const [completedOn, setCompletedOn] = useState(today);
  const save = useProgressSave("completeRevision", problemId);
  const problemWithDate = dateProblem(completedOn, { today, min });

  return (
    <Dialog
      placement="popover"
      anchor={anchor}
      onClose={onClose}
      labelledBy={headingId}
    >
      <form
        className="flex flex-col gap-3 p-4 md:p-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(
            { problemId, revision, completedOn },
            { onSuccess: onClose },
          );
        }}
      >
        <h2 id={headingId} className="text-[13px] font-medium">
          <span className="font-mono text-ink-faint">R{revision}</span> done ·{" "}
          {title}
        </h2>
        <DateField
          label="Done on"
          value={completedOn}
          min={min}
          max={today}
          onChange={setCompletedOn}
          error={problemWithDate}
          autoFocus
        />
        {save.isError && <FieldError>{save.error.message}</FieldError>}
        <button
          type="submit"
          disabled={problemWithDate !== null || save.isPending}
          className={`${PRIMARY_BUTTON} self-end`}
        >
          {save.isPending ? "Saving…" : "Done"}
        </button>
      </form>
    </Dialog>
  );
}
