# RevCode

A multi-user NeetCode 250 revision tracker: Google sign-in, per-user progress, spaced-repetition revisions, Markdown notes. One Next.js 16 app on Vercel, Postgres on Neon.

## Every session

1. Read `docs/PROGRESS.md`: the current phase, what is done, gotchas found so far.
2. Read `PLAN.md` §0 (settled decisions), §3 (layout), and the sections listed for the current phase in `PLAN.md` §12 "Sections to read per phase". `PLAN.md` is the spec; read it section by section.
3. When building, work on one phase per session.

## Finishing a phase

A phase is done when its "Done when" criterion in `PLAN.md` §12 holds and lint, typecheck and tests all pass. Then:

1. Run the `code-review` skill against the phase's changes and fix what it finds.
2. Update `docs/PROGRESS.md`: mark the phase done, log decisions and gotchas, name the next phase.
3. Propose a commit message; commit once the owner agrees.

## Changing the plan

`PLAN.md` §0 is settled. Any change to it, any deviation from the spec, and any library outside `PLAN.md` §2 needs the owner's approval first. Record approved changes in `PLAN.md` itself (single source of truth) and note them in `docs/PROGRESS.md`.

## Invariants

- **Facts, not due dates.** The database stores solve date, confidence, completion dates and gaps. Due dates come from `computeSchedule` on every read.
- **Calendar-date strings.** Domain dates are `YYYY-MM-DD` strings end to end; `db.ts` makes `pg` return `DATE` as strings. "Today" is computed on the server in the user's time zone.
- **Session-scoped queries.** Every query on a per-user table binds `user_id` from the session. The user id always comes from the session, never from request input.
- **One entry path.** Every API route handler is wrapped in `withHandler()` (`src/server/handler.ts`), which does the origin check, session check, Zod validation and error mapping.
- **Layers.** Route handler (HTTP) → service (rules, transactions) → repository (SQL). `src/domain` is pure: no I/O, no imports from `server` or `client`.
- **Notes stand alone.** `problem_note` is independent of `user_problem`; unmarking a solve keeps the note.
- **Permanent ids.** Catalog ids never change; migrations are append-only once applied.
- **Visible saves.** Every mutation shows pending, success or failure in the UI. The old tracker failed because saves failed silently.
- `"user"` is a reserved word in Postgres; always quote it.

## Skills

- `tdd`: domain logic, services and the importer (Phases 2, 4, 5) are built test-first.
- `wizard`: steps only the owner can do in a third-party dashboard (Neon, Google Cloud, Vercel).
- `diagnosing-bugs`: a failure whose cause is not obvious.

## Working with the owner

The owner prefers plain-language explanations of what was built and why, with a recommendation rather than a list of options.

## Files outside the plan

- `PLAN.old.md`: the superseded Express + MySQL plan, kept for history only.
- `neetcode_250_complete.json`: the source catalog; it moves to `data/` in Phase 1.
- `neetcode250-tracker (1).html`: the old tracker, kept locally and git-ignored. Phase 5 copies its `SEED_PROGRESS` block into a committed test fixture (`test/fixtures/legacy-tracker.json`).
