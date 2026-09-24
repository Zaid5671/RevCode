// Runs once before the database tests: resets the Neon `test` branch, then applies every
// migration and seeds the catalog (PLAN.md §11). Uses its own direct connection, since
// runMigrations holds a session-level advisory lock that Neon's pooler would not keep.
import { readFileSync } from "node:fs";
import pg from "pg";
import { CATALOG_PATH, type Catalog } from "../../scripts/build-catalog";
import { runMigrations } from "../../scripts/migrate";
import { seedCatalog } from "../../scripts/seed";
import { loadTestEnv } from "../helpers/testEnv";

export default async function setup() {
  const client = new pg.Client({ connectionString: loadTestEnv() });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await runMigrations(client);
    const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
    await seedCatalog(client, catalog);
  } finally {
    await client.end();
  }
}
