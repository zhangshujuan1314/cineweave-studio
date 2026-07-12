import { describe, it, expect } from 'vitest'
import { mediaImportRequestSchema, mediaRelocateRequestSchema, IPC_CHANNELS } from '../../src/shared/contracts/ipc'

describe('Media IPC contracts', () => {
  describe('mediaImportRequestSchema', () => {
    it('accepts valid path', () => {
      expect(mediaImportRequestSchema.safeParse({ filePath: '/media/movie.mp4' }).success).toBe(true)
    })
    it('rejects empty path', () => {
      expect(mediaImportRequestSchema.safeParse({ filePath: '' }).success).toBe(false)
    })
    it('rejects path traversal', () => {
      expect(mediaImportRequestSchema.safeParse({ filePath: '/foo/../evil' }).success).toBe(false)
    })
  })
  describe('mediaRelocateRequestSchema', () => {
    it('accepts valid relocate', () => {
      expect(mediaRelocateRequestSchema.safeParse({
        assetId: '550e8400-e29b-41d4-a716-446655440000',
        newPath: '/new/path.mp4'
      }).success).toBe(true)
    })
  })
  describe('IPC_CHANNELS', () => {
    it('includes Phase 2 channels', () => {
      expect(IPC_CHANNELS).toContain('media:import')
      expect(IPC_CHANNELS).toContain('media:relocate')
      expect(IPC_CHANNELS).toContain('tasks:list')
      expect(IPC_CHANNELS).toContain('tasks:cancel')
      expect(IPC_CHANNELS).toContain('tasks:retry')
    })
  })
})
