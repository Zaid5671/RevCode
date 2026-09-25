"use client";

import { useSaveStatus } from "@/client/mutations";

// DESIGN-BRIEF.md §1 "Save status". It shows every save in the app (client/saves.ts), so
// no save can fail without this showing it (PLAN.md §8.1). A failure stays until a newer
// save of the same thing replaces it, whatever else saves meanwhile.
const STATES = {
  saved: { dot: "bg-teal", text: "text-teal", label: "Saved" },
  saving: { dot: "bg-amber", text: "text-amber", label: "Saving…" },
  failed: { dot: "bg-rose", text: "text-rose", label: "Couldn't save" },
} as const;

export function SaveStatus() {
  const { state, canRetry, retry } = useSaveStatus();
  const { dot, text, label } = STATES[state];

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs whitespace-nowrap ${text}`}
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
