# Progress

**Current phase:** Phase 5 — Notes API (not started). Phases 1–4 are done.

## Carried-over tasks

- [ ] **Phase 5 must replace the dashboard's note placeholders.** Phase 4's `GET /api/dashboard` returns `hasNote: false` on every item and `stats.notes: 0`, because `problem_note` (`005_notes.sql`) doesn't exist yet (owner decision, 2026-09-24). Phase 5 must compute both from `problem_note` for the session user and add a service test that proves them (a note on a due problem sets `hasNote: true`; the count matches the user's notes and ignores other users'). Phase 5 isn't done until this box is ticked.

## Phase log

Newest last. One entry per finished phase: date, what was built, decisions made, anything the next phase should know.

### Planning — 2026-09-23

- `PLAN.md` v2 written and approved by the owner. It replaces `PLAN.old.md`.
- Settled in the planning session (all recorded in `PLAN.md` §0): one Next.js app on Vercel; Neon Postgres with three branches (`production`, `dev`, `test`; the owner confirmed keeping `test` separate so test runs never wipe `dev`); Google-only login; the default gaps and editable per-user gaps; the dashboard's four sections; the problem row layout; Markdown notes (including on unsolved problems) and the Notes section; `react-markdown` + `remark-gfm` approved.

### Design — 2026-09-24

- `docs/DESIGN-BRIEF.md` written, then simplified at the owner's request to continue the original HTML tracker's look (its exact colours and fonts: Fraunces / IBM Plex Sans / IBM Plex Mono). The owner approved the simplified version.
- Dashboard: stats strip + "Revise now" (overdue + today) + "Coming up" (tomorrow + next 7 days), as compact chips.
- Problems page: 18 collapsible category folders, no pagination; the header shows `solved / total` and `● N due` (overdue + today); all collapsed on first visit; open state remembered per browser.
- Solve dialog saves on a confidence click; the next revision can be marked done from the table cell.
- `PLAN.md` §0, §1, §3, §8.2, §8.3, §11 and §12 updated to match.
- **Phases reduced from 12 to 9** (owner request): old 1+3 → Foundation; old 6 + import backend → Notes + import API; import UI joins Dashboard + Settings; old 11+12 → Go live + final QA; polish is now part of each UI phase.
- **External review (2026-09-24), accepted by the owner:** note conflicts use a `version` column (timestamps lose microseconds through `pg`); Better Auth `deleteUser.enabled` + fresh-session handling; **production gets its own Neon project**; `vercel.json` region `sin1`; `@vercel/functions` `attachDatabasePool` (`max: 2`, `idleTimeoutMillis: 5000`) approved; Postgres `23505`→409, `23503`→404; DB tests in a non-parallel Vitest project; nullable time zone; rule 3 checks only newly written dates; category notes at `/api/categories/:id/notes`; private catalog cache header; stats "Next 7 days" defined; CLAUDE.md got current-docs, guardrails and long-session checkpoint sections. Rejected: cutting the Notes page (owner wants it); "skills may be missing" (all installed).
- **App renamed from "Recurse" to "RevCode"** by the owner (wordmark, docs, npm package name `revcode`, notes download `revcode-notes-*.md`). The Neon project is also named `RevCode`.

### Phase 1 — Foundation — 2026-09-24

