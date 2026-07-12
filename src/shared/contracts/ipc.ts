import { z } from 'zod'

function isPathSafe(p: string): boolean {
  if (p.indexOf('\x00') !== -1) return false
  if (p.indexOf('..') !== -1) return false
  return true
}

// Phase 0
export const appGetInfoSchema = z.object({}).strict()
export const selectProjectDirectorySchema = z.object({}).strict()

// Phase 1: projects
export const projectCreateRequestSchema = z.object({ title: z.string().min(1).max(255), basePath: z.string().min(1).refine(isPathSafe) }).strict()
export const projectCreateResponseSchema = z.object({ projectId: z.string().uuid(), title: z.string(), path: z.string(), schemaVersion: z.number(), createdAt: z.number(), updatedAt: z.number() })
export type ProjectCreateRequest = z.infer<typeof projectCreateRequestSchema>
export type ProjectCreateResponse = z.infer<typeof projectCreateResponseSchema>

export const projectOpenRequestSchema = z.object({ projectPath: z.string().min(1).refine(isPathSafe) }).strict()
export const projectOpenResponseSchema = z.object({ projectId: z.string().uuid(), title: z.string(), path: z.string(), schemaVersion: z.number(), createdAt: z.number(), updatedAt: z.number() })
export type ProjectOpenRequest = z.infer<typeof projectOpenRequestSchema>
export type ProjectOpenResponse = z.infer<typeof projectOpenResponseSchema>

export const projectListRequestSchema = z.object({}).strict()
export const projectListItemSchema = z.object({ projectId: z.string().uuid(), title: z.string(), path: z.string(), lastOpenedAt: z.number() })
export const projectListResponseSchema = z.array(projectListItemSchema)
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>

export const projectDeleteRequestSchema = z.object({ projectPath: z.string().min(1).refine(isPathSafe) }).strict()
export type ProjectDeleteRequest = z.infer<typeof projectDeleteRequestSchema>

export const projectRenameRequestSchema = z.object({ projectPath: z.string().min(1).refine(isPathSafe), newTitle: z.string().min(1).max(255) }).strict()
export const projectRenameResponseSchema = z.object({ projectId: z.string().uuid(), title: z.string(), updatedAt: z.number() })
export type ProjectRenameRequest = z.infer<typeof projectRenameRequestSchema>
export type ProjectRenameResponse = z.infer<typeof projectRenameResponseSchema>

// Phase 2: media + tasks
export const mediaImportRequestSchema = z.object({ filePath: z.string().min(1).refine(isPathSafe) }).strict()
export type MediaImportRequest = z.infer<typeof mediaImportRequestSchema>

export const mediaRelocateRequestSchema = z.object({ assetId: z.string().uuid(), newPath: z.string().min(1).refine(isPathSafe) }).strict()
export type MediaRelocateRequest = z.infer<typeof mediaRelocateRequestSchema>

export const taskListRequestSchema = z.object({}).strict()
export const taskCancelRequestSchema = z.object({ taskId: z.string().uuid() }).strict()
export const taskRetryRequestSchema = z.object({ taskId: z.string().uuid() }).strict()

// Types
export type AppInfo = { name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string }
export type SelectProjectDirectoryResult = { canceled: boolean; filePaths: string[] }

// Whitelist
export const IPC_CHANNELS = [
  'app:getInfo', 'dialog:selectProjectDirectory',
  'project:create', 'project:open', 'project:list', 'project:delete', 'project:rename',
  'media:import', 'media:relocate',
  'tasks:list', 'tasks:cancel', 'tasks:retry'
] as const
export type IpcChannel = (typeof IPC_CHANNELS)[number]
