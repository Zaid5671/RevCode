// The Settings gaps grid while the user types (PLAN.md §8.5): each box holds text, and
// the grid can be saved only when every box is a whole number of days from 1 to 180.
import { CONFIDENCES, MAX_GAP, MIN_GAP, type Gaps } from "@/domain/gaps";

type RowDraft = [string, string, string];
export type GapsDraft = Record<keyof Gaps, RowDraft>;

export function isValidGap(value: string): boolean {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return false;
  const days = Number(text);
  return days >= MIN_GAP && days <= MAX_GAP;
}

export function toDraft(gaps: Readonly<Gaps>): GapsDraft {
  return {
    1: gaps[1].map(String) as RowDraft,
    2: gaps[2].map(String) as RowDraft,
    3: gaps[3].map(String) as RowDraft,
  };
}

/** The gaps the grid holds, or `null` while any box is invalid. */
export function readDraft(draft: GapsDraft): Gaps | null {
  const values = CONFIDENCES.flatMap((c) => draft[c]);
  if (!values.every(isValidGap)) return null;
  const row = (c: keyof Gaps) =>
    draft[c].map((v) => Number(v.trim())) as Gaps[keyof Gaps];
  return { 1: row(1), 2: row(2), 3: row(3) };
}

export function sameGaps(a: Readonly<Gaps>, b: Readonly<Gaps>): boolean {
  return CONFIDENCES.every((c) => a[c].every((days, i) => days === b[c][i]));
}

/**
 * The day after solving on which each revision falls if all are on time ("If on time":
 * 3 · 10 · 24). Each gap counts from the one before, so an invalid box ends the sum.
 */
export function daysFromSolve(row: readonly string[]): (number | null)[] {
  let total: number | null = 0;
  return row.map((value) => {
    total = total !== null && isValidGap(value) ? total + Number(value) : null;
    return total;
  });
}
