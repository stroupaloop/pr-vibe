import { BaseProvider } from './base-provider.js';
import { execSync } from 'child_process';

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
  
  async postComment(prId, body, options = {}) {
    if (options.inReplyTo) {
      // Reply to specific comment
      const result = execSync(
        `gh api repos/${this.repo}/pulls/${prId}/comments/${options.inReplyTo}/replies -f body="${body}"`,
        { encoding: 'utf-8' }
      );
      return JSON.parse(result);
    } else {
      // General PR comment
      const result = execSync(
        `gh pr comment ${prId} --repo ${this.repo} --body "${body}"`,
        { encoding: 'utf-8' }
      );
      return { success: true };
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
}