# Progress

**Current phase:** Phases 1–6 are done; Phase 6 was committed as `7cdd9d5` (2026-09-25). The restyle (Stitch design) and theme switch are done, checked by the owner in the browser and committed as `dcd7f1c` (in `docs/HISTORY.md`). Phase 7 part A (the Dashboard) was committed as `c22f9a6` (in `docs/HISTORY.md`). Phase 7 is done (in `docs/HISTORY.md`). **Phase 8 part A (the Note panel) is done:** checked by the owner in the browser and committed as `9997121` (in `docs/HISTORY.md`; its "Next (part B)" bullet lists what part B holds). **The Problems table restyle is done** (latest entry): checked by the owner and committed. **Next:** Phase 8 part B, the Notes section, then the full `code-review` of Phases 6–8.

## Phase log

Only the latest entry is kept here; older entries are in `docs/HISTORY.md`.

### Problems table restyle — 2026-09-25

The owner approved a new look for the Problems table **rows and cells only**. The columns stay the same, and so does the behaviour. Reference mock-up: `designs/problems_pg_desgin2/` (`screen.png`, `code.html`, `DESIGN.md`; not yet committed). Its sample data is inconsistent (e.g. R1 due but Next says "R2"), so follow the rules below, not its numbers. Build it, update `DESIGN-BRIEF.md` §1 and §4 to match, show the owner in the browser, then commit.

- **Revisions (R1–R3):** done = green `✓ 18 Aug` (a space after the tick). The next pending revision = the date in a small bordered pill with an empty circle `○` inside, after the date; the circle is the mark-done button (tick on hover) and opens the existing date popover. The pill is neutral for upcoming, amber for today, rose for overdue. Projected = plain faint date, **no brackets**. The ✓ now only ever means "done".
- **Next column:** relative, not a repeated date: `● R2 · in 3 days`, `● R1 · today`, `● R2 · 3d late`, `● Complete` (use `formatRelativeDue`). Dot colour: rose overdue, amber today, **blue within 7 days** (tomorrow + next 7 days), grey later, green complete.
- **Difficulty:** the full word `Easy` / `Medium` / `Hard` in green / amber / rose text. No box, no pill.
- **Dates** in Inter with even-width (tabular) digits, not the mono font. Mono stays for `#` and counts.
- **All dates in a column start at the same left edge** (the due pill too).
- **Conf:** plain text colour (not teal), still the ghost select.
- **Unsolved rows:** blank cells instead of `–` dashes; the row stays faded; difficulty keeps its colour.
- **Notes column must still show which problems have notes:** a clear note icon when a note exists, a faint `+` when not(a faint `+` appears on when user hovers over the row so a faint `+` should only appear for solved prblems permenatly , keep the hover animation as it is ). 
- **Folder headers:** `7 / 22` only; drop the words "problems solved". `● N due` pill stays.
- **Rejected from the mock-up:** the "75 total" pill beside the title, the `⌘K` hint in search, the background glow, and a serif font for the title (Inter everywhere; the owner can revisit).
- Files: mainly `RevisionCell`, `Badges` (`DifficultyBadge`, `StatusLabel`), `ProblemRow`, `CategoryGroup`; check the phone cards (`DESIGN-BRIEF.md` §4) and the dashboard rows, which reuse `StatusLabel`, still read well.
- **Owner decisions while building (2026-09-25):** the difficulty word is used everywhere (dashboard, Edit and Note panels, phone cards); the relative Next label is table-only (`StatusLabel relative`), since the other places need the date; in it only overdue and today colour the words; the whole due pill is the button; the phone card's mark-done button is a `○` too; Conf stays mono.
- **Built:** `DifficultyBadge` is a coloured word; `StatusLabel` has a `relative` mode; `RevisionCell` has the `○` pill (`DoneCircle`, tick on `group-hover/done`) and Inter tabular dates; `ProblemRow` drops the `–` placeholders, uses Inter for the solved date and shows `+` on solved rows always; `NotesButton`'s note icon is ink (accent on hover); the phone card's date line is Inter. Folder headers and Conf needed no change. `DESIGN-BRIEF.md` §1 and §4 updated. Lint, typecheck, format and 615 tests pass.
- **Owner's browser check (2026-09-25):** everything works and looks right.
- **Two follow-ups (owner, 2026-09-25), built:** the folder count sits beside the category name in a rounded pill (`● N due` stays far right); the Problems page (title, controls, table) is capped at 1280 px and centred, Problems only (`problems/page.tsx`). `DESIGN-BRIEF.md` §4 updated. Lint, typecheck, format and component tests pass.
- **Owner approved the follow-ups; committed** (with `designs/problems_pg_desgin2/`).

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
