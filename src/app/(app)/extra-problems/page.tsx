import { Suspense } from "react";
import { ExtraProblemTable } from "@/components/ExtraProblemTable";
import { requireSession } from "@/server/session";

export const metadata = { title: "Extra Problems · RevCode" };

export default async function ExtraProblemsPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">
          Extra Problems
        </h1>
        <p className="text-xs text-ink-soft">
          Track and revise additional LeetCode problems outside the NeetCode 250 with spaced repetition.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-ink-soft">Loading extra problems…</p>
        }
      >
        <ExtraProblemTable />
      </Suspense>
    </div>
  );
}

