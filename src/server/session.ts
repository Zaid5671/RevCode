// The session for server-rendered pages. The signed-in layout and each page both call
// requireSession(); React's cache() makes that one lookup per request.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession, type Session } from "./auth";

export const getPageSession = cache(async (): Promise<Session | null> =>
  getSession(await headers()),
);

/** The real sign-in check for pages (PLAN.md §6): signed-out visitors go to /sign-in. */
export async function requireSession(): Promise<Session> {
  const session = await getPageSession();
  if (!session) redirect("/sign-in");
  return session;
}
