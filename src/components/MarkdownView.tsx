import type { ComponentProps, JSX } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

// A note as formatted text (PLAN.md §8.4, DESIGN-BRIEF.md §5 "Formatted note style"):
// Inter text, Inter 600 headings, code in JetBrains Mono on surface-2. Raw HTML in a note
// is shown as text, never run, and unsafe link targets (javascript:) are dropped; both
// are react-markdown's defaults. Links open in a new tab; images (not in v1) become links.

type Tag = keyof JSX.IntrinsicElements;

/** The element's props without react-markdown's `node`, which isn't an HTML attribute. */
function htmlProps<P extends ExtraProps>(props: P): Omit<P, "node"> {
  const copy = { ...props };
  delete copy.node;
  return copy;
}

/** An element with the note style's classes. */
function styled<T extends Tag>(tag: T, className: string) {
  const Element = tag as React.ElementType;
  return function Styled(props: ComponentProps<T> & ExtraProps) {
    return <Element {...htmlProps(props)} className={className} />;
  };
}

const LINK = "text-accent underline underline-offset-2 hover:text-accent-hover";
const HEADING = "font-semibold text-ink-strong first:mt-0";

const COMPONENTS: Components = {
  h1: styled("h1", `mt-5 mb-2 text-[20px] ${HEADING}`),
  h2: styled("h2", `mt-5 mb-2 text-[17px] ${HEADING}`),
  h3: styled("h3", `mt-4 mb-1.5 text-[15px] ${HEADING}`),
  h4: styled("h4", `mt-4 mb-1.5 ${HEADING}`),
  h5: styled("h5", "mt-3 mb-1 font-semibold text-ink-soft first:mt-0"),
  h6: styled("h6", "mt-3 mb-1 font-semibold text-ink-soft first:mt-0"),
  p: styled("p", "my-2 first:mt-0 last:mb-0"),
  a: (props) => (
    <a
      {...htmlProps(props)}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    />
  ),
  img: ({ src, alt }) =>
    typeof src === "string" && src !== "" ? (
      <a href={src} target="_blank" rel="noopener noreferrer" className={LINK}>
        {alt || src}
      </a>
    ) : (
      <>{alt}</>
    ),
  ul: styled("ul", "my-2 list-disc pl-6 marker:text-ink-faint [&_ul]:my-0.5"),
  ol: styled(
    "ol",
    "my-2 list-decimal pl-6 marker:text-ink-faint [&_ol]:my-0.5",
  ),
  // A task list item (`- [ ] …`) has its own checkbox, so no bullet.
  li: (props) => (
    <li
      {...htmlProps(props)}
      className={`my-0.5 ${props.className?.includes("task-list-item") ? "-ml-5 list-none" : ""}`}
    />
  ),
  input: (props) => (
    <input {...htmlProps(props)} disabled className="mr-1.5 align-middle" />
  ),
  blockquote: styled(
    "blockquote",
    "my-2 border-l-2 border-line-strong pl-3 text-ink-soft",
  ),
  // Faint and dashed, so a note's own `---` never looks like the edge of its card.
  hr: () => (
    <hr className="my-4 border-0 border-t border-dashed border-line-strong" />
  ),
  pre: styled(
    "pre",
    "my-2 overflow-x-auto rounded-control bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-ink",
  ),
  code: styled(
    "code",
    "rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-ink-strong",
  ),
  table: (props) => (
    <div className="my-2 overflow-x-auto">
      <table {...htmlProps(props)} className="border-collapse text-[13px]" />
    </div>
  ),
  th: styled(
    "th",
    "border border-line bg-surface-head px-2.5 py-1 text-left font-semibold",
  ),
  td: styled("td", "border border-line px-2.5 py-1"),
};

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="text-[15px] leading-relaxed break-words text-ink">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {markdown}
      </Markdown>
    </div>
  );
}
