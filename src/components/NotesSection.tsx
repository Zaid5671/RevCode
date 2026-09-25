"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  countNotes,
  defaultCategoryId,
  parseCategoryParam,
} from "@/client/notesView";
import { useCatalog, useNotesIndex, useProgress } from "@/client/queries";
import type { Category, Problem } from "@/domain/schemas";
import { NoteDrawer } from "./NoteDrawer";
import {
  Box,
  CategoryDocument,
  DocumentPlaceholder,
  ErrorLine,
  LINK,
  NoteSearchResults,
} from "./NotesDocument";
import { FIELD } from "./Select";

/** The API's limit for a search (`noteSearchQuerySchema`). */
const MAX_QUERY = 200;
/** How long the search waits after the last keystroke. */
const SEARCH_DELAY_MS = 250;

/** The search as it stands in the URL: trimmed, and never longer than the API allows. */
function queryFrom(text: string) {
  return text.trim().slice(0, MAX_QUERY);
}

function writeQuery(q: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("q") === (q || null)) return;
  if (q) url.searchParams.set("q", q);
  else url.searchParams.delete("q");
  // Replacing (not pushing), as on the Problems page: Back leaves the page instead of
  // undoing each keystroke. Next.js keeps useSearchParams in step with it.
  window.history.replaceState(null, "", url);
}

/**
 * The Notes section (PLAN.md §8.4, DESIGN-BRIEF.md §5): the categories and a search box on
 * the left, and on the right one category as a document, or the search results while the
 * box has text. `categoryParam` is `/notes/[categoryId]`'s value, or null on `/notes`,
 * which opens the first category with notes.
 */
export function NotesSection({
  categoryParam,
}: {
  categoryParam: string | null;
}) {
  const searchParams = useSearchParams();
  const catalog = useCatalog();
  const index = useNotesIndex();
  const progress = useProgress();
  // The box keeps its own text; the URL (and so the search) follows a moment later.
  const [text, setText] = useState(() => searchParams.get("q") ?? "");
  const q = queryFrom(searchParams.get("q") ?? "");
  const [noteFor, setNoteFor] = useState<Problem | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => writeQuery(queryFrom(text)),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [text]);

  function clearSearch() {
    setText("");
    writeQuery("");
  }

  const queries = [catalog, index, progress];
  const failed = queries.find((query) => query.isError);
  const loaded = catalog.data && index.data && progress.data;

  let main: React.ReactNode;
  let sidebar: React.ReactNode = <SidebarPlaceholder />;
  if (failed) {
    main = (
      <ErrorLine
        message="Couldn't load your notes."
        detail={failed.error?.message}
        onRetry={() =>
          queries.forEach((query) => query.isError && query.refetch())
        }
      />
    );
  } else if (!loaded) {
    main = <DocumentPlaceholder />;
  } else {
    const categoryId =
      categoryParam === null
        ? defaultCategoryId(catalog.data, index.data)
        : parseCategoryParam(categoryParam, catalog.data);
    const categories = [...catalog.data.categories].sort(
      (a, b) => a.position - b.position,
    );
    sidebar = (
      <CategoryList
        categories={categories}
        counts={countNotes(catalog.data, index.data)}
        currentId={categoryId}
        hasNotes={index.data.length > 0}
        onNavigate={clearSearch}
      />
    );
    const category = categories.find((c) => c.id === categoryId);
    if (q) {
      main = (
        <NoteSearchResults
          q={q}
          catalog={catalog.data}
          index={index.data}
          onOpen={setNoteFor}
        />
      );
    } else if (!category) {
      main = (
        <Box>
          There&apos;s no such category.{" "}
          <Link href="/notes" className={LINK}>
            Go to your notes
          </Link>
        </Box>
      );
    } else if (index.data.length === 0) {
      main = (
        <Box>
          You haven&apos;t written any notes yet.
          <br />
          On the{" "}
          <Link href="/problems" className="font-semibold text-ink-strong">
            Problems
          </Link>{" "}
          page, use the <b className="text-ink-strong">+</b> in the Notes column
          to add one.
        </Box>
      );
    } else {
      main = (
        <CategoryDocument
          key={category.id}
          category={category}
          catalog={catalog.data}
          entries={progress.data.entries}
          onOpen={setNoteFor}
        />
      );
    }
  }

  const categoryName = (problem: Problem) =>
    catalog.data?.categories.find((c) => c.id === problem.categoryId)?.name ??
    "";

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="grid items-start gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-14">
        <aside className="md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-ink-strong">
            Notes
          </h1>
          <SearchBox text={text} onChange={setText} onClear={clearSearch} />
          {sidebar}
        </aside>
        <section aria-label="Notes" className="min-w-0">
          {main}
        </section>
      </div>
      {noteFor && (
        <NoteDrawer
          problem={noteFor}
          categoryName={categoryName(noteFor)}
          onClose={() => setNoteFor(null)}
        />
      )}
    </div>
  );
}

