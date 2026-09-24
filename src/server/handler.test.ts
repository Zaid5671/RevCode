import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { problemIdParamsSchema, putProgressBodySchema } from "@/domain/schemas";
import { getSession, type Session } from "./auth";
import { resetConfigForTests } from "./config";
import { AppError } from "./errors";
import { MAX_BODY_BYTES, withHandler } from "./handler";

// A stubbed session: the real one needs Postgres and a Google sign-in.
vi.mock("./auth", () => ({ getSession: vi.fn() }));
const mockedGetSession = vi.mocked(getSession);

const APP = "http://localhost:3100";

const SESSION = {
  user: {
    id: "user-a",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
    timezone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session-a",
    userId: "user-a",
    token: "token",
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as Session;

beforeEach(() => {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://u:p@localhost:5432/db?sslmode=verify-full",
  );
  vi.stubEnv("BETTER_AUTH_URL", APP);
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  resetConfigForTests();
  mockedGetSession.mockReset().mockResolvedValue(SESSION);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(
  method: string,
  path: string,
  init: { body?: string; headers?: Record<string, string> } = {},
) {
  return new Request(`${APP}${path}`, {
    method,
    body: init.body,
    headers: init.headers,
  });
}

const segment = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

async function errorOf(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error;
}

describe("session", () => {
  it("returns 401 UNAUTHENTICATED without a session", async () => {
    mockedGetSession.mockResolvedValue(null);
    const run = vi.fn();
    const response = await withHandler({}, run)(request("GET", "/api/me"));

    expect(response.status).toBe(401);
    expect(await errorOf(response)).toMatchObject({ code: "UNAUTHENTICATED" });
    expect(run).not.toHaveBeenCalled();
  });

  it("passes the session user to the route", async () => {
    const response = await withHandler({}, async ({ user }) => ({
      id: user.id,
    }))(request("GET", "/api/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "user-a" });
  });

  it("skips the session check on a public route", async () => {
    mockedGetSession.mockResolvedValue(null);
    const response = await withHandler({ public: true }, async () => ({
      ok: true,
    }))(request("GET", "/api/health"));

    expect(response.status).toBe(200);
    expect(mockedGetSession).not.toHaveBeenCalled();
  });
});

describe("origin check", () => {
  const handler = withHandler({}, async () => undefined);

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects %s from a foreign Origin with 403 FORBIDDEN_ORIGIN",
    async (method) => {
      const response = await handler(
        request(method, "/api/x", { headers: { origin: "https://evil.test" } }),
      );
      expect(response.status).toBe(403);
      expect(await errorOf(response)).toMatchObject({
        code: "FORBIDDEN_ORIGIN",
      });
    },
  );

  it("checks the origin before the session", async () => {
    await handler(
      request("DELETE", "/api/x", { headers: { origin: "https://evil.test" } }),
    );
    expect(mockedGetSession).not.toHaveBeenCalled();
  });

  it("allows a mutation from the app's own origin", async () => {
    const response = await handler(
      request("DELETE", "/api/x", { headers: { origin: APP } }),
    );
    expect(response.status).toBe(204);
  });

  it("allows a mutation without an Origin header", async () => {
    const response = await handler(request("DELETE", "/api/x"));
    expect(response.status).toBe(204);
  });

  it("does not check the origin on GET", async () => {
    const response = await handler(
      request("GET", "/api/x", { headers: { origin: "https://evil.test" } }),
    );
    expect(response.status).toBe(204);
  });
});

describe("validation", () => {
  const put = withHandler(
    { params: problemIdParamsSchema, body: putProgressBodySchema },
    async ({ params, body }) => ({ params, body }),
  );
  const validBody = JSON.stringify({ solvedOn: "2026-09-01", confidence: 2 });

  it("passes parsed params and body to the route", async () => {
    const response = await put(
      request("PUT", "/api/progress/7", { body: validBody }),
      segment({ problemId: "7" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      params: { problemId: 7 },
      body: { solvedOn: "2026-09-01", confidence: 2 },
    });
  });

  it("rejects bad params with 400 and says where", async () => {
    const response = await put(
      request("PUT", "/api/progress/abc", { body: validBody }),
      segment({ problemId: "abc" }),
    );

    expect(response.status).toBe(400);
    const error = await errorOf(response);
    expect(error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(JSON.stringify(error)).toContain("params.problemId");
  });

  it("rejects unknown body keys", async () => {
    const response = await put(
      request("PUT", "/api/progress/7", {
        body: JSON.stringify({
          solvedOn: "2026-09-01",
          confidence: 2,
          userId: "user-b",
        }),
      }),
      segment({ problemId: "7" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await put(
      request("PUT", "/api/progress/7", { body: "{oops" }),
      segment({ problemId: "7" }),
    );
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a missing body when one is required", async () => {
    const response = await put(
      request("PUT", "/api/progress/7"),
      segment({ problemId: "7" }),
    );
    expect(response.status).toBe(400);
  });

  it("validates the query string", async () => {
    const search = withHandler(
      { query: z.strictObject({ q: z.string().min(1) }) },
      async ({ query }) => query,
    );

    const ok = await search(request("GET", "/api/notes/search?q=heap"));
    expect(await ok.json()).toEqual({ q: "heap" });

    const bad = await search(request("GET", "/api/notes/search?q=heap&x=1"));
    expect(bad.status).toBe(400);
  });

  it("rejects any query string on a route without a query schema", async () => {
    const me = withHandler({}, async () => ({ ok: true }));

    expect((await me(request("GET", "/api/me"))).status).toBe(200);
    const response = await me(request("GET", "/api/me?foo=1"));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await errorOf(response))).toContain("query");
  });
});

describe("request size", () => {
  const post = withHandler(
    { body: z.object({ text: z.string() }) },
    async () => undefined,
  );

  it("rejects a body over 64 KB with 413", async () => {
    const response = await post(
      request("POST", "/api/x", {
        body: JSON.stringify({ text: "a".repeat(MAX_BODY_BYTES) }),
      }),
    );
    expect(response.status).toBe(413);
    expect(await errorOf(response)).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("rejects an oversized body even when Content-Length claims less", async () => {
    const response = await post(
      request("POST", "/api/x", {
        body: JSON.stringify({ text: "a".repeat(MAX_BODY_BYTES) }),
        headers: { "content-length": "10" },
      }),
    );
    expect(response.status).toBe(413);
  });

  it("accepts a body just under the limit", async () => {
    const text = "a".repeat(MAX_BODY_BYTES - 20);
    const response = await post(
      request("POST", "/api/x", { body: JSON.stringify({ text }) }),
    );
    expect(response.status).toBe(204);
  });
});

describe("results and errors", () => {
  it("sends a Response from the route as is", async () => {
    const response = await withHandler(
      {},
      async () => new Response("md", { status: 201 }),
    )(request("GET", "/api/x"));
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("md");
  });

  it("maps an AppError to its status and the error shape", async () => {
    const response = await withHandler({}, async () => {
      throw new AppError("NOTE_CONFLICT", "Changed elsewhere", { version: 3 });
    })(request("GET", "/api/x"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "NOTE_CONFLICT",
        message: "Changed elsewhere",
        details: { version: 3 },
      },
    });
  });

  it.each([
    ["23514", 409, "TIMELINE_CONFLICT"],
    ["23505", 409, "CONFLICT"],
    ["23503", 404, "NOT_FOUND"],
  ])("maps Postgres error %s to %i %s", async (pgCode, status, code) => {
    const response = await withHandler({}, async () => {
      throw Object.assign(new Error("violates constraint"), { code: pgCode });
    })(request("GET", "/api/x"));

    expect(response.status).toBe(status);
    expect(await errorOf(response)).toMatchObject({ code });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await withHandler({}, async () => {
      throw Object.assign(new Error("connection lost"), {
        code: "08006",
        detail: "Failing row contains (secret note)",
      });
    })(request("GET", "/api/x"));

    expect(response.status).toBe(500);
    const body = JSON.stringify(await response.json());
    expect(body).toContain("INTERNAL_ERROR");
    expect(body).not.toContain("connection lost");
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret note");
  });
});
