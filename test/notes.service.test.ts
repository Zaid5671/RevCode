import { describe, expect, it } from "vitest";
import {
  deleteNote,
  getNote,
  listCategoryNotes,
  listNotes,
  saveNote,
  searchNotes,
} from "@/server/modules/notes/notes.service";
import {
  markSolved,
  unmarkSolved,
} from "@/server/modules/progress/progress.service";
import { createUser } from "./helpers/users";

const TIMESTAMP = expect.stringMatching(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
);

// Catalog: category 1 (Arrays & Hashing) holds problems 1–22, category 2 (Two Pointers)
// holds 23–35.

describe("saving notes", () => {
  it("creates a note at version 1", async () => {
    const user = await createUser();

    const note = await saveNote(user.id, 1, {
      body: "## Approach\nHash map",
      baseVersion: null,
    });

    expect(note).toEqual({
      problemId: 1,
      body: "## Approach\nHash map",
      version: 1,
      updatedAt: TIMESTAMP,
    });
    expect(await getNote(user.id, 1)).toEqual(note);
  });

  it("updates a note and increments its version each time", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "first", baseVersion: null });

    const second = await saveNote(user.id, 1, {
      body: "second",
      baseVersion: 1,
    });
    const third = await saveNote(user.id, 1, { body: "third", baseVersion: 2 });

    expect(second).toMatchObject({ body: "second", version: 2 });
    expect(third).toMatchObject({ body: "third", version: 3 });
    expect(await getNote(user.id, 1)).toMatchObject({
      body: "third",
      version: 3,
    });
  });

  it("stores the body exactly as sent, whitespace included", async () => {
    const user = await createUser();
    const body = "    indented code\n\n";

    await saveNote(user.id, 1, { body, baseVersion: null });

    expect((await getNote(user.id, 1)).body).toBe(body);
  });

  it("deletes the note when the body is empty or only whitespace", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "keep?", baseVersion: null });
    await saveNote(user.id, 2, { body: "keep?", baseVersion: null });

    expect(await saveNote(user.id, 1, { body: "", baseVersion: 1 })).toBe(
      undefined,
    );
    expect(await saveNote(user.id, 2, { body: " \n\t ", baseVersion: 1 })).toBe(
      undefined,
    );
    expect(await listNotes(user.id)).toEqual([]);
  });

  it("accepts an empty body when there is no note to delete", async () => {
    const user = await createUser();

    // Never saved, or already deleted in another tab: either way the result is "no note".
    expect(await saveNote(user.id, 1, { body: "", baseVersion: null })).toBe(
      undefined,
    );
    expect(await saveNote(user.id, 2, { body: "", baseVersion: 4 })).toBe(
      undefined,
    );
    expect(await listNotes(user.id)).toEqual([]);
  });

  it("allows notes on unsolved problems and keeps them when a problem is unmarked", async () => {
    const user = await createUser();
    await markSolved(user, 1, { solvedOn: "2026-09-20", confidence: 2 });
    await saveNote(user.id, 1, { body: "solved once", baseVersion: null });
    await saveNote(user.id, 2, { body: "not solved yet", baseVersion: null });

    await unmarkSolved(user, 1);

    expect(await getNote(user.id, 1)).toMatchObject({ body: "solved once" });
    expect(await getNote(user.id, 2)).toMatchObject({ body: "not solved yet" });
  });
});

