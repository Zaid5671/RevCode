import { withHandler } from "@/server/handler";
import { listProgress } from "@/server/modules/progress/progress.service";

export const GET = withHandler({}, async ({ user }) => listProgress(user));
