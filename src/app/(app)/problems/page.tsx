import { Suspense } from "react";
import { ProblemTable } from "@/components/ProblemTable";
import { requireSession } from "@/server/session";

export const metadata = { title: "Problems · RevCode" };

export default async function ProblemsPage() {
  await requireSession();
  return (
    <>
      <h1 className="mb-4 font-serif text-2xl font-semibold">Problems</h1>
      {/* ProblemTable reads the filters from the URL (useSearchParams). */}
      <Suspense
        fallback={
          <p className="text-[13.5px] text-ink-soft">Loading problems…</p>
        }
      >
        <ProblemTable />
      </Suspense>
    </>
  );
}
