// What the header's save status shows (PLAN.md §8.1, DESIGN-BRIEF.md §1 "Save status").
// Saves are grouped by what they change (their TanStack Query `scope`: one problem's
// progress, say), and each group keeps only its newest save. So a failure stays visible
// until a newer save of the same thing starts, and a retry can never re-send an old save
// over a newer one. The table never shows an unsaved value, so dropping an older failure
// hides nothing: what's on screen is what the server has.
import { ApiError } from "./api";

/**
 * A save that failed because of the network or the server may work if sent again. A 4xx
 * was refused on purpose and would fail again; its message belongs next to the field.
 */
export function isRetryable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "NETWORK_ERROR" || error.status >= 500)
  );
}

export type SaveSummary = {
  state: "saved" | "saving" | "failed";
  canRetry: boolean;
};

type Entry =
  | { id: number; status: "pending" }
  | { id: number; status: "failed"; retry: (() => void) | null };

const SAVED: SaveSummary = { state: "saved", canRetry: false };

export class SaveTracker {
  /** The newest save of each scope that is pending or failed. Succeeded ones are removed. */
  #entries = new Map<string, Entry>();
  #listeners = new Set<() => void>();
  #snapshot = SAVED;

  /** `id` increases with every save (TanStack Query's `mutationId`). */
  started(scope: string, id: number) {
    this.#set(scope, { id, status: "pending" });
  }

  succeeded(scope: string, id: number) {
    if (this.#entries.get(scope)?.id !== id) return;
    this.#entries.delete(scope);
    this.#changed();
  }

  failed(scope: string, id: number, error: unknown, retry: () => void) {
    const current = this.#entries.get(scope);
    if (current && current.id > id) return;
    this.#set(scope, {
      id,
      status: "failed",
      retry: isRetryable(error) ? retry : null,
    });
  }

  /** Clears a refused save once the control that showed its message has gone away. */
  dismissRefused(scope: string) {
    const current = this.#entries.get(scope);
    if (current?.status !== "failed" || current.retry) return;
    this.#entries.delete(scope);
    this.#changed();
  }

  /**
   * Clears any failure of `scope` once the user has discarded what it tried to save (the
   * Note panel closed after "Discard"), so a retry can't send that text after all.
   */
  dismissFailed(scope: string) {
    if (this.#entries.get(scope)?.status !== "failed") return;
    this.#entries.delete(scope);
    this.#changed();
  }

  /** Re-sends every failure that may work the second time, once each. */
  retry() {
    const retries: (() => void)[] = [];
    for (const [scope, entry] of this.#entries) {
      if (entry.status === "failed" && entry.retry) {
        retries.push(entry.retry);
        this.#entries.set(scope, { ...entry, retry: null });
      }
    }
    if (retries.length === 0) return;
    this.#changed();
    retries.forEach((retry) => retry());
  }

  getSnapshot = (): SaveSummary => this.#snapshot;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #set(scope: string, entry: Entry) {
    this.#entries.set(scope, entry);
    this.#changed();
  }

  #changed() {
    const entries = [...this.#entries.values()];
    const failed = entries.filter((e) => e.status === "failed");
    this.#snapshot = entries.some((e) => e.status === "pending")
      ? { state: "saving", canRetry: failed.some((e) => e.retry) }
      : failed.length > 0
        ? { state: "failed", canRetry: failed.some((e) => e.retry) }
        : SAVED;
    this.#listeners.forEach((listener) => listener());
  }
}
