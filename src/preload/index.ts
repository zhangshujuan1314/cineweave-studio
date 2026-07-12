import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ProjectCreateRequest, ProjectCreateResponse,
  ProjectOpenRequest, ProjectOpenResponse,
  ProjectListResponse,
  ProjectDeleteRequest,
  ProjectRenameRequest, ProjectRenameResponse,
  MediaImportRequest, MediaRelocateRequest
} from '../shared/contracts'

const api = {
  getInfo: () => electronAPI.ipcRenderer.invoke('app:getInfo', {}) as Promise<{ name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string }>,
  selectProjectDirectory: () => electronAPI.ipcRenderer.invoke('dialog:selectProjectDirectory', {}) as Promise<{ canceled: boolean; filePaths: string[] }>,
  createProject: (req: ProjectCreateRequest) => electronAPI.ipcRenderer.invoke('project:create', req) as Promise<ProjectCreateResponse>,
  openProject: (req: ProjectOpenRequest) => electronAPI.ipcRenderer.invoke('project:open', req) as Promise<ProjectOpenResponse>,
  listProjects: () => electronAPI.ipcRenderer.invoke('project:list', {}) as Promise<ProjectListResponse>,
  deleteProject: (req: ProjectDeleteRequest) => electronAPI.ipcRenderer.invoke('project:delete', req) as Promise<void>,
  renameProject: (req: ProjectRenameRequest) => electronAPI.ipcRenderer.invoke('project:rename', req) as Promise<ProjectRenameResponse>,
  importMedia: (req: MediaImportRequest) => electronAPI.ipcRenderer.invoke('media:import', req) as Promise<unknown>,
  relocateMedia: (req: MediaRelocateRequest) => electronAPI.ipcRenderer.invoke('media:relocate', req) as Promise<unknown>,
  listTasks: () => electronAPI.ipcRenderer.invoke('tasks:list', {}) as Promise<unknown[]>,
  cancelTask: (taskId: string) => electronAPI.ipcRenderer.invoke('tasks:cancel', { taskId }) as Promise<void>,
  retryTask: (taskId: string) => electronAPI.ipcRenderer.invoke('tasks:retry', { taskId }) as Promise<void>
}

contextBridge.exposeInMainWorld('cineweave', api)
export type CineWeaveAPI = typeof api
