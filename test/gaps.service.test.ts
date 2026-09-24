import { describe, expect, it } from "vitest";
import {
  getGaps,
  replaceGaps,
  resetGaps,
} from "@/server/modules/gaps/gaps.service";
import type { Gaps } from "@/domain/gaps";
import { pool } from "@/server/db";
import { createUser } from "./helpers/users";

const CUSTOM: Gaps = {
  1: [2, 5, 12],
  2: [3, 7, 14],
  3: [7, 21, 60],
};

describe("gaps", () => {
  it("gives a new user the default gaps", async () => {
    const user = await createUser();
    expect(await getGaps(user.id)).toEqual({
      gaps: { 1: [1, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] },
      isDefault: true,
    });
  });

  it("saves custom gaps for that user only", async () => {
    const user = await createUser();
    const other = await createUser();

    expect(await replaceGaps(user.id, CUSTOM)).toEqual({
      gaps: CUSTOM,
      isDefault: false,
    });
    expect(await getGaps(user.id)).toEqual({ gaps: CUSTOM, isDefault: false });
    expect((await getGaps(other.id)).isDefault).toBe(true);
  });

  it("stores nothing when the saved gaps equal the defaults", async () => {
    const user = await createUser();
    await replaceGaps(user.id, CUSTOM);

    const saved = await replaceGaps(user.id, {
      1: [1, 4, 10],
      2: [3, 7, 14],
      3: [5, 14, 30],
    });

    expect(saved.isDefault).toBe(true);
    // Absent rows mean "use the defaults" (PLAN.md §5.3), so a later change to the
    // defaults reaches this user too.
    const { rows } = await pool.query(
      "SELECT 1 FROM user_gap WHERE user_id = $1",
      [user.id],
    );
    expect(rows).toEqual([]);
  });

  it("resets to the defaults without touching another user's gaps", async () => {
    const user = await createUser();
    const other = await createUser();
    await replaceGaps(user.id, CUSTOM);
    await replaceGaps(other.id, CUSTOM);

    const reset = await resetGaps(user.id);

    expect(reset).toEqual({
      gaps: { 1: [1, 4, 10], 2: [3, 7, 14], 3: [5, 14, 30] },
      isDefault: true,
    });
    expect(await getGaps(user.id)).toEqual(reset);
    expect(await getGaps(other.id)).toEqual({ gaps: CUSTOM, isDefault: false });
  });
});
