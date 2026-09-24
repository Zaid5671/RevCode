// The app's environment variables (PLAN.md §10), validated with Zod on first use.
// Error messages name the missing or malformed variables, never their values.
import { z } from "zod";

const envSchema = z.object({
  // Full certificate checks (§10). Neon's dashboard hands out `sslmode=require`, which
  // `pg` 9 will treat as weaker, so a pasted URL that wasn't changed is caught here.
  DATABASE_URL: z
    .url({ protocol: /^postgres(ql)?$/ })
    .refine(
      (url) => new URL(url).searchParams.get("sslmode") === "verify-full",
      {
        message: "must use sslmode=verify-full",
      },
    ),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export type Config = z.infer<typeof envSchema>;

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment (${problems}). Copy .env.example to .env.local and fill it in.`,
    );
  }
  cached = result.data;
  return cached;
}

/** The origin (scheme, host, port) the app is served from, e.g. `http://localhost:3100`. */
export function appOrigin(): string {
  return new URL(getConfig().BETTER_AUTH_URL).origin;
}

/** Tests only: forget the cached config so changed variables are read again. */
export function resetConfigForTests() {
  cached = undefined;
}
