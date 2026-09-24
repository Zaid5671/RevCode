// Route handlers for progress, gaps, dashboard, catalog and notes, called with `Request` objects
// and a stubbed session (PLAN.md §11). Business rules are covered by the service tests.
import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as accountRoute from "@/app/api/account/route";
import * as categoryNotesRoute from "@/app/api/categories/[categoryId]/notes/route";
import * as catalogRoute from "@/app/api/catalog/route";
import * as dashboardRoute from "@/app/api/dashboard/route";
import * as gapsRoute from "@/app/api/gaps/route";
import * as meRoute from "@/app/api/me/route";
import * as noteRoute from "@/app/api/notes/[problemId]/route";
import * as notesExportRoute from "@/app/api/notes/export/route";
import * as notesRoute from "@/app/api/notes/route";
import * as notesSearchRoute from "@/app/api/notes/search/route";
import * as problemRoute from "@/app/api/progress/[problemId]/route";
import * as revisionRoute from "@/app/api/progress/[problemId]/revisions/[n]/route";
import * as progressRoute from "@/app/api/progress/route";
import type { SessionUser } from "@/server/auth";
import { getSession } from "@/server/auth";
import { createUser, stubSession } from "./helpers/users";

vi.mock("@/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth")>()),
  getSession: vi.fn(),
}));
const mockedGetSession = vi.mocked(getSession);

const APP = "http://localhost:3100";
const NOW = new Date("2026-09-24T18:00:00Z");

let user: SessionUser;

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  user = await createUser();
  mockedGetSession.mockReset().mockResolvedValue(stubSession(user));
});

afterEach(() => {
  vi.useRealTimers();
});

