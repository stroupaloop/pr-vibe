/**
 * Enhanced report builder for detailed PR processing summaries
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

export class ReportBuilder {
  constructor() {
    this.report = {
      metadata: {
        generated: new Date().toISOString(),
        version: pkg.version,
        reportId: null,
        ttl: null
      },
      summary: {
        status: 'processing',
        prNumber: null,
        bots: {},
        actions: {
          validated: 0,
          fixed: 0,
          conversations: 0,
          escalated: 0,
          deferred: 0,
          total: 0
        },
        confidence: {
          total: 0,
          count: 0,
          average: 0
        },
        processingTime: null,
        timeSaved: 0
      },
      preMergeChecklist: {
        allCommentsAddressed: false,
        noNewComments: null,
        humanReviewComplete: false,
        automatedFixesVerified: false
      },
      detailedActions: {
        validated: [],
        autoFixed: [],
        conversations: [],
        escalated: [],
        deferred: []
      },
      conversationAnalytics: {
        total: 0,
        averageRounds: 0,
        rateLimitsHit: 0,
        botCorrections: 0,
        totalDuration: 0
      },
      patterns: {
        learned: [],
        applied: []
      }
    };
    this.startTime = Date.now();
  }

  setPRNumber(prNumber) {
    this.report.summary.prNumber = prNumber;
    this.report.metadata.reportId = `pr-${prNumber}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    return this;
  }

  setTTL(days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    this.report.metadata.ttl = expiryDate.toISOString();
    return this;
  }

  addBotComment(botName, comment) {
    if (!this.report.summary.bots[botName]) {
      this.report.summary.bots[botName] = {
        total: 0,
        processed: 0,
        validated: 0,
        fixed: 0,
        conversations: 0
      };
    }
    this.report.summary.bots[botName].total++;
    return this;
  }

  addDecision(comment, decision, userAction, conversationData = null) {
    const botName = comment.user?.login || comment.author?.login || 'unknown';
    const action = decision.action || 'UNKNOWN';
    
    // Update bot stats
    if (this.report.summary.bots[botName]) {
      this.report.summary.bots[botName].processed++;
    }

    // Update action counts
    this.report.summary.actions.total++;
    
    // Add confidence tracking
    if (decision.confidence) {
      this.report.summary.confidence.total += decision.confidence;
      this.report.summary.confidence.count++;
    }

    const detailEntry = {
      bot: botName,
      comment: {
        id: comment.id,
        body: comment.body.substring(0, 200) + (comment.body.length > 200 ? '...' : ''),
        fullBody: comment.body,
        path: comment.path,
        line: comment.line,
        createdAt: comment.created_at || comment.createdAt
      },
      decision: {
        action: action,
        reason: decision.reason,
        confidence: decision.confidence || null,
        source: decision.source || 'rules',
        suggestedFix: decision.suggestedFix,
        suggestedReply: decision.suggestedReply
      },
      userAction: userAction,
      timestamp: new Date().toISOString()
    };

    // Add conversation data if present
    if (conversationData) {
      detailEntry.conversation = {
        rounds: conversationData.rounds.length,
        duration: conversationData.duration,
        resolution: conversationData.resolution,
        rateLimited: conversationData.rateLimited || false
      };
      
      // Update conversation analytics
      this.report.conversationAnalytics.total++;
      this.report.conversationAnalytics.totalDuration += conversationData.duration || 0;
      if (conversationData.rateLimited) {
        this.report.conversationAnalytics.rateLimitsHit++;
      }
      if (conversationData.hadCorrection) {
        this.report.conversationAnalytics.botCorrections++;
      }
    }

    // Categorize the action
    switch (userAction) {
    case 'fix':
      this.report.summary.actions.fixed++;
      this.report.detailedActions.autoFixed.push(detailEntry);
      if (this.report.summary.bots[botName]) {
        this.report.summary.bots[botName].fixed++;
      }
      break;
    case 'reply':
      if (action === 'REJECT') {
        this.report.summary.actions.validated++;
        this.report.detailedActions.validated.push(detailEntry);
        if (this.report.summary.bots[botName]) {
          this.report.summary.bots[botName].validated++;
        }
      } else if (action === 'ESCALATE') {
        this.report.summary.actions.escalated++;
        this.report.detailedActions.escalated.push(detailEntry);
      } else if (conversationData) {
        this.report.summary.actions.conversations++;
        this.report.detailedActions.conversations.push(detailEntry);
        if (this.report.summary.bots[botName]) {
          this.report.summary.bots[botName].conversations++;
        }
      }
      break;
    case 'backlog':
    case 'defer':
      this.report.summary.actions.deferred++;
      this.report.detailedActions.deferred.push(detailEntry);
      break;
    }

    return this;
  }

  addConversationSummary(conversationManager) {
    const summary = conversationManager.getConversationSummary();
    this.report.conversationAnalytics = {
      ...this.report.conversationAnalytics,
      ...summary
    };
    
    if (summary.totalRounds && summary.total) {
      this.report.conversationAnalytics.averageRounds = 
        (summary.totalRounds / summary.total).toFixed(1);
    }
    
    return this;
  }

  addPattern(pattern, type = 'learned') {
    if (type === 'learned') {
      this.report.patterns.learned.push({
        pattern: pattern.pattern || pattern.description,
        confidence: pattern.confidence,
        source: pattern.source || 'user-feedback'
      });
    } else {
      this.report.patterns.applied.push({
        pattern: pattern.pattern || pattern.description,
        matchCount: pattern.matchCount || 1
      });
    }
    return this;
  }

  finalize(changes = []) {
    // Calculate final metrics
    const endTime = Date.now();
    const processingTime = Math.round((endTime - this.startTime) / 1000);
    this.report.summary.processingTime = `${Math.floor(processingTime / 60)}m ${processingTime % 60}s`;
    
    // Calculate time saved (average 2.5 min per comment)
    this.report.summary.timeSaved = Math.round(this.report.summary.actions.total * 2.5);
    
    // Calculate average confidence
    if (this.report.summary.confidence.count > 0) {
      this.report.summary.confidence.average = Math.round(
        (this.report.summary.confidence.total / this.report.summary.confidence.count) * 100
      );
    }
    
    // Update status
    const escalatedCount = this.report.summary.actions.escalated;
    const unprocessedCount = Object.values(this.report.summary.bots)
      .reduce((sum, bot) => sum + (bot.total - bot.processed), 0);
    
    if (unprocessedCount > 0) {
      this.report.summary.status = '⚠️ Incomplete - some comments not processed';
    } else if (escalatedCount > 0) {
      this.report.summary.status = '⚠️ Requires human review';
    } else {
      this.report.summary.status = '✅ Ready to merge (all bot comments resolved)';
    }
    
    // Update checklist
    this.report.preMergeChecklist.allCommentsAddressed = unprocessedCount === 0;
    this.report.preMergeChecklist.humanReviewComplete = escalatedCount === 0;
    this.report.preMergeChecklist.automatedFixesVerified = this.report.summary.actions.fixed > 0;
    
    // Add file changes if provided
    if (changes && changes.length > 0) {
      this.report.fileChanges = changes;
    }
    
    return this;
  }

  toMarkdown() {
    const report = this.report;
    const prNumber = report.summary.prNumber;
    
    let markdown = `## 🎵 pr-vibe Processing Report - PR #${prNumber}\n\n`;
    
    // Metadata section
    markdown += '### Metadata\n';
    markdown += `- **Generated**: ${report.metadata.generated}\n`;
    markdown += `- **pr-vibe Version**: ${report.metadata.version}\n`;
    markdown += `- **Report ID**: ${report.metadata.reportId}\n`;
    if (report.metadata.ttl) {
      const ttlDate = new Date(report.metadata.ttl);
      const daysUntilExpiry = Math.ceil((ttlDate - new Date()) / (1000 * 60 * 60 * 24));
      markdown += `- **TTL**: Expires ${ttlDate.toISOString().split('T')[0]} (${daysUntilExpiry} days)\n`;
    }
    markdown += '\n';
    
    // Summary section
    markdown += '### Summary\n';
    markdown += `- **Status**: ${report.summary.status}\n`;
    
    // Bot breakdown
    const botList = Object.entries(report.summary.bots)
      .map(([name, stats]) => `${name} (${stats.processed}/${stats.total})`)
      .join(', ');
    markdown += `- **Bots**: ${botList}\n`;
    
    // Actions summary
    const actions = report.summary.actions;
    const actionParts = [];
    if (actions.validated > 0) actionParts.push(`${actions.validated} validated`);
    if (actions.fixed > 0) actionParts.push(`${actions.fixed} fixed`);
    if (actions.conversations > 0) actionParts.push(`${actions.conversations} conversations`);
    if (actions.escalated > 0) actionParts.push(`${actions.escalated} escalated`);
    if (actions.deferred > 0) actionParts.push(`${actions.deferred} deferred`);
    
    markdown += `- **Actions**: ${actionParts.join(', ')}\n`;
    markdown += `- **Confidence**: ${report.summary.confidence.average}% average\n`;
    markdown += `- **Processing Time**: ${report.summary.processingTime}\n`;
    markdown += `- **Time Saved**: ~${report.summary.timeSaved} minutes\n\n`;
    
    // Pre-merge checklist
    markdown += '### Pre-Merge Checklist\n';
    markdown += `- [${report.preMergeChecklist.allCommentsAddressed ? 'x' : ' '}] All bot comments addressed (${actions.total}/${actions.total})\n`;
    markdown += `- [${report.preMergeChecklist.noNewComments === false ? ' ' : 'x'}] No new comments since last run\n`;
    markdown += `- [${report.preMergeChecklist.humanReviewComplete ? 'x' : ' '}] Human review of escalated items (${actions.escalated})\n`;
    markdown += `- [${report.preMergeChecklist.automatedFixesVerified ? 'x' : ' '}] All automated fixes verified\n\n`;
    
    // Detailed actions
    if (report.detailedActions.validated.length > 0) {
      markdown += `### ✅ Validated (${report.detailedActions.validated.length})\n`;
      report.detailedActions.validated.forEach((item, idx) => {
        markdown += `${idx + 1}. **${item.bot}** - \`${item.comment.path || 'general'}${item.comment.line ? ':' + item.comment.line : ''}\`\n`;
        markdown += `   \`\`\`\n   ${item.comment.body}\n   \`\`\`\n`;
        markdown += `   - **Decision**: ${item.decision.action} (${Math.round(item.decision.confidence * 100)}% confidence)\n`;
        markdown += `   - **Reason**: ${item.decision.reason}\n`;
        if (item.decision.source === 'pattern') {
          markdown += `   - **Pattern**: ${item.decision.pattern || 'matched pattern'}\n`;
        }
        markdown += '\n';
      });
    }
    
    if (report.detailedActions.autoFixed.length > 0) {
      markdown += `### 🔧 Auto-Fixed (${report.detailedActions.autoFixed.length})\n`;
      report.detailedActions.autoFixed.forEach((item, idx) => {
        markdown += `${idx + 1}. **${item.bot}** - \`${item.comment.path || 'general'}${item.comment.line ? ':' + item.comment.line : ''}\`\n`;
        markdown += `   \`\`\`\n   ${item.comment.body}\n   \`\`\`\n`;
        if (item.decision.suggestedFix) {
          markdown += `   - **Fix Applied**: ${item.decision.suggestedFix.substring(0, 100)}...\n`;
        }
        markdown += `   - **Confidence**: ${Math.round((item.decision.confidence || 0.8) * 100)}%\n\n`;
      });
    }
    
    if (report.detailedActions.conversations.length > 0) {
      markdown += `### 💬 Conversations (${report.detailedActions.conversations.length})\n`;
      report.detailedActions.conversations.forEach((item, idx) => {
        markdown += `${idx + 1}. **${item.bot}** - ${item.conversation.resolution || 'Resolved'}\n`;
        markdown += `   - Initial: "${item.comment.body.substring(0, 100)}..."\n`;
        if (item.conversation.rateLimited) {
          markdown += '   - [Rate limit: waited for retry]\n';
        }
        markdown += `   - **Rounds**: ${item.conversation.rounds}\n`;
        markdown += `   - **Duration**: ${Math.round(item.conversation.duration / 1000)}s\n\n`;
      });
    }
    
    if (report.detailedActions.escalated.length > 0) {
      markdown += `### ⚠️ Requires Human Review (${report.detailedActions.escalated.length})\n`;
      report.detailedActions.escalated.forEach((item, idx) => {
        markdown += `${idx + 1}. **${item.bot}** - \`${item.comment.path || 'general'}${item.comment.line ? ':' + item.comment.line : ''}\`\n`;
        markdown += `   - ${item.comment.body.substring(0, 150)}...\n`;
        markdown += `   - ${item.decision.reason}\n`;
        if (item.decision.confidence) {
          markdown += `   - Confidence too low (${Math.round(item.decision.confidence * 100)}%)\n`;
        }
        markdown += '\n';
      });
    }
    
    // Conversation Analytics
    if (report.conversationAnalytics.total > 0) {
      markdown += '### Conversation Analytics\n';
      markdown += `- **Total Conversations**: ${report.conversationAnalytics.total}\n`;
      markdown += `- **Average Rounds**: ${report.conversationAnalytics.averageRounds}\n`;
      markdown += `- **Rate Limits Hit**: ${report.conversationAnalytics.rateLimitsHit}\n`;
      markdown += `- **Bot Corrections**: ${report.conversationAnalytics.botCorrections}\n\n`;
    }
    
    // Patterns section
    if (report.patterns.learned.length > 0) {
      markdown += '### 🧠 Patterns Learned\n';
      report.patterns.learned.forEach(pattern => {
        markdown += `- "${pattern.pattern}" (confidence: ${Math.round(pattern.confidence * 100)}%)\n`;
      });
      markdown += '\n';
    }
    
    // File changes
    if (report.fileChanges && report.fileChanges.length > 0) {
      markdown += '### 📝 Files Modified\n';
      report.fileChanges.forEach(change => {
        markdown += `- \`${change.path}\`: ${change.description}\n`;
      });
      markdown += '\n';
    }
    
    // Verification section
    markdown += '### Verification Checklist\n';
    markdown += '- [ ] All fixes appropriate for codebase\n';
    markdown += '- [ ] No security issues introduced\n';
    markdown += '- [ ] Patterns learned are correct\n';
    markdown += '- [ ] Escalated items addressed\n\n';
    
    // Next steps
    markdown += '### Next Steps\n';
    markdown += `Run \`pr-vibe check ${prNumber}\` before merging to ensure no new comments\n`;
    
    return markdown;
  }

  toJSON() {
    return JSON.stringify(this.report, null, 2);
  }
}

export function createReportBuilder() {
  return new ReportBuilder();
}