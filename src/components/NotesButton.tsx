/**
 * The Notes button: `+` for no note, a note icon when there is one. Either opens the Note
 * panel (PLAN.md §8.3, §8.4).
 */
export function NotesButton({
  title,
  hasNote,
  onClick,
  revealOnHover = false,
}: {
  title: string;
  hasNote: boolean;
  onClick: () => void;
  /**
   * In the table, `+` shows only while its row (a `group`) is hovered or it has focus, so
   * 200-odd rows don't each show one (DESIGN-BRIEF.md §4). Phone cards have no hover.
   */
  revealOnHover?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        hasNote ? `Open note for ${title}` : `Add a note for ${title}`
      }
      title={hasNote ? "Open note" : "Add a note"}
      className={`inline-flex size-6 items-center justify-center rounded-control hover:bg-surface-3 hover:text-ink ${
        hasNote ? "text-ink-soft" : "text-ink-faint"
      } ${
        !hasNote && revealOnHover
          ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          : ""
      }`}
    >
      {hasNote ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        >
          <path d="M3.5 2.5h6l3 3v8h-9Zm6 0v3h3M5.5 9h5M5.5 11.5h3" />
        </svg>
      ) : (
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
      )}
    </button>
  );
}
