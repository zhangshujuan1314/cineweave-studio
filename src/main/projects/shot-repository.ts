import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'

export interface Shot {
  id: string
  projectId: string
  indexInProject: number
  startMs: number
  endMs: number
  thumbnailPath?: string
  label: string
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export class ShotRepository {
  constructor(private db: Database.Database) {}

  create(projectId: string, startMs: number, endMs: number, label = ''): Shot {
    const id = randomUUID()
    const now = Date.now()
    const maxIdx = this.db.prepare('SELECT COALESCE(MAX(index_in_project), -1) as idx FROM shots WHERE project_id = ?').get(projectId) as { idx: number }
    const index = maxIdx.idx + 1
    this.db.prepare(
      'INSERT INTO shots (id, project_id, index_in_project, start_ms, end_ms, label, notes, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, index, startMs, endMs, label, '', '[]', now, now)
    return { id, projectId, indexInProject: index, startMs, endMs, label, notes: '', tags: [], createdAt: now, updatedAt: now }
  }

  getByProject(projectId: string): Shot[] {
    const rows = this.db.prepare('SELECT * FROM shots WHERE project_id = ? ORDER BY start_ms').all(projectId) as Record<string, unknown>[]
    return rows.map(r => this.rowToShot(r))
  }

  getById(id: string): Shot | null {
    const row = this.db.prepare('SELECT * FROM shots WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToShot(row) : null
  }

  update(id: string, changes: Partial<Pick<Shot, 'startMs' | 'endMs' | 'label' | 'notes' | 'tags' | 'thumbnailPath'>>): Shot | null {
    const shot = this.getById(id)
    if (!shot) return null
    const now = Date.now()
    const startMs = changes.startMs ?? shot.startMs
    const endMs = changes.endMs ?? shot.endMs
    const label = changes.label ?? shot.label
    const notes = changes.notes ?? shot.notes
    const tags = changes.tags ?? shot.tags
    const thumbnailPath = changes.thumbnailPath ?? shot.thumbnailPath
    this.db.prepare(
      'UPDATE shots SET start_ms = ?, end_ms = ?, label = ?, notes = ?, tags_json = ?, thumbnail_path = ?, updated_at = ? WHERE id = ?'
    ).run(startMs, endMs, label, notes, JSON.stringify(tags), thumbnailPath, now, id)
    return { ...shot, startMs, endMs, label, notes, tags, thumbnailPath, updatedAt: now }
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM shots WHERE id = ?').run(id)
    return result.changes > 0
  }

  /** Split a shot at the given time, creating two shots */
  split(id: string, splitAtMs: number): [Shot, Shot] | null {
    const shot = this.getById(id)
    if (!shot || splitAtMs <= shot.startMs || splitAtMs >= shot.endMs) return null
    const now = Date.now()
    this.db.transaction(() => {
      this.db.prepare('UPDATE shots SET end_ms = ?, updated_at = ? WHERE id = ?').run(splitAtMs, now, id)
      const newId = randomUUID()
      this.db.prepare(
        'INSERT INTO shots (id, project_id, index_in_project, start_ms, end_ms, label, notes, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(newId, shot.projectId, shot.indexInProject + 1, splitAtMs, shot.endMs, shot.label, shot.notes, JSON.stringify(shot.tags), now, now)
    })()
    const updated = this.getById(id)
    const nextShot = this.db.prepare('SELECT * FROM shots WHERE project_id = ? AND start_ms = ?').get(shot.projectId, splitAtMs) as Record<string, unknown> | undefined
    if (!updated || !nextShot) return null
    return [updated, this.rowToShot(nextShot)]
  }

  /** Merge two adjacent shots */
  merge(id1: string, id2: string): Shot | null {
    const s1 = this.getById(id1)
    const s2 = this.getById(id2)
    if (!s1 || !s2 || s1.projectId !== s2.projectId) return null
    const startMs = Math.min(s1.startMs, s2.startMs)
    const endMs = Math.max(s1.endMs, s2.endMs)
    const now = Date.now()
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM shots WHERE id = ?').run(s1.startMs < s2.startMs ? id2 : id1)
      const keepId = s1.startMs < s2.startMs ? id1 : id2
      this.db.prepare('UPDATE shots SET start_ms = ?, end_ms = ?, updated_at = ? WHERE id = ?').run(startMs, endMs, now, keepId)
    })()
    return this.getById(s1.startMs < s2.startMs ? id1 : id2)
  }

  private rowToShot(row: Record<string, unknown>): Shot {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      indexInProject: row.index_in_project as number,
      startMs: row.start_ms as number,
      endMs: row.end_ms as number,
      thumbnailPath: row.thumbnail_path as string | undefined,
      label: (row.label as string) || '',
      notes: (row.notes as string) || '',
      tags: row.tags_json ? JSON.parse(row.tags_json as string) : [],
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  }
}
