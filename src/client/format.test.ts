import { describe, expect, it } from "vitest";
import type { Revision } from "@/domain/schedule";
import {
  formatLongDate,
  formatRelativeDue,
  formatShortDate,
  formatWeekdayDate,
  statusLabel,
} from "./format";

// Wed 23 Sep 2026, the design brief's sample "today".
const TODAY = "2026-09-23";

describe("formatShortDate", () => {
  it("shows day and month in the current year", () => {
    expect(formatShortDate("2026-09-16", TODAY)).toBe("16 Sep");
    expect(formatShortDate("2026-01-01", TODAY)).toBe("1 Jan");
  });

  it("adds the year when it differs from today's", () => {
    expect(formatShortDate("2027-01-08", TODAY)).toBe("8 Jan 2027");
    expect(formatShortDate("2025-12-31", TODAY)).toBe("31 Dec 2025");
  });
});

describe("formatWeekdayDate", () => {
  it("adds the weekday", () => {
    expect(formatWeekdayDate("2026-09-25", TODAY)).toBe("Fri 25 Sep");
    expect(formatWeekdayDate("2026-09-30", TODAY)).toBe("Wed 30 Sep");
  });
});

describe("formatLongDate", () => {
  it("always shows the year", () => {
    expect(formatLongDate("2026-09-23")).toBe("23 Sep 2026");
  });

  it("can lead with the weekday (the dashboard's today)", () => {
    expect(formatLongDate("2026-09-23", { weekday: true })).toBe(
      "Wed 23 Sep 2026",
    );
    expect(formatLongDate("2027-01-01", { weekday: true })).toBe(
      "Fri 1 Jan 2027",
    );
  });
});

describe("statusLabel", () => {
  const revision = (status: Revision["status"], date: string): Revision => ({
    number: 1,
    status,
    date,
  });

  it("counts days late for an overdue revision", () => {
    expect(statusLabel(revision("overdue", "2026-09-20"), TODAY)).toBe(
      "3d late",
    );
    expect(statusLabel(revision("overdue", "2026-09-22"), TODAY)).toBe(
      "1d late",
    );
  });

  it("names today and tomorrow", () => {
    expect(statusLabel(revision("due_today", TODAY), TODAY)).toBe("Today");
    expect(statusLabel(revision("due_tomorrow", "2026-09-24"), TODAY)).toBe(
      "Tomorrow",
    );
  });

  it("shows the weekday within the next 7 days and the date after that", () => {
    expect(statusLabel(revision("next_7_days", "2026-09-25"), TODAY)).toBe(
      "Fri 25 Sep",
    );
    expect(statusLabel(revision("later", "2026-10-08"), TODAY)).toBe("8 Oct");
  });

  it("shows the date of done and projected revisions", () => {
    expect(statusLabel(revision("done", "2026-09-18"), TODAY)).toBe("18 Sep");
    expect(statusLabel(revision("projected", "2026-10-09"), TODAY)).toBe(
      "9 Oct",
    );
  });
});

describe("formatRelativeDue", () => {
  it.each([
    ["2026-09-23", "today"],
    ["2026-09-24", "tomorrow"],
    ["2026-09-26", "in 3 days"],
    ["2026-10-23", "in 30 days"],
    ["2026-09-22", "1d late"],
    ["2026-09-20", "3d late"],
  ])("%s → %s", (due, expected) => {
    expect(formatRelativeDue(due, TODAY)).toBe(expected);
  });
});
