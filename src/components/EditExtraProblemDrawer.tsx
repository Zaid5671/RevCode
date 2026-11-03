"use client";

import { useId, useState } from "react";
import {
  useCompleteExtraRevision,
  useDeleteExtraProblem,
  useEditExtraProblem,
  useUndoExtraRevision,
} from "@/client/extraProblemMutations";
import { formatShortDate } from "@/client/format";
import type { CalendarDate } from "@/domain/calendarDate";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";
import type { Revision, RevisionNumber } from "@/domain/schedule";
import {
  DIFFICULTIES,
  type Difficulty,
  type ExtraProblemEntry,
} from "@/domain/schemas";
import { DifficultyBadge, StatusLabel } from "./Badges";
import {
  DANGER_BUTTON,
  LINK_BUTTON,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "./buttonStyles";
import { CONFIDENCE_NAMES } from "./ConfidencePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import { DateField, dateProblem } from "./DateField";
import { CloseButton, Dialog } from "./Dialog";

export function EditExtraProblemDrawer({
  item,
  today,
  onClose,
}: {
  item: ExtraProblemEntry;
  today: CalendarDate;
  onClose: () => void;
}) {
  const titleId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteExtraProblem();

  const latestDone = item.revisions.findLast((r) => r.status === "done");

  return (
    <Dialog placement="drawer" onClose={onClose} labelledBy={titleId}>
      <div className="flex min-h-full flex-col gap-5 p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-[17px] leading-snug font-semibold text-ink-strong"
            >
              <a
                href={item.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {item.title}
                <span aria-hidden="true" className="text-ink-faint">
                  {" "}
                  ↗
                </span>
              </a>
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <DifficultyBadge difficulty={item.difficulty} />
              <span className="text-xs text-ink-faint font-mono">
                {item.leetcodeSlug}
              </span>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </header>

        {/* Edit Title & Difficulty */}
        <EditTitleAndDifficulty item={item} />

        {/* Solved on */}
        <SolvedOnField
          problemId={item.id}
          solvedOn={item.solvedOn}
          today={today}
        />

        {/* Confidence */}
        <div className="border-t border-line-soft pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-soft">Confidence</span>
            <ConfidenceSelector
              problemId={item.id}
              confidence={item.confidence}
            />
          </div>
        </div>

        {/* Revisions R1 - R3 */}
        <div className="border-t border-line-soft pt-4">
          <h3 className="mb-2 text-xs font-medium text-ink-soft">
            Revisions
          </h3>
          <ul className="flex flex-col gap-2">
            {item.revisions.map((revision, index) => {
              const prevRev = index > 0 ? item.revisions[index - 1] : undefined;
              const previousEvent = prevRev ? prevRev.date : item.solvedOn;
              return (
                <RevisionLine
                  key={revision.number}
                  problemId={item.id}
                  revision={revision}
                  today={today}
                  min={previousEvent}
                  canUndo={latestDone?.number === revision.number}
                />
              );
            })}
          </ul>
        </div>

        {/* Delete button */}
        <div className="mt-auto border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-[13px] text-rose underline underline-offset-2 hover:no-underline"
          >
            Remove from Extra Problems
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          message={`Are you sure you want to remove "${item.title}"? This will permanently delete this problem and its revision history from your Extra Problems tracker.`}
          confirmLabel={deleteMutation.isPending ? "Removing…" : "Remove problem"}
          onConfirm={() => {
            deleteMutation.mutate(
              { id: item.id },
              {
                onSuccess: () => {
                  setConfirmingDelete(false);
                  onClose();
                },
              },
            );
          }}
          onCancel={() => setConfirmingDelete(false)}
          pending={deleteMutation.isPending}
          error={deleteMutation.isError ? deleteMutation.error.message : null}
        />
      )}
    </Dialog>
  );
}

