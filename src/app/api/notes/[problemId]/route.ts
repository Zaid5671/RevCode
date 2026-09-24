import { problemIdParamsSchema, putNoteBodySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import {
  deleteNote,
  getNote,
  saveNote,
} from "@/server/modules/notes/notes.service";

export const GET = withHandler(
  { params: problemIdParamsSchema },
  async ({ user, params }) => getNote(user.id, params.problemId),
);

export const PUT = withHandler(
  { params: problemIdParamsSchema, body: putNoteBodySchema },
  async ({ user, params, body }) => saveNote(user.id, params.problemId, body),
);

export const DELETE = withHandler(
  { params: problemIdParamsSchema },
  async ({ user, params }) => {
    await deleteNote(user.id, params.problemId);
  },
);
