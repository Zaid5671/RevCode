// The Note panel's editor rules (PLAN.md §8.4, DESIGN-BRIEF.md §7): the text being edited,
// the saved note it started from, and what happens when the stored note changes. Unsaved
// text is never replaced without the user choosing to.
import type { Note } from "@/domain/schemas";

/** The note the text started from; `version: null` when there was none. */
type Base = { version: number | null; body: string; updatedAt: string | null };

export type NoteDraft = {
  base: Base;
  text: string;
  /** A save from this panel is on its way. */
  saving: boolean;
  /** Why the last save failed; cleared when the next one starts. */
  error: string | null;
  /** The stored note changed since `base` while there was unsaved text. */
  conflict: Conflict | null;
};

/** The stored note's version now; `null` when it was deleted. */
export type Conflict = { currentVersion: number | null };

function baseOf(note: Note | null): Base {
  return note
    ? { version: note.version, body: note.body, updatedAt: note.updatedAt }
    : { version: null, body: "", updatedAt: null };
}

export function startDraft(note: Note | null): NoteDraft {
  const base = baseOf(note);
  return { base, text: base.body, saving: false, error: null, conflict: null };
}

export type DraftEvent =
  | { type: "edited"; text: string }
  | { type: "saveStarted" }
  /** The server's answer: the saved note, or `null` when an empty save deleted it. */
  | { type: "saved"; note: Note | null }
  | { type: "saveFailed"; message: string; conflict?: Conflict }
  /** The stored note as fetched (on opening, or again when the tab regains focus). */
  | { type: "fetched"; note: Note | null }
  /** "Load the newer version" (or "Discard mine" when it was deleted). */
  | { type: "loadNewer"; note: Note | null };

export function noteDraft(state: NoteDraft, event: DraftEvent): NoteDraft {
  switch (event.type) {
    case "edited":
      return { ...state, text: event.text };
    case "saveStarted":
      return { ...state, saving: true, error: null };
    case "saved":
      return {
        ...state,
        base: baseOf(event.note),
        saving: false,
        conflict: null,
      };
    case "saveFailed":
      return event.conflict
        ? { ...state, saving: false, conflict: event.conflict }
        : { ...state, saving: false, error: event.message };
    case "fetched": {
      const version = event.note?.version ?? null;
      // A save from here is on its way; its answer decides what the text is based on.
      if (state.saving || version === state.base.version) return state;
      // Nothing here would be lost.
      if (!isDirty(state) || (event.note?.body ?? "") === state.text) {
        return adopt(state, event.note);
      }
      return {
        ...state,
        conflict: { currentVersion: version },
      };
    }
    case "loadNewer":
      return adopt(state, event.note);
  }
}

/** Starts again from `note`: its text replaces the text here. */
function adopt(state: NoteDraft, note: Note | null): NoteDraft {
  return { ...startDraft(note), saving: state.saving };
}

/** Whether the text differs from the saved note. Spaces alone in a new note don't count. */
export function isDirty({ base, text }: NoteDraft): boolean {
  if (base.version === null) return text.trim() !== "";
  return text !== base.body;
}

/**
 * The `baseVersion` a save sends: the version the text started from or, after a conflict,
 * the newer one ("Keep mine and overwrite").
 */
export function baseVersionToSend(state: NoteDraft): number | null {
  return state.conflict ? state.conflict.currentVersion : state.base.version;
}

export type DraftStatus = "empty" | "unsaved" | "saving" | "failed" | "saved";

export function draftStatus(state: NoteDraft): DraftStatus {
  if (state.saving) return "saving";
  if (state.error !== null) return "failed";
  if (isDirty(state)) return "unsaved";
  return state.base.version === null ? "empty" : "saved";
}
