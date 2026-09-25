"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// The shell of every overlay (DESIGN-BRIEF.md §7): the Solve dialog, the Edit panel,
// confirmations, the revision "done" popover and, in Phase 8, the Note panel. It is the
// browser's own modal <dialog>, which keeps focus inside, makes the page behind inert and
// closes on Escape (PLAN.md §8.6). It is open while mounted: the parent unmounts it to
// close it. On phones every placement becomes a bottom sheet.

type Placement = "center" | "drawer" | "wideDrawer" | "popover";

/** On phones: a bottom sheet, or (for the Note panel's typing room) the whole height. */
const SHEET =
  "max-md:top-auto max-md:max-h-[85dvh] max-md:rounded-t-dialog max-md:border-t";
const FULL_SHEET = "max-md:top-0 max-md:h-dvh";

const DRAWER = "md:inset-y-0 md:right-0 md:left-auto md:h-full md:border-l";

const PLACEMENT: Record<Placement, string> = {
  center: `${SHEET} md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-[26rem] md:rounded-dialog md:border`,
  drawer: `${SHEET} ${DRAWER} md:w-[400px]`,
  wideDrawer: `${FULL_SHEET} ${DRAWER} md:w-[560px]`,
  popover: `${SHEET} md:top-(--popover-top) md:left-(--popover-left) md:h-fit md:w-64 md:rounded-card md:border md:backdrop:bg-transparent`,
};

const GAP = 6;
const EDGE = 8;

/** Places a popover under its anchor, or above it when there is no room below. */
function placeNear(dialog: HTMLDialogElement, anchor: HTMLElement) {
  const a = anchor.getBoundingClientRect();
  const { width, height } = dialog.getBoundingClientRect();
  const left = Math.min(
    Math.max(a.right - width, EDGE),
    window.innerWidth - width - EDGE,
  );
  const below = a.bottom + GAP;
  const top =
    below + height <= window.innerHeight - EDGE || a.top - GAP - height < EDGE
      ? below
      : a.top - GAP - height;
  dialog.style.setProperty("--popover-left", `${left}px`);
  dialog.style.setProperty("--popover-top", `${top}px`);
}

export function Dialog({
  onClose,
  placement = "center",
  anchor,
  label,
  labelledBy,
  children,
}: {
  /** Escape, a click on the backdrop, or the browser closing the dialog. */
  onClose: () => void;
  placement?: Placement;
  /** The button a popover belongs to. */
  anchor?: HTMLElement;
  label?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const unmounting = useRef(false);
  const pressedBackdrop = useRef(false);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    unmounting.current = false;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const place = () => {
      if (placement === "popover" && anchor) placeNear(dialog, anchor);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      unmounting.current = true;
      dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [placement, anchor]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-labelledby={labelledBy}
      // React passes `cancel` and `close` up the component tree, unlike the browser, so a
      // dialog opened from inside this one would close both. Only its own events count.
      // Escape: the parent decides, by unmounting.
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onCloseRef.current();
      }}
      // The browser may still close it (a second Escape can't be cancelled). It opens again
      // at once and the parent decides, as for the first Escape: the Note panel stays open
      // behind its "Discard your unsaved changes?" question. `close` fires a moment after
      // closing, so a dialog that is open again by then (React's dev-mode remount closes and
      // reopens it) ignores it.
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        const dialog = event.currentTarget;
        if (!unmounting.current && !dialog.open) {
          dialog.showModal();
          onCloseRef.current();
        }
      }}
      // A click that starts and ends on the backdrop closes it; a text selection that
      // ends outside doesn't.
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) {
          onCloseRef.current();
        }
        pressedBackdrop.current = false;
      }}
      className={`fixed m-0 max-h-none max-w-none overflow-y-auto border-line bg-surface p-0 text-ink max-md:inset-x-0 max-md:bottom-0 max-md:w-full max-md:pb-[env(safe-area-inset-bottom)] ${PLACEMENT[placement]}`}
    >
      {children}
    </dialog>
  );
}

/** The ✕ in an overlay's corner. */
export function CloseButton({
  onClick,
  label = "Close",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="-m-1 flex size-7 flex-none items-center justify-center rounded-control text-ink-faint hover:bg-surface-2 hover:text-ink"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}
