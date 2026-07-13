export interface Command {
  id: string
  description: string
  execute: () => void | Promise<void>
  undo: () => void | Promise<void>
}

export class CommandStack {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxDepth: number

  constructor(maxDepth = 100) { this.maxDepth = maxDepth }

  async execute(cmd: Command): Promise<void> {
    await cmd.execute()
    this.undoStack.push(cmd)
    if (this.undoStack.length > this.maxDepth) this.undoStack.shift()
    this.redoStack = []
  }

  async undo(): Promise<boolean> {
    const cmd = this.undoStack.pop()
    if (!cmd) return false
    await cmd.undo()
    this.redoStack.push(cmd)
    return true
  }

  async redo(): Promise<boolean> {
    const cmd = this.redoStack.pop()
    if (!cmd) return false
    await cmd.execute()
    this.undoStack.push(cmd)
    return true
  }

  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }
  get undoDescription(): string | null { return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].description : null }
  get redoDescription(): string | null { return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1].description : null }
  clear(): void { this.undoStack = []; this.redoStack = [] }
}
