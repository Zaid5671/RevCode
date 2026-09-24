import { describe, expect, it } from "vitest";
import { DEFAULT_GAPS, gapsSchema } from "./gaps";

describe("DEFAULT_GAPS", () => {
  it("matches PLAN.md §4.1", () => {
    expect(DEFAULT_GAPS).toEqual({
      1: [1, 4, 10],
      2: [3, 7, 14],
      3: [5, 14, 30],
    });
  });

  it("passes its own validation", () => {
    expect(gapsSchema.safeParse(DEFAULT_GAPS).success).toBe(true);
  });
});

describe("gapsSchema", () => {
  const withFirstGap = (value: unknown) => ({
    1: [value, 4, 10],
    2: [3, 7, 14],
    3: [5, 14, 30],
  });

  it.each([
    [0, false],
    [1, true],
    [180, true],
    [181, false],
    [-3, false],
    [2.5, false],
    ["3", false],
    [null, false],
  ])("a gap of %j is valid: %s", (gap, expected) => {
    expect(gapsSchema.safeParse(withFirstGap(gap)).success).toBe(expected);
  });

  it("accepts gaps that do not increase", () => {
    const flat = { 1: [7, 7, 7], 2: [30, 10, 1], 3: [180, 180, 180] };
    expect(gapsSchema.safeParse(flat).success).toBe(true);
  });

  it("accepts JSON string keys, as they arrive over the wire", () => {
    const parsed = gapsSchema.parse(JSON.parse(JSON.stringify(DEFAULT_GAPS)));
    expect(parsed[2]).toEqual([3, 7, 14]);
  });

  it.each([
    ["a missing confidence level", { 1: [1, 4, 10], 2: [3, 7, 14] }],
    ["an unknown confidence level", { ...DEFAULT_GAPS, 4: [1, 1, 1] }],
    ["two gaps instead of three", { ...DEFAULT_GAPS, 2: [3, 7] }],
    ["four gaps instead of three", { ...DEFAULT_GAPS, 3: [5, 14, 30, 60] }],
    [
      "an array instead of an object",
      [DEFAULT_GAPS[1], DEFAULT_GAPS[2], DEFAULT_GAPS[3]],
    ],
  ])("rejects %s", (_, value) => {
    expect(gapsSchema.safeParse(value).success).toBe(false);
  });
});
