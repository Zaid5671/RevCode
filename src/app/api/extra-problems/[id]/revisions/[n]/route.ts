import {
  completeExtraRevisionBodySchema,
  extraProblemRevisionParamsSchema,
} from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  completeRevision,
  undoRevision,
} from "@/server/modules/extraProblems/extraProblems.service";

export const PUT = withHandler(
  {
    params: extraProblemRevisionParamsSchema,
    body: completeExtraRevisionBodySchema,
  },
  async ({ user, params, body }) =>
    completeRevision(user, params.id, params.n, body),
);

export const DELETE = withHandler(
  { params: extraProblemRevisionParamsSchema },
  async ({ user, params }) => undoRevision(user, params.id, params.n),
);

