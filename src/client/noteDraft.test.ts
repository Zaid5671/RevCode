import { describe, expect, it } from "vitest";
import type { Note } from "@/domain/schemas";
import {
  baseVersionToSend,
  draftStatus,
  noteDraft,
  startDraft,
  type NoteDraft,
} from "./noteDraft";

function note(version: number, body: string): Note {
  return {
    problemId: 1,
    body,
    version,
    updatedAt: `2026-09-23T10:0${version}:00.000Z`,
  };
}

describe("opening the panel", () => {
  it("starts from the saved note, or empty when there is none", () => {
    const saved = startDraft(note(2, "## Approach"));
    expect(saved.text).toBe("## Approach");
    expect(draftStatus(saved)).toBe("saved");

    const none = startDraft(null);
    expect(none.text).toBe("");
    expect(draftStatus(none)).toBe("empty");
  });
});

const typed = (state: NoteDraft, text: string) =>
  noteDraft(state, { type: "edited", text });

describe("typing", () => {
  it("makes the text unsaved until it matches the saved note again", () => {
    const start = startDraft(note(2, "abc"));
    const changed = typed(start, "abcd");
    expect(draftStatus(changed)).toBe("unsaved");
    expect(draftStatus(typed(changed, "abc"))).toBe("saved");
  });

  it("keeps text typed while a save is on its way as unsaved", () => {
    let state = typed(startDraft(null), "first");
    state = noteDraft(state, { type: "saveStarted" });
    expect(draftStatus(state)).toBe("saving");
    state = typed(state, "first and more");
    state = noteDraft(state, { type: "saved", note: note(1, "first") });
    expect(state.text).toBe("first and more");
    expect(state.base.version).toBe(1);
    expect(draftStatus(state)).toBe("unsaved");
  });

  it("keeps the text after a failed save, showing why until the next try", () => {
    let state = typed(startDraft(note(2, "abc")), "abcd");
    state = noteDraft(state, { type: "saveStarted" });
    state = noteDraft(state, { type: "saveFailed", message: "Offline." });
    expect(state.text).toBe("abcd");
    expect(draftStatus(state)).toBe("failed");
    expect(state.error).toBe("Offline.");
    expect(draftStatus(typed(state, "abcde"))).toBe("failed");
    state = noteDraft(state, { type: "saveStarted" });
    expect(state.error).toBeNull();
    expect(draftStatus(state)).toBe("saving");
  });

  it("turns a save refused for a newer version into a conflict, not a failure", () => {
    let state = typed(startDraft(note(2, "abc")), "mine");
    state = noteDraft(state, { type: "saveStarted" });
    state = noteDraft(state, {
      type: "saveFailed",
      message: "Changed elsewhere.",
      conflict: { currentVersion: 5 },
    });
    expect(state.conflict).toEqual({ currentVersion: 5 });
    expect(state.error).toBeNull();
    expect(state.text).toBe("mine");
    expect(draftStatus(state)).toBe("unsaved");
  });

  it("counts only spaces in a new note as nothing written", () => {
    const start = startDraft(null);
    expect(draftStatus(typed(start, "  \n"))).toBe("empty");
    expect(draftStatus(typed(start, "x"))).toBe("unsaved");
  });
});

const fetched = (state: NoteDraft, current: Note | null) =>
  noteDraft(state, { type: "fetched", note: current });

describe("the stored note changing elsewhere", () => {
  it("loads quietly when nothing here is unsaved", () => {
    const state = fetched(startDraft(note(2, "old")), note(3, "theirs"));
    expect(state.text).toBe("theirs");
    expect(state.base.version).toBe(3);
    expect(state.conflict).toBeNull();
    expect(draftStatus(state)).toBe("saved");
  });

  it("keeps unsaved text and shows a conflict", () => {
    const mine = typed(startDraft(note(2, "old")), "mine");
    const changed = fetched(mine, note(3, "theirs"));
    expect(changed.text).toBe("mine");
    expect(changed.base.version).toBe(2);
    expect(changed.conflict).toEqual({ currentVersion: 3 });

    const deleted = fetched(mine, null);
    expect(deleted.text).toBe("mine");
    expect(deleted.conflict).toEqual({ currentVersion: null });
  });

  it("ignores a fetch that finds the version the text started from", () => {
    const mine = typed(startDraft(note(2, "old")), "mine");
    expect(fetched(mine, note(2, "old"))).toEqual(mine);

    const newNote = typed(startDraft(null), "mine");
    expect(fetched(newNote, null)).toEqual(newNote);
  });

  it("waits while this panel's own save is on its way", () => {
    const saving = noteDraft(typed(startDraft(null), "mine"), {
      type: "saveStarted",
    });
    // Our own save landing in the cache before its answer reaches the panel.
    expect(fetched(saving, note(1, "mine"))).toEqual(saving);
  });

  it("loads quietly when the newer version has the same text as here", () => {
    // E.g. the header's Retry re-sent a failed save from this panel.
    let state = typed(startDraft(note(2, "old")), "mine");
    state = noteDraft(state, { type: "saveStarted" });
    state = noteDraft(state, { type: "saveFailed", message: "Offline." });
    state = fetched(state, note(3, "mine"));
    expect(state.base.version).toBe(3);
    expect(state.conflict).toBeNull();
    expect(state.error).toBeNull();
    expect(draftStatus(state)).toBe("saved");
  });
});

describe("settling a conflict", () => {
  const inConflict = () =>
    fetched(typed(startDraft(note(2, "old")), "mine"), note(3, "theirs"));

  it("keep mine: once the overwrite is saved, the conflict is over", () => {
    let state = noteDraft(inConflict(), { type: "saveStarted" });
    state = noteDraft(state, { type: "saved", note: note(4, "mine") });
    expect(state.conflict).toBeNull();
    expect(draftStatus(state)).toBe("saved");
  });

  it("keep mine sends the newer version, so the server accepts the overwrite", () => {
    expect(baseVersionToSend(typed(startDraft(note(2, "old")), "x"))).toBe(2);
    expect(baseVersionToSend(inConflict())).toBe(3);
    const deletedThere = fetched(typed(startDraft(note(2, "old")), "x"), null);
    expect(baseVersionToSend(deletedThere)).toBeNull();
  });

  it("load the newer version: its text replaces mine", () => {
    const state = noteDraft(inConflict(), {
      type: "loadNewer",
      note: note(3, "theirs"),
    });
    expect(state.text).toBe("theirs");
    expect(state.conflict).toBeNull();
    expect(draftStatus(state)).toBe("saved");

    const discarded = noteDraft(inConflict(), {
      type: "loadNewer",
      note: null,
    });
    expect(discarded.text).toBe("");
    expect(draftStatus(discarded)).toBe("empty");
  });
});
