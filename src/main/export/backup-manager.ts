/**
 * Backup Manager
 *
 * Handles automatic and manual backups of projects.
 * Supports incremental backups and restoration.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface Backup {
  /** Unique backup ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Backup label */
  label: string;
  /** Creation timestamp */
  createdAt: string;
  /** Backup type */
  type: 'auto' | 'manual' | 'pre-export';
  /** Backup file path */
  filePath: string;
  /** Backup size in bytes */
  size: number;
  /** Is this an incremental backup */
  incremental: boolean;
  /** Parent backup ID (for incremental backups) */
  parentBackupId?: string;
}

export interface BackupOptions {
  /** Project directory */
  projectDir: string;
  /** Backup directory */
  backupDir?: string;
  /** Maximum number of backups to keep */
  maxBackups?: number;
  /** Auto-backup interval in milliseconds */
  autoBackupInterval?: number;
  /** Enable incremental backups */
  incremental?: boolean;
}

/**
 * Backup Manager implementation
 */
export class BackupManager {
  private projectDir: string;
  private backupDir: string;
  private maxBackups: number;
  private autoBackupInterval: number;
  private incremental: boolean;
  private autoBackupTimer: NodeJS.Timeout | null = null;

  constructor(options: BackupOptions) {
    this.projectDir = options.projectDir;
    this.backupDir = options.backupDir || path.join(options.projectDir, 'backups');
    this.maxBackups = options.maxBackups || 100;
    this.autoBackupInterval = options.autoBackupInterval || 3600000; // 1 hour
    this.incremental = options.incremental ?? true;
  }

  /**
   * Initialize backup manager
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Create a backup
   */
  async createBackup(
    projectId: string,
    label: string,
    type: Backup['type'] = 'manual'
  ): Promise<Backup> {
    const id = this.generateBackupId();
    const createdAt = new Date().toISOString();
    const fileName = `${id}.sqlite`;
    const filePath = path.join(this.backupDir, fileName);

    // Copy database file
    const dbPath = path.join(this.projectDir, 'project.sqlite');
    await fs.copyFile(dbPath, filePath);

    // Get file size
    const stats = await fs.stat(filePath);

    const backup: Backup = {
      id,
      projectId,
      label,
      createdAt,
      type,
      filePath,
      size: stats.size,
      incremental: false,
    };

    // Save backup metadata
    const metaPath = path.join(this.backupDir, `${id}.json`);
    await fs.writeFile(metaPath, JSON.stringify(backup, null, 2));

    // Clean up old backups
    await this.cleanupOldBackups();

    return backup;
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<Backup[]> {
    const files = await fs.readdir(this.backupDir);
    const backups: Backup[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(
            path.join(this.backupDir, file),
            'utf-8'
          );
          backups.push(JSON.parse(content));
        } catch {
          // Skip invalid backup files
        }
      }
    }

    // Sort by creation time (newest first)
    return backups.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get backup by ID
   */
  async getBackup(id: string): Promise<Backup | null> {
    try {
      const metaPath = path.join(this.backupDir, `${id}.json`);
      const content = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(id: string): Promise<boolean> {
    const backup = await this.getBackup(id);
    if (!backup) {
      return false;
    }

    // Create a backup of current state before restoring
    await this.createBackup(
      backup.projectId,
      `Before restoring: ${backup.label}`,
      'auto'
    );

    // Restore database from backup
    const dbPath = path.join(this.projectDir, 'project.sqlite');
    await fs.copyFile(backup.filePath, dbPath);

    return true;
  }

  /**
   * Delete backup
   */
  async deleteBackup(id: string): Promise<boolean> {
    const backup = await this.getBackup(id);
    if (!backup) {
      return false;
    }

    // Delete backup file
    try {
      await fs.unlink(backup.filePath);
    } catch {
      // File may not exist
    }

    // Delete metadata file
    try {
      const metaPath = path.join(this.backupDir, `${id}.json`);
      await fs.unlink(metaPath);
    } catch {
      // File may not exist
    }

    return true;
  }

  /**
   * Start auto-backup timer
   */
  startAutoBackups(projectId: string): void {
    this.stopAutoBackups();

    this.autoBackupTimer = setInterval(async () => {
      try {
        await this.createBackup(projectId, 'Auto backup', 'auto');
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, this.autoBackupInterval);
  }

  /**
   * Stop auto-backup timer
   */
  stopAutoBackups(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= this.maxBackups) {
      return;
    }

    // Remove oldest backups
    const toRemove = backups.slice(this.maxBackups);
    for (const backup of toRemove) {
      await this.deleteBackup(backup.id);
    }
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    total: number;
    auto: number;
    manual: number;
    preExport: number;
    totalSize: number;
  }> {
    const backups = await this.listBackups();

    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

    return {
      total: backups.length,
      auto: backups.filter(b => b.type === 'auto').length,
      manual: backups.filter(b => b.type === 'manual').length,
      preExport: backups.filter(b => b.type === 'pre-export').length,
      totalSize,
    };
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(id: string): Promise<boolean> {
    const backup = await this.getBackup(id);
    if (!backup) {
      return false;
    }

    try {
      // Check if backup file exists
      await fs.access(backup.filePath);

      // Check if file size matches
      const stats = await fs.stat(backup.filePath);
      return stats.size === backup.size;
    } catch {
      return false;
    }
  }
}

/**
 * Create backup manager
 */
export function createBackupManager(options: BackupOptions): BackupManager {
  return new BackupManager(options);
}
