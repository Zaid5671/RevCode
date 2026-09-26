# Progress

**Current phase:** Phases 1–8 are done (their entries are in `docs/HISTORY.md`). Phase 8's review was dropped by the owner (2026-09-26). **Phase 9, Go live, in progress:** the launch is private (Google's Testing mode); the security review is done and its one fix built. **Next: deployment and the QA checklist** (latest entry).

## Phase log

Only the latest entry is kept here; older entries are in `docs/HISTORY.md`.

### Phase 9 — Go live — 2026-09-26

- **Private launch** (owner, 2026-09-26): the Google consent screen stays in Testing mode; public later. See `PLAN.md` §0 "Launch" and the "Plan change — private launch" entry in `docs/HISTORY.md`.
- **Security review, done by hand:** the `security-review` skill fails here, since it diffs against `origin/HEAD`, which this repo doesn't have. Targeted at the owner's request: `withHandler`, auth, config, proxy, every API route, every repository query, migrations, `MarkdownView` and the theme script. Fine: every per-user query binds the session user id; every route but `/api/auth/*` checks the session; the origin check blocks cross-site mutations; Zod and size limits on all input; parameterised SQL; raw HTML in notes is shown as text and `javascript:` links dropped; logs leave out bodies, cookies and headers; the export file name is sanitised and `no-store`; account deletion cascades.
- **Fixed:** `/api/health` was public and ran `SELECT 1`, so anyone could keep the production database awake around the clock (roughly 180 of the 100 free CU-hours a month). It now requires a session (owner decision; `PLAN.md` §7 updated), and `routes.test.ts` covers its 401. `withHandler`'s `public` option is unused now but kept.
- **Not fixed (recommended to leave for the private launch):** anyone can start a Google sign-in (Better Auth's rate limit applies; Google then blocks accounts not on the test list); no security headers such as `X-Frame-Options`. Revisit both before going public.
- **Checks:** lint, typecheck, format and the full `npm test` pass (659 tests; `SolveForm`'s "defaults to the server's today…" failed once under the full run's load and passes on its own and in the unit + components run).
- **Next:** commit this, then deployment: the owner creates the production Neon project; Vercel project with `vercel.json` region `sin1`; env vars; the production redirect URI in Google; migrate + seed `production`; privacy/terms pages; the QA checklist (`PLAN.md` §12) on the live site. Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). After Phase 9 the owner will bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch.

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
- **jsdom has no layout, `ResizeObserver` or `scrollIntoView`.** `test/setup/dom.ts` adds stand-ins: the observer reports height 0 once, so every note is short. A test of long notes stubs its own `ResizeObserver` (`NotesSection.test.tsx` makes notes containing "LONG" 900 px tall); the real sizes and the fade are checked by hand.
- **jsdom has no `document.execCommand`.** The note toolbar uses it (so Ctrl+Z undoes a toolbar change) and falls back to setting the text, which is the path component tests take. Undo after a toolbar click is checked by hand.
- **react-markdown passes a `node` prop to custom components.** Spread onto an HTML element it becomes a bogus attribute; `MarkdownView`'s `htmlProps` drops it.
- **The `security-review` skill doesn't run in this repo.** It diffs against `origin/HEAD`, which doesn't exist here, so it fails before starting. Do the review by hand instead (as in Phase 9).
- **`SolveForm.test.tsx` can fail under the full `npm test` load** ("defaults to the server's today…", can't find the confidence button). It passes on its own; rerun before treating it as a real failure.
- **Sticky offsets are stacked by hand.** The app header is `h-14`, the table headings stick at `top-14` with `h-10`, and category rows stick at `top-24`. Changing one height means changing the offsets below it.

## Owner to-do (outside the code)

- [x] Neon **development** project created (2026-09-24), currently named **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [x] **Node.js 24 LTS** installed (v24.21.0, checked 2026-09-24).
- [x] Neon `dev` and `test` branches created (auto-delete: never); the 3 database lines in `.env.local` are filled and format-checked (dev pooled + direct, test direct, all Singapore). Phase 1 only needs to verify a real connection.
- [x] Google OAuth client created (2026-09-24): Google Cloud project `RevCode`, consent screen External in **Testing** mode, the owner's account as a test user, web client "RevCode local" with origin `http://localhost:3100` and redirect URI `http://localhost:3100/api/auth/callback/google`. ID and secret are in `.env.local`.
- [ ] Optional, any time: rename the current Neon project to **`RevCode-dev`** so it isn't mistaken for production.
- [ ] Phase 9: create a **new Neon project `RevCode`** (AWS Singapore) for production, then create the Vercel project, set production environment variables, add the production redirect URI in Google. The consent screen stays in Testing mode (private launch).
