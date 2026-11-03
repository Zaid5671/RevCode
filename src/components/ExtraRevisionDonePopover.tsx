"use client";

import { useId, useState } from "react";
import { useCompleteExtraRevision } from "@/client/extraProblemMutations";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import { PRIMARY_BUTTON } from "./buttonStyles";
import { DateField, FieldError, dateProblem } from "./DateField";
import { Dialog } from "./Dialog";

export function ExtraRevisionDonePopover({
  problemId,
  title,
  revision,
  today,
  min,
  anchor,
  onClose,
}: {
  problemId: string;
  title: string;
  revision: RevisionNumber;
  today: CalendarDate;
  min?: CalendarDate;
  anchor: HTMLElement;
  onClose: () => void;
}) {
  const headingId = useId();
  const [completedOn, setCompletedOn] = useState(today);
  const save = useCompleteExtraRevision();
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
            { id: problemId, revision, completedOn },
            { onSuccess: onClose },
          );
        }}
      >
        <h2 id={headingId} className="text-[13px] font-medium">
          <span className="font-mono text-ink-faint">R{revision}</span> done ·{" "}
          {title}
        </h2>

        <DateField
          label="Completed on"
          value={completedOn}
          onChange={setCompletedOn}
          min={min}
          max={today}
          error={problemWithDate}
          autoFocus
        />

        {save.isError && <FieldError>{save.error.message}</FieldError>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={save.isPending || problemWithDate !== null}
            className={PRIMARY_BUTTON}
          >
            {save.isPending ? "Saving…" : "Done"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

