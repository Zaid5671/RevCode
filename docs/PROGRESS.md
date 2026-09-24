# Progress

**Current phase:** Phase 2 — Domain logic (not started). Phase 1 is done.

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

## Gotchas

Things that cost time or will bite a future session. Add as found.

- **Scaffolding with `create-next-app` (Phase 1).** Three reasons to scaffold into a temporary `revcode/` subfolder and move the files up: the project folder name has capitals and spaces (npm rejects capitals in package names); `create-next-app` refuses folders that already contain files like `PLAN.md`; and by default (`--agents-md`) it generates its own `AGENTS.md` **and `CLAUDE.md`**. When moving files up: keep its `AGENTS.md`; **discard its `CLAUDE.md`** (ours must never be overwritten) and add `@AGENTS.md` as the first line of ours; set `"name": "revcode"` in `package.json`. Quote the path in shell commands.
- **Line endings on Windows.** Git here has `core.autocrlf` on, while Prettier writes LF. Resolved in Phase 1: `.gitattributes` (`* text=auto eol=lf`) and Prettier `endOfLine: "lf"`.
- **Neon connection strings end with `&channel_binding=require`.** Checked in Phase 1: `pg` 8.23 connects with it on all three URLs; keep it.
- **`sslmode`: use `verify-full`.** Neon's dashboard gives `sslmode=require`; `pg` 8 treats that as `verify-full` but warns on every connection that `pg` 9 will weaken it. Change it when pasting any new URL (including production in Phase 9).
- **Catalog JSON `slug` is NeetCode's, not LeetCode's** (74 differ). See `PLAN.md` §5.4.
- **Port 3000 belongs to the owner's other local apps.** RevCode runs on 3100. Never stop a process on a port you didn't start; stop your own dev server by the PID of the port you started it on.
- **`@next/env` from ESM:** use `import nextEnv from "@next/env"`; the named import `{ loadEnvConfig }` fails at runtime under `"type": "module"`.
- **Vitest runs with `NODE_ENV=test`, and `@next/env`'s `loadEnvConfig` then skips `.env.local`.** Phase 4's DB test setup must load `TEST_DATABASE_URL` another way (for example, read `.env.local` explicitly), and must give `runMigrations` a **direct** connection (its advisory lock is session-level; the pooler doesn't keep it).
- **Catalog types live in `scripts/build-catalog.ts`.** When Phase 2 needs `Difficulty` in `src/domain/schemas.ts`, define it in `src/domain` and have the script import it (never import `scripts/` from `src/`).
- **Reordering the catalog later would break the seed.** `category.name`, `category.position` and `problem (category_id, position)` are UNIQUE and not deferrable, so an upsert that swaps two positions or renames into an existing name fails. Not an issue today (ids and order are fixed); a future catalog change needs a migration that makes those constraints `DEFERRABLE`.

## Owner to-do (outside the code)

- [x] Neon **development** project created (2026-09-24), currently named **`RevCode`**, AWS Singapore, Postgres 18, database `neondb`. Neon names the default branch **`production`** (not `main`); the docs use that name. Only "Postgres database" is used; Neon's Object storage, Functions and hosted Better Auth ("Neon Auth") stay unused, since the app runs Better Auth itself.
- [x] **Node.js 24 LTS** installed (v24.21.0, checked 2026-09-24).
- [x] Neon `dev` and `test` branches created (auto-delete: never); the 3 database lines in `.env.local` are filled and format-checked (dev pooled + direct, test direct, all Singapore). Phase 1 only needs to verify a real connection.
- [ ] Phase 3: create the Google OAuth client in Google Cloud Console. Local redirect URI: `http://localhost:3100/api/auth/callback/google` (port 3100, not 3000).
- [ ] Optional, any time: rename the current Neon project to **`RevCode-dev`** so it isn't mistaken for production.
- [ ] Phase 9: create a **new Neon project `RevCode`** (AWS Singapore) for production, then create the Vercel project, set production environment variables, add the production redirect URI in Google, publish the consent screen.
