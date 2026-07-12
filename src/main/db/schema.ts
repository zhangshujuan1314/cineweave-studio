import Database from 'better-sqlite3'

export const SCHEMA_VERSION = 1

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('original','proxy','audio','subtitle')),
    path TEXT NOT NULL,
    fingerprint TEXT,
    duration_ms INTEGER,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed','canceled','interrupted')),
    progress REAL DEFAULT 0,
    payload_json TEXT,
    error_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '',
    delta_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`
]

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_media_assets_project ON media_assets(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state)`,
  `CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id)`
]

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)

  // Safety and performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  // ponytail: raw SQL; add Kysely/Drizzle when query complexity warrants it
  db.transaction(() => {
    for (const sql of CREATE_TABLES) {
      db.exec(sql)
    }
    for (const sql of CREATE_INDEXES) {
      db.exec(sql)
    }
  })()

  return db
}

export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db
      .prepare('SELECT MAX(version) as version FROM schema_migrations')
      .get() as { version: number | null } | undefined
    return row?.version ?? 0
  } catch {
    return 0
  }
}
