import { putGapsBodySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  getGaps,
  replaceGaps,
  resetGaps,
} from "@/server/modules/gaps/gaps.service";

export const GET = withHandler({}, async ({ user }) => getGaps(user.id));

export const PUT = withHandler(
  { body: putGapsBodySchema },
  async ({ user, body }) => replaceGaps(user.id, body.gaps),
);

export const DELETE = withHandler({}, async ({ user }) => resetGaps(user.id));
