/**
 * Build Configuration Module
 *
 * Handles cross-platform packaging configuration:
 * - Windows installer
 * - macOS DMG
 * - Linux AppImage
 * - Code signing
 * - Auto-update
 */

import * as path from 'path';

export interface BuildConfig {
  /** Application name */
  appName: string;
  /** Application version */
  version: string;
  /** Application description */
  description: string;
  /** Application author */
  author: string;
  /** Application license */
  license: string;
  /** Application homepage */
  homepage?: string;
  /** Application icon */
  icon?: string;
  /** Build targets */
  targets: BuildTarget[];
  /** Code signing configuration */
  codeSigning?: CodeSigningConfig;
  /** Auto-update configuration */
  autoUpdate?: AutoUpdateConfig;
  /** Windows-specific configuration */
  windows?: WindowsConfig;
  /** macOS-specific configuration */
  mac?: MacConfig;
  /** Linux-specific configuration */
  linux?: LinuxConfig;
}

export type BuildTarget = 'windows' | 'mac' | 'linux';

export interface CodeSigningConfig {
  /** Enable code signing */
  enabled: boolean;
  /** Certificate path (Windows) */
  certificatePath?: string;
  /** Certificate password (Windows) */
  certificatePassword?: string;
  /** Apple ID (macOS) */
  appleId?: string;
  /** Apple ID password (macOS) */
  appleIdPassword?: string;
  /** Team ID (macOS) */
  teamId?: string;
}

export interface AutoUpdateConfig {
  /** Enable auto-update */
  enabled: boolean;
  /** Update server URL */
  serverUrl?: string;
  /** Update channel */
  channel?: 'stable' | 'beta' | 'alpha';
  /** Check for updates on startup */
  checkOnStartup?: boolean;
}

export interface WindowsConfig {
  /** Windows installer type */
  installerType: 'nsis' | 'msi' | 'appx';
  /** Create desktop shortcut */
  createDesktopShortcut?: boolean;
  /** Create start menu shortcut */
  createStartMenuShortcut?: boolean;
  /** Install per machine or per user */
  installMode?: 'perMachine' | 'perUser';
  /** Minimum Windows version */
  minimumWindowsVersion?: string;
}

export interface MacConfig {
  /** macOS target format */
  target: 'dmg' | 'pkg' | 'mas';
  /** Category */
  category?: string;
  /** Gatekeeper assessment */
  gatekeeperAssess?: boolean;
  /** Hardened runtime */
  hardenedRuntime?: boolean;
  /** Entitlements */
  entitlements?: string;
}

export interface LinuxConfig {
  /** Linux target format */
  target: 'AppImage' | 'deb' | 'rpm' | 'snap';
  /** Category */
  category?: string;
  /** Desktop file */
  desktop?: Record<string, string>;
  /** Maintainer */
  maintainer?: string;
}

/**
 * Build Configuration Manager
 */
export class BuildConfigManager {
  private config: BuildConfig;

  constructor(config: BuildConfig) {
    this.config = config;
  }

  /**
   * Get configuration
   */
  getConfig(): BuildConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BuildConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get electron-builder configuration
   */
  getElectronBuilderConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {
      appId: `com.${this.config.author.toLowerCase()}.${this.config.appName.toLowerCase()}`,
      productName: this.config.appName,
      version: this.config.version,
      description: this.config.description,
      author: this.config.author,
      license: this.config.license,
      homepage: this.config.homepage,
      directories: {
        output: 'dist',
        buildResources: 'build',
      },
      files: [
        'out/**/*',
        'node_modules/**/*',
        'package.json',
      ],
      asar: true,
      asarUnpack: [
        'node_modules/better-sqlite3/**/*',
        'node_modules/ffmpeg-static/**/*',
      ],
    };

    // Windows configuration
    if (this.config.targets.includes('windows')) {
      config.win = {
        target: this.config.windows?.installerType || 'nsis',
        icon: this.config.icon || 'build/icon.ico',
        requestedExecutionLevel: 'asInvoker',
      };

      config.nsis = {
        oneClick: false,
        perMachine: this.config.windows?.installMode === 'perMachine',
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: this.config.windows?.createDesktopShortcut ?? true,
        createStartMenuShortcut: this.config.windows?.createStartMenuShortcut ?? true,
        shortcutName: this.config.appName,
      };
    }

