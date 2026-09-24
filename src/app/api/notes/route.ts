import { withHandler } from "@/server/handler";
import { listNotes } from "@/server/modules/notes/notes.service";

export const GET = withHandler({}, async ({ user }) => listNotes(user.id));
