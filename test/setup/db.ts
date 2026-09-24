// Every database test starts with no users, and so with no per-user rows: they all
// reference "user" with ON DELETE CASCADE. The catalog stays.
import { afterAll, beforeEach } from "vitest";
import { pool } from "@/server/db";

beforeEach(async () => {
  await pool.query('TRUNCATE "user", verification CASCADE');
});

afterAll(async () => {
  await pool.end();
});
