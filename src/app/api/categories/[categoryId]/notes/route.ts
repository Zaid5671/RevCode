import { categoryIdParamsSchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import { listCategoryNotes } from "@/server/modules/notes/notes.service";

export const GET = withHandler(
  { params: categoryIdParamsSchema },
  async ({ user, params }) => listCategoryNotes(user.id, params.categoryId),
);
