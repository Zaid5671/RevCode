// First setup file of the database tests: it must run before anything imports
// src/server/db.ts, which reads DATABASE_URL once.
import { loadTestEnv } from "../helpers/testEnv";

loadTestEnv();
