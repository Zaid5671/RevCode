-- The NeetCode 250 catalog (PLAN.md §5.2). Filled by scripts/seed.ts; ids are permanent.
-- The LeetCode URL is derived from leetcode_slug, never stored.

CREATE TABLE category (
  id        SMALLINT PRIMARY KEY,
  name      TEXT     NOT NULL UNIQUE,
  position  SMALLINT NOT NULL UNIQUE
);

CREATE TABLE problem (
  id             SMALLINT PRIMARY KEY,
  leetcode_slug  TEXT     NOT NULL UNIQUE CHECK (leetcode_slug ~ '^[a-z0-9-]+$'),
  neetcode_slug  TEXT     NOT NULL UNIQUE,     -- used to import old-tracker data
  title          TEXT     NOT NULL,
  difficulty     TEXT     NOT NULL CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
  category_id    SMALLINT NOT NULL REFERENCES category (id),
  position       SMALLINT NOT NULL,            -- order within its category
  is_premium     BOOLEAN  NOT NULL DEFAULT FALSE,
  UNIQUE (category_id, position)
);
