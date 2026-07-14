/**
 * Merge Strategy
 *
 * Implements different strategies for merging AI analysis results
 * with existing data:
 * - Fill: Only fill empty fields in existing segments
 * - Append: Add new segments without modifying existing ones
 * - Overwrite: Replace existing segments with new data
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

export type MergeMode = 'fill' | 'append' | 'overwrite';

export interface MergeOptions {
  mode: MergeMode;
  preserveLocked?: boolean;
  conflictResolution?: 'skip' | 'overwrite' | 'keepBoth';
}

export interface MergeResult {
  merged: AnalysisResult;
  conflicts: MergeConflict[];
  stats: MergeStats;
}

export interface MergeConflict {
  type: 'segment' | 'emotionPoint';
  id: string;
  existing: unknown;
  incoming: unknown;
  resolution: 'skipped' | 'overwritten' | 'keptBoth';
}

export interface MergeStats {
  segmentsAdded: number;
  segmentsModified: number;
  segmentsSkipped: number;
  emotionPointsAdded: number;
  emotionPointsModified: number;
  emotionPointsSkipped: number;
}

/**
 * Merge AI analysis results with existing data
 */
export function mergeAnalysisResults(
  existing: AnalysisResult,
  incoming: AnalysisResult,
  options: MergeOptions
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const stats: MergeStats = {
    segmentsAdded: 0,
    segmentsModified: 0,
    segmentsSkipped: 0,
    emotionPointsAdded: 0,
    emotionPointsModified: 0,
    emotionPointsSkipped: 0,
  };

  // Merge segments
  const mergedSegments = mergeSegments(
    existing.segments,
    incoming.segments,
    options,
    conflicts,
    stats
  );

  // Merge emotion points
  const mergedEmotionPoints = mergeEmotionPoints(
    existing.emotionPoints,
    incoming.emotionPoints,
    options,
    conflicts,
    stats
  );

  // Merge summary (always use incoming if available)
  const mergedSummary = incoming.summary || existing.summary;

  return {
    merged: {
      schemaVersion: 'cineweave.analysis/1.0',
      projectFingerprint: existing.projectFingerprint,
      summary: mergedSummary,
      segments: mergedSegments,
      emotionPoints: mergedEmotionPoints,
    },
    conflicts,
    stats,
  };
}

/**
 * Merge segments based on strategy
 */
