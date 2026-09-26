import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/client/queries";
import type {
  DashboardItem,
  DashboardResponse,
  ProgressEntry,
} from "@/domain/schemas";
import { Dashboard } from "./Dashboard";
import {
  TODAY,
  apiError,
  entry,
  problem,
  renderWithClient,
  stubApi,
  type ApiCall,
} from "./testUtils";

const CATALOG = {
  categories: [
    { id: 1, name: "Arrays & Hashing", position: 1 },
    { id: 2, name: "Sliding Window", position: 2 },
  ],
  problems: [
    problem({ id: 1, title: "Two Sum", categoryId: 1, position: 1 }),
    problem({
      id: 2,
      title: "Group Anagrams",
      categoryId: 1,
      position: 2,
      difficulty: "MEDIUM",
    }),
    problem({ id: 3, title: "Majority Element", categoryId: 1, position: 3 }),
    problem({
      id: 4,
      title: "Permutation in String",
      categoryId: 2,
      position: 1,
      difficulty: "MEDIUM",
    }),
  ],
};

const item = (
  problemId: number,
  revision: 1 | 2 | 3,
  dueDate: string,
  extra: Partial<DashboardItem> = {},
): DashboardItem => ({
  problemId,
  revision,
  dueDate,
  hasNote: false,
  ...extra,
});

const STATS = {
  solved: { total: 86, easy: 40, medium: 36, hard: 10 },
  completedCycles: 21,
  notes: 3,
};

function dashboard(lists: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    today: TODAY,
    overdue: [],
    dueToday: [],
    dueTomorrow: [],
    next7Days: [],
    stats: STATS,
    ...lists,
  };
}

const SAMPLE = dashboard({
  overdue: [item(4, 1, "2026-09-20", { daysOverdue: 3 })],
  dueToday: [item(3, 1, TODAY, { hasNote: true })],
  dueTomorrow: [item(2, 1, "2026-09-24")],
  next7Days: [item(1, 2, "2026-09-25")],
});

function setUp(
  reply: (call: ApiCall) => ReturnType<Parameters<typeof stubApi>[0]>,
  { progress }: { progress?: ProgressEntry[] } = {},
) {
  const calls = stubApi(reply);
  const rendered = renderWithClient(<Dashboard />, {
    progress,
    seed: (client) => client.setQueryData(queryKeys.catalog, CATALOG),
  });
  return { calls, ...rendered };
}

const solved = (...ids: number[]) =>
  ids.map((id) => entry(id, { solvedOn: "2026-09-10" }));
const stat = (label: string | RegExp) =>
  screen.getByText(label, { selector: "dt" }).parentElement!;

const card = (name: string) =>
  screen.getByRole("region", { name: new RegExp(`^${name}`) });

/** The loading state has the same cards, so wait for a reminder first. */
async function loadedCard(name: string) {
  await screen.findByText("Permutation in String");
  return card(name);
}