- **Built:** Next.js 16.3 app (React 19.2, Tailwind v4, strict TS with `noUncheckedIndexedAccess`, ESLint, Prettier, Vitest 5) scaffolded in a temporary `revcode/` folder and moved up; kept its `AGENTS.md`, discarded its `CLAUDE.md` and README; `@AGENTS.md` + a **Commands** section added to `CLAUDE.md`. Placeholder page only; real fonts and design tokens come in Phase 6.
- **Database:** `001_catalog.sql` (§5.2 verbatim); `scripts/migrate.ts` (`schema_migrations`, one transaction per file, advisory lock); `scripts/build-catalog.ts` → `db/seed/catalog.json`; `scripts/seed.ts` (single-statement upserts that skip unchanged rows and report inserted/updated counts). `dev` holds 18 categories and 250 problems (7 Premium, 60/155/35); migrate and seed re-runs change nothing.
- **Catalog reviewed and approved by the owner (2026-09-24).** Its ids are now permanent.
- **Tests:** builder unit tests (`scripts/build-catalog.test.ts`) and the §5.4 catalog checks (`db/seed/catalog.test.ts`).
- **Owner-approved changes, recorded in `PLAN.md`:** fixed dev port **3100** (`next dev -p 3100`; `BETTER_AUTH_URL=http://localhost:3100`; Google redirect URI `http://localhost:3100/api/auth/callback/google`; §6 and §10); Neon URLs use **`sslmode=verify-full`** (`.env.local`, `.env.example`, §10); `.gitignore` merged with the scaffold's (all existing entries kept; the scaffold's blanket `.env*` rule dropped because it would ignore `.env.example`); `neetcode_250_complete.json` moved to `data/`.
- **Other decisions:** `"type": "module"` in `package.json` (Vite warned about ESM config in a CommonJS package); `scripts/cli.ts` holds the scripts' shared helpers (`REPO_ROOT`, `withDirectClient`, `runIfMain`), added to §3; `@tailwindcss/postcss` added to the §2 companion list (Tailwind v4 needs it; `create-next-app` installs it); `@next/env` pinned in devDependencies at Next's version; Vite 8's built-in `resolve.tsconfigPaths` replaces `vite-tsconfig-paths`; `typecheck` is `next typegen && tsc --noEmit` (route type helpers such as `LayoutProps` are generated).
- **Code review (standards + spec) fixes:** ROLLBACK and advisory-unlock failures no longer hide the original error; paths resolve from the repo root, not the current directory; one `CATALOG_PATH`; clearer names in `seed.ts`; the CLI prints full errors; the catalog test also checks NeetCode slug format.
- **Next:** Phase 2 (domain logic). Read §0, §3, §4, §7.

### Plan change — legacy import removed — 2026-09-24

- **The owner removed the import from the old HTML tracker from the whole project.** `PLAN.md` §0 ("Old data"), §1, §3, §5.2 (note), §7, §8.5, §9 (now a "removed" stub; numbering kept), §11 and §12 (Phases 5, 7, 9 and the QA checklist) updated; `DESIGN-BRIEF.md` §6 lost its Import section; `CLAUDE.md` and `.gitignore` updated. Phase 5 is now **Notes API** only.
- Nothing was built for it yet, so no code changed. `problem.neetcode_slug` stays (migration 001 is applied and never edited); it is simply unused. The old HTML file stays on the owner's machine, git-ignored.
- Phase 2's `schemas.ts` must not include import shapes.

### Phase 2 — Domain logic — 2026-09-24

- **Built (test-first, all pure, in `src/domain/`):** `calendarDate.ts` (`isValidCalendarDate`, `addDays`, `compare`, `todayIn(timeZone, now?)`, `isValidTimeZone`); `gaps.ts` (`DEFAULT_GAPS`, `gapsSchema`, `Confidence`); `schedule.ts` (`computeSchedule`, `bucketFor`, plus the shared `BUCKETS`, `REVISION_STATUSES` and `REVISION_NUMBERS` constants); `timeline.ts` (`validateTimeline`); `schemas.ts` (every §7 request and response shape; **no import shapes and no account-export shape**). All tests pass, and every §4.6 case is covered.
- **`zod` 4.6 installed** (listed in §2). `Difficulty` now lives in `schemas.ts`, and `scripts/build-catalog.ts` imports it from there.
- **How `validateTimeline` works:** it takes `(next, { previous, today })` and returns the first violation (`rule`: `order` | `skipped` | `future` | `undo_not_latest`; `revision`: 1–3, or `null` for the solve date; `message`), or `null` if the timeline is valid. Passing in the previous stored state serves two rules. Rule 3 checks only dates that differ from the stored ones. Rule 5 allows removing only the latest completed revision, one per request. Rule 6 (unmarking deletes the row and keeps the note) is left to the Phase 4 service.
- **Schema decisions:**
  - Path and query ids are digit strings turned into numbers, capped at 32767 (SMALLINT), so an out-of-range id is a 400, not a Postgres error.
  - The note limit counts characters the way Postgres `char_length` does, so an emoji counts once.
  - `PATCH /api/progress` requires at least one field.
  - Search `q` is trimmed, 1–200 characters. **The owner approved this limit**, and it is recorded in `PLAN.md` §7 (the `GET /api/notes/search` row).
  - `ERROR_CODES` also includes `SESSION_NOT_FRESH` (§6) and `CONFLICT` (§7.1).
