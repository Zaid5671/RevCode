import type { CategoryGroup as Group } from "@/client/problemsView";
import type { CalendarDate } from "@/domain/calendarDate";
import { COLUMNS, ProblemRow } from "./ProblemRow";

/**
 * A collapsible category folder (PLAN.md §8.3): a header row with the name, `solved / total`
 * and `● N due`, then the category's rows while open.
 */
export function CategoryGroup({
  group: { category, rows, solved, total, due, urgency },
  open,
  onToggle,
  today,
}: {
  group: Group;
  open: boolean;
  onToggle: () => void;
  today: CalendarDate;
}) {
  return (
    <tbody className="border-b border-line last:border-b-0">
      <tr>
        <th
          scope="rowgroup"
          colSpan={COLUMNS.length}
          className="p-0 text-left font-normal"
        >
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-surface-2"
          >
            <span aria-hidden="true" className="w-3 text-xs text-ink-faint">
              {open ? "▾" : "▸"}
            </span>
            <span className="w-56 truncate text-[13px] font-medium text-ink-soft">
              {category.name}
            </span>
            <span className="w-16 font-mono text-xs text-ink-faint">
              <span className="sr-only">Solved </span>
              {solved} / {total}
            </span>
            {due > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-xs ${
                  urgency === "overdue" ? "text-rose" : "text-amber"
                }`}
              >
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
              </span>
            )}
          </button>
        </th>
      </tr>
      {open &&
        rows.map((row) => (
          <ProblemRow key={row.problem.id} row={row} today={today} />
        ))}
    </tbody>
  );
}
