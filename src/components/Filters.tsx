"use client";

import { useState } from "react";
import type {
  Filters as FilterValues,
  Sort,
  StatusFilter,
} from "@/client/problemsView";
import type { Category, Difficulty } from "@/domain/schemas";
import { FIELD, Select } from "./Select";

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
    <div role="search" className="flex flex-wrap items-center gap-2.5">
      <div className="relative w-full max-w-sm min-w-48 flex-[1_1_240px]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 3.5a7.5 7.5 0 0013.15 13.15z" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            set({ q: e.target.value });
          }}
          placeholder="Search problems…"
          aria-label="Search problems by title"
          className={`${FIELD} w-full pr-3 pl-9 placeholder:text-ink-faint`}
        />
      </div>
      <Select
        label="Category"
        value={filters.category === null ? "" : String(filters.category)}
        onChange={(v) => set({ category: v ? Number(v) : null })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        label="Difficulty"
        value={filters.difficulty ?? ""}
        onChange={(v) => set({ difficulty: (v || null) as Difficulty | null })}
      >
        <option value="">All difficulties</option>
        {DIFFICULTY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        label="Status"
        value={filters.status}
        onChange={(v) => set({ status: v as StatusFilter })}
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        label="Sort"
        value={filters.sort}
        onChange={(v) => set({ sort: v as Sort })}
      >
        {SORT_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
