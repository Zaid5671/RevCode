"use client";

// Every save in the app (PLAN.md §8.1). Each kind of save is registered once with
// `setMutationDefaults`, so a failed one can be sent again later from the header's save
// status without the component that started it. Saves of one problem share a `scope`, so
// they run one after another: answers can't arrive out of order and undo each other.
import {
  MutationObserver,
  useMutation,
  useQueryClient,
  type Mutation,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { z } from "zod";
import type { CalendarDate } from "@/domain/calendarDate";
import type { Confidence, Gaps } from "@/domain/gaps";
import type { RevisionNumber } from "@/domain/schedule";
import {
  gapsResponseSchema,
  meSchema,
  progressEntrySchema,
  type GapsResponse,
  type Me,
  type ProgressEntry,
  type ProgressListResponse,
} from "@/domain/schemas";
import { apiRequest, ApiError } from "./api";
import { queryKeys } from "./queries";
import { isRetryable, SaveTracker, type SaveSummary } from "./saves";

// ── Progress saves ──────────────────────────────────────────────────────────

type ProblemVariables = { problemId: number };

const progressPath = (problemId: number) => `/api/progress/${problemId}`;
const revisionPath = (problemId: number, revision: RevisionNumber) =>
  `${progressPath(problemId)}/revisions/${revision}`;

/** What each progress save sends. Each answers with the updated entry, or nothing. */
const PROGRESS_SAVES = {
  /** Mark solved (§7 `PUT /api/progress/:problemId`). */
  solve: ({
    problemId,
    ...body
  }: ProblemVariables & { solvedOn: CalendarDate; confidence: Confidence }) =>
    apiRequest(progressPath(problemId), progressEntrySchema, {
      method: "PUT",
      body,
    }),
  /** Change the solve date or confidence. */
  edit: ({
    problemId,
    ...body
  }: ProblemVariables & { solvedOn?: CalendarDate; confidence?: Confidence }) =>
    apiRequest(progressPath(problemId), progressEntrySchema, {
      method: "PATCH",
      body,
    }),
  /** Unmark solved. The note is kept. */
  unmark: ({ problemId }: ProblemVariables) =>
    apiRequest(progressPath(problemId), z.undefined(), { method: "DELETE" }),
  /** Complete the next pending revision, or change the date of a completed one. */
  completeRevision: ({
    problemId,
    revision,
    completedOn,
  }: ProblemVariables & {
    revision: RevisionNumber;
    completedOn: CalendarDate;
  }) =>
    apiRequest(revisionPath(problemId, revision), progressEntrySchema, {
      method: "PUT",
      body: { completedOn },
    }),
  /** Undo the latest completed revision. */
  undoRevision: ({
    problemId,
    revision,
  }: ProblemVariables & { revision: RevisionNumber }) =>
    apiRequest(revisionPath(problemId, revision), progressEntrySchema, {
      method: "DELETE",
    }),
} satisfies Record<
  string,
  (variables: never) => Promise<ProgressEntry | undefined>
>;

export type ProgressSave = keyof typeof PROGRESS_SAVES;
type SaveVariables<K extends ProgressSave> = Parameters<
  (typeof PROGRESS_SAVES)[K]
>[0];
type SaveResult<K extends ProgressSave> = Awaited<
  ReturnType<(typeof PROGRESS_SAVES)[K]>
>;

const progressSaveKey = (kind: ProgressSave) => ["progress", kind] as const;
const progressScope = (problemId: number) => `progress:${problemId}`;

/** Puts the server's answer into the progress list, then refetches what depends on it. */
function registerProgressSaves(client: QueryClient) {
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.progress }),
      client.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);

  for (const [kind, save] of Object.entries(PROGRESS_SAVES)) {
    client.setMutationDefaults(progressSaveKey(kind as ProgressSave), {
      mutationFn: save as (v: unknown) => Promise<ProgressEntry | undefined>,
      // A progress fetch that is still running could land after this save and put the
      // old values back, so it is cancelled; the refetch after the save replaces it.
      onMutate: () => client.cancelQueries({ queryKey: queryKeys.progress }),
      onSuccess: (entry: ProgressEntry | undefined, variables: unknown) => {
        const { problemId } = variables as ProblemVariables;
        client.setQueryData<ProgressListResponse>(queryKeys.progress, (old) =>
          old
            ? { ...old, entries: withEntry(old.entries, problemId, entry) }
            : old,
        );
        return refresh();
      },
      onError: (error: Error) => {
        // The save went through but its answer was unreadable: show what the server has.
        if (error instanceof ApiError && error.code === "BAD_RESPONSE") {
          return refresh();
        }
      },
    });
  }
}

function withEntry(
  entries: readonly ProgressEntry[],
  problemId: number,
  entry: ProgressEntry | undefined,
): ProgressEntry[] {
  const others = entries.filter((e) => e.problemId !== problemId);
  return entry ? [...others, entry] : others;
}

/**
 * One kind of save for one problem. `mutate`'s variables must name the same `problemId`.
 */
export function useProgressSave<K extends ProgressSave>(
  kind: K,
  problemId: number,
) {
  return useTrackedSave<SaveResult<K>, SaveVariables<K>>(
    progressSaveKey(kind),
    progressScope(problemId),
  );
}

