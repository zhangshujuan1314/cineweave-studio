/**
 * AI IPC Handlers
 *
 * Handles IPC calls for AI analysis package generation,
 * JSON extraction, validation, and import.
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { generateAnalysisPackage, AnalysisPackageOptions } from '../ai/analysis-package';
import { extractJSON, extractAndValidateJSON, ExtractionResult } from '../ai/json-extractor';
import { validateSchema, validateWithContext, ValidationResult } from '../ai/schema-validator';
import { validateSemantics, SemanticValidationResult } from '../ai/semantic-validator';
import { mergeAnalysisResults, MergeMode, MergeResult } from '../ai/merge-strategy';
import { TransactionManager, AtomicImportManager, createTransactionManager, createAtomicImportManager } from '../ai/transaction-manager';

// Schema for IPC calls
const GeneratePackageSchema = z.object({
  projectId: z.string(),
  projectFingerprint: z.string(),
  mediaDurationMs: z.number().int().nonnegative(),
  segments: z.array(z.object({
    id: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    title: z.string(),
  })),
  frames: z.array(z.object({
    id: z.string(),
    timeMs: z.number().int().nonnegative(),
    path: z.string(),
  })),
  subtitles: z.array(z.object({
    id: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string(),
  })),
  context: z.object({
    movieTitle: z.string().optional(),
    director: z.string().optional(),
    year: z.number().int().optional(),
    genre: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  outputDir: z.string(),
});

const ExtractJSONSchema = z.object({
  rawOutput: z.string(),
});

const ValidateSchemaSchema = z.object({
  data: z.unknown(),
});

const ValidateWithContextSchema = z.object({
  data: z.unknown(),
  mediaDurationMs: z.number().int().nonnegative(),
  existingSegmentIds: z.array(z.string()).optional(),
  existingFrameIds: z.array(z.string()).optional(),
  existingSubtitleIds: z.array(z.string()).optional(),
});

const ValidateSemanticsSchema = z.object({
  data: z.unknown(),
  mediaDurationMs: z.number().int().nonnegative(),
  existingSegmentIds: z.array(z.string()).optional(),
  existingFrameIds: z.array(z.string()).optional(),
  existingSubtitleIds: z.array(z.string()).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  allowOverlapping: z.boolean().optional(),
});

const MergeSchema = z.object({
  existing: z.unknown(),
  incoming: z.unknown(),
  mode: z.enum(['fill', 'append', 'overwrite']),
  preserveLocked: z.boolean().optional(),
  conflictResolution: z.enum(['skip', 'overwrite', 'keepBoth']).optional(),
});

const ImportSchema = z.object({
  projectId: z.string(),
  incoming: z.unknown(),
  mode: z.enum(['fill', 'append', 'overwrite']),
  preserveLocked: z.boolean().optional(),
  conflictResolution: z.enum(['skip', 'overwrite', 'keepBoth']).optional(),
});

// Store transaction managers by project ID
const transactionManagers = new Map<string, TransactionManager>();
const importManagers = new Map<string, AtomicImportManager>();

/**
 * Get or create transaction manager for a project
 */
function getTransactionManager(projectId: string): TransactionManager {
  if (!transactionManagers.has(projectId)) {
    const manager = createTransactionManager(projectId);
    transactionManagers.set(projectId, manager);
  }
  return transactionManagers.get(projectId)!;
}

/**
 * Get or create import manager for a project
 */
function getImportManager(projectId: string): AtomicImportManager {
  if (!importManagers.has(projectId)) {
    const manager = createAtomicImportManager(getTransactionManager(projectId));
    importManagers.set(projectId, manager);
  }
  return importManagers.get(projectId)!;
}

/**
 * Register AI IPC handlers
 */
