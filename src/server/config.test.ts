import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appOrigin, getConfig, resetConfigForTests } from "./config";

const VALID = {
  DATABASE_URL: "postgresql://u:p@host.neon.tech/db?sslmode=verify-full",
  BETTER_AUTH_URL: "http://localhost:3100",
  BETTER_AUTH_SECRET: "s".repeat(44),
  GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "GOCSPX-value",
};

function stub(env: Partial<Record<keyof typeof VALID, string | undefined>>) {
  for (const [key, value] of Object.entries({ ...VALID, ...env }))
    vi.stubEnv(key, value);
  resetConfigForTests();
}

beforeEach(() => stub({}));
afterEach(() => vi.unstubAllEnvs());

describe("getConfig", () => {
  it("returns the validated variables", () => {
    expect(getConfig()).toMatchObject(VALID);
    expect(appOrigin()).toBe("http://localhost:3100");
  });

  it("names every missing or malformed variable", () => {
    stub({ GOOGLE_CLIENT_ID: undefined, BETTER_AUTH_SECRET: "short" });
    expect(() => getConfig()).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => getConfig()).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("never puts a value in the error message", () => {
    stub({ DATABASE_URL: "mysql://user:hunter2@host/db" });
    expect(() => getConfig()).toThrow(/DATABASE_URL/);
    expect(() => getConfig()).not.toThrow(/hunter2/);
  });

  it("rejects a database URL without sslmode=verify-full", () => {
    stub({
      DATABASE_URL: "postgresql://u:p@host.neon.tech/db?sslmode=require",
    });
    expect(() => getConfig()).toThrow(
      /DATABASE_URL: must use sslmode=verify-full/,
    );
  });

  it("rejects a BETTER_AUTH_URL that is not http(s)", () => {
    stub({ BETTER_AUTH_URL: "localhost:3100" });
    expect(() => getConfig()).toThrow(/BETTER_AUTH_URL/);
  });
});
