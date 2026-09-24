// Revision gaps (PLAN.md §4.1): days from the previous event to each of the three revisions.
import { z } from "zod";

export const CONFIDENCES = [1, 2, 3] as const;
/** 1 Shaky · 2 Okay · 3 Solid */
export type Confidence = (typeof CONFIDENCES)[number];

export const MIN_GAP = 1;
export const MAX_GAP = 180;

const gapSchema = z.number().int().min(MIN_GAP).max(MAX_GAP);
const revisionGapsSchema = z.tuple([gapSchema, gapSchema, gapSchema]);

/** One `[r1, r2, r3]` entry per confidence level. Gaps need not increase. */
export const gapsSchema = z.strictObject({
  1: revisionGapsSchema,
  2: revisionGapsSchema,
  3: revisionGapsSchema,
});

export type RevisionGaps = z.infer<typeof revisionGapsSchema>;
export type Gaps = z.infer<typeof gapsSchema>;

export const DEFAULT_GAPS: Readonly<Gaps> = {
  1: [1, 4, 10],
  2: [3, 7, 14],
  3: [5, 14, 30],
};
