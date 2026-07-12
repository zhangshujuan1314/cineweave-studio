import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type { ChildProcess } from 'child_process'

// ── Types ──────────────────────────────────────────────────────

export type TaskState = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'interrupted'

export interface Task {
  id: string
  projectId: string
  type: string
  state: TaskState
  progress: number
  payload: Record<string, unknown>
  error?: string
  createdAt: number
  updatedAt: number
}

export interface TaskHandler {
  type: string
  run: (task: Task, onProgress: (pct: number) => void) => Promise<void>
  cancel?: (task: Task) => void
}

interface RunningTask {
  task: Task
  process?: ChildProcess
  handler: TaskHandler
}

// ── Runner ─────────────────────────────────────────────────────

export class TaskRunner {
  private db: Database.Database
  private handlers = new Map<string, TaskHandler>()
  private running = new Map<string, RunningTask>()
  private maxConcurrent = 2
  private queue: string[] = []

  constructor(db: Database.Database) {
    this.db = db
  }

  /** Register a handler for a task type */
  registerHandler(handler: TaskHandler): void {
    this.handlers.set(handler.type, handler)
  }

  /** Enqueue a new task */
  enqueue(projectId: string, type: string, payload: Record<string, unknown>): Task {
    const id = randomUUID()
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO jobs (id, project_id, type, state, progress, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, type, 'queued', 0, JSON.stringify(payload), now, now)

    const task: Task = { id, projectId, type, state: 'queued', progress: 0, payload, createdAt: now, updatedAt: now }
    this.queue.push(id)
    this.processQueue()
    return task
  }

  /** Get task by id */
  getTask(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null
    return this.rowToTask(row)
  }

  /** List tasks for a project */
  listByProject(projectId: string): Task[] {
    const rows = this.db.prepare(
      'SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC'
    ).all(projectId) as Record<string, unknown>[]
    return rows.map((r) => this.rowToTask(r))
  }

  /** Cancel a task */
  cancel(id: string): boolean {
    const task = this.getTask(id)
    if (!task) return false
    if (task.state !== 'queued' && task.state !== 'running') return false

    // Cancel running process
    const running = this.running.get(id)
    if (running) {
      running.handler.cancel?.(task)
      if (running.process && !running.process.killed) {
        running.process.kill('SIGTERM')
        setTimeout(() => { if (!running.process!.killed) running.process!.kill('SIGKILL') }, 3000)
      }
      this.running.delete(id)
    }

    this.queue = this.queue.filter((qid) => qid !== id)
    this.updateState(id, 'canceled')
    this.processQueue()
    return true
  }

  /** Retry a failed/canceled/interrupted task */
  retry(id: string): boolean {
    const task = this.getTask(id)
    if (!task) return false
    if (task.state !== 'failed' && task.state !== 'canceled' && task.state !== 'interrupted') return false
    this.updateState(id, 'queued')
    this.queue.push(id)
    this.processQueue()
    return true
  }

  /** Get current running count */
  get runningCount(): number {
    return this.running.size
  }

  /** Recover interrupted tasks on startup */
  recoverInterrupted(): void {
    const rows = this.db.prepare(
      "SELECT * FROM jobs WHERE state IN ('running', 'interrupted')"
    ).all() as Record<string, unknown>[]
    for (const row of rows) {
      const task = this.rowToTask(row)
      this.updateState(task.id, 'interrupted')
    }
  }

  // ── Internal ────────────────────────────────────────────────

  private processQueue(): void {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const id = this.queue.shift()!
      const task = this.getTask(id)
      if (!task || task.state !== 'queued') continue
      this.executeTask(task)
    }
  }

  private async executeTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type)
    if (!handler) {
      this.updateState(task.id, 'failed', 'No handler registered for task type: ' + task.type)
      this.processQueue()
      return
    }

    this.updateState(task.id, 'running')

    const running: RunningTask = { task, handler }
    this.running.set(task.id, running)

    try {
      await handler.run(task, (pct: number) => {
        this.updateProgress(task.id, pct)
      })
      this.running.delete(task.id)
      this.updateState(task.id, 'succeeded')
    } catch (err) {
      this.running.delete(task.id)
      const msg = err instanceof Error ? err.message : String(err)
      this.updateState(task.id, 'failed', msg)
    }
    this.processQueue()
  }

  private updateState(id: string, state: TaskState, error?: string): void {
    const now = Date.now()
    this.db.prepare(
      'UPDATE jobs SET state = ?, error_json = ?, updated_at = ? WHERE id = ?'
    ).run(state, error ? JSON.stringify({ message: error }) : null, now, id)
  }

  private updateProgress(id: string, progress: number): void {
    this.db.prepare(
      'UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?'
    ).run(Math.min(100, Math.max(0, progress)), Date.now(), id)
  }

  private rowToTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      type: row.type as string,
      state: row.state as TaskState,
      progress: row.progress as number,
      payload: row.payload_json ? JSON.parse(row.payload_json as string) : {},
      error: row.error_json ? JSON.parse(row.error_json as string).message : undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number
    }
  }
}
