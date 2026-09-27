"use client";

import { useRef, useState } from "react";
import { formatSavedAt } from "@/client/format";
import {
  categoryDocument,
  highlightParts,
  searchHits,
  type DocumentItem,
} from "@/client/notesView";
import { useCategoryNotes, useNoteSearch } from "@/client/queries";
import type {
  CatalogResponse,
  Category,
  NoteSummary,
  Problem,
  ProgressEntry,
} from "@/domain/schemas";
import { DifficultyBadge } from "./Badges";
import { Chevron, CollapsibleNote } from "./CollapsibleNote";
import { MarkdownView } from "./MarkdownView";

// The right column of the Notes section (DESIGN-BRIEF.md §5): one category as a document,
// or the search results. Edit, "+ Add note" and a result all open the Note panel.

export const LINK =
  "text-accent underline underline-offset-2 hover:text-accent-hover";

/** One category as a readable page: its notes in NeetCode order. */
export function CategoryDocument({
  category,
  catalog,
  entries,
  onOpen,
}: {
  category: Category;
  catalog: CatalogResponse;
  entries: readonly ProgressEntry[];
  onOpen: (problem: Problem) => void;
}) {
  const notes = useCategoryNotes(category.id);
  const [withoutNotes, setWithoutNotes] = useState(false);
  // Which notes are too long to show in full, and which of those are open. Nothing is
  // remembered: each visit starts with long notes collapsed.
  const [long, setLong] = useState<ReadonlySet<number>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const top = useRef<HTMLElement>(null);

  const setIn = (update: typeof setLong, id: number) => (on: boolean) =>
    update((ids) => {
      if (ids.has(id) === on) return ids;
      const next = new Set(ids);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  if (notes.isError) {
    return (
      <ErrorLine
        message={`Couldn't load the notes for ${category.name}.`}
        detail={notes.error.message}
        onRetry={() => void notes.refetch()}
      />
    );
  }
  if (!notes.data) return <DocumentPlaceholder />;

  const count = notes.data.length;
  const total = catalog.problems.filter(
    (p) => p.categoryId === category.id,
  ).length;
  const items = categoryDocument(
    catalog,
    category.id,
    notes.data,
    entries,
    withoutNotes,
  );
  const longIds = items
    .filter((item) => item.note && long.has(item.problem.id))
    .map((item) => item.problem.id);
  const allOpen = longIds.every((id) => expanded.has(id));

  function toggleAll() {
    setExpanded(allOpen ? new Set() : new Set(longIds));
    if (allOpen) top.current?.scrollIntoView({ block: "start" });
  }

  return (
    <article ref={top} className="scroll-mt-20">
      <header className="mb-5 border-b border-line pb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold tracking-tight text-ink-strong">
            {category.name}
          </h2>
          {count > 0 && (
            <a
              href={`/api/notes/export?categoryId=${category.id}`}
              download
              className="text-xs text-ink-soft underline underline-offset-2 hover:text-accent"
            >
              Download .md
            </a>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-ink-faint">
          <span>
            {count} of {total} problems have notes
          </span>
          <span className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {longIds.length > 0 && (
              // A pill like Show more, so it reads as a button, apart from the switch.
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs font-medium text-ink-soft hover:border-ink-faint hover:text-ink-strong"
              >
                {allOpen ? "Collapse all" : "Expand all"}
                <Chevron up={allOpen} />
              </button>
            )}
            <Switch
              checked={withoutNotes}
              onChange={setWithoutNotes}
              label="Show problems without notes"
            />
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <Box>
          No notes here yet. Add one with the{" "}
          <b className="text-ink-strong">+</b> in the Notes column on the
          Problems page.
        </Box>
      ) : (
        <div>
          {items.map((item) => (
            <DocumentEntry
              key={item.problem.id}
              item={item}
              onOpen={onOpen}
              long={long.has(item.problem.id)}
              expanded={expanded.has(item.problem.id)}
              onLongChange={setIn(setLong, item.problem.id)}
              onExpandedChange={setIn(setExpanded, item.problem.id)}
            />
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * One problem as a card: a header strip (number, link, difficulty, Conf, edited date,
 * Edit), then the note, collapsed to a preview when long. A problem without a note is a
 * slim card, the header alone, with "+ Add note".
 */
function DocumentEntry({
  item: { problem, note, confidence },
  onOpen,
  long,
  expanded,
  onLongChange,
  onExpandedChange,
}: {
  item: DocumentItem;
  onOpen: (problem: Problem) => void;
  long: boolean;
  expanded: boolean;
  onLongChange: (long: boolean) => void;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const heading = (
    <div
      className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 ${
        note ? "border-b border-line bg-surface-head py-2.5" : "py-2"
      }`}
    >
      <span className="font-mono text-xs text-ink-faint">
        {problem.position}.
      </span>
      <h3 className="contents">
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:text-accent hover:underline ${
            note
              ? "text-[15px] font-semibold text-ink-strong"
              : "text-sm font-medium text-ink-soft"
          }`}
        >
          {problem.title}
          <span aria-hidden="true" className="text-ink-faint">
            {" "}
            ↗
          </span>
        </a>
      </h3>
      <DifficultyBadge difficulty={problem.difficulty} />
      {confidence !== null && (
        <span className="font-mono text-[11px] text-ink-faint">
          Conf {confidence}
        </span>
      )}
      <span className="flex items-baseline gap-3 max-sm:w-full sm:ml-auto">
        {note ? (
          <>
            <span className="text-[11px] text-ink-faint">
              edited {formatSavedAt(note.updatedAt)}
            </span>
            <button
              type="button"
              onClick={() => onOpen(problem)}
              aria-label={`Edit note for ${problem.title}`}
              className="text-xs font-medium text-ink-soft underline underline-offset-[3px] hover:text-accent"
            >
              Edit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(problem)}
            aria-label={`Add a note for ${problem.title}`}
            className="rounded-md border border-dashed border-line-strong px-2 py-px text-xs text-ink-faint hover:border-ink-faint hover:text-ink"
          >
            + Add note
          </button>
        )}
      </span>
    </div>
  );

  return (
    // Space between the cards, not a line, separates notes; a note's own `---` is dashed.
    // scroll-mt clears the sticky app header when Show less scrolls back here.
    <section
      data-note-card
      className={`scroll-mt-20 overflow-hidden rounded-card border border-line-strong bg-surface ${
        note ? "mb-4" : "mb-2"
      }`}
    >
      {heading}
      {note && (
        <div className="px-4 pt-3 pb-4">
          <CollapsibleNote
            long={long}
            expanded={expanded}
            onLongChange={onLongChange}
            onExpandedChange={onExpandedChange}
          >
            <MarkdownView markdown={note.body} />
          </CollapsibleNote>
        </div>
      )}
    </section>
  );
}

/** An on/off switch (`role="switch"`): its label, then the switch at the far right. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink"
    >
      {label}
      <span
        aria-hidden="true"
        className={`relative h-4 w-7 flex-none rounded-full border ${
          checked
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface-3"
        }`}
      >
        <span
          className={`absolute top-0.5 size-2.5 rounded-full ${
            checked ? "left-3.5 bg-on-accent" : "left-0.5 bg-ink-faint"
          }`}
        />
      </span>
    </button>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────

/** The results for `q`: note text from the server, and problem names matched here. */
export function NoteSearchResults({
  q,
  catalog,
  index,
  onOpen,
}: {
  q: string;
  catalog: CatalogResponse;
  index: readonly NoteSummary[];
  onOpen: (problem: Problem) => void;
}) {
  const search = useNoteSearch(q);

  if (search.isError) {
    return (
      <ErrorLine
        message="Couldn't search your notes."
        detail={search.error.message}
        onRetry={() => void search.refetch()}
      />
    );
  }
  if (!search.data) {
    return <p className="text-sm text-ink-faint">Searching…</p>;
  }

  const hits = searchHits(catalog, index, search.data, q);
  return (
    <div>
      <p
        aria-live="polite"
        className="mb-2 border-b border-line pb-3 text-xs text-ink-faint"
      >
        <b className="font-semibold text-ink-strong">{hits.length}</b>{" "}
        {hits.length === 1 ? "note matches" : "notes match"} “{q}”
      </p>
      {hits.length === 0 ? (
        <p className="mt-4">
          <Box>No notes match “{q}”.</Box>
        </p>
      ) : (
        <ul>
          {hits.map((hit) => (
            <li key={hit.problem.id}>
              <button
                type="button"
                onClick={() => onOpen(hit.problem)}
                className="-mx-2.5 block w-[calc(100%+1.25rem)] rounded-control px-2.5 py-3 text-left hover:bg-hover"
              >
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="text-sm font-semibold text-ink-strong">
                    {hit.nameMatch ? (
                      <Highlighted text={hit.problem.title} q={q} />
                    ) : (
                      hit.problem.title
                    )}
                  </span>
                  <DifficultyBadge difficulty={hit.problem.difficulty} />
                  <span className="text-[11px] text-ink-faint">
                    {hit.categoryName} · edited {formatSavedAt(hit.updatedAt)}
                  </span>
                  {hit.nameMatch && hit.snippet === null && (
                    <span className="rounded border border-line-strong px-1 font-mono text-[10px] text-ink-faint">
                      name match
                    </span>
                  )}
                </span>
                {hit.snippet !== null && (
                  <span className="mt-0.5 block text-[13px] text-ink-soft">
                    <Highlighted text={hit.snippet} q={q} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Highlighted({ text, q }: { text: string; q: string }) {
  return highlightParts(text, q).map((part, i) =>
    part.match ? (
      <mark
        key={i}
        className="rounded-sm bg-amber-bg px-px text-ink-strong ring-1 ring-amber-edge"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

// ── Shared states ───────────────────────────────────────────────────────────

export function Box({ children }: { children: React.ReactNode }) {
  return (
    <span className="block rounded-card border border-dashed border-line-strong px-6 py-7 text-center text-sm text-ink-soft">
      {children}
    </span>
  );
}

export function ErrorLine({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <p
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-rose-edge bg-rose-bg px-3.5 py-3 text-sm text-rose"
    >
      <span>
        {message} {detail}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded border border-current px-2.5 py-0.5 text-xs hover:bg-rose-bg"
      >
        Try again
      </button>
    </p>
  );
}

/** Plain grey lines while loading (no animation, DESIGN-BRIEF.md §1). */
export function DocumentPlaceholder() {
  return (
    <div aria-busy="true" aria-label="Loading notes">
      <div className="mb-3 h-5 w-2/5 rounded bg-surface-3" />
      <div className="mb-6 h-3 w-1/4 rounded bg-surface-3" />
      {["w-11/12", "w-3/4", "w-5/6", "w-3/5", "w-11/12", "w-2/3"].map(
        (w, i) => (
          <div key={i} className={`my-2.5 h-3 rounded bg-surface-3 ${w}`} />
        ),
      )}
    </div>
  );
}
