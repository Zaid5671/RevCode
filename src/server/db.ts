// The app's one Postgres pool (PLAN.md §7.1), shared by Better Auth and the repositories.
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { getConfig } from "./config";

// Return DATE columns as `YYYY-MM-DD` strings. By default `pg` turns them into `Date`
// objects at local midnight, which shifts calendar dates across time zones (§4.5).
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

// Neon's pooled URL; few connections per instance, closed quickly when idle, following
// Neon's guide for Vercel Fluid compute.
export const pool = new pg.Pool({
  connectionString: getConfig().DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 5000,
});

// An idle connection can be dropped by the server (Neon suspends idle computes). The pool
// discards it; without a listener, the 'error' event would crash the process.
pool.on("error", (error) => {
  console.error("Idle database connection failed:", error.message);
});

// Lets Vercel close idle connections before an instance suspends. No effect locally.
attachDatabasePool(pool);

/** What repositories query through: the pool, or a transaction's client. */
export type Queryable = pg.Pool | pg.PoolClient;

/** Resolves when the database answers; throws if it can't be reached. */
export async function pingDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}

/**
 * Runs `run` inside BEGIN … COMMIT on one pooled connection and returns its result.
 * Any error rolls the transaction back and is rethrown.
 */
export async function withTransaction<T>(
  run: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // If ROLLBACK fails, the connection is unusable: drop it instead of reusing it,
    // and keep the original error.
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw error;
  } finally {
    client.release(broken);
  }
}
