/**
 * JSON Extractor and Fixer
 *
 * Safely extracts JSON from AI outputs, handling common issues like:
 * - Markdown code fences
 * - Trailing commas
 * - Single quotes
 * - Half-finished JSON
 * - Malicious HTML injection
 */

import { z } from 'zod';

// Schema for analysis result validation
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

export interface ExtractionResult {
  success: boolean;
  data?: AnalysisResult;
  errors?: string[];
  warnings?: string[];
}

/**
 * Extract JSON from AI output
 */
export function extractJSON(rawOutput: string): ExtractionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Try direct parsing
  try {
    const data = JSON.parse(rawOutput);
    return validateAndReturn(data, errors, warnings);
  } catch (e) {
    // Continue to next strategy
  }

  // Step 2: Try extracting from markdown code fences
  const codeFenceResult = extractFromCodeFence(rawOutput);
  if (codeFenceResult.success) {
    return codeFenceResult;
  }

  // Step 3: Try fixing common issues
  const fixedResult = tryFixCommonIssues(rawOutput);
  if (fixedResult.success) {
    return fixedResult;
  }

  // Step 4: Try extracting JSON-like content
  const jsonLikeResult = extractJsonLikeContent(rawOutput);
  if (jsonLikeResult.success) {
    return jsonLikeResult;
  }

  // All strategies failed
  return {
    success: false,
    errors: [
      'Failed to extract valid JSON from AI output',
      ...errors,
      ...codeFenceResult.errors || [],
      ...fixedResult.errors || [],
      ...jsonLikeResult.errors || [],
    ],
    warnings,
  };
}

/**
 * Extract JSON from markdown code fences
 */
function extractFromCodeFence(rawOutput: string): ExtractionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Match code fences: ```json ... ``` or ``` ... ```
  const codeFenceRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeFenceRegex.exec(rawOutput)) !== null) {
    const jsonContent = match[1].trim();

    try {
      const data = JSON.parse(jsonContent);
      warnings.push('Extracted JSON from markdown code fence');
      return validateAndReturn(data, errors, warnings);
    } catch (e) {
      // Try fixing this content
      const fixedResult = tryFixCommonIssues(jsonContent);
      if (fixedResult.success) {
        warnings.push('Extracted and fixed JSON from markdown code fence');
        return fixedResult;
      }
    }
  }

  return {
    success: false,
    errors: ['No valid JSON found in code fences'],
    warnings,
  };
}

/**
 * Try to fix common JSON issues
 */
