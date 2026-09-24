// Applies pending SQL migrations from db/migrations in name order (PLAN.md §5.1).
// Each file runs in its own transaction and is recorded in schema_migrations.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type pg from "pg";
import { REPO_ROOT, runIfMain, withDirectClient } from "./cli";

const MIGRATIONS_DIR = path.join(REPO_ROOT, "db", "migrations");

const MIGRATION_NAME = /^\d{3}_[a-z0-9_]+\.sql$/;

// Arbitrary constant: holding this advisory lock keeps two runners from overlapping.
const LOCK_KEY = 7_283_001;

/**
 * Applies every migration not yet recorded and returns the names it applied.
 * Needs a direct (unpooled) connection: the advisory lock is session-level, which
 * Neon's pooler does not preserve.
 */
export async function runMigrations(client: pg.ClientBase): Promise<string[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const badName = files.find((name) => !MIGRATION_NAME.test(name));
  if (badName)
    throw new Error(`Migration "${badName}" must be named NNN_description.sql`);

  await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations",
    );
    const applied = new Set(rows.map((r) => r.name));

    const pending = files.filter((name) => !applied.has(name));
    for (const name of pending) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          name,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        // If the connection dropped, ROLLBACK fails too; keep the original error.
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(
          `Migration ${name} failed: ${(error as Error).message}`,
          { cause: error },
        );
      }
    }
    return pending;
  } finally {
    // Best effort: a lost connection releases the lock anyway, and an unlock error
    // must not hide the error that got us here.
    await client
      .query("SELECT pg_advisory_unlock($1)", [LOCK_KEY])
      .catch(() => {});
  }
}

runIfMain(import.meta.url, async () => {
  const applied = await withDirectClient((client) => runMigrations(client));
  console.log(
    applied.length === 0
      ? "Database is up to date; no migrations to apply."
      : `Applied ${applied.length} migration(s): ${applied.join(", ")}`,
  );
});
