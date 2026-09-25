import { describe, expect, it } from "vitest";
import { DEFAULT_GAPS } from "@/domain/gaps";
import {
  daysFromSolve,
  isValidGap,
  readDraft,
  sameGaps,
  toDraft,
} from "./gapsDraft";

describe("isValidGap", () => {
  it.each(["1", "7", "180", " 14 ", "007"])("accepts %j", (value) => {
    expect(isValidGap(value)).toBe(true);
  });

  it.each(["", " ", "0", "181", "1000", "-3", "2.5", "1e2", "abc", "3 4"])(
    "rejects %j",
    (value) => {
      expect(isValidGap(value)).toBe(false);
    },
  );
});

describe("toDraft and readDraft", () => {
  it("turns gaps into text and back", () => {
    const draft = toDraft(DEFAULT_GAPS);
    expect(draft[2]).toEqual(["3", "7", "14"]);
    expect(readDraft(draft)).toEqual(DEFAULT_GAPS);
  });

  it("reads trimmed and zero-padded numbers", () => {
    const draft = toDraft(DEFAULT_GAPS);
    draft[1] = [" 2 ", "05", "10"];
    expect(readDraft(draft)?.[1]).toEqual([2, 5, 10]);
  });

  it("gives null while any box is invalid", () => {
    const draft = toDraft(DEFAULT_GAPS);
    draft[3] = ["5", "", "30"];
    expect(readDraft(draft)).toBeNull();
  });
});

describe("sameGaps", () => {
  it("compares every value", () => {
    expect(sameGaps(DEFAULT_GAPS, { ...DEFAULT_GAPS })).toBe(true);
    expect(sameGaps(DEFAULT_GAPS, { ...DEFAULT_GAPS, 3: [5, 14, 31] })).toBe(
      false,
    );
  });
});

describe("daysFromSolve", () => {
  it("adds the gaps up: the day of each revision if all are on time", () => {
    expect(daysFromSolve(["3", "7", "14"])).toEqual([3, 10, 24]);
    expect(daysFromSolve(["5", "14", "30"])).toEqual([5, 19, 49]);
  });

  it("stops at the first invalid box", () => {
    expect(daysFromSolve(["3", "x", "14"])).toEqual([3, null, null]);
    expect(daysFromSolve(["", "7", "14"])).toEqual([null, null, null]);
  });
});
