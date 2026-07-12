import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, readFileSync, renameSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { shell } from 'electron'
import Database from 'better-sqlite3'
import { createDatabase, SCHEMA_VERSION } from '../db/schema'
import { MigrationRunner, PHASE1_MIGRATIONS } from '../db/migrate'
import type { ProjectCreateResponse, ProjectOpenResponse, ProjectListResponse, ProjectRenameResponse } from '../../shared/contracts'

const runner = new MigrationRunner(PHASE1_MIGRATIONS)

interface Manifest { projectId: string; title: string; schemaVersion: number; createdAt: number; updatedAt: number }

function readManifest(dirPath: string): Manifest {
  return JSON.parse(readFileSync(join(dirPath, 'manifest.json'), 'utf-8')) as Manifest
}
function writeManifest(dirPath: string, m: Manifest): void {
  writeFileSync(join(dirPath, 'manifest.json'), JSON.stringify(m, null, 2), 'utf-8')
}
function projectDirName(title: string): string {
  return title.replace(/[<>:"/\|?*]/g, '_').slice(0, 200) + '.cineweave'
}
function ensureDir(p: string): void { if (!existsSync(p)) mkdirSync(p, { recursive: true }) }

export class ProjectRepository {
  createProject(title: string, basePath: string): ProjectCreateResponse {
    const projectId = randomUUID(); const now = Date.now()
    const dirName = projectDirName(title); const finalPath = join(basePath, dirName)
    if (existsSync(finalPath)) throw new Error('Directory exists: ' + finalPath)
    const tmpPath = join(basePath, '.tmp-' + projectId); ensureDir(tmpPath)
    try {
      for (const d of ['media','cache/frames','cache/waveforms','cache/analysis','attachments','exports','backups']) ensureDir(join(tmpPath, d))
      writeManifest(tmpPath, { projectId, title, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now })
      const dbPath = join(tmpPath, 'project.sqlite'); const db = createDatabase(dbPath)
      const { errors } = runner.migrate(db, dbPath)
      db.prepare('INSERT INTO projects (id, title, schema_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(projectId, title, SCHEMA_VERSION, now, now)
      db.close()
      if (errors.length > 0) throw new Error('Migration failed: ' + errors.join('; '))
      renameSync(tmpPath, finalPath)
      return { projectId, title, path: finalPath, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now }
    } catch (err) {
      try { if (existsSync(tmpPath)) rmSync(tmpPath, { recursive: true, force: true }) } catch { /* best effort */ }
      throw err
    }
  }

  openProject(dirPath: string): ProjectOpenResponse {
    if (!existsSync(dirPath)) throw new Error('Project directory not found')
    const manifest = readManifest(dirPath); const dbPath = join(dirPath, 'project.sqlite')
    if (!existsSync(dbPath)) throw new Error('project.sqlite not found')
    const db = new Database(dbPath)
    const row = db.prepare('SELECT id, title, schema_version, created_at, updated_at FROM projects WHERE id = ?').get(manifest.projectId) as { id: string; title: string; schema_version: number; created_at: number; updated_at: number } | undefined
    db.close()
    if (!row) throw new Error('Project not found in database')
    return { projectId: row.id, title: row.title, path: dirPath, schemaVersion: row.schema_version, createdAt: row.created_at, updatedAt: row.updated_at }
  }

  listProjects(): ProjectListResponse { return [] }

  deleteProject(dirPath: string): void {
    try { shell.trashItem(dirPath) } catch (err) { throw new Error('Failed to move to trash: ' + (err instanceof Error ? err.message : String(err))) }
  }

  renameProject(dirPath: string, newTitle: string): ProjectRenameResponse {
    const manifest = readManifest(dirPath); const dbPath = join(dirPath, 'project.sqlite')
    const db = new Database(dbPath); const now = Date.now()
    db.prepare('UPDATE projects SET title = ?, updated_at = ? WHERE id = ?').run(newTitle, now, manifest.projectId); db.close()
    manifest.title = newTitle; manifest.updatedAt = now; writeManifest(dirPath, manifest)
    const newPath = join(join(dirPath, '..'), projectDirName(newTitle))
    if (dirPath !== newPath) renameSync(dirPath, newPath)
    return { projectId: manifest.projectId, title: newTitle, updatedAt: now }
  }
}

let _repo: ProjectRepository | null = null
export function getProjectRepository(): ProjectRepository { if (!_repo) _repo = new ProjectRepository(); return _repo }
