import { withHandler } from "@/server/handler";
import { deleteAccount } from "@/server/modules/account/account.service";

export const DELETE = withHandler({}, async ({ request }) => {
  await deleteAccount(request.headers);
});
