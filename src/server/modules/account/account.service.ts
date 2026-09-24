// The signed-in user's profile and account (PLAN.md §6, §7: /api/me, /api/account).
import { isAPIError } from "better-auth/api";
import { userToday } from "@/domain/calendarDate";
import type { Me } from "@/domain/schemas";
import { auth, type SessionUser } from "@/server/auth";
import { pool } from "@/server/db";
import { AppError } from "@/server/errors";
import { updateTimezone } from "./account.repository";

/** The user's profile and today's date in their time zone (`null` counts as UTC, §4.5). */
export function getMe(user: SessionUser, now: Date = new Date()): Me {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    timezone: user.timezone ?? null,
    today: userToday(user.timezone, now),
  };
}

/** PATCH /api/me. `timezone` is already validated as an IANA zone by the route's schema. */
export async function setTimezone(
  user: SessionUser,
  timezone: string,
): Promise<Me> {
  return getMe(await updateTimezone(pool, user.id, timezone));
}

/**
 * DELETE /api/account. Better Auth deletes the user (every per-user row goes with it by
 * ON DELETE CASCADE) and their sessions, and clears the session cookie. Google-only users
 * have no password, so Better Auth requires a sign-in within the last day (§6).
 */
export async function deleteAccount(headers: Headers): Promise<void> {
  try {
    await auth.api.deleteUser({ headers, body: {} });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "SESSION_EXPIRED") {
      throw new AppError(
        "SESSION_NOT_FRESH",
        "For your security, sign in again before deleting your account.",
      );
    }
    throw error;
  }
}
