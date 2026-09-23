# Recurse — Implementation Plan

> Working name: **Recurse** (a NeetCode 250 revision tracker). Rename freely; do not use NeetCode's name or logo as the product name.
>
> **Scope of this plan: local development only.** Build and test everything on one machine first. Deployment is deliberately deferred (see §12 for the notes to use when that time comes).

---

## 1. What we are building

A multi-user web app to track progress through the **NeetCode 250** list and schedule **spaced-repetition revisions**.

### v1 features

- Accounts: **email + password** (with email verification and password reset) and **Google** sign-in.
- The **NeetCode 250 catalog**: category, problem name (a link to the problem on **LeetCode**, not NeetCode), difficulty (Easy / Medium / Hard).
- Per problem, per user: **solved / unsolved**, **solved date**, **confidence (1–3)**, **three revisions**.
- **Revision due dates are calculated automatically.** They update when a revision is logged (early or late), when any date is edited, and when confidence is changed (confidence can be changed at any time).
- **Dashboard on open:** Overdue · Due today · Due tomorrow.
- Problems table with filters (category, difficulty, solved/unsolved, due state) and search.
- Progress summary (solved / 250, split by difficulty; completed cycles).
- Settings: time zone, export my data (JSON), delete my account.
- Privacy policy and terms pages (static).

### Out of scope for v1

Notes per problem, more than three revisions, streaks, email reminders, admin panel, mobile app, deployment.

---

## 2. Tech stack (fixed — do not add libraries without asking)

| Part | Tools |
|---|---|
| Language | **TypeScript** (strict) in every package |
| Runtime | **Node.js 24 LTS** |
| Frontend | **React 19**, **Vite**, **React Router**, **TanStack Query**, **Tailwind CSS v4** (`@tailwindcss/vite`) |
| Backend | **Express 5**, run with **tsx** in development |
| Database | **MySQL 8.4 LTS** (minimum 8.0.16 for enforced `CHECK` constraints) via **mysql2** with plain SQL |
| Auth | **Better Auth** (email/password + Google), using the mysql2 pool directly |
| Validation | **Zod** (schemas shared by frontend and backend) |
| Tests | **Vitest**, **Supertest** (API), **React Testing Library** (components) |
| Code quality | **ESLint** (typescript-eslint), **Prettier** |

Why each non-obvious piece exists:

- **Zod** — TypeScript types disappear at runtime; Zod validates real request data. One schema is shared by both apps.
- **TanStack Query** — loads server data into React with loading/error states, caching, and refetch after changes. Replaces hand-written `useEffect` + `useState` fetching.
- **Better Auth** — password hashing, sessions, email verification, Google OAuth. Never hand-roll auth.
- **mysql2 + plain SQL** — the app is small; hand-written SQL is simpler and clearer than an ORM.

Deliberately **not** used: ORMs (Prisma/Drizzle), logging libraries, email services (dev emails are printed to the terminal), global state libraries, form libraries, UI component libraries, toast libraries, Docker, microservices, caching layers.

---

## 3. Repository layout (npm workspaces)

