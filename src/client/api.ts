// The one way the browser calls the API (PLAN.md §8.1): JSON in and out, every response
// checked against its shared Zod schema, every failure turned into an ApiError.
import type { z } from "zod";
import { apiErrorSchema, type ErrorCode } from "@/domain/schemas";

/** The API's error codes (§7.1), plus two that only the browser can see. */
export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "BAD_RESPONSE";

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never got an answer. */
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

/**
 * Calls `path` and returns the response body parsed by `schema`. A `204` has no body, so
 * routes that answer `204` pass `z.undefined()`.
 */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = "GET", body }: RequestOptions = {},
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Couldn't reach RevCode. Check your connection and try again.",
    );
  }

  const data: unknown =
    response.status === 204
      ? undefined
      : await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiError(response.status, code, message, details);
    }
    throw new ApiError(
      response.status,
      "INTERNAL_ERROR",
      "Something went wrong on our side. Please try again.",
    );
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      "BAD_RESPONSE",
      "The server sent an unexpected response. Please reload the page.",
    );
  }
  return parsed.data;
}
