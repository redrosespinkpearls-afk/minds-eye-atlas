-- Only consented summaries are stored. Raw responses and timing arrays are never saved.
CREATE TABLE IF NOT EXISTS responses (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  assessment_version INTEGER NOT NULL CHECK (assessment_version = 2),
  public_entry INTEGER NOT NULL DEFAULT 0 CHECK (public_entry IN (0,1)),
  display_name TEXT,
  imagery_score INTEGER NOT NULL CHECK (imagery_score BETWEEN 0 AND 48),
  detail_score INTEGER NOT NULL CHECK (detail_score BETWEEN 0 AND 48),
  category INTEGER NOT NULL CHECK (category BETWEEN 0 AND 4),
  total_correct INTEGER NOT NULL CHECK (total_correct BETWEEN 0 AND 15),
  difficulty_score INTEGER NOT NULL CHECK (difficulty_score BETWEEN 0 AND 45),
  timed_score REAL NOT NULL CHECK (timed_score BETWEEN 0 AND 45),
  spatial INTEGER NOT NULL CHECK (spatial BETWEEN 0 AND 5),
  memory INTEGER NOT NULL CHECK (memory BETWEEN 0 AND 5),
  reasoning INTEGER NOT NULL CHECK (reasoning BETWEEN 0 AND 5),
  strategy TEXT NOT NULL,
  deletion_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS responses_public_seq_idx ON responses(public_entry,seq DESC);
CREATE INDEX IF NOT EXISTS responses_category_idx ON responses(category);
