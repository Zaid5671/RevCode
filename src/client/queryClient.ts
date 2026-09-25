import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
import { setUpSaves } from "./mutations";

// A signed-out answer means the session ended (expired, or signed out in another tab).
// A full page load, not router.push: it also drops every cached query of that session.
function onError(error: Error) {
  if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
    window.location.assign("/sign-in");
  }
}

/** The app's TanStack Query client: retry policy, sign-out handling and every save. */
export function makeQueryClient(): QueryClient {
  const client = new QueryClient({
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
      mutations: {
        // Send even when the browser says it's offline. The save then fails visibly
        // ("Couldn't save — retry") instead of waiting as "Saving…" with no end.
        networkMode: "always",
      },
    },
  });
  setUpSaves(client);
  return client;
}
