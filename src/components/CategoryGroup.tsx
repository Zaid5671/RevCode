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
    <tbody className="border-b border-line last:border-b-0">
      <tr>
        <th
          scope="rowgroup"
          colSpan={COLUMNS.length}
          className="p-0 text-left font-normal"
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
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-surface-2"
    >
      <span aria-hidden="true" className="w-3 text-xs text-ink-faint">
        {open ? "▾" : "▸"}
      </span>
      <span
        className={`truncate text-[13px] font-medium text-ink-soft ${
          layout === "cards" ? "min-w-0 flex-1" : "w-56"
        }`}
      >
        {category.name}
      </span>
      <span className="w-16 flex-none font-mono text-xs text-ink-faint">
        <span className="sr-only">Solved </span>
        {solved} / {total}
      </span>
      {/* The due count keeps its place on phones, so the counts line up. */}
      <span
        className={`inline-flex flex-none items-center gap-1.5 font-mono text-xs ${
          layout === "cards" ? "w-14" : ""
        } ${urgency === "overdue" ? "text-rose" : "text-amber"}`}
      >
        {due > 0 && (
          <>
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                urgency === "overdue" ? "bg-rose" : "bg-amber"
              }`}
            />
            {due} due
            <span className="sr-only">
              {urgency === "overdue" ? " (some overdue)" : " today"}
            </span>
          </>
        )}
      </span>
    </button>
  );
}
