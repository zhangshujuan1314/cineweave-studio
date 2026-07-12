import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, renameSync, rmSync, readdirSync, existsSync, statSync, copyFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { app, shell } from 'electron'
import Database from 'better-sqlite3'
import { createDatabase, SCHEMA_VERSION } from '../db/schema'
import { MigrationRunner, PHASE1_MIGRATIONS } from '../db/migrate'
import type {
  ProjectCreateResponse, ProjectOpenResponse, ProjectListResponse,
  ProjectRenameResponse, ProjectCopyResponse,
} from '../../shared/contracts'
import type { ProjectManifest, ProjectEntry, Registry } from '../../shared/schemas/project'
import { ManifestSchema, RegistrySchema, sanitizeDirName } from '../../shared/schemas/project'

// ── Constants ──────────────────────────────────────────────────

const CINEWEAVE_EXT = '.cineweave'
const PROJECT_DIRS = [
  'media', 'cache/frames', 'cache/waveforms', 'cache/analysis',
  'attachments', 'exports', 'backups',
]

// ── Helpers ────────────────────────────────────────────────────

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function projectDirName(title: string): string {
  return sanitizeDirName(title) + CINEWEAVE_EXT
}

function readJson<T>(filePath: string, validator?: { safeParse: (v: unknown) => { success: boolean; data?: T } }): T {
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw)
  if (validator) {
    const result = validator.safeParse(parsed) as { success: boolean; data?: T }
    if (!result.success) throw new Error(`Invalid JSON schema in ${basename(filePath)}`)
    return result.data as T
  }
  return parsed as T
}

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Registry ───────────────────────────────────────────────────

function getRegistryPath(): string {
  return join(app.getPath('userData'), 'recent-projects.json')
}

function loadRegistry(): Registry {
  const p = getRegistryPath()
  try {
    if (existsSync(p)) return readJson<Registry>(p, RegistrySchema)
  } catch {
    // corrupt or missing — start fresh
  }
  return { projects: [] }
}

function saveRegistry(reg: Registry): void {
  ensureDir(dirname(getRegistryPath()))
  writeJson(getRegistryPath(), reg)
}

function upsertRegistry(entry: ProjectEntry): void {
  const reg = loadRegistry()
  reg.projects = reg.projects.filter(
    (p) => p.projectId !== entry.projectId && p.path !== entry.path,
  )
  reg.projects.push(entry)
  saveRegistry(reg)
}

function removeFromRegistry(projectId: string): void {
  const reg = loadRegistry()
  reg.projects = reg.projects.filter((p) => p.projectId !== projectId)
  saveRegistry(reg)
}

// ── Recursive directory copy ───────────────────────────────────

