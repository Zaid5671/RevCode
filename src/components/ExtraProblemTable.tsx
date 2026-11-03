"use client";

import { useMemo, useState } from "react";
import { useExtraProblems } from "@/client/queries";
import type { CalendarDate } from "@/domain/calendarDate";
import type { RevisionNumber } from "@/domain/schedule";
import { DIFFICULTIES, type Difficulty, type ExtraProblemEntry } from "@/domain/schemas";
import { AddExtraProblemDialog } from "./AddExtraProblemDialog";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./buttonStyles";
import { EditExtraProblemDrawer } from "./EditExtraProblemDrawer";
import {
  EXTRA_COLUMNS,
  EXTRA_COLUMN_CLASS,
  ExtraProblemRow,
  type ExtraRowActions,
} from "./ExtraProblemRow";
import { ExtraRevisionDonePopover } from "./ExtraRevisionDonePopover";

type Overlay =
  | { kind: "edit"; item: ExtraProblemEntry }
  | {
      kind: "done";
      item: ExtraProblemEntry;
      revision: RevisionNumber;
      anchor: HTMLElement;
    };

export function ExtraProblemTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "next" | "solved">("newest");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      q: search || undefined,
      difficulty: difficulty !== "all" ? difficulty : undefined,
      status: status !== "all" ? status : undefined,
      sort,
    }),
    [page, limit, search, difficulty, status, sort],
  );

  const { data, isLoading, isError, error, refetch } = useExtraProblems(queryParams);

  const actions = useMemo<ExtraRowActions>(
    () => ({
      edit: (item) => setOverlay({ kind: "edit", item }),
      markDone: (item, revision, anchor) =>
        setOverlay({ kind: "done", item, revision, anchor }),
    }),
    [],
  );

  const isFiltering =
    search.trim() !== "" || difficulty !== "all" || status !== "all";

  function clearFilters() {
    setSearch("");
    setDifficulty("all");
    setStatus("all");
    setPage(1);
  }

  if (isLoading) {
    return (
      <p className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-8 text-center text-sm text-ink-soft">
        Loading extra problems…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="rounded-card border border-rose/30 bg-rose-bg/40 p-4 text-center text-sm text-rose">
        <p>Couldn&apos;t load extra problems: {error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Try again
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const today = data?.today ?? ("" as CalendarDate);

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <input
              type="search"
              placeholder="Search extra problems…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-control border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value as Difficulty | "all");
              setPage(1);
            }}
            className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="tomorrow">Due Tomorrow</option>
            <option value="week">Next 7 Days</option>
            <option value="later">Later</option>
            <option value="complete">Complete</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "newest" | "next" | "solved");
              setPage(1);
            }}
            className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="next">Next Revision Due</option>
            <option value="solved">Solve Date</option>
          </select>

          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Clear
            </button>
          )}
        </div>

        {/* Add Problem Button */}
        <div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className={`${PRIMARY_BUTTON} flex items-center gap-1.5`}
          >
            <span className="text-base leading-none">+</span>
            <span>Add LeetCode Problem</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          {isFiltering ? (
            <div>
              <p className="text-sm text-ink-soft">
                No extra problems match your search filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[15px] font-medium text-ink-strong">
                No extra problems tracked yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-soft">
                Track any additional LeetCode problems outside the NeetCode 250 by
                pasting their URL. We will schedule spaced repetition revisions for you!
              </p>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className={`${PRIMARY_BUTTON} mt-4`}
              >
                + Add your first problem
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line-strong bg-surface lg:overflow-clip">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr>
                {EXTRA_COLUMNS.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`sticky top-14 z-10 h-10 border-b border-line bg-surface-head font-mono text-[11px] font-semibold tracking-wider text-ink-soft uppercase ${EXTRA_COLUMN_CLASS[heading]}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <ExtraProblemRow
                  key={item.id}
                  item={item}
                  index={startIndex + idx}
                  today={today}
                  actions={actions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 sm:flex-row text-xs text-ink-soft">
          <div>
            Showing <span className="font-medium text-ink">{startIndex}</span> to{" "}
            <span className="font-medium text-ink">{endIndex}</span> of{" "}
            <span className="font-medium text-ink">{total}</span> problems
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-ink"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`${SECONDARY_BUTTON} px-2 py-1 text-xs`}
              >
                Previous
              </button>
              <span className="px-2 font-mono text-xs text-ink">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`${SECONDARY_BUTTON} px-2 py-1 text-xs`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Problem Modal */}
      {addModalOpen && (
        <AddExtraProblemDialog
          today={today}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {/* Edit Drawer */}
      {overlay?.kind === "edit" && (
        <EditExtraProblemDrawer
          item={overlay.item}
          today={today}
          onClose={() => setOverlay(null)}
        />
      )}

      {/* Mark Revision Done Popover */}
      {overlay?.kind === "done" && (
        <ExtraRevisionDonePopover
          problemId={overlay.item.id}
          title={overlay.item.title}
          revision={overlay.revision}
          today={today}
          min={
            overlay.revision === 1
              ? overlay.item.solvedOn
              : (overlay.item.revisions[overlay.revision - 2]?.date ??
                overlay.item.solvedOn)
          }
          anchor={overlay.anchor}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}

