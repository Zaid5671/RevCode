/**
 * The Notes column: `+` for no note, a note icon when there is one. It opens the note
 * drawer once Phase 8 builds it (PLAN.md §12), so for now it only shows which problems
 * have notes.
 */
export function NotesButton({
  title,
  hasNote,
}: {
  title: string;
  hasNote: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={
        hasNote ? `Open note for ${title}` : `Add a note for ${title}`
      }
      title="Notes open here in a coming update"
      className={`inline-flex size-6 items-center justify-center rounded-control ${
        hasNote ? "text-ink-soft" : "text-ink-faint"
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
