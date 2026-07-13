import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type { SubtitleEntry } from '../../shared/media/subtitles'

export interface Subtitle {
  id: string
  projectId: string
  source: 'embedded' | 'imported' | 'manual'
  language?: string
  startMs: number
  endMs: number
  text: string
  speaker?: string
  notes: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export class SubtitleRepository {
  constructor(private db: Database.Database) {}

  /** Bulk import subtitles from parsed entries */
  importEntries(projectId: string, entries: SubtitleEntry[], source: 'embedded' | 'imported', language?: string): Subtitle[] {
    const now = Date.now()
    const maxOrder = this.db.prepare('SELECT COALESCE(MAX(sort_order), -1) as o FROM subtitles WHERE project_id = ?').get(projectId) as { o: number }
    const insert = this.db.prepare(
      'INSERT INTO subtitles (id, project_id, source, language, start_ms, end_ms, text, speaker, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const results: Subtitle[] = []
    this.db.transaction(() => {
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]
        const id = randomUUID()
        const order = maxOrder.o + i + 1
        insert.run(id, projectId, source, language, e.startMs, e.endMs, e.text, e.speaker || null, '', order, now, now)
        results.push({ id, projectId, source, language, startMs: e.startMs, endMs: e.endMs, text: e.text, speaker: e.speaker, notes: '', sortOrder: order, createdAt: now, updatedAt: now })
      }
    })()
    return results
  }

  getByProject(projectId: string): Subtitle[] {
    const rows = this.db.prepare('SELECT * FROM subtitles WHERE project_id = ? ORDER BY start_ms').all(projectId) as Record<string, unknown>[]
    return rows.map(r => this.rowToSubtitle(r))
  }

  getById(id: string): Subtitle | null {
    const row = this.db.prepare('SELECT * FROM subtitles WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToSubtitle(row) : null
  }

  update(id: string, changes: Partial<Pick<Subtitle, 'startMs' | 'endMs' | 'text' | 'speaker' | 'notes'>>): Subtitle | null {
    const sub = this.getById(id)
    if (!sub) return null
    const now = Date.now()
    const startMs = changes.startMs ?? sub.startMs
    const endMs = changes.endMs ?? sub.endMs
    const text = changes.text ?? sub.text
    const speaker = changes.speaker ?? sub.speaker
    const notes = changes.notes ?? sub.notes
    this.db.prepare(
      'UPDATE subtitles SET start_ms = ?, end_ms = ?, text = ?, speaker = ?, notes = ?, updated_at = ? WHERE id = ?'
    ).run(startMs, endMs, text, speaker || null, notes, now, id)
    return { ...sub, startMs, endMs, text, speaker, notes, updatedAt: now }
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM subtitles WHERE id = ?').run(id)
    return result.changes > 0
  }

  /** Apply a time offset to all subtitles in a project */
  applyOffset(projectId: string, offsetMs: number): number {
    const result = this.db.prepare('UPDATE subtitles SET start_ms = start_ms + ?, end_ms = end_ms + ?, updated_at = ? WHERE project_id = ?').run(offsetMs, offsetMs, Date.now(), projectId)
    return result.changes
  }

  /** Get subtitles that overlap a time range */
  getOverlapping(projectId: string, startMs: number, endMs: number): Subtitle[] {
    const rows = this.db.prepare(
      'SELECT * FROM subtitles WHERE project_id = ? AND start_ms < ? AND end_ms > ? ORDER BY start_ms'
    ).all(projectId, endMs, startMs) as Record<string, unknown>[]
    return rows.map(r => this.rowToSubtitle(r))
  }

  private rowToSubtitle(row: Record<string, unknown>): Subtitle {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      source: row.source as Subtitle['source'],
      language: row.language as string | undefined,
      startMs: row.start_ms as number,
      endMs: row.end_ms as number,
      text: row.text as string,
      speaker: row.speaker as string | undefined,
      notes: (row.notes as string) || '',
      sortOrder: row.sort_order as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  }
}
