import { putRevisionBodySchema, revisionParamsSchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  completeRevision,
  undoRevision,
} from "@/server/modules/progress/progress.service";

export const PUT = withHandler(
  { params: revisionParamsSchema, body: putRevisionBodySchema },
  async ({ user, params, body }) =>
    completeRevision(user, params.problemId, params.n, body.completedOn),
);

export const DELETE = withHandler(
  { params: revisionParamsSchema },
  async ({ user, params }) => undoRevision(user, params.problemId, params.n),
);
