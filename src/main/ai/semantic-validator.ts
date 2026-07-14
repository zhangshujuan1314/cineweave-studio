/**
 * Semantic Validator
 *
 * Validates semantic rules for AI analysis results:
 * - Time range validation
 * - ID uniqueness
 * - Evidence reference validation
 * - Interval overlap detection
 * - Confidence threshold checking
 */

import { z } from 'zod';

// Analysis result schema (same as in schema-validator)
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

export interface SemanticValidationResult {
  valid: boolean;
  errors: SemanticValidationError[];
  warnings: SemanticValidationWarning[];
  lowConfidenceItems: LowConfidenceItem[];
}

export interface SemanticValidationError {
  type: 'TIME_RANGE' | 'DUPLICATE_ID' | 'REFERENCE_NOT_FOUND' | 'OVERLAPPING_SEGMENTS' | 'OUT_OF_BOUNDS';
  message: string;
  path: string;
  value?: unknown;
}

export interface SemanticValidationWarning {
  type: 'LOW_CONFIDENCE' | 'OVERLAPPING_SEGMENTS' | 'MISSING_EVIDENCE' | 'EMPTY_FIELD';
  message: string;
  path: string;
  value?: unknown;
}

export interface LowConfidenceItem {
  type: 'segment' | 'emotionPoint';
  id: string;
  confidence: number;
  threshold: number;
}

export interface SemanticValidationOptions {
  mediaDurationMs: number;
  existingSegmentIds?: Set<string>;
  existingFrameIds?: Set<string>;
  existingSubtitleIds?: Set<string>;
  confidenceThreshold?: number;
  allowOverlapping?: boolean;
}

/**
 * Validate semantic rules
 */
