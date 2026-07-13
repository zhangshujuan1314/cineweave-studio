import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'

export interface Segment {
  id: string
  projectId: string
  parentId?: string
  kind: 'act' | 'sequence' | 'scene' | 'beat'
  title: string
  startMs: number
  endMs: number
  indexInParent: number
  function: string
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export class SegmentRepository {
  constructor(private db: Database.Database) {}

  create(projectId: string, kind: Segment['kind'], startMs: number, endMs: number, opts: Partial<Pick<Segment, 'parentId' | 'title' | 'function' | 'notes'>> = {}): Segment {
    const id = randomUUID()
    const now = Date.now()
    const maxIdx = this.db.prepare('SELECT COALESCE(MAX(index_in_parent), -1) as idx FROM segments WHERE project_id = ? AND parent_id IS ?').get(projectId, opts.parentId || null) as { idx: number }
    this.db.prepare(
      'INSERT INTO segments (id, project_id, parent_id, kind, title, start_ms, end_ms, index_in_parent, function, notes, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, opts.parentId || null, kind, opts.title || '', startMs, endMs, maxIdx.idx + 1, opts.function || '', opts.notes || '', '[]', now, now)
    return { id, projectId, parentId: opts.parentId, kind, title: opts.title || '', startMs, endMs, indexInParent: maxIdx.idx + 1, function: opts.function || '', notes: opts.notes || '', tags: [], createdAt: now, updatedAt: now }
  }

  getByProject(projectId: string): Segment[] {
    return (this.db.prepare('SELECT * FROM segments WHERE project_id = ? ORDER BY start_ms').all(projectId) as Record<string, unknown>[]).map(r => this.rowToSegment(r))
  }

  getByKind(projectId: string, kind: Segment['kind']): Segment[] {
    return (this.db.prepare('SELECT * FROM segments WHERE project_id = ? AND kind = ? ORDER BY start_ms').all(projectId, kind) as Record<string, unknown>[]).map(r => this.rowToSegment(r))
  }

  getChildren(parentId: string): Segment[] {
    return (this.db.prepare('SELECT * FROM segments WHERE parent_id = ? ORDER BY index_in_parent').all(parentId) as Record<string, unknown>[]).map(r => this.rowToSegment(r))
  }

  getTree(projectId: string): Segment[] {
    return (this.db.prepare('SELECT * FROM segments WHERE project_id = ? ORDER BY start_ms, index_in_parent').all(projectId) as Record<string, unknown>[]).map(r => this.rowToSegment(r))
  }

  getById(id: string): Segment | null {
    const row = this.db.prepare('SELECT * FROM segments WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToSegment(row) : null
  }

  update(id: string, changes: Partial<Pick<Segment, 'title' | 'function' | 'notes' | 'tags' | 'startMs' | 'endMs' | 'parentId'>>): Segment | null {
    const seg = this.getById(id)
    if (!seg) return null
    const now = Date.now()
    const title = changes.title ?? seg.title
    const fn = changes.function ?? seg.function
    const notes = changes.notes ?? seg.notes
    const tags = changes.tags ?? seg.tags
    const startMs = changes.startMs ?? seg.startMs
    const endMs = changes.endMs ?? seg.endMs
    const parentId = changes.parentId !== undefined ? changes.parentId : seg.parentId
    this.db.prepare('UPDATE segments SET title = ?, function = ?, notes = ?, tags_json = ?, start_ms = ?, end_ms = ?, parent_id = ?, updated_at = ? WHERE id = ?')
      .run(title, fn, notes, JSON.stringify(tags), startMs, endMs, parentId || null, now, id)
    return { ...seg, title, function: fn, notes, tags, startMs, endMs, parentId, updatedAt: now }
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM segments WHERE id = ?').run(id).changes > 0
  }

  /** Assign a shot to a segment */
  assignShot(shotId: string, segmentId: string): void {
    this.db.prepare('UPDATE shots SET segment_id = ?, updated_at = ? WHERE id = ?').run(segmentId, Date.now(), shotId)
  }

  /** Get all segments overlapping a time range */
  getOverlapping(projectId: string, startMs: number, endMs: number): Segment[] {
    return (this.db.prepare('SELECT * FROM segments WHERE project_id = ? AND start_ms < ? AND end_ms > ? ORDER BY start_ms').all(projectId, endMs, startMs) as Record<string, unknown>[]).map(r => this.rowToSegment(r))
  }

  private rowToSegment(row: Record<string, unknown>): Segment {
    return {
      id: row.id as string, projectId: row.project_id as string, parentId: row.parent_id as string | undefined,
      kind: row.kind as Segment['kind'], title: (row.title as string) || '', startMs: row.start_ms as number, endMs: row.end_ms as number,
      indexInParent: row.index_in_parent as number, function: (row.function as string) || '', notes: (row.notes as string) || '',
      tags: row.tags_json ? JSON.parse(row.tags_json as string) : [], createdAt: row.created_at as number, updatedAt: row.updated_at as number
    }
  }
}
