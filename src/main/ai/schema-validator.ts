/**
 * Schema Validator
 *
 * Validates AI output against the CineWeave analysis schema.
 * Checks structure, types, and value ranges.
 */

import { z } from 'zod';

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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Validate data against the analysis schema
 */
export function validateSchema(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic structure validation
  const result = AnalysisResultSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        value: 'received' in issue ? issue.received : undefined,
      });
    }
    return { valid: false, errors, warnings };
  }

  const validatedData = result.data;

  // Additional validations beyond basic schema

  // Check schema version
  if (validatedData.schemaVersion !== 'cineweave.analysis/1.0') {
    errors.push({
      path: 'schemaVersion',
      message: `Invalid schema version: ${validatedData.schemaVersion}`,
      value: validatedData.schemaVersion,
    });
  }

  // Check project fingerprint format
  if (!validatedData.projectFingerprint.startsWith('sha256:')) {
    warnings.push({
      path: 'projectFingerprint',
      message: 'Project fingerprint should start with sha256:',
      value: validatedData.projectFingerprint,
    });
  }

  // Check summary
  if (validatedData.summary.confidence < 0.5) {
    warnings.push({
      path: 'summary.confidence',
      message: 'Low confidence in summary',
      value: validatedData.summary.confidence,
    });
  }

  // Check segments
  for (let i = 0; i < validatedData.segments.length; i++) {
    const segment = validatedData.segments[i];
    const pathPrefix = `segments[${i}]`;

    // Check ID format
    if (!segment.id.startsWith('seg_')) {
      warnings.push({
        path: `${pathPrefix}.id`,
        message: 'Segment ID should start with seg_',
        value: segment.id,
      });
    }

    // Check time range
    if (segment.startMs >= segment.endMs) {
      errors.push({
        path: `${pathPrefix}.startMs`,
        message: 'startMs must be less than endMs',
        value: segment.startMs,
      });
    }

    // Check confidence
    if (segment.confidence < 0.5) {
      warnings.push({
        path: `${pathPrefix}.confidence`,
        message: 'Low confidence in segment',
        value: segment.confidence,
      });
    }

    // Check story line IDs
    if (segment.storyLineIds.length === 0) {
      warnings.push({
        path: `${pathPrefix}.storyLineIds`,
        message: 'Segment has no story line IDs',
        value: segment.storyLineIds,
      });
    }

    // Check evidence references
    if (segment.evidenceRefs.length === 0) {
      warnings.push({
        path: `${pathPrefix}.evidenceRefs`,
        message: 'Segment has no evidence references',
        value: segment.evidenceRefs,
      });
    }

    // Check function field
    if (segment.function.length < 10) {
      warnings.push({
        path: `${pathPrefix}.function`,
        message: 'Segment function description is too short',
        value: segment.function,
      });
    }
  }

  // Check emotion points
  for (let i = 0; i < validatedData.emotionPoints.length; i++) {
    const point = validatedData.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    // Check intensity and valence ranges
    if (point.intensity < 0 || point.intensity > 100) {
      errors.push({
        path: `${pathPrefix}.intensity`,
        message: 'Intensity must be between 0 and 100',
        value: point.intensity,
      });
    }

    if (point.valence < -100 || point.valence > 100) {
      errors.push({
        path: `${pathPrefix}.valence`,
        message: 'Valence must be between -100 and 100',
        value: point.valence,
      });
    }

    // Check label
    if (point.label.length < 2) {
      warnings.push({
        path: `${pathPrefix}.label`,
        message: 'Emotion point label is too short',
        value: point.label,
      });
    }

    // Check evidence references
    if (point.evidenceRefs.length === 0) {
      warnings.push({
        path: `${pathPrefix}.evidenceRefs`,
        message: 'Emotion point has no evidence references',
        value: point.evidenceRefs,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate data with additional context
 */
export function validateWithContext(
  data: unknown,
  context: {
    mediaDurationMs: number;
    existingSegmentIds?: Set<string>;
    existingFrameIds?: Set<string>;
    existingSubtitleIds?: Set<string>;
  }
): ValidationResult {
  const baseValidation = validateSchema(data);
  if (!baseValidation.valid) {
    return baseValidation;
  }

  const validatedData = data as AnalysisResult;
  const errors: ValidationError[] = [...baseValidation.errors];
  const warnings: ValidationWarning[] = [...baseValidation.warnings];

  // Check time ranges against media duration
  for (let i = 0; i < validatedData.segments.length; i++) {
    const segment = validatedData.segments[i];
    const pathPrefix = `segments[${i}]`;

    if (segment.endMs > context.mediaDurationMs) {
      errors.push({
        path: `${pathPrefix}.endMs`,
        message: `endMs exceeds media duration: ${segment.endMs} > ${context.mediaDurationMs}`,
        value: segment.endMs,
      });
    }
  }

  for (let i = 0; i < validatedData.emotionPoints.length; i++) {
    const point = validatedData.emotionPoints[i];
    const pathPrefix = `emotionPoints[${i}]`;

    if (point.timeMs > context.mediaDurationMs) {
      errors.push({
        path: `${pathPrefix}.timeMs`,
        message: `timeMs exceeds media duration: ${point.timeMs} > ${context.mediaDurationMs}`,
        value: point.timeMs,
      });
    }
  }

  // Check for duplicate IDs within the data
  const segmentIds = new Set<string>();
  for (let i = 0; i < validatedData.segments.length; i++) {
    const segment = validatedData.segments[i];
    const pathPrefix = `segments[${i}]`;

    if (segmentIds.has(segment.id)) {
      errors.push({
        path: `${pathPrefix}.id`,
        message: `Duplicate segment ID: ${segment.id}`,
        value: segment.id,
      });
    }
    segmentIds.add(segment.id);

    // Check if ID already exists in database
    if (context.existingSegmentIds?.has(segment.id)) {
      errors.push({
        path: `${pathPrefix}.id`,
        message: `Segment ID already exists in database: ${segment.id}`,
        value: segment.id,
      });
    }
  }

  // Check evidence references
  for (let i = 0; i < validatedData.segments.length; i++) {
    const segment = validatedData.segments[i];
    const pathPrefix = `segments[${i}]`;

    for (const ref of segment.evidenceRefs) {
      if (ref.startsWith('frame_') && context.existingFrameIds) {
        if (!context.existingFrameIds.has(ref)) {
          warnings.push({
            path: `${pathPrefix}.evidenceRefs`,
            message: `Frame reference not found: ${ref}`,
            value: ref,
          });
        }
      } else if (ref.startsWith('sub_') && context.existingSubtitleIds) {
        if (!context.existingSubtitleIds.has(ref)) {
          warnings.push({
            path: `${pathPrefix}.evidenceRefs`,
            message: `Subtitle reference not found: ${ref}`,
            value: ref,
          });
        }
      }
    }
  }

  // Check for overlapping segments
  for (let i = 0; i < validatedData.segments.length; i++) {
    for (let j = i + 1; j < validatedData.segments.length; j++) {
      const seg1 = validatedData.segments[i];
      const seg2 = validatedData.segments[j];

      if (seg1.startMs < seg2.endMs && seg2.startMs < seg1.endMs) {
        warnings.push({
          path: `segments[${i}].startMs`,
          message: `Overlapping segments: ${seg1.id} and ${seg2.id}`,
          value: { seg1: { start: seg1.startMs, end: seg1.endMs }, seg2: { start: seg2.startMs, end: seg2.endMs } },
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a human-readable validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('# Validation Report');
  lines.push('');

  if (result.valid) {
    lines.push('✅ Validation passed');
  } else {
    lines.push('❌ Validation failed');
  }

  lines.push('');

  if (result.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`- **${error.path}**: ${error.message}`);
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
      lines.push(`- **${warning.path}**: ${warning.message}`);
      if (warning.value !== undefined) {
        lines.push(`  - Value: ${JSON.stringify(warning.value)}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
