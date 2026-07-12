import { describe, it, expect } from 'vitest'
import {
  projectCreateRequestSchema, projectOpenRequestSchema,
  projectDeleteRequestSchema, projectRenameRequestSchema,
  IPC_CHANNELS
} from '../../src/shared/contracts/ipc'

describe('Project IPC contracts', () => {
  describe('projectCreateRequestSchema', () => {
    it('accepts valid input', () => {
      expect(projectCreateRequestSchema.safeParse({ title: 'My Film', basePath: '/Users/test/films' }).success).toBe(true)
    })
    it('accepts Chinese and emoji in title', () => {
      expect(projectCreateRequestSchema.safeParse({ title: '🎬 我的电影分析', basePath: '/tmp' }).success).toBe(true)
    })
    it('rejects empty title', () => {
      expect(projectCreateRequestSchema.safeParse({ title: '', basePath: '/tmp' }).success).toBe(false)
    })
    it('rejects path traversal', () => {
      expect(projectCreateRequestSchema.safeParse({ title: 'Test', basePath: '/foo/../evil' }).success).toBe(false)
    })
    it('rejects missing fields', () => {
      expect(projectCreateRequestSchema.safeParse({ title: 'Test' }).success).toBe(false)
    })
  })

  describe('projectOpenRequestSchema', () => {
    it('accepts valid path', () => {
      expect(projectOpenRequestSchema.safeParse({ projectPath: '/path/to/project.cineweave' }).success).toBe(true)
    })
    it('rejects path traversal', () => {
      expect(projectOpenRequestSchema.safeParse({ projectPath: '/foo/../evil' }).success).toBe(false)
    })
  })

  describe('projectDeleteRequestSchema', () => {
    it('accepts valid path', () => {
      expect(projectDeleteRequestSchema.safeParse({ projectPath: '/path/to/project.cineweave' }).success).toBe(true)
    })
    it('rejects path traversal', () => {
      expect(projectDeleteRequestSchema.safeParse({ projectPath: '/foo/../evil' }).success).toBe(false)
    })
  })

  describe('projectRenameRequestSchema', () => {
    it('accepts valid rename', () => {
      expect(projectRenameRequestSchema.safeParse({
        projectPath: '/path/to/project.cineweave',
        newTitle: 'New Title'
      }).success).toBe(true)
    })
    it('rejects missing newTitle', () => {
      expect(projectRenameRequestSchema.safeParse({
        projectPath: '/path/to/project.cineweave'
      }).success).toBe(false)
    })
  })

  describe('IPC_CHANNELS', () => {
    it('includes all Phase 1 channels', () => {
      expect(IPC_CHANNELS).toContain('project:create')
      expect(IPC_CHANNELS).toContain('project:open')
      expect(IPC_CHANNELS).toContain('project:list')
      expect(IPC_CHANNELS).toContain('project:delete')
      expect(IPC_CHANNELS).toContain('project:rename')
    })
  })
})