- **Code review fixes:**
  - Status and revision-number literals are now defined once, in `schedule.ts`.
  - A type-level test in `schemas.test.ts` fails `npm run typecheck` if `progressEntrySchema` stops matching the `Schedule` type.
  - Rule 5 was tightened: undoing R2 and R3 together is rejected.
  - Array schemas were added for the three notes list endpoints.
  - A test now covers R3 as the next pending revision.
- **JSON data export removed (owner decision, 2026-09-24).** `accountExportSchema` and its type check were deleted before the commit. See the plan-change entry below.
- **Not changed after review:** time zone names are not normalised, because Node rewrites `Asia/Kolkata` to the older alias `Asia/Calcutta`. A wrongly-cased name still works with `Intl`.
- **Next:** Phase 3 (Auth). Read §0, §3, §6, §7.1, §10. Needs the owner's Google OAuth client (see Owner to-do).

### Plan change — JSON data export removed — 2026-09-24

- **The owner removed "Export my data (JSON)" and `GET /api/account/export`.** Notes stay downloadable as Markdown, one category or all categories (`GET /api/notes/export`, `PLAN.md` §8.4); that is the only export in RevCode. Solve and revision dates are no longer exportable, which the owner accepted.
- Updated: `PLAN.md` §1 (Settings list; added to out of scope), §3 (`account/export/` route and "data export" in `account.service.ts` removed), §7 (route row), §8.5 (Settings button), §12 (Phases 4 and 7) and the QA checklist; `DESIGN-BRIEF.md` §6 (Settings now has four sections). The code side (`accountExportSchema`) was removed in the Phase 2 commit.
- A full search of the project found no other mention. `PLAN.old.md` (history) and the old HTML tracker's own "Export backup" button were left alone on purpose.
- Also fixed: `CLAUDE.md` said the catalog JSON "moves to `data/` in Phase 1"; it now says where the file is.

### Rule — no AI attribution in git — 2026-09-24

- **Commit messages and pull request descriptions never mention Claude** (no `Co-Authored-By: Claude` line, no "Generated with Claude Code"). The owner is the sole author. Recorded in `CLAUDE.md` Guardrails; applies to every commit.
- **History cleaned (2026-09-24, owner request).** 18 earlier commits (planning, Phase 1 and the import removal) carried a `Co-Authored-By: Claude` line. It was removed from all of them by rewriting the local history, which had never been pushed. File contents are unchanged; only commit messages and commit IDs changed, so commit IDs quoted before this date no longer exist.

### Phase 3 — Auth — 2026-09-24

