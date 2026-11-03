import { parseUrlBodySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import { parseLeetCodeUrl } from "@/server/modules/extraProblems/extraProblems.service";

export const POST = withHandler(
  { body: parseUrlBodySchema },
  async ({ user, body }) => parseLeetCodeUrl(user.id, body.url),
);

