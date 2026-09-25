"use client";

// TanStack Query hooks (PLAN.md §8.1). Keys live in one place so mutations can
// invalidate exactly what they change: progress and gaps changes → `progress` and
// `dashboard`; note changes → `notes*` and `dashboard`.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  catalogResponseSchema,
  categoryNotesSchema,
  dashboardResponseSchema,
  gapsResponseSchema,
  meSchema,
  noteSchema,
  noteSearchResultListSchema,
  noteSummaryListSchema,
  progressListResponseSchema,
} from "@/domain/schemas";
import { apiRequest, ApiError } from "./api";

export const queryKeys = {
  me: ["me"],
  catalog: ["catalog"],
  progress: ["progress"],
  dashboard: ["dashboard"],
  gaps: ["gaps"],
  /** Everything a note save changes besides the note itself: index, category notes, search. */
  notes: ["notes"],
  notesIndex: ["notes", "index"],
  categoryNotes: (categoryId: number) =>
    ["notes", "category", categoryId] as const,
  noteSearch: (q: string) => ["notes", "search", q] as const,
  /** One problem's note, for the Note panel. Outside `notes`, so a save can set it. */
  note: (problemId: number) => ["note", problemId] as const,
} as const;

/** The signed-in user's profile, time zone and today. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiRequest("/api/me", meSchema),
  });
}

/** The 250 problems and 18 categories. They only change with a deploy. */
export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: () => apiRequest("/api/catalog", catalogResponseSchema),
    staleTime: Infinity,
  });
}

/** The user's solved problems with their computed schedules, and the user's today. */
export function useProgress() {
  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => apiRequest("/api/progress", progressListResponseSchema),
  });
}

/** The reminder lists and stats for the dashboard, and the user's today. */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiRequest("/api/dashboard", dashboardResponseSchema),
  });
}

/** Which problems have a note (for the Notes column). */
export function useNotesIndex() {
  return useQuery({
    queryKey: queryKeys.notesIndex,
    queryFn: () => apiRequest("/api/notes", noteSummaryListSchema),
  });
}

/** A category's notes with their bodies, for the Notes section. */
export function useCategoryNotes(categoryId: number) {
  return useQuery({
    queryKey: queryKeys.categoryNotes(categoryId),
    queryFn: () =>
      apiRequest(`/api/categories/${categoryId}/notes`, categoryNotesSchema),
  });
}

/**
 * Notes whose text contains `q` (the server's search). Idle for an empty query; the last
 * results stay on screen while the next ones load, so the list doesn't flash.
 */
export function useNoteSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.noteSearch(q),
    queryFn: () =>
      apiRequest(
        `/api/notes/search?${new URLSearchParams({ q })}`,
        noteSearchResultListSchema,
      ),
    enabled: q !== "",
    placeholderData: keepPreviousData,
  });
}

/**
 * One problem's note, or `null` when it has none. Refetched whenever the tab regains focus,
 * so the Note panel notices a change made in another tab (PLAN.md §8.4).
 */
export function useNote(problemId: number) {
  return useQuery({
    queryKey: queryKeys.note(problemId),
    queryFn: () =>
      apiRequest(`/api/notes/${problemId}`, noteSchema).catch((error) => {
        if (error instanceof ApiError && error.code === "NOT_FOUND")
          return null;
        throw error;
      }),
    staleTime: 0,
  });
}

/** The user's revision gaps (the Solve dialog's "first revision" hints; Settings). */
export function useGaps() {
  return useQuery({
    queryKey: queryKeys.gaps,
    queryFn: () => apiRequest("/api/gaps", gapsResponseSchema),
  });
}
