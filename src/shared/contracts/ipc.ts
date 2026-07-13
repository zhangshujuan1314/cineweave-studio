import { z } from 'zod'

function isPathSafe(p: string): boolean { return p.indexOf('\x00') === -1 && p.indexOf('..') === -1 }

export const appGetInfoSchema = z.object({}).strict()
export const selectProjectDirectorySchema = z.object({}).strict()

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

export const mediaImportRequestSchema = z.object({ filePath: z.string().min(1).refine(isPathSafe) }).strict()
export type MediaImportRequest = z.infer<typeof mediaImportRequestSchema>
export const mediaRelocateRequestSchema = z.object({ assetId: z.string().uuid(), newPath: z.string().min(1).refine(isPathSafe) }).strict()
export type MediaRelocateRequest = z.infer<typeof mediaRelocateRequestSchema>

export const taskListRequestSchema = z.object({}).strict()
export const taskCancelRequestSchema = z.object({ taskId: z.string().uuid() }).strict()
export const taskRetryRequestSchema = z.object({ taskId: z.string().uuid() }).strict()

export const shotCreateRequestSchema = z.object({ startMs: z.number().min(0), endMs: z.number().min(0), label: z.string().optional() }).strict()
export const shotUpdateRequestSchema = z.object({ id: z.string().uuid(), startMs: z.number().min(0).optional(), endMs: z.number().min(0).optional(), label: z.string().optional(), notes: z.string().optional() }).strict()
export const shotDeleteRequestSchema = z.object({ id: z.string().uuid() }).strict()
export const shotSplitRequestSchema = z.object({ id: z.string().uuid(), splitAtMs: z.number().min(0) }).strict()
export const shotMergeRequestSchema = z.object({ id1: z.string().uuid(), id2: z.string().uuid() }).strict()

export const subtitleImportRequestSchema = z.object({ filePath: z.string().min(1).refine(isPathSafe), language: z.string().optional() }).strict()
export const subtitleUpdateRequestSchema = z.object({ id: z.string().uuid(), startMs: z.number().min(0).optional(), endMs: z.number().min(0).optional(), text: z.string().optional(), speaker: z.string().optional(), notes: z.string().optional() }).strict()
export const subtitleDeleteRequestSchema = z.object({ id: z.string().uuid() }).strict()
export const subtitleOffsetRequestSchema = z.object({ offsetMs: z.number() }).strict()

export const markerCreateRequestSchema = z.object({ timeMs: z.number().min(0), type: z.enum(['note','emotion','beat','custom']).optional(), label: z.string().optional(), color: z.string().optional(), notes: z.string().optional() }).strict()
export const markerUpdateRequestSchema = z.object({ id: z.string().uuid(), timeMs: z.number().min(0).optional(), type: z.enum(['note','emotion','beat','custom']).optional(), label: z.string().optional(), color: z.string().optional(), notes: z.string().optional() }).strict()
export const markerDeleteRequestSchema = z.object({ id: z.string().uuid() }).strict()

export const IPC_CHANNELS = [
  'app:getInfo', 'dialog:selectProjectDirectory', 'dialog:selectSubtitleFile',
  'project:create', 'project:open', 'project:list', 'project:delete', 'project:rename',
  'media:import', 'media:relocate',
  'tasks:list', 'tasks:cancel', 'tasks:retry',
  'shots:list', 'shots:create', 'shots:update', 'shots:delete', 'shots:split', 'shots:merge',
  'subtitles:list', 'subtitles:import', 'subtitles:update', 'subtitles:delete', 'subtitles:offset',
  'markers:list', 'markers:create', 'markers:update', 'markers:delete',
  'segments:list', 'segments:tree', 'segments:create', 'segments:update', 'segments:delete', 'segments:assignShot',
  'storylines:list', 'storylines:create', 'storylines:update', 'storylines:delete', 'storylines:addSegment', 'storylines:removeSegment'
] as const
export type IpcChannel = (typeof IPC_CHANNELS)[number]
export type AppInfo = { name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string }
export type SelectProjectDirectoryResult = { canceled: boolean; filePaths: string[] }
