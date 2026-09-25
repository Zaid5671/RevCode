import { Suspense } from "react";
import { NotesSection } from "@/components/NotesSection";
import { requireSession } from "@/server/session";

export const metadata = { title: "Notes · RevCode" };

/** One category's notes (PLAN.md §8.4). An unknown id shows a message, not a crash. */
export default async function CategoryNotesPage({
  params,
}: PageProps<"/notes/[categoryId]">) {
  await requireSession();
  const { categoryId } = await params;
  return (
    // NotesSection reads the search from the URL (useSearchParams).
    <Suspense
      fallback={<p className="text-sm text-ink-soft">Loading notes…</p>}
    >
      <NotesSection key={categoryId} categoryParam={categoryId} />
    </Suspense>
  );
}
