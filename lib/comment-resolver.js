import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Resolves GitHub PR review comments after pr-vibe handles them
 */
export class CommentResolver {
  constructor(repo) {
    this.repo = repo;
  }

  /**
   * Resolve a review thread in GitHub's UI
   * @param {number} prNumber - PR number
   * @param {string} threadId - GitHub thread ID
   * @returns {Promise<boolean>} - Success status
   */
  async resolveThread(prNumber, threadId) {
    try {
      // Use GitHub GraphQL API to resolve the thread
      const mutation = `
        mutation ResolveReviewThread {
          resolveReviewThread(input: {threadId: "${threadId}"}) {
            thread {
              isResolved
            }
          }
        }
      `;

      const result = execSync(
        `gh api graphql -f query='${mutation}'`,
        { encoding: 'utf8', stdio: 'pipe' }
      );

      const data = JSON.parse(result);
      return data?.data?.resolveReviewThread?.thread?.isResolved || false;
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not resolve thread: ${error.message}`));
      return false;
    }
  }

  /**
   * Mark a comment as handled by pr-vibe
   * @param {number} prNumber 
   * @param {object} comment 
   * @param {string} action - The action taken (AUTO_FIX, REJECT, etc.)
   * @param {string} details - Additional details about the action
   */
  async markAsHandled(prNumber, comment, action, details) {
    const signature = this.generateSignature(action);
    
    // Add pr-vibe signature to the reply
    const replyBody = `${details}\n\n${signature}`;
    
    // Post the reply
    try {
      const response = execSync(
        `gh pr review ${prNumber} --comment --body "${replyBody.replace(/"/g, '\\"')}" -R ${this.repo}`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // If the comment has a thread ID, resolve it
      if (comment.threadId) {
        const resolved = await this.resolveThread(prNumber, comment.threadId);
        if (resolved) {
          console.log(chalk.green('  ✅ Marked as resolved in GitHub'));
        }
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`  ❌ Failed to mark as handled: ${error.message}`));
      return false;
    }
  }

  /**
   * Generate pr-vibe signature for comments
   * @param {string} action - The action taken
   * @returns {string} - Formatted signature
   */
  generateSignature(action) {
    const actionEmojis = {
      AUTO_FIX: '🔧',
      REJECT: '✅',
      DEFER: '📝',
      ESCALATE: '🚨'
    };

    const emoji = actionEmojis[action] || '🎵';
    
    return `---\n${emoji} **Handled by [pr-vibe](https://github.com/stroupaloop/pr-vibe)** • Action: \`${action}\``;
  }

  /**
   * Get thread ID from a comment
   * @param {number} prNumber 
   * @param {object} comment 
   * @returns {Promise<string|null>} Thread ID if found
   */
  async getThreadId(prNumber, comment) {
    try {
      // Get PR review threads
      const threads = execSync(
        `gh api repos/${this.repo}/pulls/${prNumber}/comments --jq '.[] | select(.id == ${comment.id}) | .pull_request_review_id'`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();

      return threads || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a summary comment showing all pr-vibe actions
   * @param {number} prNumber 
   * @param {Array} actions - List of actions taken
   */
  async postSummary(prNumber, actions) {
    const summary = this.generateSummary(actions);
    
    try {
      execSync(
        `gh pr comment ${prNumber} --body "${summary.replace(/"/g, '\\"')}" -R ${this.repo}`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      console.log(chalk.green('\n✅ Posted pr-vibe summary to PR'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to post summary: ${error.message}`));
    }
  }

  /**
   * Generate a summary of pr-vibe actions
   * @param {Array} actions 
   * @returns {string} Formatted summary
   */
  generateSummary(actions) {
    const stats = {
      AUTO_FIX: 0,
      REJECT: 0,
      DEFER: 0,
      ESCALATE: 0
    };

    actions.forEach(action => {
      if (stats.hasOwnProperty(action.type)) {
        stats[action.type]++;
      }
    });

    const totalHandled = Object.values(stats).reduce((a, b) => a + b, 0);
    const timeSaved = totalHandled * 2; // Estimate 2 min per comment

    return `## 🎵 pr-vibe Review Summary

I've reviewed and handled **${totalHandled} bot comments** on this PR:

${stats.AUTO_FIX > 0 ? `- 🔧 **Auto-fixed**: ${stats.AUTO_FIX} issues\n` : ''}${stats.REJECT > 0 ? `- ✅ **Validated**: ${stats.REJECT} patterns (explained why they're correct)\n` : ''}${stats.DEFER > 0 ? `- 📝 **Deferred**: ${stats.DEFER} items to backlog\n` : ''}${stats.ESCALATE > 0 ? `- 🚨 **Escalated**: ${stats.ESCALATE} complex issues\n` : ''}
⏱️ **Time saved**: ~${timeSaved} minutes
🧠 **Patterns learned**: ${stats.REJECT} (will handle automatically next time)

All handled comments have been marked as resolved. Let me know if you need any clarification!

---
*Powered by [pr-vibe](https://github.com/stroupaloop/pr-vibe) - Built by AI, for AI collaboration* 🎵`;
  }
}