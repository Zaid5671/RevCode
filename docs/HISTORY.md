# History

Entries moved out of `docs/PROGRESS.md`, newest last. Open this file only when you need the reason behind an earlier decision.

## Phase log

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

### Process change — reviews and test batching — 2026-09-24

- **Why:** Phase 4 used about a quarter of the owner's 5-hour usage window, mostly from one very long session, one-test-at-a-time cycles against Neon, and the two-reviewer `code-review` (about 190k tokens).
- **Adopted (owner decision):** (1) test-first **in batches** per function or endpoint, with one-test-at-a-time kept for tricky logic (`CLAUDE.md` Skills); (2) **documentation before library source** (`CLAUDE.md` Current docs); (3) a **review schedule** in `PLAN.md` §12 "Reviews": full `code-review` only at the end of Phase 5 (backend complete) and Phase 8 (all screens), a self-review after Phases 6 and 7, and `security-review` in Phase 9.
- **Considered and not adopted:** running only the changed test file while working; "read each file once per session". The existing "checkpoint in PROGRESS.md when a session gets long" rule stays.
- **Added the same day (owner decision):** a **suggested A/B split** for Phases 5–9 in `PLAN.md` §12, one fresh session per part. It's flexible: work may move between parts, and small items between phases, as long as every move is recorded here and mentioned to the owner (a whole screen or feature needs the owner's approval). **Every part ends with its own commit.** `CLAUDE.md` has a new "Finishing a part" section.

### Phase 5 part A — Notes service — 2026-09-24

- **Built (test-first):**
  - `005_notes.sql` (§5.3 verbatim), applied to `dev`.
  - `notes.repository.ts`, `notes.service.ts` (`listNotes`, `getNote`, `listCategoryNotes`, `searchNotes`, `saveNote`, `deleteNote`) and `notes.snippet.ts` (`snippetFor`, with unit tests). The services take `userId`, like gaps: notes don't need the time zone.
  - `categoryExists` in `catalog.repository.ts`.
  - The dashboard's `hasNote` and `stats.notes` now come from `problem_note` (carried-over task ticked). `stats.notes` counts every note, including notes on unsolved problems.
  - The account deletion tests now check that notes are removed too.
  - 370 tests in total.
- **How saves work (edge cases):**
  - Each save is **one conditional statement**, not a lock-then-write transaction. A create is `INSERT … ON CONFLICT DO NOTHING`; an update is `UPDATE … WHERE version = baseVersion`. When nothing is written, the save is refused with `409 NOTE_CONFLICT`. So two tabs saving at once always give one success and one `NOTE_CONFLICT`, never `500` or the generic `23505` → `CONFLICT`. Tests cover both races.
  - `NOTE_CONFLICT` has `details: { currentVersion }` (`null` if the note was deleted elsewhere). The editor's "Keep mine and overwrite" resends with that as `baseVersion`.
  - **A blank body deletes only the version the client loaded.** A stale version gives `NOTE_CONFLICT`, so a blank save can't wipe newer text. A note already deleted elsewhere counts as success. A blank body with `baseVersion: null` is a no-op, even if another tab has since created a note.
  - The body is stored exactly as sent. Only the "is it blank?" check trims it.
  - `getNote` with no note gives `404`. `deleteNote` is idempotent (`204`), like unmarking. An unknown category gives `404`; a known category with no notes gives `[]`.
