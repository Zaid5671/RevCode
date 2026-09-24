import { noteSearchQuerySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import { searchNotes } from "@/server/modules/notes/notes.service";

export const GET = withHandler(
  { query: noteSearchQuerySchema },
  async ({ user, query }) => searchNotes(user.id, query.q),
);
