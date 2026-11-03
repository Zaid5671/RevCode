import {
  createExtraProblemBodySchema,
  extraProblemsQuerySchema,
} from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  createExtraProblem,
  listExtraProblems,
} from "@/server/modules/extraProblems/extraProblems.service";

export const GET = withHandler(
  { query: extraProblemsQuerySchema },
  async ({ user, query }) => listExtraProblems(user, query),
);

export const POST = withHandler(
  { body: createExtraProblemBodySchema },
  async ({ user, body }) => createExtraProblem(user, body),
);

