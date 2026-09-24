// Revision gaps per user (PLAN.md §4.1). A confidence with no stored row uses DEFAULT_GAPS.
// Due dates are derived, so changing gaps moves every pending date on the next read.
import { CONFIDENCES, DEFAULT_GAPS, type Gaps } from "@/domain/gaps";
import type { GapsResponse } from "@/domain/schemas";
import { pool, type Queryable } from "@/server/db";
import { deleteGaps, findGaps, upsertGaps } from "./gaps.repository";

/** The user's gaps, with defaults filled in for any confidence not customised. */
export async function loadGaps(db: Queryable, userId: string): Promise<Gaps> {
  const stored = await findGaps(db, userId);
  return {
    1: stored[1] ?? DEFAULT_GAPS[1],
    2: stored[2] ?? DEFAULT_GAPS[2],
    3: stored[3] ?? DEFAULT_GAPS[3],
  };
}

export async function getGaps(userId: string): Promise<GapsResponse> {
  return toResponse(await loadGaps(pool, userId));
}

/**
 * Stores all three confidences' gaps (validated by `gapsSchema` in the route). Gaps equal
 * to the defaults are stored as no rows, so "default" always means "nothing stored".
 */
export async function replaceGaps(
  userId: string,
  gaps: Gaps,
): Promise<GapsResponse> {
  const response = toResponse(gaps);
  if (response.isDefault) await deleteGaps(pool, userId);
  else await upsertGaps(pool, userId, gaps);
  return response;
}

/** Removes the user's custom gaps, so every confidence uses the defaults again. */
export async function resetGaps(userId: string): Promise<GapsResponse> {
  await deleteGaps(pool, userId);
  return toResponse(DEFAULT_GAPS);
}

function toResponse(gaps: Gaps): GapsResponse {
  const isDefault = CONFIDENCES.every((confidence) =>
    gaps[confidence].every(
      (days, index) => days === DEFAULT_GAPS[confidence][index],
    ),
  );
  return { gaps, isDefault };
}
