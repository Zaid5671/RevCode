"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type Ref,
} from "react";
import { ApiError } from "@/client/api";
import { formatSavedAt } from "@/client/format";
import {
  applyToolbar,
  type TextEdit,
  type ToolbarAction,
} from "@/client/markdownToolbar";
import { useNoteSave } from "@/client/mutations";
import {
  baseVersionToSend,
  draftStatus,
  isDirty,
  noteDraft,
  startDraft,
  type DraftStatus,
  type NoteDraft,
} from "@/client/noteDraft";
import { NOTE_MAX_CHARS, type Note, type Problem } from "@/domain/schemas";
import { PRIMARY_BUTTON } from "./buttonStyles";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldError } from "./DateField";
import { MarkdownView } from "./MarkdownView";

/** The counter shows from here (DESIGN-BRIEF.md §7). */
const COUNTER_FROM = 18_000;

export type NoteEditorHandle = {
  /** ✕, Escape or a backdrop click: closes, or first asks about unsaved changes. */
  requestClose: () => void;
};

/**
 * The Note panel's editor (PLAN.md §8.4, DESIGN-BRIEF.md §7): Write and Preview, the
 * toolbar, the text area and a bottom bar with the save status. `note` is the stored note
 * as last fetched; the rules for when it replaces the text are in `noteDraft.ts`.
 */