    // macOS configuration
    if (this.config.targets.includes('mac')) {
      config.mac = {
        target: this.config.mac?.target || 'dmg',
        icon: this.config.icon || 'build/icon.icns',
        category: this.config.mac?.category || 'public.app-category.video',
        gatekeeperAssess: this.config.mac?.gatekeeperAssess ?? false,
        hardenedRuntime: this.config.mac?.hardenedRuntime ?? true,
        entitlements: this.config.mac?.entitlements || 'build/entitlements.mac.plist',
        entitlementsInherit: this.config.mac?.entitlements || 'build/entitlements.mac.plist',
      };

      config.dmg = {
        contents: [
          { x: 130, y: 220 },
          { x: 410, y: 220, type: 'link', path: '/Applications' },
        ],
      };
    }

    // Linux configuration
    if (this.config.targets.includes('linux')) {
      config.linux = {
        target: this.config.linux?.target || 'AppImage',
        icon: this.config.icon || 'build/icon.png',
        category: this.config.linux?.category || 'AudioVideo',
        desktop: {
          Name: this.config.appName,
          Comment: this.config.description,
          ...this.config.linux?.desktop,
        },
      };

      config.appImage = {
        license: 'LICENSE',
      };
    }

    // Code signing
    if (this.config.codeSigning?.enabled) {
      config.win = {
        ...config.win as Record<string, unknown>,
        sign: true,
        signHashes: ['sha256'],
      };

      if (this.config.codeSigning.certificatePath) {
        (config.win as Record<string, unknown>).certificateFile =
          this.config.codeSigning.certificatePath;
        (config.win as Record<string, unknown>).certificatePassword =
          this.config.codeSigning.certificatePassword;
      }
    }

    // Auto-update
    if (this.config.autoUpdate?.enabled) {
      config.publish = {
        provider: 'generic',
        url: this.config.autoUpdate.serverUrl || 'https://releases.example.com',
        channel: this.config.autoUpdate.channel || 'stable',
      };
    }

    return config;
  }

  /**
   * Generate package.json scripts
   */
  generateScripts(): Record<string, string> {
    return {
      'build': 'electron-vite build',
      'build:win': 'electron-vite build && electron-builder --win',
      'build:mac': 'electron-vite build && electron-builder --mac',
      'build:linux': 'electron-vite build && electron-builder --linux',
      'build:all': 'electron-vite build && electron-builder --win --mac --linux',
      'package': 'electron-vite build && electron-builder --dir',
      'package:win': 'electron-vite build && electron-builder --win --dir',
      'package:mac': 'electron-vite build && electron-builder --mac --dir',
      'package:linux': 'electron-vite build && electron-builder --linux --dir',
      'package:smoke': 'electron-vite build && electron-builder --dir',
    };
  }

  /**
   * Validate configuration
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.config.appName) {
      errors.push('Application name is required');
    }

    if (!this.config.version) {
      errors.push('Version is required');
    }

    if (!this.config.author) {
      errors.push('Author is required');
    }

    if (this.config.targets.length === 0) {
      errors.push('At least one build target is required');
    }

    if (this.config.codeSigning?.enabled) {
      if (this.config.targets.includes('windows') && !this.config.codeSigning.certificatePath) {
        errors.push('Windows code signing requires certificate path');
      }

      if (this.config.targets.includes('mac') && !this.config.codeSigning.appleId) {
        errors.push('macOS code signing requires Apple ID');
      }
    }

    return errors;
  }
}

/**
 * Create build configuration
 */
export function createBuildConfig(config: BuildConfig): BuildConfigManager {
  return new BuildConfigManager(config);
}

/**
 * Default build configuration
 */
export const defaultBuildConfig: BuildConfig = {
  appName: 'CineWeave Studio',
  version: '0.1.0',
  description: 'Local-first desktop film analysis workbench',
  author: 'zhangshujuan1314',
  license: 'MIT',
  homepage: 'https://github.com/zhangshujuan1314/cineweave-studio',
  targets: ['windows', 'mac'],
  windows: {
    installerType: 'nsis',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installMode: 'perUser',
  },
  mac: {
    target: 'dmg',
    category: 'public.app-category.video',
    hardenedRuntime: true,
  },
  linux: {
    target: 'AppImage',
    category: 'AudioVideo',
  },
};
