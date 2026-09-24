-- Per-user Markdown notes (PLAN.md §5.3, §8.4). Independent of user_problem: notes survive
-- "unmark solved" and exist for unsolved problems. Conflict checks compare `version`,
-- which goes up by one on every update; never the timestamps.

CREATE TABLE problem_note (
  user_id     TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  problem_id  SMALLINT NOT NULL REFERENCES problem (id),
  body        TEXT     NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  version     INTEGER  NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
