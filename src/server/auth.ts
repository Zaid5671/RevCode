// Better Auth: Google sign-in, sessions stored in Postgres (PLAN.md §6).
// db/migrations/002_auth.sql is generated from this file; regenerate it as a new
// migration whenever a change here alters the auth tables.
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getConfig } from "./config";
import { pool } from "./db";

const config = getConfig();

export const auth = betterAuth({
  appName: "RevCode",
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      // Show Google's account chooser, so signing out and back in can switch accounts.
      prompt: "select_account",
    },
  },
  user: {
    additionalFields: {
      // IANA zone, `null` until set; the server treats `null` as UTC (§4.5). Changed only
      // through PATCH /api/me, which validates it, never by Better Auth's own endpoints.
      timezone: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
    // Google-only users have no password, so Better Auth requires a fresh session
    // (signed in within `session.freshAge`, default 1 day) to delete the account (§6).
    deleteUser: { enabled: true },
  },
  plugins: [nextCookies()], // must stay last
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];

/** The session for a request's cookies, or `null` when signed out or expired. */
export function getSession(headers: Headers): Promise<Session | null> {
  return auth.api.getSession({ headers });
}
