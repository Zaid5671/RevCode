import { pingDatabase } from "@/server/db";
import { AppError, errorResponse } from "@/server/errors";
import { withHandler } from "@/server/handler";

// Reports whether the app can reach its database. Signed in only (Phase 9 security
// review): a public route that queries the database would let anyone keep Neon awake.
export const GET = withHandler({}, async () => {
  try {
    await pingDatabase();
    return { ok: true };
  } catch (error) {
    console.error("Health check failed:", (error as Error).message);
    // §7 asks for 503 here, not INTERNAL_ERROR's usual 500: the app itself is fine,
    // but a service it depends on is down.
    return errorResponse(
      new AppError("INTERNAL_ERROR", "The database is unreachable."),
      503,
    );
  }
});
