// Calendar dates as `YYYY-MM-DD` strings (PLAN.md §4.5). No `Date` objects leave this file.

/** A `YYYY-MM-DD` string that names a real day. */
export type CalendarDate = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return month === 2 && isLeap ? 29 : DAYS_IN_MONTH[month - 1]!;
}

/** Adds whole days (negative to subtract). Uses UTC so no daylight-saving shift can skip a day. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = splitDate(date);
  const shifted = new Date(0);
  shifted.setUTCFullYear(year, month - 1, day + days);
  return shifted.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return (utcMidnight(to) - utcMidnight(from)) / 86_400_000;
}

function utcMidnight(date: CalendarDate): number {
  const [year, month, day] = splitDate(date);
  return Date.UTC(year, month - 1, day);
}

function splitDate(
  date: CalendarDate,
): [year: number, month: number, day: number] {
  return date.split("-").map(Number) as [number, number, number];
}

/** -1, 0 or 1. `YYYY-MM-DD` strings sort correctly as text. */
export function compare(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The calendar date in `timeZone` at the instant `now`. The caller must pass a valid zone. */
export function todayIn(
  timeZone: string,
  now: Date = new Date(),
): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** The user's today. A user with no time zone yet counts as UTC (PLAN.md §4.5). */
export function userToday(
  timeZone: string | null | undefined,
  now: Date = new Date(),
): CalendarDate {
  return todayIn(timeZone ?? "UTC", now);
}

/** True for IANA zone names such as `Asia/Kolkata` or `UTC`. Raw offsets like `+05:30` are rejected. */
export function isValidTimeZone(value: string): boolean {
  if (!/^[A-Za-z]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
