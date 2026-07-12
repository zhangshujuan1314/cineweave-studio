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
    // Ensure sorted by version
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
        // Backup before migration
        if (existsSync(dbPath)) {
          copyFileSync(dbPath, backupPath)
        }

        // Run migration in transaction
        db.transaction(() => {
          migration.up(db)
          db.prepare('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
            migration.version,
            Date.now()
          )
        })()

        applied.push(migration.version)

        // Clean up backup on success
        if (existsSync(backupPath)) {
          unlinkSync(backupPath)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Migration v${migration.version} (${migration.description}) failed: ${msg}`)

        // Restore from backup
        if (existsSync(backupPath)) {
          db.close()
          copyFileSync(backupPath, dbPath)
          // Reopen handled by caller — but we already closed db here
          unlinkSync(backupPath)
        }
        break // Stop on first failure
      }
    }

    return { applied, errors }
  }

  validateAllMigrations(db: Database.Database): boolean {
    const currentVersion = getSchemaVersion(db)
    return currentVersion === SCHEMA_VERSION
  }
}

// Phase 1 baseline migration
export const V1_MIGRATION: Migration = {
  version: 1,
  description: 'Baseline schema: projects, media_assets, jobs, checkpoints',
  up: (_db: Database.Database) => {
    // Tables already created by schema.ts via createDatabase()
    // This migration marks version 1 as applied for new databases
    // For future migrations: add actual ALTER/CREATE statements here
  }
}

export const PHASE1_MIGRATIONS: Migration[] = [V1_MIGRATION]
