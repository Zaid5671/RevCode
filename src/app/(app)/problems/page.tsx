import { Suspense } from "react";
import { ProblemTable } from "@/components/ProblemTable";
import { requireSession } from "@/server/session";

export const metadata = { title: "Problems · RevCode" };

export default async function ProblemsPage() {
  await requireSession();
  return (
    // Narrower than the other pages, so the Problem column doesn't stretch into a wide
    // gap on big screens (DESIGN-BRIEF.md §4).
    <div className="mx-auto max-w-[1280px]">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-ink-strong">
        Problems
      </h1>
      {/* ProblemTable reads the filters from the URL (useSearchParams). */}
      <Suspense
        fallback={<p className="text-sm text-ink-soft">Loading problems…</p>}
      >
        <ProblemTable />
      </Suspense>
    </div>
  );
}
