import { ipcMain } from 'electron'
import {
  projectCreateRequestSchema, projectOpenRequestSchema,
  projectListRequestSchema, projectDeleteRequestSchema,
  projectRenameRequestSchema
} from '../../shared/contracts/ipc'
import type {
  ProjectCreateResponse, ProjectOpenResponse,
  ProjectListResponse, ProjectRenameResponse
} from '../../shared/contracts'
import { getProjectRepository } from '../projects/repository'

export function registerProjectHandlers(): void {
  const repo = getProjectRepository()

  ipcMain.handle('project:create', (_event, payload: unknown): ProjectCreateResponse => {
    const parsed = projectCreateRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid project:create: ' + parsed.error.message)
    return repo.createProject(parsed.data.title, parsed.data.basePath)
  })

  ipcMain.handle('project:open', (_event, payload: unknown): ProjectOpenResponse => {
    const parsed = projectOpenRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid project:open: ' + parsed.error.message)
    return repo.openProject(parsed.data.projectPath)
  })

  ipcMain.handle('project:list', (_event, payload: unknown): ProjectListResponse => {
    projectListRequestSchema.safeParse(payload)
    return repo.listProjects()
  })

  ipcMain.handle('project:delete', (_event, payload: unknown): void => {
    const parsed = projectDeleteRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid project:delete: ' + parsed.error.message)
    repo.deleteProject(parsed.data.projectPath)
  })

  ipcMain.handle('project:rename', (_event, payload: unknown): ProjectRenameResponse => {
    const parsed = projectRenameRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid project:rename: ' + parsed.error.message)
    return repo.renameProject(parsed.data.projectPath, parsed.data.newTitle)
  })
}