// ── Settings saves ──────────────────────────────────────────────────────────

/** What each Settings save sends (PLAN.md §8.5). */
const SETTINGS_SAVES = {
  saveGaps: (gaps: Gaps) =>
    apiRequest("/api/gaps", gapsResponseSchema, {
      method: "PUT",
      body: { gaps },
    }),
  resetGaps: () =>
    apiRequest("/api/gaps", gapsResponseSchema, { method: "DELETE" }),
  setTimezone: (timezone: string) =>
    apiRequest("/api/me", meSchema, { method: "PATCH", body: { timezone } }),
  deleteAccount: () =>
    apiRequest("/api/account", z.undefined(), { method: "DELETE" }),
};

export type SettingsSave = keyof typeof SETTINGS_SAVES;
type SettingsSaveFn<K extends SettingsSave> = (typeof SETTINGS_SAVES)[K];

/** Saves of the same thing run one after another. */
const SETTINGS_SCOPE: Record<SettingsSave, string> = {
  saveGaps: "gaps",
  resetGaps: "gaps",
  setTimezone: "me",
  deleteAccount: "account",
};

const settingsSaveKey = (kind: SettingsSave) => ["settings", kind] as const;

function registerSettingsSaves(client: QueryClient) {
  // New gaps or a new time zone (a new today) move every pending due date.
  const refreshSchedules = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.progress }),
      client.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  const gapsSaved = (gaps: GapsResponse) => {
    client.setQueryData(queryKeys.gaps, gaps);
    return refreshSchedules();
  };
  const onSuccess: Record<SettingsSave, (data: never) => unknown> = {
    saveGaps: gapsSaved,
    resetGaps: gapsSaved,
    setTimezone: (me: Me) => {
      client.setQueryData(queryKeys.me, me);
      return refreshSchedules();
    },
    // The user is gone; the component that deleted it leaves the page.
    deleteAccount: () => {},
  };

  for (const [kind, save] of Object.entries(SETTINGS_SAVES)) {
    client.setMutationDefaults(settingsSaveKey(kind as SettingsSave), {
      mutationFn: save as (v: unknown) => Promise<unknown>,
      onSuccess: onSuccess[kind as SettingsSave] as (data: unknown) => unknown,
    });
  }
}

/** One kind of Settings save. A refused save's message is shown by the component. */
export function useSettingsSave<K extends SettingsSave>(kind: K) {
  return useTrackedSave<
    Awaited<ReturnType<SettingsSaveFn<K>>>,
    Parameters<SettingsSaveFn<K>> extends [infer V] ? V : void
  >(settingsSaveKey(kind), SETTINGS_SCOPE[kind]);
}

/**
 * A save registered with `setMutationDefaults`. A refused save (4xx) shows its message in
 * the component, so the header stops showing it once that component goes away.
 */
function useTrackedSave<TData, TVariables>(
  mutationKey: readonly unknown[],
  scope: string,
) {
  const client = useQueryClient();
  const mutation = useMutation<TData, Error, TVariables>({
    mutationKey,
    scope: { id: scope },
  });
  const refused = mutation.isError && !isRetryable(mutation.error);
  useEffect(() => {
    if (!refused) return;
    return () => saveTrackerFor(client).dismissRefused(scope);
  }, [client, refused, scope]);
  return mutation;
}

// ── Save status ─────────────────────────────────────────────────────────────

const trackers = new WeakMap<QueryClient, SaveTracker>();

function saveTrackerFor(client: QueryClient): SaveTracker {
  const tracker = trackers.get(client);
  if (!tracker) throw new Error("setUpSaves() was not called on this client");
  return tracker;
}

/** Registers every kind of save on `client` and starts tracking their outcomes. */
export function setUpSaves(client: QueryClient) {
  const tracker = new SaveTracker();
  trackers.set(client, tracker);
  registerProgressSaves(client);
  registerSettingsSaves(client);

  client.getMutationCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const { mutation, action } = event;
    const scope = scopeOf(mutation);
    if (action.type === "pending") tracker.started(scope, mutation.mutationId);
    if (action.type === "success")
      tracker.succeeded(scope, mutation.mutationId);
    if (action.type === "error") {
      tracker.failed(scope, mutation.mutationId, action.error, () =>
        resend(client, mutation),
      );
    }
  });
}

function scopeOf(mutation: Mutation<unknown, unknown, unknown>): string {
  return mutation.options.scope?.id ?? `mutation:${mutation.mutationId}`;
}

/** Sends a failed save again: same kind, same scope, same variables. */
function resend(
  client: QueryClient,
  mutation: Mutation<unknown, unknown, unknown>,
) {
  new MutationObserver<unknown, unknown, unknown>(client, {
    mutationKey: mutation.options.mutationKey,
    scope: mutation.options.scope,
  })
    .mutate(mutation.state.variables)
    // The outcome shows in the save status; nothing waits for it here.
    .catch(() => {});
}

const ALL_SAVED: SaveSummary = { state: "saved", canRetry: false };

/** The header's save status, and a way to re-send the saves that may work a second time. */
export function useSaveStatus(): SaveSummary & { retry: () => void } {
  const tracker = saveTrackerFor(useQueryClient());
  const summary = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    () => ALL_SAVED,
  );
  return { ...summary, retry: () => tracker.retry() };
}
