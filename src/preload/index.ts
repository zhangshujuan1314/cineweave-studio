import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ProjectCreateRequest, ProjectCreateResponse,
  ProjectOpenRequest, ProjectOpenResponse,
  ProjectListResponse,
  ProjectDeleteRequest,
  ProjectRenameRequest, ProjectRenameResponse,
  ProjectCopyRequest, ProjectCopyResponse,
  ProjectScanRequest, ProjectScanResponse,
} from '../shared/contracts'

const api = {
  getInfo: (): Promise<{ name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string }> =>
    electronAPI.ipcRenderer.invoke('app:getInfo', {}),

  selectProjectDirectory: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    electronAPI.ipcRenderer.invoke('dialog:selectProjectDirectory', {}),

  createProject: (req: ProjectCreateRequest): Promise<ProjectCreateResponse> =>
    electronAPI.ipcRenderer.invoke('project:create', req),

  openProject: (req: ProjectOpenRequest): Promise<ProjectOpenResponse> =>
    electronAPI.ipcRenderer.invoke('project:open', req),

  listProjects: (): Promise<ProjectListResponse> =>
    electronAPI.ipcRenderer.invoke('project:list', {}),

  deleteProject: (req: ProjectDeleteRequest): Promise<void> =>
    electronAPI.ipcRenderer.invoke('project:delete', req),

  renameProject: (req: ProjectRenameRequest): Promise<ProjectRenameResponse> =>
    electronAPI.ipcRenderer.invoke('project:rename', req),

  copyProject: (req: ProjectCopyRequest): Promise<ProjectCopyResponse> =>
    electronAPI.ipcRenderer.invoke('project:copy', req),

  scanDirectory: (req: ProjectScanRequest): Promise<ProjectScanResponse> =>
    electronAPI.ipcRenderer.invoke('project:scan', req),
}

contextBridge.exposeInMainWorld('cineweave', api)
export type CineWeaveAPI = typeof api
