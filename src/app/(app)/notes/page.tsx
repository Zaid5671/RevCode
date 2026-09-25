import { requireSession } from "@/server/session";

export const metadata = { title: "Notes · RevCode" };

// Placeholder so the header link works; Phase 8 builds the Notes section here.
export default async function NotesPage() {
  await requireSession();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink-strong">
        Notes
      </h1>
      <p className="mt-2 text-ink-soft">
        Your notes, by category, will appear here.
      </p>
    </>
  );
}
