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
  type ProblemRow as Row,
} from "@/client/problemsView";
import { useCatalog, useNotesIndex, useProgress } from "@/client/queries";
import { WIDE_SCREEN, useMediaQuery } from "@/client/useMediaQuery";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import { CategoryGroup } from "./CategoryGroup";
import { EditDrawer, UnmarkConfirm } from "./EditDrawer";
import { Filters } from "./Filters";
import { NoteDrawer } from "./NoteDrawer";
import { ProblemCard } from "./ProblemCard";
import {
  COLUMNS,
  COLUMN_CLASS,
  ProblemRow,
  type RowActions,
} from "./ProblemRow";
import { RevisionDonePopover } from "./RevisionDonePopover";
import { SolveForm } from "./SolveForm";

/** The one overlay open on the page, if any. */
type Overlay =
  | { kind: "solve" | "edit" | "unmark" | "note"; problemId: number }
  | {
      kind: "done";
      problemId: number;
      revision: RevisionNumber;
      anchor: HTMLElement;
    };

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
 * into collapsible category folders, or as one flat list when sorted by next due. On
 * phones the rows become cards. Rows open the Solve dialog, Edit panel, unmark
 * confirmation and "done" popover, one at a time.
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
  const wide = useMediaQuery(WIDE_SCREEN);
  const layout = wide ? "table" : "cards";

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const actions = useMemo<RowActions>(
    () => ({
      solve: (problemId) => setOverlay({ kind: "solve", problemId }),
      unmark: (problemId) => setOverlay({ kind: "unmark", problemId }),
      edit: (problemId) => setOverlay({ kind: "edit", problemId }),
      note: (problemId) => setOverlay({ kind: "note", problemId }),
      markDone: (problemId, revision, anchor) =>
        setOverlay({ kind: "done", problemId, revision, anchor }),
    }),
    [],
  );
  const overlayRow = overlay
    ? rows.find((r) => r.problem.id === overlay.problemId)
    : undefined;
  const overlayStillFits =
    overlay !== null && overlayRow !== undefined && fits(overlay, overlayRow);
  // A save here or in another tab can make an open overlay pointless (the problem was
  // unmarked, or its revision done), so it closes rather than acting on old data.
  // (React's "adjust state while rendering": no effect, no extra paint.)
  if (overlay && rows.length > 0 && !overlayStillFits) setOverlay(null);

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
          className="text-accent underline underline-offset-2 hover:text-accent-hover"
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
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const overlayElement = overlay && overlayRow && overlayStillFits && (
    <OverlayFor
      overlay={overlay}
      row={overlayRow}
      categoryName={categoryName.get(overlayRow.problem.categoryId) ?? ""}
      today={today}
      onClose={() => setOverlay(null)}
    />
  );
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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
        className="text-accent underline underline-offset-2 hover:text-accent-hover"
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
    return (
      <>
        {controls()}
        {visible.length === 0 ? (
          noMatches
        ) : (
          <ProblemList layout={layout}>
            {visible.map((row) => {
              const Item = layout === "table" ? ProblemRow : ProblemCard;
              return (
                <Item
                  key={row.problem.id}
                  row={row}
                  today={today}
                  actions={actions}
                  // Redundant when one category is already chosen.
                  categoryName={
                    filters.category === null
                      ? categoryName.get(row.problem.categoryId)
                      : undefined
                  }
                />
              );
            })}
          </ProblemList>
        )}
        {overlayElement}
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
            className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-xs font-medium text-ink-soft hover:bg-hover hover:text-ink"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d={
                  allOpen
                    ? "M9 4v5H4m0 0l5-5m6 0v5h5m0 0l-5-5M9 20v-5H4m0 0l5 5m6 0v-5h5m0 0l-5 5"
                    : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                }
              />
            </svg>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ),
      )}
      {groups.length === 0 ? (
        noMatches
      ) : (
        <ProblemList layout={layout} grouped>
          {groups.map((group) => (
            <CategoryGroup
              key={group.category.id}
              group={group}
              open={isOpen(group.category.id)}
              onToggle={() => toggle(group.category.id)}
              today={today}
              actions={actions}
              layout={layout}
            />
          ))}
        </ProblemList>
      )}
      {overlayElement}
    </>
  );
}

/** Whether an overlay still makes sense for the problem as it is now. */
function fits(overlay: Overlay, { entry }: Row): boolean {
  switch (overlay.kind) {
    case "solve":
      return entry === null;
    case "edit":
    case "unmark":
      return entry !== null;
    case "done":
      return entry?.next?.number === overlay.revision;
    case "note":
      // A note doesn't depend on progress (unsolved problems have notes too).
      return true;
  }
}

function OverlayFor({
  overlay,
  row: { problem, entry },
  categoryName,
  today,
  onClose,
}: {
  overlay: Overlay;
  row: Row;
  categoryName: string;
  today: CalendarDate;
  onClose: () => void;
}) {
  switch (overlay.kind) {
    case "solve":
      return <SolveForm problem={problem} today={today} onClose={onClose} />;
    case "edit":
      return (
        entry && (
          <EditDrawer
            problem={problem}
            entry={entry}
            today={today}
            onClose={onClose}
          />
        )
      );
    case "note":
      return (
        <NoteDrawer
          problem={problem}
          categoryName={categoryName}
          onClose={onClose}
        />
      );
    case "unmark":
      return (
        <UnmarkConfirm problem={problem} onCancel={onClose} onDone={onClose} />
      );
    case "done": {
      const i = overlay.revision - 1;
      return (
        entry && (
          <RevisionDonePopover
            problemId={problem.id}
            title={problem.title}
            revision={overlay.revision}
            today={today}
            min={i === 0 ? entry.solvedOn : entry.revisions[i - 1]?.date}
            anchor={overlay.anchor}
            onClose={onClose}
          />
        )
      );
    }
  }
}

/** The bordered card around the problems: a table, or a list of cards on phones. */
function ProblemList({
  layout,
  grouped = false,
  children,
}: {
  layout: "table" | "cards";
  /** Category folders bring their own <tbody> or <section>. */
  grouped?: boolean;
  children: React.ReactNode;
}) {
  if (layout === "table") {
    return (
      <TableCard>{grouped ? children : <tbody>{children}</tbody>}</TableCard>
    );
  }
  return (
    <div className="rounded-card border border-line-strong bg-surface text-sm">
      {grouped ? children : <ul>{children}</ul>}
    </div>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    // Narrow screens scroll the table inside its card, never the page. `overflow-clip` on
    // wide screens keeps the rounded corners without breaking the sticky header.
    <div className="overflow-x-auto rounded-card border border-line-strong bg-surface lg:overflow-clip">
      <table className="w-full min-w-[1040px] border-collapse text-left text-xs whitespace-nowrap">
        <thead>
          <tr>
            {COLUMNS.map((heading) => (
              <th
                key={heading}
                scope="col"
                // Sticks under the app header (h-14). A fixed height, so the sticky
                // category rows can sit right under it (CategoryGroup).
                className={`sticky top-14 z-10 h-10 border-b border-line bg-surface-head font-mono text-[11px] font-semibold tracking-wider text-ink-soft uppercase ${COLUMN_CLASS[heading]}`}
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
    <p className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-3.5 text-sm text-ink-soft">
      {children}
    </p>
  );
}
