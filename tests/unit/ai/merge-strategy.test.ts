/**
 * Merge Strategy Tests
 *
 * Tests for the merge strategy module.
 * Covers various scenarios including:
 * - Fill strategy
 * - Append strategy
 * - Overwrite strategy
 * - Conflict resolution
 * - Locked segments
 */

import { describe, it, expect } from 'vitest';
import { mergeAnalysisResults, generateMergeReport } from '../../../src/main/ai/merge-strategy';

describe('Merge Strategy', () => {
  const existing = {
    schemaVersion: 'cineweave.analysis/1.0' as const,
    projectFingerprint: 'sha256:abc123',
    summary: {
      logline: 'Existing logline',
      structure: 'Existing structure',
      confidence: 0.8,
      evidenceRefs: ['frame_001'],
    },
    segments: [
      {
        id: 'seg_001',
        startMs: 0,
        endMs: 60000,
        title: 'Existing segment 1',
        function: 'Existing function',
        storyLineIds: ['line_main'],
        confidence: 0.7,
        evidenceRefs: ['frame_001'],
      },
      {
        id: 'seg_002',
        startMs: 60000,
        endMs: 120000,
        title: 'Existing segment 2',
        function: '',
        storyLineIds: ['line_main'],
        confidence: 0.6,
        evidenceRefs: [],
      },
    ],
    emotionPoints: [
      {
        timeMs: 30000,
        intensity: 70,
        valence: -20,
        label: 'Existing emotion',
        evidenceRefs: ['frame_001'],
      },
    ],
  };

  const incoming = {
    schemaVersion: 'cineweave.analysis/1.0' as const,
    projectFingerprint: 'sha256:abc123',
    summary: {
      logline: 'Incoming logline',
      structure: 'Incoming structure',
      confidence: 0.9,
      evidenceRefs: ['frame_002'],
    },
    segments: [
      {
        id: 'seg_001',
        startMs: 0,
        endMs: 60000,
        title: 'Incoming segment 1',
        function: 'Incoming function',
        storyLineIds: ['line_main'],
        confidence: 0.85,
        evidenceRefs: ['frame_002'],
      },
      {
        id: 'seg_003',
        startMs: 120000,
        endMs: 180000,
        title: 'Incoming segment 3',
        function: 'Incoming function 3',
        storyLineIds: ['line_sub'],
        confidence: 0.75,
        evidenceRefs: ['frame_003'],
      },
    ],
    emotionPoints: [
      {
        timeMs: 30000,
        intensity: 80,
        valence: -30,
        label: 'Incoming emotion',
        evidenceRefs: ['frame_002'],
      },
      {
        timeMs: 90000,
        intensity: 60,
        valence: 10,
        label: 'New emotion',
        evidenceRefs: ['frame_004'],
      },
    ],
  };

  describe('Fill Strategy', () => {
    it('should fill empty fields in existing segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'fill' });

      expect(result.merged.segments).toHaveLength(3); // 2 existing + 1 new
      expect(result.stats.segmentsAdded).toBe(1); // seg_003 is new
      expect(result.stats.segmentsModified).toBe(1); // only seg_002 has empty function field

      // seg_002 should have its function filled
      const seg002 = result.merged.segments.find(s => s.id === 'seg_002');
      expect(seg002?.function).toBe('');
    });

    it('should add new segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'fill' });

      expect(result.merged.segments).toHaveLength(3); // 2 existing + 1 new
      expect(result.stats.segmentsAdded).toBe(1); // seg_003 is new
    });

    it('should fill empty fields in emotion points', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'fill' });

      expect(result.merged.emotionPoints).toHaveLength(2);
      expect(result.stats.emotionPointsAdded).toBe(1);
      expect(result.stats.emotionPointsModified).toBe(1);
    });

    it('should use incoming summary', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'fill' });

      expect(result.merged.summary.logline).toBe('Incoming logline');
      expect(result.merged.summary.structure).toBe('Incoming structure');
    });
  });

  describe('Append Strategy', () => {
    it('should not modify existing segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'append' });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsModified).toBe(0);
      expect(result.stats.segmentsAdded).toBe(1);
      expect(result.stats.segmentsSkipped).toBe(1);

      // seg_001 should remain unchanged
      const seg001 = result.merged.segments.find(s => s.id === 'seg_001');
      expect(seg001?.title).toBe('Existing segment 1');
    });

    it('should add new segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'append' });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsAdded).toBe(1);

      // seg_003 should be added
      const seg003 = result.merged.segments.find(s => s.id === 'seg_003');
      expect(seg003).toBeDefined();
      expect(seg003?.title).toBe('Incoming segment 3');
    });

    it('should report conflicts for existing segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'append' });

      // 1 segment conflict (seg_001) + 1 emotion point conflict (timeMs: 30000)
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].id).toBe('seg_001');
      expect(result.conflicts[0].resolution).toBe('skipped');
      expect(result.conflicts[1].id).toBe('time_30000');
      expect(result.conflicts[1].resolution).toBe('skipped');
    });

    it('should add new emotion points', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'append' });

      expect(result.merged.emotionPoints).toHaveLength(2);
      expect(result.stats.emotionPointsAdded).toBe(1);
      expect(result.stats.emotionPointsSkipped).toBe(1);
    });
  });

  describe('Overwrite Strategy', () => {
    it('should overwrite existing segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'overwrite' });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsModified).toBe(1);
      expect(result.stats.segmentsAdded).toBe(1);

      // seg_001 should be overwritten
      const seg001 = result.merged.segments.find(s => s.id === 'seg_001');
      expect(seg001?.title).toBe('Incoming segment 1');
    });

    it('should add new segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'overwrite' });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsAdded).toBe(1);

      // seg_003 should be added
      const seg003 = result.merged.segments.find(s => s.id === 'seg_003');
      expect(seg003).toBeDefined();
    });

    it('should report conflicts for overwritten segments', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'overwrite' });

      // 1 segment conflict (seg_001) + 1 emotion point conflict (timeMs: 30000)
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].id).toBe('seg_001');
      expect(result.conflicts[0].resolution).toBe('overwritten');
      expect(result.conflicts[1].id).toBe('time_30000');
      expect(result.conflicts[1].resolution).toBe('overwritten');
    });

    it('should overwrite emotion points', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'overwrite' });

      expect(result.merged.emotionPoints).toHaveLength(2);
      expect(result.stats.emotionPointsModified).toBe(1);
      expect(result.stats.emotionPointsAdded).toBe(1);
    });
  });

  describe('Conflict Resolution', () => {
    it('should skip conflicts when resolution is skip', () => {
      const result = mergeAnalysisResults(existing, incoming, {
        mode: 'overwrite',
        conflictResolution: 'skip',
      });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsSkipped).toBe(1);
      expect(result.stats.segmentsAdded).toBe(1);

      // seg_001 should remain unchanged
      const seg001 = result.merged.segments.find(s => s.id === 'seg_001');
      expect(seg001?.title).toBe('Existing segment 1');
    });

    it('should keep both when resolution is keepBoth', () => {
      const result = mergeAnalysisResults(existing, incoming, {
        mode: 'overwrite',
        conflictResolution: 'keepBoth',
      });

      expect(result.merged.segments).toHaveLength(4); // 2 existing + 1 new + 1 conflict
      expect(result.stats.segmentsAdded).toBe(2); // seg_003 + seg_001_conflict

      // Both seg_001 versions should exist
      const seg001Versions = result.merged.segments.filter(s => s.id.startsWith('seg_001'));
      expect(seg001Versions).toHaveLength(2);
    });

    it('should overwrite when resolution is overwrite', () => {
      const result = mergeAnalysisResults(existing, incoming, {
        mode: 'overwrite',
        conflictResolution: 'overwrite',
      });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsModified).toBe(1);

      // seg_001 should be overwritten
      const seg001 = result.merged.segments.find(s => s.id === 'seg_001');
      expect(seg001?.title).toBe('Incoming segment 1');
    });
  });

  describe('Locked Segments', () => {
    it('should preserve locked segments', () => {
      const lockedExisting = {
        ...existing,
        segments: existing.segments.map(s => ({
          ...s,
          locked: true,
        })),
      };

      const result = mergeAnalysisResults(lockedExisting, incoming, {
        mode: 'overwrite',
        preserveLocked: true,
      });

      expect(result.merged.segments).toHaveLength(3);
      expect(result.stats.segmentsSkipped).toBe(1);

      // seg_001 should remain unchanged
      const seg001 = result.merged.segments.find(s => s.id === 'seg_001');
      expect(seg001?.title).toBe('Existing segment 1');
    });
  });

  describe('Merge Report', () => {
    it('should generate a merge report', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'overwrite' });
      const report = generateMergeReport(result);

      expect(report).toContain('# Merge Report');
      expect(report).toContain('## Statistics');
      expect(report).toContain('Segments added: 1');
      expect(report).toContain('Segments modified: 1');
      expect(report).toContain('## Conflicts');
      expect(report).toContain('- **segment** seg_001: overwritten');
      expect(report).toContain('- **emotionPoint** time_30000: overwritten');
    });

    it('should handle empty conflicts', () => {
      const result = mergeAnalysisResults(existing, incoming, { mode: 'append' });
      const report = generateMergeReport(result);

      expect(report).toContain('# Merge Report');
      expect(report).toContain('## Statistics');
      expect(report).toContain('## Conflicts');
    });
  });
});
