// Route handlers for progress, gaps, dashboard and catalog, called with `Request` objects
// and a stubbed session (PLAN.md §11). Business rules are covered by the service tests.
import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as accountRoute from "@/app/api/account/route";
import * as catalogRoute from "@/app/api/catalog/route";
import * as dashboardRoute from "@/app/api/dashboard/route";
import * as gapsRoute from "@/app/api/gaps/route";
import * as meRoute from "@/app/api/me/route";
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
) {
  const request = new Request(`${APP}/api/test`, {
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

// Every protected route handler in Phase 4, with valid params and body.
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
