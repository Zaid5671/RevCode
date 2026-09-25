import { screen, within } from "@testing-library/react";
import { useMemo, useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/client/queries";
import { ProblemTable } from "./ProblemTable";
import { TODAY, entry, problem, renderWithClient, stubApi } from "./testUtils";

// ProblemTable keeps its filters in the URL with history.replaceState, which Next.js
// turns into new useSearchParams values. This stand-in does the same from window.location.
const urlListeners = vi.hoisted(() => new Set<() => void>());
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
}));

const CATALOG = {
  categories: [
    { id: 1, name: "Arrays & Hashing", position: 1 },
    { id: 2, name: "Two Pointers", position: 2 },
  ],
  problems: [
    problem({ id: 1, title: "Two Sum", categoryId: 1, position: 1 }),
    problem({ id: 2, title: "Group Anagrams", categoryId: 1, position: 2 }),
    problem({ id: 3, title: "Valid Palindrome", categoryId: 2, position: 1 }),
  ],
};
// Two Sum: R1 overdue. Valid Palindrome: solved, R1 later.
const PROGRESS = [
  entry(1, { solvedOn: "2026-09-18" }),
  entry(3, { solvedOn: "2026-09-22", confidence: 3 }),
];

beforeEach(() => {
  window.history.replaceState(null, "", "/problems");
  localStorage.clear();
  const replaceState = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
    replaceState(...args);
    urlListeners.forEach((listener) => listener());
  });
  stubApi(() => undefined);
});

function setUp() {
  return renderWithClient(<ProblemTable />, {
    progress: PROGRESS,
    seed: (client) => {
      client.setQueryData(queryKeys.catalog, CATALOG);
      client.setQueryData(queryKeys.notesIndex, []);
    },
  });
}

const folder = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("CategoryGroup", () => {
  it("shows each folder's solved count and due count, all closed at first", async () => {
    setUp();
    const arrays = await screen.findByRole("button", {
      name: /^Arrays & Hashing/,
    });
    expect(arrays).toHaveAttribute("aria-expanded", "false");
    expect(arrays).toHaveTextContent("1 / 2");
    expect(arrays).toHaveTextContent("1 due");
    expect(folder("Two Pointers")).toHaveTextContent("1 / 1");
    expect(folder("Two Pointers")).not.toHaveTextContent("due");
    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
  });

  it("opens and closes a folder from its header", async () => {
    const { user } = setUp();
    await user.click(
      await screen.findByRole("button", { name: /^Two Pointers/ }),
    );
    expect(folder("Two Pointers")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Valid Palindrome")).toBeInTheDocument();

    await user.click(folder("Two Pointers"));
    expect(screen.queryByText("Valid Palindrome")).not.toBeInTheDocument();
  });

  it("opens only the folders with matches while searching, and restores them after", async () => {
    const { user } = setUp();
    await user.click(
      await screen.findByRole("button", { name: /^Two Pointers/ }),
    );

    await user.type(screen.getByRole("searchbox"), "anagram");

    expect(folder("Arrays & Hashing")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Group Anagrams")).toBeInTheDocument();
    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Two Pointers/ }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));

    expect(folder("Arrays & Hashing")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(folder("Two Pointers")).toHaveAttribute("aria-expanded", "true");
  });

  it("opens the Solve dialog from an unsolved problem's checkbox", async () => {
    const { user } = setUp();
    await user.click(
      await screen.findByRole("button", { name: /^Arrays & Hashing/ }),
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Solved: Group Anagrams" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Group Anagrams — how did it go?",
    });
    expect(within(dialog).getByLabelText("Solved on")).toHaveValue(TODAY);
    expect(
      screen.getByRole("checkbox", { name: "Solved: Group Anagrams" }),
    ).not.toBeChecked();
  });
});
