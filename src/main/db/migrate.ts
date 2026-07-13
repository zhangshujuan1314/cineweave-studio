import Database from 'better-sqlite3'
import { copyFileSync, unlinkSync, existsSync } from 'fs'

import { getSchemaVersion, SCHEMA_VERSION } from './schema'

export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

export class MigrationRunner {
  private migrations: Migration[]

  constructor(migrations: Migration[]) {
    this.migrations = [...migrations].sort((a, b) => a.version - b.version)
  }

  migrate(db: Database.Database, dbPath: string): { applied: number[]; errors: string[] } {
    const currentVersion = getSchemaVersion(db)
    const applied: number[] = []
    const errors: string[] = []

    const pending = this.migrations.filter((m) => m.version > currentVersion)

    for (const migration of pending) {
      const backupPath = dbPath + `.backup-v${currentVersion}`
      try {
        if (existsSync(dbPath)) {
          copyFileSync(dbPath, backupPath)
        }

        db.transaction(() => {
          migration.up(db)
          db.prepare('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
            migration.version,
            Date.now()
          )
        })()

        applied.push(migration.version)

        if (existsSync(backupPath)) {
          unlinkSync(backupPath)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Migration v${migration.version} (${migration.description}) failed: ${msg}`)

        if (existsSync(backupPath)) {
          db.close()
          copyFileSync(backupPath, dbPath)
          unlinkSync(backupPath)
        }
        break
      }
    }

    return { applied, errors }
  }

  validateAllMigrations(db: Database.Database): boolean {
    const currentVersion = getSchemaVersion(db)
    return currentVersion === SCHEMA_VERSION
  }
}

export const V1_MIGRATION: Migration = {
  version: 1,
  description: 'Baseline schema',
  up: (_db: Database.Database) => { /* tables created by createDatabase() */ }
}

export const V2_MIGRATION: Migration = {
  version: 2,
  description: 'Fix media_assets columns',
  up: (db: Database.Database) => {
    const columns = db.prepare("PRAGMA table_info(media_assets)").all() as Array<{ name: string }>
    const colNames = new Set(columns.map(c => c.name))
    if (colNames.has('path') && !colNames.has('original_path')) {
      db.exec('ALTER TABLE media_assets RENAME COLUMN path TO original_path')
      db.exec('ALTER TABLE media_assets ADD COLUMN relative_path TEXT')
    } else if (!colNames.has('original_path')) {
      db.exec('ALTER TABLE media_assets ADD COLUMN original_path TEXT NOT NULL DEFAULT ""')
      db.exec('ALTER TABLE media_assets ADD COLUMN relative_path TEXT')
    }
  }
}

export const V3_MIGRATION: Migration = {
  version: 3,
  description: 'Add shots, subtitles, markers, waveform_peaks tables',
  up: (db: Database.Database) => {
    db.exec(`CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    ) STRICT`)
    db.exec('CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_shots_time ON shots(project_id, start_ms, end_ms)')

    db.exec(`CREATE TABLE IF NOT EXISTS subtitles (
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
    ) STRICT`)
    db.exec('CREATE INDEX IF NOT EXISTS idx_subtitles_project ON subtitles(project_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_subtitles_time ON subtitles(project_id, start_ms, end_ms)')

    db.exec(`CREATE TABLE IF NOT EXISTS markers (
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
    ) STRICT`)
    db.exec('CREATE INDEX IF NOT EXISTS idx_markers_project ON markers(project_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_markers_time ON markers(project_id, time_ms)')

    db.exec(`CREATE TABLE IF NOT EXISTS waveform_peaks (
      id TEXT PRIMARY KEY,
      media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
      sample_rate INTEGER NOT NULL,
      samples_per_peak INTEGER NOT NULL,
      peaks_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    ) STRICT`)
    db.exec('CREATE INDEX IF NOT EXISTS idx_waveform_asset ON waveform_peaks(media_asset_id)')
  }
}

export const PHASE1_MIGRATIONS: Migration[] = [V1_MIGRATION, V2_MIGRATION, V3_MIGRATION]
