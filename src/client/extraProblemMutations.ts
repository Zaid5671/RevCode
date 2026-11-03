"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Confidence } from "@/domain/gaps";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import {
  extraProblemEntrySchema,
  parseUrlResponseSchema,
  type CreateExtraProblemBody,
  type Difficulty,
  type ExtraProblemEntry,
  type ParseUrlResponse,
  type PatchExtraProblemBody,
} from "@/domain/schemas";
import { apiRequest } from "./api";
import { queryKeys } from "./queries";

export function useParseLeetCodeUrl() {
  return useMutation<ParseUrlResponse, Error, { url: string }>({
    mutationFn: ({ url }) =>
      apiRequest("/api/extra-problems/parse", parseUrlResponseSchema, {
        method: "POST",
        body: { url },
      }),
  });
}

export function useCreateExtraProblem() {
  const queryClient = useQueryClient();
  return useMutation<ExtraProblemEntry, Error, CreateExtraProblemBody>({
    mutationFn: (body) =>
      apiRequest("/api/extra-problems", extraProblemEntrySchema, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraProblems"] });
    },
  });
}

export function useEditExtraProblem() {
  const queryClient = useQueryClient();
  return useMutation<
    ExtraProblemEntry,
    Error,
    { id: string; body: PatchExtraProblemBody }
  >({
    mutationFn: ({ id, body }) =>
      apiRequest(`/api/extra-problems/${id}`, extraProblemEntrySchema, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraProblems"] });
    },
  });
}

export function useCompleteExtraRevision() {
  const queryClient = useQueryClient();
  return useMutation<
    ExtraProblemEntry,
    Error,
    { id: string; revision: RevisionNumber; completedOn?: CalendarDate }
  >({
    mutationFn: ({ id, revision, completedOn }) =>
      apiRequest(
        `/api/extra-problems/${id}/revisions/${revision}`,
        extraProblemEntrySchema,
        {
          method: "PUT",
          body: { completedOn },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraProblems"] });
    },
  });
}

export function useUndoExtraRevision() {
  const queryClient = useQueryClient();
  return useMutation<
    ExtraProblemEntry,
    Error,
    { id: string; revision: RevisionNumber }
  >({
    mutationFn: ({ id, revision }) =>
      apiRequest(
        `/api/extra-problems/${id}/revisions/${revision}`,
        extraProblemEntrySchema,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraProblems"] });
    },
  });
}

export function useDeleteExtraProblem() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      await fetch(`/api/extra-problems/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extraProblems"] });
    },
  });
}

