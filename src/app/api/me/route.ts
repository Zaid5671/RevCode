import { updateMeBodySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import { getMe, setTimezone } from "@/server/modules/account/account.service";

export const GET = withHandler({}, async ({ user }) => getMe(user));

export const PATCH = withHandler(
  { body: updateMeBodySchema },
  async ({ user, body }) => setTimezone(user, body.timezone),
);
