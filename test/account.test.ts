import { describe, expect, it } from "vitest";
import { DELETE as deleteAccountRoute } from "@/app/api/account/route";
import { PATCH as patchMe } from "@/app/api/me/route";
import { getSession } from "@/server/auth";
import { pool } from "@/server/db";
import { replaceGaps } from "@/server/modules/gaps/gaps.service";
import { saveNote } from "@/server/modules/notes/notes.service";
import { markSolved } from "@/server/modules/progress/progress.service";
import { createUser, signIn } from "./helpers/users";

const APP = "http://localhost:3100";
const DAY_MS = 86_400_000;

function call(method: string, path: string, cookie: string, body?: unknown) {
  return new Request(`${APP}${path}`, {
    method,
    headers: { cookie, origin: APP, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function rowCounts(userId: string) {
  const { rows } = await pool.query<{ table: string; count: number }>(
    `SELECT 'user' AS table, count(*)::int AS count FROM "user" WHERE id = $1
     UNION ALL SELECT 'session', count(*)::int FROM session WHERE "userId" = $1
     UNION ALL SELECT 'user_problem', count(*)::int FROM user_problem WHERE user_id = $1
     UNION ALL SELECT 'user_gap', count(*)::int FROM user_gap WHERE user_id = $1
     UNION ALL SELECT 'problem_note', count(*)::int FROM problem_note WHERE user_id = $1`,
    [userId],
  );
  return Object.fromEntries(rows.map((row) => [row.table, row.count]));
}

async function userWithData() {
  const user = await createUser();
  await markSolved(user, 1, { solvedOn: "2026-09-01", confidence: 2 });
  await replaceGaps(user.id, { 1: [1, 4, 10], 2: [2, 7, 14], 3: [5, 14, 30] });
  await saveNote(user.id, 2, { body: "a note", baseVersion: null });
  return user;
}

describe("PATCH /api/me", () => {
  it("saves the time zone and returns the profile with today in that zone", async () => {
    const user = await createUser();
    const cookie = await signIn(user);

    const response = await patchMe(
      call("PATCH", "/api/me", cookie, { timezone: "Pacific/Kiritimati" }),
    );

    expect(response.status).toBe(200);
    const me = await response.json();
    expect(me).toMatchObject({ id: user.id, timezone: "Pacific/Kiritimati" });
    // UTC+14: today there is at least today in UTC.
    expect(me.today >= new Date().toISOString().slice(0, 10)).toBe(true);

    const session = await getSession(new Headers({ cookie }));
    expect(session?.user.timezone).toBe("Pacific/Kiritimati");
  });

  it("rejects a time zone that isn't a real IANA zone", async () => {
    const user = await createUser();
    const cookie = await signIn(user);

    const response = await patchMe(
      call("PATCH", "/api/me", cookie, { timezone: "Mars/Olympus" }),
    );

    expect(response.status).toBe(400);
    const session = await getSession(new Headers({ cookie }));
    expect(session?.user.timezone).toBeNull();
  });
});

describe("DELETE /api/account", () => {
  it("deletes the user with their progress, gaps, notes and sessions", async () => {
    const user = await userWithData();
    const other = await userWithData();
    const cookie = await signIn(user);

    const response = await deleteAccountRoute(
      call("DELETE", "/api/account", cookie),
    );

    expect(response.status).toBe(204);
    expect(await rowCounts(user.id)).toEqual({
      user: 0,
      session: 0,
      user_problem: 0,
      user_gap: 0,
      problem_note: 0,
    });
    expect(await rowCounts(other.id)).toMatchObject({
      user: 1,
      user_problem: 1,
      user_gap: 3,
      problem_note: 1,
    });
  });

  it("refuses with 403 SESSION_NOT_FRESH when the sign-in is over a day old", async () => {
    const user = await userWithData();
    const cookie = await signIn(user, new Date(Date.now() - 2 * DAY_MS));

    const response = await deleteAccountRoute(
      call("DELETE", "/api/account", cookie),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("SESSION_NOT_FRESH");
    expect(await rowCounts(user.id)).toEqual({
      user: 1,
      session: 1,
      user_problem: 1,
      user_gap: 3,
      problem_note: 1,
    });
  });
});
