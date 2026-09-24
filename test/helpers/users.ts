// Test users, created directly in the "user" table (PLAN.md §11), and their sessions.
import { randomUUID } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import type { Session, SessionUser } from "@/server/auth";
import { pool } from "@/server/db";

export async function createUser(
  options: { timezone?: string | null } = {},
): Promise<SessionUser> {
  const id = randomUUID();
  const { rows } = await pool.query<SessionUser>(
    `INSERT INTO "user" (id, name, email, "emailVerified", timezone)
     VALUES ($1, 'Test User', $2, true, $3)
     RETURNING id, name, email, "emailVerified", image, timezone, "createdAt", "updatedAt"`,
    [id, `${id}@example.com`, options.timezone ?? null],
  );
  return rows[0]!;
}

/** A session object for a stubbed `getSession`, as Better Auth would return it. */
export function stubSession(user: SessionUser): Session {
  const now = new Date();
  return {
    user,
    session: {
      id: randomUUID(),
      userId: user.id,
      token: randomUUID(),
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    },
  } as Session;
}

/**
 * Stores a real session and returns the `Cookie` header Better Auth would accept for it.
 * `signedInAt` sets the session's age, which account deletion checks.
 */
export async function signIn(
  user: SessionUser,
  signedInAt: Date = new Date(),
): Promise<string> {
  const token = randomUUID();
  await pool.query(
    `INSERT INTO session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, now() + interval '7 days', $4, $4)`,
    [randomUUID(), token, user.id, signedInAt],
  );
  const secret = process.env.BETTER_AUTH_SECRET!;
  const value = `${token}.${await makeSignature(token, secret)}`;
  return `better-auth.session_token=${encodeURIComponent(value)}`;
}
