import { pool } from "@/server/db";
import { withHandler } from "@/server/handler";
import { getCatalog } from "@/server/modules/catalog/catalog.repository";

// The catalog changes only with a deploy. `private`: this route needs a session, so
// shared caches must never keep it (§7).
export const GET = withHandler({}, async () =>
  Response.json(await getCatalog(pool), {
    headers: { "Cache-Control": "private, max-age=86400" },
  }),
);
