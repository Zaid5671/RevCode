@AGENTS.md

# RevCode

A multi-user NeetCode 250 revision tracker: Google sign-in, per-user progress, spaced-repetition revisions, Markdown notes. One Next.js 16 app on Vercel, Postgres on Neon.

## Every session

1. Read `docs/PROGRESS.md`: the current phase, the latest entry, gotchas found so far. Older entries are in `docs/HISTORY.md`; open it only when you need the reason behind an earlier decision.
2. Read `PLAN.md` §0 (settled decisions), §3 (layout), and the sections listed for the current phase in `PLAN.md` §12 "Sections to read per phase". `PLAN.md` is the spec; read it section by section.
3. When building, work on one phase per session, or one part of it (`PLAN.md` §12 "Suggested split"). Say in your opening summary which part you'll do.

If a session is getting long before the phase is done, write exactly where you stopped (done, in progress, next step) into the latest entry of `docs/PROGRESS.md` before ending ("Progress log" below), so the next session can continue.

## Progress log

`docs/PROGRESS.md` holds only the current state: the "Current phase" line, the latest entry, Gotchas and Owner to-do. `docs/HISTORY.md` holds every older entry, oldest first, and the retired gotchas.

- **Current phase line:** update it whenever the state changes (a part or phase finished, work stopped mid-part, a step added before the next phase), so it always says what comes next.
- **Same work, same entry:** a checkpoint, more work on the same part, or an owner decision about it updates the latest entry in place.
- **New work, new entry:** starting a new part, phase or plan change, first move the latest entry, unchanged, to the end of the Phase log in `docs/HISTORY.md`, then write the new one.
- **Entries stay short:** what was built, the decisions, what the next part needs.
- **Gotchas:** add new ones to `docs/PROGRESS.md`; when one stops applying, move it to "Retired gotchas" in `docs/HISTORY.md`.

## Working efficiently

- Edit files with the Edit tool, in small targeted edits. Correct a file you wrote the same way, keeping what's right.
- When a script is really needed, save it to a file and run the file; keep shell commands to one short line. Git Bash mangles backslashes and quotes in long inline commands.
- Search and read files, build output included, with the Grep and Read tools.
- Scripts read and write files as UTF-8.
- Run tests so they print the summary and the failures only.

## Current docs

Next.js 16 and Better Auth change faster than training data. Before Next.js work, read the relevant guide in `node_modules/next/dist/docs/` (available from Phase 1). Before using a Better Auth API, check its current documentation. For any library question, the documentation comes first; read a library's source code only when its documentation doesn't answer the question.

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

## Finishing a part

When a session ends after part A of a phase: lint, typecheck and tests pass; write a checkpoint entry to `docs/PROGRESS.md` ("Progress log" above; what's done, what part B holds, any work moved between parts or phases); propose a commit message and commit once the owner agrees.

## Finishing a phase

A phase is done when its "Done when" criterion in `PLAN.md` §12 holds and lint, typecheck and tests all pass. Then:

1. Run the review that `PLAN.md` §12 "Reviews" names for this phase, and fix what it finds.
2. Update `docs/PROGRESS.md` ("Progress log" above): mark the phase done, log decisions and gotchas, name the next phase. If the phase changed the folder layout, update `PLAN.md` §3 to match.
3. Propose a commit message; commit once the owner agrees.

## Changing the plan

`PLAN.md` §0 is settled. Any change to it, any deviation from the spec, and any library outside `PLAN.md` §2 needs the owner's approval first. Record approved changes in `PLAN.md` itself (single source of truth) and note them in `docs/PROGRESS.md` ("Progress log" above).

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

- `tdd`: domain logic and services (Phases 2, 4, 5) are built test-first, one function or endpoint at a time: write all its straightforward test cases together, run them once and confirm every one fails, then implement and run again. Tricky logic (scheduling, timeline rules, note conflicts, concurrent requests) goes one test at a time. For straightforward cases, this batching replaces the skill's one-test-per-cycle default.
- `wizard`: steps only the owner can do in a third-party dashboard (Neon, Google Cloud, Vercel).
- `diagnosing-bugs`: a failure whose cause is not obvious.

## Working with the owner

The owner prefers plain-language explanations of what was built and why, with a recommendation rather than a list of options.

## Files outside the plan

- `PLAN.old.md`: the superseded Express + MySQL plan, kept for history only.
- `data/neetcode_250_complete.json`: the source catalog (moved to `data/` in Phase 1); `scripts/build-catalog.ts` reads it.
- `neetcode250-tracker (1).html`: the old tracker, kept locally and git-ignored for reference only. RevCode does not import its data (`PLAN.md` §9).
