import { ipcMain } from 'electron'
import {
  mediaImportRequestSchema,
  mediaRelocateRequestSchema
} from '../../shared/contracts/ipc'
import { getProjectRepository } from '../projects/repository'
import { probe } from '../media/ffmpeg'
import { MediaRepository } from '../media/repository'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'

// We need access to the project DB - get it from the project repository
// For now, we'll open the DB per-request (can be optimized later)

function getProjectDb(projectPath: string): Database.Database {
  const dbPath = join(projectPath, 'project.sqlite')
  if (!existsSync(dbPath)) throw new Error('Project database not found')
  return new Database(dbPath)
}

export function registerMediaHandlers(): void {
  ipcMain.handle('media:import', async (_event, payload: unknown) => {
    const parsed = mediaImportRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid media:import: ' + parsed.error.message)

    const { filePath } = parsed.data
    if (!existsSync(filePath)) throw new Error('Media file not found')

    // Probe the file
    const probeResult = await probe(filePath)

    // Find the project - for now use the first project in the DB
    // In a real implementation, we'd track the "active project"
    const projectRepo = getProjectRepository()
    const projects = projectRepo.listProjects()
    if (projects.length === 0) throw new Error('No project open. Create or open a project first.')

    const projectPath = projects[0].path
    const db = getProjectDb(projectPath)
    try {
      const mediaRepo = new MediaRepository(db, projectPath)
      const asset = mediaRepo.importOriginal(filePath, probeResult)
      return asset
    } finally {
      db.close()
    }
  })

  ipcMain.handle('media:relocate', async (_event, payload: unknown) => {
    const parsed = mediaRelocateRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid media:relocate: ' + parsed.error.message)

    const { assetId, newPath } = parsed.data
    if (!existsSync(newPath)) throw new Error('New path does not exist')

    const projectRepo = getProjectRepository()
    const projects = projectRepo.listProjects()
    if (projects.length === 0) throw new Error('No project open')

    const projectPath = projects[0].path
    const db = getProjectDb(projectPath)
    try {
      const mediaRepo = new MediaRepository(db, projectPath)
      return mediaRepo.relocate(assetId, newPath)
    } finally {
      db.close()
    }
  })
}
