import {
  patchProgressBodySchema,
  problemIdParamsSchema,
  putProgressBodySchema,
} from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  editSolve,
  markSolved,
  unmarkSolved,
} from "@/server/modules/progress/progress.service";

export const PUT = withHandler(
  { params: problemIdParamsSchema, body: putProgressBodySchema },
  async ({ user, params, body }) => markSolved(user, params.problemId, body),
);

export const PATCH = withHandler(
  { params: problemIdParamsSchema, body: patchProgressBodySchema },
  async ({ user, params, body }) => editSolve(user, params.problemId, body),
);

export const DELETE = withHandler(
  { params: problemIdParamsSchema },
  async ({ user, params }) => {
    await unmarkSolved(user, params.problemId);
  },
);
