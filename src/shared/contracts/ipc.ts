import { z } from 'zod'

// ── Path safety utilities ──────────────────────────────────────

/** Reject null bytes (injection vector) and ".." path segments (traversal). */
function isPathSafe(p: string): boolean {
  if (p.includes('\x00')) return false
  const segments = p.split(/[/\\]/)
  return !segments.some((seg) => seg === '..')
}

// ── Phase 0 channels ───────────────────────────────────────────

export const appGetInfoSchema = z.object({}).strict()
export const selectProjectDirectorySchema = z.object({}).strict()

// ── Phase 1: project channels ──────────────────────────────────

// --- project:create ---

export const projectCreateRequestSchema = z
  .object({
    title: z.string().min(1).max(255),
    basePath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
  })
  .strict()

export const projectCreateResponseSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  path: z.string(),
  schemaVersion: z.number(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

export type ProjectCreateRequest = z.infer<typeof projectCreateRequestSchema>
export type ProjectCreateResponse = z.infer<typeof projectCreateResponseSchema>

// --- project:open ---

export const projectOpenRequestSchema = z
  .object({
    projectPath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
  })
  .strict()

export const projectOpenResponseSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  path: z.string(),
  schemaVersion: z.number(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

export type ProjectOpenRequest = z.infer<typeof projectOpenRequestSchema>
export type ProjectOpenResponse = z.infer<typeof projectOpenResponseSchema>

// --- project:list ---

export const projectListRequestSchema = z.object({}).strict()

export const projectListItemSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  path: z.string(),
  lastOpenedAt: z.number().int().positive(),
})

export const projectListResponseSchema = z.array(projectListItemSchema)

export type ProjectListRequest = z.infer<typeof projectListRequestSchema>
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>

// --- project:delete ---

export const projectDeleteRequestSchema = z
  .object({
    projectPath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
  })
  .strict()

export const projectDeleteResponseSchema = z.object({
  success: z.boolean(),
})

export type ProjectDeleteRequest = z.infer<typeof projectDeleteRequestSchema>
export type ProjectDeleteResponse = z.infer<typeof projectDeleteResponseSchema>

// --- project:rename ---

export const projectRenameRequestSchema = z
  .object({
    projectPath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
    newTitle: z.string().min(1).max(255),
  })
  .strict()

export const projectRenameResponseSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  updatedAt: z.number().int().positive(),
})

export type ProjectRenameRequest = z.infer<typeof projectRenameRequestSchema>
export type ProjectRenameResponse = z.infer<typeof projectRenameResponseSchema>

// --- project:copy ---

export const projectCopyRequestSchema = z
  .object({
    sourcePath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
    destPath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
    newTitle: z.string().min(1).max(255).optional(),
  })
  .strict()

export type ProjectCopyRequest = z.infer<typeof projectCopyRequestSchema>
// Same response shape as project:create (the copy is a new project)
export type ProjectCopyResponse = ProjectCreateResponse

// --- project:scan ---

export const projectScanRequestSchema = z
  .object({
    directoryPath: z
      .string()
      .min(1)
      .refine(isPathSafe, { message: 'Path must not contain null bytes or ".." traversal' }),
  })
  .strict()

export type ProjectScanRequest = z.infer<typeof projectScanRequestSchema>
// Same response shape as project:list (array of found projects)
export type ProjectScanResponse = ProjectListResponse

// ── Phase 0 types ───────────────────────────────────────────────

export type AppInfo = {
  name: string; version: string; platform: string; arch: string
  electronVersion: string; nodeVersion: string; chromeVersion: string
}

export type SelectProjectDirectoryResult = {
  canceled: boolean
  filePaths: string[]
}

// ── Channel whitelist ──────────────────────────────────────────

export const IPC_CHANNELS = [
  'app:getInfo',
  'dialog:selectProjectDirectory',
  'project:create',
  'project:open',
  'project:list',
  'project:delete',
  'project:rename',
  'project:copy',
  'project:scan',
] as const

export type IpcChannel = (typeof IPC_CHANNELS)[number]
