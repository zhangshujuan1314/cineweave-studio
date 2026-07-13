import { ipcMain } from 'electron'
import { z } from 'zod'
import { ShotRepository } from '../projects/shot-repository'
import { SubtitleRepository } from '../projects/subtitle-repository'
import { MarkerRepository } from '../projects/marker-repository'
import { getProjectRepository } from '../projects/repository'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { parseSubtitles } from '../../shared/media/subtitles'

function getProjectDb(): { db: Database.Database; projectId: string; projectPath: string } {
  const projects = getProjectRepository().listProjects()
  if (projects.length === 0) throw new Error('No project open')
  const projectPath = projects[0].path
  const dbPath = join(projectPath, 'project.sqlite')
  if (!existsSync(dbPath)) throw new Error('Project database not found')
  return { db: new Database(dbPath), projectId: projects[0].projectId, projectPath }
}

// Schemas
const shotCreateSchema = z.object({ startMs: z.number().min(0), endMs: z.number().min(0), label: z.string().optional() }).strict()
const shotUpdateSchema = z.object({ id: z.string().uuid(), startMs: z.number().min(0).optional(), endMs: z.number().min(0).optional(), label: z.string().optional(), notes: z.string().optional() }).strict()
const shotDeleteSchema = z.object({ id: z.string().uuid() }).strict()
const shotSplitSchema = z.object({ id: z.string().uuid(), splitAtMs: z.number().min(0) }).strict()
const shotMergeSchema = z.object({ id1: z.string().uuid(), id2: z.string().uuid() }).strict()

const subtitleImportSchema = z.object({ filePath: z.string().min(1), language: z.string().optional() }).strict()
const subtitleUpdateSchema = z.object({ id: z.string().uuid(), startMs: z.number().min(0).optional(), endMs: z.number().min(0).optional(), text: z.string().optional(), speaker: z.string().optional(), notes: z.string().optional() }).strict()
const subtitleDeleteSchema = z.object({ id: z.string().uuid() }).strict()
const subtitleOffsetSchema = z.object({ offsetMs: z.number() }).strict()

const markerCreateSchema = z.object({ timeMs: z.number().min(0), type: z.enum(['note', 'emotion', 'beat', 'custom']).optional(), label: z.string().optional(), color: z.string().optional(), notes: z.string().optional() }).strict()
const markerUpdateSchema = z.object({ id: z.string().uuid(), timeMs: z.number().min(0).optional(), type: z.enum(['note', 'emotion', 'beat', 'custom']).optional(), label: z.string().optional(), color: z.string().optional(), notes: z.string().optional() }).strict()
const markerDeleteSchema = z.object({ id: z.string().uuid() }).strict()

export function registerTimelineHandlers(): void {
  // ── Shots ──────────────────────────────────────────────────
  ipcMain.handle('shots:list', () => {
    const { db, projectId } = getProjectDb()
    try { return new ShotRepository(db).getByProject(projectId) } finally { db.close() }
  })

  ipcMain.handle('shots:create', (_e, payload: unknown) => {
    const p = shotCreateSchema.parse(payload)
    const { db, projectId } = getProjectDb()
    try { return new ShotRepository(db).create(projectId, p.startMs, p.endMs, p.label) } finally { db.close() }
  })

  ipcMain.handle('shots:update', (_e, payload: unknown) => {
    const p = shotUpdateSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new ShotRepository(db).update(p.id, p) } finally { db.close() }
  })

  ipcMain.handle('shots:delete', (_e, payload: unknown) => {
    const p = shotDeleteSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new ShotRepository(db).delete(p.id) } finally { db.close() }
  })

  ipcMain.handle('shots:split', (_e, payload: unknown) => {
    const p = shotSplitSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new ShotRepository(db).split(p.id, p.splitAtMs) } finally { db.close() }
  })

  ipcMain.handle('shots:merge', (_e, payload: unknown) => {
    const p = shotMergeSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new ShotRepository(db).merge(p.id1, p.id2) } finally { db.close() }
  })

  // ── Subtitles ──────────────────────────────────────────────
  ipcMain.handle('subtitles:list', () => {
    const { db, projectId } = getProjectDb()
    try { return new SubtitleRepository(db).getByProject(projectId) } finally { db.close() }
  })

  ipcMain.handle('subtitles:import', (_e, payload: unknown) => {
    const p = subtitleImportSchema.parse(payload)
    if (!existsSync(p.filePath)) throw new Error('File not found')
    const content = readFileSync(p.filePath, 'utf-8')
    const entries = parseSubtitles(content)
    if (entries.length === 0) throw new Error('No subtitles found in file')
    const { db, projectId } = getProjectDb()
    try {
      const repo = new SubtitleRepository(db)
      const source = p.filePath.endsWith('.srt') || p.filePath.endsWith('.vtt') || p.filePath.endsWith('.ass') ? 'imported' as const : 'embedded' as const
      return repo.importEntries(projectId, entries, source, p.language)
    } finally { db.close() }
  })

  ipcMain.handle('subtitles:update', (_e, payload: unknown) => {
    const p = subtitleUpdateSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new SubtitleRepository(db).update(p.id, p) } finally { db.close() }
  })

  ipcMain.handle('subtitles:delete', (_e, payload: unknown) => {
    const p = subtitleDeleteSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new SubtitleRepository(db).delete(p.id) } finally { db.close() }
  })

  ipcMain.handle('subtitles:offset', (_e, payload: unknown) => {
    const p = subtitleOffsetSchema.parse(payload)
    const { db, projectId } = getProjectDb()
    try { return new SubtitleRepository(db).applyOffset(projectId, p.offsetMs) } finally { db.close() }
  })

  // ── Markers ────────────────────────────────────────────────
  ipcMain.handle('markers:list', () => {
    const { db, projectId } = getProjectDb()
    try { return new MarkerRepository(db).getByProject(projectId) } finally { db.close() }
  })

  ipcMain.handle('markers:create', (_e, payload: unknown) => {
    const p = markerCreateSchema.parse(payload)
    const { db, projectId } = getProjectDb()
    try { return new MarkerRepository(db).create(projectId, p.timeMs, p.type, p.label, p.color, p.notes) } finally { db.close() }
  })

  ipcMain.handle('markers:update', (_e, payload: unknown) => {
    const p = markerUpdateSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new MarkerRepository(db).update(p.id, p) } finally { db.close() }
  })

  ipcMain.handle('markers:delete', (_e, payload: unknown) => {
    const p = markerDeleteSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new MarkerRepository(db).delete(p.id) } finally { db.close() }
  })
}
