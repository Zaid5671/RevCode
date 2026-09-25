// The Note panel's toolbar (PLAN.md §8.4, DESIGN-BRIEF.md §7): each button turns the text
// and selection into new text and a new selection, so users don't need to know Markdown.
// With nothing selected, a button inserts placeholder text and selects it.

/** The text area's text and selection. */
export type TextEdit = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

export type ToolbarAction =
  | "bold"
  | "italic"
  | "heading"
  | "bulletList"
  | "numberedList"
  | "code"
  | "link";

export function applyToolbar(action: ToolbarAction, edit: TextEdit): TextEdit {
  switch (action) {
    case "bold":
      return wrap(edit, "**", "bold text");
    case "italic":
      return wrap(edit, "_", "italic text");
    case "heading":
      return prefixLines(edit, {
        // `###`, so a note's headings sit under its problem's `##` in a download.
        has: (line) => line.startsWith("### "),
        strip: /^#{1,6} /,
        add: () => "### ",
        placeholder: "Heading",
      });
    case "bulletList":
      return prefixLines(edit, {
        has: (line) => /^[-*] /.test(line),
        strip: LIST_MARK,
        add: () => "- ",
      });
    case "numberedList":
      return prefixLines(edit, {
        has: (line) => /^\d+\. /.test(line),
        strip: LIST_MARK,
        add: (i) => `${i + 1}. `,
      });
    case "code":
      return code(edit);
    case "link":
      return link(edit);
  }
}

const LIST_MARK = /^([-*]|\d+\.) /;

/** Replaces the selection with `before + inner + after` and selects `inner`. */
function replaceSelection(
  { text, selectionStart, selectionEnd }: TextEdit,
  before: string,
  inner: string,
  after: string,
): TextEdit {
  const start = selectionStart + before.length;
  return {
    text:
      text.slice(0, selectionStart) +
      before +
      inner +
      after +
      text.slice(selectionEnd),
    selectionStart: start,
    selectionEnd: start + inner.length,
  };
}

/** Puts `mark` on both sides of the selection, or takes it off if it is already there. */
function wrap(edit: TextEdit, mark: string, placeholder: string): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const selected = text.slice(start, end);
  if (
    selected !== "" &&
    text.slice(start - mark.length, start) === mark &&
    text.slice(end, end + mark.length) === mark
  ) {
    return {
      text:
        text.slice(0, start - mark.length) +
        selected +
        text.slice(end + mark.length),
      selectionStart: start - mark.length,
      selectionEnd: end - mark.length,
    };
  }
  return replaceSelection(edit, mark, selected || placeholder, mark);
}

/**
 * Adds a prefix to every line the selection touches (blank lines are skipped when there
 * are several), or removes it when every line already has it.
 */
function prefixLines(
  { text, selectionStart, selectionEnd }: TextEdit,
  rule: {
    has: (line: string) => boolean;
    /** An existing prefix of a similar kind, replaced by the new one. */
    strip: RegExp;
    add: (index: number) => string;
    /** Inserted (and selected) on an empty line. */
    placeholder?: string;
  },
): TextEdit {
  const blockStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
  // A selection that ends right at a line's start doesn't include that line.
  const lastChar =
    selectionEnd > selectionStart && text[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const newline = text.indexOf("\n", lastChar);
  const blockEnd = newline === -1 ? text.length : newline;
  const lines = text.slice(blockStart, blockEnd).split("\n");

  if (lines.length === 1 && lines[0] === "" && rule.placeholder) {
    return replaceSelection(
      { text, selectionStart, selectionEnd },
      rule.add(0),
      rule.placeholder,
      "",
    );
  }

  const counts = (line: string) => lines.length === 1 || line.trim() !== "";
  const removing = lines.filter(counts).every(rule.has);
  let index = 0;
  const changed = lines.map((line) => {
    if (!counts(line)) return line;
    const bare = line.replace(rule.strip, "");
    return removing ? bare : rule.add(index++) + bare;
  });
  const block = changed.join("\n");
  const delta = block.length - (blockEnd - blockStart);
  const result = text.slice(0, blockStart) + block + text.slice(blockEnd);

  if (selectionStart === selectionEnd) {
    // Only one line changed: the cursor moves with its text.
    const cursor = Math.max(blockStart, selectionStart + delta);
    return { text: result, selectionStart: cursor, selectionEnd: cursor };
  }
  return {
    text: result,
    selectionStart: blockStart,
    selectionEnd: selectionEnd + delta,
  };
}

/** Backticks around a one-line selection; otherwise a fenced block on its own lines. */
function code(edit: TextEdit): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const selected = text.slice(start, end);
  if (selected !== "" && !selected.includes("\n")) {
    return wrap(edit, "`", "code");
  }
  const before = start > 0 && text[start - 1] !== "\n" ? "\n" : "";
  const after = end < text.length && text[end] !== "\n" ? "\n" : "";
  return replaceSelection(
    edit,
    `${before}\`\`\`\n`,
    selected || "code",
    `\n\`\`\`${after}`,
  );
}

/** `[text](https://)`: selected text becomes the label, a selected address the target. */
function link(edit: TextEdit): TextEdit {
  const selected = edit.text.slice(edit.selectionStart, edit.selectionEnd);
  if (selected === "" || /^https?:\/\/\S+$/.test(selected)) {
    return replaceSelection(
      edit,
      "[",
      "link text",
      `](${selected || "https://"})`,
    );
  }
  return replaceSelection(edit, `[${selected}](`, "https://", ")");
}
