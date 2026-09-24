// Better Auth's own endpoints: Google sign-in, callback, session, sign-out (PLAN.md §6).
// The one route not wrapped in withHandler(): Better Auth does its own checks.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

export const { GET, POST } = toNextJsHandler(auth);
