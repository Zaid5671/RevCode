"use client";

import { useState } from "react";
import type {
  Filters as FilterValues,
  Sort,
  StatusFilter,
} from "@/client/problemsView";
import type { Category, Difficulty } from "@/domain/schemas";

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ["all", "All statuses"],
  ["unsolved", "Unsolved"],
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["tomorrow", "Due tomorrow"],
  ["week", "Next 7 days"],
  ["later", "Later"],
  ["complete", "Complete"],
  ["notes", "Has notes"],
];

const DIFFICULTY_OPTIONS: [Difficulty, string][] = [
  ["EASY", "Easy"],
  ["MEDIUM", "Medium"],
  ["HARD", "Hard"],
];

const SORT_OPTIONS: [Sort, string][] = [
  ["neetcode", "NeetCode order"],
  ["next", "Next due first"],
];

const CONTROL =
  "rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm text-ink";

/** The controls row above the table (PLAN.md §8.3). Values live in the URL. */
export function Filters({
  filters,
  categories,
  onChange,
}: {
  filters: FilterValues;
  categories: readonly Category[];
  onChange: (next: FilterValues) => void;
}) {
  // The search box keeps its own text so typing never waits for the URL to update.
  const [q, setQ] = useState(filters.q);
  const set = (patch: Partial<FilterValues>) =>
    onChange({ ...filters, ...patch });

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          set({ q: e.target.value });
        }}
        placeholder="Search problems…"
        aria-label="Search problems by title"
        className={`${CONTROL} min-w-40 flex-[1_1_200px]`}
      />
      <select
        aria-label="Category"
        value={filters.category ?? ""}
        onChange={(e) =>
          set({ category: e.target.value ? Number(e.target.value) : null })
        }
        className={CONTROL}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Difficulty"
        value={filters.difficulty ?? ""}
        onChange={(e) =>
          set({ difficulty: (e.target.value || null) as Difficulty | null })
        }
        className={CONTROL}
      >
        <option value="">All difficulties</option>
        {DIFFICULTY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Status"
        value={filters.status}
        onChange={(e) => set({ status: e.target.value as StatusFilter })}
        className={CONTROL}
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort"
        value={filters.sort}
        onChange={(e) => set({ sort: e.target.value as Sort })}
        className={CONTROL}
      >
        {SORT_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
