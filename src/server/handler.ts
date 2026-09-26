// withHandler(): the one entry path for every API route handler (PLAN.md §7.1).
// In order: origin check (mutations) → session → body size → Zod parse of params,
// query and body → the route's function → error mapping.
import { z } from "zod";
import { getSession, type Session, type SessionUser } from "./auth";
import { appOrigin } from "./config";
import { AppError, errorResponse, fromPostgresError } from "./errors";

export const MAX_BODY_BYTES = 64 * 1024;

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const NO_QUERY = z.strictObject({});

type RouteSegmentContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

type Schema<T> = z.ZodType<T, unknown>;

type Options<P, Q, B, Public extends boolean> = {
  /** `true` skips the session check. No route uses it since /api/health became signed-in only. */
  public?: Public;
  params?: Schema<P>;
  query?: Schema<Q>;
  body?: Schema<B>;
};

type AuthContext = { user: SessionUser; session: Session["session"] };

type Context<P, Q, B, Public extends boolean> = {
  request: Request;
  params: P;
  query: Q;
  body: B;
} & (Public extends true ? object : AuthContext);

/**
 * What the route's function returns: a `Response` is sent as is, `undefined` (or no
 * return value) becomes `204 No Content`, and anything else is sent as JSON with status 200.
 */
type Result = Response | void | object;

export function withHandler<
  P = undefined,
  Q = undefined,
  B = undefined,
  Public extends boolean = false,
>(
  options: Options<P, Q, B, Public>,
  run: (context: Context<P, Q, B, Public>) => Promise<Result>,
) {
  return async (
    request: Request,
    segment?: RouteSegmentContext,
  ): Promise<Response> => {
    try {
      checkOrigin(request);

      let auth: AuthContext | object = {};
      if (!options.public) {
        const session = await getSession(request.headers);
        if (!session)
          throw new AppError("UNAUTHENTICATED", "Please sign in again.");
        auth = { user: session.user, session: session.session };
      }

      const params = parse(options.params, await segment?.params, "params");
      const search = Object.fromEntries(new URL(request.url).searchParams);
      // A route without a query schema takes no query string at all (§7.1: unknown keys rejected).
      const query = options.query
        ? parse(options.query, search, "query")
        : (parse(NO_QUERY, search, "query"), undefined as Q);
      const body = options.body
        ? parse(options.body, await readJson(request), "body")
        : undefined;

      const result = await run({
        request,
        params,
        query,
        body,
        ...auth,
      } as Context<P, Q, B, Public>);

      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });
      return Response.json(result);
    } catch (error) {
      return toErrorResponse(error, request);
    }
  };
}

// With SameSite=Lax cookies, rejecting a foreign Origin on mutations blocks CSRF.
// Requests without an Origin header (same-origin GETs, non-browser clients) pass.
function checkOrigin(request: Request) {
  if (!MUTATIONS.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== appOrigin()) {
    throw new AppError(
      "FORBIDDEN_ORIGIN",
      "This request came from another site and was blocked.",
    );
  }
}

function parse<T>(
  schema: Schema<T> | undefined,
  input: unknown,
  where: "params" | "query" | "body",
): T {
  if (!schema) return undefined as T;
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `The request ${where} is not valid.`,
      result.error.issues.map((issue) => ({
        path: [where, ...issue.path.map(String)].join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

async function readJson(request: Request): Promise<unknown> {
  const tooLarge = new AppError(
    "PAYLOAD_TOO_LARGE",
    `The request body is larger than ${MAX_BODY_BYTES / 1024} KB.`,
  );
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) throw tooLarge;

  // The header can be missing or wrong, so the real size is checked too.
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_BODY_BYTES) throw tooLarge;

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AppError("VALIDATION_ERROR", "The request body must be JSON.");
  }
}

function toErrorResponse(error: unknown, request: Request): Response {
  if (error instanceof AppError) return errorResponse(error);
  const mapped = fromPostgresError(error);
  if (mapped) return errorResponse(mapped);

  // Unexpected: log enough to debug, but never request bodies, cookies or headers.
  // A Postgres error's `detail` can quote row values (such as note text), so it is left out.
  const { pathname } = new URL(request.url);
  console.error(
    `${request.method} ${pathname} failed:`,
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  return errorResponse(
    new AppError("INTERNAL_ERROR", "Something went wrong. Please try again."),
  );
}
