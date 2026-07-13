import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { appGetInfoSchema, selectProjectDirectorySchema } from '../shared/contracts/ipc'
import { registerProjectHandlers } from './ipc/project-handlers'
import { registerMediaHandlers } from './ipc/media-handlers'
import { registerTaskHandlers } from './ipc/task-handlers'
import { registerTimelineHandlers } from './ipc/timeline-handlers'
import { registerSegmentHandlers } from './ipc/segment-handlers'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1280, minHeight: 720,
    show: false, title: 'CineWeave Studio', backgroundColor: '#0B0D12',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  })
  win.on('ready-to-show', () => { win.show() })
  win.webContents.on('will-navigate', (_e, url) => { if (!url.startsWith('file://')) _e.preventDefault() })
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url).catch(() => {}); return { action: 'deny' } })
  win.webContents.on('will-redirect', (_e, url) => { if (/^javascript:/i.test(url)) _e.preventDefault() })
  win.webContents.on('render-process-gone', (_e, d) => { if (d.reason === 'crashed' || d.reason === 'oom') win.loadFile(join(__dirname, '../renderer/index.html')).catch(() => {}) })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

function registerPhase0Handlers(): void {
  ipcMain.handle('app:getInfo', (_e, payload: unknown) => {
    appGetInfoSchema.parse(payload)
    return { name: 'CineWeave Studio', version: app.getVersion(), platform: process.platform, arch: process.arch, electronVersion: process.versions.electron, nodeVersion: process.versions.node, chromeVersion: process.versions.chrome }
  })
  ipcMain.handle('dialog:selectProjectDirectory', async (_e, payload: unknown) => {
    selectProjectDirectorySchema.parse(payload)
    const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Select Project Directory' })
    return { canceled: r.canceled, filePaths: r.filePaths }
  })
  ipcMain.handle('dialog:selectSubtitleFile', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile'], title: 'Select Subtitle File', filters: [{ name: 'Subtitle Files', extensions: ['srt', 'vtt', 'ass', 'ssa'] }, { name: 'All Files', extensions: ['*'] }] })
    return { canceled: r.canceled, filePaths: r.filePaths }
  })
}

app.whenReady().then(() => {
  registerPhase0Handlers()
  registerProjectHandlers()
  registerMediaHandlers()
  registerTaskHandlers()
  registerTimelineHandlers()
  registerSegmentHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
