// Environment for the database tests. Vitest runs with NODE_ENV=test, and @next/env then
// skips .env.local, so the file is read here directly. The app is pointed at the Neon
// `test` branch: DATABASE_URL is replaced by TEST_DATABASE_URL (a direct connection).
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { REPO_ROOT } from "../../scripts/cli";

/** Loads .env.local into `process.env` for the `test` branch and returns its URL. */
export function loadTestEnv(): string {
  const file = parseEnv(
    readFileSync(path.join(REPO_ROOT, ".env.local"), "utf8"),
  );
  const testUrl = file.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set in .env.local.");
  }
  // The tests wipe their database. Refuse to start if it is the `dev` branch.
  for (const name of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"] as const) {
    const other = file[name];
    if (other && neonEndpoint(other) === neonEndpoint(testUrl)) {
      throw new Error(
        `TEST_DATABASE_URL points at the same database as ${name}; the tests would wipe it.`,
      );
    }
  }

  for (const [key, value] of Object.entries(file)) {
    if (key !== "DATABASE_URL_UNPOOLED") process.env[key] = value;
  }
  process.env.DATABASE_URL = testUrl;
  return testUrl;
}

// Neon's pooled and direct hosts differ only by a `-pooler` suffix on the endpoint id.
function neonEndpoint(url: string): string {
  const host = new URL(url).hostname;
  return host.split(".")[0]!.replace(/-pooler$/, "");
}