type Handler = (
  request: Request,
  segment?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function send(
  handler: Handler,
  method: string,
  params: Record<string, string> = {},
  body?: unknown,
  headers: Record<string, string> = {},
  query = "",
) {
  const request = new Request(`${APP}/api/test${query}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handler(request, { params: Promise.resolve(params) });
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

const P1 = { problemId: "1" };
const P1_R1 = { problemId: "1", n: "1" };
const SOLVE = { solvedOn: "2026-09-20", confidence: 2 };

/** A GET with a query string, such as `?q=hash`. */
function get(handler: Handler, query: string) {
  return send(handler, "GET", {}, undefined, {}, query);
}

// Every protected route handler, with valid params and body.
const ROUTES: [string, Handler, string, Record<string, string>, unknown?][] = [
  ["GET /api/me", meRoute.GET, "GET", {}],
  ["PATCH /api/me", meRoute.PATCH, "PATCH", {}, { timezone: "UTC" }],
  ["DELETE /api/account", accountRoute.DELETE, "DELETE", {}],
  ["GET /api/catalog", catalogRoute.GET, "GET", {}],
  ["GET /api/dashboard", dashboardRoute.GET, "GET", {}],
  ["GET /api/gaps", gapsRoute.GET, "GET", {}],
  [
    "PUT /api/gaps",
    gapsRoute.PUT,
    "PUT",
    {},
    { gaps: { 1: [1, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] } },
  ],
  ["DELETE /api/gaps", gapsRoute.DELETE, "DELETE", {}],
  ["GET /api/progress", progressRoute.GET, "GET", {}],
  ["PUT /api/progress/:id", problemRoute.PUT, "PUT", P1, SOLVE],
  [
    "PATCH /api/progress/:id",
    problemRoute.PATCH,
    "PATCH",
    P1,
    { confidence: 1 },
  ],
  ["DELETE /api/progress/:id", problemRoute.DELETE, "DELETE", P1],
  [
    "PUT /api/progress/:id/revisions/:n",
    revisionRoute.PUT,
    "PUT",
    P1_R1,
    { completedOn: "2026-09-24" },
  ],
  [
    "DELETE /api/progress/:id/revisions/:n",
    revisionRoute.DELETE,
    "DELETE",
    P1_R1,
  ],
  ["GET /api/notes", notesRoute.GET, "GET", {}],
  ["GET /api/notes/search", notesSearchRoute.GET, "GET", {}],
  ["GET /api/notes/export", notesExportRoute.GET, "GET", {}],
  ["GET /api/notes/:id", noteRoute.GET, "GET", P1],
  [
    "PUT /api/notes/:id",
    noteRoute.PUT,
    "PUT",
    P1,
    { body: "note", baseVersion: null },
  ],
  ["DELETE /api/notes/:id", noteRoute.DELETE, "DELETE", P1],
  [
    "GET /api/categories/:id/notes",
    categoryNotesRoute.GET,
    "GET",
    { categoryId: "1" },
  ],
];

describe("every protected route", () => {
  it.each(ROUTES)(
    "%s returns 401 without a session",
    async (_name, handler, method, params, body) => {
      mockedGetSession.mockResolvedValue(null);
      const response = await send(handler, method, params, body);
      expect(response.status).toBe(401);
      expect(await errorCode(response)).toBe("UNAUTHENTICATED");
    },
  );

  it.each(ROUTES.filter(([, , method]) => method !== "GET"))(
    "%s rejects a foreign Origin",
    async (_name, handler, method, params, body) => {
      const response = await send(handler, method, params, body, {
        origin: "https://evil.test",
      });
      expect(response.status).toBe(403);
      expect(await errorCode(response)).toBe("FORBIDDEN_ORIGIN");
    },
  );
});

describe("progress routes", () => {
  it("solve, revise, undo, list and unmark through HTTP", async () => {
    const solved = await send(problemRoute.PUT, "PUT", P1, SOLVE);
    expect(solved.status).toBe(200);
    expect(await solved.json()).toMatchObject({
      problemId: 1,
      next: { number: 1, status: "overdue", date: "2026-09-23" },
    });

    const revised = await send(revisionRoute.PUT, "PUT", P1_R1, {
      completedOn: "2026-09-24",
    });
    expect(await revised.json()).toMatchObject({
      next: { number: 2, date: "2026-10-01" },
    });

    const undone = await send(revisionRoute.DELETE, "DELETE", P1_R1);
    expect(await undone.json()).toMatchObject({ next: { number: 1 } });

    const patched = await send(problemRoute.PATCH, "PATCH", P1, {
      confidence: 3,
    });
    expect(await patched.json()).toMatchObject({ confidence: 3 });

    const list = await send(progressRoute.GET, "GET");
    expect(await list.json()).toMatchObject({
      today: "2026-09-24",
      entries: [{ problemId: 1, confidence: 3 }],
    });

    const unmarked = await send(problemRoute.DELETE, "DELETE", P1);
    expect(unmarked.status).toBe(204);
    expect(
      (await (await send(progressRoute.GET, "GET")).json()).entries,
    ).toEqual([]);
  });

  it.each([
    ["an impossible date", { solvedOn: "2026-02-30", confidence: 2 }],
    ["a malformed date", { solvedOn: "24/09/2026", confidence: 2 }],
    ["confidence out of range", { solvedOn: "2026-09-20", confidence: 4 }],
    ["an unknown key", { ...SOLVE, userId: "someone-else" }],
    ["a missing field", { solvedOn: "2026-09-20" }],
  ])("rejects %s with 400", async (_case, body) => {
    const response = await send(problemRoute.PUT, "PUT", P1, body);
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("rejects a future date with 409 TIMELINE_CONFLICT", async () => {
    const response = await send(problemRoute.PUT, "PUT", P1, {
      solvedOn: "2026-09-25",
      confidence: 2,
    });
    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe("TIMELINE_CONFLICT");
  });

  it("rejects a revision number outside 1–3 with 400", async () => {
    const response = await send(
      revisionRoute.PUT,
      "PUT",
      { problemId: "1", n: "4" },
      { completedOn: "2026-09-24" },
    );
    expect(response.status).toBe(400);
  });

  it("answers 204 when unmarking a problem that isn't solved", async () => {
    const response = await send(problemRoute.DELETE, "DELETE", P1);
    expect(response.status).toBe(204);
  });

  it("returns 404 for a problem id that isn't in the catalog", async () => {
    const response = await send(
      problemRoute.PUT,
      "PUT",
      { problemId: "999" },
      SOLVE,
    );
    expect(response.status).toBe(404);
    expect(await errorCode(response)).toBe("NOT_FOUND");
  });

  it("answers two simultaneous first solves with one 200 and one 409, never 500", async () => {
    // A third connection inserts the row without committing. Both requests then find
    // nothing to lock, and their inserts wait on the primary key. Rolling back lets
    // one insert through; the other then hits the unique violation.
    const blocker = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await blocker.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        `INSERT INTO user_problem (user_id, problem_id, solved_on, confidence)
         VALUES ($1, 1, '2026-09-20', 2)`,
        [user.id],
      );

      const requests = [
        send(problemRoute.PUT, "PUT", P1, SOLVE),
        send(problemRoute.PUT, "PUT", P1, { ...SOLVE, confidence: 3 }),
      ];
      await waitForBlockedQueries(blocker, 2);
      await blocker.query("ROLLBACK");

      const responses = await Promise.all(requests);
      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([200, 409]);
      const conflict = responses.find((response) => response.status === 409)!;
      expect(await errorCode(conflict)).toBe("CONFLICT");
    } finally {
      await blocker.end();
    }
  });
});

describe("gaps, dashboard and catalog routes", () => {
  it("save, read and reset gaps", async () => {
    const custom = { 1: [2, 5, 12], 2: [3, 7, 14], 3: [7, 21, 60] };
    const saved = await send(gapsRoute.PUT, "PUT", {}, { gaps: custom });
    expect(await saved.json()).toEqual({ gaps: custom, isDefault: false });
    expect(await (await send(gapsRoute.GET, "GET")).json()).toEqual({
      gaps: custom,
      isDefault: false,
    });
    const reset = await send(gapsRoute.DELETE, "DELETE");
    expect(reset.status).toBe(200);
    expect((await reset.json()).isDefault).toBe(true);
  });

  it.each([
    ["a gap of 0", { 1: [0, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] }],
    ["a gap over 180", { 1: [1, 4, 181], 2: [3, 7, 14], 3: [5, 14, 30] }],
    ["a missing confidence", { 1: [1, 4, 10], 2: [3, 7, 14] }],
    ["a fractional gap", { 1: [1.5, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] }],
  ])("rejects %s with 400", async (_case, gaps) => {
    const response = await send(gapsRoute.PUT, "PUT", {}, { gaps });
    expect(response.status).toBe(400);
  });

  it("returns the dashboard", async () => {
    await send(problemRoute.PUT, "PUT", P1, SOLVE);
    const response = await send(dashboardRoute.GET, "GET");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      today: "2026-09-24",
      overdue: [{ problemId: 1, revision: 1, daysOverdue: 1 }],
    });
  });

  it("returns the catalog with LeetCode links and a private cache header", async () => {
    const response = await send(catalogRoute.GET, "GET");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=86400",
    );
    const catalog = await response.json();
    expect(catalog.categories).toHaveLength(18);
    expect(catalog.problems).toHaveLength(250);
    const first = catalog.problems[0];
    expect(first.leetcodeUrl).toBe(
      `https://leetcode.com/problems/${first.leetcodeSlug}/`,
    );
  });
});

