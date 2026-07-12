import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getInfo: (): Promise<{
    name: string; version: string; platform: string; arch: string
    electronVersion: string; nodeVersion: string; chromeVersion: string
  }> => electronAPI.ipcRenderer.invoke('app:getInfo', {}),

  selectProjectDirectory: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    electronAPI.ipcRenderer.invoke('dialog:selectProjectDirectory', {})
}

contextBridge.exposeInMainWorld('cineweave', api)
export type CineWeaveAPI = typeof api