describe("deleteNote", () => {
  it("deletes the note, and succeeds when there is none", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "x", baseVersion: null });

    await deleteNote(user.id, 1);
    await deleteNote(user.id, 1);

    await expect(getNote(user.id, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("reading notes", () => {
  it("getNote is 404 when the problem has no note", async () => {
    const user = await createUser();
    await expect(getNote(user.id, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists note summaries in catalog order", async () => {
    const user = await createUser();
    await saveNote(user.id, 23, { body: "b", baseVersion: null });
    await saveNote(user.id, 1, { body: "a", baseVersion: null });

    expect(await listNotes(user.id)).toEqual([
      { problemId: 1, updatedAt: TIMESTAMP },
      { problemId: 23, updatedAt: TIMESTAMP },
    ]);
  });

  it("lists one category's notes in catalog order", async () => {
    const user = await createUser();
    await saveNote(user.id, 3, { body: "three", baseVersion: null });
    await saveNote(user.id, 23, { body: "other category", baseVersion: null });
    await saveNote(user.id, 1, { body: "one", baseVersion: null });

    expect(await listCategoryNotes(user.id, 1)).toEqual([
      { problemId: 1, body: "one", version: 1, updatedAt: TIMESTAMP },
      { problemId: 3, body: "three", version: 1, updatedAt: TIMESTAMP },
    ]);
    expect(await listCategoryNotes(user.id, 3)).toEqual([]);
  });

  it("a category listing is 404 for an unknown category", async () => {
    const user = await createUser();
    await expect(listCategoryNotes(user.id, 999)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("searchNotes", () => {
  it("finds notes ignoring case, in catalog order, with a snippet", async () => {
    const user = await createUser();
    await saveNote(user.id, 23, {
      body: "Two pointers from both ENDS",
      baseVersion: null,
    });
    await saveNote(user.id, 1, {
      body: "Hash map;\nends early",
      baseVersion: null,
    });
    await saveNote(user.id, 2, { body: "nothing here", baseVersion: null });

    expect(await searchNotes(user.id, "ends")).toEqual([
      { problemId: 1, snippet: "Hash map; ends early", updatedAt: TIMESTAMP },
      {
        problemId: 23,
        snippet: "Two pointers from both ENDS",
        updatedAt: TIMESTAMP,
      },
    ]);
    expect(await searchNotes(user.id, "absent")).toEqual([]);
  });

  it("treats %, _ and \\ in the query as plain characters", async () => {
    const user = await createUser();
    const notes: [number, string][] = [
      [1, "50% faster"],
      [2, "5000 faster"],
      [3, "a_b"],
      [4, "axb"],
      [5, "C:\\temp"],
      [6, "C:temp"],
    ];
    for (const [problemId, body] of notes) {
      await saveNote(user.id, problemId, { body, baseVersion: null });
    }

    const ids = async (q: string) =>
      (await searchNotes(user.id, q)).map((result) => result.problemId);
    expect(await ids("50%")).toEqual([1]);
    expect(await ids("a_b")).toEqual([3]);
    expect(await ids("C:\\temp")).toEqual([5]);
  });
});

describe("isolation", () => {
  it("another user can't read, find, change or delete a user's note", async () => {
    const owner = await createUser();
    const other = await createUser();
    await saveNote(owner.id, 1, { body: "owner's secret", baseVersion: null });

    await expect(getNote(other.id, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await listNotes(other.id)).toEqual([]);
    expect(await listCategoryNotes(other.id, 1)).toEqual([]);
    expect(await searchNotes(other.id, "secret")).toEqual([]);

    // The other user's save creates their own note; it doesn't touch the owner's.
    expect(
      await saveNote(other.id, 1, { body: "mine", baseVersion: null }),
    ).toMatchObject({ body: "mine", version: 1 });
    await deleteNote(other.id, 1);

    expect(await getNote(owner.id, 1)).toMatchObject({
      body: "owner's secret",
      version: 1,
    });
  });
});

// The editor's "Keep mine and overwrite" resends with the stored version, so a conflict
// reports it: `currentVersion` is `null` when the note was deleted elsewhere.
describe("note conflicts", () => {
  it("refuses a save from a stale version and keeps the newer text", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "v1", baseVersion: null });
    await saveNote(user.id, 1, { body: "v2 from another tab", baseVersion: 1 });

    await expect(
      saveNote(user.id, 1, { body: "stale edit", baseVersion: 1 }),
    ).rejects.toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: 2 },
    });
    expect(await getNote(user.id, 1)).toMatchObject({
      body: "v2 from another tab",
      version: 2,
    });
  });

  it("refuses to create a note when another tab already created one", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "from tab A", baseVersion: null });

    await expect(
      saveNote(user.id, 1, { body: "from tab B", baseVersion: null }),
    ).rejects.toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: 1 },
    });
    expect((await getNote(user.id, 1)).body).toBe("from tab A");
  });

  it("refuses to update a note that was deleted elsewhere", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "v1", baseVersion: null });
    await deleteNote(user.id, 1);

    await expect(
      saveNote(user.id, 1, { body: "edit", baseVersion: 1 }),
    ).rejects.toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: null },
    });
    expect(await listNotes(user.id)).toEqual([]);
  });

  it("refuses to delete (empty body) a note that changed since it was loaded", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "v1", baseVersion: null });
    await saveNote(user.id, 1, { body: "v2 from another tab", baseVersion: 1 });

    await expect(
      saveNote(user.id, 1, { body: "  ", baseVersion: 1 }),
    ).rejects.toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: 2 },
    });
    expect((await getNote(user.id, 1)).body).toBe("v2 from another tab");
  });

  it("a blank save from a tab that loaded no note leaves another tab's new note alone", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "from tab A", baseVersion: null });

    expect(await saveNote(user.id, 1, { body: "", baseVersion: null })).toBe(
      undefined,
    );
    expect((await getNote(user.id, 1)).body).toBe("from tab A");
  });

  it("two tabs creating the same note at once: one saves, the other gets a conflict", async () => {
    const user = await createUser();

    const results = await Promise.allSettled([
      saveNote(user.id, 1, { body: "tab A", baseVersion: null }),
      saveNote(user.id, 1, { body: "tab B", baseVersion: null }),
    ]);

    const saved = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected");
    expect(saved).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: 1 },
    });
  });

  it("two tabs updating from the same version at once: one saves, the other gets a conflict", async () => {
    const user = await createUser();
    await saveNote(user.id, 1, { body: "v1", baseVersion: null });

    const results = await Promise.allSettled([
      saveNote(user.id, 1, { body: "tab A", baseVersion: 1 }),
      saveNote(user.id, 1, { body: "tab B", baseVersion: 1 }),
    ]);

    const saved = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected");
    expect(saved).toHaveLength(1);
    expect(refused[0]?.reason).toMatchObject({
      code: "NOTE_CONFLICT",
      details: { currentVersion: 2 },
    });
    expect((await getNote(user.id, 1)).version).toBe(2);
  });
});
