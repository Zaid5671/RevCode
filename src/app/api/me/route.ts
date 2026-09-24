import { withHandler } from "@/server/handler";
import { getMe } from "@/server/modules/account/account.service";

export const GET = withHandler({}, async ({ user }) => getMe(user));
