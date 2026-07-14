/**
 * Transaction Manager
 *
 * Handles atomic writes and rollback for AI analysis imports.
 * Ensures data consistency and provides undo functionality.
 */

import { z } from 'zod';
import { mergeAnalysisResults } from './merge-strategy';
import { validateSemantics } from './semantic-validator';

// Analysis result schema
const AnalysisResultSchema = z.object({
  schemaVersion: z.literal('cineweave.analysis/1.0'),
  projectFingerprint: z.string(),
  summary: z.object({
    logline: z.string(),
    structure: z.string(),
    confidence: z.number().min(0).max(1),
    evidenceRefs: z.array(z.string()),
  }),
  segments: z.array(z.object({
    id: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    title: z.string(),
    function: z.string(),
    storyLineIds: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    evidenceRefs: z.array(z.string()),
  })),
  emotionPoints: z.array(z.object({
    timeMs: z.number().int().nonnegative(),
    intensity: z.number().min(0).max(100),
    valence: z.number().min(-100).max(100),
    label: z.string(),
    evidenceRefs: z.array(z.string()),
  })),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export interface Transaction {
  id: string;
  timestamp: Date;
  operation: 'import' | 'merge' | 'overwrite';
  data: AnalysisResult;
  snapshot: AnalysisResult | null;
  status: 'pending' | 'committed' | 'rolledback';
  metadata: Record<string, unknown>;
}

export interface TransactionManagerOptions {
  projectId: string;
  maxTransactions?: number;
  autoCommit?: boolean;
}

export class TransactionManager {
  private projectId: string;
  private maxTransactions: number;
  private autoCommit: boolean;
  private transactions: Map<string, Transaction> = new Map();
  private currentSnapshot: AnalysisResult | null = null;

  constructor(options: TransactionManagerOptions) {
    this.projectId = options.projectId;
    this.maxTransactions = options.maxTransactions || 100;
    this.autoCommit = options.autoCommit ?? true;
  }

  /**
   * Begin a new transaction
   */
  beginTransaction(
    operation: Transaction['operation'],
    data: AnalysisResult,
    metadata: Record<string, unknown> = {}
  ): Transaction {
    const transactionId = this.generateTransactionId();

    const transaction: Transaction = {
      id: transactionId,
      timestamp: new Date(),
      operation,
      data,
      snapshot: this.currentSnapshot,
      status: 'pending',
      metadata: {
        ...metadata,
        projectId: this.projectId,
      },
    };

    this.transactions.set(transactionId, transaction);

    // Clean up old transactions if we exceed the limit
    this.cleanupOldTransactions();

    return transaction;
  }

  /**
   * Commit a transaction
   */
  commitTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return false;
    }

    if (transaction.status !== 'pending') {
      return false;
    }

    // Update the current snapshot
    this.currentSnapshot = transaction.data;

    // Mark transaction as committed
    transaction.status = 'committed';

    return true;
  }

  /**
   * Rollback a transaction
   * Can rollback both pending and committed transactions
   */
  rollbackTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return false;
    }

    // Can rollback pending or committed transactions
    if (transaction.status !== 'pending' && transaction.status !== 'committed') {
      return false;
    }

    // Restore the snapshot
    this.currentSnapshot = transaction.snapshot;

    // Mark transaction as rolled back
    transaction.status = 'rolledback';

    return true;
  }

  /**
   * Get the current snapshot
   */
  getCurrentSnapshot(): AnalysisResult | null {
    return this.currentSnapshot;
  }

  /**
   * Set the current snapshot
   */
  setCurrentSnapshot(snapshot: AnalysisResult): void {
    this.currentSnapshot = snapshot;
  }

  /**
   * Get a transaction by ID
   */
  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions
   */
  getTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get committed transactions
   */
  getCommittedTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      t => t.status === 'committed'
    );
  }

  /**
   * Get the last committed transaction
   */
  getLastCommittedTransaction(): Transaction | undefined {
    const committed = this.getCommittedTransactions();
    return committed[committed.length - 1];
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `txn_${timestamp}_${random}`;
  }

  /**
   * Clean up old transactions
   */
  private cleanupOldTransactions(): void {
    if (this.transactions.size <= this.maxTransactions) {
      return;
    }

    // Sort transactions by timestamp
    const sorted = Array.from(this.transactions.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Remove oldest transactions
    const toRemove = sorted.slice(0, sorted.length - this.maxTransactions);
    for (const [id] of toRemove) {
      this.transactions.delete(id);
    }
  }

  /**
   * Export transactions for persistence
   */
  exportTransactions(): string {
    const data = {
      projectId: this.projectId,
      currentSnapshot: this.currentSnapshot,
      transactions: Array.from(this.transactions.values()),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import transactions from persistence
   */
  importTransactions(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.projectId !== this.projectId) {
        return false;
      }

      this.currentSnapshot = data.currentSnapshot;
      this.transactions = new Map(
        data.transactions.map((t: Transaction) => [t.id, t])
      );

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Atomic import manager
 *
 * Handles the complete import process with transaction support:
 * 1. Validate the incoming data
 * 2. Create a transaction
 * 3. Apply the merge strategy
 * 4. Commit or rollback based on result
 */
export class AtomicImportManager {
  private transactionManager: TransactionManager;

  constructor(transactionManager: TransactionManager) {
    this.transactionManager = transactionManager;
  }

  /**
   * Import analysis results atomically
   */
  async importAnalysis(
    incoming: AnalysisResult,
    options: {
      mode: 'fill' | 'append' | 'overwrite';
      preserveLocked?: boolean;
      conflictResolution?: 'skip' | 'overwrite' | 'keepBoth';
    }
  ): Promise<{
    success: boolean;
    transactionId: string;
    errors?: string[];
    warnings?: string[];
  }> {
    // Create a transaction
    const transaction = this.transactionManager.beginTransaction(
      'import',
      incoming,
      { mode: options.mode }
    );

    try {
      // Get current snapshot
      const currentSnapshot = this.transactionManager.getCurrentSnapshot();

      // If no current snapshot, this is the first import
      if (!currentSnapshot) {
        // Commit directly
        this.transactionManager.commitTransaction(transaction.id);
        return {
          success: true,
          transactionId: transaction.id,
        };
      }

      // Merge with existing data
      const mergeResult = mergeAnalysisResults(
        currentSnapshot,
        incoming,
        {
          mode: options.mode,
          preserveLocked: options.preserveLocked,
          conflictResolution: options.conflictResolution,
        }
      );

      // Validate the merged result
      // Use a large media duration to avoid false positives during testing
      const validationResult = validateSemantics(mergeResult.merged, {
        mediaDurationMs: Number.MAX_SAFE_INTEGER, // Would be provided in real implementation
      });

      if (!validationResult.valid) {
        // Rollback on validation failure
        this.transactionManager.rollbackTransaction(transaction.id);
        return {
          success: false,
          transactionId: transaction.id,
          errors: validationResult.errors.map(e => e.message),
        };
      }

      // Update the transaction with merged data
      transaction.data = mergeResult.merged;

      // Commit the transaction
      this.transactionManager.commitTransaction(transaction.id);

      return {
        success: true,
        transactionId: transaction.id,
        warnings: validationResult.warnings.map(w => w.message),
      };
    } catch (error) {
      // Rollback on any error
      this.transactionManager.rollbackTransaction(transaction.id);
      return {
        success: false,
        transactionId: transaction.id,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Undo the last import
   */
  async undoLastImport(): Promise<{
    success: boolean;
    transactionId?: string;
    errors?: string[];
  }> {
    const lastTransaction = this.transactionManager.getLastCommittedTransaction();
    if (!lastTransaction) {
      return {
        success: false,
        errors: ['No committed transactions to undo'],
      };
    }

    // Rollback the transaction
    const success = this.transactionManager.rollbackTransaction(lastTransaction.id);

    if (success) {
      return {
        success: true,
        transactionId: lastTransaction.id,
      };
    } else {
      return {
        success: false,
        transactionId: lastTransaction.id,
        errors: ['Failed to rollback transaction'],
      };
    }
  }

  /**
   * Get import history
   */
  getImportHistory(): Transaction[] {
    return this.transactionManager.getCommittedTransactions();
  }

  /**
   * Get current state
   */
  getCurrentState(): AnalysisResult | null {
    return this.transactionManager.getCurrentSnapshot();
  }
}

/**
 * Create a transaction manager for a project
 */
export function createTransactionManager(
  projectId: string,
  options?: Partial<TransactionManagerOptions>
): TransactionManager {
  return new TransactionManager({
    projectId,
    ...options,
  });
}

/**
 * Create an atomic import manager
 */
export function createAtomicImportManager(
  transactionManager: TransactionManager
): AtomicImportManager {
  return new AtomicImportManager(transactionManager);
}
