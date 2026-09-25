"use client";

import { useId, useState } from "react";
import {
  daysFromSolve,
  isValidGap,
  readDraft,
  sameGaps,
  toDraft,
  type GapsDraft,
} from "@/client/gapsDraft";
import { useSettingsSave } from "@/client/mutations";
import { useGaps } from "@/client/queries";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";
import type { GapsResponse } from "@/domain/schemas";
import { LINK_BUTTON, PRIMARY_BUTTON } from "./buttonStyles";
import { CONFIDENCE_NAMES } from "./ConfidencePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  CardLoadError,
  CardLoading,
  SaveNote,
  SettingsCard,
} from "./SettingsCard";

const REVISIONS = ["R1", "R2", "R3"] as const;

/**
 * The "Revision gaps" card in Settings (PLAN.md §8.5, DESIGN-BRIEF.md §6): the days from
 * the previous step to each revision, per confidence, with Save and Reset to defaults.
 */
export function GapsEditor() {
  const gaps = useGaps();
  return (
    <SettingsCard
      title="Revision gaps"
      aside={gaps.data && (gaps.data.isDefault ? "Defaults" : "Custom")}
      description="Days from the previous step to each revision. Changing them moves upcoming due dates; completed revisions stay as they are."
    >
      {gaps.data ? (
        <Editor gaps={gaps.data} />
      ) : gaps.isError ? (
        <CardLoadError error={gaps.error} onRetry={() => gaps.refetch()} />
      ) : (
        <CardLoading />
      )}
    </SettingsCard>
  );
}

function Editor({ gaps }: { gaps: GapsResponse }) {
  const errorId = useId();
  const [base, setBase] = useState(gaps.gaps);
  const [draft, setDraft] = useState(() => toDraft(gaps.gaps));
  const [confirmingReset, setConfirmingReset] = useState(false);
  const save = useSettingsSave("saveGaps");
  const reset = useSettingsSave("resetGaps");
  const parsed = readDraft(draft);

  // New gaps from the server (a save, a reset, another tab): the grid follows them unless
  // the user is editing it. (React's "adjust state while rendering": no effect needed.)
  if (base !== gaps.gaps) {
    setBase(gaps.gaps);
    if (parsed && (sameGaps(parsed, base) || sameGaps(parsed, gaps.gaps))) {
      setDraft(toDraft(gaps.gaps));
    }
  }

  const changed = parsed === null || !sameGaps(parsed, gaps.gaps);
  const invalid = parsed === null;

  function edit(confidence: Confidence, index: number, value: string) {
    setDraft((d) => ({
      ...d,
      [confidence]: d[confidence].map((v, i) =>
        i === index ? value : v,
      ) as GapsDraft[Confidence],
    }));
  }

  function confirmReset() {
    reset.mutate(undefined, {
      onSuccess: (defaults) => {
        setDraft(toDraft(defaults.gaps));
        save.reset();
        setConfirmingReset(false);
      },
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed && changed) save.mutate(parsed);
      }}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="font-mono text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            <th scope="col" className="pb-2 text-left font-semibold">
              Confidence
            </th>
            {REVISIONS.map((r) => (
              <th key={r} scope="col" className="pb-2 font-semibold">
                {r}
              </th>
            ))}
            <th
              scope="col"
              className="hidden pb-2 pl-3 text-left font-semibold sm:table-cell"
            >
              If on time
            </th>
          </tr>
        </thead>
        <tbody>
          {CONFIDENCES.map((confidence) => {
            const name = `${confidence} · ${CONFIDENCE_NAMES[confidence]}`;
            const onTime = `day ${daysFromSolve(draft[confidence])
              .map((d) => d ?? "–")
              .join(" · ")}`;
            return (
              <tr key={confidence} className="border-t border-line-soft">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {name}
                  <span className="block font-mono text-[11px] font-normal text-ink-faint sm:hidden">
                    {onTime}
                  </span>
                </th>
                {REVISIONS.map((revision, index) => {
                  const value = draft[confidence][index]!;
                  const bad = !isValidGap(value);
                  return (
                    <td key={revision} className="px-1 py-2 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`${revision} days for ${name}`}
                        value={value}
                        onChange={(e) =>
                          edit(confidence, index, e.target.value)
                        }
                        aria-invalid={bad || undefined}
                        aria-describedby={bad ? errorId : undefined}
                        className={`w-14 rounded-control border bg-field px-2 py-1 text-center font-mono text-[13px] text-ink focus:border-accent focus:outline-none ${bad ? "border-rose" : "border-line-strong hover:border-ink-ghost"}`}
                      />
                    </td>
                  );
                })}
                <td className="hidden py-2 pl-3 font-mono text-[11px] whitespace-nowrap text-ink-faint sm:table-cell">
                  {onTime}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {invalid && (
        <p id={errorId} className="mt-2 text-xs text-rose">
          Each gap is a whole number of days from 1 to 180.
        </p>
      )}

      <details className="group mt-3 text-[13px]">
        <summary className="w-fit cursor-pointer list-none text-xs text-ink-soft underline underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Why these numbers?
        </summary>
        <p className="mt-2 text-ink-soft">
          Each gap is roughly 2–4 times the one before: spaced repetition works
          best with growing intervals. Shaky problems come back the next day,
          before the approach fades. The last revision lands 2–7 weeks after
          solving, which tests long-term memory within a typical 2–3 month prep.
          Every problem gets three revisions whatever the gaps, so changing them
          only moves work earlier or later. Gaps don&apos;t have to grow; set
          whatever suits you.
        </p>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={invalid || !changed || save.isPending}
          className={PRIMARY_BUTTON}
        >
          Save
        </button>
        <SaveNote
          pending={save.isPending}
          saved={save.isSuccess && !changed}
          error={save.isError ? save.error : null}
        />
        {!gaps.isDefault && (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className={`${LINK_BUTTON} ml-auto`}
          >
            Reset to defaults
          </button>
        )}
      </div>

      {confirmingReset && (
        <ConfirmDialog
          message="Reset your gaps to the defaults? Upcoming due dates will move."
          confirmLabel="Reset"
          onConfirm={confirmReset}
          onCancel={() => {
            setConfirmingReset(false);
            reset.reset();
          }}
          pending={reset.isPending}
          error={reset.isError ? reset.error.message : null}
        />
      )}
    </form>
  );
}
