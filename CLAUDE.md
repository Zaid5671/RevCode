@AGENTS.md

# RevCode

A multi-user NeetCode 250 revision tracker: Google sign-in, per-user progress, spaced-repetition revisions, Markdown notes. One Next.js 16 app on Vercel, Postgres on Neon.

## Every session

1. Read `docs/PROGRESS.md`: the current phase, what is done, gotchas found so far.
2. Read `PLAN.md` §0 (settled decisions), §3 (layout), and the sections listed for the current phase in `PLAN.md` §12 "Sections to read per phase". `PLAN.md` is the spec; read it section by section.
3. When building, work on one phase per session.

If a session is getting long before the phase is done, write exactly where you stopped (done, in progress, next step) to `docs/PROGRESS.md` before ending, so the next session can continue.

## Current docs

Next.js 16 and Better Auth change faster than training data. Before Next.js work, read the relevant guide in `node_modules/next/dist/docs/` (available from Phase 1). Before using a Better Auth API, check its current documentation.

## Commands

- `npm run dev`: dev server on the fixed port **3100** (http://localhost:3100). Port 3100 is reserved for RevCode. If it's busy, check what holds it: if it's this project's own `next dev` (for example, one left running by an earlier session), reuse it, or stop and restart it when `.env.local` changed. Anything else, on 3100 or any other port (the owner's other apps often use 3000), is reported to the owner, never stopped.
- `npm run lint`, `npm run typecheck`, `npm test`: the three checks every phase must pass. `npm run format` applies Prettier; `npm run format:check` only reports.
- `npm run db:migrate`: applies pending files in `db/migrations/` to the `dev` branch (`DATABASE_URL_UNPOOLED`). Safe to re-run.
- `npm run db:seed`: upserts `db/seed/catalog.json` into the `dev` branch. Safe to re-run; it never deletes.
- `npm run catalog:build`: regenerates `db/seed/catalog.json` from `data/`. Only for a deliberate catalog change, since catalog ids are permanent.

## Guardrails

- Migrations and seeds run against the development project's `dev` and `test` branches. The production database is touched only in Phase 9, with the owner's go-ahead.
- Values from `.env.local` stay out of output, logs, commits and chat.
- `git push` only when the owner asks.
- No AI attribution in git: commit messages and pull request descriptions never mention Claude. No `Co-Authored-By: Claude` trailer and no "Generated with Claude Code" line. The owner is the sole author.
- Ask before destructive database commands (`DROP`, `TRUNCATE`, unscoped `DELETE`, branch resets). The test suite's own resets of the `test` branch are the exception.

## Finishing a phase

A phase is done when its "Done when" criterion in `PLAN.md` §12 holds and lint, typecheck and tests all pass. Then:

1. Run the `code-review` skill against the phase's changes and fix what it finds.
2. Update `docs/PROGRESS.md`: mark the phase done, log decisions and gotchas, name the next phase. If the phase changed the folder layout, update `PLAN.md` §3 to match.
3. Propose a commit message; commit once the owner agrees.

## Changing the plan

`PLAN.md` §0 is settled. Any change to it, any deviation from the spec, and any library outside `PLAN.md` §2 needs the owner's approval first. Record approved changes in `PLAN.md` itself (single source of truth) and note them in `docs/PROGRESS.md`.

## Invariants

- **Facts, not due dates.** The database stores solve date, confidence, completion dates and gaps. Due dates come from `computeSchedule` on every read.
- **Calendar-date strings.** Domain dates are `YYYY-MM-DD` strings end to end; `db.ts` makes `pg` return `DATE` as strings. "Today" is computed on the server in the user's time zone.
- **Session-scoped queries.** Every query on a per-user table binds `user_id` from the session. The user id always comes from the session, never from request input.
- **One entry path.** Every API route handler except `/api/auth/*` (Better Auth's own handler, `PLAN.md` §6) is wrapped in `withHandler()` (`src/server/handler.ts`), which does the origin check, session check, Zod validation and error mapping.
- **Layers.** Route handler (HTTP) → service (rules, transactions) → repository (SQL). `src/domain` is pure: no I/O, no imports from `server` or `client`.
- **Notes stand alone.** `problem_note` is independent of `user_problem`; unmarking a solve keeps the note. Note conflicts compare `problem_note.version`, never timestamps.
- **Production is isolated.** The live database is its own Neon project, separate from the development project that holds `dev` and `test`.
- **Permanent ids.** Catalog ids never change; migrations are append-only once applied.
- **Visible saves.** Every mutation shows pending, success or failure in the UI. The old tracker failed because saves failed silently.
- `"user"` is a reserved word in Postgres; always quote it.

## Skills

- `tdd`: domain logic and services (Phases 2, 4, 5) are built test-first.
- `wizard`: steps only the owner can do in a third-party dashboard (Neon, Google Cloud, Vercel).
- `diagnosing-bugs`: a failure whose cause is not obvious.

## Working with the owner

The owner prefers plain-language explanations of what was built and why, with a recommendation rather than a list of options.

## Files outside the plan

- `PLAN.old.md`: the superseded Express + MySQL plan, kept for history only.
- `data/neetcode_250_complete.json`: the source catalog (moved to `data/` in Phase 1); `scripts/build-catalog.ts` reads it.
- `neetcode250-tracker (1).html`: the old tracker, kept locally and git-ignored for reference only. RevCode does not import its data (`PLAN.md` §9).
