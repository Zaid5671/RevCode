# RevCode — Implementation Plan (v2)

> Name: **RevCode** (renamed from the working name "Recurse" on 2026-09-24), a NeetCode 250 revision tracker. Do not use NeetCode's name or logo as the product name.
>
> This plan replaces `PLAN.old.md` (Vite + Express + MySQL). The scheduling design is carried over. The stack, login, revision gaps, dashboard, row layout and notes changed, based on the decisions recorded in §0.

---

## 0. Decisions (settled — do not reopen without the owner)

| Topic | Decision | Why |
|---|---|---|
| Stack | **One Next.js app** (pages + API route handlers) | One deploy, one origin, no proxy, no CORS. Express on Vercel would also run as serverless functions, so it adds setup without any benefit. |
| Hosting | **Vercel** (Hobby) for the app | Doesn't sleep when idle, unlike Render's free tier. Hobby is for non-commercial use, which fits. |
| Database | **Neon Postgres** (Free): **production in its own project**; `dev` and `test` are branches of a separate development project | Permanent free plan, 100 projects, 0.5 GB and 100 CU-hours per project, never deletes data at limits. Compute is budgeted per project, so development can never use up the live app's hours. Serverless-friendly pooled connections. Plain Postgres, so it's portable. |
| Login | **Google only** in v1 | No email sending, verification or password resets. Email + password is a later addition (Better Auth supports it without changing the schema much). |
| Revision gaps | Defaults in §4.1, **editable per user** | Due dates are derived, so changing gaps just moves pending dates. |
| Dashboard | Overdue · Today · Tomorrow · **Next 7 days**, shown as two lists: "Revise now" and "Coming up" | The owner wants to see what's coming, not only what's due. |
| Look and feel | **Simple, quiet, dense**, continuing the original tracker's design (`docs/DESIGN-BRIEF.md`) | The owner found the original concise: information where it's needed, nothing extra. |
| Problems page | **Collapsible category folders, no pagination** | 250 problems load in one request, so search, filters and sorting always see everything; folders keep the screen short. |
| Notes | **Formatted (Markdown) notes per problem**, allowed on unsolved problems, plus a Notes section per category | See §8. |
| Old data | **No import** from the old HTML tracker (owner decision, 2026-09-24; replaces the earlier import plan) | Fewer moving parts; progress is entered fresh in RevCode. |

---

## 1. What we are building

A multi-user web app. Each user signs in with Google and tracks their own progress through the **NeetCode 250** with **spaced-repetition revisions** and **notes**.

### v1 features