```
recurse/
├─ CLAUDE.md
├─ docs/PLAN.md
├─ package.json                 workspaces: apps/*, packages/*
├─ tsconfig.base.json           strict settings shared by all packages
├─ eslint.config.js
├─ .prettierrc
├─ .gitignore                   includes .env, node_modules, dist
├─ apps/
│  ├─ api/
│  │  ├─ .env.example
│  │  ├─ db/
│  │  │  ├─ migrations/         001_catalog.sql, 002_auth.sql, 003_progress.sql
│  │  │  └─ seed/problems.json  the NeetCode 250 catalog
│  │  ├─ scripts/
│  │  │  ├─ migrate.ts          applies pending migrations in order
│  │  │  └─ seed.ts             idempotent catalog upsert
│  │  ├─ src/
│  │  │  ├─ app.ts              builds the Express app (no listen → importable by tests)
│  │  │  ├─ server.ts           listen + graceful shutdown
│  │  │  ├─ config.ts           env vars validated with Zod; exits on invalid config
│  │  │  ├─ db.ts               mysql2 pool + transaction helper
│  │  │  ├─ auth.ts             Better Auth configuration
│  │  │  ├─ errors.ts           AppError class + error codes
│  │  │  ├─ middleware/         requireSession, originCheck, validate, errorHandler
│  │  │  └─ modules/
│  │  │     ├─ catalog/         catalog.routes.ts, catalog.repository.ts
│  │  │     ├─ progress/        progress.routes.ts, progress.service.ts, progress.repository.ts
│  │  │     └─ account/         account.routes.ts, account.service.ts
│  │  └─ test/                  integration tests + helpers (test DB, signed-in agent)
│  └─ web/
│     ├─ index.html
│     ├─ vite.config.ts         proxies /api → http://localhost:3000
│     └─ src/
│        ├─ main.tsx, App.tsx   router + QueryClientProvider
│        ├─ routes/             Dashboard, Problems, Settings, Login, Signup,
│        │                      VerifyEmail, ForgotPassword, ResetPassword, Privacy, Terms
│        ├─ components/         ReminderPanel, ProblemTable, ProblemRow, SolveForm,
│        │                      EditDrawer, RevisionCell, DateField, ConfidencePicker, Filters
│        ├─ api/                typed fetch client + TanStack Query hooks
│        └─ lib/                authClient, formatting helpers
└─ packages/
   └─ shared/
      └─ src/
         ├─ calendarDate.ts     YYYY-MM-DD parsing, addDays, compare, todayIn(timeZone)
         ├─ schedule.ts         revision gaps + computeSchedule + timeline validation
         ├─ schemas.ts          Zod request/response schemas + inferred types
         └─ index.ts
```

Layering inside the API: **routes** (HTTP only) → **service** (business rules) → **repository** (SQL only). Routes never contain SQL; repositories never contain business rules.

`packages/shared` is consumed as TypeScript source (Vite and tsx both compile it). A production build strategy is decided in the deployment phase.

---

## 4. Revision scheduling (the core logic)

Lives in `packages/shared/src/schedule.ts`. Pure functions, no I/O, fully unit tested.

### 4.1 Gaps by confidence

A **gap** is the number of days after the **previous event**: the solve date for Revision 1, and the **actual completion date** of the previous revision for Revisions 2 and 3.

| Confidence | Gap → R1 | Gap → R2 | Gap → R3 | Cumulative if all on time |
|---|---|---|---|---|
| 1 — Shaky | 1 | 3 | 6 | day 1, 4, 10 |
| 2 — Okay | 2 | 5 | 14 | day 2, 7, 21 |
| 3 — Solid | 4 | 10 | 21 | day 4, 14, 35 |

Defined once as a constant (`REVISION_GAPS`). Tuning = editing one object.

### 4.2 Store facts, derive due dates

The database stores **only facts**: `solved_on`, `confidence`, `revision1_completed_on`, `revision2_completed_on`, `revision3_completed_on`.

**Due dates are never stored.** They are computed on every read. Consequences (all required behaviour):

- Logging a revision late or early shifts all later revisions.
- Editing any past date recalculates everything after it.
- Changing confidence at any time recalculates all pending due dates. Completed dates never change (they are facts).

### 4.3 Algorithm

```
computeSchedule({ solvedOn, confidence, completed: [r1, r2, r3] }, today)

anchor = solvedOn
firstPendingSeen = false
for k in 1..3:
  if completed[k] is set:
      revision k → { status: "done", date: completed[k] }
      anchor = completed[k]
  else if not firstPendingSeen:
      firstPendingSeen = true
      due = addDays(anchor, gap[confidence][k])
      status = due < today       → "overdue"
               due == today      → "due_today"
               due == today + 1  → "due_tomorrow"
               otherwise         → "upcoming"
      revision k → { status, date: due }
      anchor = max(due, today)          // if late, later ones assume it is done today
  else:
      projected = addDays(anchor, gap[confidence][k])
      revision k → { status: "projected", date: projected }
      anchor = projected

result: { revisions: [3 items], next: the first pending revision or null, isComplete: all 3 done }
```

- Only the **next pending** revision has a real due date and appears in reminders. Later ones are **projected**.
- When all three are done the problem is **Complete**: no more reminders.

### 4.4 Timeline rules

Enforced by `validateTimeline()` in the service layer (friendly `409` errors) **and** by `CHECK` constraints in MySQL (backstop):