export function NoteEditor({
  problem,
  note,
  onReload,
  onClose,
  ref,
}: {
  problem: Problem;
  note: Note | null;
  /** Fetches the stored note again ("Load the newer version"). */
  onReload: () => Promise<Note | null | undefined>;
  onClose: () => void;
  ref?: Ref<NoteEditorHandle>;
}) {
  const [state, dispatch] = useReducer(noteDraft, note, startDraft);
  const [view, setView] = useState<"write" | "preview">("write");
  const [confirm, setConfirm] = useState<"delete" | "discard" | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const save = useNoteSave(problem.id);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);

  // A new fetch of the stored note (on returning to the tab, or after a conflict). React's
  // "adjust state while rendering": no effect, no extra paint.
  const [seen, setSeen] = useState(note);
  if (note !== seen) {
    setSeen(note);
    dispatch({ type: "fetched", note });
  }

  const dirty = isDirty(state);
  const status = draftStatus(state);
  const chars = [...state.text].length;
  const tooLong = chars > NOTE_MAX_CHARS;
  const canSave = dirty && !state.saving && !tooLong && !state.conflict;

  useImperativeHandle(ref, () => ({
    requestClose: () => (dirty ? setConfirm("discard") : onClose()),
  }));

  // Closing or reloading the tab with unsaved text asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // A new note starts with the cursor in the text area.
  useEffect(() => {
    if (state.base.version === null) textarea.current?.focus();
    // Only on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A toolbar change puts its selection back once React has rendered the new text.
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (!selection || !textarea.current) return;
    pendingSelection.current = null;
    textarea.current.setSelectionRange(...selection);
  });

  async function send(body: string, draft: NoteDraft = state) {
    dispatch({ type: "saveStarted" });
    try {
      const saved = await save.mutateAsync({
        problemId: problem.id,
        body,
        baseVersion: baseVersionToSend(draft),
      });
      dispatch({ type: "saved", note: saved ?? null });
      // An empty save deleted the note: the panel's work is done.
      if (!saved) onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOTE_CONFLICT") {
        const details = error.details as { currentVersion?: number | null };
        dispatch({
          type: "saveFailed",
          message: error.message,
          conflict: { currentVersion: details?.currentVersion ?? null },
        });
        setConfirm(null);
      } else {
        dispatch({
          type: "saveFailed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  function trySave() {
    if (!canSave) return;
    // Saving empty text deletes the note, so it asks first.
    if (state.text.trim() === "") setConfirm("delete");
    else void send(state.text);
  }

  function runToolbar(action: ToolbarAction) {
    const area = textarea.current;
    if (!area) return;
    replaceText(
      area,
      applyToolbar(action, {
        text: area.value,
        selectionStart: area.selectionStart,
        selectionEnd: area.selectionEnd,
      }),
    );
  }

  /**
   * Puts the toolbar's change into the text area. Through `execCommand`, where the browser
   * supports it, so Ctrl+Z undoes it like typing; otherwise by setting the text.
   */
  function replaceText(area: HTMLTextAreaElement, next: TextEdit) {
    const old = area.value;
    let start = 0;
    while (start < old.length && old[start] === next.text[start]) start++;
    let oldEnd = old.length;
    let newEnd = next.text.length;
    while (
      oldEnd > start &&
      newEnd > start &&
      old[oldEnd - 1] === next.text[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }
    area.focus();
    area.setSelectionRange(start, oldEnd);
    const inserted = next.text.slice(start, newEnd);
    const done =
      typeof document.execCommand === "function" &&
      (inserted === ""
        ? document.execCommand("delete")
        : document.execCommand("insertText", false, inserted)) &&
      area.value === next.text;
    if (!done) dispatch({ type: "edited", text: next.text });
    pendingSelection.current = [next.selectionStart, next.selectionEnd];
    area.setSelectionRange(next.selectionStart, next.selectionEnd);
  }

  async function reload() {
    setReloadError(null);
    try {
      const current = await onReload();
      if (current !== undefined) dispatch({ type: "loadNewer", note: current });
    } catch (error) {
      setReloadError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          trySave();
        }
      }}
    >
      {state.conflict && (
        <ConflictBanner
          deleted={state.conflict.currentVersion === null}
          disabled={state.saving}
          error={reloadError}
          onLoad={() => void reload()}
          onKeep={() => void send(state.text)}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-5 py-2">
        <div
          role="group"
          aria-label="View"
          className="flex rounded-control border border-line p-0.5 text-xs"
        >
          {(
            [
              ["write", "Write"],
              ["preview", "Preview"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-[6px] px-2.5 py-1 font-medium ${
                view === v
                  ? "bg-surface-3 text-ink-strong"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "write" && <Toolbar onAction={runToolbar} />}
      </div>

      <textarea
        ref={textarea}
        value={state.text}
        onChange={(event) =>
          dispatch({ type: "edited", text: event.target.value })
        }
        onKeyDown={(event) => {
          if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
          const key = event.key.toLowerCase();
          if (key === "b" || key === "i") {
            event.preventDefault();
            runToolbar(key === "b" ? "bold" : "italic");
          }
        }}
        aria-label={`Note for ${problem.title}`}
        placeholder="Write your approach, complexity, edge cases…"
        spellCheck
        hidden={view !== "write"}
        className="min-h-60 w-full flex-1 resize-none bg-surface px-5 py-4 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:ring-1 focus:ring-accent focus:ring-inset"
      />
      {view === "preview" && (
        <div className="min-h-60 flex-1 overflow-y-auto px-5 py-4">
          {state.text.trim() === "" ? (
            <p className="text-[13px] text-ink-faint">
              Nothing to preview yet.
            </p>
          ) : (
            <MarkdownView markdown={state.text} />
          )}
        </div>
      )}

      {state.error && (
        <div className="px-5">
          <FieldError>{state.error}</FieldError>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-5 py-3">
        <p aria-live="polite" className="mr-auto text-xs">
          <StatusText status={status} savedAt={state.base.updatedAt} />
        </p>
        {chars >= COUNTER_FROM && (
          <span
            className={`font-mono text-[11px] ${tooLong ? "text-rose" : "text-ink-faint"}`}
          >
            {chars.toLocaleString("en-US")} /{" "}
            {NOTE_MAX_CHARS.toLocaleString("en-US")}
            {tooLong && <span className="sr-only"> (too long to save)</span>}
          </span>
        )}
        {state.base.version !== null && (
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            disabled={state.saving}
            className="text-xs text-ink-faint underline underline-offset-2 hover:text-rose disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={trySave}
          disabled={!canSave}
          title="Save (Ctrl+S)"
          className={PRIMARY_BUTTON}
        >
          {state.saving ? "Saving…" : "Save"}
        </button>
      </div>

      {confirm === "delete" && (
        <ConfirmDialog
          message={`Delete your note for ${problem.title}? This can't be undone.`}
          confirmLabel="Delete"
          pending={state.saving}
          error={state.error}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void send("")}
        />
      )}
      {confirm === "discard" && (
        <ConfirmDialog
          message="Discard your unsaved changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          pending={false}
          onCancel={() => setConfirm(null)}
          onConfirm={onClose}
        />
      )}
    </div>
  );
}

const STATUS: Record<DraftStatus, { text: string; className: string }> = {
  empty: { text: "No note yet", className: "text-ink-faint" },
  unsaved: { text: "Unsaved changes", className: "text-ink-soft" },
  saving: { text: "Saving…", className: "text-amber" },
  failed: {
    text: "Couldn't save — your text is still here",
    className: "text-rose",
  },
  saved: { text: "Saved", className: "text-green" },
};

function StatusText({
  status,
  savedAt,
}: {
  status: DraftStatus;
  savedAt: string | null;
}) {
  const { text, className } = STATUS[status];
  return (
    <span className={className}>
      {text}
      {status === "saved" && savedAt && ` ${formatSavedAt(savedAt)}`}
    </span>
  );
}

function ConflictBanner({
  deleted,
  disabled,
  error,
  onLoad,
  onKeep,
}: {
  deleted: boolean;
  disabled: boolean;
  error: string | null;
  onLoad: () => void;
  onKeep: () => void;
}) {
  const action =
    "font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50";
  return (
    <div
      role="alert"
      className="border-b border-amber-edge bg-amber-bg px-5 py-2 text-xs text-amber"
    >
      {deleted ? "Deleted" : "Changed"} in another tab or device.{" "}
      <button
        type="button"
        onClick={onLoad}
        disabled={disabled}
        className={action}
      >
        {deleted ? "Discard mine" : "Load the newer version"}
      </button>
      {" · "}
      <button
        type="button"
        onClick={onKeep}
        disabled={disabled}
        className={action}
      >
        {deleted ? "Save mine again" : "Keep mine and overwrite"}
      </button>
      {error && <span className="mt-1 block text-rose">{error}</span>}
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const TOOLS: { action: ToolbarAction; label: string; icon: React.ReactNode }[] =
  [
    {
      action: "bold",
      label: "Bold (Ctrl+B)",
      icon: <span className="text-[13px] font-bold">B</span>,
    },
    {
      action: "italic",
      label: "Italic (Ctrl+I)",
      icon: <span className="font-serif text-[14px] italic">I</span>,
    },
    {
      action: "heading",
      label: "Heading",
      icon: <span className="text-[13px] font-semibold">H</span>,
    },
    {
      action: "bulletList",
      label: "Bulleted list",
      icon: (
        <svg viewBox="0 0 16 16" className="size-4" {...ICON}>
          <path d="M6 4h7M6 8h7M6 12h7" />
          <circle cx="3" cy="4" r=".6" fill="currentColor" />
          <circle cx="3" cy="8" r=".6" fill="currentColor" />
          <circle cx="3" cy="12" r=".6" fill="currentColor" />
        </svg>
      ),
    },
    {
      action: "numberedList",
      label: "Numbered list",
      icon: (
        <svg viewBox="0 0 16 16" className="size-4" {...ICON}>
          <path d="M7 4h6M7 8h6M7 12h6M2.5 3l1-.5v3M2.3 7.3c.4-.6 1.7-.5 1.7.3 0 .7-1.7 1.4-1.7 2h1.8" />
        </svg>
      ),
    },
    {
      action: "code",
      label: "Code",
      icon: (
        <svg viewBox="0 0 16 16" className="size-4" {...ICON}>
          <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />
        </svg>
      ),
    },
    {
      action: "link",
      label: "Link",
      icon: (
        <svg viewBox="0 0 16 16" className="size-4" {...ICON}>
          <path d="M6.8 9.2a2.5 2.5 0 0 0 3.5 0l2.2-2.2a2.5 2.5 0 0 0-3.5-3.5l-.7.7M9.2 6.8a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.7-.7" />
        </svg>
      ),
    },
  ];

function Toolbar({ onAction }: { onAction: (action: ToolbarAction) => void }) {
  return (
    <div role="toolbar" aria-label="Formatting" className="flex gap-0.5">
      {TOOLS.map(({ action, label, icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          aria-label={label}
          title={label}
          className="flex size-7 items-center justify-center rounded-control text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          <span aria-hidden="true" className="flex">
            {icon}
          </span>
        </button>
      ))}
    </div>
  );
}
