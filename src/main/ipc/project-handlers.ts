import { ipcMain } from 'electron'
import {
  projectCreateRequestSchema, projectOpenRequestSchema,
  projectListRequestSchema, projectDeleteRequestSchema,
  projectRenameRequestSchema, projectCopyRequestSchema,
  projectScanRequestSchema,
} from '../../shared/contracts/ipc'
import type {
  ProjectCreateResponse, ProjectOpenResponse,
  ProjectListResponse, ProjectRenameResponse,
  ProjectCopyResponse, ProjectScanResponse,
} from '../../shared/contracts'
import { getProjectRepository } from '../projects/repository'

export function registerProjectHandlers(): void {
  const repo = getProjectRepository()

  // --- project:create ---

  ipcMain.handle('project:create', (_event, payload: unknown): ProjectCreateResponse => {
    const parsed = projectCreateRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:create input: ' + parsed.error.message)
    }
    const { title, basePath } = parsed.data
    return repo.createProject(basePath, title)
  })

  // --- project:open ---

  ipcMain.handle('project:open', (_event, payload: unknown): ProjectOpenResponse => {
    const parsed = projectOpenRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:open input: ' + parsed.error.message)
    }
    return repo.openProject(parsed.data.projectPath)
  })

  // --- project:list ---

  ipcMain.handle('project:list', (_event, payload: unknown): ProjectListResponse => {
    projectListRequestSchema.safeParse(payload) // validate shape
    return repo.listProjects()
  })

  // --- project:delete ---

  ipcMain.handle('project:delete', (_event, payload: unknown): void => {
    const parsed = projectDeleteRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:delete input: ' + parsed.error.message)
    }
    repo.deleteProject(parsed.data.projectPath)
  })

  // --- project:rename ---

  ipcMain.handle('project:rename', (_event, payload: unknown): ProjectRenameResponse => {
    const parsed = projectRenameRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:rename input: ' + parsed.error.message)
    }
    const { projectPath, newTitle } = parsed.data
    return repo.renameProject(projectPath, newTitle)
  })

  // --- project:copy ---

  ipcMain.handle('project:copy', (_event, payload: unknown): ProjectCopyResponse => {
    const parsed = projectCopyRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:copy input: ' + parsed.error.message)
    }
    const { sourcePath, destPath, newTitle } = parsed.data
    return repo.copyProject(sourcePath, destPath, newTitle)
  })

  // --- project:scan ---

  ipcMain.handle('project:scan', (_event, payload: unknown): ProjectScanResponse => {
    const parsed = projectScanRequestSchema.safeParse(payload)
    if (!parsed.success) {
      throw new Error('Invalid project:scan input: ' + parsed.error.message)
    }
    return repo.scanDirectory(parsed.data.directoryPath)
  })
}
