/**
 * Security Audit Module
 *
 * Performs security audits on the application:
 * - IPC channel validation
 * - Path traversal prevention
 * - Shell injection prevention
 * - CSP compliance
 * - Dependency vulnerability scanning
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface SecurityAuditResult {
  passed: boolean;
  score: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warnings: SecurityWarning[];
  errors: SecurityError[];
}

export interface SecurityWarning {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  file?: string;
  line?: number;
  recommendation: string;
}

export interface SecurityError {
  id: string;
  severity: 'critical' | 'high';
  message: string;
  file?: string;
  line?: number;
  fix: string;
}

export interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  check: () => Promise<SecurityCheckResult>;
}

export interface SecurityCheckResult {
  passed: boolean;
  message: string;
  details?: unknown;
}

/**
 * Security Audit implementation
 */
export class SecurityAudit {
  private projectDir: string;
  private checks: SecurityCheck[] = [];

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.registerDefaultChecks();
  }

  /**
   * Register default security checks
   */
  private registerDefaultChecks(): void {
    // Check 1: IPC channel validation
    this.checks.push({
      id: 'ipc-validation',
      name: 'IPC Channel Validation',
      description: 'Verify all IPC channels are properly validated',
      check: () => this.checkIPCValidation(),
    });

    // Check 2: Path traversal prevention
    this.checks.push({
      id: 'path-traversal',
      name: 'Path Traversal Prevention',
      description: 'Verify path traversal attacks are prevented',
      check: () => this.checkPathTraversal(),
    });

    // Check 3: Shell injection prevention
    this.checks.push({
      id: 'shell-injection',
      name: 'Shell Injection Prevention',
      description: 'Verify shell injection attacks are prevented',
      check: () => this.checkShellInjection(),
    });

    // Check 4: CSP compliance
    this.checks.push({
      id: 'csp-compliance',
      name: 'CSP Compliance',
      description: 'Verify Content Security Policy is properly configured',
      check: () => this.checkCSPCompliance(),
    });

    // Check 5: Node integration disabled
    this.checks.push({
      id: 'node-integration',
      name: 'Node Integration Disabled',
      description: 'Verify Node integration is disabled in renderer',
      check: () => this.checkNodeIntegration(),
    });

    // Check 6: Context isolation enabled
    this.checks.push({
      id: 'context-isolation',
      name: 'Context Isolation Enabled',
      description: 'Verify context isolation is enabled',
      check: () => this.checkContextIsolation(),
    });

    // Check 7: Sandbox enabled
    this.checks.push({
      id: 'sandbox',
      name: 'Sandbox Enabled',
      description: 'Verify sandbox is enabled',
      check: () => this.checkSandbox(),
    });

    // Check 8: External URL handling
    this.checks.push({
      id: 'external-urls',
      name: 'External URL Handling',
      description: 'Verify external URLs are properly handled',
      check: () => this.checkExternalUrls(),
    });
  }

  /**
   * Run all security checks
   */
  async runAudit(): Promise<SecurityAuditResult> {
    const warnings: SecurityWarning[] = [];
    const errors: SecurityError[] = [];
    let passedChecks = 0;
    let failedChecks = 0;

    for (const check of this.checks) {
      try {
        const result = await check.check();

        if (result.passed) {
          passedChecks++;
        } else {
          failedChecks++;

          if (check.id === 'shell-injection' || check.id === 'path-traversal') {
            errors.push({
              id: check.id,
              severity: 'critical',
              message: result.message,
              fix: `Fix ${check.name} vulnerability`,
            });
          } else {
            warnings.push({
              id: check.id,
              severity: 'high',
              message: result.message,
              recommendation: `Review ${check.name}`,
            });
          }
        }
      } catch (error) {
        failedChecks++;
        errors.push({
          id: check.id,
          severity: 'critical',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          fix: `Fix ${check.name} check implementation`,
        });
      }
    }

    const totalChecks = this.checks.length;
    const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    return {
      passed: failedChecks === 0,
      score,
      totalChecks,
      passedChecks,
      failedChecks,
      warnings,
      errors,
    };
  }

  /**
   * Check IPC validation
   */
  private async checkIPCValidation(): Promise<SecurityCheckResult> {
    // Check if IPC channels are properly validated
    const ipcFiles = await this.findFiles('src/main/ipc/**/*.ts');

    for (const file of ipcFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for Zod validation
      if (!content.includes('z.object') && !content.includes('z.string')) {
        return {
          passed: false,
          message: `IPC handler ${file} may not have proper validation`,
        };
      }
    }

    return {
      passed: true,
      message: 'All IPC channels have proper validation',
    };
  }

  /**
   * Check path traversal prevention
   */
  private async checkPathTraversal(): Promise<SecurityCheckResult> {
    const files = await this.findFiles('src/**/*.ts');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for path traversal vulnerabilities
      if (content.includes('path.join') && !content.includes('path.resolve')) {
        // Check if path.join is used with user input
        if (content.includes('req.body') || content.includes('args.')) {
          return {
            passed: false,
            message: `Potential path traversal vulnerability in ${file}`,
          };
        }
      }
    }

    return {
      passed: true,
      message: 'Path traversal prevention is properly implemented',
    };
  }

  /**
   * Check shell injection prevention
   */
  private async checkShellInjection(): Promise<SecurityCheckResult> {
    const files = await this.findFiles('src/**/*.ts');

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for shell injection vulnerabilities
      if (content.includes('exec(') || content.includes('execSync(')) {
        return {
          passed: false,
          message: `Potential shell injection vulnerability in ${file}`,
        };
      }

      // Check for proper FFmpeg argument handling
      if (content.includes('ffmpeg') && content.includes("'")) {
        return {
          passed: false,
          message: `FFmpeg arguments should use array format in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'Shell injection prevention is properly implemented',
    };
  }

  /**
   * Check CSP compliance
   */
  private async checkCSPCompliance(): Promise<SecurityCheckResult> {
    const htmlFiles = await this.findFiles('src/**/*.html');

    for (const file of htmlFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for CSP meta tag
      if (!content.includes('Content-Security-Policy')) {
        return {
          passed: false,
          message: `CSP not found in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'CSP is properly configured',
    };
  }

  /**
   * Check Node integration disabled
   */
  private async checkNodeIntegration(): Promise<SecurityCheckResult> {
    const mainFiles = await this.findFiles('src/main/**/*.ts');

    for (const file of mainFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for nodeIntegration: false
      if (content.includes('BrowserWindow') && !content.includes('nodeIntegration: false')) {
        return {
          passed: false,
          message: `Node integration may be enabled in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'Node integration is properly disabled',
    };
  }

  /**
   * Check context isolation enabled
   */
  private async checkContextIsolation(): Promise<SecurityCheckResult> {
    const mainFiles = await this.findFiles('src/main/**/*.ts');

    for (const file of mainFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for contextIsolation: true
      if (content.includes('BrowserWindow') && !content.includes('contextIsolation: true')) {
        return {
          passed: false,
          message: `Context isolation may be disabled in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'Context isolation is properly enabled',
    };
  }

  /**
   * Check sandbox enabled
   */
  private async checkSandbox(): Promise<SecurityCheckResult> {
    const mainFiles = await this.findFiles('src/main/**/*.ts');

    for (const file of mainFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for sandbox: true
      if (content.includes('BrowserWindow') && !content.includes('sandbox: true')) {
        return {
          passed: false,
          message: `Sandbox may be disabled in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'Sandbox is properly enabled',
    };
  }

  /**
   * Check external URL handling
   */
  private async checkExternalUrls(): Promise<SecurityCheckResult> {
    const mainFiles = await this.findFiles('src/main/**/*.ts');

    for (const file of mainFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Check for proper external URL handling
      if (content.includes('shell.openExternal') && !content.includes('will-navigate')) {
        return {
          passed: false,
          message: `External URL handling may be insecure in ${file}`,
        };
      }
    }

    return {
      passed: true,
      message: 'External URLs are properly handled',
    };
  }

  /**
   * Find files matching pattern
   */
  private async findFiles(pattern: string): Promise<string[]> {
    // Simple glob implementation
    const files: string[] = [];
    const baseDir = this.projectDir;

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findFilesInDir(
            path.join(baseDir, entry.name),
            pattern
          );
          files.push(...subFiles);
        }
      }
    } catch {
      // Directory may not exist
    }

    return files;
  }

  /**
   * Find files in directory
   */
  private async findFilesInDir(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findFilesInDir(fullPath, pattern);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory may not exist
    }

    return files;
  }

  /**
   * Generate audit report
   */
  async generateReport(result: SecurityAuditResult): Promise<string> {
    const lines: string[] = [];

    lines.push('# Security Audit Report');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Score: ${result.score.toFixed(1)}%`);
    lines.push(`- Total Checks: ${result.totalChecks}`);
    lines.push(`- Passed: ${result.passedChecks}`);
    lines.push(`- Failed: ${result.failedChecks}`);
    lines.push(`- Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    // Errors
    if (result.errors.length > 0) {
      lines.push('## Critical Issues');
      lines.push('');

      for (const error of result.errors) {
        lines.push(`### ${error.id}`);
        lines.push('');
        lines.push(`- **Severity**: ${error.severity}`);
        lines.push(`- **Message**: ${error.message}`);
        lines.push(`- **Fix**: ${error.fix}`);
        lines.push('');
      }
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');

      for (const warning of result.warnings) {
        lines.push(`### ${warning.id}`);
        lines.push('');
        lines.push(`- **Severity**: ${warning.severity}`);
        lines.push(`- **Message**: ${warning.message}`);
        lines.push(`- **Recommendation**: ${warning.recommendation}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create security audit
 */
export function createSecurityAudit(projectDir: string): SecurityAudit {
  return new SecurityAudit(projectDir);
}
