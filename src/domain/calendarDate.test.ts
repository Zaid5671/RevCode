import { describe, expect, it } from "vitest";
import {
  addDays,
  compare,
  daysBetween,
  isValidCalendarDate,
  isValidTimeZone,
  todayIn,
  userToday,
} from "./calendarDate";

describe("isValidCalendarDate", () => {
  it.each([
    ["2026-09-24", true],
    ["2028-02-29", true],
    ["2000-02-29", true],
    ["2026-12-31", true],
    ["2026-02-29", false],
    ["1900-02-29", false],
    ["2026-02-30", false],
    ["2026-04-31", false],
    ["2026-13-01", false],
    ["2026-00-10", false],
    ["2026-01-00", false],
    ["2026-9-24", false],
    ["2026-09-24T00:00:00Z", false],
    [" 2026-09-24", false],
    ["", false],
  ])("%j → %s", (value, expected) => {
    expect(isValidCalendarDate(value)).toBe(expected);
  });
});

describe("addDays", () => {
  it.each([
    ["2026-09-24", 0, "2026-09-24"],
    ["2026-09-24", 1, "2026-09-25"],
    ["2026-09-30", 1, "2026-10-01"],
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-12-25", 14, "2027-01-08"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2100-02-28", 1, "2100-03-01"],
    ["2000-02-28", 1, "2000-02-29"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2026-01-01", 365, "2027-01-01"],
    ["2028-01-01", 365, "2028-12-31"],
    ["2026-09-24", 180, "2027-03-23"],
  ])("%s + %i → %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe("daysBetween", () => {
  it.each([
    ["2026-09-24", "2026-09-24", 0],
    ["2026-09-23", "2026-09-24", 1],
    ["2026-09-24", "2026-09-23", -1],
    ["2026-09-30", "2026-10-01", 1],
    ["2026-12-25", "2027-01-08", 14],
    ["2028-02-28", "2028-03-01", 2],
    ["2026-02-28", "2026-03-01", 1],
    ["2026-01-01", "2027-01-01", 365],
    ["2028-01-01", "2029-01-01", 366],
    // Across a daylight-saving change in most zones, still whole days.
    ["2026-03-01", "2026-04-01", 31],
  ])("%s → %s is %i days", (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected);
  });
});

describe("compare", () => {
  it.each([
    ["2026-09-24", "2026-09-24", 0],
    ["2026-09-23", "2026-09-24", -1],
    ["2026-09-24", "2026-09-23", 1],
    ["2026-12-31", "2027-01-01", -1],
    ["2026-10-01", "2026-09-30", 1],
  ])("%s vs %s → %i", (a, b, expected) => {
    expect(compare(a, b)).toBe(expected);
  });
});

describe("todayIn", () => {
  it.each([
    // Evening in UTC is already tomorrow in India (UTC+5:30).
    ["2026-09-24T20:00:00Z", "UTC", "2026-09-24"],
    ["2026-09-24T20:00:00Z", "Asia/Kolkata", "2026-09-25"],
    ["2026-09-24T18:29:59Z", "Asia/Kolkata", "2026-09-24"],
    ["2026-09-24T18:30:00Z", "Asia/Kolkata", "2026-09-25"],
    // Early morning in UTC is still yesterday in California (UTC-7 in September).
    ["2026-09-25T03:00:00Z", "America/Los_Angeles", "2026-09-24"],
    // New Year arrives in Kiritimati (UTC+14) while UTC is still on 31 December.
    ["2026-12-31T10:00:00Z", "Pacific/Kiritimati", "2027-01-01"],
  ])("%s in %s → %s", (instant, timeZone, expected) => {
    expect(todayIn(timeZone, new Date(instant))).toBe(expected);
  });

  it("uses the current time by default", () => {
    expect(isValidCalendarDate(todayIn("UTC"))).toBe(true);
  });
});

describe("userToday", () => {
  const EVENING_UTC = new Date("2026-09-24T20:00:00Z");

  it("uses the user's time zone", () => {
    expect(userToday("Asia/Kolkata", EVENING_UTC)).toBe("2026-09-25");
  });

  it.each([null, undefined])("treats a %s time zone as UTC", (timeZone) => {
    expect(userToday(timeZone, EVENING_UTC)).toBe("2026-09-24");
  });
});

describe("isValidTimeZone", () => {
  it.each([
    ["UTC", true],
    ["Asia/Kolkata", true],
    ["America/Los_Angeles", true],
    ["Mars/Olympus_Mons", false],
    ["", false],
    ["+05:30", false],
  ])("%j → %s", (value, expected) => {
    expect(isValidTimeZone(value)).toBe(expected);
  });
});
