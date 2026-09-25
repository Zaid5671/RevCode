"use client";

import { useId, useRef } from "react";
import { useNote } from "@/client/queries";
import type { Problem } from "@/domain/schemas";
import { DifficultyBadge } from "./Badges";
import { CloseButton, Dialog } from "./Dialog";
import { NoteEditor, type NoteEditorHandle } from "./NoteEditor";

/**
 * The Note panel (PLAN.md §8.4, DESIGN-BRIEF.md §7): slides in from the right, 560 px
 * wide; on phones it fills the screen. Opened from the Problems table, the dashboard and
 * (Phase 8 part B) the Notes section. The editor stays locked until the stored note has
 * loaded, so a note it hasn't seen can't be overwritten.
 */
export function NoteDrawer({
  problem,
  categoryName,
  onClose,
}: {
  problem: Problem;
  categoryName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const note = useNote(problem.id);
  const editor = useRef<NoteEditorHandle>(null);
  const requestClose = () =>
    editor.current ? editor.current.requestClose() : onClose();

  return (
    <Dialog placement="wideDrawer" onClose={requestClose} labelledBy={titleId}>
      <div className="flex h-full flex-col">
        <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[17px] leading-snug font-semibold">
              <a
                href={problem.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {problem.title}
                <span aria-hidden="true" className="text-ink-faint">
                  {" "}
                  ↗
                </span>
              </a>
            </h2>
            <p className="text-[11px] text-ink-faint">{categoryName}</p>
          </div>
          <span className="pt-1">
            <DifficultyBadge difficulty={problem.difficulty} />
          </span>
          <CloseButton onClick={requestClose} />
        </header>

        {note.data !== undefined ? (
          <NoteEditor
            ref={editor}
            problem={problem}
            note={note.data}
            onReload={async () => {
              const result = await note.refetch();
              if (result.isError) throw result.error;
              return result.data;
            }}
            onClose={onClose}
          />
        ) : (
          <LockedEditor
            error={note.isError ? note.error.message : null}
            onRetry={() => void note.refetch()}
          />
        )}
      </div>
    </Dialog>
  );
}

/** Loading ("Loading note…") or a failed load ("Couldn't load this note." + Try again). */
function LockedEditor({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <p
          role="alert"
          className="border-b border-rose-edge bg-rose-bg px-5 py-2 text-xs text-rose"
        >
          Couldn&apos;t load this note. {error}{" "}
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </p>
      )}
      <textarea
        disabled
        aria-label="Note (not loaded)"
        className="min-h-60 w-full flex-1 resize-none bg-surface px-5 py-4 opacity-50"
      />
      <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
        {error ? "Not loaded" : "Loading note…"}
      </div>
    </div>
  );
}