- **Built:** `src/server/config.ts` (Zod-validated env on first use; errors name variables, never values; `DATABASE_URL` must use `sslmode=verify-full`); `db.ts` (one module-scope Pool, `max: 2`, `idleTimeoutMillis: 5000`, `attachDatabasePool`, DATE parser returning `YYYY-MM-DD` strings, an idle-error listener, `pingDatabase()`); `errors.ts` (`AppError`, `ERROR_STATUS`, `errorResponse`, Postgres `23514`/`23505`/`23503` mapping); `auth.ts` (Better Auth 1.7.5: Google only, shared pool, nullable `timezone` field with `input: false`, `deleteUser.enabled`, `nextCookies()` last; `getSession(headers)`); `handler.ts` (`withHandler()`); `session.ts` (`requireSession()` for pages, cached per request); `/api/auth/[...all]`, `/api/health`, `GET /api/me` (`account.service.ts` `getMe`); `/sign-in` page; `(app)/layout.tsx` + placeholder home page with a sign-out button; `proxy.ts`; `src/client/authClient.ts`; `GoogleSignInButton` and `SignOutButton` (pending and failure states).
- **Database:** `002_auth.sql` generated by Better Auth's CLI (`auth@1.7.5`, the version matching `better-auth`) and committed as generated; applied to `dev`. Tables `"user"`, `session`, `account`, `verification`; ids are `text`; **columns are camelCase and must be quoted in SQL** (`"userId"`, `"createdAt"`); `"timezone" text` is nullable with no default.
- **`withHandler()` details:** order is origin check (mutations only; a missing `Origin` passes) → session (skipped with `public: true`, used only by `/api/health`) → 64 KB body limit (checks `Content-Length` and the real size) → Zod parse of params, query and body → the route → error mapping. A route without a query schema rejects any query string. The route returns data (200 JSON), `undefined` (204) or a `Response` (sent as is). Unexpected errors log method, path and stack only; a Postgres error's `detail` (which can quote row values) is never logged.
- **Verified by hand:** the owner signed in with Google on localhost:3100; `/api/me` returned the profile with `timezone: null`; sign-out removed the session; signed-out visits are redirected by `proxy.ts`, and a fake cookie is still redirected by `requireSession()`.
- **Tests:** `handler.test.ts` (stubbed session: 401, origin check, validation, query strictness, 413, error mapping, no leaks in logs), `config.test.ts`, `account.service.test.ts`, `proxy.test.ts` (redirect and the compiled matcher). 248 tests in total.
- **Decisions:** `PATCH /api/me` moves to Phase 4 with the rest of `account.service.ts` and the database test setup; the client-side time zone detection (§4.5) follows once that exists. `withTransaction()` comes in Phase 4, where it is first used. Google's account chooser is forced (`prompt: "select_account"`), so signing out and back in can switch accounts. `/api/health` answers `503` with code `INTERNAL_ERROR` when the database is down (§7 asks for 503; `errorResponse` takes a status override).
- **Plan updates:** §12 reading list for Phase 3 now includes §4.5 (owner approved). §3 layout updated: `session.ts`, `requireSession()`, `pingDatabase()`, `getSession(headers)`, `GoogleSignInButton` and `SignOutButton`.
- **Code review (standards + spec) fixes:** the health check's SQL moved out of the route into `db.ts`; the sign-in button moved to `src/components/`; `errorResponse` status override replaces a hand-built 503 body; a shared `AuthContext` type; routes without a query schema reject query strings; `DATABASE_URL` must use `sslmode=verify-full`; §3 layout updated. **Not changed:** the Better Auth route is not wrapped in `withHandler()` (§6 prescribes `toNextJsHandler`; Better Auth does its own checks); the two buttons' shared pending/failure pattern waits for Phase 6's TanStack Query mutation hooks; `getSession()` stays as the seam the tests mock.
- **Next:** Phase 4 (Progress + gaps API). Read §0, §3, §4.4, §5.3, §7, §7.1, §11.

### Phase 4 — Progress + gaps API — 2026-09-24

