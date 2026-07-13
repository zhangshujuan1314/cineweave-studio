import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // App
  getInfo: () => electronAPI.ipcRenderer.invoke('app:getInfo', {}),
  selectProjectDirectory: () => electronAPI.ipcRenderer.invoke('dialog:selectProjectDirectory', {}),
  selectSubtitleFile: () => electronAPI.ipcRenderer.invoke('dialog:selectSubtitleFile'),

  // Projects
  createProject: (req: { title: string; basePath: string }) => electronAPI.ipcRenderer.invoke('project:create', req),
  openProject: (req: { projectPath: string }) => electronAPI.ipcRenderer.invoke('project:open', req),
  listProjects: () => electronAPI.ipcRenderer.invoke('project:list', {}),
  deleteProject: (req: { projectPath: string }) => electronAPI.ipcRenderer.invoke('project:delete', req),
  renameProject: (req: { projectPath: string; newTitle: string }) => electronAPI.ipcRenderer.invoke('project:rename', req),

  // Media
  importMedia: (req: { filePath: string }) => electronAPI.ipcRenderer.invoke('media:import', req),
  relocateMedia: (req: { assetId: string; newPath: string }) => electronAPI.ipcRenderer.invoke('media:relocate', req),

  // Tasks
  listTasks: () => electronAPI.ipcRenderer.invoke('tasks:list', {}),
  cancelTask: (taskId: string) => electronAPI.ipcRenderer.invoke('tasks:cancel', { taskId }),
  retryTask: (taskId: string) => electronAPI.ipcRenderer.invoke('tasks:retry', { taskId }),

  // Shots
  listShots: () => electronAPI.ipcRenderer.invoke('shots:list', {}),
  createShot: (req: { startMs: number; endMs: number; label?: string }) => electronAPI.ipcRenderer.invoke('shots:create', req),
  updateShot: (req: { id: string; startMs?: number; endMs?: number; label?: string; notes?: string }) => electronAPI.ipcRenderer.invoke('shots:update', req),
  deleteShot: (id: string) => electronAPI.ipcRenderer.invoke('shots:delete', { id }),
  splitShot: (id: string, splitAtMs: number) => electronAPI.ipcRenderer.invoke('shots:split', { id, splitAtMs }),
  mergeShots: (id1: string, id2: string) => electronAPI.ipcRenderer.invoke('shots:merge', { id1, id2 }),

  // Subtitles
  listSubtitles: () => electronAPI.ipcRenderer.invoke('subtitles:list', {}),
  importSubtitles: (req: { filePath: string; language?: string }) => electronAPI.ipcRenderer.invoke('subtitles:import', req),
  updateSubtitle: (req: { id: string; startMs?: number; endMs?: number; text?: string; speaker?: string; notes?: string }) => electronAPI.ipcRenderer.invoke('subtitles:update', req),
  deleteSubtitle: (id: string) => electronAPI.ipcRenderer.invoke('subtitles:delete', { id }),
  offsetSubtitles: (offsetMs: number) => electronAPI.ipcRenderer.invoke('subtitles:offset', { offsetMs }),

  // Markers
  listMarkers: () => electronAPI.ipcRenderer.invoke('markers:list', {}),
  createMarker: (req: { timeMs: number; type?: string; label?: string; color?: string; notes?: string }) => electronAPI.ipcRenderer.invoke('markers:create', req),
  updateMarker: (req: { id: string; timeMs?: number; type?: string; label?: string; color?: string; notes?: string }) => electronAPI.ipcRenderer.invoke('markers:update', req),
  deleteMarker: (id: string) => electronAPI.ipcRenderer.invoke('markers:delete', { id }),
}

contextBridge.exposeInMainWorld('cineweave', api)
export type CineWeaveAPI = typeof api
