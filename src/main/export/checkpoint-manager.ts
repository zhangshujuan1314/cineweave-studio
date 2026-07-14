/**
 * Checkpoint Manager
 *
 * Manages project checkpoints (versions) for undo/redo and history.
 * Supports automatic checkpoints before major operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface Checkpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Checkpoint label */
  label: string;
  /** Creation timestamp */
  createdAt: string;
  /** Checkpoint type */
  type: 'auto' | 'manual' | 'pre-operation';
  /** Database snapshot path */
  snapshotPath: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface CheckpointOptions {
  /** Project directory */
  projectDir: string;
  /** Maximum number of checkpoints to keep */
  maxCheckpoints?: number;
  /** Auto-checkpoint interval in milliseconds */
  autoCheckpointInterval?: number;
}

/**
 * Checkpoint Manager implementation
 */
export class CheckpointManager {
  private projectDir: string;
  private checkpointsDir: string;
  private maxCheckpoints: number;
  private autoCheckpointInterval: number;
  private autoCheckpointTimer: NodeJS.Timeout | null = null;

  constructor(options: CheckpointOptions) {
    this.projectDir = options.projectDir;
    this.checkpointsDir = path.join(options.projectDir, 'checkpoints');
    this.maxCheckpoints = options.maxCheckpoints || 50;
    this.autoCheckpointInterval = options.autoCheckpointInterval || 300000; // 5 minutes
  }

  /**
   * Initialize checkpoint manager
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.checkpointsDir, { recursive: true });
  }

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    projectId: string,
    label: string,
    type: Checkpoint['type'] = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint> {
    const id = this.generateCheckpointId();
    const createdAt = new Date().toISOString();
    const snapshotPath = path.join(this.checkpointsDir, `${id}.sqlite`);

    // Copy current database to checkpoint
    const dbPath = path.join(this.projectDir, 'project.sqlite');
    await fs.copyFile(dbPath, snapshotPath);

    const checkpoint: Checkpoint = {
      id,
      projectId,
      label,
      createdAt,
      type,
      snapshotPath,
      metadata,
    };

    // Save checkpoint metadata
    const metaPath = path.join(this.checkpointsDir, `${id}.json`);
    await fs.writeFile(metaPath, JSON.stringify(checkpoint, null, 2));

    // Clean up old checkpoints
    await this.cleanupOldCheckpoints();

    return checkpoint;
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints(): Promise<Checkpoint[]> {
    const files = await fs.readdir(this.checkpointsDir);
    const checkpoints: Checkpoint[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(
            path.join(this.checkpointsDir, file),
            'utf-8'
          );
          checkpoints.push(JSON.parse(content));
        } catch {
          // Skip invalid checkpoint files
        }
      }
    }

    // Sort by creation time (newest first)
    return checkpoints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get checkpoint by ID
   */
  async getCheckpoint(id: string): Promise<Checkpoint | null> {
    try {
      const metaPath = path.join(this.checkpointsDir, `${id}.json`);
      const content = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Restore checkpoint
   */
  async restoreCheckpoint(id: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(id);
    if (!checkpoint) {
      return false;
    }

    // Create a backup of current state before restoring
    await this.createCheckpoint(
      checkpoint.projectId,
      `Before restoring: ${checkpoint.label}`,
      'auto'
    );

    // Restore database from checkpoint
    const dbPath = path.join(this.projectDir, 'project.sqlite');
    await fs.copyFile(checkpoint.snapshotPath, dbPath);

    return true;
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(id: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(id);
    if (!checkpoint) {
      return false;
    }

    // Delete snapshot file
    try {
      await fs.unlink(checkpoint.snapshotPath);
    } catch {
      // File may not exist
    }

    // Delete metadata file
    try {
      const metaPath = path.join(this.checkpointsDir, `${id}.json`);
      await fs.unlink(metaPath);
    } catch {
      // File may not exist
    }

    return true;
  }

  /**
   * Start auto-checkpoint timer
   */
  startAutoCheckpoints(projectId: string): void {
    this.stopAutoCheckpoints();

    this.autoCheckpointTimer = setInterval(async () => {
      try {
        await this.createCheckpoint(
          projectId,
          'Auto checkpoint',
          'auto'
        );
      } catch (error) {
        console.error('Auto checkpoint failed:', error);
      }
    }, this.autoCheckpointInterval);
  }

  /**
   * Stop auto-checkpoint timer
   */
  stopAutoCheckpoints(): void {
    if (this.autoCheckpointTimer) {
      clearInterval(this.autoCheckpointTimer);
      this.autoCheckpointTimer = null;
    }
  }

  /**
   * Cleanup old checkpoints
   */
  private async cleanupOldCheckpoints(): Promise<void> {
    const checkpoints = await this.listCheckpoints();

    if (checkpoints.length <= this.maxCheckpoints) {
      return;
    }

    // Remove oldest checkpoints
    const toRemove = checkpoints.slice(this.maxCheckpoints);
    for (const checkpoint of toRemove) {
      await this.deleteCheckpoint(checkpoint.id);
    }
  }

  /**
   * Generate checkpoint ID
   */
  private generateCheckpointId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ckpt_${timestamp}_${random}`;
  }

  /**
   * Get checkpoint statistics
   */
  async getStats(): Promise<{
    total: number;
    auto: number;
    manual: number;
    preOperation: number;
    totalSize: number;
  }> {
    const checkpoints = await this.listCheckpoints();

    let totalSize = 0;
    for (const checkpoint of checkpoints) {
      try {
        const stats = await fs.stat(checkpoint.snapshotPath);
        totalSize += stats.size;
      } catch {
        // File may not exist
      }
    }

    return {
      total: checkpoints.length,
      auto: checkpoints.filter(c => c.type === 'auto').length,
      manual: checkpoints.filter(c => c.type === 'manual').length,
      preOperation: checkpoints.filter(c => c.type === 'pre-operation').length,
      totalSize,
    };
  }
}

/**
 * Create checkpoint manager
 */
export function createCheckpointManager(options: CheckpointOptions): CheckpointManager {
  return new CheckpointManager(options);
}
