import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'

export interface Marker {
  id: string
  projectId: string
  timeMs: number
  type: 'note' | 'emotion' | 'beat' | 'custom'
  label: string
  color?: string
  notes: string
  createdAt: number
  updatedAt: number
}

export class MarkerRepository {
  constructor(private db: Database.Database) {}

  create(projectId: string, timeMs: number, type: Marker['type'] = 'note', label = '', color?: string, notes = ''): Marker {
    const id = randomUUID()
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO markers (id, project_id, time_ms, type, label, color, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, timeMs, type, label, color || null, notes, now, now)
    return { id, projectId, timeMs, type, label, color, notes, createdAt: now, updatedAt: now }
  }

  getByProject(projectId: string): Marker[] {
    const rows = this.db.prepare('SELECT * FROM markers WHERE project_id = ? ORDER BY time_ms').all(projectId) as Record<string, unknown>[]
    return rows.map(r => this.rowToMarker(r))
  }

  getById(id: string): Marker | null {
    const row = this.db.prepare('SELECT * FROM markers WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToMarker(row) : null
  }

  update(id: string, changes: Partial<Pick<Marker, 'timeMs' | 'type' | 'label' | 'color' | 'notes'>>): Marker | null {
    const marker = this.getById(id)
    if (!marker) return null
    const now = Date.now()
    const timeMs = changes.timeMs ?? marker.timeMs
    const type = changes.type ?? marker.type
    const label = changes.label ?? marker.label
    const color = changes.color ?? marker.color
    const notes = changes.notes ?? marker.notes
    this.db.prepare(
      'UPDATE markers SET time_ms = ?, type = ?, label = ?, color = ?, notes = ?, updated_at = ? WHERE id = ?'
    ).run(timeMs, type, label, color || null, notes, now, id)
    return { ...marker, timeMs, type, label, color, notes, updatedAt: now }
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM markers WHERE id = ?').run(id)
    return result.changes > 0
  }

  getInRange(projectId: string, startMs: number, endMs: number): Marker[] {
    const rows = this.db.prepare(
      'SELECT * FROM markers WHERE project_id = ? AND time_ms >= ? AND time_ms <= ? ORDER BY time_ms'
    ).all(projectId, startMs, endMs) as Record<string, unknown>[]
    return rows.map(r => this.rowToMarker(r))
  }

  private rowToMarker(row: Record<string, unknown>): Marker {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      timeMs: row.time_ms as number,
      type: row.type as Marker['type'],
      label: (row.label as string) || '',
      color: row.color as string | undefined,
      notes: (row.notes as string) || '',
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  }
}
