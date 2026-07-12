import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { appGetInfoSchema, selectProjectDirectorySchema } from '../shared/contracts/ipc'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1280, minHeight: 720,
    show: false,
    title: 'CineWeave Studio',
    backgroundColor: '#0B0D12',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })

  win.on('ready-to-show', () => { win.show() })

  win.webContents.on('will-navigate', (_event, url) => {
    if (!url.startsWith('file://')) _event.preventDefault()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url).catch(() => {})
    return { action: 'deny' }
  })

  win.webContents.on('will-redirect', (_event, url) => {
    if (/^javascript:/i.test(url)) _event.preventDefault()
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason, details.exitCode)
    if (details.reason === 'crashed' || details.reason === 'oom') {
      win.loadFile(join(__dirname, '../renderer/index.html')).catch(() => {})
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

function registerIpcHandlers(): void {
  ipcMain.handle('app:getInfo', (_event, payload: unknown) => {
    const parsed = appGetInfoSchema.safeParse(payload)
    if (!parsed.success) throw new Error(`Invalid IPC input for app:getInfo: ${parsed.error.message}`)
    return {
      name: 'CineWeave Studio', version: app.getVersion(),
      platform: process.platform, arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node, chromeVersion: process.versions.chrome
    }
  })

  ipcMain.handle('dialog:selectProjectDirectory', async (_event, payload: unknown) => {
    const parsed = selectProjectDirectorySchema.safeParse(payload)
    if (!parsed.success) throw new Error(`Invalid IPC input for dialog:selectProjectDirectory: ${parsed.error.message}`)
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Project Directory'
    })
    return { canceled: result.canceled, filePaths: result.filePaths }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
