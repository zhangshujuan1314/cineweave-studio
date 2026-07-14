/**
 * Export Manager
 *
 * Handles exporting analysis results to various formats:
 * - Markdown
 * - PDF
 * - CSV
 * - SRT/VTT subtitles
 * - Project package
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type ExportFormat = 'markdown' | 'pdf' | 'csv' | 'srt' | 'vtt' | 'package';

export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Output file path */
  outputPath: string;
  /** Project directory */
  projectDir: string;
  /** Include frames */
  includeFrames?: boolean;
  /** Include subtitles */
  includeSubtitles?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Custom template (for markdown) */
  template?: string;
  /** PDF options */
  pdfOptions?: {
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    includeImages?: boolean;
  };
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  stats?: {
    totalSegments: number;
    totalEmotionPoints: number;
    totalFrames: number;
    fileSize: number;
  };
}

/**
 * Export Manager implementation
 */
export class ExportManager {
  /**
   * Export analysis to specified format
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      switch (options.format) {
        case 'markdown':
          return await this.exportMarkdown(options);
        case 'csv':
          return await this.exportCSV(options);
        case 'srt':
          return await this.exportSRT(options);
        case 'vtt':
          return await this.exportVTT(options);
        case 'package':
          return await this.exportPackage(options);
        case 'pdf':
          return await this.exportPDF(options);
        default:
          return {
            success: false,
            error: `Unsupported format: ${options.format}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export to Markdown
   */
  private async exportMarkdown(options: ExportOptions): Promise<ExportResult> {
    const data = await this.loadProjectData(options.projectDir);
    const markdown = this.generateMarkdown(data, options);

    await fs.writeFile(options.outputPath, markdown, 'utf-8');

    const stats = await fs.stat(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: stats.size,
      },
    };
  }

  /**
   * Export to CSV
   */
  private async exportCSV(options: ExportOptions): Promise<ExportResult> {
    const data = await this.loadProjectData(options.projectDir);
    const csv = this.generateCSV(data);

    await fs.writeFile(options.outputPath, csv, 'utf-8');

    const stats = await fs.stat(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: stats.size,
      },
    };
  }

  /**
   * Export to SRT subtitles
   */
  private async exportSRT(options: ExportOptions): Promise<ExportResult> {
    const data = await this.loadProjectData(options.projectDir);
    const srt = this.generateSRT(data.segments);

    await fs.writeFile(options.outputPath, srt, 'utf-8');

    const stats = await fs.stat(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: stats.size,
      },
    };
  }

  /**
   * Export to VTT subtitles
   */
  private async exportVTT(options: ExportOptions): Promise<ExportResult> {
    const data = await this.loadProjectData(options.projectDir);
    const vtt = this.generateVTT(data.segments);

    await fs.writeFile(options.outputPath, vtt, 'utf-8');

    const stats = await fs.stat(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: stats.size,
      },
    };
  }

  /**
   * Export to project package
   */
  private async exportPackage(options: ExportOptions): Promise<ExportResult> {
    // Create a ZIP package with all project data
    const data = await this.loadProjectData(options.projectDir);
    const packageData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ...data,
    };

    // For now, export as JSON (ZIP support can be added later)
    await fs.writeFile(
      options.outputPath,
      JSON.stringify(packageData, null, 2),
      'utf-8'
    );

    const stats = await fs.stat(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: stats.size,
      },
    };
  }

  /**
   * Export to PDF (placeholder - requires PDF library)
   */
  private async exportPDF(options: ExportOptions): Promise<ExportResult> {
    // PDF export would require a library like pdfkit or puppeteer
    // For now, generate markdown and note that PDF conversion is needed
    const data = await this.loadProjectData(options.projectDir);
    const markdown = this.generateMarkdown(data, options);

    // Save markdown as intermediate format
    const mdPath = options.outputPath.replace('.pdf', '.md');
    await fs.writeFile(mdPath, markdown, 'utf-8');

    return {
      success: true,
      outputPath: mdPath,
      error: 'PDF export requires additional setup. Markdown file generated instead.',
      stats: {
        totalSegments: data.segments.length,
        totalEmotionPoints: data.emotionPoints.length,
        totalFrames: data.frames.length,
        fileSize: Buffer.byteLength(markdown),
      },
    };
  }

  /**
   * Load project data
   */
  private async loadProjectData(projectDir: string): Promise<ProjectData> {
    // Load database data
    const dbPath = path.join(projectDir, 'project.sqlite');

    // For now, return mock data structure
    // In real implementation, this would query the SQLite database
    return {
      project: {
        id: 'project_001',
        title: 'Film Analysis',
        createdAt: new Date().toISOString(),
      },
      segments: [],
      emotionPoints: [],
      frames: [],
      subtitles: [],
    };
  }

  /**
   * Generate Markdown content
   */
  private generateMarkdown(data: ProjectData, options: ExportOptions): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${data.project.title}`);
    lines.push('');
    lines.push(`> Exported on ${new Date().toLocaleDateString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total Segments: ${data.segments.length}`);
    lines.push(`- Total Emotion Points: ${data.emotionPoints.length}`);
    lines.push(`- Total Frames: ${data.frames.length}`);
    lines.push('');

    // Segments
    if (data.segments.length > 0) {
      lines.push('## Segments');
      lines.push('');

      for (const segment of data.segments) {
        lines.push(`### ${segment.title}`);
        lines.push('');
        lines.push(`- **Time**: ${this.formatTime(segment.startMs)} - ${this.formatTime(segment.endMs)}`);
        lines.push(`- **Function**: ${segment.function}`);
        lines.push(`- **Confidence**: ${(segment.confidence * 100).toFixed(1)}%`);
        lines.push('');

        if (segment.notes) {
          lines.push(segment.notes);
          lines.push('');
        }
      }
    }

    // Emotion Points
    if (data.emotionPoints.length > 0) {
      lines.push('## Emotion Points');
      lines.push('');

      for (const point of data.emotionPoints) {
        lines.push(`- **${this.formatTime(point.timeMs)}**: ${point.label} (Intensity: ${point.intensity}, Valence: ${point.valence})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate CSV content
   */
  private generateCSV(data: ProjectData): string {
    const lines: string[] = [];

    // Header
    lines.push('ID,Title,Start Time,End Time,Function,Confidence,Notes');

    // Segments
    for (const segment of data.segments) {
      const row = [
        segment.id,
        `"${segment.title}"`,
        this.formatTime(segment.startMs),
        this.formatTime(segment.endMs),
        `"${segment.function}"`,
        segment.confidence.toFixed(2),
        `"${segment.notes || ''}"`,
      ].join(',');

      lines.push(row);
    }

    return lines.join('\n');
  }

  /**
   * Generate SRT subtitles
   */
  private generateSRT(segments: ProjectData['segments']): string {
    const lines: string[] = [];

    segments.forEach((segment, index) => {
      lines.push(String(index + 1));
      lines.push(
        `${this.formatSRTTime(segment.startMs)} --> ${this.formatSRTTime(segment.endMs)}`
      );
      lines.push(segment.title);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Generate VTT subtitles
   */
  private generateVTT(segments: ProjectData['segments']): string {
    const lines: string[] = [];

    lines.push('WEBVTT');
    lines.push('');

    segments.forEach((segment, index) => {
      lines.push(String(index + 1));
      lines.push(
        `${this.formatVTTTime(segment.startMs)} --> ${this.formatVTTTime(segment.endMs)}`
      );
      lines.push(segment.title);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Format time (milliseconds to HH:MM:SS)
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0'),
    ].join(':');
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  private formatSRTTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const milliseconds = ms % 1000;

    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0'),
    ].join(':') + `,${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private formatVTTTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const milliseconds = ms % 1000;

    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0'),
    ].join(':') + `.${milliseconds.toString().padStart(3, '0')}`;
  }
}

/**
 * Project data structure
 */
interface ProjectData {
  project: {
    id: string;
    title: string;
    createdAt: string;
  };
  segments: Array<{
    id: string;
    title: string;
    startMs: number;
    endMs: number;
    function: string;
    confidence: number;
    notes?: string;
  }>;
  emotionPoints: Array<{
    timeMs: number;
    intensity: number;
    valence: number;
    label: string;
  }>;
  frames: Array<{
    id: string;
    timeMs: number;
    path: string;
  }>;
  subtitles: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
}

/**
 * Create export manager
 */
export function createExportManager(): ExportManager {
  return new ExportManager();
}
