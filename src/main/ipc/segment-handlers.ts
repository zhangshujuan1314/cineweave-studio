import { ipcMain } from 'electron'
import { z } from 'zod'
import { SegmentRepository } from '../projects/segment-repository'
import { StorylineRepository } from '../projects/storyline-repository'
import { getProjectRepository } from '../projects/repository'
import { existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'

function getProjectDb(): { db: Database.Database; projectId: string } {
  const projects = getProjectRepository().listProjects()
  if (projects.length === 0) throw new Error('No project open')
  const dbPath = join(projects[0].path, 'project.sqlite')
  if (!existsSync(dbPath)) throw new Error('Project database not found')
  return { db: new Database(dbPath), projectId: projects[0].projectId }
}

const segCreateSchema = z.object({ kind: z.enum(['act','sequence','scene','beat']), startMs: z.number().min(0), endMs: z.number().min(0), parentId: z.string().uuid().optional(), title: z.string().optional(), function: z.string().optional(), notes: z.string().optional() }).strict()
const segUpdateSchema = z.object({ id: z.string().uuid(), title: z.string().optional(), function: z.string().optional(), notes: z.string().optional(), startMs: z.number().min(0).optional(), endMs: z.number().min(0).optional(), parentId: z.string().uuid().optional() }).strict()
const segDeleteSchema = z.object({ id: z.string().uuid() }).strict()
const segAssignShotSchema = z.object({ shotId: z.string().uuid(), segmentId: z.string().uuid() }).strict()

const slCreateSchema = z.object({ name: z.string().min(1), description: z.string().optional(), color: z.string().optional() }).strict()
const slUpdateSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).optional(), description: z.string().optional(), color: z.string().optional() }).strict()
const slDeleteSchema = z.object({ id: z.string().uuid() }).strict()
const slAddSegSchema = z.object({ storylineId: z.string().uuid(), segmentId: z.string().uuid() }).strict()
const slRemoveSegSchema = z.object({ storylineId: z.string().uuid(), segmentId: z.string().uuid() }).strict()

export function registerSegmentHandlers(): void {
  ipcMain.handle('segments:list', () => {
    const { db, projectId } = getProjectDb()
    try { return new SegmentRepository(db).getByProject(projectId) } finally { db.close() }
  })
  ipcMain.handle('segments:tree', () => {
    const { db, projectId } = getProjectDb()
    try { return new SegmentRepository(db).getTree(projectId) } finally { db.close() }
  })
  ipcMain.handle('segments:create', (_e, payload: unknown) => {
    const p = segCreateSchema.parse(payload)
    const { db, projectId } = getProjectDb()
    try { return new SegmentRepository(db).create(projectId, p.kind, p.startMs, p.endMs, p) } finally { db.close() }
  })
  ipcMain.handle('segments:update', (_e, payload: unknown) => {
    const p = segUpdateSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new SegmentRepository(db).update(p.id, p) } finally { db.close() }
  })
  ipcMain.handle('segments:delete', (_e, payload: unknown) => {
    const p = segDeleteSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new SegmentRepository(db).delete(p.id) } finally { db.close() }
  })
  ipcMain.handle('segments:assignShot', (_e, payload: unknown) => {
    const p = segAssignShotSchema.parse(payload)
    const { db } = getProjectDb()
    try { new SegmentRepository(db).assignShot(p.shotId, p.segmentId) } finally { db.close() }
  })

  ipcMain.handle('storylines:list', () => {
    const { db, projectId } = getProjectDb()
    try { return new StorylineRepository(db).getByProject(projectId) } finally { db.close() }
  })
  ipcMain.handle('storylines:create', (_e, payload: unknown) => {
    const p = slCreateSchema.parse(payload)
    const { db, projectId } = getProjectDb()
    try { return new StorylineRepository(db).create(projectId, p.name, p.description, p.color) } finally { db.close() }
  })
  ipcMain.handle('storylines:update', (_e, payload: unknown) => {
    const p = slUpdateSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new StorylineRepository(db).update(p.id, p) } finally { db.close() }
  })
  ipcMain.handle('storylines:delete', (_e, payload: unknown) => {
    const p = slDeleteSchema.parse(payload)
    const { db } = getProjectDb()
    try { return new StorylineRepository(db).delete(p.id) } finally { db.close() }
  })
  ipcMain.handle('storylines:addSegment', (_e, payload: unknown) => {
    const p = slAddSegSchema.parse(payload)
    const { db } = getProjectDb()
    try { new StorylineRepository(db).addSegment(p.storylineId, p.segmentId) } finally { db.close() }
  })
  ipcMain.handle('storylines:removeSegment', (_e, payload: unknown) => {
    const p = slRemoveSegSchema.parse(payload)
    const { db } = getProjectDb()
    try { new StorylineRepository(db).removeSegment(p.storylineId, p.segmentId) } finally { db.close() }
  })
}
