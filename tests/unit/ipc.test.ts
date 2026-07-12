import { describe, it, expect } from 'vitest'
import { appGetInfoSchema, selectProjectDirectorySchema, IPC_CHANNELS } from '../../src/shared/contracts/ipc'

describe('IPC contracts', () => {
  it('appGetInfoSchema accepts empty object', () => { expect(appGetInfoSchema.safeParse({}).success).toBe(true) })
  it('appGetInfoSchema rejects extra props', () => { expect(appGetInfoSchema.safeParse({ extra: true }).success).toBe(false) })
  it('selectProjectDirectorySchema accepts empty object', () => { expect(selectProjectDirectorySchema.safeParse({}).success).toBe(true) })
  it('IPC_CHANNELS contains expected channels', () => {
    expect(IPC_CHANNELS).toContain('app:getInfo')
    expect(IPC_CHANNELS).toContain('dialog:selectProjectDirectory')
  })
})
