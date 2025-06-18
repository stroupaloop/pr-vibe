import { execSync } from 'child_process';
import chalk from 'chalk';

export class CommentPoster {
  constructor(provider) {
    this.provider = provider;
    this.postedComments = [];
    this.resolvedThreads = [];
  }
  
  /**
   * Post a reply to a specific comment
   */
  async replyToComment(prId, comment, replyText, options = {}) {
    try {
      // Add pr-vibe signature
      const enhancedReply = this.addPrVibeSignature(replyText, options.action);
      
      // Add reaction emoji if specified
      if (options.reaction) {
        await this.addReaction(prId, comment.id, options.reaction);
      }
      
      // Post the reply
      const result = await this.provider.postComment(prId, enhancedReply, {
        inReplyTo: comment.id,
        isInline: comment.type === 'review'
      });
      
      this.postedComments.push({
        originalComment: comment.id,
        reply: result,
        timestamp: new Date().toISOString(),
        action: options.action
      });
      
      // Mark thread as resolved if we handled it
      if (options.action && options.action !== 'ESCALATE') {
        await this.resolveThread(prId, comment);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to reply to comment ${comment.id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Post a general comment on the PR
   */
  async postGeneralComment(prId, body) {
    try {
      const result = await this.provider.postComment(prId, body);
      
      this.postedComments.push({
        type: 'general',
        reply: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to post general comment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Add a reaction to a comment
   */
  async addReaction(prId, commentId, reaction) {
    // Map decision to emoji
    const reactionMap = {
      'AUTO_FIX': '✅',
      'REJECT': '❌',
      'DISCUSS': '💬',
      'DEFER': '📝',
      'ESCALATE': '⚠️'
    };
    
    const emoji = reactionMap[reaction] || reaction;
    
    try {
      // GitHub reactions API
      execSync(
        `gh api -X POST repos/${this.provider.repo}/issues/comments/${commentId}/reactions -f content='${this.getGitHubReaction(emoji)}'`,
        { stdio: 'pipe' }
      );
    } catch (error) {
      // Reaction might not be supported, continue anyway
      console.warn(`Could not add reaction ${emoji}: ${error.message}`);
    }
  }
  
  /**
   * Convert emoji to GitHub reaction type
   */
  getGitHubReaction(emoji) {
    const map = {
      '✅': '+1',
      '❌': '-1',
      '💬': 'eyes',
      '📝': 'heart',
      '⚠️': 'confused',
      '🚀': 'rocket',
      '👀': 'eyes'
    };
    return map[emoji] || 'eyes';
  }
  
  /**
   * Post a summary comment with all actions taken
   */
  async postSummary(prId, decisions, changes) {
    const summary = this.buildSummary(decisions, changes);
    return await this.postGeneralComment(prId, summary);
  }
  
  buildSummary(decisions, changes) {
    const stats = {
      total: decisions.length,
      autoFixed: decisions.filter(d => d.decision?.action === 'AUTO_FIX' || d.action === 'AUTO_FIX').length,
      rejected: decisions.filter(d => d.decision?.action === 'REJECT' || d.action === 'REJECT').length,
      discussed: decisions.filter(d => d.decision?.action === 'DISCUSS' || d.action === 'DISCUSS').length,
      deferred: decisions.filter(d => d.decision?.action === 'DEFER' || d.action === 'DEFER').length,
      escalated: decisions.filter(d => d.decision?.action === 'ESCALATE' || d.action === 'ESCALATE').length
    };
    
    const timeSaved = Math.round(stats.total * 2.5); // ~2.5 min per comment
    
    let summary = `## 🎵 pr-vibe Review Summary\n\n`;
    summary += `I've reviewed and handled **${stats.total} bot comments** on this PR:\n\n`;
    
    if (stats.autoFixed > 0) {
      summary += `- 🔧 **Auto-fixed**: ${stats.autoFixed} issues\n`;
    }
    if (stats.rejected > 0) {
      summary += `- ✅ **Validated**: ${stats.rejected} patterns (explained why they're correct)\n`;
    }
    if (stats.discussed > 0) {
      summary += `- 💬 **Needs Discussion**: ${stats.discussed}\n`;
    }
    if (stats.deferred > 0) {
      summary += `- 📝 **Deferred**: ${stats.deferred} items to backlog\n`;
    }
    if (stats.escalated > 0) {
      summary += `- 🚨 **Escalated**: ${stats.escalated} complex issues\n`;
    }
    
    summary += `\n⏱️ **Time saved**: ~${timeSaved} minutes\n`;
    summary += `🧠 **Patterns learned**: ${stats.rejected} (will handle automatically next time)\n`;
    
    if (this.resolvedThreads.length > 0) {
      summary += `✅ **Threads resolved**: ${this.resolvedThreads.length}\n`;
    }
    
    if (changes && changes.length > 0) {
      summary += `\n### Files Modified\n`;
      changes.forEach(change => {
        summary += `- \`${change.path}\`: ${change.description}\n`;
      });
    }
    
    if (stats.escalated > 0) {
      summary += `\n### ⚠️ Requires Your Attention\n`;
      summary += `${stats.escalated} complex issues need human review. Check the 🚨 comments above.\n`;
    }
    
    summary += `\n---\n`;
    summary += `*Powered by [pr-vibe](https://github.com/stroupaloop/pr-vibe) - Built by AI, for AI collaboration* 🎵`;
    
    return summary;
  }
  
  /**
   * Update a previous comment
   */
  async updateComment(commentId, newBody) {
    try {
      execSync(
        `gh api -X PATCH repos/${this.provider.repo}/issues/comments/${commentId} -f body="${newBody}"`,
        { stdio: 'pipe' }
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Add pr-vibe signature to replies
   */
  addPrVibeSignature(text, action) {
    const actionEmojis = {
      AUTO_FIX: '🔧',
      REJECT: '✅',
      DEFER: '📝',
      ESCALATE: '🚨',
      DISCUSS: '💬'
    };
    
    const emoji = actionEmojis[action] || '🎵';
    const signature = `\n\n---\n${emoji} **Handled by [pr-vibe](https://github.com/stroupaloop/pr-vibe)** • Action: \`${action || 'REVIEWED'}\``;
    
    return text + signature;
  }
  
  /**
   * Resolve a GitHub review thread
   */
  async resolveThread(prId, comment) {
    try {
      // First, try to get the review thread ID
      const threadInfo = execSync(
        `gh api repos/${this.provider.repo}/pulls/${prId}/comments --jq '.[] | select(.id == ${comment.id}) | {thread_id: .pull_request_review_id, url: .url}'`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim();
      
      if (threadInfo) {
        // Mark the thread as resolved using GraphQL
        const mutation = `
          mutation {
            resolveReviewThread(input: {threadId: "${comment.id}"}) {
              thread {
                isResolved
              }
            }
          }
        `;
        
        execSync(
          `gh api graphql -f query='${mutation.replace(/'/g, "'")}' --silent`,
          { stdio: 'pipe' }
        );
        
        this.resolvedThreads.push(comment.id);
        console.log(chalk.green(`     ✅ Marked thread as resolved`));
      }
    } catch (error) {
      // Resolution might not be available for all comment types
      console.log(chalk.gray(`     ℹ️ Could not mark as resolved (${error.message}))`));
    }
  }
}

export function createCommentPoster(provider) {
  return new CommentPoster(provider);
}