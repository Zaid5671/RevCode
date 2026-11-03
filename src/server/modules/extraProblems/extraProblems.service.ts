import {
  compare,
  userToday,
  type CalendarDate,
} from "@/domain/calendarDate";
import { computeSchedule, type RevisionNumber } from "@/domain/schedule";
import {
  leetcodeUrl,
  parseLeetCodeSlug,
  slugToTitle,
  type CompleteExtraRevisionBody,
  type CreateExtraProblemBody,
  type Difficulty,
  type ExtraProblemEntry,
  type ExtraProblemListResponse,
  type ExtraProblemsQuery,
  type ParseUrlResponse,
  type PatchExtraProblemBody,
} from "@/domain/schemas";
import { validateTimeline } from "@/domain/timeline";
import type { ZonedUser } from "@/server/auth";
import { pool, withTransaction } from "@/server/db";
import { AppError } from "@/server/errors";
import { loadGaps } from "../gaps/gaps.service";
import {
  deleteExtraProblem as deleteRow,
  findCatalogProblemBySlug,
  findExtraProblemById,
  findExtraProblemBySlug,
  insertExtraProblem,
  listAllExtraProblemRows,
  lockExtraProblemById,
  updateExtraProblem,
  type ExtraProblemRow,
} from "./extraProblems.repository";

type LeetCodeGqlResponse = {
  data?: {
    question?: {
      questionId?: string;
      title?: string;
      difficulty?: string;
      isPaidOnly?: boolean;
    } | null;
  };
};

/**
 * Parses a LeetCode URL, checks for duplicates in the NeetCode 250 catalog and
 * user's extra problems, and fetches title & difficulty from LeetCode.
 */
export async function parseLeetCodeUrl(
  userId: string,
  url: string,
): Promise<ParseUrlResponse> {
  const slug = parseLeetCodeSlug(url);
  if (!slug) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please enter a valid LeetCode URL (e.g., https://leetcode.com/problems/two-sum/).",
    );
  }

  // 1. Check if problem is already in the NeetCode 250 catalog
  const catalogMatch = await findCatalogProblemBySlug(pool, slug);

  // 2. Check if already added by this user
  const extraMatch = await findExtraProblemBySlug(pool, userId, slug);

  // 3. Attempt to fetch details from LeetCode GraphQL
  let title = slugToTitle(slug);
  let difficulty: Difficulty | null = null;

  try {
    const gqlQuery = `query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        difficulty
        isPaidOnly
      }
    }`;

    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify({ query: gqlQuery, variables: { titleSlug: slug } }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = (await res.json()) as LeetCodeGqlResponse;
      if (data.data?.question?.title) {
        title = data.data.question.title;
      }
      const rawDiff = data.data?.question?.difficulty?.toUpperCase();
      if (rawDiff === "EASY" || rawDiff === "MEDIUM" || rawDiff === "HARD") {
        difficulty = rawDiff;
      }
    }
  } catch {
    // If LeetCode fetch fails (timeout or network), fall back gracefully to derived title and catalog/user difficulty
  }

  if (!difficulty && catalogMatch) {
    difficulty = catalogMatch.difficulty;
    title = catalogMatch.title;
  }

  return {
    slug,
    title,
    difficulty,
    isDuplicateInCatalog: Boolean(catalogMatch),
    catalogProblem: catalogMatch
      ? {
          id: catalogMatch.id,
          title: catalogMatch.title,
          difficulty: catalogMatch.difficulty,
        }
      : null,
    isAlreadyInExtra: Boolean(extraMatch),
  };
}

/**
 * Creates a new extra problem for the user.
 */
