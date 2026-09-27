"use client";

import { useId, type ReactNode } from "react";

/**
 * One section of the Settings page (DESIGN-BRIEF.md §6): a bordered card with a heading,
 * an optional faint label beside it, a one-line explanation, then its controls.
 */
export function SettingsCard({
  title,
  aside,
  description,
  children,
}: {
  title: string;
  aside?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-card border border-line-strong bg-surface p-4 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-sm font-semibold text-ink-strong">
          {title}
        </h2>
        {aside && (
          <span className="font-mono text-[11px] font-medium text-ink-faint">
            {aside}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-[13px] text-ink-soft">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Plain grey lines while a card's data loads; no animation (DESIGN-BRIEF.md §1). */
export function CardLoading() {
  return (
    <div>
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {["w-[60%]", "w-[45%]", "w-[52%]"].map((width) => (
          <span key={width} className={`h-2.5 rounded bg-surface-3 ${width}`} />
        ))}
      </div>
    </div>
  );
}

/** A card's load failure, with Try again (DESIGN-BRIEF.md §6). */
export function CardLoadError({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <p
      role="alert"
      className="rounded-control border border-rose-edge bg-rose-bg px-3.5 py-2.5 text-[13px] text-rose"
    >
      Couldn&apos;t load your settings. {error?.message}{" "}
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Try again
      </button>
    </p>
  );
}

/** What happened to a save, beside its control: Saving…, Saved, or why it failed. */
export function SaveNote({
  pending,
  saved,
  error,
}: {
  pending: boolean;
  saved: boolean;
  error: Error | null;
}) {
  if (pending)
    return (
      <span role="status" className="text-xs text-amber">
        Saving…
      </span>
    );
  if (error)
    return (
      <span role="alert" className="text-xs text-rose">
        {error.message}
      </span>
    );
  if (saved)
    return (
      <span role="status" className="text-xs text-green">
        Saved
      </span>
    );
  return null;
}