function EditTitleAndDifficulty({ item }: { item: ExtraProblemEntry }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [difficulty, setDifficulty] = useState<Difficulty>(item.difficulty);
  const editMutation = useEditExtraProblem();

  if (!editing) {
    return (
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>Details</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={LINK_BUTTON}
        >
          Edit name & difficulty
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-control border border-line bg-surface-2 p-3 text-xs"
      onSubmit={(e) => {
        e.preventDefault();
        editMutation.mutate(
          { id: item.id, body: { title, difficulty } },
          { onSuccess: () => setEditing(false) },
        );
      }}
    >
      <div>
        <label className="mb-1 block font-medium text-ink-soft">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded border border-line bg-surface px-2 py-1 text-ink"
        />
      </div>
      <div>
        <label className="mb-1 block font-medium text-ink-soft">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="rounded border border-line bg-surface px-2 py-1 text-ink"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      {editMutation.isError && (
        <p className="text-rose">{editMutation.error.message}</p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setTitle(item.title);
            setDifficulty(item.difficulty);
            setEditing(false);
          }}
          className={SECONDARY_BUTTON}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={editMutation.isPending || !title.trim()}
          className={PRIMARY_BUTTON}
        >
          {editMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function SolvedOnField({
  problemId,
  solvedOn,
  today,
}: {
  problemId: string;
  solvedOn: CalendarDate;
  today: CalendarDate;
}) {
  const [value, setValue] = useState(solvedOn);
  const save = useEditExtraProblem();
  const changed = value !== solvedOn;
  const problemWithDate = changed ? dateProblem(value, { today }) : null;

  return (
    <form
      className="flex flex-wrap items-start gap-2 border-t border-line-soft pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ id: problemId, body: { solvedOn: value } });
      }}
    >
      <DateField
        label="Solved on"
        value={value}
        max={today}
        onChange={(next) => {
          save.reset();
          setValue(next);
        }}
        error={problemWithDate ?? (save.isError ? save.error.message : null)}
      />
      {changed && (
        <div className="mt-1 flex gap-2">
          <button
            type="submit"
            disabled={problemWithDate !== null || save.isPending}
            className={PRIMARY_BUTTON}
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              save.reset();
              setValue(solvedOn);
            }}
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}

function ConfidenceSelector({
  problemId,
  confidence,
}: {
  problemId: string;
  confidence: Confidence;
}) {
  const save = useEditExtraProblem();
  return (
    <div className="flex items-center gap-2">
      <select
        value={confidence}
        disabled={save.isPending}
        onChange={(e) =>
          save.mutate({
            id: problemId,
            body: { confidence: Number(e.target.value) as Confidence },
          })
        }
        className="rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
      >
        {CONFIDENCES.map((c) => (
          <option key={c} value={c}>
            {c} · {CONFIDENCE_NAMES[c]}
          </option>
        ))}
      </select>
      {save.isError && (
        <span className="text-xs text-rose">{save.error.message}</span>
      )}
    </div>
  );
}

function RevisionLine({
  problemId,
  revision,
  today,
  min,
  canUndo,
}: {
  problemId: string;
  revision: Revision;
  today: CalendarDate;
  min: CalendarDate;
  canUndo: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const completeMutation = useCompleteExtraRevision();
  const undoMutation = useUndoExtraRevision();

  const label = `R${revision.number}`;
  const isDone = revision.status === "done";
  const isPendingNext = revision.status !== "done" && revision.status !== "projected";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-soft bg-surface px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium text-ink-soft">{label}</span>
        {isDone ? (
          <span className="font-medium text-green">
            ✓ {formatShortDate(revision.date, today)}
          </span>
        ) : (
          <StatusLabel revision={revision} today={today} />
        )}
      </div>

      <div className="flex items-center gap-2">
        {isDone && canUndo && (
          <button
            type="button"
            disabled={undoMutation.isPending}
            onClick={() =>
              undoMutation.mutate({
                id: problemId,
                revision: revision.number,
              })
            }
            className={LINK_BUTTON}
          >
            {undoMutation.isPending ? "Undoing…" : "Undo"}
          </button>
        )}

        {isPendingNext && !editing && (
          <button
            type="button"
            onClick={() => {
              setDate(today);
              setEditing(true);
            }}
            className={PRIMARY_BUTTON}
          >
            Mark Done
          </button>
        )}

        {editing && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!date) return;
              completeMutation.mutate(
                {
                  id: problemId,
                  revision: revision.number,
                  completedOn: date,
                },
                {
                  onSuccess: () => setEditing(false),
                },
              );
            }}
          >
            <DateField
              label=""
              value={date ?? today}
              onChange={setDate}
              min={min}
              max={today}
            />
            <button
              type="submit"
              disabled={completeMutation.isPending}
              className={PRIMARY_BUTTON}
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={SECONDARY_BUTTON}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

