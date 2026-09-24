// Application errors and their HTTP statuses (PLAN.md §7.1). Services throw `AppError`;
// `withHandler()` turns it into the one error shape `{ error: { code, message, details? } }`.
import type { ApiError, ErrorCode } from "@/domain/schemas";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN_ORIGIN: 403,
  SESSION_NOT_FRESH: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TIMELINE_CONFLICT: 409,
  NOTE_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** The error shape for `error`, with its code's status unless `status` overrides it. */
export function errorResponse(
  error: AppError,
  status: number = ERROR_STATUS[error.code],
): Response {
  const body: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
  return Response.json(body, { status });
}

// Postgres error codes that are expected outcomes of a request, not server faults.
// They are a backstop behind the services' own checks.
const PG_ERRORS: Record<string, { code: ErrorCode; message: string }> = {
  // CHECK violation, e.g. a revision dated before the solve date
  "23514": {
    code: "TIMELINE_CONFLICT",
    message: "These dates are out of order.",
  },
  // unique violation, e.g. two tabs marking the same problem solved at once
  "23505": {
    code: "CONFLICT",
    message:
      "This was changed at the same time elsewhere. Reload and try again.",
  },
  // foreign key violation, e.g. an unknown problem id
  "23503": { code: "NOT_FOUND", message: "Not found." },
};

/** Maps a Postgres error with a known code to an `AppError`; anything else returns `null`. */
export function fromPostgresError(error: unknown): AppError | null {
  const pgCode =
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : null;
  const mapped = pgCode ? PG_ERRORS[pgCode] : undefined;
  return mapped ? new AppError(mapped.code, mapped.message) : null;
}