// ── Left column ─────────────────────────────────────────────────────────────

function SearchBox({
  text,
  onChange,
  onClear,
}: {
  text: string;
  onChange: (text: string) => void;
  onClear: () => void;
}) {
  return (
    <div role="search" className="relative mb-4">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 3.5a7.5 7.5 0 0013.15 13.15z" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && text && onClear()}
        placeholder="Search notes…"
        aria-label="Search notes"
        maxLength={MAX_QUERY}
        className={`${FIELD} w-full pr-8 pl-9 placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden`}
      />
      {text && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:bg-surface-3 hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

/**
 * The 18 categories with their note counts; a dropdown on phones. The current one has an
 * accent bar. Following a category clears the search.
 */
function CategoryList({
  categories,
  counts,
  currentId,
  hasNotes,
  onNavigate,
}: {
  categories: readonly Category[];
  counts: Map<number, number>;
  currentId: number | null;
  hasNotes: boolean;
  onNavigate: () => void;
}) {
  const router = useRouter();
  return (
    <>
      <select
        aria-label="Category"
        value={currentId ?? ""}
        onChange={(e) => {
          onNavigate();
          router.push(`/notes/${e.target.value}`);
        }}
        className={`${FIELD} w-full px-3 md:hidden`}
      >
        {currentId === null && <option value="">Choose a category</option>}
        {categories.map((c) => {
          const n = counts.get(c.id) ?? 0;
          return (
            <option key={c.id} value={c.id}>
              {n > 0 ? `${c.name} (${n})` : c.name}
            </option>
          );
        })}
      </select>

      <nav aria-label="Categories" className="max-md:hidden">
        <ul>
          {categories.map((c) => {
            const n = counts.get(c.id) ?? 0;
            const current = c.id === currentId;
            return (
              <li key={c.id}>
                <Link
                  href={`/notes/${c.id}`}
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-r-md border-l-2 px-2.5 py-1.5 text-[13px] ${
                    current
                      ? "border-accent bg-surface-2 font-medium text-ink-strong"
                      : `border-transparent hover:bg-hover hover:text-ink ${
                          n > 0 ? "text-ink-soft" : "text-ink-faint"
                        }`
                  }`}
                >
                  <span className="min-w-0 truncate">{c.name}</span>
                  {n > 0 && (
                    <span className="flex-none font-mono text-[11px] text-ink-faint">
                      <span className="sr-only">, notes: </span>
                      {n}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {hasNotes ? (
          <a
            href="/api/notes/export"
            download
            className="mt-4 inline-block text-xs text-ink-soft underline underline-offset-2 hover:text-accent"
          >
            Download all notes (.md)
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="No notes to download yet"
            className="mt-4 inline-block text-xs text-ink-ghost"
          >
            Download all notes (.md)
          </span>
        )}
      </nav>
    </>
  );
}

function SidebarPlaceholder() {
  return (
    <div aria-hidden="true" className="max-md:hidden">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="my-3 h-3 w-3/4 rounded bg-surface-3" />
      ))}
    </div>
  );
}
