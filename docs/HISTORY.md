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

### Phase 6 part B — Tracking actions, phone cards, save status — 2026-09-25

- **Built:**
  - **Saves** (`client/mutations.ts`). The five progress saves (solve, edit, unmark, complete or edit a revision, undo) are registered once with `setMutationDefaults`. Each save of one problem shares the TanStack Query `scope` `progress:<id>`, so saves of a problem run one after another and answers can't arrive out of order. A save cancels a running progress fetch, puts the server's entry into the progress list, then invalidates `progress` and `dashboard` (§8.1). Nothing is shown before the server confirms it. Saves use `networkMode: "always"`, so an offline save fails visibly instead of waiting as "Saving…".
  - **Save status** (`client/saves.ts` `SaveTracker`, tested first). It follows the mutation cache and keeps the newest save of each scope. The header shows `Saving…` while anything is pending, and `Couldn't save` while any newest save failed. This fixes part A's indicator, which showed only the newest save in the whole app, so a failure was hidden by a later success on another problem. **Retry** appears only for network or `5xx` failures (`isRetryable`) and re-sends them through a `MutationObserver` with the same key, scope and variables. A failure stops being retryable as soon as a newer save of the same problem starts, so a retry never overwrites a newer change. A refused save (`4xx`) shows its message next to the control, and it leaves the header once that control closes.
  - **Overlays:** `Dialog`, the shell of every overlay. It is the browser's modal `<dialog>`, placed centred, as a right-hand drawer (400 px) or as a popover anchored to its button, and it becomes a bottom sheet below `md`. It closes on Escape and on a backdrop click, and it returns focus to where it came from. On top of it: `SolveForm` (date, then `1 · Shaky` / `2 · Okay` / `3 · Solid`, with the first revision's timing from the user's gaps under each; one click saves, and the dialog closes when the server confirms), `RevisionDonePopover` (reusable on the dashboard), `EditDrawer` (solve date with Save, confidence, revision lines with inline edit, done and undo (undo on the latest only), and "Unmark solved (your note is kept)"), `ConfirmDialog` and `UnmarkConfirm`. Server messages appear under the line being changed.
  - **Table wiring:** the Solved checkbox (ticking opens the Solve dialog, unticking asks to unmark), a Conf `ConfidenceSelect` that saves on change and shows the value being sent, the ✓ on the next revision, a click on a solved row's empty space opening the Edit panel, and the row's `#` as the keyboard way into it.
  - **Phone:** below `md` (`useMediaQuery`), rows become two-line `ProblemCard`s inside the same folders; the flat "next due" list becomes a list of cards.
  - Small things: `formatRelativeDue` ("tomorrow", "in 3 days", "3d late"); `useGaps`, `queryKeys.dashboard` and `queryKeys.gaps`; `makeQueryClient` moved to `client/queryClient.ts`, so tests build a fresh client; a `--backdrop` colour per theme; the header gap narrows on phones to fit "Couldn't save — retry"; `StatusLabel` takes an optional prefix ("R2").
- **Component tests:** `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` and `jsdom` installed (all on the §2 companion list). Vitest has a third project, `components` (`src/**/*.test.tsx`, jsdom, `test/setup/dom.ts`). The tests cover RevisionCell states; SolveForm (the server's today as default and max, hints from the user's gaps, a one-click save that closes, a refused save that stays open, a future date blocked, cancel saves nothing); CategoryGroup through ProblemTable (counts, open and close, search opens matches and clearing restores them, the checkbox opens the Solve dialog); EditDrawer (undo only on the latest revision, a timeline message under the edited line, the unmark confirmation, and cancelling it keeps the panel open); SaveStatus (retry re-sends the same save, no retry for a refusal, a failure dropped by a newer save). 485 tests in total.
- **Owner decisions (2026-09-25):**
  - Before the build, the owner approved four details: the Solve dialog closes only after the server confirms; unticking a solved checkbox asks to unmark; the row's `#` opens the Edit panel from the keyboard; clicking an unsolved row does nothing.
  - An outside review of the plan, analysed and accepted by the owner: dialogs use the server's `today`; retry only for network or server failures, and never over a newer save; overlays are bottom sheets on phones; jsdom needs a `<dialog>` stand-in. The analysis added the part A save-status fix and the per-problem `scope` described above.
