import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/auth";
import { getMe } from "./account.service";

const user = {
  id: "user-a",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
  image: "https://example.com/a.png",
  timezone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies SessionUser;

// 2026-09-24 20:30 UTC is already 2026-09-25 in Kolkata (UTC+5:30).
const NOW = new Date("2026-09-24T20:30:00Z");

describe("getMe", () => {
  it("treats a null time zone as UTC and keeps it null", () => {
    expect(getMe(user, NOW)).toEqual({
      id: "user-a",
      name: "Ada",
      email: "ada@example.com",
      image: "https://example.com/a.png",
      timezone: null,
      today: "2026-09-24",
    });
  });

  it("computes today in the user's time zone", () => {
    const me = getMe({ ...user, timezone: "Asia/Kolkata" }, NOW);
    expect(me.timezone).toBe("Asia/Kolkata");
    expect(me.today).toBe("2026-09-25");
  });

  it("returns a missing image as null", () => {
    expect(getMe({ ...user, image: undefined }, NOW).image).toBeNull();
  });
});