- **Built (test-first):**
  - **Migrations:** `003_progress.sql` and `004_gaps.sql` (§5.3 verbatim), applied to `dev`.
  - **Database:** `withTransaction()` and the `Queryable` type in `db.ts`.
  - **Repositories:** `progress.repository.ts`, `gaps.repository.ts`, `catalog.repository.ts` and `account.repository.ts` (time zone).
  - **Services:** `progress.service.ts` (`listProgress`, `markSolved`, `editSolve`, `unmarkSolved`, `completeRevision`, `undoRevision`, `getDashboard`), `gaps.service.ts` (`loadGaps`, `getGaps`, `replaceGaps`, `resetGaps`), and `setTimezone` and `deleteAccount` in `account.service.ts`.
  - **Domain:** `daysBetween` and `userToday` in `calendarDate.ts`.
  - **Routes:** `GET /api/progress`; `PUT`, `PATCH` and `DELETE /api/progress/:problemId`; `PUT` and `DELETE /api/progress/:problemId/revisions/:n`; `GET /api/dashboard`; `GET`, `PUT` and `DELETE /api/gaps`; `GET /api/catalog`; `PATCH /api/me`; `DELETE /api/account`.
- **Test setup:**
  - `vitest.config.ts` has two projects: `unit` (parallel) and `db` (`test/**`, `fileParallelism: false`).
  - `test/setup/globalSetup.ts` drops and recreates the `test` branch's `public` schema, then migrates and seeds.
  - `test/setup/db.ts` runs `TRUNCATE "user", verification CASCADE` before each test.
  - `test/helpers/testEnv.ts` reads `.env.local` with `node:util` `parseEnv` and points `DATABASE_URL` at `TEST_DATABASE_URL`. It **refuses to run if that URL is the same Neon endpoint as `DATABASE_URL` or `DATABASE_URL_UNPOOLED`**.
  - `test/helpers/users.ts` creates users, stubbed sessions, and real sessions with a signed Better Auth cookie. The account-deletion tests use the real cookie, so Better Auth's own freshness check is what's tested.
  - 338 tests in total, and every §11 case that applies to Phase 4 is covered. Notes cases come in Phase 5.
- **Verified in the running app:** every new route answers `401` when signed out; `/api/health` answers `200`.
- **Decisions:**
  - **Dashboard note placeholders:** `hasNote: false` and `stats.notes: 0` (owner decision; see Carried-over tasks).
  - **Unmarking is idempotent:** `DELETE /api/progress/:id` answers `204` even if the problem wasn't solved, as the §7 table says. A second tab unmarking the same problem doesn't show a failure. The delete is a single statement, so it doesn't run the full lock, validate, write, read-back sequence; there is nothing to validate or return.
  - **Unknown problems:** an unknown `problemId` on `PUT` gives `404` through the Postgres `23503` mapping. `PATCH` and the revision routes on an unsolved problem give `404 NOT_FOUND` from the service.
  - **Undoing a revision that isn't done** gives `409 TIMELINE_CONFLICT` with `details.rule: "not_done"`. This is a service-level rule, not one of `validateTimeline`'s.
  - **`isDefault`** is true when the gaps equal `DEFAULT_GAPS`. `PUT /api/gaps` with the default values stores no rows, so "default" always means "nothing stored", and a future change to the defaults reaches those users.
  - **`completedCycles`** counts problems with all three revisions done. Dashboard lists are sorted by due date, then catalog id.
  - **`GET /api/catalog` was built in this phase.** §3 and §7 list it, and no other phase does. It calls the repository directly, since §3 lists no catalog service.
  - **`deleteAccount(headers)`** takes the request headers, because Better Auth finds the session from them. Better Auth's `SESSION_EXPIRED` error becomes `403 SESSION_NOT_FRESH`. The session cookie is cleared by the `nextCookies()` plugin.
  - **`withHandler`'s result type** now accepts routes that return nothing (sent as `204`).
