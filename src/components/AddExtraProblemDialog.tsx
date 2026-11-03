"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  useCreateExtraProblem,
  useParseLeetCodeUrl,
} from "@/client/extraProblemMutations";
import { formatRelativeDue } from "@/client/format";
import { useGaps } from "@/client/queries";
import { addDays, type CalendarDate } from "@/domain/calendarDate";
import { CONFIDENCES, type Confidence } from "@/domain/gaps";
import {
  DIFFICULTIES,
  parseLeetCodeSlug,
  type Difficulty,
  type ParseUrlResponse,
} from "@/domain/schemas";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./buttonStyles";
import { ConfidencePicker } from "./ConfidencePicker";
import { DateField, FieldError, dateProblem } from "./DateField";
import { CloseButton, Dialog } from "./Dialog";

export function AddExtraProblemDialog({
  today,
  onClose,
}: {
  today: CalendarDate;
  onClose: () => void;
}) {
  const titleId = useId();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [solvedOn, setSolvedOn] = useState(today);
  const [confidence, setConfidence] = useState<Confidence>(2);
  const [urlChecked, setUrlChecked] = useState(false);
  const [parseResult, setParseResult] = useState<ParseUrlResponse | null>(null);

  const parseMutation = useParseLeetCodeUrl();
  const createMutation = useCreateExtraProblem();
  const gaps = useGaps();

  const problemWithDate = dateProblem(solvedOn, { today });

  const hints =
    gaps.data && !problemWithDate
      ? (Object.fromEntries(
          CONFIDENCES.map((c) => [
            c,
            formatRelativeDue(addDays(solvedOn, gaps.data.gaps[c][0]), today),
          ]),
        ) as Record<Confidence, string>)
      : null;

  function handleCheckUrl() {
    if (!url.trim()) return;
    parseMutation.mutate(
      { url: url.trim() },
      {
        onSuccess: (data) => {
          setParseResult(data);
          setUrlChecked(true);
          setTitle(data.title);
          if (data.difficulty) {
            setDifficulty(data.difficulty);
          }
        },
      },
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || !title.trim() || problemWithDate) return;

    createMutation.mutate(
      {
        url: url.trim(),
        title: title.trim(),
        difficulty,
        solvedOn,
        confidence,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  const slug = parseLeetCodeSlug(url);
  const isSubmitDisabled =
    !url.trim() ||
    !title.trim() ||
    Boolean(problemWithDate) ||
    createMutation.isPending ||
    parseMutation.isPending ||
    Boolean(parseResult?.isAlreadyInExtra);

  return (
    <Dialog onClose={onClose} labelledBy={titleId}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <h2 id={titleId} className="text-[17px] font-semibold text-ink-strong">
            Add LeetCode Problem
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* URL Input */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            LeetCode Problem URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="https://leetcode.com/problems/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlChecked(false);
                setParseResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !urlChecked) {
                  e.preventDefault();
                  handleCheckUrl();
                }
              }}
              className="flex-1 rounded-control border border-line bg-surface px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCheckUrl}
              disabled={!url.trim() || parseMutation.isPending}
              className={SECONDARY_BUTTON}
            >
              {parseMutation.isPending ? "Checking…" : "Lookup"}
            </button>
          </div>
          {parseMutation.isError && (
            <p className="mt-1 text-xs text-rose">
              {parseMutation.error.message}
            </p>
          )}
        </div>

        {/* NeetCode 250 Duplicate Warning Banner */}
        {parseResult?.isDuplicateInCatalog && (
          <div className="rounded-control border border-amber-edge bg-amber-bg p-3 text-xs text-amber">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong className="font-semibold">
                  Already in NeetCode 250!
                </strong>
                <p className="mt-0.5 text-ink-soft">
                  &ldquo;{parseResult.catalogProblem?.title ?? parseResult.title}&rdquo; is
                  already in your NeetCode 250 catalog.
                </p>
                <div className="mt-2">
                  <Link
                    href={`/problems?q=${encodeURIComponent(parseResult.slug)}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded border border-amber-edge px-2 py-0.5 font-medium text-amber hover:bg-surface"
                  >
                    View in NeetCode 250 ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Already added to Extra Problems Notice */}
        {parseResult?.isAlreadyInExtra && (
          <div className="rounded-control border border-blue/40 bg-surface-2 p-3 text-xs text-blue">
            <strong className="font-semibold">Already in Extra Problems</strong>
            <p className="mt-0.5 text-ink-soft">
              You have already tracked this problem in your Extra Problems table.
            </p>
          </div>
        )}

        {/* Problem Title & Difficulty */}
        {(urlChecked || title) && !parseResult?.isAlreadyInExtra && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Problem Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-control border border-line bg-surface px-3 py-1.5 text-[13px] text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as Difficulty)
                  }
                  className="w-full rounded-control border border-line bg-surface px-2 py-1.5 text-[13px] text-ink focus:border-accent focus:outline-none"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Solved On Date */}
            <div>
              <DateField
                label="Solved on"
                value={solvedOn}
                onChange={setSolvedOn}
                error={problemWithDate}
              />
            </div>

            {/* Confidence Selection */}
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Confidence
              </label>
              <ConfidencePicker
                onPick={setConfidence}
                hints={hints}
                disabled={createMutation.isPending}
                pending={confidence}
              />
            </div>
          </>
        )}

        {createMutation.isError && (
          <FieldError>{createMutation.error.message}</FieldError>
        )}

        <div className="mt-2 flex justify-end gap-2 border-t border-line-soft pt-3">
          <button
            type="button"
            onClick={onClose}
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={PRIMARY_BUTTON}
          >
            {createMutation.isPending ? "Adding…" : "Add to Tracker"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
