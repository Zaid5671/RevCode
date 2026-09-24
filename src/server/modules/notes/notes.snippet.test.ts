import { describe, expect, it } from "vitest";
import { snippetFor } from "./notes.snippet";

// A snippet is at most 120 characters of the note, starting 40 characters before the
// first match, with "…" wherever the note is cut.
describe("snippetFor", () => {
  it("returns a short note whole, on one line", () => {
    expect(snippetFor("## Approach\n\nUse a   hash map", "hash")).toBe(
      "## Approach Use a hash map",
    );
  });

  it("starts at the beginning when the match is near it", () => {
    const body = "hash map " + "x".repeat(200);
    expect(snippetFor(body, "hash")).toBe("hash map " + "x".repeat(111) + "…");
  });

  it("shows context on both sides of a match in the middle, ignoring case", () => {
    const body = "a".repeat(100) + "TARGET" + "b".repeat(100);
    expect(snippetFor(body, "target")).toBe(
      "…" + "a".repeat(40) + "TARGET" + "b".repeat(74) + "…",
    );
  });

  it("fills the window backwards when the match is near the end", () => {
    const body = "a".repeat(200) + "end";
    expect(snippetFor(body, "end")).toBe("…" + "a".repeat(117) + "end");
  });

  it("never splits an emoji", () => {
    const body = "😀".repeat(100) + "key" + "😀".repeat(100);
    expect(snippetFor(body, "key")).toBe(
      "…" + "😀".repeat(40) + "key" + "😀".repeat(77) + "…",
    );
  });

  it("matches the query's special characters literally", () => {
    const body = "axb" + "-".repeat(100) + "a.b" + "-".repeat(100);
    expect(snippetFor(body, "a.b")).toBe(
      "…" + "-".repeat(40) + "a.b" + "-".repeat(77) + "…",
    );
  });

  it("finds a query with repeated spaces after the note's spaces are collapsed", () => {
    const body = "x".repeat(100) + " hash  map " + "y".repeat(100);
    expect(snippetFor(body, "hash  map")).toBe(
      "…" + "x".repeat(39) + " hash map " + "y".repeat(71) + "…",
    );
  });

  it("falls back to the note's start when the match can't be located", () => {
    expect(snippetFor("z".repeat(200), "nomatch")).toBe("z".repeat(120) + "…");
  });
});
