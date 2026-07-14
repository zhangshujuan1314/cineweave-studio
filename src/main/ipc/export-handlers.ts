/**
 * Export IPC Handlers
 *
 * Handles IPC calls for checkpoints, backups, exports, and packages.
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { createCheckpointManager } from '../export/checkpoint-manager';
import { createBackupManager } from '../export/backup-manager';
import { createExportManager } from '../export/export-manager';
import { createPackageManager } from '../export/package-manager';

// Schema for IPC calls
const CreateCheckpointSchema = z.object({
  projectId: z.string(),
  label: z.string(),
  type: z.enum(['auto', 'manual', 'pre-operation']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RestoreCheckpointSchema = z.object({
  checkpointId: z.string(),
});

const DeleteCheckpointSchema = z.object({
  checkpointId: z.string(),
});

const CreateBackupSchema = z.object({
  projectId: z.string(),
  label: z.string(),
  type: z.enum(['auto', 'manual', 'pre-export']).optional(),
});

const RestoreBackupSchema = z.object({
  backupId: z.string(),
});

const DeleteBackupSchema = z.object({
  backupId: z.string(),
});

const ExportSchema = z.object({
  format: z.enum(['markdown', 'pdf', 'csv', 'srt', 'vtt', 'package']),
  outputPath: z.string(),
  projectDir: z.string(),
  includeFrames: z.boolean().optional(),
  includeSubtitles: z.boolean().optional(),
  includeMetadata: z.boolean().optional(),
  template: z.string().optional(),
  pdfOptions: z.object({
    pageSize: z.enum(['A4', 'Letter']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    includeImages: z.boolean().optional(),
  }).optional(),
});

const ImportPackageSchema = z.object({
  packagePath: z.string(),
  targetDir: z.string(),
  overwrite: z.boolean().optional(),
  analysisOnly: z.boolean().optional(),
});

const ExportPackageSchema = z.object({
  projectDir: z.string(),
  outputPath: z.string(),
  includeFrames: z.boolean().optional(),
  includeMedia: z.boolean().optional(),
  includeCheckpoints: z.boolean().optional(),
  compressionLevel: z.number().min(0).max(9).optional(),
});

const ProjectDirSchema = z.object({
  projectDir: z.string(),
});

// Manager instances
const checkpointManagers = new Map<string, ReturnType<typeof createCheckpointManager>>();
const backupManagers = new Map<string, ReturnType<typeof createBackupManager>>();

/**
 * Get or create checkpoint manager for project
 */
function getCheckpointManager(projectDir: string) {
  if (!checkpointManagers.has(projectDir)) {
    const manager = createCheckpointManager({ projectDir });
    checkpointManagers.set(projectDir, manager);
  }
  return checkpointManagers.get(projectDir)!;
}

/**
 * Get or create backup manager for project
 */
function getBackupManager(projectDir: string) {
  if (!backupManagers.has(projectDir)) {
    const manager = createBackupManager({ projectDir });
    backupManagers.set(projectDir, manager);
  }
  return backupManagers.get(projectDir)!;
}

/**
 * Register export IPC handlers
 */
export function registerExportHandlers(): void {
  // Checkpoint handlers
  ipcMain.handle('checkpoint:create', async (_event, args) => {
    try {
      const validated = CreateCheckpointSchema.parse(args);
      const manager = getCheckpointManager(args.projectDir);
      await manager.initialize();
      const checkpoint = await manager.createCheckpoint(
        validated.projectId,
        validated.label,
        validated.type,
        validated.metadata
      );
      return { success: true, checkpoint };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('checkpoint:list', async (_event, args) => {
    try {
      const validated = ProjectDirSchema.parse(args);
      const manager = getCheckpointManager(validated.projectDir);
      await manager.initialize();
      const checkpoints = await manager.listCheckpoints();
      return { success: true, checkpoints };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('checkpoint:get', async (_event, args) => {
    try {
      const validated = RestoreCheckpointSchema.parse(args);
      const manager = getCheckpointManager(args.projectDir);
      const checkpoint = await manager.getCheckpoint(validated.checkpointId);
      return { success: true, checkpoint };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('checkpoint:restore', async (_event, args) => {
    try {
      const validated = RestoreCheckpointSchema.parse(args);
      const manager = getCheckpointManager(args.projectDir);
      const restored = await manager.restoreCheckpoint(validated.checkpointId);
      return { success: restored };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('checkpoint:delete', async (_event, args) => {
    try {
      const validated = DeleteCheckpointSchema.parse(args);
      const manager = getCheckpointManager(args.projectDir);
      const deleted = await manager.deleteCheckpoint(validated.checkpointId);
      return { success: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('checkpoint:stats', async (_event, args) => {
    try {
      const validated = ProjectDirSchema.parse(args);
      const manager = getCheckpointManager(validated.projectDir);
      const stats = await manager.getStats();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Backup handlers
  ipcMain.handle('backup:create', async (_event, args) => {
    try {
      const validated = CreateBackupSchema.parse(args);
      const manager = getBackupManager(args.projectDir);
      await manager.initialize();
      const backup = await manager.createBackup(
        validated.projectId,
        validated.label,
        validated.type
      );
      return { success: true, backup };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('backup:list', async (_event, args) => {
    try {
      const validated = ProjectDirSchema.parse(args);
      const manager = getBackupManager(validated.projectDir);
      await manager.initialize();
      const backups = await manager.listBackups();
      return { success: true, backups };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('backup:restore', async (_event, args) => {
    try {
      const validated = RestoreBackupSchema.parse(args);
      const manager = getBackupManager(args.projectDir);
      const restored = await manager.restoreBackup(validated.backupId);
      return { success: restored };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('backup:delete', async (_event, args) => {
    try {
      const validated = DeleteBackupSchema.parse(args);
      const manager = getBackupManager(args.projectDir);
      const deleted = await manager.deleteBackup(validated.backupId);
      return { success: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('backup:stats', async (_event, args) => {
    try {
      const validated = ProjectDirSchema.parse(args);
      const manager = getBackupManager(validated.projectDir);
      const stats = await manager.getStats();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Export handlers
  ipcMain.handle('export:export', async (_event, args) => {
    try {
      const validated = ExportSchema.parse(args);
      const manager = createExportManager();
      const result = await manager.export(validated);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Package handlers
  ipcMain.handle('package:export', async (_event, args) => {
    try {
      const validated = ExportPackageSchema.parse(args);
      const manager = createPackageManager();
      const result = await manager.exportProject(validated);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('package:import', async (_event, args) => {
    try {
      const validated = ImportPackageSchema.parse(args);
      const manager = createPackageManager();
      const result = await manager.importProject(validated);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('package:info', async (_event, args) => {
    try {
      const { packagePath } = args;
      const manager = createPackageManager();
      const info = await manager.getPackageInfo(packagePath);
      return { success: true, info };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
