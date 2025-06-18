/**
 * Report storage system with TTL management
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, unlinkSync, symlinkSync, readlinkSync } from 'fs';
import { join, dirname } from 'path';
import path from 'path';

export class ReportStorage {
  constructor(basePath = '.pr-bot') {
    this.basePath = basePath;
    this.reportsDir = join(basePath, 'reports');
    this.configPath = join(basePath, 'config.yml');
    this.cleanupTrackerPath = join(basePath, '.cleanup');
    
    // Default configuration
    this.config = {
      reports: {
        ttl_days: 30,
        max_per_pr: 5,
        auto_cleanup: true,
        cleanup_on_merge: false
      }
    };
    
    this.ensureDirectories();
    this.loadConfig();
  }

  ensureDirectories() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  loadConfig() {
    if (existsSync(this.configPath)) {
      try {
        const configContent = readFileSync(this.configPath, 'utf-8');
        // Simple YAML parsing for our use case
        const ttlMatch = configContent.match(/ttl_days:\s*(\d+)/);
        const maxMatch = configContent.match(/max_per_pr:\s*(\d+)/);
        const autoCleanupMatch = configContent.match(/auto_cleanup:\s*(true|false)/);
        const cleanupOnMergeMatch = configContent.match(/cleanup_on_merge:\s*(true|false)/);
        
        if (ttlMatch) this.config.reports.ttl_days = parseInt(ttlMatch[1]);
        if (maxMatch) this.config.reports.max_per_pr = parseInt(maxMatch[1]);
        if (autoCleanupMatch) this.config.reports.auto_cleanup = autoCleanupMatch[1] === 'true';
        if (cleanupOnMergeMatch) this.config.reports.cleanup_on_merge = cleanupOnMergeMatch[1] === 'true';
      } catch (error) {
        console.warn('Could not load report config, using defaults:', error.message);
      }
    }
  }

  saveReport(prNumber, reportBuilder) {
    const prDir = join(this.reportsDir, `pr-${prNumber}`);
    if (!existsSync(prDir)) {
      mkdirSync(prDir, { recursive: true });
    }

    // Set TTL on the report
    reportBuilder.setTTL(this.config.reports.ttl_days);
    
    // Generate filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const markdownFile = join(prDir, `${timestamp}.md`);
    const jsonFile = join(prDir, `${timestamp}.json`);
    const latestLink = join(prDir, 'latest.md');
    const latestJsonLink = join(prDir, 'latest.json');

    // Save markdown and JSON versions
    writeFileSync(markdownFile, reportBuilder.toMarkdown(), 'utf-8');
    writeFileSync(jsonFile, reportBuilder.toJSON(), 'utf-8');

    // Update latest symlinks (remove old ones first)
    try {
      if (existsSync(latestLink)) unlinkSync(latestLink);
      if (existsSync(latestJsonLink)) unlinkSync(latestJsonLink);
    } catch (error) {
      // Ignore errors removing old symlinks
    }

    // Create relative symlinks
    try {
      symlinkSync(path.basename(markdownFile), latestLink);
      symlinkSync(path.basename(jsonFile), latestJsonLink);
    } catch (error) {
      // On Windows or if symlinks fail, copy the file instead
      writeFileSync(latestLink, readFileSync(markdownFile, 'utf-8'), 'utf-8');
      writeFileSync(latestJsonLink, readFileSync(jsonFile, 'utf-8'), 'utf-8');
    }

    // Clean up old reports for this PR if exceeding max
    this.cleanupOldReportsForPR(prNumber);

    // Run auto cleanup if enabled
    if (this.config.reports.auto_cleanup) {
      this.runCleanup();
    }

    return {
      markdown: markdownFile,
      json: jsonFile,
      reportId: reportBuilder.report.metadata.reportId
    };
  }

  getReport(prNumber, timestamp = null) {
    const prDir = join(this.reportsDir, `pr-${prNumber}`);
    if (!existsSync(prDir)) {
      return null;
    }

    let reportFile;
    if (!timestamp) {
      // Get latest report
      reportFile = join(prDir, 'latest.md');
      if (!existsSync(reportFile)) {
        // Fallback to most recent file
        const files = this.listReportsForPR(prNumber);
        if (files.length === 0) return null;
        reportFile = files[0].path;
      }
    } else {
      // Get specific report by timestamp
      reportFile = join(prDir, `${timestamp}.md`);
      if (!existsSync(reportFile)) {
        // Try with .md extension if not included
        reportFile = join(prDir, `${timestamp}`);
        if (!existsSync(reportFile)) return null;
      }
    }

    try {
      const content = readFileSync(reportFile, 'utf-8');
      const jsonFile = reportFile.replace('.md', '.json');
      let metadata = {};
      
      if (existsSync(jsonFile)) {
        const jsonContent = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        metadata = jsonContent.metadata || {};
      }

      return {
        content,
        path: reportFile,
        metadata,
        timestamp: path.basename(reportFile, '.md')
      };
    } catch (error) {
      console.error(`Error reading report: ${error.message}`);
      return null;
    }
  }

  listReportsForPR(prNumber) {
    const prDir = join(this.reportsDir, `pr-${prNumber}`);
    if (!existsSync(prDir)) {
      return [];
    }

    const files = readdirSync(prDir)
      .filter(file => file.endsWith('.md') && file !== 'latest.md')
      .map(file => {
        const filePath = join(prDir, file);
        const stats = statSync(filePath);
        return {
          timestamp: file.replace('.md', ''),
          path: filePath,
          created: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  }

  cleanupOldReportsForPR(prNumber) {
    const reports = this.listReportsForPR(prNumber);
    const maxReports = this.config.reports.max_per_pr;

    if (reports.length > maxReports) {
      // Keep the most recent reports
      const reportsToDelete = reports.slice(maxReports);
      
      reportsToDelete.forEach(report => {
        try {
          unlinkSync(report.path);
          const jsonPath = report.path.replace('.md', '.json');
          if (existsSync(jsonPath)) {
            unlinkSync(jsonPath);
          }
        } catch (error) {
          console.warn(`Could not delete old report: ${error.message}`);
        }
      });

      console.log(`🗑️  Cleaned up ${reportsToDelete.length} old reports for PR #${prNumber}`);
    }
  }

  runCleanup() {
    // Check if we should run cleanup (once per day)
    const now = Date.now();
    let lastCleanup = 0;
    
    if (existsSync(this.cleanupTrackerPath)) {
      try {
        lastCleanup = parseInt(readFileSync(this.cleanupTrackerPath, 'utf-8'));
      } catch (error) {
        // Ignore
      }
    }

    const dayInMs = 24 * 60 * 60 * 1000;
    if (now - lastCleanup < dayInMs) {
      return; // Already cleaned up recently
    }

    console.log('🧹 Running report cleanup...');
    
    const ttlMs = this.config.reports.ttl_days * dayInMs;
    const cutoffDate = new Date(now - ttlMs);
    let deletedCount = 0;

    // Go through all PR directories
    if (existsSync(this.reportsDir)) {
      const prDirs = readdirSync(this.reportsDir)
        .filter(dir => dir.startsWith('pr-'))
        .map(dir => join(this.reportsDir, dir));

      prDirs.forEach(prDir => {
        const prNumber = path.basename(prDir).replace('pr-', '');
        const reports = this.listReportsForPR(prNumber);
        
        // Keep at least max_per_pr reports regardless of age
        const reportsToCheck = reports.slice(this.config.reports.max_per_pr);
        
        reportsToCheck.forEach(report => {
          if (report.created < cutoffDate) {
            try {
              unlinkSync(report.path);
              const jsonPath = report.path.replace('.md', '.json');
              if (existsSync(jsonPath)) {
                unlinkSync(jsonPath);
              }
              deletedCount++;
            } catch (error) {
              console.warn(`Could not delete expired report: ${error.message}`);
            }
          }
        });

        // Remove empty PR directories
        const remainingFiles = readdirSync(prDir);
        if (remainingFiles.length === 0) {
          try {
            rmdirSync(prDir);
          } catch (error) {
            // Ignore
          }
        }
      });
    }

    // Update cleanup tracker
    writeFileSync(this.cleanupTrackerPath, now.toString(), 'utf-8');

    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} reports older than ${this.config.reports.ttl_days} days`);
    }
  }

  checkPRStatus(prNumber) {
    const prDir = join(this.reportsDir, `pr-${prNumber}`);
    if (!existsSync(prDir)) {
      return {
        hasReports: false,
        lastReport: null,
        reportCount: 0
      };
    }

    const reports = this.listReportsForPR(prNumber);
    if (reports.length === 0) {
      return {
        hasReports: false,
        lastReport: null,
        reportCount: 0
      };
    }

    // Get the latest report's metadata
    const latestReport = this.getReport(prNumber);
    let status = {
      hasReports: true,
      lastReport: reports[0].created,
      reportCount: reports.length,
      lastReportId: reports[0].timestamp
    };

    if (latestReport && latestReport.metadata) {
      const report = JSON.parse(readFileSync(latestReport.path.replace('.md', '.json'), 'utf-8'));
      status = {
        ...status,
        summary: report.summary,
        preMergeChecklist: report.preMergeChecklist,
        isReadyToMerge: report.preMergeChecklist.allCommentsAddressed && 
                        report.preMergeChecklist.humanReviewComplete
      };
    }

    return status;
  }

  cleanupForMergedPR(prNumber) {
    if (!this.config.reports.cleanup_on_merge) {
      return;
    }

    const prDir = join(this.reportsDir, `pr-${prNumber}`);
    if (!existsSync(prDir)) {
      return;
    }

    const reports = this.listReportsForPR(prNumber);
    reports.forEach(report => {
      try {
        unlinkSync(report.path);
        const jsonPath = report.path.replace('.md', '.json');
        if (existsSync(jsonPath)) {
          unlinkSync(jsonPath);
        }
      } catch (error) {
        console.warn(`Could not delete report: ${error.message}`);
      }
    });

    // Remove directory
    try {
      const remainingFiles = readdirSync(prDir);
      remainingFiles.forEach(file => {
        unlinkSync(join(prDir, file));
      });
      rmdirSync(prDir);
      console.log(`🗑️  Cleaned up all reports for merged PR #${prNumber}`);
    } catch (error) {
      console.warn(`Could not remove PR directory: ${error.message}`);
    }
  }
}

export function createReportStorage(basePath) {
  return new ReportStorage(basePath);
}