export async function createExtraProblem(
  user: ZonedUser,
  body: CreateExtraProblemBody,
): Promise<ExtraProblemEntry> {
  const slug = parseLeetCodeSlug(body.url);
  if (!slug) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid LeetCode URL or slug.",
    );
  }

  const today = userToday(user.timezone);
  const existing = await findExtraProblemBySlug(pool, user.id, slug);
  if (existing) {
    throw new AppError(
      "CONFLICT",
      `"${existing.title}" is already in your Extra Problems list.`,
    );
  }

  const timelineViolation = validateTimeline(
    { solvedOn: body.solvedOn, completed: [null, null, null] },
    { previous: null, today },
  );
  if (timelineViolation) {
    throw new AppError("TIMELINE_CONFLICT", timelineViolation.message, {
      rule: timelineViolation.rule,
      revision: timelineViolation.revision,
    });
  }

  const row = await insertExtraProblem(pool, user.id, {
    title: body.title,
    leetcodeSlug: slug,
    difficulty: body.difficulty,
    solvedOn: body.solvedOn,
    confidence: body.confidence,
  });

  const gaps = await loadGaps(pool, user.id);
  return toEntry(row, gaps, today);
}

/**
 * Lists extra problems with filtering, sorting, and pagination.
 */
export async function listExtraProblems(
  user: ZonedUser,
  query: ExtraProblemsQuery,
): Promise<ExtraProblemListResponse> {
  const today = userToday(user.timezone);
  const [rows, gaps] = await Promise.all([
    listAllExtraProblemRows(pool, user.id),
    loadGaps(pool, user.id),
  ]);

  let entries = rows.map((row) => toEntry(row, gaps, today));

  // 1. Search filter (q)
  if (query.q && query.q.trim() !== "") {
    const term = query.q.trim().toLowerCase();
    entries = entries.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.leetcodeSlug.toLowerCase().includes(term),
    );
  }

  // 2. Difficulty filter
  if (query.difficulty) {
    entries = entries.filter((e) => e.difficulty === query.difficulty);
  }

  // 3. Status filter
  if (query.status && query.status !== "all") {
    entries = entries.filter((e) => {
      if (query.status === "complete") return e.isComplete;
      if (!e.next) return false;
      if (query.status === "overdue") return e.next.status === "overdue";
      if (query.status === "today") return e.next.status === "due_today";
      if (query.status === "tomorrow") return e.next.status === "due_tomorrow";
      if (query.status === "week") return e.next.status === "next_7_days";
      if (query.status === "later") return e.next.status === "later";
      return true;
    });
  }

  // 4. Sort
  const sort = query.sort ?? "newest";
  if (sort === "next") {
    entries.sort((a, b) => {
      if (!a.next && !b.next) return 0;
      if (!a.next) return 1;
      if (!b.next) return -1;
      return compare(a.next.date, b.next.date);
    });
  } else if (sort === "solved") {
    entries.sort((a, b) => compare(b.solvedOn, a.solvedOn));
  } else {
    // default: newest first (by created_at or solve date)
    entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const total = entries.length;
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const items = entries.slice(offset, offset + limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    today,
  };
}

/**
 * Updates an extra problem's solve date, confidence, title, or difficulty.
 */
export async function editExtraProblem(
  user: ZonedUser,
  id: string,
  body: PatchExtraProblemBody,
): Promise<ExtraProblemEntry> {
  const today = userToday(user.timezone);
  return withTransaction(async (client) => {
    const row = await lockExtraProblemById(client, user.id, id);
    if (!row) {
      throw new AppError("NOT_FOUND", "Extra problem not found.");
    }

    const currentCompleted: [
      CalendarDate | null,
      CalendarDate | null,
      CalendarDate | null,
    ] = [
      row.revision1_completed_on,
      row.revision2_completed_on,
      row.revision3_completed_on,
    ];

    const nextSolvedOn = body.solvedOn ?? row.solved_on;
    const nextTimeline = {
      solvedOn: nextSolvedOn,
      completed: currentCompleted,
    };

    const violation = validateTimeline(nextTimeline, {
      previous: { solvedOn: row.solved_on, completed: currentCompleted },
      today,
    });

    if (violation) {
      throw new AppError("TIMELINE_CONFLICT", violation.message, {
        rule: violation.rule,
        revision: violation.revision,
      });
    }

    const updated = await updateExtraProblem(client, user.id, id, {
      title: body.title,
      difficulty: body.difficulty,
      solvedOn: body.solvedOn,
      confidence: body.confidence,
    });

    const gaps = await loadGaps(client, user.id);
    return toEntry(updated, gaps, today);
  });
}

/**
 * Marks revision n completed for an extra problem.
 */
