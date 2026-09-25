# Progress

**Current phase:** Phases 1–6 are done; Phase 6 was committed as `7cdd9d5` (2026-09-25). The restyle (Stitch design) and theme switch are done, checked by the owner in the browser and committed as `dcd7f1c` (in `docs/HISTORY.md`). Phase 7 part A (the Dashboard) was committed as `c22f9a6` (in `docs/HISTORY.md`). Phase 7 is done (in `docs/HISTORY.md`). **Phase 8 part A (the Note panel) is done:** checked by the owner in the browser and committed (latest entry). **Next:** Phase 8 part B, the Notes section, then the full `code-review` of Phases 6–8.

## Phase log

Only the latest entry is kept here; older entries are in `docs/HISTORY.md`.

### Phase 8 part A — Note panel — 2026-09-25

- **Design:** the owner approved twelve additions to the Note panel (`DESIGN-BRIEF.md` §7) without a mockup: header with category; seven toolbar buttons with Ctrl+B/I; `###` headings (they nest under the export's `##`); the full save-status set; a counter from 18,000; Delete and empty-save confirmation; the unsaved-changes question on close and the browser's tab warning; one conflict wording (and a "deleted elsewhere" variant); the note rechecked on tab focus; loading and error states; a full-height sheet on phones; small details. Recorded in `DESIGN-BRIEF.md` §7 and `PLAN.md` §8.4.
- **Built:**
  - `react-markdown` and `remark-gfm` installed (approved in §2).
  - `client/markdownToolbar.ts` (tested first): each toolbar action turns text + selection into new text + selection; toggles off again; placeholders selected.
  - `client/noteDraft.ts` (tested first, one test at a time): the editor's reducer. A fetched note replaces the text only when nothing here is unsaved, or its text equals ours; otherwise it is a conflict. Fetches are ignored while this panel's save is on its way. `baseVersionToSend` gives "Keep mine" the newer version.
  - `formatSavedAt` in `format.ts` ("10:42 PM" today, else "23 Sep"; the device's clock, since it is a timestamp).
  - `useNote` (404 → `null`, `staleTime: 0` so tab focus refetches) and the key `note(id)`, kept outside `["notes"]` so a save can set it while invalidating the index, category notes and search. One note save in `mutations.ts` (`PUT`; an empty body deletes, so Delete keeps the version check), in the header pill; `useNoteSave` clears its failure from the pill when the panel closes (`SaveTracker.dismissFailed`), so Retry can't send discarded text.
  - `Dialog`: a `wideDrawer` placement (560 px; full height on phones). When the browser force-closes a dialog (a second Escape), it now reopens and lets the parent decide, so the panel stays behind its "Discard?" question.
  - `MarkdownView`, `NoteEditor` (tabs, toolbar through `execCommand("insertText")` so Ctrl+Z undoes it, bottom bar, banner, confirmations), `NoteDrawer` (header, locked loading/error state). `ConfirmDialog` takes a `cancelLabel`.
  - `NotesButton` opens the panel from table rows, phone cards and dashboard rows (overlay kind `note` in `ProblemTable`; `noteFor` in `ReminderPanel`).
- **Checks:** lint, typecheck and 615 tests pass (68 new); `next build` compiles.
- **Owner's browser check (2026-09-25):** everything works. Committed.
- **Next (part B):** the Notes section (`/notes/[categoryId]`: category list with counts, category document, search, downloads; its Edit opens `NoteDrawer`), §8.6 polish, component tests, then the **full `code-review`** of Phases 6–8 (from `7cdd9d5`'s parent, the commit that started Phase 6). Raise then: font sizes are per component, not tokens (owner, 2026-09-25).

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Neon connection strings end with `&channel_binding=require`.** Checked in Phase 1: `pg` 8.23 connects with it on all three URLs; keep it.
- **`sslmode`: use `verify-full`.** Neon's dashboard gives `sslmode=require`; `pg` 8 treats that as `verify-full` but warns on every connection that `pg` 9 will weaken it. Change it when pasting any new URL (including production in Phase 9).
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.
- **Port 3000 belongs to the owner's other local apps.** RevCode runs on 3100. Never stop a process that isn't RevCode's. Exception (owner decision, 2026-09-24): a RevCode `next dev` already on 3100, e.g. left by an earlier session, may be reused or stopped and restarted. Check the process's command line or working folder first; anything else is reported, not stopped.
- **`@next/env` from ESM:** use `import nextEnv from "@next/env"`; the named import `{ loadEnvConfig }` fails at runtime under `"type": "module"`.
- **Imports between `scripts/` and `src/` go one way only.** Scripts may import from `src/domain` (for example, `Difficulty` in Phase 2); `src/` never imports from `scripts/`.
- **Zod 4 and literal types.** `z.literal([1, 2, 3])` accepts several literals; use it (with the shared `as const` arrays) instead of `z.union`. For type-level tests, a `readonly` tuple type is not assignable to a mutable one: compare against `[...T]`.
- **Reordering the catalog later would break the seed.** `category.name`, `category.position` and `problem (category_id, position)` are UNIQUE and not deferrable, so an upsert that swaps two positions or renames into an existing name fails. Not an issue today (ids and order are fixed); a future catalog change needs a migration that makes those constraints `DEFERRABLE`.
- **Proxy matcher escaping (Phase 3).** Next compiles `config.matcher` with one level of backslash escaping removed. Write a literal dot as `\\.` in the TypeScript source (the JS string `\.`); a single backslash turns it into "any character", and the proxy then silently skips every page but `/`. `proxy.test.ts` compiles the matcher with Next's own function to catch this. Pages stay protected either way (`requireSession()`), so the bug is easy to miss.
- **Git Bash rewrites backslashes in command arguments** (for example in `node -e '…'`), so regex checks run that way can mislead. Put the code in a file, or use the editor, for anything with backslashes.
- **Generating Better Auth migrations (Phase 3).** `npx auth@<better-auth version> generate --config src/server/auth.ts --output db/migrations/NNN_x.sql --yes` needs `.env.local` loaded, since `auth.ts` validates the config. `NODE_OPTIONS=--env-file=…` breaks `npx` on Windows ("Could not determine Node.js install directory"); instead run the cached CLI directly: `node --env-file=.env.local <npm cache>/_npx/<hash>/node_modules/auth/dist/index.mjs generate …`. It only reads the schema to diff; it doesn't write to the database. Pin the CLI to the installed `better-auth` version.
- **Stale route types after moving a page.** `npm run typecheck` failed on `.next/dev/types/validator.ts` still pointing at the old `src/app/page.tsx`. Deleting `.next/dev/types` (generated) fixes it; check first that no dev server is running.
- **Sign-in shows `?error=invalid_code`.** The real reason is in the dev server log (`[Better Auth]` error). In Phase 3 it was `invalid_client`: the Client secret had been pasted three times into `.env.local`. Google shows a client secret only once, at creation; a lost one is replaced with "Add secret" on the client.
- **After changing `.env.local`, restart the dev server.** `getConfig()` and the Better Auth instance are built once per server process.

- **Database tests (Phase 4).** They run in the `db` Vitest project (`npm test` runs both projects; `npx vitest run --project db` runs only these). Each test waits on Neon round trips, so the `db` project takes a while; keep test counts sensible. `test/setup/env.ts` must stay the **first** setup file: `src/server/db.ts` reads `DATABASE_URL` when first imported.
- **A module that imports `@/server/db` or `@/server/auth` can't load without the environment**, because both validate config at import. A unit test of such a module mocks them (`vi.mock("@/server/auth", …)`, `vi.mock("@/server/db", …)`), as `handler.test.ts` and `account.service.test.ts` do.
- **Freezing "today" in tests:** `vi.useFakeTimers({ now, toFake: ["Date"] })`. Fake only `Date`, since `pg` needs real timers.
- **Testing a race deterministically:** a separate `pg.Client` inserts the row inside an open transaction, and both requests then block on the primary key. The test polls `pg_stat_activity` for two `Lock` waits and rolls back, and exactly one request wins (`routes.test.ts`).
- **Only scalar `DATE` is parsed as a string.** `db.ts` registers the parser for type 1082 only; a `DATE[]` column (type 1182) would still come back as `Date` objects. Select dates as separate columns, as `progress.repository.ts` does.
- **Python `write_text` on Windows writes CRLF** (Phase 5). An edit script that uses `Path.write_text` turns an LF file into CRLF; Prettier fixes `.ts` files, but not Markdown it doesn't format. Use `write_bytes(s.encode())`. `grep -c $'\r'` in Git Bash matches every line, so count CR bytes with `tr -cd '\r' < file | wc -c`.
- **Better Auth `deleteUser` without a password** throws `APIError` `BAD_REQUEST` with `body.code === "SESSION_EXPIRED"` for a stale session (not `SESSION_NOT_FRESH`). `account.service.ts` maps it.
- **Tailwind's default colours are removed** (Phase 6, `globals.css` `--color-*: initial`). A class like `text-red-600` or `bg-white` now produces nothing, silently. Use the design tokens (`text-rose`, `bg-surface`, …).
- **Browser errors are logged to `.next/dev/logs/next-development.log`** (Next 16 forwards browser console errors to the dev server). When the dev overlay shows an "Issue" in the owner's browser, read this file instead of asking for a screenshot. Browser extensions (Grammarly) caused the first one.
- **One-off `tsx` scripts outside the project** (e.g. in the scratchpad) need the `.mts` extension for top-level `await`, because only the project's `package.json` says `"type": "module"`.
- **Python edit scripts must read with `read_text(encoding="utf-8")`** (Phase 6). Without it, Windows reads the file as cp1252, and writing it back as UTF-8 garbles every non-ASCII character (`§` becomes `Â§`, `✓` becomes `âœ“`). Printing non-ASCII text also fails in the console unless `PYTHONIOENCODING=utf-8` is set. Long Bash heredocs with many quotes can fail to parse here; put such scripts in a file.
- **jsdom has no `<dialog>` behaviour** (checked in jsdom 30.1: `HTMLDialogElement` is an empty class). `test/setup/dom.ts` adds `showModal`, `show` and `close` stand-ins that only set the `open` attribute. Focus containment, the inert page and Escape come from the real browser, so tests fire `cancel` themselves, and those three behaviours are checked by hand. The same file stubs `matchMedia` (every query matches, so components render the wide layout).
- **React passes `<dialog>` `cancel` and `close` events up the component tree**, although the browser doesn't bubble them. A dialog opened inside another (the unmark confirmation inside the Edit panel) would close both. `Dialog` handles only events whose `target` is its own element.
- **A dialog's `close` event fires a moment after `close()`.** In development, React's StrictMode remount closes and reopens each dialog, and the late event would close it again; `Dialog` ignores `close` while `open` is true.
- **Seed a component test's query data before rendering** (`renderWithClient`'s `seed`). Data set afterwards races the component's own fetch, and that fetch's 404 turns the query into an error.
- **ESLint `react-hooks/set-state-in-effect`** rejects `setState` in an effect body. To reset state when data changes, adjust it during render (as `ProblemTable` does for an overlay that no longer fits).

- **`npm run format` formats everything Prettier knows, HTML included.** Reference files that must stay as delivered go in `.prettierignore` (as `designs/` now does).
- **Time zone names differ between ICU versions.** Node 24's `Intl.supportedValuesOf("timeZone")` lists `Asia/Calcutta`, not `Asia/Kolkata`. Never assume a zone is in the list; `timeZoneOptions` always adds UTC and the saved zone.
- **jsdom has no `document.execCommand`.** The note toolbar uses it (so Ctrl+Z undoes a toolbar change) and falls back to setting the text, which is the path component tests take. Undo after a toolbar click is checked by hand.
- **react-markdown passes a `node` prop to custom components.** Spread onto an HTML element it becomes a bogus attribute; `MarkdownView`'s `htmlProps` drops it.
- **Sticky offsets are stacked by hand.** The app header is `h-14`, the table headings stick at `top-14` with `h-10`, and category rows stick at `top-24`. Changing one height means changing the offsets below it.

## Owner to-do (outside the code)

- [x] Neon **development** project created (2026-09-24), currently named **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [x] **Node.js 24 LTS** installed (v24.21.0, checked 2026-09-24).
- [x] Neon `dev` and `test` branches created (auto-delete: never); the 3 database lines in `.env.local` are filled and format-checked (dev pooled + direct, test direct, all Singapore). Phase 1 only needs to verify a real connection.
- [x] Google OAuth client created (2026-09-24): Google Cloud project `RevCode`, consent screen External in **Testing** mode, the owner's account as a test user, web client "RevCode local" with origin `http://localhost:3100` and redirect URI `http://localhost:3100/api/auth/callback/google`. ID and secret are in `.env.local`.
- [ ] Optional, any time: rename the current Neon project to **`RevCode-dev`** so it isn't mistaken for production.
- [ ] Phase 9: create a **new Neon project `RevCode`** (AWS Singapore) for production, then create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
