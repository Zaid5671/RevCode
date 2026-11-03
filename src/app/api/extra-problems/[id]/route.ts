import {
  extraProblemIdParamsSchema,
  patchExtraProblemBodySchema,
} from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  deleteExtraProblem,
  editExtraProblem,
} from "@/server/modules/extraProblems/extraProblems.service";

export const PATCH = withHandler(
  { params: extraProblemIdParamsSchema, body: patchExtraProblemBodySchema },
  async ({ user, params, body }) => editExtraProblem(user, params.id, body),
);

export const DELETE = withHandler(
  { params: extraProblemIdParamsSchema },
  async ({ user, params }) => {
    await deleteExtraProblem(user, params.id);
  },
);

