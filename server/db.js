import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = process.env.DB_PATH || resolve(root, 'data', 'app.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  session_id  TEXT,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  birth_date  TEXT NOT NULL,
  vacancy     TEXT NOT NULL,
  readiness   TEXT NOT NULL,
  education   TEXT NOT NULL,
  course      TEXT NOT NULL,
  direction   TEXT,           -- основное направление по итогам игры
  scores      TEXT,           -- JSON с баллами
  consent_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  is_demo     INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  session_id  TEXT NOT NULL,
  type        TEXT NOT NULL,  -- open | start | scene | finish | apply
  scene       TEXT,
  direction   TEXT,
  is_demo     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`);

// Миграции: добавляем новые колонки в уже существующую базу, данные не теряются.
const cols = new Set(db.prepare('PRAGMA table_info(applications)').all().map((c) => c.name));
for (const [name, type] of [
  ['is_student', 'INTEGER'],
  ['education_level', 'TEXT'],
  ['experience', 'TEXT'],
  ['experience_text', 'TEXT'],
  ['quiz_score', 'INTEGER'],
  ['source', 'TEXT'],
]) {
  if (!cols.has(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${type}`);
}
const evCols = new Set(db.prepare('PRAGMA table_info(events)').all().map((c) => c.name));
if (!evCols.has('source')) db.exec('ALTER TABLE events ADD COLUMN source TEXT');
