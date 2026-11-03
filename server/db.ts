import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  customer TEXT NOT NULL,
  customer_tier TEXT NOT NULL DEFAULT 'free' CHECK (customer_tier IN ('free', 'team', 'enterprise')),
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'triaged', 'planned', 'done', 'declined')),
  owner TEXT,
  votes INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_tag (
  feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (feedback_id, tag)
);

CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_tag_tag_idx ON feedback_tag (tag);
`;

export type Database = DatabaseSync;

export function openDatabase(path = process.env.FEEDBACK_DB ?? "feedback.db"): Database {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}