- **Search:** `ILIKE` with `%`, `_` and `\` escaped, so they match themselves. Results come in catalog order. The snippet is up to 120 characters of the note on one line, starting 40 characters before the first match, with "…" where the note is cut. It counts code points, so it never splits an emoji. If JavaScript can't find the match that Postgres found (their case rules differ), the snippet shows the start of the note. The owner accepted these defaults at the start of the session.
- **Schema change:** the note body and the search `q` reject a NUL character (`\u0000`). Postgres `text` can't store one, so it would otherwise surface as a `500`.
- **Part B holds:**
  - `notes.markdown.ts` and its unit tests.
  - The routes `GET /api/notes`, `GET /api/notes/search`, `GET /api/notes/export`, `GET`/`PUT`/`DELETE /api/notes/:problemId` and `GET /api/categories/:categoryId/notes`.
  - Route tests, including `401` on each route and **unknown `problemId` → `404`** for `PUT`. That `404` comes from the `23503` mapping in `withHandler`, so it is tested at the route level, not in the service tests.
  - **Unknown `problemId`, not yet decided:** only a create (`baseVersion: null`) with a non-blank body reaches the insert, and so gets the `404`. An update (`baseVersion` set) finds no row and currently answers `409 NOTE_CONFLICT` with `currentVersion: null`. A blank body answers `204`. `GET` gives `404` and `DELETE` gives `204`, both fine. Decide in part B whether `PUT` should check that the problem exists first, so every unknown id gets `404`. Recommendation: yes, because it costs one query only on the failure path.
  - Docs, then the **full `code-review`**.
- **For the part B review:** the Postgres `23514` backstop maps to `TIMELINE_CONFLICT` ("These dates are out of order."). The only `problem_note` CHECK is the body length, which Zod always rejects first, so it is unreachable today. If it ever fires, the message is wrong for a note.
- **Nothing moved between parts or phases.**

### Phase 5 part B — Notes routes and export — 2026-09-24

- **Built (test-first):**
  - `notes.markdown.ts` (`buildNotesMarkdown`, `exportFilename`) and its unit tests.
  - `exportNotes` in `notes.service.ts`, and `listNotesForExport` in `notes.repository.ts`.
  - The seven notes routes: `GET /api/notes`, `GET /api/notes/search`, `GET /api/notes/export`, `GET`/`PUT`/`DELETE /api/notes/:problemId` and `GET /api/categories/:categoryId/notes`.
  - Route tests in `test/routes.test.ts`. These cover `401` and the foreign-`Origin` check on every notes route, the full save flow over HTTP (including `NOTE_CONFLICT` with `details.currentVersion`), validation, search, category listing, and the export's headers and content.
  - 404 tests in total.
  - The routes are thin wrappers, so each was written just before its tests.
- **Owner decisions (2026-09-24), recorded in `PLAN.md` §7 and §8.4:**
  - **Unknown `problemId` on `PUT /api/notes` is `404` in every case.** The service checks that the problem exists only on the paths that write nothing: an update that finds no row, a blank body with `baseVersion: null`, and a blank delete of a note that is already gone. A create on an unknown problem still gets its `404` from the foreign key (`23503`).
  - **One-category file name:** `revcode-notes-arrays-and-hashing-YYYY-MM-DD.md` (`&` becomes "and"; anything else becomes single dashes). Both file names use the user's today.
  - **Note bodies are exported as written.** Headings inside a note are not demoted.
- **Other export choices (defaults, not in the spec before):**
  - Heading numbers are the problem's position within its category, the same as the `#` column on the Problems page.
  - The all-notes file skips categories without notes. A single category with no notes is its heading alone. With no notes at all, the file reads "No notes yet."
  - Trailing whitespace is dropped from each note. A code block that a note leaves open is closed (CommonMark fence rules), so it can't swallow the rest of the file.
  - `Cache-Control: private, no-store` on the download.
  - An unknown `categoryId` is `404`; an unknown query key is `400`.
- **Catalog repository:** `categoryExists` was replaced by `findCategory`, which the export needs for the category name. `problemExists` was added.
- **Code review (full `code-review`, Standards and Spec, Phase 5 plus a backend consistency pass).** No correctness defects and no hard violations were found.
  - **Fixed:**
    - `ProgressUser` and the new `NotesUser` are replaced by one `ZonedUser` in `server/auth.ts`. Services take the user object only when they need the time zone (progress, the notes export); the rest take `userId`.
    - `leetcodeUrl` moved from the catalog repository to `src/domain/schemas.ts`, because repositories hold only SQL.
    - `IN_CATALOG_ORDER` renamed to `CATALOG_JOINS`.
    - The notes service's private helpers moved to the end of the file.
    - The route lines were added to the docs of the gaps services and `listProgress`.
    - A test was added for the 200-character search limit.
  - **Not changed:**
    - **The Postgres `23514` backstop** still maps to `TIMELINE_CONFLICT` ("These dates are out of order."), as `PLAN.md` §7.1 says. For `problem_note`'s body-length CHECK the message would be wrong, but Zod always rejects a long note first, so this can't happen today. Changing the mapping (by constraint name, sending the note CHECK to `VALIDATION_ERROR`) would change §7.1, so it waits for the owner.
    - A create on an unknown problem answers "Not found." (the generic `23503` message), while the other paths say "There is no such problem.". Both are `404 NOT_FOUND`; only the wording differs.
    - Grouping export rows into sections stays in the service.
- **Nothing moved between parts or phases.**
- **Next:** Phase 6 (App shell + Problems page), part A. Read §0, §3, §8.1, §8.3, §8.6 and `DESIGN-BRIEF.md` §1, §2, §4, §7.

