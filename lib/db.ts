import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "sessions.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_url      TEXT,
      pr_title    TEXT,
      started_at  TEXT NOT NULL,
      stopped_at  TEXT,
      duration_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started_at
      ON sessions(started_at);
  `);

  return db;
}