- Sign in with Google. Every user sees only their own data.
- The **NeetCode 250 catalog**: category, problem name (links to **LeetCode**), difficulty, and a Premium badge where relevant.
- Per problem, per user: solved + solved date, confidence (1–3), three revisions, and a note.
- **Due dates are calculated automatically** and update when a revision is logged (early or late), when a date is edited, when confidence changes, and when the user changes their gaps.
- **Dashboard:** Overdue · Due today · Due tomorrow · Next 7 days, plus a progress summary.
- **Problems page:** one table in 18 collapsible category folders (no pagination), filters, search.
- **Notes:** a notes editor per problem (toolbar + preview) and a **Notes section** that reads like one document per category, with Markdown downloads.
- **Settings:** revision gaps, time zone, delete account, sign out.
- Privacy policy and terms pages (static; Google's consent screen links to them).

### Out of scope for v1

Importing data from the old HTML tracker, a JSON export of all account data (notes are downloaded as Markdown instead, §8.4), email + password login, images or attachments in notes, more than three revisions, streaks, email reminders, admin panel, sharing, mobile app.

---

## 2. Tech stack (fixed — do not add libraries without asking)

| Part | Tools |
|---|---|
| Language | **TypeScript** (strict, `noUncheckedIndexedAccess`) |
| Runtime | **Node.js 24 LTS** |
| Framework | **Next.js 16** (App Router), **React 19** |
| Styling | **Tailwind CSS v4** |
| Client data | **TanStack Query** |
| Database | **Postgres** on **Neon**, via **`pg`** with plain SQL; **`@vercel/functions`** for `attachDatabasePool` (approved by the owner) |
| Auth | **Better Auth** (Google provider, `pg` Pool, `nextCookies()` plugin) |
| Validation | **Zod** (shared by client and server) |
| Notes rendering | **react-markdown** + **remark-gfm** (approved by the owner) |
| Tests | **Vitest**, **React Testing Library** |
| Code quality | **ESLint**, **Prettier** |
| Scripts | **tsx** (runs `scripts/*.ts`; they load `.env.local` with `loadEnvConfig` from `@next/env`, which ships with Next.js) |

**Companion packages** that the tools above need to work may be added without asking: `@types/*`, `eslint-config-next`, `@tailwindcss/postcss` (Tailwind v4's PostCSS plugin, installed by `create-next-app`), `@vitejs/plugin-react`, `jsdom`, `@testing-library/*` and `vite-tsconfig-paths`. Anything else follows the rule in the heading.

What the non-obvious pieces do:

- **Route handlers** (`src/app/api/**/route.ts`) are the backend. They run as Vercel serverless functions.
- **TanStack Query** loads API data into React with loading and error states, and refetches after changes.
- **Zod** checks real request data at runtime (TypeScript types disappear at runtime). The same schemas type the client.
- **react-markdown** turns stored Markdown text into formatted notes. It does **not** render raw HTML, so a note cannot inject scripts. **remark-gfm** adds tables, task lists and strikethrough.
- **Better Auth** handles Google OAuth, sessions and cookies. Never hand-roll auth.

Deliberately **not** used: ORMs, Server Actions for data mutations (route handlers are easier to test and reason about), rich-text editor libraries (a textarea + toolbar is enough), global state libraries, form libraries, UI component libraries, Docker, logging libraries, caching layers.

---

## 3. Repository layout (one Next.js app)

```
(project root)
├─ PLAN.md
├─ CLAUDE.md                     loaded every session; points to the files below
├─ docs/PROGRESS.md              current phase, phase log, gotchas, owner to-dos
├─ docs/DESIGN-BRIEF.md          visual design: colours, fonts, every screen
├─ package.json
├─ tsconfig.json                 strict
├─ eslint.config.mjs, .prettierrc, .prettierignore, vitest.config.ts
├─ .gitattributes                LF line endings on every OS
├─ AGENTS.md                     generated by create-next-app (points agents to bundled Next.js docs); imported by CLAUDE.md
├─ vercel.json                   { "regions": ["sin1"] }: functions run in Singapore, next to Neon
├─ .env.example                  committed; .env.local is not
├─ data/
│  └─ neetcode_250_complete.json source list as supplied (never edited by hand after Phase 1)
├─ db/
│  ├─ migrations/                001_catalog.sql … 005_notes.sql
│  └─ seed/
│     ├─ catalog.json            generated by scripts/build-catalog.ts, reviewed, committed
│     └─ catalog.test.ts         checks catalog.json (§5.4)
├─ scripts/
│  ├─ cli.ts                     shared by the scripts: loads .env.local, direct connection, runIfMain
│  ├─ build-catalog.ts           data/ → db/seed/catalog.json (see §5.4), + build-catalog.test.ts
│  ├─ migrate.ts                 applies pending migrations in order (exports runMigrations for test setup)
│  └─ seed.ts                    idempotent catalog upsert (exports seedCatalog for test setup)
├─ src/
│  ├─ proxy.ts                   optimistic redirect to /sign-in when no session cookie
│  ├─ app/
│  │  ├─ (app)/                  signed-in layout (nav, RequireSession)
│  │  │  ├─ page.tsx             Dashboard
│  │  │  ├─ problems/page.tsx
│  │  │  ├─ notes/page.tsx       redirects to the first category
│  │  │  ├─ notes/[categoryId]/page.tsx
│  │  │  └─ settings/page.tsx
│  │  ├─ sign-in/page.tsx, privacy/page.tsx, terms/page.tsx
│  │  └─ api/                    route handlers (§7), one route.ts per path:
│  │     ├─ auth/[...all]/       Better Auth
│  │     ├─ health/, me/, catalog/, dashboard/, gaps/
│  │     ├─ progress/, progress/[problemId]/, progress/[problemId]/revisions/[n]/
│  │     ├─ notes/, notes/search/, notes/export/, notes/[problemId]/, categories/[categoryId]/notes/
│  │     └─ account/
│  ├─ domain/                    pure logic, no I/O — used by server and client
│  │  ├─ calendarDate.ts         YYYY-MM-DD parse/validate, addDays, compare, todayIn(tz)
│  │  ├─ gaps.ts                 DEFAULT_GAPS, gap validation
│  │  ├─ schedule.ts             computeSchedule, bucketFor
│  │  ├─ timeline.ts             validateTimeline
│  │  └─ schemas.ts              Zod request/response schemas + inferred types
│  ├─ server/
│  │  ├─ config.ts               env validated with Zod at startup
│  │  ├─ db.ts                   pg Pool (attachDatabasePool), DATE type parser, withTransaction()
│  │  ├─ auth.ts                 Better Auth config
│  │  ├─ errors.ts               AppError + codes
│  │  ├─ handler.ts              withHandler(): origin check, session, Zod, error mapping (§7.1)
│  │  └─ modules/
│  │     ├─ catalog/             catalog.repository.ts
│  │     ├─ progress/            progress.service.ts, progress.repository.ts (also dashboard + stats)
│  │     ├─ gaps/                gaps.service.ts, gaps.repository.ts
│  │     ├─ notes/               notes.service.ts, notes.repository.ts, notes.markdown.ts
│  │     └─ account/             account.service.ts (/api/me, account deletion)
│  ├─ client/                    authClient, typed fetch wrapper, TanStack Query hooks
│  └─ components/                ReminderPanel, ProblemTable, CategoryGroup, ProblemRow, SolveForm, EditDrawer,
│                                RevisionCell, NotesButton, NoteDrawer, NoteEditor, MarkdownView,
│                                GapsEditor, Filters, DateField, ConfidencePicker
└─ test/                         tests that need Postgres (services, route handlers)
   ├─ helpers/                   test DB reset, user factory, stubbed session
```

Tests that need no database (domain logic, schemas, components, the Markdown builder) sit **next to the file they test** as `*.test.ts(x)`. Only database-backed tests live in `test/`.

Folders are created by the phase that first needs them; nothing is scaffolded ahead of time. This layout is the map every phase follows. A phase may change it when there is a real reason, and then updates this section in the same commit, so the map always matches the code. Phase 1's `create-next-app` provides `src/app/layout.tsx`, `globals.css` and the config files.

Layering on the server: **route handler** (HTTP only) → **service** (business rules, transactions) → **repository** (SQL only). Route handlers never contain SQL; repositories never contain business rules. `src/domain` has no imports from `server` or `client`.

---

## 4. Revision scheduling (the core logic)

Pure functions in `src/domain/schedule.ts`, fully unit tested.

### 4.1 Gaps

A **gap** is the number of days after the **previous event**: the solve date for Revision 1, and the **actual completion date** of the previous revision for Revisions 2 and 3.

Defaults (`DEFAULT_GAPS`):

| Confidence | R1 | R2 | R3 | Days from solve, if all on time |
|---|---|---|---|---|
| 1 — Shaky | 1 | 4 | 10 | 1, 5, 15 |
| 2 — Okay | 3 | 7 | 14 | 3, 10, 24 |
| 3 — Solid | 5 | 14 | 30 | 5, 19, 49 |

Reasoning (for the Settings help text): each gap is roughly 2–4× the previous one (spaced repetition's expanding intervals). Shaky problems come back the next day, before the approach fades. The last revision lands 2–7 weeks after solving, which tests long-term memory within a typical 2–3 month prep. The total number of revisions doesn't depend on the gaps, since every problem gets three, so changing them only moves work earlier or later.

**Per-user gaps:** each value is an integer from **1 to 180**. Users edit a 3×3 table in Settings, with **Reset to defaults**. A user with no stored gaps uses `DEFAULT_GAPS`. Gaps do not have to increase; users may set whatever suits them.

### 4.2 Store facts, derive due dates

The database stores only facts: `solved_on`, `confidence`, `revision1_completed_on`, `revision2_completed_on`, `revision3_completed_on`, and the user's gaps.

**Due dates are never stored.** They are computed on every read. Therefore:

- Logging a revision late or early shifts all later revisions.
- Editing any past date recalculates everything after it.
- Changing confidence or gaps recalculates pending due dates. Completed dates never change.

### 4.3 Algorithm

```
computeSchedule({ solvedOn, confidence, completed: [r1, r2, r3] }, gaps, today)

gap = gaps[confidence]            // [g1, g2, g3]
anchor = solvedOn
firstPendingSeen = false
for k in 1..3:
  if completed[k] is set:
      revision k → { status: "done", date: completed[k] }
      anchor = completed[k]
  else if not firstPendingSeen:
      firstPendingSeen = true
      due = addDays(anchor, gap[k])
      revision k → { status: bucketFor(due, today), date: due }
      anchor = max(due, today)    // if late, later ones assume it is done today
  else:
      projected = addDays(anchor, gap[k])
      revision k → { status: "projected", date: projected }
      anchor = projected

bucketFor(due, today):
  due <  today         → "overdue"
  due == today         → "due_today"
  due == today + 1     → "due_tomorrow"
  due <= today + 7     → "next_7_days"
  otherwise            → "later"

result: { revisions: [3 items], next: first pending revision or null, isComplete: all 3 done }
```

- Only the **next pending** revision has a real due date and appears on the dashboard. Later ones are **projected** (shown muted, in brackets).
- When all three are done the problem is **Complete**: no more reminders.

### 4.4 Timeline rules

Enforced by `validateTimeline()` in services (friendly `409` errors), and by `CHECK` constraints in Postgres as a backstop:

1. `solved_on ≤ revision1 ≤ revision2 ≤ revision3` (same day allowed).
2. Revision 2 requires Revision 1; Revision 3 requires Revision 2.
3. A date **written in the current request** may not be later than the user's today. *(App-level only.)* Dates already stored are not re-checked, so changing time zone never blocks later edits.
4. Any completed revision date may be **edited** as long as rules 1–3 still hold.
5. **Undo** is allowed only for the most recent completed revision.
6. **Unmark solved** deletes the progress row (UI confirms first). **The note is kept** (notes are stored separately, §5.3).

### 4.5 Dates and time zones

- All domain dates are calendar dates `YYYY-MM-DD`: Postgres `DATE`, JSON strings on the wire. JavaScript `Date` objects are never used in domain logic.
- `db.ts` registers `types.setTypeParser(1082, v => v)` so `pg` returns `DATE` columns as strings. (By default `pg` converts them to `Date` objects at local midnight, which shifts dates across zones.)
- `calendarDate.ts`: `isValidCalendarDate` (rejects `2026-02-30`), `addDays` (via `Date.UTC` arithmetic), `compare` (ISO strings compare correctly as text), `todayIn(timeZone)` (via `Intl.DateTimeFormat(...).formatToParts`), `isValidTimeZone`.
- Each user has an IANA `timezone` (e.g. `Asia/Kolkata`), stored as `null` until set; the server treats `null` as `UTC`. After sign-in, the client detects the browser zone and saves it only while the stored value is `null`, so a deliberate choice of `UTC` is never overwritten. It can be changed in Settings.
- The server computes **today for the requesting user** and returns it in responses, so the client never guesses.

### 4.6 Required unit tests (table-driven)

- Each confidence level with default gaps, all revisions on time.
- Custom gaps: a user's gaps are used instead of the defaults.
- R1 late → R2/R3 shift later; R1 early → they shift earlier.
- Same-day revisions.
- Overdue next revision → projections anchor on today.
- Confidence change and gap change: before any revision, mid-cycle, while overdue. Completed dates unchanged.
- Bucket boundaries: today, +1, +2, +7, +8.
- Complete cycle → `next = null`, `isComplete = true`.
- Month end, year end, 29 February (leap and non-leap years).
- `todayIn` for a zone whose local date differs from UTC.
- `validateTimeline`: every rule in §4.4, passing and failing.
- Gap validation: 0, 1, 180, 181, non-integers, missing confidence levels.

---

## 5. Database (Postgres)

### 5.1 Migrations

- Plain SQL files in `db/migrations/`, named `NNN_description.sql`, applied in order by `scripts/migrate.ts` inside a transaction each (Postgres DDL is transactional).
- The runner records applied files in `schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())` and skips those already applied.
- Migrations use the **direct (unpooled)** Neon connection string; the app uses the **pooled** one.
- **Never edit an applied migration — add a new one.** Migrations are always backward-compatible (add first, remove later).

| File | Contents |
|---|---|
| `001_catalog.sql` | `category`, `problem` |
| `002_auth.sql` | Better Auth tables, generated with `npx auth@latest generate` from the final `auth.ts` (including the `timezone` user field), committed as generated |
| `003_progress.sql` | `user_problem` |
| `004_gaps.sql` | `user_gap` |
| `005_notes.sql` | `problem_note` |

### 5.2 Catalog

```sql
CREATE TABLE category (
  id        SMALLINT PRIMARY KEY,
  name      TEXT     NOT NULL UNIQUE,
  position  SMALLINT NOT NULL UNIQUE
);

CREATE TABLE problem (
  id             SMALLINT PRIMARY KEY,
  leetcode_slug  TEXT     NOT NULL UNIQUE CHECK (leetcode_slug ~ '^[a-z0-9-]+$'),
  neetcode_slug  TEXT     NOT NULL UNIQUE,     -- used to import old-tracker data
  title          TEXT     NOT NULL,
  difficulty     TEXT     NOT NULL CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
  category_id    SMALLINT NOT NULL REFERENCES category (id),
  position       SMALLINT NOT NULL,            -- order within its category
  is_premium     BOOLEAN  NOT NULL DEFAULT FALSE,
  UNIQUE (category_id, position)
);
```

The LeetCode URL is **derived**, never stored: `https://leetcode.com/problems/${leetcode_slug}/`.

`neetcode_slug` was meant for importing old-tracker data. The import was dropped (§9), but the column stays: `001_catalog.sql` is already applied, and applied migrations are never edited.

### 5.3 Per-user tables

`"user"` is a reserved word in Postgres; always quote it. Its `id` type must match what `002_auth.sql` generates (text).

```sql
-- A row exists only while a problem is solved.
CREATE TABLE user_problem (
  user_id                 TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  problem_id              SMALLINT NOT NULL REFERENCES problem (id),
  solved_on               DATE     NOT NULL,
  confidence              SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 3),
  revision1_completed_on  DATE,
  revision2_completed_on  DATE,
  revision3_completed_on  DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id),
  CHECK (revision1_completed_on IS NULL OR revision1_completed_on >= solved_on),
  CHECK (revision2_completed_on IS NULL OR (revision1_completed_on IS NOT NULL AND revision2_completed_on >= revision1_completed_on)),
  CHECK (revision3_completed_on IS NULL OR (revision2_completed_on IS NOT NULL AND revision3_completed_on >= revision2_completed_on))
);

-- Absent rows mean "use DEFAULT_GAPS for this confidence".
CREATE TABLE user_gap (
  user_id     TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  confidence  SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 3),
  r1          SMALLINT NOT NULL CHECK (r1 BETWEEN 1 AND 180),
  r2          SMALLINT NOT NULL CHECK (r2 BETWEEN 1 AND 180),
  r3          SMALLINT NOT NULL CHECK (r3 BETWEEN 1 AND 180),
  PRIMARY KEY (user_id, confidence)
);

-- Independent of user_problem: notes survive "unmark solved" and exist for unsolved problems.
CREATE TABLE problem_note (
  user_id     TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  problem_id  SMALLINT NOT NULL REFERENCES problem (id),
  body        TEXT     NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  version     INTEGER  NOT NULL DEFAULT 1,       -- +1 on every update; used for conflict checks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
```

- `updated_at` is set explicitly by the repositories on every update (no triggers). It is for display only. **Conflict checks use `problem_note.version`**, never timestamps: Postgres stores microseconds but JavaScript `Date` keeps only milliseconds, so timestamps read back through `pg` never compare equal.
- The primary keys `(user_id, …)` also serve "load everything for this user". No extra indexes are needed at this scale; note search uses `ILIKE` over at most 250 rows per user.

### 5.4 Catalog build and seed

The supplied `data/neetcode_250_complete.json` has been checked: 250 problems, 18 categories (60 Easy / 155 Medium / 35 Hard), no duplicate names or URLs. Known issues that `scripts/build-catalog.ts` handles:

- **Its `slug` field is the NeetCode slug, not the LeetCode slug** (74 differ, e.g. `two-integer-sum` vs `two-sum`). Take `leetcode_slug` from the last segment of `leetcode_url`; store `slug` as `neetcode_slug`.
- 13 `leetcode_url`s lack a trailing `/`. Irrelevant once the slug is extracted.
- No Premium flags. Mark these 7 LeetCode slugs as premium: `encode-and-decode-strings`, `walls-and-gates`, `graph-valid-tree`, `number-of-connected-components-in-an-undirected-graph`, `alien-dictionary`, `meeting-rooms`, `meeting-rooms-ii`.
- Category ids 1–18 follow the file's `categories` order; problem ids 1–250 follow the file's problem order; `position` is the order within the category.

Rules:

- `db/seed/catalog.json` is generated once, reviewed by the owner, and committed. From then on **ids are permanent**: progress and notes reference them. New problems get new ids; ids are never reused or renumbered.
- `scripts/seed.ts` upserts by id (`INSERT … ON CONFLICT (id) DO UPDATE`) in one transaction. Running it twice changes nothing. It never deletes.
- A unit test checks `catalog.json`: exactly 250 problems, 18 categories, unique ids, unique slugs, valid slugs and difficulties, every category exists, positions unique within each category.

---

## 6. Authentication (Better Auth, Google only)

`src/server/auth.ts`:

- `database`: a `pg` Pool (the shared one from `db.ts`).
- `baseURL`: `BETTER_AUTH_URL` (`http://localhost:3100` locally; the production URL on Vercel).
- `socialProviders.google`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Required in all environments.
- `emailAndPassword`: **disabled** in v1.
- `user.additionalFields.timezone`: `string`, `required: false`, default `null`, `input: false` (changed only through `PATCH /api/me`, with validation).
- `user.deleteUser.enabled: true` (account deletion is off by default in Better Auth). Google-only users have no password, so Better Auth requires a **fresh session** (signed in within `session.freshAge`, default 1 day). If the session is older, `DELETE /api/account` returns `403 SESSION_NOT_FRESH` and the UI asks the user to sign in again.
- `plugins: [nextCookies()]`.
- Session cookie: Better Auth defaults (`HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS). Sessions stored in Postgres.

Wiring:

- `src/app/api/auth/[...all]/route.ts`: `export const { GET, POST } = toNextJsHandler(auth);`
- `src/proxy.ts`: **optimistic** redirect to `/sign-in` when `getSessionCookie()` finds no cookie. This is only for convenience; it is **not** the security check.
- **The real check** happens in every protected route handler (via `withHandler()` in `server/handler.ts`) and in the signed-in layout: `auth.api.getSession({ headers: await headers() })`. No session → `401` (API) or redirect (pages).

Google OAuth setup (free):

1. Google Cloud Console → new project → OAuth consent screen (External; app name; support email; links to `/privacy` and `/terms`). Scopes: `openid`, `email`, `profile` only.
2. Credentials → OAuth client ID → Web application.
3. Authorised redirect URIs: `http://localhost:3100/api/auth/callback/google` and, in Phase 9, `https://<production-domain>/api/auth/callback/google`.
4. Put the id and secret in `.env.local` (and later in Vercel's environment variables).
5. Publish the consent screen before sharing with others (while it's in "Testing", only listed test users can sign in).

Vercel preview deployments get random URLs that aren't registered with Google, so sign-in only works locally and on production. That's acceptable.

---

## 7. API

Base path `/api`, JSON only. Every route except `/api/health` and `/api/auth/*` requires a session.

**Every query on per-user tables includes `user_id = $n` bound to the session user.** No endpoint accepts a user id from the client.

| Method & path | Body / query | Returns |
|---|---|---|
| `GET /api/health` | — | `{ ok: true }` after `SELECT 1`; `503` if the DB is unreachable |
| `ALL /api/auth/*` | — | Better Auth |
| `GET /api/me` | — | `{ id, name, email, image, timezone, today }` |
| `PATCH /api/me` | `{ timezone }` | updated profile |
| `GET /api/catalog` | — | `{ categories, problems }` with derived `leetcodeUrl`; `Cache-Control: private, max-age=86400` (session-only route, so never public) |
| `GET /api/progress` | — | `{ today, entries: ProgressEntry[] }` |
| `PUT /api/progress/:problemId` | `{ solvedOn, confidence }` | `ProgressEntry` (create or replace; keeps revisions only if the timeline still holds, else `409`) |
| `PATCH /api/progress/:problemId` | `{ solvedOn?, confidence? }` | `ProgressEntry` |
| `DELETE /api/progress/:problemId` | — | `204` (note is kept) |
| `PUT /api/progress/:problemId/revisions/:n` | `{ completedOn }` | `ProgressEntry` (complete the next pending revision, or edit a completed one) |
| `DELETE /api/progress/:problemId/revisions/:n` | — | `ProgressEntry` (undo; latest completed only) |
| `GET /api/dashboard` | — | `{ today, overdue, dueToday, dueTomorrow, next7Days, stats }` |
| `GET /api/gaps` | — | `{ gaps, isDefault }` |
| `PUT /api/gaps` | `{ gaps: { 1: [r1,r2,r3], 2: […], 3: […] } }` | `{ gaps, isDefault }` |
| `DELETE /api/gaps` | — | defaults |
| `GET /api/notes` | — | `[{ problemId, updatedAt }]` (for the Notes column and counts) |
| `GET /api/categories/:categoryId/notes` | — | `[{ problemId, body, version, updatedAt }]` for that category |
| `GET /api/notes/search?q=` | `q`: trimmed, 1–200 characters | search results: `[{ problemId, snippet, updatedAt }]` |
| `GET /api/notes/:problemId` | — | `{ problemId, body, version, updatedAt }` or `404` |
| `PUT /api/notes/:problemId` | `{ body, baseVersion: number \| null }` | saved note (with its new `version`); `409 NOTE_CONFLICT` if the stored `version` differs from `baseVersion` (§8.4). An empty/whitespace `body` deletes the note and returns `204`. |
| `DELETE /api/notes/:problemId` | — | `204` |
| `GET /api/notes/export` | `?categoryId=` optional | Markdown file download (`.md`, via `Content-Disposition`; §8.4) |
| `DELETE /api/account` | — | `204` (Better Auth `deleteUser`; all user rows removed by `ON DELETE CASCADE`); `403 SESSION_NOT_FRESH` if signed in more than a day ago (§6) |

- `ProgressEntry` = `{ problemId, solvedOn, confidence, revisions: [{ number, status, date }] ×3, next, isComplete }`, i.e. the output of `computeSchedule`.
- Dashboard items: `{ problemId, revision, dueDate, daysOverdue?, hasNote }`. `stats` = solved total and by difficulty, completed cycles, notes count.

### 7.1 Conventions

- **`withHandler()`** (`server/handler.ts`) does, in order: origin check (mutations) → session → Zod parse of params, query and body (`.strict()`: unknown keys rejected) → call the service → map errors. Every handler uses it.
- **One error shape:** `{ "error": { "code": "…", "message": "…", "details"?: … } }`.
  - `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN_ORIGIN` · `404 NOT_FOUND` · `409 TIMELINE_CONFLICT` · `409 NOTE_CONFLICT` · `413 PAYLOAD_TOO_LARGE` · `500 INTERNAL_ERROR` (generic message; details only in the server log).
  - Postgres errors map as a backstop: `23514` (CHECK violation) → `409 TIMELINE_CONFLICT`; `23505` (unique violation, e.g. two tabs marking the same problem solved at once, where `SELECT … FOR UPDATE` has no row to lock yet) → `409 CONFLICT`; `23503` (foreign key violation, e.g. an unknown `problemId`) → `404 NOT_FOUND`.
- **Transactions:** every progress mutation runs *`SELECT … FOR UPDATE` → validate → write → read back → compute schedule* in one transaction, so two tabs cannot produce an invalid state.
- **Origin check:** for `POST`/`PUT`/`PATCH`/`DELETE`, reject a request whose `Origin` header is present and not equal to `BETTER_AUTH_URL`. With `SameSite=Lax` cookies this blocks CSRF.
- **Request size:** reject bodies over 64 KB before parsing (`413`); notes are capped at 20,000 characters by Zod and the database.
- **Logging:** `console` only. Never log cookies, auth headers, tokens or note bodies.
- **Database connections on Vercel:** following Neon's guide for Vercel Fluid compute: the **pooled** connection string; one Pool declared at module scope in `db.ts` with `max: 2`, `idleTimeoutMillis: 5000`; registered with `attachDatabasePool(pool)` from `@vercel/functions` so idle connections close before an instance suspends.

---

## 8. Frontend

### 8.1 Setup

- `authClient = createAuthClient()` from `better-auth/react` (same origin).
- `client/api.ts`: a typed `fetch` wrapper that sends and receives JSON, parses the error shape into `ApiError`, and validates responses with the shared Zod schemas.
- TanStack Query hooks: `useMe`, `useCatalog`, `useProgress`, `useDashboard`, `useGaps`, `useNotesIndex`, `useNote`, `useCategoryNotes`, plus mutation hooks. After any progress or gaps change, invalidate `progress` and `dashboard`. After any note change, invalidate `notes*` and `dashboard`.
- Routes: public `/sign-in`, `/privacy`, `/terms`; signed in `/` (dashboard), `/problems`, `/notes/[categoryId]`, `/settings`.
- After sign-in, if `me.timezone === null`, `PATCH /api/me` once with the browser zone.
- **Save status is always visible.** Every mutation shows pending, success or error near where it happened. A failed save never looks like a successful one. (This is the failure that sank the old HTML tracker.)

### 8.2 Dashboard (`/`)

Visual design: `docs/DESIGN-BRIEF.md` §1 and §3. The design is deliberately simple, continuing the original tracker's look.

- **Stats strip:** Solved (x / 250, %), Overdue, Due today, Next 7 days (= `dueTomorrow` + `next7Days` from the API, i.e. everything in "Coming up"), Complete.
- **ReminderPanel** has two lists, each with an empty state. The four buckets stay distinct through each item's status colour and label:
  - **Revise now:** overdue + due today, most overdue first.
  - **Coming up:** tomorrow + next 7 days, grouped by date.
- Each item is a compact chip showing: the problem link, `R1`/`R2`/`R3`, the status label, a **Notes** icon (opens the note drawer, so you can review notes while revising), and a **Done** (✓) icon. Done opens a popover whose date defaults to today and can be changed to an earlier date before confirming.

### 8.3 Problems (`/problems`)

Visual design: `docs/DESIGN-BRIEF.md` §4. It is one compact table, like the original tracker's, split into **collapsible category groups**. There is **no pagination**: all 250 problems load in one request, so search, filters and "next due" sorting always see everything.

- Each category header row shows a chevron, the name, `solved / total`, and `● N due` (overdue + due today) when any are waiting. Clicking it opens or closes the group.
- First visit: all categories collapsed. Open/closed state is remembered per browser in `localStorage` (wrapped in try/catch; the page works without it).
- Active search or filters open only the categories with matches and hide empty ones; clearing them restores the saved state. There is an "Expand all / Collapse all" link.

Row layout (approved):

```
 #  Problem            Diff  Solved     Conf  R1        R2        R3        Next            Notes
 4  Two Sum            E     ✓ 16 Sep   2     ✓ 18 Sep  25 Sep ✓  (9 Oct)   ● Fri 25 Sep    📝
 5  Longest Common…    E     ☐          –     –         –         –         –               +
```

- **Problem**: `<a href={leetcodeUrl} target="_blank" rel="noopener noreferrer">` with a Premium badge where relevant.
- **Solved**: tick + date. Ticking opens **SolveForm**: the date (defaults to today) and three confidence buttons. **Clicking a confidence saves and closes the form.** Nothing is saved if it's cancelled. Confidence can't be set on an unsolved problem.
- **Conf**: 1–3, editable any time.
- **R1–R3 (RevisionCell)**: done (✓ date), the next pending revision (due date + a small ✓ button that marks it done, via the same date popover as the dashboard), or projected (faint, in brackets). Status is never shown by colour alone.
- **Next**: a status dot + label for the next pending revision.
- **Notes (NotesButton)**: `+` or 📝; opens the NoteDrawer.
- Clicking a row opens **EditDrawer**: change solved date or confidence; complete, edit or undo revisions; **Unmark solved** (with confirmation; the note is kept). Server validation messages appear inline.
- **Filters** (one row, stored in URL search params): search by title, category, difficulty, and one **Status** select (all / unsolved / overdue / today / tomorrow / next 7 days / later / complete / has notes). **Sort**: NeetCode order or next due first.
- Below the `md` breakpoint, rows become compact two-line cards (`DESIGN-BRIEF.md` §4).

### 8.4 Notes

**NoteDrawer / NoteEditor** (opened from the Problems table, the dashboard, or the Notes section):

```
┌ Two Sum ↗ · Easy · Arrays & Hashing ─────────── ✕ ┐
│ [ Write | Preview ]                                 │
│ [B] [I] [H] [• List] [1. List] [</> Code] [Link]    │
│ ## Approach                                         │
│ One pass hash map: value → index ...                │
│                                                     │
│ Saved 10:42 PM              [ Delete ]  [ Save ]    │
└─────────────────────────────────────────────────────┘
```

- A plain `<textarea>` storing Markdown. The **toolbar** inserts Markdown syntax around the selection, so users don't need to know Markdown. **Preview** renders with `MarkdownView`.
- `MarkdownView` = `react-markdown` + `remark-gfm`. Raw HTML is **not** rendered. Links open in a new tab with `rel="noopener noreferrer"`. Code blocks use a monospace style with horizontal scroll. No images in v1 (image syntax renders as a link).
- **Explicit Save** (button and Ctrl/Cmd+S) with a visible "Saved 10:42 PM" / "Saving…" / "Save failed — your text is still here" status. Closing the drawer with unsaved changes asks for confirmation.
- **Conflict safety:** the client sends the `version` it loaded (`baseVersion`, or `null` for a new note). If the stored note has a different `version`, the server returns `409 NOTE_CONFLICT` and the editor offers "Load the newer version" or "Keep mine and overwrite" (which resends with the newer `baseVersion`). Unsaved text is never discarded silently.
- Character counter near the limit (20,000).

**Notes section (`/notes/[categoryId]`)**:

```
┌ Categories ─────────┐ ┌ Arrays & Hashing ────── [Download .md] ┐
│ Arrays & Hashing  5 │ │ ## 1. Two Sum ↗   Easy · Conf 2 [Edit] │
│ Two Pointers      2 │ │ (rendered note)                        │
│ Sliding Window    0 │ │ ## 4. Group Anagrams ↗  Medium  [Edit] │
│ …                   │ │ (rendered note)                        │
│ [Search notes…]     │ │ ☐ Show problems without notes          │
│ [Download all .md]  │ └─────────────────────────────────────────┘
└─────────────────────┘
```

- Left: the 18 categories in NeetCode order with note counts, a search box across all notes, and **Download all notes**. On phones the list becomes a category dropdown.
- Right: the category as one document, with problems in NeetCode order, each heading showing the link, difficulty and confidence, followed by the rendered note and **Edit** (opens the NoteDrawer). Problems without notes are hidden unless "Show problems without notes" is ticked (then they show "＋ Add note").
- **Downloads** (`GET /api/notes/export`), built by `notes.markdown.ts`:
  - One category: `# Arrays & Hashing`, then per problem with a note: `## 1. Two Sum (Easy)`, the LeetCode link, and the note body.
  - All notes: one file with every category as `#` headings in order. Filename `revcode-notes-YYYY-MM-DD.md`.

### 8.5 Settings (`/settings`)

- **Revision gaps:** a 3×3 editable table (confidence × R1–R3), with inline validation (1–180), Save, **Reset to defaults**, and the reasoning from §4.1 as help text. A note explains that changing gaps moves pending due dates, while completed revisions stay as they are.
- **Time zone** selector (`Intl.supportedValuesOf("timeZone")`).
- **Delete account** (type-to-confirm dialog). If the server answers `SESSION_NOT_FRESH`, the dialog says "For safety, sign in again to delete your account" with a Sign in button.
- **Sign out.**

### 8.6 Quality bar

- Loading, empty and error states on every screen; inline success and error messages next to the action.
- Accessibility: semantic `<table>`, labelled inputs, native `<input type="date">`, full keyboard use, visible focus, status never conveyed by colour alone, drawers trap focus and close on Escape.
- Responsive down to 360 px width with no horizontal page scroll.
- Light and dark themes following `prefers-color-scheme`.
- Dates displayed as "23 Sep 2026", always sent as `YYYY-MM-DD`.

---

## 9. Importing from the old HTML tracker (removed)

Removed by the owner on 2026-09-24. RevCode does not import data from the old HTML tracker: no import route, service, fixture or Settings section. Progress is entered fresh. The section number is kept so references to §10–§13 stay valid.

---

## 10. Configuration

`.env.local` (never committed; `.env.example` is committed with placeholders). The same variables are set in Vercel for production.

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** URL (`…-pooler…`) | used by the app |
| `DATABASE_URL_UNPOOLED` | Neon **direct** URL | used by `migrate.ts` and `seed.ts` |
| `TEST_DATABASE_URL` | Neon `test` branch direct URL | tests only |
| `BETTER_AUTH_URL` | `http://localhost:3100` | production: the Vercel domain |
| `BETTER_AUTH_SECRET` | 32+ random bytes, base64 | different value per environment |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | required |

- **Local port is fixed at 3100** (`npm run dev` runs `next dev -p 3100`; owner decision, 2026-09-24), so RevCode never collides with other local apps on 3000 and the Google redirect URI stays stable.
- **Database URLs use `sslmode=verify-full`**, not the `sslmode=require` that Neon's dashboard gives. `pg` 8 already treats `require` as `verify-full` and warns that `pg` 9 will weaken it; writing `verify-full` keeps full certificate checks. Apply this to the production values in Vercel too.

Generate the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

`server/config.ts` validates these with Zod on first use and throws a clear message if anything is missing or malformed.

Neon setup (all in AWS Singapore, all free, no local Postgres install needed):

- **Development project** (created 2026-09-24): branches **`dev`** (local development) and **`test`** (automated tests). Its default `production` branch is unused.
- **Production project** (created in Phase 9): its default **`production`** branch is the live database. Kept separate because Neon budgets compute (100 CU-hours/month) per project, so development work can never suspend the live app.

Vercel functions run in **Singapore** via `vercel.json` (`"regions": ["sin1"]`), next to the database; Vercel's default region is Washington, D.C.

---

## 11. Testing

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | `calendarDate`, `schedule`, `timeline`, `gaps`, Zod schemas, catalog JSON, Markdown export builder |
| Service | Vitest against the Neon `test` branch | every service function with real SQL and transactions |
| Route | Vitest, calling route handler functions with `Request` objects and a stubbed session | the wrapper: 401, origin check, validation, error mapping |
| Component | Vitest + React Testing Library | ReminderPanel buckets, CategoryGroup (header counts, open/close, search auto-opens matches and restores state), SolveForm (one-click save), RevisionCell states, NoteEditor toolbar and save states, GapsEditor validation |

Test DB setup: database-backed tests run as a **separate Vitest project with `fileParallelism: false`**, because all test files share one `test` branch and would otherwise wipe each other's data mid-run. Unit and component tests stay parallel. Before the run, reset the `test` branch schema, run migrations and the seed; before each test, delete from per-user tables and auth tables; create users directly in the `"user"` table.

Required service and route cases:

- `401` on every protected route without a session.
- **Isolation:** user B cannot read, change or delete user A's progress, gaps or notes.
- Validation errors: bad dates, confidence out of range, unknown keys, future dates, gaps out of range, notes over 20,000 characters.
- Timeline conflicts: out-of-order revisions, skipped revision, undoing a non-latest revision.
- Confidence change and gap change recalculate pending due dates and leave completed dates unchanged.
- Dashboard bucketing around the user's today, including a non-UTC time zone and the +7/+8 boundary.
- Notes: create, update (version increments), empty body deletes, `NOTE_CONFLICT` on a stale `baseVersion`, note survives unmark-solved, notes on unsolved problems, search, Markdown export content.
- Origin check rejects a foreign `Origin` on mutations.
- Two concurrent solves of the same problem: one succeeds, the other gets `409`, never `500`. Unknown `problemId` → `404`.
- Time zone: `null` is treated as `UTC`; changing zone doesn't block editing rows with previously stored dates.
- Account deletion removes progress, gaps and notes; a stale session gets `403 SESSION_NOT_FRESH`.

---

## 12. Build phases

One phase at a time. Each phase ends with its checks passing and a Git commit.

**Sections to read per phase.** Every phase reads §0 and §3; add these:

| Phase | Read |
|---|---|
| 1 Foundation | §2, §5.1, §5.2, §5.4, §10 |
| 2 Domain logic | §4, §7 (shapes for `schemas.ts`) |
| 3 Auth | §6, §7.1, §10 |
| 4 Progress + gaps API | §4.4, §5.3, §7, §7.1, §11 |
| 5 Notes API | §4.4, §5.3, §7, §7.1, §8.4, §11 |
| 6 Problems page | §8.1, §8.3, §8.6; `DESIGN-BRIEF.md` §1, §2, §4, §7 |
| 7 Dashboard + Settings | §4.1, §8.2, §8.5, §8.6; `DESIGN-BRIEF.md` §1, §3, §6 |
| 8 Notes UI | §8.4, §8.6; `DESIGN-BRIEF.md` §1, §5, §7 |
| 9 Go live + final QA | §6, §10, §13, the checklist below; `DESIGN-BRIEF.md` (all) |

UI phases (6–8) are only done when their screens meet the §8.6 quality bar (loading, empty and error states; keyboard use; 360 px width; light and dark) and have their component tests. Polish is part of building each screen, not a separate phase.

| # | Phase | Done when |
|---|---|---|
| 1 | **Foundation**: Next.js 16 app (scaffolded in a temporary folder, then moved up; keep its `AGENTS.md`, discard its `CLAUDE.md`, add `@AGENTS.md` to ours), a **Commands** section in `CLAUDE.md`, strict TS, Tailwind, ESLint, Prettier, Vitest, `.gitignore`, `.gitattributes`; verify the Neon connection; migration runner, `001_catalog.sql`, `build-catalog.ts`, `catalog.json` (owner reviews), seed, catalog test | `npm run lint`, `npm run typecheck`, `npm test` pass; dev server shows a placeholder page; `npm run db:migrate && npm run db:seed` loads 250 problems into `dev`, and re-running changes nothing |
| 2 | **Domain logic**: `calendarDate`, `gaps`, `schedule`, `timeline`, `schemas` + all tests in §4.6 | All unit tests pass |
| 3 | **Auth**: Google OAuth client, `auth.ts`, `002_auth.sql` (generated), sign-in page, `proxy.ts`, signed-in layout, `withHandler()`, `/api/health`, `/api/me` | Sign in with Google locally; `/api/me` returns the user; signed-out users are redirected |
| 4 | **Progress + gaps API**: `003`, `004`, repositories, services, routes, dashboard, account deletion + tests | All service and route tests for these pass |
| 5 | **Notes API**: `005`, notes repository, service, routes, search, Markdown export + tests | All notes tests pass |
| 6 | **App shell + Problems page**: design tokens and fonts, nav, API client, query hooks, table with collapsible CategoryGroups, SolveForm, EditDrawer, RevisionCell, filters | All tracking actions work in the browser; the page matches `DESIGN-BRIEF.md` §4 and meets §8.6 |
| 7 | **Dashboard + Settings**: ReminderPanel, stats strip, GapsEditor, time zone, delete account | Reminders match the schedule rules; changing gaps moves due dates; meets §8.6 |
| 8 | **Notes UI**: NotesButton, NoteDrawer, NoteEditor, MarkdownView, Notes section, downloads | Notes can be written, formatted, saved, found and downloaded; meets §8.6 |
| 9 | **Go live + final QA**: run the `security-review` skill; create the **production Neon project** (Singapore); Vercel project linked to the repo, `vercel.json` region `sin1`; its `production` branch; env vars; Google production redirect URI; migrate + seed `production`; publish consent screen; privacy/terms pages; the checklist below on the live site | Sign in, track and write notes on the production URL; the checklist fully passes there |

### Manual QA checklist (Phase 9)

- [ ] Google sign-in works; sign-out works; a second Google account sees none of the first account's data.
- [ ] Problem names open the correct LeetCode page in a new tab (click and Ctrl+click); Premium badge shows on the 7 premium problems.
- [ ] Problems page: all 18 folders collapsed on first visit; header counts (`solved / total`, `N due`) match the dashboard; open/closed state survives a reload; search opens only matching folders and clearing restores them; Expand/Collapse all works.
- [ ] Screens match `DESIGN-BRIEF.md`: colours, fonts, density; light and dark.
- [ ] Marking solved with confidence 2 today shows R1 in 3 days, R2 projected at day 10, R3 at day 24.
- [ ] Logging R1 late shifts R2 and R3 later; logging it early shifts them earlier.
- [ ] Changing confidence, or changing gaps in Settings, recalculates pending dates immediately; Reset to defaults works.
- [ ] Editing a completed revision to an invalid date shows a clear error; undo works only on the latest revision.
- [ ] Dashboard shows Overdue / Today / Tomorrow / Next 7 days correctly, including after changing time zone.
- [ ] Notes: toolbar formatting, preview, save status, unsaved-changes warning, a conflict between two tabs is caught, note survives unmark-solved, notes on unsolved problems.
- [ ] Notes section: category pages, counts, search, per-category and all-notes Markdown downloads open correctly.
- [ ] Two browser tabs editing the same problem never produce an invalid state.
- [ ] Delete account removes everything and signs out.
- [ ] Clearing browser data only signs you out; everything is there after signing in again, on another device too.
- [ ] Keyboard-only use works; layout works at 360 px; dark mode is readable.

---

## 13. Deployment notes

- **Vercel Hobby** (non-commercial). If the app ever earns money, move to Pro.
- **Neon Free** limits (checked Sep 2026, verify again at deploy time): 0.5 GB storage per project (writes blocked above it), 100 CU-hours per month per project, compute suspends after 5 minutes idle and wakes in under a second, 5 GB egress. Limits pause writes or compute but never delete data. At about 0.3–0.5 MB per heavy user, 0.5 GB holds roughly 1,000+ heavy users.
- Production has its own Neon project, so its compute budget is never shared with development.
- Run migrations against the production database **before** the new code goes live, and only with the owner's go-ahead; migrations stay backward-compatible.
- Add later if needed: rate limiting on mutations, email + password login (requires an email sender), GitHub Actions CI, Dependabot.
