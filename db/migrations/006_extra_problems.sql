-- Per-user extra LeetCode problems tracked outside the NeetCode 250 catalog.
CREATE TABLE user_extra_problem (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  leetcode_slug           TEXT NOT NULL CHECK (leetcode_slug ~ '^[a-z0-9-]+$'),
  difficulty              TEXT NOT NULL CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
  solved_on               DATE NOT NULL,
  confidence              SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 3),
  revision1_completed_on  DATE,
  revision2_completed_on  DATE,
  revision3_completed_on  DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, leetcode_slug),
  CHECK (revision1_completed_on IS NULL OR revision1_completed_on >= solved_on),
  CHECK (revision2_completed_on IS NULL OR (revision1_completed_on IS NOT NULL AND revision2_completed_on >= revision1_completed_on)),
  CHECK (revision3_completed_on IS NULL OR (revision2_completed_on IS NOT NULL AND revision3_completed_on >= revision2_completed_on))
);

CREATE INDEX idx_user_extra_problem_user_id ON user_extra_problem (user_id);

