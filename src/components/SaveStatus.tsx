"use client";

import { useSaveStatus } from "@/client/mutations";

// DESIGN-BRIEF.md §1 "Save status". It shows every save in the app (client/saves.ts), so
// no save can fail without this showing it (PLAN.md §8.1). A failure stays until a newer
// save of the same thing replaces it, whatever else saves meanwhile.
const STATES = {
  saved: {
    dot: "bg-green",
    pill: "text-green bg-green-bg border-green-edge",
    label: "Saved",
  },
  saving: {
    dot: "bg-amber",
    pill: "text-amber bg-amber-bg border-amber-edge",
    label: "Saving…",
  },
  failed: {
    dot: "bg-rose",
    pill: "text-rose bg-rose-bg border-rose-edge",
    label: "Couldn't save",
  },
} as const;

export function SaveStatus() {
  const { state, canRetry, retry } = useSaveStatus();
  const { dot, pill, label } = STATES[state];

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap ${pill}`}
    >
      <p role="status" className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </p>
      {state === "failed" && canRetry && (
        <>
          <span aria-hidden="true">—</span>
          <button
            type="button"
            onClick={retry}
            className="underline underline-offset-2 hover:no-underline"
          >
            retry
          </button>
        </>
      )}
    </div>
  );
}
