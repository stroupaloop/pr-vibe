import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

export class FileModifier {
  constructor(provider, prId) {
    this.provider = provider;
    this.prId = prId;
    this.changes = [];
  }
  
  /**
   * Add a file change to the queue
   */
  addChange(filePath, originalContent, newContent, description) {
    this.changes.push({
      path: filePath,
      original: originalContent,
      new: newContent,
      description
    });
  }
  
  /**
   * Apply a specific fix suggested by the decision engine
   */
  async applyFix(comment, fix) {
    if (!comment.path) {
      throw new Error('Cannot apply fix without file path');
    }
    
    // SAFETY CHECK: Never apply fixes that look like placeholders
    if (!fix || fix.includes('TODO:') || fix.includes('// TODO') || 
        fix.includes('placeholder') || fix.includes('Implement fix')) {
      throw new Error('Refusing to apply placeholder fix. This would damage the codebase.');
    }
    
    // Get current file content from the PR
    const currentContent = await this.provider.getFileContent(this.prId, comment.path);
    
    // Apply the fix
    let newContent = currentContent;
    
    // Handle different types of fixes
    if (fix.includes('// REMOVE LINE')) {
      // Remove specific lines
      const lines = currentContent.split('\n');
      const lineToRemove = comment.line - 1; // Convert to 0-based
      if (lineToRemove >= 0 && lineToRemove < lines.length) {
        lines.splice(lineToRemove, 1);
        newContent = lines.join('\n');
      }
    } else if (fix.includes('// REPLACE WITH:')) {
      // Replace content
      const [, replacement] = fix.split('// REPLACE WITH:');
      const lines = currentContent.split('\n');
      const lineToReplace = comment.line - 1;
      if (lineToReplace >= 0 && lineToReplace < lines.length) {
        lines[lineToReplace] = replacement.trim();
        newContent = lines.join('\n');
      }
    } else if (fix.includes('// ADD AFTER:')) {
      // Add content after a line
      const [, addition] = fix.split('// ADD AFTER:');
      const lines = currentContent.split('\n');
      const lineIndex = comment.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines.splice(lineIndex + 1, 0, addition.trim());
        newContent = lines.join('\n');
      }
    } else {
      // For other fix formats, try to intelligently apply the fix
      // NEVER replace the entire file content
      
      // If the fix looks like a code snippet, try to replace around the comment line
      const lines = currentContent.split('\n');
      const targetLine = comment.line - 1;
      
      if (targetLine >= 0 && targetLine < lines.length) {
        // Look for the problematic code around the comment line
        // and replace just that section
        const fixLines = fix.split('\n');
        
        // Find the best place to insert/replace the fix
        // Default to replacing just the commented line
        lines[targetLine] = fixLines[0] || lines[targetLine];
        
        // If the fix has multiple lines, insert them
        if (fixLines.length > 1) {
          for (let i = 1; i < fixLines.length; i++) {
            lines.splice(targetLine + i, 0, fixLines[i]);
          }
        }
        
        newContent = lines.join('\n');
      } else {
        // If we can't determine where to apply the fix, don't modify the file
        throw new Error('Cannot determine where to apply the fix. Manual review required.');
      }
    }
    
    this.addChange(
      comment.path,
      currentContent,
      newContent,
      `Fix: ${comment.body.substring(0, 50)}...`
    );
    
    return {
      path: comment.path,
      applied: true,
      description: this.changes[this.changes.length - 1].description
    };
  }
  
  /**
   * Apply all queued changes to the filesystem
   */
  async applyChanges(targetDir = null) {
    if (this.changes.length === 0) {
      return { success: true, message: 'No changes to apply' };
    }
    
    const results = [];
    
    for (const change of this.changes) {
      try {
        const filePath = targetDir ? join(targetDir, change.path) : change.path;
        
        // Ensure directory exists
        mkdirSync(dirname(filePath), { recursive: true });
        
        // Write the file
        writeFileSync(filePath, change.new, 'utf-8');
        
        results.push({
          path: change.path,
          success: true,
          description: change.description
        });
      } catch (error) {
        results.push({
          path: change.path,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results,
      totalChanges: this.changes.length
    };
  }
  
  /**
   * Create a commit with all changes
   */
  async createCommit(message = 'Apply automated PR review fixes') {
    if (this.changes.length === 0) {
      throw new Error('No changes to commit');
    }
    
    try {
      // Get PR branch info
      const prJson = execSync(
        `gh pr view ${this.prId} --json headRefName`,
        { encoding: 'utf-8' }
      );
      const { headRefName } = JSON.parse(prJson);
      
      // Checkout PR branch
      execSync(`git fetch origin ${headRefName}`, { stdio: 'pipe' });
      execSync(`git checkout ${headRefName}`, { stdio: 'pipe' });
      
      // Apply changes
      const result = await this.applyChanges();
      if (!result.success) {
        throw new Error('Failed to apply some changes');
      }
      
      // Stage and commit
      for (const change of this.changes) {
        execSync(`git add ${change.path}`, { stdio: 'pipe' });
      }
      
      const detailedMessage = `${message}

Changes:
${this.changes.map(c => `- ${c.path}: ${c.description}`).join('\n')}

Generated by pr-review-assistant 🤖`;
      
      execSync(`git commit -m "${detailedMessage}"`, { stdio: 'pipe' });
      execSync(`git push origin ${headRefName}`, { stdio: 'pipe' });
      
      return {
        success: true,
        branch: headRefName,
        changes: this.changes.length,
        message: detailedMessage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Preview changes without applying them
   */
  getChangesSummary() {
    return this.changes.map(c => ({
      path: c.path,
      description: c.description,
      linesChanged: this.calculateLineChanges(c.original, c.new)
    }));
  }
  
  calculateLineChanges(original, newContent) {
    const originalLines = original.split('\n').length;
    const newLines = newContent.split('\n').length;
    return {
      added: Math.max(0, newLines - originalLines),
      removed: Math.max(0, originalLines - newLines),
      total: Math.abs(newLines - originalLines)
    };
  }
}

export function createFileModifier(provider, prId) {
  return new FileModifier(provider, prId);
}