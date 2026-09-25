// Helpers for component tests (the `components` Vitest project). Components talk to a
// stubbed `fetch` through the real API client, query client and save tracking.
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { queryKeys } from "@/client/queries";
import { makeQueryClient } from "@/client/queryClient";
import type { CalendarDate } from "@/domain/calendarDate";
import { DEFAULT_GAPS, type Confidence } from "@/domain/gaps";
import { computeSchedule } from "@/domain/schedule";
import type { Problem, ProgressEntry } from "@/domain/schemas";

/** Wed 23 Sep 2026: the server's today in these tests, deliberately not the machine's. */
export const TODAY = "2026-09-23";

export function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 1,
    title: "Two Sum",
    leetcodeSlug: "two-sum",
    leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    difficulty: "EASY",
    categoryId: 1,
    position: 4,
    isPremium: false,
    ...overrides,
  };
}

/** A progress entry as the server computes it, with the default gaps. */
export function entry(
  problemId: number,
  {
    solvedOn,
    confidence = 2,
    completed = [null, null, null],
  }: {
    solvedOn: CalendarDate;
    confidence?: Confidence;
    completed?: [CalendarDate | null, CalendarDate | null, CalendarDate | null];
  },
  today: CalendarDate = TODAY,
): ProgressEntry {
  return {
    problemId,
    solvedOn,
    confidence,
    ...computeSchedule(
      { solvedOn, confidence, completed },
      DEFAULT_GAPS,
      today,
    ),
  };
}

type Reply = { status?: number; body?: unknown } | "network-error";
export type ApiCall = { method: string; path: string; body: unknown };

/**
 * Replaces `fetch`. `reply` answers each request (undefined → 404); every request is
 * recorded in the returned list.
 */
export function stubApi(reply: (call: ApiCall) => Reply | undefined) {
  const calls: ApiCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call: ApiCall = {
        method: init?.method ?? "GET",
        path: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
      calls.push(call);
      const answer = reply(call) ?? {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Not found." } },
      };
      if (answer === "network-error") throw new TypeError("Failed to fetch");
      const status = answer.status ?? 200;
      return new Response(status === 204 ? null : JSON.stringify(answer.body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

/** An API error body, as the server sends it (§7.1). */
export function apiError(status: number, code: string, message: string) {
  return { status, body: { error: { code, message } } };
}

/**
 * Renders `ui` with a fresh query client, optionally holding the user's progress. `seed`
 * puts other data in the cache first, so the components don't fetch it.
 */
export function renderWithClient(
  ui: ReactElement,
  {
    progress,
    seed,
  }: { progress?: ProgressEntry[]; seed?: (client: QueryClient) => void } = {},
): { client: QueryClient; user: ReturnType<typeof userEvent.setup> } {
  const client = makeQueryClient();
  if (progress) {
    client.setQueryData(queryKeys.progress, {
      today: TODAY,
      entries: progress,
    });
  }
  seed?.(client);
  const user = userEvent.setup();
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client, user };
}