export async function completeRevision(
  user: ZonedUser,
  id: string,
  n: RevisionNumber,
  body: CompleteExtraRevisionBody,
): Promise<ExtraProblemEntry> {
  const today = userToday(user.timezone);
  const completedOn = body.completedOn ?? today;

  return withTransaction(async (client) => {
    const row = await lockExtraProblemById(client, user.id, id);
    if (!row) {
      throw new AppError("NOT_FOUND", "Extra problem not found.");
    }

    const completed: [
      CalendarDate | null,
      CalendarDate | null,
      CalendarDate | null,
    ] = [
      row.revision1_completed_on,
      row.revision2_completed_on,
      row.revision3_completed_on,
    ];

    completed[n - 1] = completedOn;

    const violation = validateTimeline(
      { solvedOn: row.solved_on, completed },
      {
        previous: {
          solvedOn: row.solved_on,
          completed: [
            row.revision1_completed_on,
            row.revision2_completed_on,
            row.revision3_completed_on,
          ],
        },
        today,
      },
    );

    if (violation) {
      throw new AppError("TIMELINE_CONFLICT", violation.message, {
        rule: violation.rule,
        revision: violation.revision,
      });
    }

    const updated = await updateExtraProblem(client, user.id, id, {
      completed,
    });

    const gaps = await loadGaps(client, user.id);
    return toEntry(updated, gaps, today);
  });
}

/**
 * Undoes completion of revision n for an extra problem.
 */
export async function undoRevision(
  user: ZonedUser,
  id: string,
  n: RevisionNumber,
): Promise<ExtraProblemEntry> {
  const today = userToday(user.timezone);

  return withTransaction(async (client) => {
    const row = await lockExtraProblemById(client, user.id, id);
    if (!row) {
      throw new AppError("NOT_FOUND", "Extra problem not found.");
    }

    const completed: [
      CalendarDate | null,
      CalendarDate | null,
      CalendarDate | null,
    ] = [
      row.revision1_completed_on,
      row.revision2_completed_on,
      row.revision3_completed_on,
    ];

    if (completed[n - 1] === null) {
      throw new AppError(
        "TIMELINE_CONFLICT",
        `Revision ${n} isn't done, so there is nothing to undo.`,
        { rule: "not_done", revision: n },
      );
    }

    completed[n - 1] = null;

    const violation = validateTimeline(
      { solvedOn: row.solved_on, completed },
      {
        previous: {
          solvedOn: row.solved_on,
          completed: [
            row.revision1_completed_on,
            row.revision2_completed_on,
            row.revision3_completed_on,
          ],
        },
        today,
      },
    );

    if (violation) {
      throw new AppError("TIMELINE_CONFLICT", violation.message, {
        rule: violation.rule,
        revision: violation.revision,
      });
    }

    const updated = await updateExtraProblem(client, user.id, id, {
      completed,
    });

    const gaps = await loadGaps(client, user.id);
    return toEntry(updated, gaps, today);
  });
}

/**
 * Deletes an extra problem.
 */
export async function deleteExtraProblem(
  user: ZonedUser,
  id: string,
): Promise<void> {
  const deleted = await deleteRow(pool, user.id, id);
  if (!deleted) {
    throw new AppError("NOT_FOUND", "Extra problem not found.");
  }
}

function toEntry(
  row: ExtraProblemRow,
  gaps: Parameters<typeof computeSchedule>[1],
  today: CalendarDate,
): ExtraProblemEntry {
  const schedule = computeSchedule(
    {
      solvedOn: row.solved_on,
      confidence: row.confidence,
      completed: [
        row.revision1_completed_on,
        row.revision2_completed_on,
        row.revision3_completed_on,
      ],
    },
    gaps,
    today,
  );

  return {
    id: row.id,
    title: row.title,
    leetcodeSlug: row.leetcode_slug,
    leetcodeUrl: leetcodeUrl(row.leetcode_slug),
    difficulty: row.difficulty,
    solvedOn: row.solved_on,
    confidence: row.confidence,
    revisions: schedule.revisions,
    next: schedule.next,
    isComplete: schedule.isComplete,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