function tryFixCommonIssues(jsonString: string): ExtractionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let fixed = jsonString;

  // Fix 1: Remove trailing commas
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  if (fixed !== jsonString) {
    warnings.push('Removed trailing commas');
  }

  // Fix 2: Replace single quotes with double quotes (careful with apostrophes)
  // Only do this if there are no double quotes at all
  if (!fixed.includes('"') && fixed.includes("'")) {
    fixed = fixed.replace(/'/g, '"');
    warnings.push('Replaced single quotes with double quotes');
  }

  // Fix 3: Remove BOM and zero-width characters
  fixed = fixed.replace(/^﻿/, '');
  fixed = fixed.replace(/[​‌‍﻿]/g, '');

  // Fix 4: Remove control characters except newline and carriage return
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Fix 5: Try to fix incomplete JSON by adding missing closing brackets
  const openBrackets = (fixed.match(/\{/g) || []).length;
  const closeBrackets = (fixed.match(/\}/g) || []).length;
  const openArrays = (fixed.match(/\[/g) || []).length;
  const closeArrays = (fixed.match(/\]/g) || []).length;

  if (openBrackets > closeBrackets) {
    const missing = openBrackets - closeBrackets;
    fixed += '}'.repeat(missing);
    warnings.push(`Added ${missing} missing closing curly brackets`);
  }

  if (openArrays > closeArrays) {
    const missing = openArrays - closeArrays;
    fixed += ']'.repeat(missing);
    warnings.push(`Added ${missing} missing closing square brackets`);
  }

  // Try parsing the fixed content
  try {
    const data = JSON.parse(fixed);
    return validateAndReturn(data, errors, warnings);
  } catch (e) {
    errors.push(`Failed to parse fixed JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return {
    success: false,
    errors,
    warnings,
  };
}

/**
 * Extract JSON-like content from the output
 */
function extractJsonLikeContent(rawOutput: string): ExtractionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Look for JSON-like patterns
  const jsonPatterns = [
    // Pattern 1: Content between { and } (greedy)
    /\{[\s\S]*\}/,
    // Pattern 2: Content between [ and ] (greedy)
    /\[[\s\S]*\]/,
  ];

  for (const pattern of jsonPatterns) {
    const match = rawOutput.match(pattern);
    if (match) {
      const jsonContent = match[0];

      try {
        const data = JSON.parse(jsonContent);
        warnings.push('Extracted JSON using pattern matching');
        return validateAndReturn(data, errors, warnings);
      } catch (e) {
        // Try fixing this content
        const fixedResult = tryFixCommonIssues(jsonContent);
        if (fixedResult.success) {
          warnings.push('Extracted and fixed JSON using pattern matching');
          return fixedResult;
        }
      }
    }
  }

  return {
    success: false,
    errors: ['No JSON-like content found'],
    warnings,
  };
}

/**
 * Validate extracted data against schema
 */
function validateAndReturn(
  data: unknown,
  errors: string[],
  warnings: string[]
): ExtractionResult {
  // Check for malicious content
  const maliciousCheck = checkForMaliciousContent(data);
  if (maliciousCheck.length > 0) {
    return {
      success: false,
      errors: maliciousCheck,
      warnings,
    };
  }

  // Validate against schema
  const result = AnalysisResultSchema.safeParse(data);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      warnings,
    };
  }

  // Schema validation failed
  const schemaErrors = result.error.errors.map(
    e => `${e.path.join('.')}: ${e.message}`
  );

  return {
    success: false,
    errors: [...errors, ...schemaErrors],
    warnings,
  };
}

/**
 * Check for malicious content in the data
 */
function checkForMaliciousContent(data: unknown): string[] {
  const errors: string[] = [];

  if (typeof data === 'string') {
    // Check for HTML injection
    if (/<script\b[^>]*>[\s\S]*?<\/script>/gi.test(data)) {
      errors.push('Script tags detected in data');
    }

    // Check for path traversal
    if (/\.\.\//g.test(data)) {
      errors.push('Path traversal detected in data');
    }

    // Check for absolute paths
    if (/^[A-Z]:\\/i.test(data)) {
      errors.push('Absolute path detected in data');
    }
  } else if (Array.isArray(data)) {
    for (const item of data) {
      const itemErrors = checkForMaliciousContent(item);
      errors.push(...itemErrors);
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const value of Object.values(data)) {
      const valueErrors = checkForMaliciousContent(value);
      errors.push(...valueErrors);
    }
  }

  return errors;
}

/**
 * Extract and validate JSON with detailed error reporting
 */
export function extractAndValidateJSON(
  rawOutput: string,
  mediaDurationMs: number,
  existingIds: Set<string> = new Set()
): ExtractionResult {
  const extractionResult = extractJSON(rawOutput);

  if (!extractionResult.success || !extractionResult.data) {
    return extractionResult;
  }

  const data = extractionResult.data;
  const errors: string[] = [];
  const warnings: string[] = extractionResult.warnings || [];

  // Semantic validation
  const semanticErrors = validateSemantics(data, mediaDurationMs, existingIds);
  errors.push(...semanticErrors);

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  return {
    success: true,
    data,
    warnings,
  };
}

/**
 * Validate semantic rules
 */
function validateSemantics(
  data: AnalysisResult,
  mediaDurationMs: number,
  existingIds: Set<string>
): string[] {
  const errors: string[] = [];

  // Check segment time ranges
  for (const segment of data.segments) {
    if (segment.startMs < 0) {
      errors.push(`Segment ${segment.id}: startMs < 0`);
    }
    if (segment.endMs <= segment.startMs) {
      errors.push(`Segment ${segment.id}: endMs <= startMs`);
    }
    if (segment.endMs > mediaDurationMs) {
      errors.push(`Segment ${segment.id}: endMs > mediaDurationMs`);
    }
  }

  // Check emotion point time ranges
  for (const point of data.emotionPoints) {
    if (point.timeMs < 0) {
      errors.push(`Emotion point at ${point.timeMs}ms: timeMs < 0`);
    }
    if (point.timeMs > mediaDurationMs) {
      errors.push(`Emotion point at ${point.timeMs}ms: timeMs > mediaDurationMs`);
    }
  }

  // Check ID uniqueness
  const segmentIds = new Set<string>();
  for (const segment of data.segments) {
    if (segmentIds.has(segment.id)) {
      errors.push(`Duplicate segment ID: ${segment.id}`);
    }
    segmentIds.add(segment.id);

    // Check if ID already exists in database
    if (existingIds.has(segment.id)) {
      errors.push(`Segment ID already exists in database: ${segment.id}`);
    }
  }

  // Check evidence references
  const allFrameIds = new Set<string>();
  const allSubtitleIds = new Set<string>();

  // In a real implementation, we would check if these IDs exist
  // For now, we'll just collect them
  for (const segment of data.segments) {
    for (const ref of segment.evidenceRefs) {
      if (ref.startsWith('frame_')) {
        allFrameIds.add(ref);
      } else if (ref.startsWith('sub_')) {
        allSubtitleIds.add(ref);
      }
    }
  }

  for (const point of data.emotionPoints) {
    for (const ref of point.evidenceRefs) {
      if (ref.startsWith('frame_')) {
        allFrameIds.add(ref);
      } else if (ref.startsWith('sub_')) {
        allSubtitleIds.add(ref);
      }
    }
  }

  // Check confidence values
  if (data.summary.confidence < 0 || data.summary.confidence > 1) {
    errors.push(`Summary confidence out of range: ${data.summary.confidence}`);
  }

  for (const segment of data.segments) {
    if (segment.confidence < 0 || segment.confidence > 1) {
      errors.push(`Segment ${segment.id} confidence out of range: ${segment.confidence}`);
    }
  }

  // Check intensity and valence values
  for (const point of data.emotionPoints) {
    if (point.intensity < 0 || point.intensity > 100) {
      errors.push(`Emotion point at ${point.timeMs}ms intensity out of range: ${point.intensity}`);
    }
    if (point.valence < -100 || point.valence > 100) {
      errors.push(`Emotion point at ${point.timeMs}ms valence out of range: ${point.valence}`);
    }
  }

  return errors;
}
