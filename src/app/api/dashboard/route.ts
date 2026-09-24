import { withHandler } from "@/server/handler";
import { getDashboard } from "@/server/modules/progress/progress.service";

export const GET = withHandler({}, async ({ user }) => getDashboard(user));
