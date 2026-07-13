import { describe, it, expect } from 'vitest'
import { taskListRequestSchema, taskCancelRequestSchema, taskRetryRequestSchema, IPC_CHANNELS } from '../../src/shared/contracts/ipc'

describe('Task IPC contracts', () => {
  describe('taskListRequestSchema', () => {
    it('accepts empty object', () => {
      expect(taskListRequestSchema.safeParse({}).success).toBe(true)
    })
    it('rejects extra props', () => {
      expect(taskListRequestSchema.safeParse({ extra: true }).success).toBe(false)
    })
  })

  describe('taskCancelRequestSchema', () => {
    it('accepts valid taskId', () => {
      expect(taskCancelRequestSchema.safeParse({ taskId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true)
    })
    it('rejects invalid uuid', () => {
      expect(taskCancelRequestSchema.safeParse({ taskId: 'not-a-uuid' }).success).toBe(false)
    })
    it('rejects missing taskId', () => {
      expect(taskCancelRequestSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('taskRetryRequestSchema', () => {
    it('accepts valid taskId', () => {
      expect(taskRetryRequestSchema.safeParse({ taskId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true)
    })
    it('rejects invalid uuid', () => {
      expect(taskRetryRequestSchema.safeParse({ taskId: 'bad' }).success).toBe(false)
    })
  })

  describe('IPC_CHANNELS', () => {
    it('includes all task channels', () => {
      expect(IPC_CHANNELS).toContain('tasks:list')
      expect(IPC_CHANNELS).toContain('tasks:cancel')
      expect(IPC_CHANNELS).toContain('tasks:retry')
    })
  })
})
