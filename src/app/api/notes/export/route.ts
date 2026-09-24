import { notesExportQuerySchema } from "@/domain/schemas";
import { withHandler } from "@/server/handler";
import { exportNotes } from "@/server/modules/notes/notes.service";

// A Markdown file download (§8.4). The file name is ASCII-only, so it needs no encoding.
export const GET = withHandler(
  { query: notesExportQuerySchema },
  async ({ user, query }) => {
    const { filename, markdown } = await exportNotes(user, query.categoryId);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