1. `solved_on ≤ revision1 ≤ revision2 ≤ revision3` (same-day allowed).
2. Revision 2 requires Revision 1; Revision 3 requires Revision 2 (strictly sequential).
3. No date may be in the future relative to the user's today. *(App-level only: MySQL `CHECK` cannot use `CURDATE()`.)*
4. **Edit** any completed revision date as long as rules 1–3 still hold.
5. **Undo** is allowed only for the most recent completed revision.
6. **Unmark solved** deletes the progress row (UI asks for confirmation first).

### 4.5 Dates and time zones

- All dates are **calendar dates** `YYYY-MM-DD` — no time, no zone. MySQL type `DATE`; JSON strings on the wire.
- mysql2 pool is created with `dateStrings: true` and `timezone: 'Z'`, so DATE columns come back as `YYYY-MM-DD` strings and JavaScript `Date` objects are never involved in domain logic.
- `calendarDate.ts` provides: `isValidCalendarDate` (rejects `2026-02-30`), `addDays` (via `Date.UTC` arithmetic), `compare` (ISO strings compare lexically), `todayIn(timeZone)` (via `Intl.DateTimeFormat(...).formatToParts`), `isValidTimeZone`.
- Each user has an IANA `timezone` (e.g. `Asia/Kolkata`) stored on their account, default `UTC`. The web app detects the browser time zone after first sign-in and saves it if the stored value is still the default; it can be changed in Settings.
- The server computes **today for the requesting user** and returns it in responses, so the frontend never guesses.

### 4.6 Required unit tests (table-driven)

- Each confidence level, all revisions on time.
- R1 late → R2/R3 shift later; R1 early → shift earlier.
- Same-day revisions.
- Overdue next revision → projections anchor on today.
- Confidence change: before any revision, mid-cycle, while overdue.
- Editing R1 after R2 is done (valid and invalid).
- Complete cycle → `next = null`, `isComplete = true`.
- Month end, year end, 29 February (leap and non-leap).
- `todayIn` for a zone where the local date differs from UTC.
- `validateTimeline`: every rule in §4.4, both passing and failing cases.

---

## 5. Database

### 5.1 Migrations

- Plain SQL files in `apps/api/db/migrations/`, named `NNN_description.sql`, applied in order by `scripts/migrate.ts`.
- The runner records applied files in a `schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at DATETIME(3))` table and skips ones already applied.
- The runner uses a dedicated connection with `multipleStatements: true`; the app pool never enables it.
- MySQL DDL auto-commits, so each migration must be small and focused. **Never edit an applied migration — add a new one.**

| File | Contents |
|---|---|
| `001_catalog.sql` | `category`, `problem` |
| `002_auth.sql` | Better Auth tables, generated with `npx @better-auth/cli generate` from the final `auth.ts` config (including the `timezone` user field) and committed as-is |
| `003_progress.sql` | `user_problem` |

### 5.2 Catalog tables

```sql
CREATE TABLE category (
  id        TINYINT UNSIGNED  PRIMARY KEY,
  name      VARCHAR(50)       NOT NULL UNIQUE,
  position  TINYINT UNSIGNED  NOT NULL UNIQUE
);

CREATE TABLE problem (
  id           SMALLINT UNSIGNED PRIMARY KEY,
  slug         VARCHAR(100)      NOT NULL UNIQUE,   -- LeetCode slug
  title        VARCHAR(150)      NOT NULL,
  difficulty   ENUM('EASY','MEDIUM','HARD') NOT NULL,
  category_id  TINYINT UNSIGNED  NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,          -- order within category
  is_premium   BOOLEAN           NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_problem_category_position (category_id, position),
  CONSTRAINT fk_problem_category FOREIGN KEY (category_id) REFERENCES category (id)
);
```

- The LeetCode URL is **derived**, never stored: `https://leetcode.com/problems/${slug}/`.
- `is_premium` marks the few NeetCode 250 problems that are LeetCode Premium; the UI shows a small badge.

### 5.3 Progress table

A row exists **only while a problem is solved**, so "solved without a date or confidence" cannot be represented.