- **Code review (standards + spec) fixes:**
  - `todayFor` moved into the domain as `userToday`, so progress no longer imports the account module.
  - The `getMe` unit test is back beside its file and mocks `@/server/auth` and `@/server/db`.
  - One progress list query instead of two near-copies, and a shared `loadProgress` for the list and the dashboard.
  - `ProgressRow` renamed to `ProgressRecord`.
  - `CONFIDENCES` replaces a hard-coded `[1, 2, 3]`.
  - One date-split helper in `calendarDate.ts`.
  - Unmarking made idempotent, and gaps equal to the defaults are stored as no rows (both described above).
  - `test/dashboard.service.test.ts` renamed to `test/dashboard.test.ts`.
  - Duplicate settings in the Vitest config removed.
  - `PLAN.md` §3 updated.
- **Not changed after review:**
  - The gaps services take `userId`, because they don't need the time zone.
  - The catalog route has no service.
  - `withRevision` keeps its explicit tuple type.
- **Next:** Phase 5 (Notes API). Read §0, §3, §4.4, §5.3, §7, §7.1, §8.4, §11. **Start with the carried-over dashboard task above.**

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Scaffolding with `create-next-app` (Phase 1).** Three reasons to scaffold into a temporary `revcode/` subfolder and move the files up: the project folder name has capitals and spaces (npm rejects capitals in package names); `create-next-app` refuses folders that already contain files like `PLAN.md`; and by default (`--agents-md`) it generates its own `AGENTS.md` **and `CLAUDE.md`**. When moving files up: keep its `AGENTS.md`; **discard its `CLAUDE.md`** (ours must never be overwritten) and add `@AGENTS.md` as the first line of ours; set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on, while Prettier writes LF. Resolved in Phase 1: `.gitattributes` (`* text=auto eol=lf`) and Prettier `endOfLine: "lf"`.
- **Neon connection strings end with `&channel_binding=require`.** Checked in Phase 1: `pg` 8.23 connects with it on all three URLs; keep it.
- **`sslmode`: use `verify-full`.** Neon's dashboard gives `sslmode=require`; `pg` 8 treats that as `verify-full` but warns on every connection that `pg` 9 will weaken it. Change it when pasting any new URL (including production in Phase 9).
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.
- **Port 3000 belongs to the owner's other local apps.** RevCode runs on 3100. Never stop a process that isn't RevCode's. Exception (owner decision, 2026-09-24): a RevCode `next dev` already on 3100, e.g. left by an earlier session, may be reused or stopped and restarted. Check the process's command line or working folder first; anything else is reported, not stopped.
- **`@next/env` from ESM:** use `import nextEnv from "@next/env"`; the named import `{ loadEnvConfig }` fails at runtime under `"type": "module"`.
- **Vitest runs with `NODE_ENV=test`, and `@next/env`'s `loadEnvConfig` then skips `.env.local`.** Phase 4's DB test setup must load `TEST_DATABASE_URL` another way (for example, read `.env.local` explicitly), and must give `runMigrations` a **direct** connection (its advisory lock is session-level; the pooler doesn't keep it).
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
- **Better Auth `deleteUser` without a password** throws `APIError` `BAD_REQUEST` with `body.code === "SESSION_EXPIRED"` for a stale session (not `SESSION_NOT_FRESH`). `account.service.ts` maps it.

## Owner to-do (outside the code)

- [x] Neon **development** project created (2026-09-24), currently named **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [x] **Node.js 24 LTS** installed (v24.21.0, checked 2026-09-24).
- [x] Neon `dev` and `test` branches created (auto-delete: never); the 3 database lines in `.env.local` are filled and format-checked (dev pooled + direct, test direct, all Singapore). Phase 1 only needs to verify a real connection.
- [x] Google OAuth client created (2026-09-24): Google Cloud project `RevCode`, consent screen External in **Testing** mode, the owner's account as a test user, web client "RevCode local" with origin `http://localhost:3100` and redirect URI `http://localhost:3100/api/auth/callback/google`. ID and secret are in `.env.local`.
- [ ] Optional, any time: rename the current Neon project to **`RevCode-dev`** so it isn't mistaken for production.
- [ ] Phase 9: create a **new Neon project `RevCode`** (AWS Singapore) for production, then create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
