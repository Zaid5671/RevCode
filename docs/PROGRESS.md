# Progress

**Current phase:** Phase 1 — Setup (not started)

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
- **App renamed from "Recurse" to "RevCode"** by the owner (wordmark, docs, npm package name `revcode`, notes download `revcode-notes-*.md`). The Neon project is also named `RevCode`.

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Folder name vs. npm package name.** The project folder is `NeetCode250 Revision Tracker` (capitals and spaces). `create-next-app` derives the package name from the folder and rejects capitals, so scaffold with an explicit name (e.g. into a temporary `revcode/` subfolder, then move the files up) and set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on (commits warn "LF will be replaced by CRLF"), while Prettier writes LF. In Phase 1, add a `.gitattributes` with `* text=auto eol=lf` and set Prettier's `endOfLine: "lf"` so formatting and diffs stay consistent.
- **Neon connection strings end with `&channel_binding=require`.** In Phase 1, confirm the installed `pg` version connects with it. If the connection fails on authentication, remove only that parameter from `.env.local` (keep `sslmode=require`) and note the result here.
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.

## Owner to-do (outside the code)

- [x] Neon project created (2026-09-24), renamed by the owner to **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [ ] Before Phase 1: install **Node.js 24 LTS** from nodejs.org (the machine had 22.18.0 on 2026-09-24). Check with `node --version`.
- [ ] Before retiring the old HTML tracker, use its **Export backup** in every browser where it was used, and keep the files for the Phase 10 import.
- [ ] Phase 1: create the `dev` and `test` branches in Neon and fill the 3 database lines in `.env.local` (the `wizard` skill can walk through it).
- [ ] Phase 4: create the Google OAuth client in Google Cloud Console.
- [ ] Phase 11: create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
