"use client";

import { useId } from "react";
import { formatLongDate } from "@/client/format";
import {
  compare,
  isValidCalendarDate,
  type CalendarDate,
} from "@/domain/calendarDate";

/**
 * Why a picked date can't be sent, or `null`. `today` is the server's today for this user
 * (PLAN.md §4.5), never the browser's: the two differ for hours each day when the user's
 * stored time zone isn't the browser's.
 */
export function dateProblem(
  value: string,
  { today, min }: { today: CalendarDate; min?: CalendarDate },
): string | null {
  if (!isValidCalendarDate(value)) return "Enter a date.";
  if (compare(value, today) > 0) return "Pick today or an earlier date.";
  if (min && compare(value, min) < 0)
    return `Pick ${formatLongDate(min)} or later.`;
  return null;
}

/** A labelled native date input (PLAN.md §8.6). Its value is always `YYYY-MM-DD` or "". */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: CalendarDate;
  max?: CalendarDate;
  /** Shown under the field in rose, and announced. */
  error?: string | null;
  autoFocus?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-[13px] text-ink-soft">
          {label}
        </label>
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          required
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-autofocus={autoFocus || undefined}
          className="rounded-control border border-line bg-surface px-2 py-1 text-[13px] text-ink"
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/** A rose message under the field it concerns (DESIGN-BRIEF.md §7). */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-rose">
      {children}
    </p>
  );
}