export function registerAIHandlers(): void {
  // Generate analysis package
  ipcMain.handle('ai:generatePackage', async (_event, args) => {
    try {
      const validated = GeneratePackageSchema.parse(args);
      const result = await generateAnalysisPackage(validated, validated.outputDir);
      return { success: true, path: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Extract JSON from AI output
  ipcMain.handle('ai:extractJSON', async (_event, args) => {
    try {
      const validated = ExtractJSONSchema.parse(args);
      const result = extractJSON(validated.rawOutput);
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  });

  // Extract and validate JSON
  ipcMain.handle('ai:extractAndValidateJSON', async (_event, args) => {
    try {
      const validated = ExtractJSONSchema.parse(args);
      const result = extractAndValidateJSON(validated.rawOutput, 0); // mediaDurationMs would be provided
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  });

  // Validate schema
  ipcMain.handle('ai:validateSchema', async (_event, args) => {
    try {
      const validated = ValidateSchemaSchema.parse(args);
      const result = validateSchema(validated.data);
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{ path: '', message: error instanceof Error ? error.message : 'Unknown error' }],
        warnings: [],
      };
    }
  });

  // Validate with context
  ipcMain.handle('ai:validateWithContext', async (_event, args) => {
    try {
      const validated = ValidateWithContextSchema.parse(args);
      const result = validateWithContext(validated.data, {
        mediaDurationMs: validated.mediaDurationMs,
        existingSegmentIds: new Set(validated.existingSegmentIds || []),
        existingFrameIds: new Set(validated.existingFrameIds || []),
        existingSubtitleIds: new Set(validated.existingSubtitleIds || []),
      });
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{ path: '', message: error instanceof Error ? error.message : 'Unknown error' }],
        warnings: [],
      };
    }
  });

  // Validate semantics
  ipcMain.handle('ai:validateSemantics', async (_event, args) => {
    try {
      const validated = ValidateSemanticsSchema.parse(args);
      const result = validateSemantics(validated.data as any, {
        mediaDurationMs: validated.mediaDurationMs,
        existingSegmentIds: new Set(validated.existingSegmentIds || []),
        existingFrameIds: new Set(validated.existingFrameIds || []),
        existingSubtitleIds: new Set(validated.existingSubtitleIds || []),
        confidenceThreshold: validated.confidenceThreshold,
        allowOverlapping: validated.allowOverlapping,
      });
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{ type: 'UNKNOWN', message: error instanceof Error ? error.message : 'Unknown error', path: '' }],
        warnings: [],
        lowConfidenceItems: [],
      };
    }
  });

  // Merge analysis results
  ipcMain.handle('ai:merge', async (_event, args) => {
    try {
      const validated = MergeSchema.parse(args);
      const result = mergeAnalysisResults(
        validated.existing as any,
        validated.incoming as any,
        {
          mode: validated.mode,
          preserveLocked: validated.preserveLocked,
          conflictResolution: validated.conflictResolution,
        }
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Import analysis atomically
  ipcMain.handle('ai:import', async (_event, args) => {
    try {
      const validated = ImportSchema.parse(args);
      const importManager = getImportManager(validated.projectId);
      const result = await importManager.importAnalysis(validated.incoming as any, {
        mode: validated.mode,
        preserveLocked: validated.preserveLocked,
        conflictResolution: validated.conflictResolution,
      });
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  });

  // Undo last import
  ipcMain.handle('ai:undoImport', async (_event, args) => {
    try {
      const { projectId } = args;
      const importManager = getImportManager(projectId);
      const result = await importManager.undoLastImport();
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  });

  // Get import history
  ipcMain.handle('ai:getImportHistory', async (_event, args) => {
    try {
      const { projectId } = args;
      const importManager = getImportManager(projectId);
      const history = importManager.getImportHistory();
      return { success: true, history };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get current state
  ipcMain.handle('ai:getCurrentState', async (_event, args) => {
    try {
      const { projectId } = args;
      const importManager = getImportManager(projectId);
      const state = importManager.getCurrentState();
      return { success: true, state };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Export transactions
  ipcMain.handle('ai:exportTransactions', async (_event, args) => {
    try {
      const { projectId } = args;
      const transactionManager = getTransactionManager(projectId);
      const exported = transactionManager.exportTransactions();
      return { success: true, data: exported };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Import transactions
  ipcMain.handle('ai:importTransactions', async (_event, args) => {
    try {
      const { projectId, data } = args;
      const transactionManager = getTransactionManager(projectId);
      const result = transactionManager.importTransactions(data);
      return { success: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
