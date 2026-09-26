# RevCode

A NeetCode 250 revision tracker with spaced repetition and Markdown notes.

**Live:** https://revcode-phi.vercel.app

Mark a problem solved, say how confident you felt, and RevCode schedules three revisions for it. The dashboard shows what to revise today and what's coming up, and every problem can carry its own formatted notes.

## Features

### Dashboard

- **Today at a glance:** the page title shows your date in your own time zone, so the reminders always match your day.
- **Stats strip:** problems solved out of 250 (with a percentage), overdue, due today, due in the next 7 days, and complete.
- **Revise now:** overdue and due-today revisions, most overdue first, each showing the problem, its category, difficulty, which revision it is (R1, R2 or R3) and how late it is.
- **Coming up:** revisions due tomorrow and over the next 7 days, grouped under date headings, so you can see the week ahead.
- **Done in one click:** each row's **Done** button logs the revision for today, or for an earlier day if you revised without logging it. The schedule updates straight away.
- **Notes while revising:** a **Notes** button on every row opens that problem's note beside the dashboard.

### Problems

- **Category folders:** all 250 problems in 18 collapsible folders, in NeetCode order, each showing how many you've solved (`7 / 22`) and how many revisions are waiting (`● 2 due`). Folders you opened stay open next time.
- **Search, filters and sort:**
  - search by problem name;
  - filter by category, difficulty and status (unsolved, overdue, today, tomorrow, next 7 days, later, complete, has notes);
  - sort in NeetCode order, or **next due first** as one flat list with the most urgent revision at the top;
  - while searching or filtering, only folders with matches open, and clearing the search restores them; **Expand all** and **Collapse all** work at any time;
  - filters are kept in the address, so a filtered view can be bookmarked or reloaded.
- **Marking a problem solved:** tick it, pick the date (today by default), then choose your confidence: 1 Shaky, 2 Okay or 3 Solid. Choosing a confidence saves straight away.
- **Revisions R1–R3:**
  - completed revisions show a green tick and their date;
  - the next revision shows its due date in a small pill (amber for today, red when overdue); click it to mark the revision done;
  - later revisions show their projected dates;
  - the **Next** column says when the next revision is due, for example `R2 · in 3 days` or `R1 · 2d late`.
- **Editing and undoing:** click a row to open the edit panel, where you can change the solve date or confidence, complete or re-date revisions, undo the most recent revision, or unmark the problem as solved (its note is kept). Impossible dates, such as a revision before the solve date, get a clear message instead of being saved.
- **Links and badges:** problem names open the problem on LeetCode in a new tab, and the seven LeetCode Premium problems carry a **Premium** badge.
- **On phones:** the table turns into compact two-line cards with the same actions.

### Notes

- **A note for every problem:** one Markdown note per problem, whether it's solved or not. Unmarking a problem as solved never deletes its note.
- **Editor with a toolbar**, so you don't need to know Markdown:
  - toolbar buttons for bold, italic, headings, lists, code and links;
  - Ctrl+B, Ctrl+I and Ctrl+S shortcuts;
  - **Preview** shows the formatted note;
  - a counter appears as you near the 20,000-character limit.
- **Saves you can see:** the editor always shows Unsaved changes, Saving…, Saved, or Couldn't save (with your text still there). Closing the editor or the tab with unsaved changes asks first.
- **Safe across tabs and devices:** if the note was changed somewhere else in the meantime, RevCode doesn't overwrite it silently. It asks whether to load the newer version or keep yours.
- **Notes section:**
  - each category reads as one document: every note in NeetCode order, with the problem's link, difficulty, confidence and when the note was last edited;
  - a switch also shows problems without a note yet, each with an **Add note** button;
  - long notes start collapsed with **Show more**, and **Expand all** opens them all.
- **Search across notes:** one search box looks through the text of every note and through problem names, highlights the matches, and keeps the search in the address.
- **Downloads:** one category or all your notes as a single Markdown (`.md`) file, organised by category and problem, with LeetCode links.

### Also
- **Sign in with Google.** Each user sees only their own data.
- **Settings:** edit your revision gaps (with Reset to defaults), choose a time zone (detected automatically), sign out, or delete your account and everything in it.
- **Light and dark themes**, following your system or chosen in the account menu.
- **Save status** in the header on every page: Saving…, Saved, or Couldn't save with a retry. No change is lost silently.
- Works with the keyboard alone and on screens as narrow as 360 px.

## How scheduling works

Every solved problem gets three revisions: R1, R2 and R3. Each one is due a set number of days (a **gap**) after the previous event:
- R1 after the solve date;
- R2 after the day you actually did R1;
- R3 after the day you actually did R2.

The gaps depend on your confidence, and each is roughly 2–4 times the one before, as spaced repetition recommends. The defaults:

| Confidence | R1 | R2 | R3 | Days from solve, if on time |
|---|---|---|---|---|
| 1 Shaky | 1 | 4 | 10 | 1, 5, 15 |
| 2 Okay | 3 | 7 | 14 | 3, 10, 24 |
| 3 Solid | 5 | 14 | 30 | 5, 19, 49 |

- **Late or early shifts the rest.** If you do R1 two days late, R2 and R3 move two days later.
- **Changes apply at once.** Changing a problem's confidence, or your own gaps (any value from 1 to 180 days, in Settings), moves every pending date immediately. Completed dates never change.
- **Due dates are never stored.** The database keeps only facts: the solve date, the confidence and the dates you actually revised. Due dates are recalculated on every visit, so they can't go stale or disagree.
- **"Today" is your today,** worked out in your own time zone.

## Tech stack

