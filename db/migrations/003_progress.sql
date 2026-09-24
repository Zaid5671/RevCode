-- Per-user progress (PLAN.md §5.3). A row exists only while a problem is solved; due dates
-- are never stored, they come from computeSchedule on every read. The CHECKs back up the
-- timeline rules (§4.4) that the progress service enforces with friendly errors.

CREATE TABLE user_problem (
  user_id                 TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  problem_id              SMALLINT NOT NULL REFERENCES problem (id),
  solved_on               DATE     NOT NULL,
  confidence              SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 3),
  revision1_completed_on  DATE,
  revision2_completed_on  DATE,
  revision3_completed_on  DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id),
  CHECK (revision1_completed_on IS NULL OR revision1_completed_on >= solved_on),
  CHECK (revision2_completed_on IS NULL OR (revision1_completed_on IS NOT NULL AND revision2_completed_on >= revision1_completed_on)),
  CHECK (revision3_completed_on IS NULL OR (revision2_completed_on IS NOT NULL AND revision3_completed_on >= revision2_completed_on))
);
