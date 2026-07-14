/**
 * JSON Extractor Tests
 *
 * Tests for the JSON extractor and fixer.
 * Covers various scenarios including:
 * - Normal JSON
 * - Markdown code fences
 * - Trailing commas
 * - Single quotes
 * - Half-finished JSON
 * - Malicious HTML injection
 */

import { describe, it, expect } from 'vitest';
import { extractJSON, extractAndValidateJSON } from '../../../src/main/ai/json-extractor';

describe('JSON Extractor', () => {
  describe('extractJSON', () => {
    it('should extract valid JSON directly', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
        projectFingerprint: 'sha256:abc123',
        summary: {
          logline: 'Test logline',
          structure: 'Test structure',
          confidence: 0.85,
          evidenceRefs: ['frame_001'],
        },
        segments: [],
        emotionPoints: [],
      });

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.schemaVersion).toBe('cineweave.analysis/1.0');
    });

    it('should extract JSON from markdown code fence', () => {
      const input = `
Here is the analysis result:

\`\`\`json
{
  "schemaVersion": "cineweave.analysis/1.0",
  "projectFingerprint": "sha256:abc123",
  "summary": {
    "logline": "Test logline",
    "structure": "Test structure",
    "confidence": 0.85,
    "evidenceRefs": ["frame_001"]
  },
  "segments": [],
  "emotionPoints": []
}
\`\`\`

Please review the above analysis.
`;

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.warnings).toContain('Extracted JSON from markdown code fence');
    });

    it('should extract JSON from code fence without language specifier', () => {
      const input = `
\`\`\`
{
  "schemaVersion": "cineweave.analysis/1.0",
  "projectFingerprint": "sha256:abc123",
  "summary": {
    "logline": "Test logline",
    "structure": "Test structure",
    "confidence": 0.85,
    "evidenceRefs": ["frame_001"]
  },
  "segments": [],
  "emotionPoints": []
}
\`\`\`
`;

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fix trailing commas', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "Test logline",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"],
        },
        "segments": [],
        "emotionPoints": [],
      }`;

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Removed trailing commas');
    });

    it('should fix single quotes', () => {
      const input = `{
        'schemaVersion': 'cineweave.analysis/1.0',
        'projectFingerprint': 'sha256:abc123',
        'summary': {
          'logline': 'Test logline',
          'structure': 'Test structure',
          'confidence': 0.85,
          'evidenceRefs': ['frame_001']
        },
        'segments': [],
        'emotionPoints': []
      }`;

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Replaced single quotes with double quotes');
    });

    it('should fix incomplete JSON by adding missing brackets', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "Test logline",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"]
        },
        "segments": [],
        "emotionPoints": []`;

      const result = extractJSON(input);
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Added 1 missing closing curly brackets');
    });

    it('should reject half-finished JSON', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "Test logline",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"]
        },
        "segments": [`;

      const result = extractJSON(input);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject JSON with malicious HTML injection', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "<script>alert('xss')</script>",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"]
        },
        "segments": [],
        "emotionPoints": []
      }`;

      const result = extractJSON(input);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Script tags detected in data');
    });

    it('should reject JSON with path traversal', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "Test logline",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"]
        },
        "segments": [{
          "id": "seg_001",
          "startMs": 0,
          "endMs": 1000,
          "title": "../../evil",
          "function": "Test function",
          "storyLineIds": [],
          "confidence": 0.8,
          "evidenceRefs": []
        }],
        "emotionPoints": []
      }`;

      const result = extractJSON(input);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Path traversal detected in data');
    });

    it('should reject JSON with absolute paths', () => {
      const input = `{
        "schemaVersion": "cineweave.analysis/1.0",
        "projectFingerprint": "sha256:abc123",
        "summary": {
          "logline": "Test logline",
          "structure": "Test structure",
          "confidence": 0.85,
          "evidenceRefs": ["frame_001"]
        },
        "segments": [{
          "id": "seg_001",
          "startMs": 0,
          "endMs": 1000,
          "title": "C:\\\\evil",
          "function": "Test function",
          "storyLineIds": [],
          "confidence": 0.8,
          "evidenceRefs": []
        }],
        "emotionPoints": []
      }`;

      const result = extractJSON(input);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Absolute path detected in data');
    });

    it('should handle empty input', () => {
      const result = extractJSON('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle non-JSON input', () => {
      const result = extractJSON('This is not JSON at all');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractAndValidateJSON', () => {
    const mediaDurationMs = 120000; // 2 minutes

    it('should extract and validate valid JSON', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
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
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject JSON with out-of-bounds time', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
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
          endMs: 180000, // Exceeds media duration
          title: 'Test segment',
          function: 'Test function',
          storyLineIds: ['line_main'],
          confidence: 0.8,
          evidenceRefs: ['frame_001'],
        }],
        emotionPoints: [],
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Segment seg_001: endMs > mediaDurationMs');
    });

    it('should reject JSON with duplicate IDs', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
        projectFingerprint: 'sha256:abc123',
        summary: {
          logline: 'Test logline',
          structure: 'Test structure',
          confidence: 0.85,
          evidenceRefs: ['frame_001'],
        },
        segments: [
          {
            id: 'seg_001',
            startMs: 0,
            endMs: 60000,
            title: 'Test segment 1',
            function: 'Test function',
            storyLineIds: ['line_main'],
            confidence: 0.8,
            evidenceRefs: ['frame_001'],
          },
          {
            id: 'seg_001', // Duplicate ID
            startMs: 60000,
            endMs: 120000,
            title: 'Test segment 2',
            function: 'Test function',
            storyLineIds: ['line_main'],
            confidence: 0.8,
            evidenceRefs: ['frame_002'],
          },
        ],
        emotionPoints: [],
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate segment ID: seg_001');
    });

    it('should reject JSON with existing IDs', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
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
        emotionPoints: [],
      });

      const existingIds = new Set(['seg_001']);
      const result = extractAndValidateJSON(input, mediaDurationMs, existingIds);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Segment ID already exists in database: seg_001');
    });

    it('should reject JSON with invalid confidence values', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
        projectFingerprint: 'sha256:abc123',
        summary: {
          logline: 'Test logline',
          structure: 'Test structure',
          confidence: 1.5, // Invalid
          evidenceRefs: ['frame_001'],
        },
        segments: [],
        emotionPoints: [],
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject JSON with invalid intensity values', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
        projectFingerprint: 'sha256:abc123',
        summary: {
          logline: 'Test logline',
          structure: 'Test structure',
          confidence: 0.85,
          evidenceRefs: ['frame_001'],
        },
        segments: [],
        emotionPoints: [{
          timeMs: 30000,
          intensity: 150, // Invalid
          valence: -20,
          label: 'Test emotion',
          evidenceRefs: ['frame_001'],
        }],
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject JSON with invalid valence values', () => {
      const input = JSON.stringify({
        schemaVersion: 'cineweave.analysis/1.0',
        projectFingerprint: 'sha256:abc123',
        summary: {
          logline: 'Test logline',
          structure: 'Test structure',
          confidence: 0.85,
          evidenceRefs: ['frame_001'],
        },
        segments: [],
        emotionPoints: [{
          timeMs: 30000,
          intensity: 75,
          valence: -150, // Invalid
          label: 'Test emotion',
          evidenceRefs: ['frame_001'],
        }],
      });

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should extract JSON from markdown code fence and validate', () => {
      const input = `
\`\`\`json
{
  "schemaVersion": "cineweave.analysis/1.0",
  "projectFingerprint": "sha256:abc123",
  "summary": {
    "logline": "Test logline",
    "structure": "Test structure",
    "confidence": 0.85,
    "evidenceRefs": ["frame_001"]
  },
  "segments": [],
  "emotionPoints": []
}
\`\`\`
`;

      const result = extractAndValidateJSON(input, mediaDurationMs);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
