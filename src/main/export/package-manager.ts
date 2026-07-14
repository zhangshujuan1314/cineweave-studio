/**
 * Package Manager
 *
 * Handles project package export and import.
 * Packages contain all project data for sharing and migration.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectPackage {
  /** Package version */
  version: string;
  /** Export timestamp */
  exportedAt: string;
  /** Project metadata */
  project: {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  /** Analysis data */
  analysis: {
    segments: unknown[];
    emotionPoints: unknown[];
    storylines: unknown[];
  };
  /** Media references */
  media: {
    files: Array<{
      id: string;
      name: string;
      type: string;
      relativePath: string;
    }>;
  };
  /** Frames */
  frames: Array<{
    id: string;
    timeMs: number;
    relativePath: string;
  }>;
  /** Subtitles */
  subtitles: Array<{
    id: string;
    startMs: number;
    endMs: number;
    text: string;
  }>;
  /** Checkpoints */
  checkpoints: unknown[];
  /** Configuration */
  config: Record<string, unknown>;
}

export interface PackageExportOptions {
  /** Project directory */
  projectDir: string;
  /** Output file path */
  outputPath: string;
  /** Include frames */
  includeFrames?: boolean;
  /** Include media files */
  includeMedia?: boolean;
  /** Include checkpoints */
  includeCheckpoints?: boolean;
  /** Compression level (0-9) */
  compressionLevel?: number;
}

export interface PackageImportOptions {
  /** Package file path */
  packagePath: string;
  /** Target directory */
  targetDir: string;
  /** Overwrite existing files */
  overwrite?: boolean;
  /** Import only analysis (skip media) */
  analysisOnly?: boolean;
}

export interface PackageResult {
  success: boolean;
  error?: string;
  stats?: {
    totalSegments: number;
    totalEmotionPoints: number;
    totalFrames: number;
    totalSubtitles: number;
    packageSize: number;
  };
}

/**
 * Package Manager implementation
 */
export class PackageManager {
  /**
   * Export project to package
   */
  async exportProject(options: PackageExportOptions): Promise<PackageResult> {
    try {
      // Load project data
      const projectData = await this.loadProjectData(options.projectDir);

      // Create package
      const projectPackage: ProjectPackage = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: projectData.project,
        analysis: {
          segments: projectData.segments,
          emotionPoints: projectData.emotionPoints,
          storylines: projectData.storylines,
        },
        media: {
          files: projectData.mediaFiles,
        },
        frames: options.includeFrames !== false ? projectData.frames : [],
        subtitles: projectData.subtitles,
        checkpoints: options.includeCheckpoints !== false ? projectData.checkpoints : [],
        config: projectData.config,
      };

      // Write package file
      const packageJson = JSON.stringify(projectPackage, null, 2);
      await fs.writeFile(options.outputPath, packageJson, 'utf-8');

      const stats = await fs.stat(options.outputPath);

      return {
        success: true,
        stats: {
          totalSegments: projectData.segments.length,
          totalEmotionPoints: projectData.emotionPoints.length,
          totalFrames: projectData.frames.length,
          totalSubtitles: projectData.subtitles.length,
          packageSize: stats.size,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import project from package
   */
  async importProject(options: PackageImportOptions): Promise<PackageResult> {
    try {
      // Read package file
      const packageJson = await fs.readFile(options.packagePath, 'utf-8');
      const projectPackage: ProjectPackage = JSON.parse(packageJson);

      // Validate package
      this.validatePackage(projectPackage);

      // Create target directory
      await fs.mkdir(options.targetDir, { recursive: true });

      // Save project data
      await this.saveProjectData(options.targetDir, projectPackage);

      return {
        success: true,
        stats: {
          totalSegments: projectPackage.analysis.segments.length,
          totalEmotionPoints: projectPackage.analysis.emotionPoints.length,
          totalFrames: projectPackage.frames.length,
          totalSubtitles: projectPackage.subtitles.length,
          packageSize: Buffer.byteLength(packageJson),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate package structure
   */
  private validatePackage(projectPackage: ProjectPackage): void {
    if (!projectPackage.version) {
      throw new Error('Invalid package: missing version');
    }

    if (!projectPackage.project) {
      throw new Error('Invalid package: missing project metadata');
    }

    if (!projectPackage.analysis) {
      throw new Error('Invalid package: missing analysis data');
    }
  }

  /**
   * Load project data from directory
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
        description: 'Analysis of the film',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      segments: [],
      emotionPoints: [],
      storylines: [],
      mediaFiles: [],
      frames: [],
      subtitles: [],
      checkpoints: [],
      config: {},
    };
  }

  /**
   * Save project data to directory
   */
  private async saveProjectData(
    targetDir: string,
    projectPackage: ProjectPackage
  ): Promise<void> {
    // Save project metadata
    const projectJson = JSON.stringify(projectPackage.project, null, 2);
    await fs.writeFile(
      path.join(targetDir, 'project.json'),
      projectJson,
      'utf-8'
    );

    // Save analysis data
    const analysisJson = JSON.stringify(projectPackage.analysis, null, 2);
    await fs.writeFile(
      path.join(targetDir, 'analysis.json'),
      analysisJson,
      'utf-8'
    );

    // Save frames metadata
    const framesJson = JSON.stringify(projectPackage.frames, null, 2);
    await fs.writeFile(
      path.join(targetDir, 'frames.json'),
      framesJson,
      'utf-8'
    );

    // Save subtitles
    const subtitlesJson = JSON.stringify(projectPackage.subtitles, null, 2);
    await fs.writeFile(
      path.join(targetDir, 'subtitles.json'),
      subtitlesJson,
      'utf-8'
    );

    // Save configuration
    const configJson = JSON.stringify(projectPackage.config, null, 2);
    await fs.writeFile(
      path.join(targetDir, 'config.json'),
      configJson,
      'utf-8'
    );
  }

  /**
   * Get package info without full import
   */
  async getPackageInfo(packagePath: string): Promise<{
    version: string;
    project: ProjectPackage['project'];
    stats: {
      totalSegments: number;
      totalEmotionPoints: number;
      totalFrames: number;
      totalSubtitles: number;
    };
  } | null> {
    try {
      const packageJson = await fs.readFile(packagePath, 'utf-8');
      const projectPackage: ProjectPackage = JSON.parse(packageJson);

      return {
        version: projectPackage.version,
        project: projectPackage.project,
        stats: {
          totalSegments: projectPackage.analysis.segments.length,
          totalEmotionPoints: projectPackage.analysis.emotionPoints.length,
          totalFrames: projectPackage.frames.length,
          totalSubtitles: projectPackage.subtitles.length,
        },
      };
    } catch {
      return null;
    }
  }
}

/**
 * Project data structure
 */
interface ProjectData {
  project: {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  segments: unknown[];
  emotionPoints: unknown[];
  storylines: unknown[];
  mediaFiles: Array<{
    id: string;
    name: string;
    type: string;
    relativePath: string;
  }>;
  frames: Array<{
    id: string;
    timeMs: number;
    relativePath: string;
  }>;
  subtitles: Array<{
    id: string;
    startMs: number;
    endMs: number;
    text: string;
  }>;
  checkpoints: unknown[];
  config: Record<string, unknown>;
}

/**
 * Create package manager
 */
export function createPackageManager(): PackageManager {
  return new PackageManager();
}
