import { describe, expect, it } from "vitest";
import { deviceTimeZone, timeZoneOptions } from "./timeZones";

describe("timeZoneOptions", () => {
  it("lists the browser's zones in order, with UTC", () => {
    const zones = timeZoneOptions(null);
    // Not Asia/Kolkata: some ICU versions list only its old name, Asia/Calcutta.
    expect(zones).toContain("Europe/London");
    expect(zones).toContain("UTC");
    expect(zones).toEqual([...zones].sort());
    expect(new Set(zones).size).toBe(zones.length);
  });

  it("keeps a saved zone the browser doesn't list", () => {
    expect(timeZoneOptions("Mars/Olympus")).toContain("Mars/Olympus");
  });
});

describe("deviceTimeZone", () => {
  it("gives the zone this machine is set to", () => {
    expect(deviceTimeZone()).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
});
