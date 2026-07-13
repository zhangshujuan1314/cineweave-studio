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

// V1: Baseline schema
export const V1_MIGRATION: Migration = {
  version: 1,
  description: 'Baseline schema: projects, media_assets, jobs, checkpoints',
  up: (_db: Database.Database) => {
    // Tables already created by createDatabase()
  }
}

// V2: Fix media_assets columns (relative_path, original_path)
export const V2_MIGRATION: Migration = {
  version: 2,
  description: 'Fix media_assets: add relative_path and original_path columns',
  up: (db: Database.Database) => {
    // Check if old 'path' column exists and new columns don't
    const columns = db.prepare("PRAGMA table_info(media_assets)").all() as Array<{ name: string }>
    const colNames = new Set(columns.map(c => c.name))

    if (colNames.has('path') && !colNames.has('original_path')) {
      // Migrate: rename path to original_path, add relative_path
      db.exec('ALTER TABLE media_assets RENAME COLUMN path TO original_path')
      db.exec('ALTER TABLE media_assets ADD COLUMN relative_path TEXT')
    } else if (!colNames.has('original_path')) {
      // Fresh table without path column (shouldn't happen, but handle it)
      db.exec('ALTER TABLE media_assets ADD COLUMN original_path TEXT NOT NULL DEFAULT ""')
      db.exec('ALTER TABLE media_assets ADD COLUMN relative_path TEXT')
    }
    // If columns already exist, this is a no-op
  }
}

export const PHASE1_MIGRATIONS: Migration[] = [V1_MIGRATION, V2_MIGRATION]
