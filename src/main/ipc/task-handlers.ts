import { ipcMain } from 'electron'
import {
  taskListRequestSchema,
  taskCancelRequestSchema,
  taskRetryRequestSchema
} from '../../shared/contracts/ipc'
import { getTaskRunner } from '../jobs/task-runner'

export function registerTaskHandlers(): void {
  ipcMain.handle('tasks:list', (_event, payload: unknown) => {
    taskListRequestSchema.safeParse(payload)
    const runner = getTaskRunner()
    // List all tasks - in a real impl we'd filter by project
    return runner.listByProject('*')
  })

  ipcMain.handle('tasks:cancel', (_event, payload: unknown) => {
    const parsed = taskCancelRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid tasks:cancel: ' + parsed.error.message)
    const runner = getTaskRunner()
    const success = runner.cancel(parsed.data.taskId)
    if (!success) throw new Error('Task not found or cannot be canceled')
  })

  ipcMain.handle('tasks:retry', (_event, payload: unknown) => {
    const parsed = taskRetryRequestSchema.safeParse(payload)
    if (!parsed.success) throw new Error('Invalid tasks:retry: ' + parsed.error.message)
    const runner = getTaskRunner()
    const success = runner.retry(parsed.data.taskId)
    if (!success) throw new Error('Task not found or cannot be retried')
  })
}
