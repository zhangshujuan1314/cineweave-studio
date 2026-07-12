import { z } from 'zod'

export const appGetInfoSchema = z.object({}).strict()
export const selectProjectDirectorySchema = z.object({}).strict()

export type AppInfo = {
  name: string; version: string; platform: string; arch: string
  electronVersion: string; nodeVersion: string; chromeVersion: string
}
export type SelectProjectDirectoryResult = { canceled: boolean; filePaths: string[] }
export const IPC_CHANNELS = ['app:getInfo', 'dialog:selectProjectDirectory'] as const
export type IpcChannel = (typeof IPC_CHANNELS)[number]
