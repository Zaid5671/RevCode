-- Per-user revision gaps (PLAN.md §4.1, §5.3). Absent rows mean "use DEFAULT_GAPS for
-- this confidence".

CREATE TABLE user_gap (
  user_id     TEXT     NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  confidence  SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 3),
  r1          SMALLINT NOT NULL CHECK (r1 BETWEEN 1 AND 180),
  r2          SMALLINT NOT NULL CHECK (r2 BETWEEN 1 AND 180),
  r3          SMALLINT NOT NULL CHECK (r3 BETWEEN 1 AND 180),
  PRIMARY KEY (user_id, confidence)
);
