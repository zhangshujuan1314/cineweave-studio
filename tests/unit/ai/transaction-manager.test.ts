/**
 * Transaction Manager Tests
 *
 * Tests for the transaction manager module.
 * Covers various scenarios including:
 * - Transaction creation
 * - Commit and rollback
 * - Snapshot management
 * - Atomic import
 * - Undo functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransactionManager,
  AtomicImportManager,
  createTransactionManager,
  createAtomicImportManager,
} from '../../../src/main/ai/transaction-manager';

describe('Transaction Manager', () => {
  let manager: TransactionManager;

  const sampleData = {
    schemaVersion: 'cineweave.analysis/1.0' as const,
    projectFingerprint: 'sha256:abc123',
    summary: {
      logline: 'Test logline',
      structure: 'Test structure',
      confidence: 0.85,
      evidenceRefs: ['frame_001'],
    },
    segments: [{
      id: 'seg_001',
      startMs: 0,
      endMs: 60000,
      title: 'Test segment',
      function: 'Test function',
      storyLineIds: ['line_main'],
      confidence: 0.8,
      evidenceRefs: ['frame_001'],
    }],
    emotionPoints: [{
      timeMs: 30000,
      intensity: 75,
      valence: -20,
      label: 'Test emotion',
      evidenceRefs: ['frame_001'],
    }],
  };

  beforeEach(() => {
    manager = createTransactionManager('test-project');
  });

  describe('Transaction Creation', () => {
    it('should create a new transaction', () => {
      const transaction = manager.beginTransaction('import', sampleData);

      expect(transaction.id).toMatch(/^txn_/);
      expect(transaction.operation).toBe('import');
      expect(transaction.status).toBe('pending');
      expect(transaction.data).toBe(sampleData);
      expect(transaction.snapshot).toBeNull();
    });

    it('should create multiple transactions', () => {
      const txn1 = manager.beginTransaction('import', sampleData);
      const txn2 = manager.beginTransaction('merge', sampleData);

      expect(manager.getTransactions()).toHaveLength(2);
      expect(manager.getTransaction(txn1.id)).toBeDefined();
      expect(manager.getTransaction(txn2.id)).toBeDefined();
    });

    it('should store metadata', () => {
      const metadata = { mode: 'fill', userId: 'user123' };
      const transaction = manager.beginTransaction('import', sampleData, metadata);

      expect(transaction.metadata).toEqual({
        ...metadata,
        projectId: 'test-project',
      });
    });
  });

  describe('Transaction Commit', () => {
    it('should commit a transaction', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      const result = manager.commitTransaction(transaction.id);

      expect(result).toBe(true);
      expect(manager.getTransaction(transaction.id)?.status).toBe('committed');
    });

    it('should update current snapshot on commit', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      manager.commitTransaction(transaction.id);

      expect(manager.getCurrentSnapshot()).toBe(sampleData);
    });

    it('should fail to commit non-existent transaction', () => {
      const result = manager.commitTransaction('non-existent');
      expect(result).toBe(false);
    });

    it('should fail to commit already committed transaction', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      manager.commitTransaction(transaction.id);

      const result = manager.commitTransaction(transaction.id);
      expect(result).toBe(false);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback a transaction', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      const result = manager.rollbackTransaction(transaction.id);

      expect(result).toBe(true);
      expect(manager.getTransaction(transaction.id)?.status).toBe('rolledback');
    });

    it('should restore snapshot on rollback', () => {
      // Set initial snapshot
      const initialData = { ...sampleData, summary: { ...sampleData.summary, logline: 'Initial' } };
      manager.setCurrentSnapshot(initialData);

      // Begin and rollback transaction
      const transaction = manager.beginTransaction('import', sampleData);
      manager.rollbackTransaction(transaction.id);

      expect(manager.getCurrentSnapshot()).toBe(initialData);
    });

    it('should set snapshot to null on rollback if no previous snapshot', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      manager.rollbackTransaction(transaction.id);

      expect(manager.getCurrentSnapshot()).toBeNull();
    });

    it('should fail to rollback non-existent transaction', () => {
      const result = manager.rollbackTransaction('non-existent');
      expect(result).toBe(false);
    });

    it('should rollback already committed transaction', () => {
      const transaction = manager.beginTransaction('import', sampleData);
      manager.commitTransaction(transaction.id);

      const result = manager.rollbackTransaction(transaction.id);
      expect(result).toBe(true);
      expect(manager.getTransaction(transaction.id)?.status).toBe('rolledback');
    });
  });

  describe('Snapshot Management', () => {
    it('should get and set current snapshot', () => {
      expect(manager.getCurrentSnapshot()).toBeNull();

      manager.setCurrentSnapshot(sampleData);
      expect(manager.getCurrentSnapshot()).toBe(sampleData);
    });

    it('should track snapshot through transactions', () => {
      // First commit
      const txn1 = manager.beginTransaction('import', sampleData);
      manager.commitTransaction(txn1.id);
      expect(manager.getCurrentSnapshot()).toBe(sampleData);

      // Second commit with different data
      const newData = { ...sampleData, summary: { ...sampleData.summary, logline: 'New' } };
      const txn2 = manager.beginTransaction('import', newData);
      manager.commitTransaction(txn2.id);
      expect(manager.getCurrentSnapshot()).toBe(newData);

      // Rollback second commit
      manager.rollbackTransaction(txn2.id);
      expect(manager.getCurrentSnapshot()).toBe(sampleData);
    });
  });

  describe('Transaction History', () => {
    it('should get committed transactions', () => {
      const txn1 = manager.beginTransaction('import', sampleData);
      const txn2 = manager.beginTransaction('merge', sampleData);
      const txn3 = manager.beginTransaction('import', sampleData);

      manager.commitTransaction(txn1.id);
      manager.commitTransaction(txn2.id);
      // txn3 not committed

      const committed = manager.getCommittedTransactions();
      expect(committed).toHaveLength(2);
      expect(committed[0].id).toBe(txn1.id);
      expect(committed[1].id).toBe(txn2.id);
    });

    it('should get last committed transaction', () => {
      const txn1 = manager.beginTransaction('import', sampleData);
      const txn2 = manager.beginTransaction('merge', sampleData);

      manager.commitTransaction(txn1.id);
      manager.commitTransaction(txn2.id);

      const last = manager.getLastCommittedTransaction();
      expect(last?.id).toBe(txn2.id);
    });

    it('should return undefined if no committed transactions', () => {
      const last = manager.getLastCommittedTransaction();
      expect(last).toBeUndefined();
    });
  });

  describe('Transaction Cleanup', () => {
    it('should cleanup old transactions when limit exceeded', () => {
      const smallManager = createTransactionManager('test-project', { maxTransactions: 2 });

      const txn1 = smallManager.beginTransaction('import', sampleData);
      const txn2 = smallManager.beginTransaction('import', sampleData);
      const txn3 = smallManager.beginTransaction('import', sampleData);

      expect(smallManager.getTransactions()).toHaveLength(2);
      expect(smallManager.getTransaction(txn1.id)).toBeUndefined();
      expect(smallManager.getTransaction(txn2.id)).toBeDefined();
      expect(smallManager.getTransaction(txn3.id)).toBeDefined();
    });
  });

  describe('Export/Import', () => {
    it('should export transactions', () => {
      const txn1 = manager.beginTransaction('import', sampleData);
      manager.commitTransaction(txn1.id);

      const exported = manager.exportTransactions();
      const parsed = JSON.parse(exported);

      expect(parsed.projectId).toBe('test-project');
      expect(parsed.currentSnapshot).toEqual(sampleData);
      expect(parsed.transactions).toHaveLength(1);
    });

    it('should import transactions', () => {
      const exported = JSON.stringify({
        projectId: 'test-project',
        currentSnapshot: sampleData,
        transactions: [{
          id: 'txn_123',
          timestamp: new Date().toISOString(),
          operation: 'import',
          data: sampleData,
          snapshot: null,
          status: 'committed',
          metadata: { projectId: 'test-project' },
        }],
      });

      const result = manager.importTransactions(exported);
      expect(result).toBe(true);
      expect(manager.getCurrentSnapshot()).toEqual(sampleData);
      expect(manager.getTransactions()).toHaveLength(1);
    });

    it('should fail to import transactions from different project', () => {
      const exported = JSON.stringify({
        projectId: 'different-project',
        currentSnapshot: sampleData,
        transactions: [],
      });

      const result = manager.importTransactions(exported);
      expect(result).toBe(false);
    });
  });
});

describe('Atomic Import Manager', () => {
  let transactionManager: TransactionManager;
  let importManager: AtomicImportManager;

  const sampleData = {
    schemaVersion: 'cineweave.analysis/1.0' as const,
    projectFingerprint: 'sha256:abc123',
    summary: {
      logline: 'Test logline',
      structure: 'Test structure',
      confidence: 0.85,
      evidenceRefs: ['frame_001'],
    },
    segments: [{
      id: 'seg_001',
      startMs: 0,
      endMs: 60000,
      title: 'Test segment',
      function: 'Test function',
      storyLineIds: ['line_main'],
      confidence: 0.8,
      evidenceRefs: ['frame_001'],
    }],
    emotionPoints: [{
      timeMs: 30000,
      intensity: 75,
      valence: -20,
      label: 'Test emotion',
      evidenceRefs: ['frame_001'],
    }],
  };

  beforeEach(() => {
    transactionManager = createTransactionManager('test-project');
    importManager = createAtomicImportManager(transactionManager);
  });

  describe('Import Analysis', () => {
    it('should import analysis when no existing data', async () => {
      const result = await importManager.importAnalysis(sampleData, { mode: 'fill' });

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^txn_/);
      expect(transactionManager.getCurrentSnapshot()).toEqual(sampleData);
    });

    it('should import analysis with existing data', async () => {
      // First import
      await importManager.importAnalysis(sampleData, { mode: 'fill' });

      // Second import with overwrite mode to update title
      const newData = {
        ...sampleData,
        segments: [{
          ...sampleData.segments[0],
          title: 'Updated segment',
        }],
      };

      const result = await importManager.importAnalysis(newData, { mode: 'overwrite' });

      expect(result.success).toBe(true);
      expect(transactionManager.getCurrentSnapshot()?.segments[0].title).toBe('Updated segment');
    });

    it('should handle import with append mode', async () => {
      // First import
      await importManager.importAnalysis(sampleData, { mode: 'append' });

      // Second import with new segment
      const newData = {
        ...sampleData,
        segments: [
          sampleData.segments[0],
          {
            id: 'seg_002',
            startMs: 60000,
            endMs: 120000,
            title: 'New segment',
            function: 'New function',
            storyLineIds: ['line_main'],
            confidence: 0.7,
            evidenceRefs: ['frame_002'],
          },
        ],
      };

      const result = await importManager.importAnalysis(newData, { mode: 'append' });

      expect(result.success).toBe(true);
      expect(transactionManager.getCurrentSnapshot()?.segments).toHaveLength(2);
    });
  });

  describe('Undo Import', () => {
    it('should undo last import', async () => {
      // First import
      await importManager.importAnalysis(sampleData, { mode: 'fill' });

      // Second import
      const newData = {
        ...sampleData,
        summary: { ...sampleData.summary, logline: 'New logline' },
      };
      await importManager.importAnalysis(newData, { mode: 'fill' });

      expect(transactionManager.getCurrentSnapshot()?.summary.logline).toBe('New logline');

      // Undo
      const result = await importManager.undoLastImport();

      expect(result.success).toBe(true);
      expect(transactionManager.getCurrentSnapshot()?.summary.logline).toBe('Test logline');
    });

    it('should fail to undo when no imports', async () => {
      const result = await importManager.undoLastImport();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No committed transactions to undo');
    });
  });

  describe('Import History', () => {
    it('should get import history', async () => {
      await importManager.importAnalysis(sampleData, { mode: 'fill' });

      const newData = {
        ...sampleData,
        summary: { ...sampleData.summary, logline: 'New logline' },
      };
      await importManager.importAnalysis(newData, { mode: 'fill' });

      const history = importManager.getImportHistory();
      expect(history).toHaveLength(2);
    });

    it('should get current state', async () => {
      expect(importManager.getCurrentState()).toBeNull();

      await importManager.importAnalysis(sampleData, { mode: 'fill' });

      expect(importManager.getCurrentState()).toEqual(sampleData);
    });
  });
});
