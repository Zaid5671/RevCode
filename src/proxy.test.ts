import type { NextConfig } from "next";
import * as pageStaticInfo from "next/dist/build/analysis/get-page-static-info";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

// Next's internal matcher compiler, which it exports without types. If an upgrade
// removes it, the matcher tests below fail loudly rather than pass.
const { getMiddlewareMatchers } = pageStaticInfo as unknown as {
  getMiddlewareMatchers: (
    matcher: string[],
    nextConfig: NextConfig,
  ) => { regexp: string }[];
};

function visit(path: string, cookie?: string) {
  return proxy(
    new NextRequest(`http://localhost:3100${path}`, {
      headers: cookie ? { cookie } : {},
    }),
  );
}

describe("proxy", () => {
  it("redirects to /sign-in when there is no session cookie", () => {
    const response = visit("/problems");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3100/sign-in",
    );
  });

  it("lets a request with a session cookie through", () => {
    const response = visit("/problems", "better-auth.session_token=abc.def");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("accepts the __Secure- cookie used over HTTPS", () => {
    const response = visit("/", "__Secure-better-auth.session_token=abc.def");
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy matcher", () => {
  // Compiled with Next's own function, the one it uses for proxy.ts. The matcher is easy
  // to get subtly wrong (escaping), and a wrong one fails silently: pages are still
  // protected by requireSession(), just without the early redirect.
  const [compiled] = getMiddlewareMatchers(config.matcher, {} as NextConfig);
  const matches = (path: string) => new RegExp(compiled!.regexp).test(path);

  it.each(["/", "/problems", "/notes", "/notes/3", "/settings"])(
    "runs on the signed-in page %s",
    (path) => expect(matches(path)).toBe(true),
  );

  it.each([
    "/sign-in",
    "/privacy",
    "/terms",
    "/api/me",
    "/api/auth/callback/google",
    "/_next/static/chunks/app.js",
    "/favicon.ico",
  ])("skips %s", (path) => expect(matches(path)).toBe(false));
});
