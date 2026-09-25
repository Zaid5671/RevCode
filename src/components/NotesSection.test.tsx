import { screen, within } from "@testing-library/react";
import { useMemo, useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/client/queries";
import type { Note, NoteSummary } from "@/domain/schemas";
import { NotesSection } from "./NotesSection";
import {
  apiError,
  entry,
  problem,
  renderWithClient,
  stubApi,
  type ApiCall,
} from "./testUtils";

// NotesSection keeps its search in the URL with history.replaceState, which Next.js turns
// into new useSearchParams values. This stand-in does the same from window.location.
const urlListeners = vi.hoisted(() => new Set<() => void>());
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (listener) => {
        urlListeners.add(listener);
        return () => urlListeners.delete(listener);
      },
      () => window.location.search,
    );
    return useMemo(() => new URLSearchParams(search), [search]);
  },
  useRouter: () => ({ push }),
}));

const CATALOG = {
  categories: [
    { id: 1, name: "Arrays & Hashing", position: 1 },
    { id: 2, name: "Two Pointers", position: 2 },
    { id: 3, name: "Stack", position: 3 },
  ],
  problems: [
    problem({ id: 1, title: "Contains Duplicate", categoryId: 1, position: 1 }),
    problem({ id: 2, title: "Two Sum", categoryId: 1, position: 2 }),
    problem({ id: 3, title: "Valid Palindrome", categoryId: 2, position: 1 }),
    problem({ id: 4, title: "3Sum", categoryId: 2, position: 2 }),
    problem({ id: 5, title: "Min Stack", categoryId: 3, position: 1 }),
  ],
};

const AT = "2026-09-20T10:00:00.000Z";
const note = (problemId: number, body: string): Note => ({
  problemId,
  body,
  version: 1,
  updatedAt: AT,
});
// Notes only in Two Pointers, so `/notes` has to skip Arrays & Hashing.
const NOTES = [
  note(3, "Two pointers from **both ends**."),
  note(4, "Sort, then a hash-free sweep."),
];
const INDEX: NoteSummary[] = NOTES.map(({ problemId }) => ({
  problemId,
  updatedAt: AT,
}));

let calls: ApiCall[];
beforeEach(() => {
  window.history.replaceState(null, "", "/notes");
  const replaceState = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
    replaceState(...args);
    urlListeners.forEach((listener) => listener());
  });
  push.mockClear();
  calls = stubApi(({ path }) => {
    if (path === "/api/categories/2/notes") return { body: NOTES };
    if (/^\/api\/categories\/\d+\/notes$/.test(path)) return { body: [] };
    if (path === "/api/notes/search?q=hash")
      return {
        body: [
          {
            problemId: 4,
            snippet: "Sort, then a hash-free sweep.",
            updatedAt: AT,
          },
        ],
      };
    if (path.startsWith("/api/notes/search")) return { body: [] };
    if (path === "/api/notes/3") return { body: NOTES[0] };
    return undefined;
  });
});

function setUp(categoryParam: string | null, index: NoteSummary[] = INDEX) {
  return renderWithClient(<NotesSection categoryParam={categoryParam} />, {
    progress: [entry(3, { solvedOn: "2026-09-10", confidence: 3 })],
    seed: (client) => {
      client.setQueryData(queryKeys.catalog, CATALOG);
      client.setQueryData(queryKeys.notesIndex, index);
    },
  });
}

describe("NotesSection", () => {
  it("opens the first category with notes on /notes, with its notes rendered", async () => {
    setUp(null);
    expect(
      await screen.findByRole("heading", { name: "Two Pointers" }),
    ).toBeInTheDocument();
    expect(screen.getByText("both ends").tagName).toBe("STRONG");
    expect(screen.getByText("2 of 2 problems have notes")).toBeInTheDocument();
    // Solved problems show their confidence.
    expect(screen.getByText("Conf 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download .md" })).toHaveAttribute(
      "href",
      "/api/notes/export?categoryId=2",
    );
  });

  it("lists the categories with their counts, the current one marked", async () => {
    setUp("2");
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const current = within(nav).getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("Two Pointers");
    expect(current).toHaveTextContent("2");
    expect(within(nav).getByRole("link", { name: "Stack" })).toHaveAttribute(
      "href",
      "/notes/3",
    );
    expect(
      within(nav).getByRole("link", { name: "Download all notes (.md)" }),
    ).toHaveAttribute("href", "/api/notes/export");
    await screen.findByRole("heading", { name: "Two Pointers" });
  });

  it("says so when a category has no notes", async () => {
    setUp("1");
    expect(await screen.findByText(/No notes here yet/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Download .md" }),
    ).not.toBeInTheDocument();
  });

  it("shows problems without notes, with + Add note, when the switch is on", async () => {
    const { user } = setUp("1");
    await screen.findByText(/No notes here yet/);
    await user.click(
      screen.getByRole("switch", { name: "Show problems without notes" }),
    );
    expect(
      screen.getByRole("button", { name: "Add a note for Two Sum" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a note for Contains Duplicate" }),
    ).toBeInTheDocument();
  });

  it("explains how to start when there are no notes at all", async () => {
    setUp(null, []);
    expect(
      await screen.findByText(/haven't written any notes yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Download all notes (.md)" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Download all notes (.md)")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("shows a message for an unknown category", async () => {
    setUp("99");
    expect(
      await screen.findByText(/There's no such category/),
    ).toBeInTheDocument();
  });

  it("searches note text and problem names, then clears back to the category", async () => {
    const { user } = setUp("2");
    await screen.findByRole("heading", { name: "Two Pointers" });

    await user.type(screen.getByRole("searchbox"), "hash");
    expect(await screen.findByText(/note matches/)).toHaveTextContent(
      "1 note matches “hash”",
    );
    expect(window.location.search).toBe("?q=hash");
    expect(screen.getByText("hash").tagName).toBe("MARK");

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "palin");
    // Only the name matches, so the result says why it's listed.
    expect(await screen.findByText("name match")).toBeInTheDocument();
    expect(screen.getByText("Palin").tagName).toBe("MARK");

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(
      await screen.findByRole("heading", { name: "Two Pointers" }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("keeps a search from the URL", async () => {
    window.history.replaceState(null, "", "/notes/2?q=hash");
    setUp("2");
    expect(screen.getByRole("searchbox")).toHaveValue("hash");
    expect(await screen.findByText(/note matches/)).toBeInTheDocument();
  });

  it("opens the Note panel from Edit", async () => {
    const { user } = setUp("2");
    await user.click(
      await screen.findByRole("button", {
        name: "Edit note for Valid Palindrome",
      }),
    );
    const panel = await screen.findByRole("dialog");
    expect(
      within(panel).getByRole("heading", { name: /Valid Palindrome/ }),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Two Pointers")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/api/notes/3")).toBe(true);
  });

  it("shows an error with Try again when the category's notes can't load", async () => {
    // A 4xx, which the query client doesn't retry, so the error shows at once.
    stubApi(() => apiError(403, "FORBIDDEN", "Not allowed."));
    const { user } = setUp("2");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load the notes for Two Pointers.",
    );
    stubApi(({ path }) =>
      path === "/api/categories/2/notes" ? { body: NOTES } : undefined,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText("2 of 2 problems have notes"),
    ).toBeInTheDocument();
  });
});
