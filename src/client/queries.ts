"use client";

// TanStack Query hooks (PLAN.md §8.1). Keys live in one place so mutations can
// invalidate exactly what they change: progress and gaps changes → `progress` and
// `dashboard`; note changes → `notes*` and `dashboard`.
import { useQuery } from "@tanstack/react-query";
import {
  catalogResponseSchema,
  gapsResponseSchema,
  noteSummaryListSchema,
  progressListResponseSchema,
} from "@/domain/schemas";
import { apiRequest } from "./api";

export const queryKeys = {
  catalog: ["catalog"],
  progress: ["progress"],
  dashboard: ["dashboard"],
  gaps: ["gaps"],
  notesIndex: ["notes", "index"],
} as const;

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

/** Which problems have a note (for the Notes column). */
export function useNotesIndex() {
  return useQuery({
    queryKey: queryKeys.notesIndex,
    queryFn: () => apiRequest("/api/notes", noteSummaryListSchema),
  });
}

/** The user's revision gaps (the Solve dialog's "first revision" hints; Settings). */
export function useGaps() {
  return useQuery({
    queryKey: queryKeys.gaps,
    queryFn: () => apiRequest("/api/gaps", gapsResponseSchema),
  });
}
