import Database from 'better-sqlite3'

export const SCHEMA_VERSION = 4

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
    relative_path TEXT,
    original_path TEXT NOT NULL,
    fingerprint TEXT,
    duration_ms INTEGER,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS shots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    segment_id TEXT REFERENCES segments(id) ON DELETE SET NULL,
    index_in_project INTEGER NOT NULL DEFAULT 0,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    thumbnail_path TEXT,
    label TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    tags_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK(start_ms >= 0),
    CHECK(end_ms > start_ms)
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS subtitles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK(source IN ('embedded','imported','manual')),
    language TEXT,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    text TEXT NOT NULL,
    speaker TEXT,
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK(start_ms >= 0),
    CHECK(end_ms > start_ms)
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS markers (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    time_ms INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('note','emotion','beat','custom')),
    label TEXT NOT NULL DEFAULT '',
    color TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK(time_ms >= 0)
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES segments(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('act','sequence','scene','beat')),
    title TEXT NOT NULL DEFAULT '',
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    index_in_parent INTEGER NOT NULL DEFAULT 0,
    function TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    tags_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK(start_ms >= 0),
    CHECK(end_ms > start_ms)
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS storylines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS storyline_segments (
    id TEXT PRIMARY KEY,
    storyline_id TEXT NOT NULL REFERENCES storylines(id) ON DELETE CASCADE,
    segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(storyline_id, segment_id)
  ) STRICT`,

  `CREATE TABLE IF NOT EXISTS waveform_peaks (
    id TEXT PRIMARY KEY,
    media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sample_rate INTEGER NOT NULL,
    samples_per_peak INTEGER NOT NULL,
    peaks_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
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
  `CREATE INDEX IF NOT EXISTS idx_media_assets_fingerprint ON media_assets(fingerprint)`,
  `CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shots_segment ON shots(segment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shots_time ON shots(project_id, start_ms, end_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_subtitles_project ON subtitles(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subtitles_time ON subtitles(project_id, start_ms, end_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_markers_project ON markers(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_markers_time ON markers(project_id, time_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_segments_project ON segments(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_segments_parent ON segments(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_segments_time ON segments(project_id, start_ms, end_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_storylines_project ON storylines(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storyline_segments_storyline ON storyline_segments(storyline_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storyline_segments_segment ON storyline_segments(segment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_waveform_asset ON waveform_peaks(media_asset_id)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state)`,
  `CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id)`
]

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.transaction(() => {
    for (const sql of CREATE_TABLES) db.exec(sql)
    for (const sql of CREATE_INDEXES) db.exec(sql)
  })()
  return db
}

export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null } | undefined
    return row?.version ?? 0
  } catch { return 0 }
}