| Part | Tools |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with design tokens, light and dark |
| Client data | TanStack Query |
| Database | Postgres on Neon, plain SQL through `pg` |
| Auth | Better Auth with Google sign-in |
| Validation | Zod, shared by client and server |
| Notes | react-markdown + remark-gfm |
| Tests | Vitest, React Testing Library |
| Hosting | Vercel |

## Architecture

- **Layers:** route handler (HTTP) → service (rules, transactions) → repository (SQL). The scheduling and date logic in `src/domain` is pure: no I/O, and it's fully unit tested.
- **One entry path:** every API route runs through one wrapper, which checks the request's origin and the session, validates the input with Zod and maps errors to one response shape.
- **Your data is yours:** every query on per-user data is scoped to the signed-in user's id, which always comes from the session and never from the request.
- **Calendar dates as strings:** dates are `YYYY-MM-DD` strings from the database to the screen, so time zones can't shift them.

## Running it locally

**You need:** Node.js 24 or later, a free [Neon](https://neon.tech) account, and a Google account for the OAuth client.

**1. Clone and install**

```bash
git clone https://github.com/Zaid5671/RevCode.git
cd RevCode
npm ci
```

**2. Create the environment file**

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored. `.env.example` explains every variable; steps 3–5 fill them in.

**3. Database (Neon)**

- Create a Neon project, then two branches in it: `dev` for development and `test` for the automated tests.
- From the project's **Connect** dialog, copy three connection strings:

  | Variable | Branch | Connection pooling |
  |---|---|---|
  | `DATABASE_URL` | `dev` | On (the host contains `-pooler`) |
  | `DATABASE_URL_UNPOOLED` | `dev` | Off |
  | `TEST_DATABASE_URL` | `test` | Off |

- In each one, change `sslmode=require` to `sslmode=verify-full`. The app refuses to start otherwise.
- **The tests wipe the `test` branch on every run,** so `TEST_DATABASE_URL` must never point at a database with data you want to keep.

**4. Google sign-in**

- In [Google Cloud Console](https://console.cloud.google.com), create a project and set up the OAuth consent screen (Google Auth Platform): user type External, with the scopes `openid`, `email` and `profile`.
- Create an OAuth client of type **Web application** with:
  - authorised JavaScript origin: `http://localhost:3100`
  - authorised redirect URI: `http://localhost:3100/api/auth/callback/google`
- Put its client id and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

**5. Auth settings**

- `BETTER_AUTH_URL` stays `http://localhost:3100`. The dev server always runs on port 3100, which is why the Google URIs above use it.
- `BETTER_AUTH_SECRET` needs a random value:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

**6. Set up the database and start**

```bash
npm run db:migrate   # creates the tables on the dev branch
npm run db:seed      # loads the 250 problems
npm run dev          # http://localhost:3100
```

Open http://localhost:3100 and sign in with Google.

**7. Check everything works (optional)**

```bash
npm run lint
npm run typecheck
npm test             # sets up the test branch itself: migrates and seeds it before the run
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, including Next's route types |
| `npm test` | All tests (see below) |
| `npm run format` | Prettier (`format:check` only reports) |
| `npm run db:migrate` | Applies new files in `db/migrations/`. Safe to re-run |
| `npm run db:seed` | Loads the problem catalog. Safe to re-run; it never deletes |
| `npm run catalog:build` | Rebuilds the catalog from `data/`. Only for a deliberate catalog change |

## Testing

`npm test` runs every test with Vitest, in three groups:

| Group | Covers | Needs |
|---|---|---|
| `unit` | Scheduling, date handling, timeline rules, input validation, the notes export | Nothing, runs in seconds |
| `components` | Screens in a simulated browser: folders and search, the solve form, revision pills, the note editor's save states, settings forms | Nothing |
| `db` | Services and API routes against a real Postgres (Neon's `test` branch, wiped and rebuilt for each run) | `TEST_DATABASE_URL` |

The database tests check that:
- one user can never read, change or delete another user's data;
- every protected route refuses visitors who aren't signed in;
- bad input and out-of-order dates get clear errors;
- two requests solving the same problem at once give a clean conflict, never a crash;
- a note edited elsewhere is caught as a conflict;
- deleting an account removes everything.

Run one group with `npx vitest run --project unit` (or `components`, or `db`).

## Deployment

- **Hosting:** Vercel, with the server code pinned to Singapore (`vercel.json`) next to the database. Every push to `main` redeploys automatically.
- **Database:** production has its own Neon project, separate from the development project that holds `dev` and `test`. Development can never use up the live app's free compute hours.
- **Environment variables** in Vercel (Production):
  - `DATABASE_URL`: the pooled connection string, with `sslmode=verify-full`;
  - `BETTER_AUTH_URL`: the site's address;
  - `BETTER_AUTH_SECRET`: 32 random bytes, different from the local one;
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Google:** the OAuth client lists the live site as an allowed origin, and `https://<site>/api/auth/callback/google` as a redirect URI.
- **Shipping a database change:**
  1. Run the new migration against the production database first, with its direct (unpooled) URL.
  2. Then push the code.
  3. Keep migrations compatible with the version that's still live, since for a moment the old code runs on the new schema.

## Project layout

```
src/
  app/          pages and API route handlers
  components/   React components
  client/       browser-side helpers, API client and query hooks
  domain/       pure logic: scheduling, dates, timeline rules, schemas
  server/       auth, database pool, request wrapper, services and repositories
db/
  migrations/   SQL migrations, applied in order
  seed/         the problem catalog
scripts/        migrate, seed and catalog build
test/           tests that need the database
```
