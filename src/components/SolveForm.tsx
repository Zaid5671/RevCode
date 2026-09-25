"use client";

import { useId, useState } from "react";
import { formatRelativeDue } from "@/client/format";
import { useProgressSave } from "@/client/mutations";
import { useGaps } from "@/client/queries";
import { addDays, type CalendarDate } from "@/domain/calendarDate";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";
import type { Problem } from "@/domain/schemas";
import { SECONDARY_BUTTON } from "./buttonStyles";
import { ConfidencePicker } from "./ConfidencePicker";
import { DateField, FieldError, dateProblem } from "./DateField";
import { Dialog } from "./Dialog";

/**
 * The Solve dialog (PLAN.md §8.3, DESIGN-BRIEF.md §7), opened by ticking Solved: the date
 * (today by default) and three confidence buttons. Clicking one saves; the dialog closes
 * once the server confirms, and a failure stays here with its message. Cancel saves nothing.
 */
export function SolveForm({
  problem,
  today,
  onClose,
}: {
  problem: Problem;
  /** The server's today for this user, from `GET /api/progress`. */
  today: CalendarDate;
  onClose: () => void;
}) {
  const titleId = useId();
  const [solvedOn, setSolvedOn] = useState(today);
  const gaps = useGaps();
  const save = useProgressSave("solve", problem.id);
  const problemWithDate = dateProblem(solvedOn, { today });

  const hints =
    gaps.data && !problemWithDate
      ? (Object.fromEntries(
          CONFIDENCES.map((c) => [
            c,
            formatRelativeDue(addDays(solvedOn, gaps.data.gaps[c][0]), today),
          ]),
        ) as Record<Confidence, string>)
      : null;

  function pick(confidence: Confidence) {
    save.mutate(
      { problemId: problem.id, solvedOn, confidence },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog onClose={onClose} labelledBy={titleId}>
      <div className="flex flex-col gap-4 p-5">
        <h2 id={titleId} className="text-[17px] font-semibold">
          {problem.title} — how did it go?
        </h2>
        <DateField
          label="Solved on"
          value={solvedOn}
          max={today}
          onChange={setSolvedOn}
          error={problemWithDate}
          autoFocus
        />
        <div>
          <ConfidencePicker
            onPick={pick}
            hints={hints}
            disabled={problemWithDate !== null || save.isPending}
            pending={save.isPending ? save.variables.confidence : null}
          />
          {save.isError && <FieldError>{save.error.message}</FieldError>}
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
