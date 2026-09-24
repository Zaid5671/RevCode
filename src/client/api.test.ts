import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiRequest } from "./api";

const itemSchema = z.object({ id: z.number() });

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("GETs the path and returns the validated body", async () => {
    const fetchMock = stubFetch(json({ id: 7 }));
    await expect(apiRequest("/api/thing", itemSchema)).resolves.toEqual({
      id: 7,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/thing", {
      method: "GET",
      headers: { Accept: "application/json" },
      body: undefined,
      credentials: "same-origin",
    });
  });

  it("sends a body as JSON", async () => {
    const fetchMock = stubFetch(json({ id: 7 }));
    await apiRequest("/api/thing/7", itemSchema, {
      method: "PUT",
      body: { name: "x" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/thing/7", {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: '{"name":"x"}',
      credentials: "same-origin",
    });
  });

  it("returns undefined for 204 No Content", async () => {
    stubFetch(new Response(null, { status: 204 }));
    await expect(
      apiRequest("/api/thing/7", z.undefined(), { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("turns the API's error shape into an ApiError", async () => {
    stubFetch(
      json(
        {
          error: {
            code: "NOTE_CONFLICT",
            message: "Changed elsewhere.",
            details: { currentVersion: 3 },
          },
        },
        409,
      ),
    );
    const error = await caught(apiRequest("/api/thing", itemSchema));
    expect(error).toMatchObject({
      status: 409,
      code: "NOTE_CONFLICT",
      message: "Changed elsewhere.",
      details: { currentVersion: 3 },
    });
  });

  it("gives a generic error when the failure body isn't the API's shape", async () => {
    stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    const error = await caught(apiRequest("/api/thing", itemSchema));
    expect(error).toMatchObject({ status: 502, code: "INTERNAL_ERROR" });
    expect(error.message).not.toContain("html");
  });

  it("reports a network failure", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    const error = await caught(apiRequest("/api/thing", itemSchema));
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("rejects a successful response that doesn't match the schema", async () => {
    stubFetch(json({ id: "seven" }));
    const error = await caught(apiRequest("/api/thing", itemSchema));
    expect(error).toMatchObject({ status: 200, code: "BAD_RESPONSE" });
  });
});
