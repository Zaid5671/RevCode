// Optimistic redirect to /sign-in when there is no session cookie (PLAN.md §6).
// Convenience only: it doesn't check that the cookie is valid. The real check is
// requireSession() in the signed-in layout and pages, and withHandler() for the API.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export const config = {
  // Every page except the public ones. API routes answer 401 themselves, and Next's
  // assets and files with an extension (favicon.ico, robots.txt) are left alone.
  // Keep `\\.` (a literal dot); a single backslash would make it "any character", and
  // the proxy would then skip every page but /. proxy.test.ts checks the compiled matcher.
  matcher: ["/((?!api/|_next/|sign-in|privacy|terms|.*\\.).*)"],
};