function mergeSegments(
  existing: AnalysisResult['segments'],
  incoming: AnalysisResult['segments'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['segments'] {
  switch (options.mode) {
    case 'fill':
      return mergeSegmentsFill(existing, incoming, options, conflicts, stats);
    case 'append':
      return mergeSegmentsAppend(existing, incoming, options, conflicts, stats);
    case 'overwrite':
      return mergeSegmentsOverwrite(existing, incoming, options, conflicts, stats);
    default:
      throw new Error(`Unknown merge mode: ${options.mode}`);
  }
}

/**
 * Fill strategy: Only fill empty fields in existing segments
 */
function mergeSegmentsFill(
  existing: AnalysisResult['segments'],
  incoming: AnalysisResult['segments'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['segments'] {
  const result = [...existing];
  const existingIds = new Set(existing.map(s => s.id));

  for (const incomingSegment of incoming) {
    const existingIndex = result.findIndex(s => s.id === incomingSegment.id);

    if (existingIndex === -1) {
      // New segment, add it
      result.push(incomingSegment);
      stats.segmentsAdded++;
    } else {
      // Existing segment, fill empty fields
      const existingSegment = result[existingIndex];

      // Check if segment is locked
      if (options.preserveLocked && isSegmentLocked(existingSegment)) {
        conflicts.push({
          type: 'segment',
          id: incomingSegment.id,
          existing: existingSegment,
          incoming: incomingSegment,
          resolution: 'skipped',
        });
        stats.segmentsSkipped++;
        continue;
      }

      // Fill empty fields
      const merged = fillEmptyFields(existingSegment, incomingSegment);
      result[existingIndex] = merged;
      stats.segmentsModified++;
    }
  }

  return result;
}

/**
 * Append strategy: Add new segments without modifying existing ones
 */
function mergeSegmentsAppend(
  existing: AnalysisResult['segments'],
  incoming: AnalysisResult['segments'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['segments'] {
  const result = [...existing];
  const existingIds = new Set(existing.map(s => s.id));

  for (const incomingSegment of incoming) {
    if (existingIds.has(incomingSegment.id)) {
      // Segment already exists, skip it
      conflicts.push({
        type: 'segment',
        id: incomingSegment.id,
        existing: existing.find(s => s.id === incomingSegment.id),
        incoming: incomingSegment,
        resolution: 'skipped',
      });
      stats.segmentsSkipped++;
    } else {
      // New segment, add it
      result.push(incomingSegment);
      stats.segmentsAdded++;
    }
  }

  return result;
}

/**
 * Overwrite strategy: Replace existing segments with new data
 */
function mergeSegmentsOverwrite(
  existing: AnalysisResult['segments'],
  incoming: AnalysisResult['segments'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['segments'] {
  const result = [...existing];
  const existingIds = new Set(existing.map(s => s.id));

  for (const incomingSegment of incoming) {
    const existingIndex = result.findIndex(s => s.id === incomingSegment.id);

    if (existingIndex === -1) {
      // New segment, add it
      result.push(incomingSegment);
      stats.segmentsAdded++;
    } else {
      // Existing segment, overwrite it
      const existingSegment = result[existingIndex];

      // Check if segment is locked
      if (options.preserveLocked && isSegmentLocked(existingSegment)) {
        conflicts.push({
          type: 'segment',
          id: incomingSegment.id,
          existing: existingSegment,
          incoming: incomingSegment,
          resolution: 'skipped',
        });
        stats.segmentsSkipped++;
        continue;
      }

      // Handle conflict based on resolution strategy
      if (options.conflictResolution === 'skip') {
        conflicts.push({
          type: 'segment',
          id: incomingSegment.id,
          existing: existingSegment,
          incoming: incomingSegment,
          resolution: 'skipped',
        });
        stats.segmentsSkipped++;
      } else if (options.conflictResolution === 'keepBoth') {
        // Keep both by creating a new ID for the incoming segment
        const newId = `${incomingSegment.id}_conflict_${Date.now()}`;
        result.push({ ...incomingSegment, id: newId });
        conflicts.push({
          type: 'segment',
          id: incomingSegment.id,
          existing: existingSegment,
          incoming: incomingSegment,
          resolution: 'keptBoth',
        });
        stats.segmentsAdded++;
      } else {
        // Overwrite
        result[existingIndex] = incomingSegment;
        conflicts.push({
          type: 'segment',
          id: incomingSegment.id,
          existing: existingSegment,
          incoming: incomingSegment,
          resolution: 'overwritten',
        });
        stats.segmentsModified++;
      }
    }
  }

  return result;
}

/**
 * Merge emotion points based on strategy
 */
function mergeEmotionPoints(
  existing: AnalysisResult['emotionPoints'],
  incoming: AnalysisResult['emotionPoints'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['emotionPoints'] {
  switch (options.mode) {
    case 'fill':
      return mergeEmotionPointsFill(existing, incoming, options, conflicts, stats);
    case 'append':
      return mergeEmotionPointsAppend(existing, incoming, options, conflicts, stats);
    case 'overwrite':
      return mergeEmotionPointsOverwrite(existing, incoming, options, conflicts, stats);
    default:
      throw new Error(`Unknown merge mode: ${options.mode}`);
  }
}

/**
 * Fill strategy for emotion points
 */
function mergeEmotionPointsFill(
  existing: AnalysisResult['emotionPoints'],
  incoming: AnalysisResult['emotionPoints'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['emotionPoints'] {
  // Emotion points don't have IDs, so we match by time
  const result = [...existing];
  const existingTimes = new Set(existing.map(p => p.timeMs));

  for (const incomingPoint of incoming) {
    const existingIndex = result.findIndex(p => p.timeMs === incomingPoint.timeMs);

    if (existingIndex === -1) {
      // New emotion point, add it
      result.push(incomingPoint);
      stats.emotionPointsAdded++;
    } else {
      // Existing emotion point, fill empty fields
      const existingPoint = result[existingIndex];
      const merged = fillEmptyFields(existingPoint, incomingPoint);
      result[existingIndex] = merged;
      stats.emotionPointsModified++;
    }
  }

  return result;
}

/**
 * Append strategy for emotion points
 */
function mergeEmotionPointsAppend(
  existing: AnalysisResult['emotionPoints'],
  incoming: AnalysisResult['emotionPoints'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['emotionPoints'] {
  const result = [...existing];
  const existingTimes = new Set(existing.map(p => p.timeMs));

  for (const incomingPoint of incoming) {
    if (existingTimes.has(incomingPoint.timeMs)) {
      // Emotion point already exists at this time, skip it
      conflicts.push({
        type: 'emotionPoint',
        id: `time_${incomingPoint.timeMs}`,
        existing: existing.find(p => p.timeMs === incomingPoint.timeMs),
        incoming: incomingPoint,
        resolution: 'skipped',
      });
      stats.emotionPointsSkipped++;
    } else {
      // New emotion point, add it
      result.push(incomingPoint);
      stats.emotionPointsAdded++;
    }
  }

  return result;
}

/**
 * Overwrite strategy for emotion points
 */
function mergeEmotionPointsOverwrite(
  existing: AnalysisResult['emotionPoints'],
  incoming: AnalysisResult['emotionPoints'],
  options: MergeOptions,
  conflicts: MergeConflict[],
  stats: MergeStats
): AnalysisResult['emotionPoints'] {
  const result = [...existing];
  const existingTimes = new Set(existing.map(p => p.timeMs));

  for (const incomingPoint of incoming) {
    const existingIndex = result.findIndex(p => p.timeMs === incomingPoint.timeMs);

    if (existingIndex === -1) {
      // New emotion point, add it
      result.push(incomingPoint);
      stats.emotionPointsAdded++;
    } else {
      // Existing emotion point, overwrite it
      const existingPoint = result[existingIndex];

      if (options.conflictResolution === 'skip') {
        conflicts.push({
          type: 'emotionPoint',
          id: `time_${incomingPoint.timeMs}`,
          existing: existingPoint,
          incoming: incomingPoint,
          resolution: 'skipped',
        });
        stats.emotionPointsSkipped++;
      } else if (options.conflictResolution === 'keepBoth') {
        // Keep both by slightly adjusting the time
        const newTime = incomingPoint.timeMs + 1;
        result.push({ ...incomingPoint, timeMs: newTime });
        conflicts.push({
          type: 'emotionPoint',
          id: `time_${incomingPoint.timeMs}`,
          existing: existingPoint,
          incoming: incomingPoint,
          resolution: 'keptBoth',
        });
        stats.emotionPointsAdded++;
      } else {
        // Overwrite
        result[existingIndex] = incomingPoint;
        conflicts.push({
          type: 'emotionPoint',
          id: `time_${incomingPoint.timeMs}`,
          existing: existingPoint,
          incoming: incomingPoint,
          resolution: 'overwritten',
        });
        stats.emotionPointsModified++;
      }
    }
  }

  return result;
}

/**
 * Check if a segment is locked
 */
function isSegmentLocked(segment: AnalysisResult['segments'][0]): boolean {
  // Check if segment has a locked field
  return 'locked' in segment && (segment as any).locked === true;
}

/**
 * Fill empty fields in a target object with values from a source object
 */
function fillEmptyFields<T extends Record<string, unknown>>(target: T, source: T): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = target[key];
    const sourceValue = source[key];

    // Fill if target value is empty/null/undefined
    if (
      targetValue === undefined ||
      targetValue === null ||
      (typeof targetValue === 'string' && targetValue.trim().length === 0) ||
      (Array.isArray(targetValue) && targetValue.length === 0)
    ) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Generate a human-readable merge report
 */
export function generateMergeReport(result: MergeResult): string {
  const lines: string[] = [];

  lines.push('# Merge Report');
  lines.push('');

  lines.push('## Statistics');
  lines.push('');
  lines.push(`- Segments added: ${result.stats.segmentsAdded}`);
  lines.push(`- Segments modified: ${result.stats.segmentsModified}`);
  lines.push(`- Segments skipped: ${result.stats.segmentsSkipped}`);
  lines.push(`- Emotion points added: ${result.stats.emotionPointsAdded}`);
  lines.push(`- Emotion points modified: ${result.stats.emotionPointsModified}`);
  lines.push(`- Emotion points skipped: ${result.stats.emotionPointsSkipped}`);
  lines.push('');

  if (result.conflicts.length > 0) {
    lines.push('## Conflicts');
    lines.push('');
    for (const conflict of result.conflicts) {
      lines.push(`- **${conflict.type}** ${conflict.id}: ${conflict.resolution}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
