// SQL for the signed-in user's own row in Better Auth's "user" table. Better Auth's
// columns are camelCase and must be quoted; "user" is a reserved word.
import type { SessionUser } from "@/server/auth";
import type { Queryable } from "@/server/db";

/** Sets the user's time zone and returns the updated profile fields. */
export async function updateTimezone(
  db: Queryable,
  userId: string,
  timezone: string,
): Promise<SessionUser> {
  const { rows } = await db.query<SessionUser>(
    `UPDATE "user" SET timezone = $2, "updatedAt" = now()
     WHERE id = $1
     RETURNING id, name, email, "emailVerified", image, timezone, "createdAt", "updatedAt"`,
    [userId, timezone],
  );
  return rows[0]!;
}