describe("notes routes", () => {
  const put = (params: Record<string, string>, body: unknown) =>
    send(noteRoute.PUT, "PUT", params, body);

  it("create, read, list, update, conflict and blank-delete through HTTP", async () => {
    const created = await put(P1, { body: "## Idea", baseVersion: null });
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({
      problemId: 1,
      body: "## Idea",
      version: 1,
    });

    const read = await send(noteRoute.GET, "GET", P1);
    expect(await read.json()).toMatchObject({ body: "## Idea", version: 1 });
    const list = await send(notesRoute.GET, "GET");
    expect(await list.json()).toEqual([
      { problemId: 1, updatedAt: expect.any(String) },
    ]);

    const updated = await put(P1, { body: "Better idea", baseVersion: 1 });
    expect(await updated.json()).toMatchObject({ version: 2 });

    const stale = await put(P1, { body: "Old tab", baseVersion: 1 });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({
      error: {
        code: "NOTE_CONFLICT",
        message: expect.any(String),
        details: { currentVersion: 2 },
      },
    });

    const blank = await put(P1, { body: "   ", baseVersion: 2 });
    expect(blank.status).toBe(204);
    const gone = await send(noteRoute.GET, "GET", P1);
    expect(gone.status).toBe(404);
  });

  it("DELETE answers 204 whether or not there is a note", async () => {
    await put(P1, { body: "x", baseVersion: null });
    expect((await send(noteRoute.DELETE, "DELETE", P1)).status).toBe(204);
    expect((await send(noteRoute.DELETE, "DELETE", P1)).status).toBe(204);
  });

  it("a problem id that isn't in the catalog is 404 on every save", async () => {
    for (const body of [
      { body: "new", baseVersion: null },
      { body: "edit", baseVersion: 1 },
      { body: "", baseVersion: null },
    ]) {
      const response = await put({ problemId: "999" }, body);
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("NOT_FOUND");
    }
  });

  it("rejects a note over 20,000 characters, unknown keys and a missing baseVersion with 400", async () => {
    for (const body of [
      { body: "x".repeat(20_001), baseVersion: null },
      { body: "x", baseVersion: null, pinned: true },
      { body: "x" },
    ]) {
      const response = await put(P1, body);
      expect(response.status).toBe(400);
      expect(await errorCode(response)).toBe("VALIDATION_ERROR");
    }
  });

  it("searches notes, and rejects a blank or missing query with 400", async () => {
    await put(P1, { body: "Use a Hash map", baseVersion: null });

    const found = await get(notesSearchRoute.GET, "?q=hash");
    expect(await found.json()).toEqual([
      {
        problemId: 1,
        snippet: "Use a Hash map",
        updatedAt: expect.any(String),
      },
    ]);
    for (const query of ["?q=%20%20", ""]) {
      expect((await get(notesSearchRoute.GET, query)).status).toBe(400);
    }
  });

  it("lists a category's notes, and is 404 for an unknown category", async () => {
    await put(P1, { body: "one", baseVersion: null });

    const listed = await send(categoryNotesRoute.GET, "GET", {
      categoryId: "1",
    });
    expect(await listed.json()).toEqual([
      expect.objectContaining({ problemId: 1, body: "one", version: 1 }),
    ]);
    const unknown = await send(categoryNotesRoute.GET, "GET", {
      categoryId: "999",
    });
    expect(unknown.status).toBe(404);
  });

  it("downloads all notes or one category as a Markdown file", async () => {
    await put({ problemId: "4" }, { body: "Hash map.", baseVersion: null });

    const all = await get(notesExportRoute.GET, "");
    expect(all.status).toBe(200);
    expect(all.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(all.headers.get("content-disposition")).toBe(
      'attachment; filename="revcode-notes-2026-09-24.md"',
    );
    expect(all.headers.get("cache-control")).toBe("private, no-store");
    expect(await all.text()).toBe(
      "# Arrays & Hashing\n\n## 4. Two Sum (Easy)\n\n" +
        "<https://leetcode.com/problems/two-sum/>\n\nHash map.\n",
    );

    const one = await get(notesExportRoute.GET, "?categoryId=2");
    expect(one.headers.get("content-disposition")).toBe(
      'attachment; filename="revcode-notes-two-pointers-2026-09-24.md"',
    );
    expect(await one.text()).toBe("# Two Pointers\n");
  });

  it("export is 404 for an unknown category and 400 for unknown query keys", async () => {
    expect((await get(notesExportRoute.GET, "?categoryId=999")).status).toBe(
      404,
    );
    expect((await get(notesExportRoute.GET, "?format=pdf")).status).toBe(400);
  });
});

async function waitForBlockedQueries(client: pg.Client, count: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { rows } = await client.query<{ blocked: number }>(
      `SELECT count(*)::int AS blocked FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if (rows[0]!.blocked >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Expected ${count} blocked queries`);
}
