# Progress

**Current phase:** Phase 1 — Foundation (not started)

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

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Scaffolding with `create-next-app` (Phase 1).** Three reasons to scaffold into a temporary `revcode/` subfolder and move the files up: the project folder name has capitals and spaces (npm rejects capitals in package names); `create-next-app` refuses folders that already contain files like `PLAN.md`; and by default (`--agents-md`) it generates its own `AGENTS.md` **and `CLAUDE.md`**. When moving files up: keep its `AGENTS.md`; **discard its `CLAUDE.md`** (ours must never be overwritten) and add `@AGENTS.md` as the first line of ours; set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on (commits warn "LF will be replaced by CRLF"), while Prettier writes LF. In Phase 1, add a `.gitattributes` with `* text=auto eol=lf` and set Prettier's `endOfLine: "lf"` so formatting and diffs stay consistent.
- **Neon connection strings end with `&channel_binding=require`.** In Phase 1, confirm the installed `pg` version connects with it. If the connection fails on authentication, remove only that parameter from `.env.local` (keep `sslmode=require`) and note the result here.
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.

## Owner to-do (outside the code)

- [x] Neon **development** project created (2026-09-24), currently named **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [ ] Before Phase 1: install **Node.js 24 LTS** from nodejs.org (the machine had 22.18.0 on 2026-09-24). Check with `node --version`.
- [ ] Before retiring the old HTML tracker, use its **Export backup** in every browser where it was used, and keep the files for the Phase 5 import.
- [x] Neon `dev` and `test` branches created (auto-delete: never); the 3 database lines in `.env.local` are filled and format-checked (dev pooled + direct, test direct, all Singapore). Phase 1 only needs to verify a real connection.
- [ ] Phase 3: create the Google OAuth client in Google Cloud Console.
- [ ] Optional, any time: rename the current Neon project to **`RevCode-dev`** so it isn't mistaken for production.
- [ ] Phase 9: create a **new Neon project `RevCode`** (AWS Singapore) for production, then create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
