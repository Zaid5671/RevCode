import type { CategoryGroup as Group } from "@/client/problemsView";
import type { CalendarDate } from "@/domain/calendarDate";
import { ProblemCard } from "./ProblemCard";
import { COLUMNS, ProblemRow, type RowActions } from "./ProblemRow";

/**
 * A collapsible category folder (PLAN.md §8.3): a header with the name, `solved / total`
 * and `● N due`, then the category's problems while open: table rows on wide screens,
 * cards on phones.
 */
export function CategoryGroup({
  group,
  open,
  onToggle,
  today,
  actions,
  layout,
}: {
  group: Group;
  open: boolean;
  onToggle: () => void;
  today: CalendarDate;
  actions: RowActions;
  layout: "table" | "cards";
}) {
  const header = (
    <FolderHeader
      group={group}
      open={open}
      onToggle={onToggle}
      layout={layout}
    />
  );

  if (layout === "cards") {
    return (
      <section className="border-b border-line last:border-b-0">
        {header}
        {open && (
          <ul className="border-t border-line-soft">
            {group.rows.map((row) => (
              <ProblemCard
                key={row.problem.id}
                row={row}
                today={today}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <tbody className="border-b border-line-soft last:border-b-0">
      <tr>
        <th
          scope="rowgroup"
          colSpan={COLUMNS.length}
          // Sticks under the app header (h-14) and the column headings (h-10), so the
          // current category stays in view; later folders paint over earlier ones. The
          // inset line stands in for the row border, which a collapsed-border table
          // doesn't carry along when sticky.
          className={`sticky top-24 z-[5] p-0 text-left font-normal shadow-[inset_0_-1px_0_var(--line)] ${
            open ? "bg-surface-2" : "bg-surface"
          }`}
        >
          {header}
        </th>
      </tr>
      {open &&
        group.rows.map((row) => (
          <ProblemRow
            key={row.problem.id}
            row={row}
            today={today}
            actions={actions}
          />
        ))}
    </tbody>
  );
}

function FolderHeader({
  group: { category, solved, total, due, urgency },
  open,
  onToggle,
  layout,
}: {
  group: Group;
  open: boolean;
  onToggle: () => void;
  layout: "table" | "cards";
}) {
  const overdue = urgency === "overdue";
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-hover ${
        layout === "cards" && open ? "bg-surface-2" : ""
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`size-3.5 flex-none ${open ? "text-ink-soft" : "text-ink-faint"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={open ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
      </svg>
      <span
        className={`min-w-0 truncate text-sm font-semibold tracking-tight ${
          open ? "text-ink-strong" : "text-ink"
        }`}
      >
        {category.name}
      </span>
      <span className="flex-none rounded-full border border-line-strong bg-surface-3 px-2 py-0.5 font-mono text-[11px] leading-4 font-medium text-ink-soft">
        <span className="sr-only">Solved </span>
        {solved} / {total}
      </span>
      {/* The due pill stays at the far right. */}
      <span className="flex-1 text-right">
        {due > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              overdue
                ? "border-rose-edge bg-rose-bg text-rose"
                : "border-amber-edge bg-amber-bg text-amber"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${overdue ? "bg-rose" : "bg-amber"}`}
            />
            {due} due
            <span className="sr-only">
              {overdue ? " (some overdue)" : " today"}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