export function validateSemantics(
  data: AnalysisResult,
  options: SemanticValidationOptions
): SemanticValidationResult {
  const errors: SemanticValidationError[] = [];
  const warnings: SemanticValidationWarning[] = [];
  const lowConfidenceItems: LowConfidenceItem[] = [];

  const {
    mediaDurationMs,
    existingSegmentIds = new Set(),
    existingFrameIds = new Set(),
    existingSubtitleIds = new Set(),
    confidenceThreshold = 0.7,
    allowOverlapping = false,
  } = options;

  // 1. Validate segment time ranges
  for (let i = 0; i < data.segments.length; i++) {
    const segment = data.segments[i];
    const pathPrefix = `segments[${i}]`;

    // Check startMs < endMs
    if (segment.startMs >= segment.endMs) {
      errors.push({
        type: 'TIME_RANGE',
        message: `startMs must be less than endMs: ${segment.startMs} >= ${segment.endMs}`,
        path: `${pathPrefix}.startMs`,
        value: segment.startMs,
      });
    }

    // Check startMs >= 0
    if (segment.startMs < 0) {
      errors.push({
        type: 'TIME_RANGE',
        message: `startMs must be non-negative: ${segment.startMs}`,
        path: `${pathPrefix}.startMs`,
        value: segment.startMs,
      });
    }

    // Check endMs <= mediaDurationMs
    if (segment.endMs > mediaDurationMs) {
      errors.push({
        type: 'OUT_OF_BOUNDS',
        message: `endMs exceeds media duration: ${segment.endMs} > ${mediaDurationMs}`,
        path: `${pathPrefix}.endMs`,
        value: segment.endMs,
      });
    }
  }

  // 2. Validate emotion point time ranges
  for (let i = 0; i < data.emotionPoints.length; i++) {
    const point = data.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    // Check timeMs >= 0
    if (point.timeMs < 0) {
      errors.push({
        type: 'TIME_RANGE',
        message: `timeMs must be non-negative: ${point.timeMs}`,
        path: `${pathPrefix}.timeMs`,
        value: point.timeMs,
      });
    }

    // Check timeMs <= mediaDurationMs
    if (point.timeMs > mediaDurationMs) {
      errors.push({
        type: 'OUT_OF_BOUNDS',
        message: `timeMs exceeds media duration: ${point.timeMs} > ${mediaDurationMs}`,
        path: `${pathPrefix}.timeMs`,
        value: point.timeMs,
      });
    }

    // Check intensity range
    if (point.intensity < 0 || point.intensity > 100) {
      errors.push({
        type: 'OUT_OF_BOUNDS',
        message: `intensity must be between 0 and 100: ${point.intensity}`,
        path: `${pathPrefix}.intensity`,
        value: point.intensity,
      });
    }

    // Check valence range
    if (point.valence < -100 || point.valence > 100) {
      errors.push({
        type: 'OUT_OF_BOUNDS',
        message: `valence must be between -100 and 100: ${point.valence}`,
        path: `${pathPrefix}.valence`,
        value: point.valence,
      });
    }
  }

  // 3. Check ID uniqueness
  const segmentIds = new Set<string>();
  for (let i = 0; i < data.segments.length; i++) {
    const segment = data.segments[i];
    const pathPrefix = `segments[${i}]`;

    // Check for duplicate IDs within the data
    if (segmentIds.has(segment.id)) {
      errors.push({
        type: 'DUPLICATE_ID',
        message: `Duplicate segment ID: ${segment.id}`,
        path: `${pathPrefix}.id`,
        value: segment.id,
      });
    }
    segmentIds.add(segment.id);

    // Check if ID already exists in database
    if (existingSegmentIds.has(segment.id)) {
      errors.push({
        type: 'DUPLICATE_ID',
        message: `Segment ID already exists in database: ${segment.id}`,
        path: `${pathPrefix}.id`,
        value: segment.id,
      });
    }
  }

  // 4. Check for overlapping segments
  if (!allowOverlapping) {
    for (let i = 0; i < data.segments.length; i++) {
      for (let j = i + 1; j < data.segments.length; j++) {
        const seg1 = data.segments[i];
        const seg2 = data.segments[j];

        if (seg1.startMs < seg2.endMs && seg2.startMs < seg1.endMs) {
          warnings.push({
            type: 'OVERLAPPING_SEGMENTS',
            message: `Overlapping segments: ${seg1.id} (${seg1.startMs}-${seg1.endMs}) and ${seg2.id} (${seg2.startMs}-${seg2.endMs})`,
            path: `segments[${i}].startMs`,
            value: { seg1: { start: seg1.startMs, end: seg1.endMs }, seg2: { start: seg2.startMs, end: seg2.endMs } },
          });
        }
      }
    }
  }

  // 5. Check evidence references
  for (let i = 0; i < data.segments.length; i++) {
    const segment = data.segments[i];
    const pathPrefix = `segments[${i}]`;

    for (const ref of segment.evidenceRefs) {
      if (ref.startsWith('frame_')) {
        if (existingFrameIds.size > 0 && !existingFrameIds.has(ref)) {
          warnings.push({
            type: 'REFERENCE_NOT_FOUND',
            message: `Frame reference not found: ${ref}`,
            path: `${pathPrefix}.evidenceRefs`,
            value: ref,
          });
        }
      } else if (ref.startsWith('sub_')) {
        if (existingSubtitleIds.size > 0 && !existingSubtitleIds.has(ref)) {
          warnings.push({
            type: 'REFERENCE_NOT_FOUND',
            message: `Subtitle reference not found: ${ref}`,
            path: `${pathPrefix}.evidenceRefs`,
            value: ref,
          });
        }
      }
    }

    // Check if segment has evidence
    if (segment.evidenceRefs.length === 0) {
      warnings.push({
        type: 'MISSING_EVIDENCE',
        message: `Segment has no evidence references`,
        path: `${pathPrefix}.evidenceRefs`,
        value: segment.evidenceRefs,
      });
    }
  }

  for (let i = 0; i < data.emotionPoints.length; i++) {
    const point = data.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    for (const ref of point.evidenceRefs) {
      if (ref.startsWith('frame_')) {
        if (existingFrameIds.size > 0 && !existingFrameIds.has(ref)) {
          warnings.push({
            type: 'REFERENCE_NOT_FOUND',
            message: `Frame reference not found: ${ref}`,
            path: `${pathPrefix}.evidenceRefs`,
            value: ref,
          });
        }
      } else if (ref.startsWith('sub_')) {
        if (existingSubtitleIds.size > 0 && !existingSubtitleIds.has(ref)) {
          warnings.push({
            type: 'REFERENCE_NOT_FOUND',
            message: `Subtitle reference not found: ${ref}`,
            path: `${pathPrefix}.evidenceRefs`,
            value: ref,
          });
        }
      }
    }

    // Check if emotion point has evidence
    if (point.evidenceRefs.length === 0) {
      warnings.push({
        type: 'MISSING_EVIDENCE',
        message: `Emotion point has no evidence references`,
        path: `${pathPrefix}.evidenceRefs`,
        value: point.evidenceRefs,
      });
    }
  }

  // 6. Check confidence thresholds
  for (let i = 0; i < data.segments.length; i++) {
    const segment = data.segments[i];
    const pathPrefix = `segments[${i}]`;

    if (segment.confidence < confidenceThreshold) {
      lowConfidenceItems.push({
        type: 'segment',
        id: segment.id,
        confidence: segment.confidence,
        threshold: confidenceThreshold,
      });

      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `Low confidence in segment: ${segment.confidence} < ${confidenceThreshold}`,
        path: `${pathPrefix}.confidence`,
        value: segment.confidence,
      });
    }
  }

  for (let i = 0; i < data.emotionPoints.length; i++) {
    const point = data.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    // Emotion points don't have confidence, but we can check intensity
    if (point.intensity < 50) {
      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `Low intensity emotion point: ${point.intensity}`,
        path: `${pathPrefix}.intensity`,
        value: point.intensity,
      });
    }
  }

  // 7. Check for empty fields
  for (let i = 0; i < data.segments.length; i++) {
    const segment = data.segments[i];
    const pathPrefix = `segments[${i}]`;

    if (segment.title.trim().length === 0) {
      warnings.push({
        type: 'EMPTY_FIELD',
        message: `Segment has empty title`,
        path: `${pathPrefix}.title`,
        value: segment.title,
      });
    }

    if (segment.function.trim().length === 0) {
      warnings.push({
        type: 'EMPTY_FIELD',
        message: `Segment has empty function description`,
        path: `${pathPrefix}.function`,
        value: segment.function,
      });
    }
  }

  for (let i = 0; i < data.emotionPoints.length; i++) {
    const point = data.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    if (point.label.trim().length === 0) {
      warnings.push({
        type: 'EMPTY_FIELD',
        message: `Emotion point has empty label`,
        path: `${pathPrefix}.label`,
        value: point.label,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lowConfidenceItems,
  };
}

/**
 * Generate a human-readable semantic validation report
 */
export function generateSemanticValidationReport(result: SemanticValidationResult): string {
  const lines: string[] = [];

  lines.push('# Semantic Validation Report');
  lines.push('');

  if (result.valid) {
    lines.push('✅ Semantic validation passed');
  } else {
    lines.push('❌ Semantic validation failed');
  }

  lines.push('');

  if (result.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`- **${error.type}**: ${error.message}`);
      lines.push(`  - Path: ${error.path}`);
      if (error.value !== undefined) {
        lines.push(`  - Value: ${JSON.stringify(error.value)}`);
      }
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- **${warning.type}**: ${warning.message}`);
      lines.push(`  - Path: ${warning.path}`);
      if (warning.value !== undefined) {
        lines.push(`  - Value: ${JSON.stringify(warning.value)}`);
      }
    }
    lines.push('');
  }

  if (result.lowConfidenceItems.length > 0) {
    lines.push('## Low Confidence Items');
    lines.push('');
    lines.push('These items have confidence below the threshold and should be reviewed:');
    lines.push('');
    for (const item of result.lowConfidenceItems) {
      lines.push(`- **${item.type}** ${item.id}: confidence ${item.confidence} < ${item.threshold}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Filter out low confidence items from the data
 */
export function filterLowConfidence(
  data: AnalysisResult,
  threshold: number
): {
  filtered: AnalysisResult;
  removedSegments: string[];
  removedEmotionPoints: number[];
} {
  const removedSegments: string[] = [];
  const removedEmotionPoints: number[] = [];

  const filteredSegments = data.segments.filter(segment => {
    if (segment.confidence < threshold) {
      removedSegments.push(segment.id);
      return false;
    }
    return true;
  });

  const filteredEmotionPoints = data.emotionPoints.filter((point, index) => {
    // Emotion points don't have confidence, but we can filter by intensity
    if (point.intensity < 50) {
      removedEmotionPoints.push(index);
      return false;
    }
    return true;
  });

  return {
    filtered: {
      ...data,
      segments: filteredSegments,
      emotionPoints: filteredEmotionPoints,
    },
    removedSegments,
    removedEmotionPoints,
  };
}
