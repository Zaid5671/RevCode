"use client";

// Which category folders are open on the Problems page, remembered per browser
// (PLAN.md §8.3). Storage can be blocked (private mode, browser settings), so every
// access is wrapped and a copy in memory keeps the folders working without it.
import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "revcode.problems.openCategories";
const NONE_OPEN = "[]";

let memory = NONE_OPEN;
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? NONE_OPEN;
  } catch {
    return memory;
  }
}

function write(value: string) {
  memory = value;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Remembered for this page only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(raw: string): Set<number> {
  try {
    const ids: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(ids) ? ids.filter((id) => Number.isInteger(id)) : [],
    );
  } catch {
    return new Set();
  }
}

/** The open category ids and a setter. The server render has every folder closed. */
export function useOpenCategories(): [
  Set<number>,
  (ids: Iterable<number>) => void,
] {
  const raw = useSyncExternalStore(subscribe, read, () => NONE_OPEN);
  const open = useMemo(() => parse(raw), [raw]);
  const setOpen = useCallback((ids: Iterable<number>) => {
    write(JSON.stringify([...new Set(ids)].sort((a, b) => a - b)));
  }, []);
  return [open, setOpen];
}