- **Plan updates:** `PLAN.md` §3 (new client modules, components, test setup and the three Vitest projects) and §8.6 (bottom sheets; dialogs use the server's today).
- **Moved between phases:** `useGaps` was pulled forward from Phase 7, because the Solve dialog's hints need the user's gaps. Nothing else moved.
- **Self-review** (§12): invariants hold (calendar-date strings end to end, no user id from the client, every save visible, the domain stays pure). It found one bug, fixed: React's dev-mode remount closes and reopens each dialog, and the browser's `close` event arrives after the reopen, which would have closed every overlay at once in development. `Dialog` now ignores `close` while it is open.
- **Phase 6 done (owner, 2026-09-25).**
- **Remaining before Phase 7: UI changes by the owner**, possibly a restyle based on `DESIGN.md` (Linear's design, in the project root). If they change the look, first update `PLAN.md` §0 ("Look and feel") and `DESIGN-BRIEF.md` with the owner's approval, then the tokens in `globals.css` and the components. Afterwards, check the screens in the browser: every tracking action, 360 px width with the bottom sheets, light and dark themes, and the sticky table header.

### UI restyle (Linear, then the owner's Stitch design) and theme switch — 2026-09-25

- **What:** the app's look now follows the owner's Stitch mockup of the Problems page (`designs/problems_pg_design/`: `screen.png`, `code.html`), in a Linear-like style. Structure and data are unchanged. A first pass after Linear's `DESIGN.md` alone (lavender, Inter-only dates) was replaced the same day by the Stitch pass. The owner then deleted `DESIGN.md` (2026-09-25): it contradicted the brief (dark only, one colour, lavender), and a root `DESIGN.md` is easily taken as the design rules. The brief's §1 holds everything used from it; the file remains in git history (`4376007`).
- **Owner decisions (2026-09-25):** indigo accent; light theme kept; Inter plus JetBrains Mono (mono for dates and counts, as in Stitch); a **System / Light / Dark** switch in the account menu. Left out of the Stitch file on purpose (recorded in `DESIGN-BRIEF.md` §1): the gradient logo, the pulsing dots, the large table shadow, the `⌘K` hint (no such shortcut). Following Stitch: unsolved rows dimmed with faint `-` cells; complete rows no longer fade.
- **Tokens** (`globals.css`): every token holds both themes with CSS `light-dark()`; `color-scheme` follows the system, or `data-theme` on `<html>`. New tokens: `header-bg`, `surface-head`, `surface-3`, `hover`, `field`, `ink-strong`, `ink-ghost`, `line-strong`, `accent`/`accent-hover`, and `*-bg`/`*-edge` tints made with `color-mix()`. `teal` is now `green`. A custom square checkbox, `.ghost-select` for Conf, thin scrollbars.
- **Theme switch:** `client/theme.ts` (read/save in localStorage `revcode-theme`, and `THEME_SCRIPT`), a plain inline `<script>` in the root layout's `<head>` so a saved choice applies before the first paint (`next/script` `beforeInteractive` would run it only once Next's code starts), `suppressHydrationWarning` on `<html>`, and `ThemePicker` in `UserMenu`. Tested (`ThemePicker.test.tsx`).
- **Components:** sticky blurred header with an indigo "R" logo, mono wordmark, pill nav links and a tinted save-status pill; content up to 1720 px; filters with a search icon and chevron selects; table headings in mono uppercase, sticky under the app header (`top-14`), with fixed column widths (`COLUMN_CLASS` in `ProblemRow`); category rows with a chevron icon, count and due pill on the right, sticky at `top-24`; the next revision as a tinted chip that is itself the mark-done button; tinted bordered difficulty badges.
- **Docs:** `PLAN.md` §0 (look and feel) and §3 (`designs/`, `theme.ts`, `ThemePicker`); `DESIGN-BRIEF.md` §1 rewritten (including a rule that every screen without a mockup uses the same look), §2 and §4 updated. `CLAUDE.md` gained a "One look" invariant (owner, 2026-09-25). `designs/` added to `.prettierignore` (a format run had re-indented `code.html`; only whitespace changed).
- **Checks:** lint, typecheck and 488 tests pass. **Still to do:** the owner's browser check: every tracking action, both themes and the switch, 360 px width with bottom sheets, sticky header, headings and category rows. Then commit, then Phase 7 part A.

### Phase 7 part A — Dashboard — 2026-09-25

- **Design first:** a clickable mockup (`designs/dashboard_mockup.html`) compared `DESIGN-BRIEF.md` §3 as written with nine suggested changes. **The owner approved the suggested version (2026-09-25):** rows in two cards (Revise now, Coming up) side by side on wide screens instead of wrapping chips; difficulty badge and category on each row; no status label on Coming up rows (the date heading says it); no coloured left border; a labelled "✓ Done" button; the user's today beside the title; on phone, Solved spans the strip and the other four stats form 2 × 2; loading and error states. Recorded in `DESIGN-BRIEF.md` §3, `PLAN.md` §8.2 and §3 (`designs/`).
- **Built:**
  - `client/dashboardView.ts` (tested first): joins the API's four lists with the catalog. Revise now = overdue then due today; Coming up = tomorrow and next 7 days, grouped by due date with the label "Tomorrow" / "Fri 25 Sep"; stats numbers (solved %, Next 7 days = tomorrow + next 7). A reminder whose problem isn't in the catalog is skipped. `useDashboard` in `queries.ts`; `formatLongDate(date, { weekday: true })` gives "Wed 23 Sep 2026".
  - `Dashboard` (title with the user's today, loading, error with Try again, the new-user line), `StatsStrip` (a `<dl>`; hairlines are a 1 px gap over the line colour; Solved spans the width on phones), `ReminderPanel` with `ReminderCard` and rows (flex layout that becomes two lines below `md`; cards side by side from `lg`). ✓ Done reuses `RevisionDonePopover`; it closes once the save and the dashboard refetch finish, and the reminder leaves the list. If the revision disappears some other way (another tab), the popover closes. Notes buttons stay inactive until Phase 8.
  - `(app)/page.tsx` now renders `Dashboard`, with the title "Dashboard · RevCode".
- **Not passed:** the popover's earliest date (`min`). The dashboard API doesn't send the previous event's date, so an earlier date is refused by the server, and its message shows in the popover.
- **Checks:** lint, typecheck and 503 tests pass (15 new: `dashboardView.test.ts`, `Dashboard.test.tsx`, one in `format.test.ts`). The page compiles on the dev server.
- **Owner's browser check passed (2026-09-25).**
- **Committed** as `10b4cb6`. **Next:** part B: Settings (§8.5), time zone auto-detect (§8.1), §8.6 polish, component tests, self-review.

### Phase 7 part B — Settings — 2026-09-25

- **Design:** the owner approved all nine suggested changes to `DESIGN-BRIEF.md` §6 without a mockup (2026-09-25): a left-aligned column of bordered cards; an "If on time" column in the gaps grid; the §4.1 reasoning behind "Why these numbers?"; Save/Reset behaviour with a Defaults/Custom label; "Today for you" and a "Use this device's time zone" link; "Download your notes first" above Delete account; loading and error states; Shaky/Okay/Solid allowed in Settings (fixes a clash with §1). Recorded in `DESIGN-BRIEF.md` §1 and §6 and `PLAN.md` §8.5.
- **Built:**
  - `client/gapsDraft.ts` (tested first): box checks (whole number 1–180), draft ↔ gaps, "If on time" day sums. `client/timeZones.ts`: the device's zone, and the zone list plus UTC and the saved zone.
  - `useMe` in `queries.ts`. In `mutations.ts`, four Settings saves (`saveGaps`, `resetGaps`, `setTimezone`, `deleteAccount`) registered like the progress saves, so the header pill tracks them; `useSettingsSave`. Gaps and time zone saves update their cache and refetch `progress` and `dashboard`. `useProgressSave` and `useSettingsSave` share `useTrackedSave`.
  - Cards: `SettingsCard` (+ `CardLoading`, `CardLoadError`, `SaveNote`), `GapsEditor`, `TimeZoneSetting`, `AccountCard`, `DeleteAccount` (type "delete"; `SESSION_NOT_FRESH` → Sign in with Google back to `/settings`; success → `/sign-in`). `Select` moved out of `Filters` to share it. `settings/page.tsx` lays out the cards.
  - `TimeZoneSync` in the signed-in layout saves the browser's zone once when the user has none (§8.1).
- **Owner's browser check (2026-09-25):** everything works. After seeing the page, the owner chose to **centre** the title and column together instead of left-aligning them (the empty right side looked unfinished; two columns were also offered). Updated in `DESIGN-BRIEF.md` §6, `PLAN.md` §8.5 and `settings/page.tsx`.
- **Gotcha:** Node's ICU lists `Asia/Calcutta`, not `Asia/Kolkata`; browsers differ too. The saved zone is always added to the list, so the select shows it either way.
- **Self-review** (CLAUDE.md invariants, §3, §8.5, §8.6, brief §6): nothing to fix. Known limit: if the server ever refused the automatic zone save, the header pill would show the failure until a page reload (it has no control of its own to show the message).
- **Checks:** lint, typecheck and 547 tests pass (44 new: `gapsDraft`, `timeZones`, `GapsEditor`, `TimeZoneSetting`, `DeleteAccount`, `TimeZoneSync` + `AccountCard`). `PLAN.md` §3 updated.
- **Phase 7 done** ("Done when": reminders match the schedule rules; changing gaps moves due dates; §8.6 met). Committed after the owner's check.
- **For Phase 8:** read `PLAN.md` §8.4, §8.6 and `DESIGN-BRIEF.md` §1, §5, §7. The Notes buttons on the Problems table and Dashboard already exist but do nothing yet; the Markdown download route (`/api/notes/export`) is already used by Settings. Part B ends with the **full `code-review`** of Phases 6–8. An idea to raise then (owner, 2026-09-25): font sizes are set per component (`text-[13px]`, `text-[11px]`), not as named tokens in `globals.css` like the fonts themselves.

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
- **Next (part B):** the Notes section (`/notes/[categoryId]`: category list with counts, category document, search, downloads; its Edit opens `NoteDrawer`), §8.6 polish, component tests, then the **full `code-review`** of Phases 6–8 (from `4376007`'s parent, the commit that started Phase 6). Raise then: font sizes are per component, not tokens (owner, 2026-09-25).

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
- **Owner approved the follow-ups; committed** as `26efd12` (with `designs/problems_pg_desgin2/`).
- **Notes section design approved (2026-09-26)** for Phase 8 part B, from the mock-up `designs/notes_mockup.html` (widened to 1280 px at the owner's request). All suggestions taken, including the optional "edited" date. Recorded in `DESIGN-BRIEF.md` §5 and `PLAN.md` §8.4. Part B builds from those, not from the mock-up's sample data.

### Phase 8 part B — Notes section — 2026-09-26

- **Design:** approved from `designs/notes_mockup.html` (`DESIGN-BRIEF.md` §5, `PLAN.md` §8.4).
- **Built:**
  - `client/notesView.ts` (tested first, 28 tests): note counts per category, the category `/notes` opens, `/notes/[categoryId]` parsing, a category as a document (with or without problems lacking notes, confidence for solved ones), search hits (the server's note-text matches plus problem-name matches found on the client, each once, in catalog order), and highlight parts.
  - `useCategoryNotes` (key `["notes", "category", id]`) and `useNoteSearch` (key `["notes", "search", q]`, idle for an empty query, keeps the last results while loading). Both sit under `["notes"]`, so a note save refreshes them.
  - `NotesSection`: the 1280 px page, the sticky left column (title, search box with ×/Escape to clear, category list with counts, "Download all notes"; a dropdown on phones), loading/error/empty states, and the Note panel. The search waits 250 ms and lives in `?q=` (`history.replaceState`, as on Problems), capped at the API's 200 characters.
  - `NotesDocument`: `CategoryDocument` (heading, Download .md, "n of m problems have notes", the switch, each note with `#`, link, difficulty, Conf, "edited …", Edit; "+ Add note" rows) and `NoteSearchResults` (count line, rows with highlighted title/snippet, "name match").
  - Routes `/notes` (shows the default category, no redirect) and `/notes/[categoryId]` (an unknown id shows a message).
- **Checks:** lint, typecheck, format and 653 tests pass (38 new: 28 logic, 10 component); `next build` compiles.
- **Owner's browser check (2026-09-26):** everything works. Committed as `eec2590`.
- **Follow-up (owner, 2026-09-26, tried in the mock-up first), built:** long notes made scrolling tiring and a note's own `---` looked like the line between notes. Now each note is a card with a header strip; `CollapsibleNote` shows a long note (over 320 px) as a 280 px fading preview with Show more / Show less (back to the card's top), measured with `ResizeObserver`; Expand all / Collapse all in the category header; `MarkdownView`'s `---` is dashed (the Note panel preview too). The owner fixes stray code fences in their own notes; the app doesn't work around them. `test/setup/dom.ts` gained `ResizeObserver` (every note short) and `scrollIntoView` stand-ins. `DESIGN-BRIEF.md` §5 and `PLAN.md` updated. Lint, typecheck, format and 658 tests pass (5 new). After the owner's first look: Expand all became a bordered pill, and the switch's label now comes before the switch, at the far right, so the switch doesn't read as Expand all's.
- **Phase 8 review dropped (owner, 2026-09-26):** no `code-review` of Phases 6–8, to save its cost; Phase 9's `security-review` and QA checklist still cover the whole app (`PLAN.md` §12 "Reviews"). **Phase 8 is done.**
- **Next: Phase 9, Go live** (`PLAN.md` §12; one session: `security-review`, then deployment and the QA checklist). Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). After Phase 9 the owner will bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch.

### Plan change — private launch — 2026-09-26

- **Decision (owner, 2026-09-26):** RevCode goes live **private**. The Google consent screen stays in **Testing** mode, so only accounts on its test-user list can sign in (today the owner's; up to 100). The owner wants the app for themselves and doesn't want other users to affect it (shared free Neon hours, their data in the database). **Going public is a future step:** publish the consent screen, first running a full-app `security-review` and checking the privacy and terms pages; a paid Neon plan if compute hours run short.
- **Recorded in `PLAN.md`:** §0 "Launch" row, §6 step 5, §12 Phase 9 row and the QA checklist's second-account check (that account is added as a test user).
- **Unchanged:** production still gets its own Neon project; `dev` and `test` stay in the development project.
- **Next: Phase 9, Go live** (`PLAN.md` §12; one session: `security-review`, then deployment and the QA checklist). Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). After Phase 9 the owner will bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch.

### Phase 9 — Go live — 2026-09-26

- **Launch: public** (owner, 2026-09-26; `PLAN.md` §0 "Launch"). A private launch in Google's Testing mode was planned first ("Plan change — private launch" in `docs/HISTORY.md`), but a Google account not on the test-user list signed in on the live site: Google doesn't enforce that list for apps that ask only for name, email and profile (Google Cloud Help, "Manage App Audience"). The owner then chose a public launch.
- **Security review, done by hand:** the `security-review` skill fails here, since it diffs against `origin/HEAD`, which this repo doesn't have. Targeted at the owner's request: `withHandler`, auth, config, proxy, every API route, every repository query, migrations, `MarkdownView` and the theme script. Fine: every per-user query binds the session user id; every route but `/api/auth/*` checks the session; the origin check blocks cross-site mutations; Zod and size limits on all input; parameterised SQL; raw HTML in notes is shown as text and `javascript:` links dropped; logs leave out bodies, cookies and headers; the export file name is sanitised and `no-store`; account deletion cascades.
- **Fixed:** `/api/health` was public and ran `SELECT 1`, so anyone could keep the production database awake around the clock (roughly 180 of the 100 free CU-hours a month). It now requires a session (owner decision; `PLAN.md` §7 updated), and `routes.test.ts` covers its 401. `withHandler`'s `public` option is unused now but kept.
- **Left at first, fixed for the public launch (see below):** anyone could start a Google sign-in, and no security headers were sent.
- **Checks:** lint, typecheck, format and the full `npm test` pass (659 tests; `SolveForm`'s "defaults to the server's today…" failed once under the full run's load and passes on its own and in the unit + components run).
- **Committed** as `b8fc0f3`.
- **Deployment prep, built:** `vercel.json` (`regions: ["sin1"]`); `/privacy` and `/terms` (`LegalPage`, `DESIGN-BRIEF.md` §8: what's stored, including Google tokens and the session IP and browser; no contact email, owner's choice); faint Privacy · Terms links on the sign-in page and, at the owner's request, at the bottom of the account menu (`UserMenu`, `DESIGN-BRIEF.md` §2). Checked signed out on the dev server: both pages 200, `/api/health` 401. Lint, typecheck, unit and component tests pass.
- **Deployment walkthrough agreed** (owner does the dashboard steps): production Neon project → migrate and seed it from the owner's own terminal (the URL never goes through the chat) → private GitHub repo and push (no remote yet) → Vercel import with the env vars → check the live site → Google production redirect URI → QA checklist.
- **Committed** as `bee29a9`. The owner declined the `wizard` script for these steps; plain instructions in chat instead.
- **Production database ready (2026-09-26):** the owner renamed the development project to `RevCode-dev` and created the production project `RevCode` (AWS Singapore, Free plan; Object storage left off, the app doesn't use it). Migrated and seeded from the owner's own terminal (URL entered with `Read-Host -MaskInput` into a session variable, never in a file or the chat): 5 migrations; 18 categories and 250 problems inserted. The production URL is deliberately not in `.env.local`, which local dev, tests and `db:migrate` read.
- **Commit author renamed (owner, 2026-09-26):** the owner's GitHub account is now `Zaid5671` (`Zaid-Repo123` was deleted). Before the first push, every commit's author and committer name was rewritten from `Zaid-Repo123` to `Zaid5671` (`git filter-branch --env-filter`; email, dates, messages and code unchanged, checked against the backup). Commit ids in `docs/` were updated to the new ones. The global `git config user.name` is now `Zaid5671`. Pushed to the private GitHub repo `Zaid5671/RevCode` (`origin`, `main` tracks `origin/main`); the backup branch was then deleted.
- **Vercel project deployed (2026-09-26):** imported from GitHub under the owner's Vercel account; the live address is **https://revcode-phi.vercel.app** (`revcode.vercel.app` was taken). Five env vars, Production only: `DATABASE_URL` (production pooled, `verify-full`), `BETTER_AUTH_URL`, a fresh `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`_SECRET` (the same client as local). Checked signed out: sign-in, `/privacy`, `/terms` 200; `/problems` → `/sign-in`; `/api/health` 401; functions in `sin1`. Then `BETTER_AUTH_URL` was corrected to that address and redeployed (it first pointed at `revcode.vercel.app`, someone else's site, so Google got the wrong redirect URI), and the "RevCode local" Google client gained the production origin and redirect URI. **The owner signed in on the live site and reached the dashboard (2026-09-26).** No "unverified app" screen appeared.
- **Public-launch changes, built (2026-09-26):**
  - `auth.ts`: `account.storeStateStrategy: "cookie"`. By default Better Auth writes a `verification` row whenever a sign-in starts, so bots hitting `/api/auth/sign-in/social` could keep the database awake; the OAuth state now lives in an encrypted cookie (Better Auth docs, "Options"). Checked on the dev server: starting a sign-in sets `better-auth.oauth_state`, redirects to Google and adds 0 rows. Better Auth's own rate limit stays as is (in memory, so weak on serverless, per its docs).
  - `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` on every response; `poweredByHeader: false`. Checked on the dev server.
  - Terms: a friendlier tone ("The service" replaces "No warranty"; "Use" softened). Privacy: describes a public app; still no contact email (owner).
  - No security pass over the screens (owner decision, 2026-09-26; `PLAN.md` §12 "Reviews").
  - `PLAN.md` §0 "Launch", §6 step 5, §12 "Reviews" and the Phase 9 row, and the QA checklist switched to the public launch.
- **Committed and pushed** as `54fab84`; Vercel redeployed in about 50 s. Checked live: the three headers, no `X-Powered-By`, and the `__Secure-better-auth.oauth_state` cookie on sign-in start. The owner signed in and out on the live site.
- **Consent screen published (2026-09-26):** Google required the Branding page's home page, privacy policy and terms links first (`https://revcode-phi.vercel.app`, `/privacy`, `/terms`; authorised domain `revcode-phi.vercel.app`). No logo, so no verification review. Publishing status: In production.
- **QA checklist (`PLAN.md` §12) passed in full on the live site (owner, 2026-09-26). Phase 9 is done.**
- **Next:** after launch, the owner watches the production Neon project's compute hours and upgrades if they near 100 a month. Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). The owner will bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch. Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). After Phase 9 the owner will bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch.

### Dashboard refresh — 2026-09-26

- **Owner-approved** (2026-09-26) from the "With changes" version of `designs/dashboard_mockup.html`; recorded in `docs/DESIGN-BRIEF.md` §3 and `PLAN.md` §8.2. Browser code only: no server, API or database change.
- **Built:** (1) the Dashboard is at most 1280 px wide, like Problems and Notes; (2) a zero in the stats strip is faint (Solved stays bright); (3) an empty Revise now names the next revision ("Next up tomorrow: …"); (4) Coming up's ✓ Done is borderless until the row is hovered or the button focused (bordered on touch screens); (5) Coming up's date headings add "· in N days" (not Tomorrow); (6) a "Next to solve" line under the stats: the first unsolved problem in NeetCode order (`nextToSolve` in `dashboardView.ts`, from the catalog and `/api/progress`), with a LeetCode link and "Open in Problems →" (`/problems?q=<title>`). It has its own query: a placeholder keeps its space while loading; it's left out on error or when all 250 are solved.
- **Checks:** lint, typecheck, unit + components tests pass (551).
- **Committed** with the owner's go-ahead (2026-09-26). Not yet pushed.
- **Next:** push when the owner asks, so Vercel deploys it. Open idea, not scheduled: font sizes are per component, not tokens (owner, 2026-09-25). The owner may bring suggestions for restructuring `PLAN.md`, `PROGRESS.md`, `HISTORY.md` and `CLAUDE.md` for work after launch.

### Landing page route — 2026-09-27

- **Owner-approved** (2026-09-27): `/` becomes a public landing page and the Dashboard moves to `/dashboard`. Recorded in `PLAN.md` §3, §6 and §8.1–8.2, and `docs/DESIGN-BRIEF.md` §3.
- **Built:** `src/app/page.tsx`, a static placeholder landing page (name, one line, Google sign-in button, Privacy · Terms) in the sign-in page's style. `src/app/(app)/page.tsx` moved to `(app)/dashboard/page.tsx`. `proxy.ts`: at `/`, a session cookie redirects to `/dashboard`, otherwise the landing page shows; other pages are unchanged. Links now point to `/dashboard` (NavLinks, AppHeader wordmark, Google sign-in `callbackURL`, `/sign-in`'s redirect for signed-in users). Sign out and account deletion now land on `/`. The Privacy/Terms back link stays `/`.
- **Checks:** lint, typecheck and the full `npm test` pass (677; `proxy.test.ts` covers the new rules). Checked on the dev server: `/` 200 signed out, `/` → `/dashboard` with a cookie, `/dashboard` → `/sign-in` without one.
- **Committed** with the owner's go-ahead (2026-09-27). Not yet pushed.
- **Next:** push when the owner asks. The real landing page (content and design, per `docs/DESIGN-BRIEF.md` §1, light and dark) is a later piece of work. Google's Branding page lists the home page as `https://revcode-phi.vercel.app`, which now shows the landing page; no change needed there.

## Carried-over tasks (closed)

- [x] **Phase 5 must replace the dashboard's note placeholders.** Done in Phase 5 part A (`test/dashboard.test.ts`, "marks items that have a note…"). Phase 4's `GET /api/dashboard` returns `hasNote: false` on every item and `stats.notes: 0`, because `problem_note` (`005_notes.sql`) doesn't exist yet (owner decision, 2026-09-24). Phase 5 must compute both from `problem_note` for the session user and add a service test that proves them (a note on a due problem sets `hasNote: true`; the count matches the user's notes and ignores other users'). Phase 5 isn't done until this box is ticked.

## Retired gotchas

Gotchas about finished one-time work, moved from `docs/PROGRESS.md`.

- **Scaffolding with `create-next-app` (Phase 1).** Three reasons to scaffold into a temporary `revcode/` subfolder and move the files up: the project folder name has capitals and spaces (npm rejects capitals in package names); `create-next-app` refuses folders that already contain files like `PLAN.md`; and by default (`--agents-md`) it generates its own `AGENTS.md` **and `CLAUDE.md`**. When moving files up: keep its `AGENTS.md`; **discard its `CLAUDE.md`** (ours must never be overwritten) and add `@AGENTS.md` as the first line of ours; set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on, while Prettier writes LF. Resolved in Phase 1: `.gitattributes` (`* text=auto eol=lf`) and Prettier `endOfLine: "lf"`.
- **Vitest runs with `NODE_ENV=test`, and `@next/env`'s `loadEnvConfig` then skips `.env.local`.** Phase 4's DB test setup must load `TEST_DATABASE_URL` another way (for example, read `.env.local` explicitly), and must give `runMigrations` a **direct** connection (its advisory lock is session-level; the pooler doesn't keep it).
