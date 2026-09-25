import type { DashboardStatsView } from "@/client/dashboardView";

type Tile = {
  label: string;
  value: React.ReactNode;
  /** The number's colour when it isn't zero; a zero stays in ink-strong. */
  colour?: string;
  count?: number;
};

/**
 * Five numbers in one bordered strip (DESIGN-BRIEF.md §3). On phones Solved spans the
 * width and the other four form a 2 × 2 grid. `null` while loading or after an error:
 * each number shows a faint dash.
 */
export function StatsStrip({ stats }: { stats: DashboardStatsView | null }) {
  const tiles: Tile[] = [
    {
      label: stats ? `Solved · ${stats.solvedPercent}%` : "Solved",
      value: stats && (
        <>
          {stats.solved}
          <span className="text-base font-medium tracking-normal text-ink-faint">
            {" "}
            / {stats.total}
          </span>
        </>
      ),
    },
    {
      label: "Overdue",
      value: stats?.overdue,
      count: stats?.overdue,
      colour: "text-rose",
    },
    {
      label: "Due today",
      value: stats?.dueToday,
      count: stats?.dueToday,
      colour: "text-amber",
    },
    {
      label: "Next 7 days",
      value: stats?.next7Days,
      count: stats?.next7Days,
      colour: "text-blue",
    },
    {
      label: "Complete",
      value: stats?.complete,
      count: stats?.complete,
      colour: "text-green",
    },
  ];

  return (
    // The 1 px gap shows the line colour behind the tiles: hairlines between them.
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-5">
      {tiles.map((tile, i) => (
        <div
          // The list is fixed, and Solved's label changes once the data arrives.
          key={i}
          className={`flex min-w-0 flex-col-reverse bg-surface px-5 py-4 ${
            i === 0 ? "col-span-2 md:col-span-1" : ""
          }`}
        >
          <dt className="mt-1 truncate font-mono text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            {tile.label}
          </dt>
          <dd
            className={`text-[28px] leading-tight font-semibold tracking-tight whitespace-nowrap ${
              stats === null
                ? "text-ink-ghost"
                : tile.count && tile.colour
                  ? tile.colour
                  : "text-ink-strong"
            }`}
          >
            {stats === null ? "–" : tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