describe("Dashboard", () => {
  it("shows the user's today and the stats strip", async () => {
    setUp(() => ({ body: SAMPLE }));

    expect(await screen.findByText("Wed 23 Sep 2026")).toBeInTheDocument();
    // 86 of this 4-problem test catalog; the percentage itself is tested in dashboardView.
    expect(stat(/^Solved · \d+%$/)).toHaveTextContent("86 / 4");
    expect(stat("Overdue")).toHaveTextContent("1");
    expect(stat("Due today")).toHaveTextContent("1");
    // Next 7 days includes tomorrow.
    expect(stat("Next 7 days")).toHaveTextContent("2");
    expect(stat("Complete")).toHaveTextContent("21");
  });

  it("dims a zero in the stats strip and colours a count above zero", async () => {
    setUp(() => ({
      body: dashboard({ dueTomorrow: [item(2, 1, "2026-09-24")] }),
    }));

    await screen.findByText(/Next up/);
    const number = (label: string) => stat(label).querySelector("dd");
    expect(number("Overdue")).toHaveClass("text-ink-faint");
    expect(number("Due today")).toHaveClass("text-ink-faint");
    expect(number("Next 7 days")).toHaveClass("text-blue");
    expect(number("Complete")).toHaveClass("text-green");
  });

  it("lists overdue and due-today revisions in Revise now, each with its status", async () => {
    setUp(() => ({ body: SAMPLE }));

    const reviseNow = await loadedCard("Revise now");
    const rows = within(reviseNow).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Permutation in String");
    expect(rows[0]).toHaveTextContent("Sliding Window");
    expect(rows[0]).toHaveTextContent("R1");
    expect(rows[0]).toHaveTextContent("3d late");
    expect(rows[1]).toHaveTextContent("Majority Element");
    expect(rows[1]).toHaveTextContent("Today");
    expect(
      within(rows[1]!).getByRole("button", {
        name: "Open note for Majority Element",
      }),
    ).toBeInTheDocument();
    expect(
      within(rows[0]!).getByRole("link", { name: "Permutation in String" }),
    ).toHaveAttribute("target", "_blank");
  });

  it("groups Coming up under date headings, without a status on each row", async () => {
    setUp(() => ({ body: SAMPLE }));

    const comingUp = await loadedCard("Coming up");
    const tomorrow = within(comingUp).getByRole("region", { name: "Tomorrow" });
    expect(tomorrow).toHaveTextContent("Group Anagrams");
    expect(within(tomorrow).getByRole("listitem")).not.toHaveTextContent(
      "Tomorrow",
    );
    // Later dates say how far away they are.
    const friday = within(comingUp).getByRole("region", {
      name: "Fri 25 Sep · in 2 days",
    });
    expect(friday).toHaveTextContent("Two Sum");
    expect(friday).toHaveTextContent("R2");
  });

  it("keeps Coming up's ✓ Done quiet, and Revise now's bordered", async () => {
    setUp(() => ({ body: SAMPLE }));

    await loadedCard("Revise now");
    expect(
      screen.getByRole("button", { name: "Mark R1 done: Group Anagrams" }),
    ).toHaveClass("border-transparent");
    expect(
      screen.getByRole("button", {
        name: "Mark R1 done: Permutation in String",
      }),
    ).toHaveClass("border-line-strong");
  });

  it("says so when a list is empty", async () => {
    setUp(() => ({ body: dashboard() }));

    expect(
      await screen.findByText("Nothing to revise today — nice."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nothing scheduled this week."),
    ).toBeInTheDocument();
  });

  it("points an empty Revise now at the next revision coming up", async () => {
    setUp(() => ({
      body: dashboard({ dueTomorrow: [item(2, 1, "2026-09-24")] }),
    }));
    // The loading state has the same cards, so wait for the loaded text first.
    await screen.findByText(/Next up/);
    const reviseNow = card("Revise now");

    expect(reviseNow).toHaveTextContent(
      "Nothing to revise today — nice. Next up tomorrow: Group Anagrams.",
    );
    expect(
      within(reviseNow).getByRole("link", { name: "Group Anagrams" }),
    ).toHaveAttribute("target", "_blank");
  });

  it("names the date when the next revision is later than tomorrow", async () => {
    setUp(() => ({
      body: dashboard({ next7Days: [item(1, 2, "2026-09-25")] }),
    }));

    expect(await screen.findByText(/Next up/)).toHaveTextContent(
      "Next up on Fri 25 Sep: Two Sum.",
    );
  });

  it("shows the next unsolved problem in NeetCode order", async () => {
    setUp(() => ({ body: SAMPLE }), { progress: solved(1, 3) });

    const line = await screen.findByRole("region", { name: "Next to solve" });
    expect(line).toHaveTextContent("Group Anagrams");
    expect(line).toHaveTextContent("Medium");
    expect(line).toHaveTextContent("Arrays & Hashing");
    expect(
      within(line).getByRole("link", { name: "Group Anagrams" }),
    ).toHaveAttribute("target", "_blank");
    expect(
      within(line).getByRole("link", { name: /Open in Problems/ }),
    ).toHaveAttribute("href", "/problems?q=Group+Anagrams");
  });

  it("shows a new user the first problem to solve", async () => {
    setUp(
      () => ({
        body: dashboard({
          stats: {
            ...STATS,
            solved: { total: 0, easy: 0, medium: 0, hard: 0 },
            completedCycles: 0,
          },
        }),
      }),
      { progress: [] },
    );

    const line = await screen.findByRole("region", { name: "Next to solve" });
    expect(line).toHaveTextContent("Two Sum");
  });

  it("leaves out Next to solve once every problem is solved", async () => {
    setUp(() => ({ body: SAMPLE }), { progress: solved(1, 2, 3, 4) });

    await loadedCard("Revise now");
    expect(
      screen.queryByRole("region", { name: "Next to solve" }),
    ).not.toBeInTheDocument();
  });

  it("leaves out Next to solve when progress fails to load, and still shows the lists", async () => {
    setUp((call) =>
      call.path === "/api/progress"
        ? apiError(404, "NOT_FOUND", "Not found.")
        : { body: SAMPLE },
    );

    await loadedCard("Revise now");
    await waitFor(() =>
      expect(
        screen.queryByTestId("next-to-solve-placeholder"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("region", { name: "Next to solve" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });

  it("points a new user to the Problems page instead of the lists", async () => {
    setUp(() => ({
      body: dashboard({
        stats: {
          ...STATS,
          solved: { total: 0, easy: 0, medium: 0, hard: 0 },
          completedCycles: 0,
        },
      }),
    }));

    expect(
      await screen.findByRole("link", { name: "Problems" }),
    ).toHaveAttribute("href", "/problems");
    expect(
      screen.queryByRole("region", { name: /^Revise now/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a load failure with a way to try again", async () => {
    let fail = true;
    const { user } = setUp(() =>
      fail ? apiError(404, "NOT_FOUND", "Not found.") : { body: SAMPLE },
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your reminders.");
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("Permutation in String"),
    ).toBeInTheDocument();
  });

  it("marks a revision done from the popover, and the reminder leaves the list", async () => {
    let done = false;
    const { calls, user } = setUp((call) => {
      if (call.method === "PUT") {
        done = true;
        return {
          body: entry(4, {
            solvedOn: "2026-09-19",
            confidence: 1,
            completed: [TODAY, null, null],
          }),
        };
      }
      if (call.path === "/api/dashboard") {
        return { body: done ? dashboard({ ...SAMPLE, overdue: [] }) : SAMPLE };
      }
      return undefined;
    });

    await user.click(
      await screen.findByRole("button", {
        name: "Mark R1 done: Permutation in String",
      }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Done on")).toHaveValue(TODAY);
    await user.click(within(dialog).getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(
        screen.queryByText("Permutation in String"),
      ).not.toBeInTheDocument(),
    );
    expect(calls).toContainEqual({
      method: "PUT",
      path: "/api/progress/4/revisions/1",
      body: { completedOn: TODAY },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card("Revise now")).toHaveTextContent("Majority Element");
  });

  it("opens a reminder's note in the Note panel", async () => {
    const { user } = setUp((call) =>
      call.path === "/api/notes/3"
        ? {
            body: {
              problemId: 3,
              body: "Boyer-Moore voting",
              version: 1,
              updatedAt: "2026-09-20T10:00:00.000Z",
            },
          }
        : { body: SAMPLE },
    );
    const reviseNow = await loadedCard("Revise now");

    await user.click(
      within(reviseNow).getByRole("button", {
        name: "Open note for Majority Element",
      }),
    );

    const panel = screen.getByRole("dialog", { name: "Majority Element" });
    expect(
      await within(panel).findByRole("textbox", {
        name: "Note for Majority Element",
      }),
    ).toHaveValue("Boyer-Moore voting");
  });
});
