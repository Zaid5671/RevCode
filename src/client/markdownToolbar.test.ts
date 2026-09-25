import { describe, expect, it } from "vitest";
import {
  applyToolbar,
  type TextEdit,
  type ToolbarAction,
} from "./markdownToolbar";

// `«` and `»` mark the selection; `«»` is the cursor.
function edit(marked: string): TextEdit {
  const start = marked.indexOf("«");
  const end = marked.indexOf("»") - 1;
  return {
    text: marked.replace("«", "").replace("»", ""),
    selectionStart: start,
    selectionEnd: end,
  };
}

function marked({ text, selectionStart, selectionEnd }: TextEdit): string {
  return (
    text.slice(0, selectionStart) +
    "«" +
    text.slice(selectionStart, selectionEnd) +
    "»" +
    text.slice(selectionEnd)
  );
}

const apply = (action: ToolbarAction, before: string) =>
  marked(applyToolbar(action, edit(before)));

describe("bold and italic", () => {
  it.each([
    ["bold", "a «word» here", "a **«word»** here"],
    ["bold", "a «» here", "a **«bold text»** here"],
    ["bold", "a **«word»** here", "a «word» here"],
    ["italic", "a «word» here", "a _«word»_ here"],
    ["italic", "«»", "_«italic text»_"],
    ["italic", "a _«word»_ here", "a «word» here"],
  ] as const)("%s: %j → %j", (action, before, after) => {
    expect(apply(action, before)).toBe(after);
  });
});

describe("heading", () => {
  it.each([
    ["an empty line gets a placeholder", "«»", "### «Heading»"],
    ["the cursor's line becomes a heading", "Appr«»oach", "### Appr«»oach"],
    ["a heading line goes back to text", "### Appr«»oach", "Appr«»oach"],
    ["another level becomes ###", "## Appr«»oach", "### Appr«»oach"],
    ["only the cursor's line", "one\ntw«»o\nthree", "one\n### tw«»o\nthree"],
    ["each selected line", "«one\ntwo»\nthree", "«### one\n### two»\nthree"],
  ])("%s", (_, before, after) => {
    expect(apply("heading", before)).toBe(after);
  });
});

describe("lists", () => {
  it.each([
    ["bullet: an empty line", "bulletList", "«»", "- «»"],
    ["bullet: the cursor's line", "bulletList", "it«»em", "- it«»em"],
    [
      "bullet: every selected line, skipping blank ones",
      "bulletList",
      "«one\n\ntwo»",
      "«- one\n\n- two»",
    ],
    [
      "bullet: a list goes back to text",
      "bulletList",
      "«- one\n- two»",
      "«one\ntwo»",
    ],
    [
      "bullet: a selection ending at the next line's start leaves that line",
      "bulletList",
      "«one\n»two",
      "«- one\n»two",
    ],
    ["numbered: an empty line", "numberedList", "«»", "1. «»"],
    [
      "numbered: selected lines count up",
      "numberedList",
      "«one\ntwo\nthree»",
      "«1. one\n2. two\n3. three»",
    ],
    [
      "numbered: a numbered list goes back to text",
      "numberedList",
      "«1. one\n2. two»",
      "«one\ntwo»",
    ],
    [
      "numbered: bullets become numbers",
      "numberedList",
      "«- one\n- two»",
      "«1. one\n2. two»",
    ],
  ] as const)("%s", (_, action, before, after) => {
    expect(apply(action, before)).toBe(after);
  });
});

describe("code", () => {
  it.each([
    [
      "a one-line selection gets backticks",
      "use «map» here",
      "use `«map»` here",
    ],
    ["backticks come off again", "use `«map»` here", "use «map» here"],
    ["an empty line gets a fenced block", "«»", "```\n«code»\n```"],
    [
      "mid-line, the block starts on its own line",
      "text«»",
      "text\n```\n«code»\n```",
    ],
    [
      "before text, the block ends on its own line",
      "«»text",
      "```\n«code»\n```\ntext",
    ],
    [
      "a multi-line selection is fenced",
      "«a = 1\nb = 2»",
      "```\n«a = 1\nb = 2»\n```",
    ],
  ])("%s", (_, before, after) => {
    expect(apply("code", before)).toBe(after);
  });
});

describe("link", () => {
  it.each([
    ["no selection", "see «»", "see [«link text»](https://)"],
    ["selected text becomes the label", "see «docs»", "see [docs](«https://»)"],
    [
      "a selected address becomes the target",
      "see «https://x.dev»",
      "see [«link text»](https://x.dev)",
    ],
  ])("%s", (_, before, after) => {
    expect(apply("link", before)).toBe(after);
  });
});