```sql
CREATE TABLE user_problem (
  user_id                 VARCHAR(36)       NOT NULL,  -- must match the type of `user`.id in 002_auth.sql
  problem_id              SMALLINT UNSIGNED NOT NULL,
  solved_on               DATE              NOT NULL,
  confidence              TINYINT UNSIGNED  NOT NULL,
  revision1_completed_on  DATE              NULL,
  revision2_completed_on  DATE              NULL,
  revision3_completed_on  DATE              NULL,
  created_at              DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at              DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, problem_id),
  CONSTRAINT fk_up_user    FOREIGN KEY (user_id)    REFERENCES `user` (id) ON DELETE CASCADE,
  CONSTRAINT fk_up_problem FOREIGN KEY (problem_id) REFERENCES problem (id),
  CONSTRAINT chk_up_confidence CHECK (confidence BETWEEN 1 AND 3),
  CONSTRAINT chk_up_r1_order   CHECK (revision1_completed_on IS NULL OR revision1_completed_on >= solved_on),
  CONSTRAINT chk_up_r2_order   CHECK (revision2_completed_on IS NULL OR revision2_completed_on >= revision1_completed_on),
  CONSTRAINT chk_up_r3_order   CHECK (revision3_completed_on IS NULL OR revision3_completed_on >= revision2_completed_on),
  CONSTRAINT chk_up_r2_needs_r1 CHECK (revision2_completed_on IS NULL OR revision1_completed_on IS NOT NULL),
  CONSTRAINT chk_up_r3_needs_r2 CHECK (revision3_completed_on IS NULL OR revision2_completed_on IS NOT NULL)
);
```

- Three fixed revision columns (rather than a child table) let MySQL enforce ordering between revisions with `CHECK` constraints.
- The primary key `(user_id, problem_id)` also serves "load all progress for this user".
- `user` is quoted with backticks in all SQL.

### 5.4 Catalog seed

- `db/seed/problems.json` holds categories and problems with **fixed ids**. **Ids are permanent** — progress rows reference them. New problems get new ids; ids are never reused or renumbered.
- Source: the NeetCode 250 list on neetcode.io (18 categories expected: Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List, Trees, Heap / Priority Queue, Backtracking, Tries, Graphs, Advanced Graphs, 1-D Dynamic Programming, 2-D Dynamic Programming, Greedy, Intervals, Math & Geometry, Bit Manipulation). Each problem's **LeetCode slug** must be checked by hand against leetcode.com. The owner reviews the final list.
- `scripts/seed.ts` upserts by id (`INSERT … ON DUPLICATE KEY UPDATE`) inside one transaction. Running it twice changes nothing. It never deletes.
- A unit test checks the JSON: exactly 250 problems, unique ids, unique slugs, slugs match `^[a-z0-9-]+$`, valid difficulties, every problem's category exists, positions unique within each category.

---

## 6. Authentication (Better Auth)

Configured in `apps/api/src/auth.ts`.

- `database`: the shared mysql2 pool.
- `baseURL`: `BETTER_AUTH_URL` = the **frontend origin** (`http://localhost:5173`), because all browser traffic goes through the Vite proxy.
- `trustedOrigins`: `[APP_ORIGIN]`.
- `emailAndPassword`: enabled, `requireEmailVerification: true`, password length 8–128, `sendResetPassword` → **prints the reset link to the API terminal** in development.
- `emailVerification`: `sendOnSignUp: true`, `sendVerificationEmail` → **prints the link to the terminal**. Both email senders go through one `sendEmail()` function in `src/email.ts`, so a real provider can be plugged in at deployment without touching auth code.
- `socialProviders.google`: enabled **only if** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The frontend hides the Google button when the API reports it disabled (`GET /api/auth-config`).
- `account.accountLinking`: enabled, `trustedProviders: ["google"]` (same email via Google and password → one account).
- `user.additionalFields.timezone`: `string`, default `"UTC"`, not settable at sign-up (`input: false`); changed only through `PATCH /api/me` with validation.
- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` when served over HTTPS (Better Auth defaults). Sessions stored in MySQL.

Express integration:

- Mount `app.all("/api/auth/*splat", toNodeHandler(auth))` **before** `express.json()` (Better Auth requirement).
- `requireSession` middleware: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`; on no session → `401`; otherwise sets `req.user` (typed via declaration merging).

Google OAuth for local development (free):

1. Google Cloud Console → create a project → OAuth consent screen (External; app name; your email).
2. Credentials → OAuth client ID → Web application.
3. Authorised JavaScript origin: `http://localhost:5173`. Authorised redirect URI: `http://localhost:5173/api/auth/callback/google`.
4. Put the client id and secret in `apps/api/.env`.

---

## 7. API

Base path `/api`. JSON only. Every route except `/api/health`, `/api/ready`, `/api/auth-config` and `/api/auth/*` requires a session.

