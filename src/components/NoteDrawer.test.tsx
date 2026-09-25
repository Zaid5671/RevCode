import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "@/domain/schemas";
import { NoteDrawer } from "./NoteDrawer";
import {
  apiError,
  problem,
  renderWithClient,
  stubApi,
  type ApiCall,
} from "./testUtils";

const NOTE_PATH = "/api/notes/1";

function note(version: number, body: string): Note {
  return {
    problemId: 1,
    body,
    version,
    updatedAt: "2026-09-20T10:42:00.000Z",
  };
}

/**
 * `stored` answers GET /api/notes/1 (null → 404); `onPut` answers each save. Other
 * requests (the refetches after a save) get a 404, which nothing here reads.
 */
function setUp({
  stored = null,
  onPut = (call: ApiCall) => ({ body: saved(call, 1) }),
}: {
  stored?: Note | null | (() => Note | null) | "error";
  onPut?: (call: ApiCall) => ReturnType<Parameters<typeof stubApi>[0]>;
} = {}) {
  const calls = stubApi((call) => {
    if (call.path !== NOTE_PATH) return undefined;
    if (call.method === "PUT") return onPut(call);
    const current = typeof stored === "function" ? stored() : stored;
    if (current === "error") return "network-error";
    return current ? { body: current } : undefined;
  });
  const onClose = vi.fn();
  const rendered = renderWithClient(
    <NoteDrawer
      problem={problem()}
      categoryName="Arrays & Hashing"
      onClose={onClose}
    />,
  );
  return { calls, onClose, ...rendered };
}

/** What the server answers to a save: the body it was sent, as `version`. */
function saved(call: ApiCall, version: number) {
  const { body } = call.body as { body: string };
  return body.trim() === "" ? undefined : note(version, body);
}

const editor = () => screen.findByRole("textbox", { name: "Note for Two Sum" });
const saveButton = () => screen.getByRole("button", { name: "Save" });
const puts = (calls: ApiCall[]) => calls.filter((c) => c.method === "PUT");

