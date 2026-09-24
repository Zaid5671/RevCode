"use client";

import { useIsMutating, useMutationState } from "@tanstack/react-query";

// DESIGN-BRIEF.md §1 "Save status". It watches every save in the app through TanStack
// Query's mutation cache, so no save can fail without this showing it (PLAN.md §8.1).
const STATES = {
  saved: { dot: "bg-teal", text: "text-teal", label: "Saved" },
  saving: { dot: "bg-amber", text: "text-amber", label: "Saving…" },
  failed: { dot: "bg-rose", text: "text-rose", label: "Couldn't save" },
} as const;

export function SaveStatus() {
  const saving = useIsMutating() > 0;
  const statuses = useMutationState({
    select: (mutation) => mutation.state,
  });
  const latest = statuses.reduce<(typeof statuses)[number] | undefined>(
    (last, state) =>
      !last || state.submittedAt >= last.submittedAt ? state : last,
    undefined,
  );
  const state = saving
    ? STATES.saving
    : latest?.status === "error"
      ? STATES.failed
      : STATES.saved;

  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 font-mono text-xs whitespace-nowrap ${state.text}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${state.dot}`}
      />
      {state.label}
    </p>
  );
}