### Phase 6 part A — App shell and Problems table — 2026-09-25

- **Built:**
  - **Design tokens and fonts** (`DESIGN-BRIEF.md` §1). `globals.css` holds the brief's colours as CSS variables (light, and dark via `prefers-color-scheme`), and Tailwind's default palette is removed (`--color-*: initial`), so only our colours exist: `bg`, `surface`, `surface-2`, `ink`, `ink-soft`, `ink-faint`, `line`, `line-soft`, `teal(-bg)`, `amber(-bg)`, `rose(-bg)`, `blue`, `on-teal`. Radii: `rounded-control` (6 px), `rounded-card` (10 px) and `rounded-dialog` (16 px). Fraunces, IBM Plex Sans and IBM Plex Mono come from `next/font/google` (served from our own domain) as `font-serif`, `font-sans` and `font-mono`.
  - **App shell.** The `(app)` layout wraps every signed-in page in `Providers` (TanStack Query) and `AppHeader`, which holds the wordmark, `NavLinks` (a text row on `md`+ screens, a bottom bar with icons on phones), `SaveStatus` and `UserMenu` (Google photo → name, email, Sign out). `next.config.ts` allows `lh3.googleusercontent.com` images. The dashboard (`/`), `/notes` and `/settings` are placeholders until Phases 7 and 8.
  - **`@tanstack/react-query` 5.103 installed** (listed in `PLAN.md` §2).
  - **API client:** `client/api.ts` (`apiRequest(path, schema, { method, body })` and `ApiError` with `status`, `code`, `message` and `details`; client-only codes `NETWORK_ERROR` and `BAD_RESPONSE`) and `client/queries.ts` (`queryKeys`, `useCatalog` with `staleTime: Infinity`, `useProgress`, `useNotesIndex`). `Providers` sends the browser to `/sign-in` on any `UNAUTHENTICATED` answer and doesn't retry 4xx. That redirect is a full page load (`window.location.assign`), on purpose, so it also drops the old session's cached data. The one ESLint exception in the codebase (`no-location-assign-relative-destination`) is disabled there with that reason.
  - **Problems page** (display only): `ProblemTable` loads catalog, progress and notes index, with loading and error (Try again) states. It shows 18 `CategoryGroup` folders (`solved / total`, `● N due` coloured by the most urgent). All start closed, and the open ones are remembered in `localStorage` (`client/openCategories.ts`, `useSyncExternalStore`, falls back to memory when storage is blocked). "Expand all / Collapse all" is included. `ProblemRow` has `#`, a LeetCode link with a Premium tag, a `DifficultyBadge`, Solved, Conf, `RevisionCell` ×3 (`✓ date`, due date + ✓, or `(projected)`), `StatusLabel` for Next, and `NotesButton`. Complete rows are faded.
  - **Filters** (`Filters`) are in the URL (`q`, `category`, `difficulty`, `status`, `sort`; only non-default values written; unknown values fall back to defaults) via `history.replaceState`. While filtering, only folders with matches show, all open; folders closed during a search are remembered only for that search. Clearing brings back the saved state. "No problems match." has a Clear link.
  - **Pure logic, test-first:** `client/format.ts` (dates and status labels, with hand-written month names because Intl's `en-GB` now gives "Sept") and `client/problemsView.ts` (`parseFilters`, `filtersToQuery`, `isFiltering`, `rowStatus`, `buildRows`, `matchesFilters`, `groupRows`, `sortByNextDue`), plus `client/api.test.ts`. 440 tests in total.
  - The table card scrolls sideways inside itself below `lg` (`overflow-x-auto`, table `min-width` 980 px) and uses `overflow-clip` from `lg` up, which keeps the rounded corners and lets the column headings stay sticky while the page scrolls.
  - The sign-in page's `text-red-600` classes became `text-rose` (the default palette is gone).
  - `<body suppressHydrationWarning>`: the owner's Grammarly extension adds attributes to `<body>` before React loads, which showed as a hydration "Issue" in the dev overlay. It only ignores attribute differences on `<body>` itself.
  - **Checked in the owner's browser (dark theme, desktop):** every sample state, folder counts, category filter, flat "Next due" list, note icons.
- **Owner decisions (2026-09-25):**
  - **"Next due first" is one flat list** without folders, earliest due first, then unsolved and complete problems in NeetCode order. Each row shows its category under the title, except when a category filter is set. Recorded in `PLAN.md` §8.3 and `DESIGN-BRIEF.md` §4.
  - **Sample data in `dev`:** 7 solved problems and 2 notes were added to the owner's account (one-off script, insert-only, not committed): Arrays & Hashing #1 complete, #2 R2 3 days late, #3 R1 today (with a note), #4 R1 tomorrow, #5 R2 in 4 days, #6 R3 in 9 days; Two Pointers #1 R1 5 days late; a note on unsolved Arrays & Hashing #8. Dates were relative to 2026-09-24 (the owner's time zone is still `null`, so the server's today is UTC). The owner can unmark them once part B adds editing.
- **Part B holds** (unchanged from `PLAN.md` §12): SolveForm; the revision ✓ date popover; confidence select; EditDrawer (edit, undo, unmark); confirmations; phone card layout; §8.6 polish; component tests (install `@testing-library/react`, `@testing-library/user-event` and `jsdom`, and give component tests a `jsdom` environment); self-review. Also:
  - Wire up the disabled controls: the Solved checkbox (currently `readOnly`), the RevisionCell ✓ button, the Conf number (becomes a select).
  - **SaveStatus "retry"**: the indicator shows `Saved` / `Saving…` / `Couldn't save` today. For "— retry", define each mutation with `queryClient.setMutationDefaults(key, …)` so a failed one can be re-run with `new MutationObserver(client, { mutationKey }).mutate(variables)`. `MutationCache.build` is internal; don't use it.
  - Check the sticky table header and the 360 px layout in a real browser.
- **Nothing moved between parts or phases.**
- **Next:** Phase 6 part B. Read §0, §3, §4.4 (timeline rules, for the EditDrawer's inline errors), §7 (progress routes), §8.1, §8.3, §8.6 and `DESIGN-BRIEF.md` §1, §4, §7.

### Process change — shorter PROGRESS.md — 2026-09-25

- **Why:** Phase 6 part B used about 260k tokens of context: about 13k reading a 51 KB `PROGRESS.md` that was mostly finished history, and 50–60k on avoidable mistakes (long inline Bash edit scripts that failed to parse, files garbled by Windows' default encoding, a file rewritten whole, a test failure that printed the whole rendered page).
- **Adopted (owner decision):** `PROGRESS.md` keeps only the current state; older entries move here (`CLAUDE.md` "Progress log"). A new `CLAUDE.md` section, "Working efficiently". The `components` Vitest project sets `DEBUG_PRINT_LIMIT=500` and `COLORS=false`. `PLAN.md` §3 lists this file.
- **Considered and not adopted:** splitting `PROGRESS.md` and `PLAN.md` into frontend and backend files. The backend is finished, frontend sessions still need backend facts, and 85 "`PLAN.md` §" references would break.

## Carried-over tasks (closed)

- [x] **Phase 5 must replace the dashboard's note placeholders.** Done in Phase 5 part A (`test/dashboard.test.ts`, "marks items that have a note…"). Phase 4's `GET /api/dashboard` returns `hasNote: false` on every item and `stats.notes: 0`, because `problem_note` (`005_notes.sql`) doesn't exist yet (owner decision, 2026-09-24). Phase 5 must compute both from `problem_note` for the session user and add a service test that proves them (a note on a due problem sets `hasNote: true`; the count matches the user's notes and ignores other users'). Phase 5 isn't done until this box is ticked.

## Retired gotchas

Gotchas about finished one-time work, moved from `docs/PROGRESS.md`.

- **Scaffolding with `create-next-app` (Phase 1).** Three reasons to scaffold into a temporary `revcode/` subfolder and move the files up: the project folder name has capitals and spaces (npm rejects capitals in package names); `create-next-app` refuses folders that already contain files like `PLAN.md`; and by default (`--agents-md`) it generates its own `AGENTS.md` **and `CLAUDE.md`**. When moving files up: keep its `AGENTS.md`; **discard its `CLAUDE.md`** (ours must never be overwritten) and add `@AGENTS.md` as the first line of ours; set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on, while Prettier writes LF. Resolved in Phase 1: `.gitattributes` (`* text=auto eol=lf`) and Prettier `endOfLine: "lf"`.
- **Vitest runs with `NODE_ENV=test`, and `@next/env`'s `loadEnvConfig` then skips `.env.local`.** Phase 4's DB test setup must load `TEST_DATABASE_URL` another way (for example, read `.env.local` explicitly), and must give `runMigrations` a **direct** connection (its advisory lock is session-level; the pooler doesn't keep it).
