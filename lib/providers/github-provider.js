import { BaseProvider } from './base-provider.js';
import { execSync, execFileSync } from 'node:child_process';
import { MessageTruncator } from '../utils/message-truncator.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class GitHubProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.repo = config.repo || this.detectRepo();
  }
  
  detectRepo() {
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const match = remote.match(/github\.com[:/](.+\/.+?)(\.git)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
  
  async getPullRequest(id) {
    const json = execSync(
      `gh pr view ${id} --repo ${this.repo} --json title,author,body,state,labels`,
      { encoding: 'utf-8' }
    );
    const pr = JSON.parse(json);
    
    return {
      id,
      title: pr.title,
      author: pr.author.login,
      description: pr.body,
      state: pr.state,
      labels: pr.labels.map(l => l.name)
    };
  }
  
  async getComments(prId) {
    // Get issue comments
    const prJson = execSync(
      `gh pr view ${prId} --repo ${this.repo} --json comments`,
      { encoding: 'utf-8' }
    );
    const { comments: issueComments } = JSON.parse(prJson);
    
    // Get review comments
    const reviewJson = execSync(
      `gh api repos/${this.repo}/pulls/${prId}/comments`,
      { encoding: 'utf-8' }
    );
    const reviewComments = JSON.parse(reviewJson);
    
    // Normalize and combine
    const normalized = [
      ...issueComments.map(c => ({
        id: c.id,
        author: c.author.login,
        body: c.body,
        createdAt: c.createdAt,
        type: 'issue'
      })),
      ...reviewComments.map(c => ({
        id: c.id,
        author: c.user.login,
        body: c.body,
        path: c.path,
        line: c.line,
        createdAt: c.created_at,
        type: 'review'
      }))
    ];
    
    return normalized;
  }
  
  async getReviews(prId) {
    // Get PR reviews (not just comments, but full reviews)
    const reviewsJson = execSync(
      `gh api repos/${this.repo}/pulls/${prId}/reviews`,
      { encoding: 'utf-8' }
    );
    const reviews = JSON.parse(reviewsJson);
    
    // Get review comments for each review
    const reviewsWithComments = await Promise.all(reviews.map(async (review) => {
      if (review.body || review.state === 'COMMENTED') {
        // Get comments associated with this review
        const commentsJson = execSync(
          `gh api repos/${this.repo}/pulls/${prId}/reviews/${review.id}/comments`,
          { encoding: 'utf-8' }
        );
        const comments = JSON.parse(commentsJson);
        
        return {
          id: review.id,
          author: review.user.login,
          body: review.body || '',
          state: review.state,
          submitted_at: review.submitted_at,
          type: 'review',
          comments: comments.map(c => ({
            id: c.id,
            body: c.body,
            path: c.path,
            line: c.line,
            created_at: c.created_at
          }))
        };
      }
      return null;
    }));
    
    return reviewsWithComments.filter(r => r !== null);
  }
  
  async postComment(prId, body, options = {}) {
    // Check if message exceeds GitHub's limit
    const excessInfo = MessageTruncator.getExcessInfo(body);
    
    if (excessInfo.exceedsLimit) {
      console.warn(`Comment exceeds GitHub limit by ${excessInfo.excessCharacters} characters (${excessInfo.excessPercentage.toFixed(1)}% over)`);
      
      // Try truncation first
      const truncated = MessageTruncator.truncate(body, {
        preserveCodeBlocks: true,
        addNotice: true
      });
      
      console.log(`Truncated comment from ${truncated.originalLength} to ${truncated.message.length} characters`);
      body = truncated.message;
    }
    
    try {
      if (options.inReplyTo) {
        // Reply to specific comment - use temp file to avoid shell injection
        const tempFile = join(tmpdir(), `pr-vibe-comment-${Date.now()}.txt`);
        writeFileSync(tempFile, body, 'utf-8');
        
        try {
          const result = execFileSync('gh', [
            'api',
            `repos/${this.repo}/pulls/${prId}/comments/${options.inReplyTo}/replies`,
            '-F',
            `body=@${tempFile}`
          ], { encoding: 'utf-8' });
          return JSON.parse(result);
        } finally {
          unlinkSync(tempFile);
        }
      } else {
        // General PR comment - use stdin to avoid shell injection
        const result = execFileSync('gh', [
          'pr',
          'comment',
          prId.toString(),
          '--repo',
          this.repo,
          '-F',
          '-'
        ], { 
          encoding: 'utf-8',
          input: body
        });
        return { success: true };
      }
    } catch (error) {
      // If we still get a 422 error, it might be due to special characters or other issues
      if (error.message.includes('422') || error.message.includes('Validation Failed')) {
        console.error('GitHub API validation error. Message might contain invalid characters or exceed limits.');
        
        // Try a more aggressive truncation
        const aggressiveTruncate = MessageTruncator.truncate(body, {
          preserveCodeBlocks: false,
          addNotice: true
        });
        
        // Retry with heavily truncated message
        if (options.inReplyTo) {
          const tempFile = join(tmpdir(), `pr-vibe-comment-retry-${Date.now()}.txt`);
          writeFileSync(tempFile, aggressiveTruncate.message, 'utf-8');
          
          try {
            const result = execFileSync('gh', [
              'api',
              `repos/${this.repo}/pulls/${prId}/comments/${options.inReplyTo}/replies`,
              '-F',
              `body=@${tempFile}`
            ], { encoding: 'utf-8' });
            return JSON.parse(result);
          } finally {
            unlinkSync(tempFile);
          }
        } else {
          const result = execFileSync('gh', [
            'pr',
            'comment',
            prId.toString(),
            '--repo',
            this.repo,
            '-F',
            '-'
          ], { 
            encoding: 'utf-8',
            input: aggressiveTruncate.message
          });
          return { success: true };
        }
      }
      
      throw error;
    }
  }
  
  async getFileContent(prId, path) {
    // Get the PR's head SHA
    const prJson = execSync(
      `gh pr view ${prId} --repo ${this.repo} --json headRefOid`,
      { encoding: 'utf-8' }
    );
    const { headRefOid } = JSON.parse(prJson);
    
    // Get file content at that commit
    const content = execSync(
      `gh api repos/${this.repo}/contents/${path}?ref=${headRefOid} --jq .content | base64 -d`,
      { encoding: 'utf-8' }
    );
    
    return content;
  }
  
  async applyFix(prId, changes) {
    // This would create a commit on the PR branch
    // For now, return mock success
    return {
      sha: 'mock-sha',
      message: 'Applied automated fixes'
    };
  }
  
  async updateLabels(prId, labels) {
    const addLabels = labels.filter(l => l.startsWith('+'));
    const removeLabels = labels.filter(l => l.startsWith('-'));
    
    if (addLabels.length > 0) {
      execSync(
        `gh pr edit ${prId} --repo ${this.repo} --add-label "${addLabels.map(l => l.slice(1)).join(',')}"`,
        { encoding: 'utf-8' }
      );
    }
    
    if (removeLabels.length > 0) {
      execSync(
        `gh pr edit ${prId} --repo ${this.repo} --remove-label "${removeLabels.map(l => l.slice(1)).join(',')}"`,
        { encoding: 'utf-8' }
      );
    }
  }
  
  async getPRChecks(prId) {
    try {
      // Get check runs for the PR
      const checksJson = execSync(
        `gh api repos/${this.repo}/pulls/${prId} --jq '.head.sha' | xargs -I {} gh api repos/${this.repo}/commits/{}/check-runs`,
        { encoding: 'utf-8' }
      );
      const checkRuns = JSON.parse(checksJson);
      
      // Get status checks for the PR
      const statusJson = execSync(
        `gh api repos/${this.repo}/pulls/${prId} --jq '.head.sha' | xargs -I {} gh api repos/${this.repo}/commits/{}/statuses`,
        { encoding: 'utf-8' }
      );
      const statuses = JSON.parse(statusJson);
      
      // Combine and normalize results
      const allChecks = [];
      
      // Process check runs
      if (checkRuns.check_runs) {
        checkRuns.check_runs.forEach(check => {
          allChecks.push({
            name: check.name,
            status: check.status, // completed, in_progress, queued
            conclusion: check.conclusion, // success, failure, neutral, cancelled, skipped, timed_out, action_required
            type: 'check_run',
            url: check.html_url
          });
        });
      }
      
      // Process status checks
      statuses.forEach(status => {
        allChecks.push({
          name: status.context,
          status: status.state === 'pending' ? 'in_progress' : 'completed',
          conclusion: status.state === 'success' ? 'success' : (status.state === 'failure' ? 'failure' : 'neutral'),
          type: 'status',
          url: status.target_url
        });
      });
      
      // Calculate summary
      const summary = {
        total: allChecks.length,
        pending: allChecks.filter(c => c.status === 'in_progress' || c.status === 'queued').length,
        passing: allChecks.filter(c => c.conclusion === 'success').length,
        failing: allChecks.filter(c => c.conclusion === 'failure').length,
        neutral: allChecks.filter(c => c.conclusion === 'neutral' || c.conclusion === 'skipped').length,
        checks: allChecks
      };
      
      return summary;
    } catch (error) {
      // If we can't get CI status (maybe due to permissions), return null
      console.debug('Could not fetch CI status:', error.message);
      return null;
    }
  }
  
  async createIssue(options) {
    const { title, body, labels = [], assignee = null, milestone = null } = options;
    
    try {
      // Build gh issue create command arguments
      const args = [
        'issue',
        'create',
        '--repo',
        this.repo,
        '--title',
        title
      ];
      
      // Add body using stdin to avoid shell escaping issues
      if (body) {
        args.push('--body-file', '-');
      }
      
      // Add labels if provided
      if (labels.length > 0) {
        args.push('--label', labels.join(','));
      }
      
      // Add assignee if provided
      if (assignee) {
        args.push('--assignee', assignee);
      }
      
      // Add milestone if provided
      if (milestone) {
        args.push('--milestone', milestone);
      }
      
      // Execute the command
      const result = execFileSync('gh', args, {
        encoding: 'utf-8',
        input: body || ''
      }).trim();
      
      // Parse the issue URL to get the issue number
      const match = result.match(/\/issues\/(\d+)$/);
      const issueNumber = match ? match[1] : null;
      
      return {
        success: true,
        url: result,
        number: issueNumber
      };
    } catch (error) {
      console.error('Failed to create issue:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}