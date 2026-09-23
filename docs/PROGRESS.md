# Progress

**Current phase:** Phase 1 — Setup (not started)

## Phase log

Newest last. One entry per finished phase: date, what was built, decisions made, anything the next phase should know.

### Planning — 2026-09-23

- `PLAN.md` v2 written and approved by the owner. It replaces `PLAN.old.md`.
- Settled in the planning session (all recorded in `PLAN.md` §0): one Next.js app on Vercel; Neon Postgres with three branches (`main`, `dev`, `test`; the owner confirmed keeping `test` separate so test runs never wipe `dev`); Google-only login; the default gaps and editable per-user gaps; the dashboard's four sections; the problem row layout; Markdown notes (including on unsolved problems) and the Notes section; `react-markdown` + `remark-gfm` approved.

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Folder name vs. npm package name.** The project folder is `NeetCode250 Revision Tracker` (capitals and spaces). `create-next-app` derives the package name from the folder and rejects capitals, so scaffold with an explicit name (e.g. into a temporary `recurse/` subfolder, then move the files up) and set `"name": "recurse"` in `package.json`. Quote the path in shell commands.
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.

## Owner to-do (outside the code)

- [ ] Before retiring the old HTML tracker, use its **Export backup** in every browser where it was used, and keep the files for the Phase 10 import.
- [ ] Phase 1: create a Neon account, the `recurse` project and its `dev` and `test` branches (the `wizard` skill can walk through it).
- [ ] Phase 4: create the Google OAuth client in Google Cloud Console.
- [ ] Phase 11: create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
