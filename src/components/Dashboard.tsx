"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildDashboard } from "@/client/dashboardView";
import { formatLongDate } from "@/client/format";
import { useCatalog, useDashboard } from "@/client/queries";
import { ReminderCard, ReminderPanel } from "./ReminderPanel";
import { StatsStrip } from "./StatsStrip";

/**
 * The dashboard body (PLAN.md §8.2, DESIGN-BRIEF.md §3): the title with the user's today,
 * the stats strip, then "Revise now" and "Coming up".
 */
export function Dashboard() {
  const dashboard = useDashboard();
  const catalog = useCatalog();
  const view = useMemo(
    () =>
      dashboard.data && catalog.data
        ? buildDashboard(dashboard.data, catalog.data)
        : null,
    [dashboard.data, catalog.data],
  );
  const queries = [dashboard, catalog];
  const failed = queries.find((q) => q.isError);

  let body: React.ReactNode;
  if (failed) {
    body = (
      <p
        role="alert"
        className="rounded-control border border-rose-edge bg-rose-bg px-3.5 py-2.5 text-[13px] text-rose"
      >
        Couldn&apos;t load your reminders. {failed.error?.message}{" "}
        <button
          type="button"
          onClick={() => queries.forEach((q) => q.isError && q.refetch())}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Try again
        </button>
      </p>
    );
  } else if (!view) {
    body = <Loading />;
  } else if (view.stats.solved === 0) {
    body = (
      <p className="rounded-control border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-soft">
        Mark a problem solved on the{" "}
        <Link
          href="/problems"
          className="font-semibold text-accent hover:text-accent-hover hover:underline"
        >
          Problems
        </Link>{" "}
        page to start your revision schedule.
      </p>
    );
  } else {
    body = <ReminderPanel view={view} />;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">
          Dashboard
        </h1>
        {view && (
          <p className="font-mono text-xs font-medium text-ink-faint">
            <span className="sr-only">Today is </span>
            {formatLongDate(view.today, { weekday: true })}
          </p>
        )}
      </div>
      <StatsStrip stats={failed ? null : (view?.stats ?? null)} />
      <div className="mt-8">{body}</div>
    </>
  );
}

/** Plain placeholder lines in the two cards; no animation (DESIGN-BRIEF.md §1). */
function Loading() {
  const lines = (
    <div aria-hidden="true">
      {["w-[46%]", "w-[34%]", "w-[40%]"].map((width) => (
        <div
          key={width}
          className="flex h-[52px] items-center gap-4 border-t border-line-soft px-4 first:border-t-0"
        >
          <span className={`h-2.5 rounded bg-surface-3 ${width}`} />
          <span className="h-2.5 w-6 rounded bg-surface-3" />
          <span className="h-2.5 w-14 rounded bg-surface-3" />
        </div>
      ))}
    </div>
  );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <p role="status" className="sr-only">
        Loading your reminders…
      </p>
      <ReminderCard title="Revise now">{lines}</ReminderCard>
      <ReminderCard title="Coming up">{lines}</ReminderCard>
    </div>
  );
}