function copyDirSync(src: string, dest: string): void {
  ensureDir(dest)
  for (const name of readdirSync(src)) {
    const srcPath = join(src, name)
    const destPath = join(dest, name)
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// ── ProjectRepository ──────────────────────────────────────────

const runner = new MigrationRunner(PHASE1_MIGRATIONS)

export class ProjectRepository {

  // ── createProject ──────────────────────────────────────────

  createProject(basePath: string, title: string): ProjectCreateResponse {
    if (!title.trim()) throw new Error('Project title must not be empty')

    const projectId = randomUUID()
    const now = Date.now()
    const dirName = projectDirName(title)
    const finalPath = join(basePath, dirName)

    if (existsSync(finalPath)) {
      throw new Error(`Project already exists at "${finalPath}"`)
    }

    // Atomic creation: build in temp, then rename
    const tmpPath = join(basePath, `.cineweave-tmp-${randomUUID()}`)
    ensureDir(tmpPath)

    try {
      for (const d of PROJECT_DIRS) ensureDir(join(tmpPath, d))

      // Manifest
      const manifest: ProjectManifest = {
        projectId, title, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
      }
      writeJson(join(tmpPath, 'manifest.json'), manifest)

      // Database with initial schema + migrations
      const dbPath = join(tmpPath, 'project.sqlite')
      const db = createDatabase(dbPath)
      const { errors } = runner.migrate(db, dbPath)
      db.prepare(
        'INSERT INTO projects (id, title, schema_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(projectId, title, SCHEMA_VERSION, now, now)
      db.close()

      if (errors.length > 0) {
        throw new Error('Migration failed during project creation: ' + errors.join('; '))
      }

      // Atomic rename into place
      renameSync(tmpPath, finalPath)
    } catch (err) {
      // Clean up temp directory
      try { if (existsSync(tmpPath)) rmSync(tmpPath, { recursive: true, force: true }) } catch { /* best-effort */ }
      throw err
    }

    // Register
    upsertRegistry({ projectId, title, path: finalPath, lastOpenedAt: now })

    return {
      projectId, title, path: finalPath,
      schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
    }
  }

  // ── openProject ────────────────────────────────────────────

  openProject(projectPath: string): ProjectOpenResponse {
    if (!existsSync(projectPath)) {
      throw new Error(`Project directory not found: "${projectPath}"`)
    }
    if (!projectPath.endsWith(CINEWEAVE_EXT)) {
      throw new Error(`Not a CineWeave project: "${projectPath}"`)
    }

    // Read and validate manifest
    const manifestPath = join(projectPath, 'manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error('manifest.json not found')
    }
    const manifest = readJson<ProjectManifest>(manifestPath, ManifestSchema)

    if (manifest.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Schema version mismatch: project=${manifest.schemaVersion}, app=${SCHEMA_VERSION}`,
      )
    }

    // Open database
    const dbPath = join(projectPath, 'project.sqlite')
    if (!existsSync(dbPath)) throw new Error('project.sqlite not found')

    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')

    // Run pending migrations
    const { errors } = runner.migrate(db, dbPath)
    if (errors.length > 0) {
      db.close()
      throw new Error('Migration failed: ' + errors.join('; '))
    }

    // Cross-verify: manifest projectId must exist in database
    const row = db.prepare(
      'SELECT id, title, schema_version, created_at, updated_at FROM projects WHERE id = ?',
    ).get(manifest.projectId) as {
      id: string; title: string; schema_version: number; created_at: number; updated_at: number
    } | undefined

    if (!row) {
      db.close()
      throw new Error(
        `Project ID "${manifest.projectId}" from manifest not found in database`,
      )
    }

    // Cross-verify: schema version matches between manifest and database
    if (row.schema_version !== manifest.schemaVersion) {
      db.close()
      throw new Error(
        `Schema version mismatch: manifest=${manifest.schemaVersion}, database=${row.schema_version}`,
      )
    }

    const now = Date.now()

    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, manifest.projectId)
    db.close()

    // Update manifest
    manifest.updatedAt = now
    writeJson(manifestPath, manifest)

    // Update registry
    upsertRegistry({
      projectId: manifest.projectId, title: row.title,
      path: projectPath, lastOpenedAt: now,
    })

    return {
      projectId: row.id, title: row.title, path: projectPath,
      schemaVersion: row.schema_version, createdAt: row.created_at, updatedAt: now,
    }
  }

  // ── listProjects ───────────────────────────────────────────

  listProjects(): ProjectListResponse {
    const reg = loadRegistry()
    const valid: ProjectEntry[] = []

    for (const entry of reg.projects) {
      try {
        if (existsSync(entry.path)) valid.push(entry)
      } catch {
        // Project was moved or deleted — prune it
      }
    }

    // Persist pruned registry
    if (valid.length !== reg.projects.length) {
      reg.projects = valid
      saveRegistry(reg)
    }

    // Most recently opened first
    valid.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    return valid.map((e) => ({
      projectId: e.projectId, title: e.title,
      path: e.path, lastOpenedAt: e.lastOpenedAt,
    }))
  }

  // ── deleteProject ──────────────────────────────────────────

  deleteProject(projectPath: string): void {
    if (!existsSync(projectPath)) {
      throw new Error(`Project directory not found: "${projectPath}"`)
    }

    // Extract projectId from manifest if possible (for registry cleanup)
    let projectId = ''
    try {
      const manifestPath = join(projectPath, 'manifest.json')
      if (existsSync(manifestPath)) {
        const manifest = readJson<ProjectManifest>(manifestPath, ManifestSchema)
        projectId = manifest.projectId
      }
    } catch {
      // manifest may be missing or corrupt; still remove the directory
    }

    // Move to system recycle bin.
    // shell.trashItem is async; we fire-and-forget here. Registry removal
    // is the synchronous anchor that makes the project "gone" to the app.
    try {
      void shell.trashItem(projectPath)
    } catch {
      // Fall back to permanent deletion if trash is unsupported
      rmSync(projectPath, { recursive: true, force: true })
    }

    // Remove from registry
    if (projectId) removeFromRegistry(projectId)
  }

  // ── renameProject ──────────────────────────────────────────

  renameProject(projectPath: string, newTitle: string): ProjectRenameResponse {
    if (!existsSync(projectPath)) {
      throw new Error(`Project directory not found: "${projectPath}"`)
    }
    if (!newTitle.trim()) throw new Error('New title must not be empty')

    const manifestPath = join(projectPath, 'manifest.json')
    if (!existsSync(manifestPath)) throw new Error('manifest.json not found')

    const manifest = readJson<ProjectManifest>(manifestPath, ManifestSchema)
    const now = Date.now()

    // Update database
    const dbPath = join(projectPath, 'project.sqlite')
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    try {
      db.prepare('UPDATE projects SET title = ?, updated_at = ? WHERE id = ?').run(
        newTitle, now, manifest.projectId,
      )
    } finally {
      db.close()
    }

    // Update manifest
    manifest.title = newTitle
    manifest.updatedAt = now
    writeJson(manifestPath, manifest)

    // Rename directory if path would change
    const parentDir = dirname(projectPath)
    const newPath = join(parentDir, projectDirName(newTitle))
    if (projectPath !== newPath) {
      if (existsSync(newPath)) {
        throw new Error(`Cannot rename: "${newPath}" already exists`)
      }
      renameSync(projectPath, newPath)
      upsertRegistry({
        projectId: manifest.projectId, title: newTitle,
        path: newPath, lastOpenedAt: now,
      })
    } else {
      upsertRegistry({
        projectId: manifest.projectId, title: newTitle,
        path: projectPath, lastOpenedAt: now,
      })
    }

    return { projectId: manifest.projectId, title: newTitle, updatedAt: now }
  }

  // ── copyProject ────────────────────────────────────────────

  copyProject(sourcePath: string, destDir: string, newTitle?: string): ProjectCopyResponse {
    if (!existsSync(sourcePath)) {
      throw new Error(`Source project not found: "${sourcePath}"`)
    }

    const srcManifestPath = join(sourcePath, 'manifest.json')
    if (!existsSync(srcManifestPath)) throw new Error('manifest.json not found in source')

    const srcManifest = readJson<ProjectManifest>(srcManifestPath, ManifestSchema)
    const targetTitle = newTitle ?? srcManifest.title
    const projectId = randomUUID()
    const now = Date.now()
    const finalPath = join(destDir, projectDirName(targetTitle))

    if (existsSync(finalPath)) {
      throw new Error(`Project already exists at "${finalPath}"`)
    }

    // Copy entire directory tree
    copyDirSync(sourcePath, finalPath)

    // Overwrite manifest with new identity
    const manifest: ProjectManifest = {
      projectId, title: targetTitle, schemaVersion: SCHEMA_VERSION,
      createdAt: now, updatedAt: now,
    }
    writeJson(join(finalPath, 'manifest.json'), manifest)

    // Update database project id and title
    const dbPath = join(finalPath, 'project.sqlite')
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    try {
      db.prepare(
        'UPDATE projects SET id = ?, title = ?, created_at = ?, updated_at = ? WHERE id = ?',
      ).run(projectId, targetTitle, now, now, srcManifest.projectId)
    } finally {
      db.close()
    }

    // Register
    upsertRegistry({ projectId, title: targetTitle, path: finalPath, lastOpenedAt: now })

    return {
      projectId, title: targetTitle, path: finalPath,
      schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
    }
  }

  // ── scanDirectory ──────────────────────────────────────────

  /** Scan a directory for .cineweave projects and register them all. */
  scanDirectory(dirPath: string): ProjectListResponse {
    const found: ProjectEntry[] = []
    if (!existsSync(dirPath)) return found

    for (const name of readdirSync(dirPath)) {
      if (!name.endsWith(CINEWEAVE_EXT)) continue
      const projPath = join(dirPath, name)
      const mfPath = join(projPath, 'manifest.json')
      if (!existsSync(mfPath)) continue

      try {
        const m = readJson<ProjectManifest>(mfPath, ManifestSchema)
        const entry: ProjectEntry = {
          projectId: m.projectId, title: m.title,
          path: projPath, lastOpenedAt: m.updatedAt,
        }
        found.push(entry)
        upsertRegistry(entry)
      } catch {
        // Skip directories with invalid manifests
      }
    }
    return found
  }

  // ── checkProject (missing detection) ───────────────────────

  /** Verify a registry entry still points to a valid project on disk. */
  checkProject(projectId: string): ProjectEntry | null {
    const reg = loadRegistry()
    const entry = reg.projects.find((p) => p.projectId === projectId)
    if (!entry) return null
    try {
      return existsSync(entry.path) ? entry : null
    } catch {
      return null
    }
  }

  // ── relocateProject ────────────────────────────────────────

  /** Update a registry entry's path. Does not modify on-disk project data. */
  relocateProject(projectId: string, newPath: string): ProjectEntry {
    const reg = loadRegistry()
    const entry = reg.projects.find((p) => p.projectId === projectId)
    if (!entry) throw new Error(`Project "${projectId}" not in registry`)
    if (!existsSync(newPath)) throw new Error(`Path not found: "${newPath}"`)

    entry.path = newPath
    entry.lastOpenedAt = Date.now()
    saveRegistry(reg)
    return { ...entry }
  }

  // ── transaction ────────────────────────────────────────────

  /**
   * Wrap multiple database writes in a single transaction.
   * better-sqlite3 transactions are synchronous.
   */
  transaction<T>(db: Database.Database, fn: () => T): T {
    return db.transaction(fn)()
  }
}

// ── Singleton ─────────────────────────────────────────────────

let _instance: ProjectRepository | null = null

export function getProjectRepository(): ProjectRepository {
  if (!_instance) _instance = new ProjectRepository()
  return _instance
}
