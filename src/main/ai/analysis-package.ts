/**
 * Analysis Package Generator
 *
 * Generates analysis packages for AI processing.
 * Package includes manifest, schema, instructions, low-res evidence frames,
 * subtitle slices, and optional context materials.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Schema for analysis package manifest
const AnalysisPackageManifestSchema = z.object({
  schemaVersion: z.literal('cineweave.analysis/1.0'),
  projectId: z.string(),
  projectFingerprint: z.string(),
  createdAt: z.string().datetime(),
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
});

export type AnalysisPackageManifest = z.infer<typeof AnalysisPackageManifestSchema>;

// Schema for AI output contract
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

export interface AnalysisPackageOptions {
  projectId: string;
  projectFingerprint: string;
  mediaDurationMs: number;
  segments: Array<{
    id: string;
    startMs: number;
    endMs: number;
    title: string;
  }>;
  frames: Array<{
    id: string;
    timeMs: number;
    path: string;
  }>;
  subtitles: Array<{
    id: string;
    startMs: number;
    endMs: number;
    text: string;
  }>;
  context?: {
    movieTitle?: string;
    director?: string;
    year?: number;
    genre?: string;
    notes?: string;
  };
  maxPackageSizeBytes?: number;
}

export class AnalysisPackageGenerator {
  private options: AnalysisPackageOptions;
  private outputDir: string;

  constructor(options: AnalysisPackageOptions, outputDir: string) {
    this.options = options;
    this.outputDir = outputDir;
  }

  /**
   * Generate the analysis package
   */
  async generate(): Promise<string> {
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });

    // Generate manifest
    const manifest = this.createManifest();

    // Generate schema
    const schema = this.createSchema();

    // Generate instructions
    const instructions = this.createInstructions();

    // Write files
    await Promise.all([
      fs.writeFile(
        path.join(this.outputDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      ),
      fs.writeFile(
        path.join(this.outputDir, 'schema.json'),
        JSON.stringify(schema, null, 2)
      ),
      fs.writeFile(
        path.join(this.outputDir, 'prompt.txt'),
        instructions
      ),
    ]);

    // Copy frames (low-res versions)
    await this.copyFrames();

    // Copy subtitles
    await this.copySubtitles();

    // Copy context materials if provided
    if (this.options.context) {
      await this.copyContext();
    }

    // Check package size
    await this.checkPackageSize();

    return this.outputDir;
  }

  /**
   * Create manifest for the analysis package
   */
  private createManifest(): AnalysisPackageManifest {
    return {
      schemaVersion: 'cineweave.analysis/1.0',
      projectId: this.options.projectId,
      projectFingerprint: this.options.projectFingerprint,
      createdAt: new Date().toISOString(),
      mediaDurationMs: this.options.mediaDurationMs,
      segments: this.options.segments,
      frames: this.options.frames,
      subtitles: this.options.subtitles,
      context: this.options.context,
    };
  }

  /**
   * Create JSON Schema for AI output validation
   */
  private createSchema(): object {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['schemaVersion', 'projectFingerprint', 'summary', 'segments', 'emotionPoints'],
      properties: {
        schemaVersion: {
          type: 'string',
          const: 'cineweave.analysis/1.0',
        },
        projectFingerprint: {
          type: 'string',
        },
        summary: {
          type: 'object',
          required: ['logline', 'structure', 'confidence', 'evidenceRefs'],
          properties: {
            logline: { type: 'string' },
            structure: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidenceRefs: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        segments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'startMs', 'endMs', 'title', 'function', 'storyLineIds', 'confidence', 'evidenceRefs'],
            properties: {
              id: { type: 'string' },
              startMs: { type: 'integer', minimum: 0 },
              endMs: { type: 'integer', minimum: 0 },
              title: { type: 'string' },
              function: { type: 'string' },
              storyLineIds: {
                type: 'array',
                items: { type: 'string' },
              },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              evidenceRefs: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        emotionPoints: {
          type: 'array',
          items: {
            type: 'object',
            required: ['timeMs', 'intensity', 'valence', 'label', 'evidenceRefs'],
            properties: {
              timeMs: { type: 'integer', minimum: 0 },
              intensity: { type: 'number', minimum: 0, maximum: 100 },
              valence: { type: 'number', minimum: -100, maximum: 100 },
              label: { type: 'string' },
              evidenceRefs: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Create instructions for AI analysis
   */
  private createInstructions(): string {
    const segmentCount = this.options.segments.length;
    const frameCount = this.options.frames.length;
    const subtitleCount = this.options.subtitles.length;
    const durationSeconds = Math.floor(this.options.mediaDurationMs / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;

    let instructions = `# CineWeave Analysis Request

## Media Information
- Duration: ${durationMinutes}m ${remainingSeconds}s
- Segments: ${segmentCount}
- Evidence Frames: ${frameCount}
- Subtitle Lines: ${subtitleCount}
`;

    if (this.options.context?.movieTitle) {
      instructions += `- Movie Title: ${this.options.context.movieTitle}\n`;
    }
    if (this.options.context?.director) {
      instructions += `- Director: ${this.options.context.director}\n`;
    }
    if (this.options.context?.year) {
      instructions += `- Year: ${this.options.context.year}\n`;
    }
    if (this.options.context?.genre) {
      instructions += `- Genre: ${this.options.context.genre}\n`;
    }

    instructions += `
## Analysis Tasks

1. **Overall Analysis**: Provide a logline, structural analysis, and overall confidence level.
2. **Segment Analysis**: For each segment, analyze:
   - Narrative function
   - Key beats
   - Character goals
   - Conflict
   - Information control
   - Creative intent
   - Rhythm
   - Audiovisual techniques
   - Audience experience
   - Reusable methods
3. **Emotion Points**: Identify key emotional moments with intensity (-100 to 100) and valence (0 to 100).
4. **Evidence References**: Always cite specific frame IDs and subtitle IDs as evidence.

## Output Format

Please output a JSON object conforming to the schema in schema.json. The JSON should be wrapped in a markdown code block:

\`\`\`json
{
  "schemaVersion": "cineweave.analysis/1.0",
  "projectFingerprint": "${this.options.projectFingerprint}",
  "summary": {
    "logline": "...",
    "structure": "...",
    "confidence": 0.85,
    "evidenceRefs": ["frame_001", "sub_001"]
  },
  "segments": [...],
  "emotionPoints": [...]
}
\`\`\`

## Important Notes

- Only reference frame IDs and subtitle IDs that exist in the package
- Time values must be in milliseconds
- Confidence values must be between 0 and 1
- Intensity values must be between 0 and 100
- Valence values must be between -100 and 100
- Do not include any explanations outside the JSON code block
`;

    if (this.options.context?.notes) {
      instructions += `\n## Additional Context\n${this.options.context.notes}\n`;
    }

    return instructions;
  }

  /**
   * Copy frames to the package (low-res versions)
   */
  private async copyFrames(): Promise<void> {
    const framesDir = path.join(this.outputDir, 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    // In a real implementation, we would create low-res versions of frames
    // For now, we'll create placeholder files
    for (const frame of this.options.frames) {
      const framePath = path.join(framesDir, `${frame.id}.webp`);
      // Create a placeholder file
      await fs.writeFile(framePath, `Frame ${frame.id} at ${frame.timeMs}ms`);
    }
  }

  /**
   * Copy subtitles to the package
   */
  private async copySubtitles(): Promise<void> {
    const subtitlesDir = path.join(this.outputDir, 'subtitles');
    await fs.mkdir(subtitlesDir, { recursive: true });

    // Group subtitles by segments for easier processing
    const segmentSubtitles = new Map<string, typeof this.options.subtitles>();

    for (const segment of this.options.segments) {
      const segmentSubs = this.options.subtitles.filter(
        sub => sub.startMs >= segment.startMs && sub.endMs <= segment.endMs
      );
      segmentSubtitles.set(segment.id, segmentSubs);
    }

    // Write subtitles for each segment
    for (const [segmentId, subs] of segmentSubtitles) {
      if (subs.length > 0) {
        const srtContent = this.convertToSrt(subs);
        await fs.writeFile(
          path.join(subtitlesDir, `${segmentId}.srt`),
          srtContent
        );
      }
    }
  }

  /**
   * Convert subtitles to SRT format
   */
  private convertToSrt(subtitles: Array<{ id: string; startMs: number; endMs: number; text: string }>): string {
    return subtitles.map((sub, index) => {
      const startTime = this.formatSrtTime(sub.startMs);
      const endTime = this.formatSrtTime(sub.endMs);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
    }).join('\n');
  }

  /**
   * Format milliseconds to SRT time format
   */
  private formatSrtTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * Copy context materials to the package
   */
  private async copyContext(): Promise<void> {
    const contextDir = path.join(this.outputDir, 'context');
    await fs.mkdir(contextDir, { recursive: true });

    // Write context notes
    if (this.options.context?.notes) {
      await fs.writeFile(
        path.join(contextDir, 'notes.md'),
        this.options.context.notes
      );
    }
  }

  /**
   * Check if package size exceeds limit
   */
  private async checkPackageSize(): Promise<void> {
    const maxSize = this.options.maxPackageSizeBytes || 50 * 1024 * 1024; // 50MB default

    const stats = await this.getDirectorySize(this.outputDir);
    if (stats > maxSize) {
      // In a real implementation, we would split the package into multiple parts
      console.warn(`Package size (${stats} bytes) exceeds limit (${maxSize} bytes)`);
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await this.getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }
}

/**
 * Generate analysis package
 */
export async function generateAnalysisPackage(
  options: AnalysisPackageOptions,
  outputDir: string
): Promise<string> {
  const generator = new AnalysisPackageGenerator(options, outputDir);
  return generator.generate();
}
