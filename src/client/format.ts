// How dates and revision statuses read on screen (PLAN.md §8.6, DESIGN-BRIEF.md §1).
// Written out by hand rather than with Intl, whose English month names vary by
// locale data (en-GB now gives "Sept").
import { daysBetween, type CalendarDate } from "@/domain/calendarDate";
import type { Revision } from "@/domain/schedule";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(date: CalendarDate) {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    day,
    month: MONTHS[month - 1]!,
    weekday: WEEKDAYS[weekday]!,
  };
}

/** "16 Sep", or "8 Jan 2027" when the year isn't today's. */
export function formatShortDate(
  date: CalendarDate,
  today: CalendarDate,
): string {
  const { year, day, month } = parts(date);
  const short = `${day} ${month}`;
  return year === parts(today).year ? short : `${short} ${year}`;
}

/** "Fri 25 Sep". */
export function formatWeekdayDate(
  date: CalendarDate,
  today: CalendarDate,
): string {
  return `${parts(date).weekday} ${formatShortDate(date, today)}`;
}

/** "23 Sep 2026", or "Wed 23 Sep 2026" with the weekday. */
export function formatLongDate(
  date: CalendarDate,
  { weekday = false }: { weekday?: boolean } = {},
): string {
  const p = parts(date);
  const long = `${p.day} ${p.month} ${p.year}`;
  return weekday ? `${p.weekday} ${long}` : long;
}

/** The text beside a status dot: "3d late", "Today", "Tomorrow", "Fri 25 Sep", "8 Oct". */
/** When a due date falls, from today: "3d late", "today", "tomorrow", "in 3 days". */
export function formatRelativeDue(
  due: CalendarDate,
  today: CalendarDate,
): string {
  const days = daysBetween(today, due);
  if (days < 0) return `${-days}d late`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function statusLabel(revision: Revision, today: CalendarDate): string {
  switch (revision.status) {
    case "overdue":
      return `${daysBetween(revision.date, today)}d late`;
    case "due_today":
      return "Today";
    case "due_tomorrow":
      return "Tomorrow";
    case "next_7_days":
      return formatWeekdayDate(revision.date, today);
    case "later":
    case "done":
    case "projected":
      return formatShortDate(revision.date, today);
  }
}

/**
 * When a note was saved, in this device's time: "10:42 PM" today, else "23 Sep" (with the
 * year when it isn't this year). A timestamp, not a calendar date, so the device's clock
 * is the right one here.
 */
export function formatSavedAt(
  timestamp: string,
  now: Date = new Date(),
): string {
  const saved = new Date(timestamp);
  if (saved.toDateString() === now.toDateString()) {
    const hours = saved.getHours();
    const minutes = String(saved.getMinutes()).padStart(2, "0");
    return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
  }
  const short = `${saved.getDate()} ${MONTHS[saved.getMonth()]}`;
  return saved.getFullYear() === now.getFullYear()
    ? short
    : `${short} ${saved.getFullYear()}`;
}
