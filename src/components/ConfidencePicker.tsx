"use client";

import { useProgressSave } from "@/client/mutations";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";

// DESIGN-BRIEF.md §1: confidence is a number 1–3; the words appear only in the Solve dialog.
export const CONFIDENCE_NAMES: Record<Confidence, string> = {
  1: "Shaky",
  2: "Okay",
  3: "Solid",
};

/**
 * The Solve dialog's three buttons, `1 · Shaky`, `2 · Okay`, `3 · Solid`, each with the
 * first revision's timing under it ("R1 in 3 days").
 */
export function ConfidencePicker({
  onPick,
  hints,
  disabled,
  pending,
}: {
  onPick: (confidence: Confidence) => void;
  /** Per confidence, e.g. "in 3 days"; omitted while the gaps load. */
  hints: Record<Confidence, string> | null;
  disabled: boolean;
  /** The confidence being saved, if any. */
  pending: Confidence | null;
}) {
  return (
    <div
      role="group"
      aria-label="Confidence"
      className="grid grid-cols-3 gap-2"
    >
      {CONFIDENCES.map((confidence) => {
        const label =
          pending === confidence
            ? "Saving…"
            : `${confidence} · ${CONFIDENCE_NAMES[confidence]}`;
        return (
          <button
            key={confidence}
            type="button"
            disabled={disabled}
            onClick={() => onPick(confidence)}
            aria-label={hints ? `${label}, R1 ${hints[confidence]}` : label}
            className="flex flex-col items-center rounded-control border border-line bg-surface px-2 py-2 text-[13px] hover:border-teal hover:bg-teal-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-medium">{label}</span>
            {hints && (
              <span className="font-mono text-[11px] text-ink-faint">
                R1 {hints[confidence]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Conf column and the Edit panel's confidence: a small 1/2/3 select that saves on
 * change. While saving it shows the value being sent; if the save fails it goes back to
 * the stored value and says why.
 */
export function ConfidenceSelect({
  problemId,
  title,
  confidence,
  fullError = false,
}: {
  problemId: number;
  title: string;
  confidence: Confidence;
  /** The Edit panel has room for the whole message; a table row shows "Not saved". */
  fullError?: boolean;
}) {
  const save = useProgressSave("edit", problemId);
  const shown =
    save.isPending && save.variables.confidence
      ? save.variables.confidence
      : confidence;
  return (
    <span className="inline-flex flex-col items-start">
      <select
        aria-label={`Confidence for ${title}`}
        value={shown}
        onChange={(event) =>
          save.mutate({
            problemId,
            confidence: Number(event.target.value) as Confidence,
          })
        }
        className="rounded-control border border-line bg-surface px-1 py-0.5 font-mono text-xs text-ink"
      >
        {CONFIDENCES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {save.isError &&
        (fullError ? (
          <span role="alert" className="mt-1 text-xs text-rose">
            {save.error.message}
          </span>
        ) : (
          <span
            role="alert"
            title={save.error.message}
            className="text-[11px] whitespace-nowrap text-rose"
          >
            Not saved<span className="sr-only">: {save.error.message}</span>
          </span>
        ))}
    </span>
  );
}
