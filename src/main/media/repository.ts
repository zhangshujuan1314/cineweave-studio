import { randomUUID } from 'crypto'
import { statSync, openSync, readSync, closeSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { basename, relative } from 'path'
import type Database from 'better-sqlite3'
import type { ProbeResult } from './ffmpeg'

// ── Types ──────────────────────────────────────────────────────

export interface MediaAsset {
  id: string
  projectId: string
  kind: 'original' | 'proxy' | 'audio' | 'subtitle'
  relativePath?: string
  originalPath: string
  fingerprint: string
  durationMs: number
  metadata: ProbeResult | null
  createdAt: number
  updatedAt: number
}

export interface FingerprintResult {
  hash: string
  size: number
  mtimeMs: number
  chunksHashed: boolean
}

// ── Fingerprint ────────────────────────────────────────────────

const CHUNK_SIZE = 65536 // 64KB

export function computeFingerprint(filePath: string): FingerprintResult {
  const stat = statSync(filePath)
  const size = stat.size
  const mtimeMs = stat.mtimeMs

  const hash = createHash('sha256')
  hash.update(`size:${size}`)
  hash.update(`mtime:${Math.round(mtimeMs)}`)

  // Hash first and last chunks
  if (size > 0) {
    const fd = openSync(filePath, 'r')
    try {
      const buf = Buffer.alloc(Math.min(CHUNK_SIZE, size))
      readSync(fd, buf, 0, buf.length, 0)
      hash.update(buf)

      if (size > CHUNK_SIZE) {
        const lastBuf = Buffer.alloc(Math.min(CHUNK_SIZE, size - CHUNK_SIZE))
        readSync(fd, lastBuf, 0, lastBuf.length, size - lastBuf.length)
        hash.update(lastBuf)
      }
    } finally {
      closeSync(fd)
    }
  }

  return { hash: hash.digest('hex'), size, mtimeMs, chunksHashed: size > 0 }
}

// ── Repository ─────────────────────────────────────────────────

export class MediaRepository {
  private db: Database.Database
  private projectDir: string

  constructor(db: Database.Database, projectDir: string) {
    this.db = db
    this.projectDir = projectDir
  }

  /** Import a media file by reference */
  importOriginal(filePath: string, probeResult: ProbeResult): MediaAsset {
    if (!existsSync(filePath)) {
      throw new Error('Media file not found: ' + safePath(filePath))
    }

    const fingerprint = computeFingerprint(filePath)

    // Check for duplicate by fingerprint
    const existing = this.db.prepare(
      'SELECT id FROM media_assets WHERE fingerprint = ? AND project_id = (SELECT id FROM projects LIMIT 1)'
    ).get(fingerprint.hash) as { id: string } | undefined

    if (existing) {
      throw new Error('This media file has already been imported (same fingerprint)')
    }

    const id = randomUUID()
    const now = Date.now()
    const relPath = relative(this.projectDir, filePath)

    this.db.prepare(
      `INSERT INTO media_assets (id, project_id, kind, relative_path, original_path, fingerprint, duration_ms, metadata_json, created_at, updated_at)
       VALUES (?, (SELECT id FROM projects LIMIT 1), 'original', ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, relPath, filePath, fingerprint.hash, probeResult.durationMs, JSON.stringify(probeResult), now, now)

    return {
      id, projectId: '', kind: 'original',
      relativePath: relPath, originalPath: filePath,
      fingerprint: fingerprint.hash, durationMs: probeResult.durationMs,
      metadata: probeResult, createdAt: now, updatedAt: now
    }
  }

  /** Register a proxy asset */
  registerProxy(originalAssetId: string, proxyPath: string, probeResult: ProbeResult): MediaAsset {
    const id = randomUUID()
    const now = Date.now()
    const relPath = relative(this.projectDir, proxyPath)

    this.db.prepare(
      `INSERT INTO media_assets (id, project_id, kind, relative_path, fingerprint, duration_ms, metadata_json, created_at, updated_at)
       VALUES (?, (SELECT project_id FROM media_assets WHERE id = ?), 'proxy', ?, '', ?, ?, ?, ?)`
    ).run(id, originalAssetId, relPath, probeResult.durationMs, JSON.stringify(probeResult), now, now)

    return {
      id, projectId: '', kind: 'proxy',
      relativePath: relPath, originalPath: proxyPath,
      fingerprint: '', durationMs: probeResult.durationMs,
      metadata: probeResult, createdAt: now, updatedAt: now
    }
  }

  /** Get all assets for the current project */
  getAll(): MediaAsset[] {
    const rows = this.db.prepare(
      'SELECT * FROM media_assets ORDER BY created_at DESC'
    ).all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToAsset(r))
  }

  /** Check if asset is still accessible */
  isAccessible(asset: MediaAsset): boolean {
    return existsSync(asset.originalPath)
  }

  /** Relocate a missing asset */
  relocate(id: string, newPath: string): MediaAsset {
    const asset = this.getById(id)
    if (!asset) throw new Error('Asset not found')
    if (!existsSync(newPath)) throw new Error('New path does not exist')

    const newFingerprint = computeFingerprint(newPath)
    const relPath = relative(this.projectDir, newPath)
    const now = Date.now()

    this.db.prepare(
      'UPDATE media_assets SET original_path = ?, relative_path = ?, fingerprint = ?, updated_at = ? WHERE id = ?'
    ).run(newPath, relPath, newFingerprint.hash, now, id)

    return { ...asset, originalPath: newPath, relativePath: relPath, fingerprint: newFingerprint.hash, updatedAt: now }
  }

  getById(id: string): MediaAsset | null {
    const row = this.db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? this.rowToAsset(row) : null
  }

  private rowToAsset(row: Record<string, unknown>): MediaAsset {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      kind: row.kind as MediaAsset['kind'],
      relativePath: row.relative_path as string | undefined,
      originalPath: row.original_path as string,
      fingerprint: row.fingerprint as string,
      durationMs: row.duration_ms as number,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json as string) : null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  }
}

/** Sanitize paths for user-facing error messages */
function safePath(p: string): string {
  return basename(p)
}