**Every SQL query that touches progress includes `user_id = ?` bound to the session user.** No endpoint accepts a user id from the client.

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/health` | — | `{ ok: true }` (no DB access) |
| `GET /api/ready` | — | `{ ok: true }` after `SELECT 1`; `503` if the DB is unreachable |
| `GET /api/auth-config` | — | `{ google: boolean }` |
| `ALL /api/auth/*` | — | Better Auth |
| `GET /api/me` | — | `{ id, name, email, timezone, today }` |
| `PATCH /api/me` | `{ timezone }` | updated profile (validated IANA zone) |
| `GET /api/catalog` | — | `{ categories, problems }` with derived `leetcodeUrl`; sent with an `ETag` |
| `GET /api/progress` | — | `{ today, entries: ProgressEntry[] }` |
| `GET /api/reminders` | — | `{ today, overdue, dueToday, dueTomorrow }` (each item: problem id, revision number, due date, days overdue) |
| `GET /api/stats` | — | solved counts total and by difficulty, completed cycles |
| `PUT /api/progress/:problemId` | `{ solvedOn, confidence }` | `ProgressEntry` (creates or replaces the solve; keeps revisions only if they still satisfy the timeline, otherwise `409`) |
| `PATCH /api/progress/:problemId` | `{ solvedOn?, confidence? }` (at least one) | `ProgressEntry` |
| `DELETE /api/progress/:problemId` | — | `204` |
| `PUT /api/progress/:problemId/revisions/:n` | `{ completedOn }` | `ProgressEntry` (complete the next pending revision, or edit a completed one) |
| `DELETE /api/progress/:problemId/revisions/:n` | — | `ProgressEntry` (undo; only the latest completed) |
| `GET /api/account/export` | — | JSON file download of the user's profile and progress |
| `DELETE /api/account` | — | `204` (via Better Auth `deleteUser`; progress removed by `ON DELETE CASCADE`) |

`ProgressEntry` = `{ problemId, solvedOn, confidence, revisions: [{ number, status, date }] ×3, next, isComplete }` — the output of `computeSchedule`.

### 7.1 Conventions

- **Validation:** a `validate({ params, query, body })` middleware parses with the shared Zod schemas. Unknown keys are rejected (`.strict()`).
- **Errors:** one shape everywhere: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details"?: … } }`.
  - `400 VALIDATION_ERROR` — malformed input
  - `401 UNAUTHENTICATED`
  - `403 FORBIDDEN_ORIGIN` — failed origin check
  - `404 NOT_FOUND` — unknown problem, or no progress row where one is required
  - `409 TIMELINE_CONFLICT` — breaks a rule in §4.4 (message says which)
  - `500 INTERNAL_ERROR` — generic message; details only in the server log
- A central `errorHandler` maps `AppError` and Zod errors to responses and never leaks stack traces. MySQL `CHECK` violations (errno 3819) map to `409` as a backstop.
- **Transactions:** every mutation runs *read row `FOR UPDATE` → validate → write → read back → compute schedule* inside one transaction, so two tabs cannot produce an invalid state.
- **Origin check:** for `POST`/`PUT`/`PATCH`/`DELETE`, reject requests whose `Origin` header is present and not equal to `APP_ORIGIN`. Combined with `SameSite=Lax` cookies this blocks CSRF.
- **No CORS middleware.** The browser only talks to the Vite origin, which proxies `/api`.
- `express.json({ limit: "10kb" })`.
- **Graceful shutdown** on `SIGINT`/`SIGTERM`: stop accepting connections, finish in-flight requests, close the pool.
- Logging: `console` only, one line per request (method, path, status, ms) in development. Never log cookies, auth headers, passwords or tokens.

---

## 8. Frontend

### 8.1 Setup

- Vite + React 19 + TypeScript; Tailwind via `@tailwindcss/vite`.
- `vite.config.ts`: `server.proxy['/api'] = 'http://localhost:3000'` (do **not** set `changeOrigin`; the API must see the browser's origin).
- `authClient` = `createAuthClient()` from `better-auth/react` (same origin, no base URL needed).
- `api/client.ts`: a small typed `fetch` wrapper — JSON in/out, `credentials: "same-origin"`, parses the error shape into an `ApiError`, parses responses with shared Zod schemas.
- TanStack Query hooks in `api/`: `useCatalog`, `useProgress`, `useReminders`, `useStats`, `useMe`, plus mutation hooks. After any progress mutation, invalidate `progress`, `reminders` and `stats`.
- Routes: public — `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`; protected — `/` (dashboard), `/problems`, `/settings`. A `RequireAuth` wrapper uses `authClient.useSession()` and redirects to `/login`.
- After sign-in, if `me.timezone === "UTC"` and the browser zone differs, `PATCH /api/me` with the browser zone once.

### 8.2 Dashboard (`/`)

- **ReminderPanel** with three sections: Overdue (with "N days late"), Due today, Due tomorrow. Empty states for each.
- Each item: problem link, difficulty, "Revision N", and a **Done** action. The date defaults to today and can be changed to an earlier date before confirming.
- Summary: solved / 250, by difficulty, completed cycles.

### 8.3 Problems (`/problems`)

- Table grouped by category in NeetCode order.
- Columns: **Problem** (`<a href={leetcodeUrl} target="_blank" rel="noopener noreferrer">` — click and Ctrl+click both open LeetCode; Premium badge when relevant), **Difficulty**, **Solved** (checkbox), **Solved on**, **Confidence**, **R1**, **R2**, **R3**.
- Revision cells show the done date, the due date (colour + text: overdue / today / tomorrow / upcoming) or the projected date (muted).
- Ticking **Solved** opens **SolveForm** (date defaults to today, confidence required). Nothing is saved until submitted.
- Unticking asks for confirmation, then deletes progress.
- Clicking a row opens **EditDrawer**: change solved date or confidence; complete, edit or undo revisions. Displays server validation messages inline.
- **Filters**: category, difficulty, solved/unsolved, due state (overdue / today / tomorrow / complete), and search by title. Stored in URL search params.

### 8.4 Settings (`/settings`)

- Time zone selector (`Intl.supportedValuesOf("timeZone")`).
- Export my data (downloads the JSON).
- Delete account (type-to-confirm dialog).
- Sign out.

### 8.5 Quality bar

- Loading, empty and error states on every screen; inline success/error messages near the action.
- Accessibility: semantic `<table>`, labelled inputs, native `<input type="date">`, full keyboard use, visible focus, status never conveyed by colour alone.
- Responsive: below the `md` breakpoint the table becomes stacked cards.
- Light and dark themes following `prefers-color-scheme`.
- Dates displayed in a readable format (e.g. "23 Sep 2026") but always sent as `YYYY-MM-DD`.

---

## 9. Configuration

`apps/api/.env` (never committed; `.env.example` is committed with placeholders):

| Variable | Example | Required |
|---|---|---|
| `PORT` | `3000` | yes |
| `DATABASE_URL` | `mysql://recurse:password@localhost:3306/recurse` | yes |
| `TEST_DATABASE_URL` | `mysql://recurse:password@localhost:3306/recurse_test` | for tests |
| `APP_ORIGIN` | `http://localhost:5173` | yes |
| `BETTER_AUTH_URL` | `http://localhost:5173` | yes |
| `BETTER_AUTH_SECRET` | 32+ random bytes, base64 | yes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | optional (Google disabled if absent) |

Generate the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

`config.ts` validates all of these with Zod at startup and exits with a clear message if anything is missing or malformed.

The web app has **no environment variables and no secrets.**

---

## 10. Testing

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | `calendarDate`, `schedule`, `validateTimeline`, Zod schemas, seed JSON structure |
| Integration | Vitest + Supertest against real MySQL (`recurse_test`) | every endpoint |
| Component | Vitest + React Testing Library | ReminderPanel grouping, SolveForm, RevisionCell states |

Integration test setup:

- Before the run: drop and recreate `recurse_test`, run all migrations, run the seed.
- Before each test: `DELETE` from `user_problem` and the auth tables.
- Helper `signedInAgent()`: signs up a user through the API, marks the email verified directly in the DB, signs in, returns a Supertest agent holding the cookie.

Required integration cases:

- `401` on every protected route without a session.
- **Isolation:** user B cannot read, change or delete user A's progress.
- Validation errors (bad dates, confidence out of range, unknown keys, future dates).
- Timeline conflicts (out-of-order revisions, skipping a revision, undoing a non-latest revision).
- Confidence change recalculates pending due dates and leaves completed dates unchanged.
- Reminders bucketing around the user's today, including a non-UTC time zone.
- Origin check rejects a foreign `Origin` on mutations.
- Account deletion removes progress.

---

## 11. Build phases

Work one phase at a time. Each phase ends with its checks passing and a Git commit.

| # | Phase | Done when |
|---|---|---|
| 1 | **Repo setup** — workspaces, `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), ESLint, Prettier, Vitest, `.gitignore`, root scripts | `npm run lint`, `npm run typecheck`, `npm test` pass on empty packages |
| 2 | **Shared logic** — `calendarDate.ts`, `schedule.ts`, `schemas.ts` + all tests in §4.6 | All unit tests pass |
| 3 | **Database + catalog** — migration runner, `001_catalog.sql`, `problems.json` (compiled and slugs verified), seed script, seed structure test | `npm run db:migrate && npm run db:seed` loads 250 problems; re-running changes nothing; owner has reviewed the list |
| 4 | **API skeleton** — `config.ts`, `db.ts`, `app.ts`/`server.ts`, errors, error handler, validate middleware, origin check, `/api/health`, `/api/ready`, `/api/catalog` | API starts; health, ready and catalog respond; bad env stops startup with a clear message |
| 5 | **Auth** — `auth.ts`, `002_auth.sql` (generated), `requireSession`, `/api/auth-config`, `/api/me`, terminal email sender, Google (optional) | Sign up → verification link in terminal → sign in → `/api/me` works via curl or tests |
| 6 | **Progress API** — `003_progress.sql`, repository, service, routes, reminders, stats, export, account deletion + all integration tests in §10 | All integration tests pass |
| 7 | **Web foundation** — Vite, Tailwind, router, QueryClient, API client, auth pages, `RequireAuth`, time zone detection | Full sign-up / verify / sign-in / reset / sign-out flow works in the browser |
| 8 | **Problems page** — table, SolveForm, EditDrawer, RevisionCell, filters, search | All tracking actions work in the browser |
| 9 | **Dashboard + Settings** — ReminderPanel, summary, settings page, legal pages | Reminders match the schedule rules |
| 10 | **Polish + manual QA** — accessibility, responsive, dark mode, empty/error states, component tests, checklist below | Checklist fully passes |

### Manual QA checklist (Phase 10)

- [ ] Sign up with email; verification link appears in the API terminal; login blocked until verified.
- [ ] Password reset via terminal link works; old password stops working.
- [ ] Google sign-in works (if configured); same email links to the existing account.
- [ ] Problem names open the correct LeetCode page in a new tab (click and Ctrl+click).
- [ ] Marking solved with confidence 2 today shows R1 in 2 days, R2 projected at 7, R3 at 21.
- [ ] Logging R1 late shifts R2 and R3 later; logging it early shifts them earlier.
- [ ] Changing confidence recalculates pending dates immediately.
- [ ] Editing a completed revision to an invalid date shows a clear error.
- [ ] Undo works only on the latest completed revision.
- [ ] Dashboard buckets are correct after changing the time zone in Settings.
- [ ] Two browser tabs editing the same problem never produce an invalid state.
- [ ] A second user sees none of the first user's data.
- [ ] Export downloads correct JSON; delete account removes everything and signs out.
- [ ] Clearing browser data only signs you out; progress remains on sign-in.
- [ ] Keyboard-only use works; layout works at phone width; dark mode is readable.

---

## 12. Deployment notes (for later — not part of the current work)

Recorded so the local design does not need to change when deploying:

- Planned hosting: frontend on **Vercel**, API on **Render**, MySQL on a managed host (e.g. **Aiven** free tier). Verify current free-tier limits at that time.
- Keep the **same-origin** design: Vercel rewrites `/api/*` to the Render URL, exactly like the Vite proxy. Cookies stay first-party and CORS stays off. `BETTER_AUTH_URL` and `APP_ORIGIN` become the Vercel URL.
- Set Express `trust proxy` to the exact number of proxies in front of the API.
- Add at deployment: `helmet`, `express-rate-limit`, a real email sender behind `sendEmail()` (a free option: Gmail SMTP via Nodemailer with an app password), GitHub Actions CI, Dependabot, an API build step for `packages/shared`.
- Google OAuth: add the production origin and redirect URI; publish the consent screen.
- Migrations run before the new API version goes live; migrations are always backward-compatible (add first, remove later).
- Render's free plan sleeps when idle (slow first request) — acceptable for personal use.
