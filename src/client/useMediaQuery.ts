"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `md` breakpoint: below it, the Problems table becomes cards (PLAN.md §8.3). */
export const WIDE_SCREEN = "(min-width: 48rem)";

/** Whether `query` matches, kept up to date. The server render assumes `serverValue`. */
export function useMediaQuery(query: string, serverValue = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
