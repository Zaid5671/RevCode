"use client";

import { useEditExtraProblem } from "@/client/extraProblemMutations";
import { formatShortDate } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";
import type { RevisionNumber } from "@/domain/schedule";
import type { ExtraProblemEntry } from "@/domain/schemas";
import { DifficultyBadge, StatusLabel } from "./Badges";
import { RevisionCell } from "./RevisionCell";

export const EXTRA_COLUMNS = [
  "#",
  "Problem",
  "Diff",
  "Solved",
  "Conf",
  "R1",
  "R2",
  "R3",
  "Next",
  "Actions",
] as const;

export const EXTRA_COLUMN_CLASS: Record<(typeof EXTRA_COLUMNS)[number], string> = {
  "#": "w-12 px-4 text-center",
  Problem: "min-w-[240px] px-4",
  Diff: "w-20 px-3 text-center",
  Solved: "w-32 px-3",
  Conf: "w-16 px-3 text-center",
  R1: "w-28 px-3",
  R2: "w-28 px-3",
  R3: "w-28 px-3",
  Next: "w-36 px-3",
  Actions: "w-20 px-3 text-center",
};

const cell = (column: (typeof EXTRA_COLUMNS)[number]) =>
  `py-2.5 ${EXTRA_COLUMN_CLASS[column]}`;

export type ExtraRowActions = {
  edit: (item: ExtraProblemEntry) => void;
  markDone: (
    item: ExtraProblemEntry,
    revision: RevisionNumber,
    anchor: HTMLElement,
  ) => void;
};

export function ExtraProblemRow({
  item,
  index,
  today,
  actions,
}: {
  item: ExtraProblemEntry;
  index: number;
  today: CalendarDate;
  actions: ExtraRowActions;
}) {
  return (
    <tr
      onClick={(e) => {
        const target = e.target as Element;
        if (target.closest("a, button, select, input, label")) return;
        actions.edit(item);
      }}
      className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-hover"
    >
      {/* # Index */}
      <td className={`${cell("#")} font-mono text-xs text-ink-faint`}>
        {index}
      </td>

      {/* Problem Title & LeetCode link */}
      <td className={cell("Problem")}>
        <div className="flex items-center gap-1.5">
          <a
            href={item.leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-medium text-ink hover:text-accent hover:underline"
          >
            {item.title}
            <span aria-hidden="true" className="text-ink-faint text-[11px]">
              {" "}
              ↗
            </span>
          </a>
        </div>
      </td>

      {/* Difficulty */}
      <td className={cell("Diff")}>
        <DifficultyBadge difficulty={item.difficulty} />
      </td>

      {/* Solved On */}
      <td className={cell("Solved")}>
        <span className="whitespace-nowrap text-xs text-ink-soft tabular-nums">
          {formatShortDate(item.solvedOn, today)}
        </span>
      </td>

      {/* Confidence */}
      <td className={`${cell("Conf")} font-mono text-xs text-ink`}>
        <InlineConfidenceSelect
          id={item.id}
          confidence={item.confidence}
          title={item.title}
        />
      </td>

      {/* R1, R2, R3 */}
      {([0, 1, 2] as const).map((i) => (
        <td key={i} className={cell(`R${i + 1}` as "R1" | "R2" | "R3")}>
          <RevisionCell
            revision={item.revisions[i]}
            today={today}
            onMarkDone={(anchor) =>
              actions.markDone(item, item.revisions[i].number, anchor)
            }
          />
        </td>
      ))}

      {/* Next Status */}
      <td className={cell("Next")}>
        <StatusLabel
          revision={item.next ?? "complete"}
          today={today}
          relative
        />
      </td>

      {/* Actions */}
      <td className={cell("Actions")}>
        <button
          type="button"
          onClick={() => actions.edit(item)}
          className="rounded px-2 py-1 text-xs text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function InlineConfidenceSelect({
  id,
  confidence,
  title,
}: {
  id: string;
  confidence: Confidence;
  title: string;
}) {
  const save = useEditExtraProblem();
  const value =
    save.isPending && save.variables.body.confidence !== undefined
      ? save.variables.body.confidence
      : confidence;

  return (
    <select
      aria-label={`Confidence for ${title}`}
      value={value}
      disabled={save.isPending}
      onChange={(e) =>
        save.mutate({
          id,
          body: { confidence: Number(e.target.value) as Confidence },
        })
      }
      className="ghost-select rounded-control text-[13px] text-ink cursor-pointer"
    >
      {CONFIDENCES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

