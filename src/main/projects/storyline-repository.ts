import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'

export interface Storyline {
  id: string
  projectId: string
  name: string
  description: string
  color?: string
  segmentIds: string[]
  createdAt: number
  updatedAt: number
}

export class StorylineRepository {
  constructor(private db: Database.Database) {}

  create(projectId: string, name: string, description = '', color?: string): Storyline {
    const id = randomUUID()
    const now = Date.now()
    this.db.prepare('INSERT INTO storylines (id, project_id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, projectId, name, description, color || null, now, now)
    return { id, projectId, name, description, color, segmentIds: [], createdAt: now, updatedAt: now }
  }

  getByProject(projectId: string): Storyline[] {
    const rows = this.db.prepare('SELECT * FROM storylines WHERE project_id = ? ORDER BY created_at').all(projectId) as Record<string, unknown>[]
    return rows.map(r => this.rowToStoryline(r))
  }

  getById(id: string): Storyline | null {
    const row = this.db.prepare('SELECT * FROM storylines WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToStoryline(row) : null
  }

  update(id: string, changes: Partial<Pick<Storyline, 'name' | 'description' | 'color'>>): Storyline | null {
    const sl = this.getById(id)
    if (!sl) return null
    const now = Date.now()
    const name = changes.name ?? sl.name
    const description = changes.description ?? sl.description
    const color = changes.color !== undefined ? changes.color : sl.color
    this.db.prepare('UPDATE storylines SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?')
      .run(name, description, color || null, now, id)
    return { ...sl, name, description, color, updatedAt: now }
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM storylines WHERE id = ?').run(id).changes > 0
  }

  /** Add a segment to a storyline (many-to-many) */
  addSegment(storylineId: string, segmentId: string): void {
    const id = randomUUID()
    this.db.prepare('INSERT OR IGNORE INTO storyline_segments (id, storyline_id, segment_id, created_at) VALUES (?, ?, ?, ?)')
      .run(id, storylineId, segmentId, Date.now())
  }

  /** Remove a segment from a storyline */
  removeSegment(storylineId: string, segmentId: string): boolean {
    return this.db.prepare('DELETE FROM storyline_segments WHERE storyline_id = ? AND segment_id = ?').run(storylineId, segmentId).changes > 0
  }

  /** Get all segment IDs for a storyline */
  getSegmentIds(storylineId: string): string[] {
    return (this.db.prepare('SELECT segment_id FROM storyline_segments WHERE storyline_id = ?').all(storylineId) as Array<{ segment_id: string }>).map(r => r.segment_id)
  }

  /** Get all storylines that include a given segment */
  getForSegment(segmentId: string): Storyline[] {
    const ids = (this.db.prepare('SELECT storyline_id FROM storyline_segments WHERE segment_id = ?').all(segmentId) as Array<{ storyline_id: string }>).map(r => r.storyline_id)
    return ids.map(id => this.getById(id)).filter(Boolean) as Storyline[]
  }

  private rowToStoryline(row: Record<string, unknown>): Storyline {
    return {
      id: row.id as string, projectId: row.project_id as string, name: row.name as string,
      description: (row.description as string) || '', color: row.color as string | undefined,
      segmentIds: this.getSegmentIds(row.id as string), createdAt: row.created_at as number, updatedAt: row.updated_at as number
    }
  }
}
