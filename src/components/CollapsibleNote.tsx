"use client";

import { useEffect, useId, useRef } from "react";

/** How tall a long note's preview is. */
export const PREVIEW_PX = 280;
/**
 * A note is long only if it is this much taller than the preview, so a note just over
 * the limit isn't collapsed to hide its last line.
 */
export const SLACK_PX = 40;

/**
 * A note in the Notes section (DESIGN-BRIEF.md §5). A long note shows as a preview that
 * fades out, with Show more; open, it ends with Show less, which also scrolls back to the
 * top of its card (`[data-note-card]`). A short note shows in full, with no button. The
 * height is measured with a ResizeObserver, so it follows window resizes and edits.
 */
export function CollapsibleNote({
  long,
  expanded,
  onLongChange,
  onExpandedChange,
  children,
}: {
  long: boolean;
  expanded: boolean;
  onLongChange: (long: boolean) => void;
  onExpandedChange: (expanded: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // The latest callback, so the observer isn't recreated on every render.
  const reportLong = useRef(onLongChange);
  useEffect(() => {
    reportLong.current = onLongChange;
  });

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    // The content's own height, whatever the preview clips of it.
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        reportLong.current(entry.contentRect.height > PREVIEW_PX + SLACK_PX);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clamped = long && !expanded;

  function collapse() {
    onExpandedChange(false);
    // The card's top doesn't move when it shrinks, so this can run straight away.
    root.current
      ?.closest("[data-note-card]")
      ?.scrollIntoView({ block: "start" });
  }

  return (
    <div ref={root}>
      <div
        id={id}
        onClick={
          clamped
            ? (event) => {
                // A link or a text selection in the preview works as usual.
                const target = event.target as Element;
                if (target.closest("a, button, input")) return;
                if (window.getSelection()?.toString()) return;
                onExpandedChange(true);
              }
            : undefined
        }
        className={clamped ? "relative cursor-pointer overflow-hidden" : ""}
        style={clamped ? { maxHeight: PREVIEW_PX } : undefined}
      >
        <div ref={content}>{children}</div>
        {clamped && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_bottom,transparent,var(--surface))]"
          />
        )}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => (expanded ? collapse() : onExpandedChange(true))}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs font-medium text-ink-soft hover:border-ink-faint hover:text-ink-strong"
        >
          {expanded ? "Show less" : "Show more"}
          <Chevron up={expanded} />
        </button>
      )}
    </div>
  );
}

export function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={up ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
    </svg>
  );
}