describe("NoteDrawer", () => {
  it("shows the problem and its saved note", async () => {
    setUp({ stored: note(3, "## Approach") });
    expect(screen.getByRole("link", { name: /Two Sum/ })).toHaveAttribute(
      "href",
      "https://leetcode.com/problems/two-sum/",
    );
    expect(screen.getByText("Arrays & Hashing")).toBeInTheDocument();
    expect(await editor()).toHaveValue("## Approach");
    expect(screen.getByText(/^Saved/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("writes and saves a new note", async () => {
    const { calls, user } = setUp();
    const text = await editor();
    expect(screen.getByText("No note yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();

    await user.type(text, "Hash map");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(saveButton());

    expect(await screen.findByText(/^Saved/)).toBeInTheDocument();
    expect(puts(calls)).toEqual([
      {
        method: "PUT",
        path: NOTE_PATH,
        body: { body: "Hash map", baseVersion: null },
      },
    ]);
    expect(saveButton()).toBeDisabled();
  });

  it("saves with Ctrl+S, sending the version it loaded", async () => {
    const { calls, user } = setUp({
      stored: note(3, "old"),
      onPut: (call) => ({ body: saved(call, 4) }),
    });
    await user.type(await editor(), " and new");
    await user.keyboard("{Control>}s{/Control}");

    await waitFor(() =>
      expect(puts(calls)[0]?.body).toEqual({
        body: "old and new",
        baseVersion: 3,
      }),
    );
  });

  it("wraps the selection with a toolbar button", async () => {
    const { user } = setUp({ stored: note(1, "use a map") });
    const text = (await editor()) as HTMLTextAreaElement;
    text.setSelectionRange(6, 9);
    await user.click(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));
    expect(text).toHaveValue("use a **map**");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows the formatted note under Preview, without the toolbar", async () => {
    const { user } = setUp({ stored: note(1, "### Approach") });
    await editor();
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      screen.getByRole("heading", { level: 3, name: "Approach" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("toolbar", { name: "Formatting" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the text when a save fails", async () => {
    const { user } = setUp({ onPut: () => "network-error" });
    await user.type(await editor(), "Two pointers");
    await user.click(saveButton());

    expect(
      await screen.findByText("Couldn't save — your text is still here"),
    ).toBeInTheDocument();
    expect(await editor()).toHaveValue("Two pointers");
    expect(saveButton()).toBeEnabled();
  });

  it("offers both versions after a conflict, and keep mine overwrites the newer one", async () => {
    let stored = note(3, "old");
    const { calls, user } = setUp({
      stored: () => stored,
      onPut: (call) => {
        const { baseVersion } = call.body as { baseVersion: number };
        if (baseVersion !== stored.version) {
          return {
            status: 409,
            body: {
              error: {
                code: "NOTE_CONFLICT",
                message: "This note was changed in another tab or device.",
                details: { currentVersion: stored.version },
              },
            },
          };
        }
        return { body: saved(call, stored.version + 1) };
      },
    });
    await user.type(await editor(), " mine");
    stored = note(4, "theirs");
    await user.click(saveButton());

    expect(
      await screen.findByText(/Changed in another tab or device/),
    ).toBeInTheDocument();
    expect(await editor()).toHaveValue("old mine");
    expect(saveButton()).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Keep mine and overwrite" }),
    );
    expect(await screen.findByText(/^Saved/)).toBeInTheDocument();
    expect(puts(calls).at(-1)?.body).toEqual({
      body: "old mine",
      baseVersion: 4,
    });
    expect(
      screen.queryByText(/Changed in another tab/),
    ).not.toBeInTheDocument();
  });

  it("loads the newer version when asked, replacing the text here", async () => {
    let stored = note(3, "old");
    const { user } = setUp({
      stored: () => stored,
      onPut: () => ({
        status: 409,
        body: {
          error: {
            code: "NOTE_CONFLICT",
            message: "Changed.",
            details: { currentVersion: 4 },
          },
        },
      }),
    });
    await user.type(await editor(), " mine");
    stored = note(4, "theirs");
    await user.click(saveButton());

    await user.click(
      await screen.findByRole("button", { name: "Load the newer version" }),
    );
    await waitFor(async () => expect(await editor()).toHaveValue("theirs"));
    expect(screen.getByText(/^Saved/)).toBeInTheDocument();
  });

  it("asks before closing with unsaved changes", async () => {
    const { onClose, user } = setUp({ stored: note(1, "old") });
    await user.type(await editor(), "!");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.getByText("Discard your unsaved changes?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(await editor()).toHaveValue("old!");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes at once when everything is saved", async () => {
    const { onClose, user } = setUp({ stored: note(1, "old") });
    await editor();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("deletes after the confirmation, checking the version, then closes", async () => {
    const { calls, onClose, user } = setUp({
      stored: note(2, "old"),
      onPut: () => ({ status: 204 }),
    });
    await editor();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByText("Delete your note for Two Sum? This can't be undone."),
    ).toBeInTheDocument();
    expect(puts(calls)).toEqual([]);

    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(puts(calls)[0]?.body).toEqual({ body: "", baseVersion: 2 });
  });

  it("asks before saving empty text, which deletes the note", async () => {
    const { calls, user } = setUp({ stored: note(2, "old") });
    await user.clear(await editor());
    await user.click(saveButton());
    expect(
      screen.getByText("Delete your note for Two Sum? This can't be undone."),
    ).toBeInTheDocument();
    expect(puts(calls)).toEqual([]);
  });

  it("counts characters near the limit and refuses to save over it", async () => {
    setUp();
    const text = await editor();
    fireEvent.change(text, { target: { value: "a".repeat(18_000) } });
    expect(screen.getByText("18,000 / 20,000")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    fireEvent.change(text, { target: { value: "a".repeat(20_001) } });
    expect(screen.getByText(/20,001 \/ 20,000/)).toHaveClass("text-rose");
    expect(saveButton()).toBeDisabled();
  });

  it("stays locked when the note can't be loaded, and tries again", async () => {
    let stored: Note | null | "error" = "error";
    const { user } = setUp({ stored: () => stored as Note | null });
    expect(
      await screen.findByText(/Couldn't load this note/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Note for Two Sum" }),
    ).not.toBeInTheDocument();

    stored = note(1, "found");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await editor()).toHaveValue("found");
  });

  it("shows a refused save's message", async () => {
    const { user } = setUp({
      onPut: () =>
        apiError(400, "VALIDATION_ERROR", "Text can't contain a NUL character"),
    });
    await user.type(await editor(), "x");
    await user.click(saveButton());
    expect(
      await screen.findByText("Text can't contain a NUL character"),
    ).toBeInTheDocument();
  });
});
