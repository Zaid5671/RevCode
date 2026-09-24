"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useOpenCategories } from "@/client/openCategories";
import {
  DEFAULT_FILTERS,
  buildRows,
  filtersToQuery,
  groupRows,
  isFiltering,
  matchesFilters,
  parseFilters,
  sortByNextDue,
  type Filters as FilterValues,
} from "@/client/problemsView";
import { useCatalog, useNotesIndex, useProgress } from "@/client/queries";
import { CategoryGroup } from "./CategoryGroup";
import { Filters } from "./Filters";
import { COLUMNS, ProblemRow } from "./ProblemRow";

function writeFilters(next: FilterValues) {
  const query = filtersToQuery(next);
  // Next.js keeps useSearchParams in step with replaceState. Replacing (not pushing) means
  // Back leaves the page instead of undoing each keystroke.
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname,
  );
}

/**
 * The Problems page body (PLAN.md §8.3): filters, then every problem in one table, split
 * into collapsible category folders, or as one flat list when sorted by next due.
 */
export function ProblemTable() {
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const catalog = useCatalog();
  const progress = useProgress();
  const notes = useNotesIndex();
  const [openIds, setOpenIds] = useOpenCategories();
  // Bumped by "Clear" so the search box drops its text.
  const [filtersVersion, setFiltersVersion] = useState(0);
  // While filtering, matching folders start open. Folders closed during that search are
  // kept here, tied to the filters they were closed under, and never saved.
  const filterKey = filtersToQuery({ ...filters, sort: DEFAULT_FILTERS.sort });
  const [closedWhileFiltering, setClosedWhileFiltering] = useState({
    key: "",
    ids: new Set<number>(),
  });

  const rows = useMemo(
    () =>
      catalog.data && progress.data && notes.data
        ? buildRows(catalog.data, progress.data.entries, notes.data)
        : [],
    [catalog.data, progress.data, notes.data],
  );

  const queries = [catalog, progress, notes];
  const failed = queries.find((q) => q.isError);
  if (failed) {
    return (
      <Message>
        <span className="text-rose">
          Couldn&apos;t load your problems. {failed.error?.message}
        </span>{" "}
        <button
          type="button"
          onClick={() => queries.forEach((q) => q.isError && q.refetch())}
          className="text-teal underline"
        >
          Try again
        </button>
      </Message>
    );
  }
  if (!catalog.data || !progress.data || !notes.data) {
    return <Message>Loading problems…</Message>;
  }

  const { categories } = catalog.data;
  const { today } = progress.data;
  const filtering = isFiltering(filters);
  const closed =
    closedWhileFiltering.key === filterKey
      ? closedWhileFiltering.ids
      : new Set<number>();

  function clearFilters() {
    writeFilters({ ...DEFAULT_FILTERS, sort: filters.sort });
    setFiltersVersion((v) => v + 1);
  }

  const controls = (children?: React.ReactNode) => (
    <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">
        <Filters
          key={filtersVersion}
          filters={filters}
          categories={categories}
          onChange={writeFilters}
        />
      </div>
      {children}
    </div>
  );

  const noMatches = (
    <Message>
      No problems match.{" "}
      <button
        type="button"
        onClick={clearFilters}
        className="text-teal underline"
      >
        Clear
      </button>
    </Message>
  );

  // ── Flat list, sorted by next due ─────────────────────────────────────────
  if (filters.sort === "next") {
    const visible = sortByNextDue(
      rows.filter((r) => matchesFilters(r, filters)),
    );
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    return (
      <>
        {controls()}
        {visible.length === 0 ? (
          noMatches
        ) : (
          <TableCard>
            <tbody>
              {visible.map((row) => (
                <ProblemRow
                  key={row.problem.id}
                  row={row}
                  today={today}
                  // Redundant when one category is already chosen.
                  categoryName={
                    filters.category === null
                      ? categoryName.get(row.problem.categoryId)
                      : undefined
                  }
                />
              ))}
            </tbody>
          </TableCard>
        )}
      </>
    );
  }

  // ── Category folders ──────────────────────────────────────────────────────
  const groups = groupRows(categories, rows, filters).filter(
    (g) => !filtering || g.rows.length > 0,
  );
  const isOpen = (id: number) =>
    filtering ? !closed.has(id) : openIds.has(id);
  const allOpen = groups.every((g) => isOpen(g.category.id));

  function setClosed(ids: Iterable<number>) {
    setClosedWhileFiltering({ key: filterKey, ids: new Set(ids) });
  }

  function toggle(id: number) {
    const target = filtering ? new Set(closed) : new Set(openIds);
    if (target.has(id)) target.delete(id);
    else target.add(id);
    if (filtering) setClosed(target);
    else setOpenIds(target);
  }

  function toggleAll() {
    const ids = groups.map((g) => g.category.id);
    if (filtering) setClosed(allOpen ? ids : []);
    else setOpenIds(allOpen ? [] : ids);
  }

  return (
    <>
      {controls(
        groups.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ),
      )}
      {groups.length === 0 ? (
        noMatches
      ) : (
        <TableCard>
          {groups.map((group) => (
            <CategoryGroup
              key={group.category.id}
              group={group}
              open={isOpen(group.category.id)}
              onToggle={() => toggle(group.category.id)}
              today={today}
            />
          ))}
        </TableCard>
      )}
    </>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    // Narrow screens scroll the table inside its card, never the page. `overflow-clip` on
    // wide screens keeps the rounded corners without breaking the sticky header.
    <div className="overflow-x-auto rounded-card border border-line bg-surface lg:overflow-clip">
      <table className="w-full min-w-[980px] border-collapse text-[13px]">
        <thead>
          <tr>
            {COLUMNS.map((heading) => (
              <th
                key={heading}
                scope="col"
                className={`sticky top-0 z-10 border-b border-line bg-surface-2 px-2.5 py-2 text-left text-[11.5px] font-semibold whitespace-nowrap text-ink-soft ${
                  heading === "Notes" ? "text-center" : ""
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-line bg-surface px-3.5 py-3.5 text-[13.5px] text-ink-soft">
      {children}
    </p>
  );
}
