// The signed-in user's profile (PLAN.md §7: /api/me). Account deletion joins in Phase 4.
import { todayIn } from "@/domain/calendarDate";
import type { Me } from "@/domain/schemas";
import type { SessionUser } from "@/server/auth";

/** The user's profile and today's date in their time zone (`null` counts as UTC, §4.5). */
export function getMe(user: SessionUser, now: Date = new Date()): Me {
  const timezone = user.timezone ?? null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    timezone,
    today: todayIn(timezone ?? "UTC", now),
  };
}
