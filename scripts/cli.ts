// Helpers shared by the command-line scripts in this folder.
import nextEnv from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Resolved from this file, so the scripts work whatever the current directory is.
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// Loads .env.local and opens one direct (unpooled) connection, which migrations and
// seeding use (PLAN.md §5.1). The connection is closed when `run` settles.
export async function withDirectClient<T>(
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  nextEnv.loadEnvConfig(REPO_ROOT);
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// Runs `main` only when the file is executed directly (`tsx scripts/x.ts`), not when a
// test imports it. Failures print the error (with its stack and cause) and set a
// non-zero exit code.
export function runIfMain(moduleUrl: string, main: () => void | Promise<void>) {
  const entry = process.argv[1];
  if (!entry) return;
  const normalize = (p: string) =>
    process.platform === "win32" ? p.toLowerCase() : p;
  if (normalize(path.resolve(entry)) !== normalize(fileURLToPath(moduleUrl)))
    return;

  Promise.resolve()
    .then(main)
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
