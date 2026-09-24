"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/client/api";

// A signed-out answer means the session ended (expired, or signed out in another tab).
// A full page load, not router.push: it also drops every cached query of that session.
function onError(error: Error) {
  if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
    window.location.assign("/sign-in");
  }
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying can't fix a 4xx; it only delays the error message.
        retry: (failureCount, error) =>
          failureCount < 2 &&
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// A new client for each server render; one client for the life of the browser tab.
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
