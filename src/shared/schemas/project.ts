import { z } from 'zod'

export const PROJECT_SCHEMA_VERSION = 1

export const ManifestSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(256),
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

export type ProjectManifest = z.infer<typeof ManifestSchema>

export const ProjectEntrySchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  path: z.string(),
  lastOpenedAt: z.number().int().positive(),
})

export type ProjectEntry = z.infer<typeof ProjectEntrySchema>

export const RegistrySchema = z.object({
  projects: z.array(ProjectEntrySchema),
})

export type Registry = z.infer<typeof RegistrySchema>

export const CreateProjectOptionsSchema = z.object({
  basePath: z.string().min(1),
  title: z.string().min(1).max(256),
})

export const CopyProjectOptionsSchema = z.object({
  sourcePath: z.string().min(1),
  destPath: z.string().min(1),
  newTitle: z.string().min(1).max(256).optional(),
})

export const RenameProjectOptionsSchema = z.object({
  projectPath: z.string().min(1),
  newTitle: z.string().min(1).max(256),
})

export const ProjectErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'PERMISSION_DENIED',
  'SCHEMA_MISMATCH',
  'MANIFEST_MISSING',
  'MANIFEST_INVALID',
  'DATABASE_MISSING',
  'DATABASE_CORRUPT',
  'IO_ERROR',
  'UNKNOWN',
])

export type ProjectErrorCode = z.infer<typeof ProjectErrorCodeSchema>

export class ProjectError extends Error {
  constructor(
    public readonly code: ProjectErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ProjectError'
  }
}

export function sanitizeDirName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, 240)
    || 'Untitled'
}
