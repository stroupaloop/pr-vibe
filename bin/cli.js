#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import updateNotifier from 'update-notifier';
import { analyzeGitHubPR } from '../lib/github.js';
import { analyzeComment, PRIORITY_LEVELS } from '../lib/decision-engine.js';
import { createLLMService } from '../lib/llm-integration.js';
import { createFileModifier } from '../lib/file-modifier.js';
import { createCommentPoster } from '../lib/comment-poster.js';
import { GitHubProvider } from '../lib/providers/github-provider.js';
import { displayThread } from '../lib/ui.js';
import { patternManager } from '../lib/pattern-manager.js';
import { runDemo } from '../lib/demo.js';
import { createReportBuilder } from '../lib/report-builder.js';
import { createReportStorage } from '../lib/report-storage.js';
import { ConversationManager } from '../lib/conversation-manager.js';
import { botDetector } from '../lib/bot-detector.js';

/**
 * Analyze human comment to determine if it contains actionable feedback
 */
function analyzeHumanComment(comment) {
  const body = comment.body || '';
  const lowerBody = body.toLowerCase();

  // Patterns that indicate actionable feedback
  const actionablePatterns = [
    // Direct requests
    { pattern: /\b(please|must|need to|should|have to)\s+(fix|change|update|remove|add)/i, priority: 'high', category: 'request' },
    { pattern: /\b(can you|could you)\s+(fix|change|update)/i, priority: 'medium', category: 'request' },

    // Issues and problems
    { pattern: /\b(issue|problem|bug|error|broken|wrong)/i, priority: 'high', category: 'issue' },
    { pattern: /\b(security|vulnerability|exploit)/i, priority: 'critical', category: 'security' },

    // Code quality concerns
    { pattern: /\b(review|concern|worry|worried|problematic)/i, priority: 'medium', category: 'quality' },
    { pattern: /\b(performance|slow|inefficient)/i, priority: 'medium', category: 'performance' },

    // Blocking feedback
    { pattern: /\b(block|blocking|cannot merge|don't merge|hold)/i, priority: 'critical', category: 'blocking' },
    { pattern: /\b(nack|reject|not approved)/i, priority: 'high', category: 'blocking' },

    // Suggestions with urgency
    { pattern: /\b(recommend|suggest|should consider).*\b(before|prior to|urgent)/i, priority: 'high', category: 'suggestion' }
  ];

  // Patterns that indicate non-actionable comments
  const informationalPatterns = [
    /\b(lgtm|looks good|nice work|great job|well done)/i,
    /\b(thanks|thank you|appreciate)/i,
    /\b(fyi|for your information|just noting)/i,
    /\b(optional|consider|might want|could also)/i
  ];

  let isActionable = false;
  let priority = 'low';
  let category = 'general';
  let confidence = 0.5;

  // Check for actionable patterns
  for (const { pattern, priority: patternPriority, category: patternCategory } of actionablePatterns) {
    if (pattern.test(body)) {
      isActionable = true;
      priority = patternPriority;
      category = patternCategory;
      confidence = 0.8;
      break;
    }
  }

  // Check for informational patterns (override actionable if found)
  for (const pattern of informationalPatterns) {
    if (pattern.test(body)) {
      isActionable = false;
      priority = 'info';
      category = 'informational';
      confidence = 0.9;
      break;
    }
  }

  // Additional context analysis
  const hasQuestionMarks = (body.match(/\?/g) || []).length;
  const hasExclamationMarks = (body.match(/!/g) || []).length;
  const hasCodeBlocks = /```/.test(body);
  const mentionsFiles = /\.(js|ts|py|java|go|rs|cpp|c|h|rb|php)/.test(body);

  // Boost confidence if comment has technical context
  if (hasCodeBlocks || mentionsFiles) {
    confidence = Math.min(confidence + 0.1, 0.95);
  }

  // Questions often indicate actionable items
  if (hasQuestionMarks > 0 && !isActionable) {
    isActionable = true;
    priority = 'medium';
    category = 'clarification';
    confidence = 0.7;
  }

  // Exclamation marks often indicate urgency
  if (hasExclamationMarks > 1 && isActionable) {
    if (priority === 'medium') priority = 'high';
    if (priority === 'low') priority = 'medium';
  }

  return {
    isActionable,
    priority,
    category,
    confidence,
    analysis: {
      hasQuestionMarks,
      hasExclamationMarks,
      hasCodeBlocks,
      mentionsFiles,
      wordCount: body.split(/\s+/).length
    }
  };
}

// Check for updates
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const notifier = updateNotifier({ 
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // Check once per day
});

// Show update notification with custom message
if (notifier.update) {
  const { current, latest } = notifier.update;
  console.log(chalk.yellow(`
🎵 pr-vibe ${latest} available! (you have ${current})
✨ What's new: ${getUpdateHighlight(current, latest)}
Run: ${chalk.cyan('npm update -g pr-vibe')}
`));
}

function getUpdateHighlight(current, latest) {
  // Simple version comparison for highlight messages
  const [currMajor, currMinor] = current.split('.').map(Number);
  const [latestMajor, latestMinor] = latest.split('.').map(Number);
  
  if (latestMajor > currMajor) {
    return 'Major update with new features!';
  } else if (latestMinor > currMinor) {
    // Specific highlights for known versions
    if (latest.startsWith('0.4')) {
      return 'Comprehensive reporting and pre-merge safety checks';
    } else     if (latest.startsWith('0.3')) {
      return 'Conversation management and security fixes';
    } else     if (latest.startsWith('0.2')) {
      return 'Human review support with --include-human-reviews flag';
    }
    return 'New features and improvements';
  }
  return 'Bug fixes and improvements';
}

const program = new Command();

program
  .name('pr-vibe')
  .description('AI-powered PR review responder that vibes with bots')
  .version(pkg.version);

// Demo command - no auth required!
program
  .command('demo')
  .description('See pr-vibe in action with sample data (no setup required)')
  .action(async () => {
    await runDemo();
  });

program
  .command('pr <number>')
  .description('Review a pull request')
  .option('-r, --repo <repo>', 'repository (owner/name)')
  .option('--auto-fix', 'automatically apply safe fixes')
  .option('--llm <provider>', 'LLM provider (openai/anthropic/none)', 'none')
  .option('--dry-run', 'preview changes without applying')
  .option('--no-comments', 'skip posting comments to PR')
  .option('--experimental', 'enable experimental features (human review analysis)')
  .option('--debug', 'show detailed debug information')
  .option('--skip-nits', 'skip nitpick/minor comments from bots')
  .option('--nits-only', 'only process nitpick comments')
  .option('--create-issues', 'create GitHub issues for deferred items')
  .option('--show-all', 'show all suggestions including non-critical ones')
  .option('--critical-only', 'only show must-fix issues (security, bugs, breaking changes)')
  .option('--priority-threshold <level>', 'filter by priority: must-fix, suggestion, or nitpick')
  .action(async (prNumber, options) => {
    console.log(chalk.blue('\n🔍 PR Review Assistant - Prototype\n'));
    
    // Display PR URL with hyperlink if terminal supports it
    const repoName = options.repo || 'owner/repo';
    const prUrl = `https://github.com/${repoName}/pull/${prNumber}`;
    const supportsHyperlinks = process.stdout.isTTY && process.env.TERM_PROGRAM !== 'Apple_Terminal';
    
    if (supportsHyperlinks) {
      console.log(`Analyzing PR #${prNumber} on ${repoName}...`);
      console.log(`🔗 \x1b]8;;${prUrl}\x1b\\${prUrl}\x1b]8;;\x1b\\\n`);
    } else {
      console.log(`Analyzing PR #${prNumber} on ${repoName}...`);
      console.log(`🔗 ${prUrl}\n`);
    }
    
    // Validate priority options
    if (options.criticalOnly && options.priorityThreshold) {
      console.log(chalk.red('Error: Cannot use both --critical-only and --priority-threshold'));
      process.exit(1);
    }
    
    if (options.priorityThreshold) {
      const validLevels = Object.values(PRIORITY_LEVELS);
      if (!validLevels.includes(options.priorityThreshold)) {
        console.log(chalk.red(`Error: Invalid priority threshold. Must be one of: ${validLevels.join(', ')}`));
        process.exit(1);
      }
    }
    
    // Determine priority filter
    let priorityFilter = null;
    if (options.criticalOnly) {
      priorityFilter = PRIORITY_LEVELS.MUST_FIX;
    } else if (options.priorityThreshold) {
      priorityFilter = options.priorityThreshold;
    }
    
    const spinner = ora('Initializing services...').start();
    
    try {
      // Initialize services
      const provider = new GitHubProvider({ repo: options.repo });
      const llm = options.llm !== 'none' ? createLLMService(options.llm) : null;
      const fileModifier = createFileModifier(provider, prNumber);
      const commentPoster = createCommentPoster(provider);
      const conversationManager = new ConversationManager(provider);
      const reportBuilder = createReportBuilder().setPRNumber(prNumber);
      const reportStorage = createReportStorage();
      
      // 1. Fetch PR and comments
      spinner.text = 'Fetching PR comments...';
      const { comments, threads, humanComments, humanThreads, debugInfo } = await analyzeGitHubPR(prNumber, options.repo, { 
        debug: options.debug,
        skipNits: options.skipNits,
        nitsOnly: options.nitsOnly
      });
      
      // Update success message based on nit filtering
      let successMsg = `Found ${comments.length} bot comments and ${humanComments.length} human reviews on PR #${prNumber}`;
      if (options.skipNits) {
        successMsg += ' (nits excluded)';
      } else if (options.nitsOnly) {
        successMsg += ' (nits only)';
      }
      spinner.succeed(successMsg);
      
      // Show human reviews if present
      if (humanComments.length > 0) {
        console.log(chalk.bold('\n👥 Human Reviews:'));
        const humanReviewers = [...new Set(humanComments.map(c => c.user.login))];
        console.log(`  Reviewers: ${humanReviewers.join(', ')}`);
        console.log(`  Comments: ${humanComments.length}`);
        
        // TODO: Show human review summary
        console.log(chalk.gray('\n  (Human review analysis coming soon...)'));
      }
      
      if (comments.length === 0) {
        // Positive messaging when no issues found
        console.log(chalk.green('\n✅ All bot reviews passed! No issues found.\n'));
        
        // Show bot review summary
        console.log(chalk.bold('Bot Review Summary:'));
        
        // Analyze bot approvals from debug info
        if (debugInfo && debugInfo.reviewDetails) {
          const botApprovals = [];
          
          for (const review of debugInfo.reviewDetails) {
            if (review.author && review.hasBody) {
              // Try to detect approval from review body
              const approval = botDetector.detectApproval(review.author, review.body || '');
              const summary = botDetector.extractIssueSummary(review.author, review.body || '');
              
              botApprovals.push({
                bot: review.author,
                approved: approval.hasApproval,
                signals: approval.signals,
                summary: summary
              });
            }
          }
          
          // Display bot reviews
          botApprovals.forEach(({ bot, approved, signals, summary }) => {
            const icon = approved ? '✅' : '❌';
            let statusText = `${icon} ${bot}: ${approved ? 'Approved' : 'Reviewed'}`;
            
            if (summary && summary.total > 0) {
              const parts = [];
              if (summary.mustFix > 0) parts.push(`${summary.mustFix} must-fix`);
              if (summary.suggestions > 0) parts.push(`${summary.suggestions} suggestions`);
              if (summary.nitpicks > 0) parts.push(`${summary.nitpicks} nitpicks`);
              statusText += ` (${parts.join(', ')})`;
            } else if (approved && signals.length > 0) {
              statusText += ` - ${signals[0]}`;
            }
            
            console.log(`- ${statusText}`);
          });
          
          // If no bot reviews found
          if (botApprovals.length === 0) {
            console.log(chalk.gray('- No bot reviews detected'));
          }
        }
        
        // Add DeepSource placeholder if not configured
        if (!debugInfo?.reviewDetails?.some(r => r.author?.toLowerCase().includes('deepsource'))) {
          console.log('- DeepSource: ✅ Not configured');
        }
        
        // Show human reviews
        console.log(`- Human reviews: ${humanComments.length} ${humanComments.length > 0 ? 'pending' : 'pending'}`);
        
        // Show CI status
        let ciStatus = null;
        try {
          spinner.start('Checking CI status...');
          ciStatus = await provider.getPRChecks(prNumber);
          spinner.stop();
          
          if (ciStatus && ciStatus.total > 0) {
            let ciText = `\nCI Status: ${ciStatus.passing}/${ciStatus.total} checks passing`;
            if (ciStatus.pending > 0) {
              ciText += ` (${ciStatus.pending} pending)`;
            }
            if (ciStatus.failing > 0) {
              ciText += chalk.red(` (${ciStatus.failing} failing)`);
            }
            console.log(ciText);
          }
        } catch (error) {
          spinner.stop();
          // Silently ignore CI status errors
        }
        
        // Show non-critical suggestions if any
        if (debugInfo && debugInfo.skippedComments) {
          const nitSkips = debugInfo.skippedComments.filter(s => s.isNit);
          if (nitSkips.length > 0) {
            console.log(chalk.gray(`\n💡 ${nitSkips.length} non-critical suggestions available (use --show-all to view)`));
            
            if (options.showAll) {
              console.log(chalk.bold('\nNon-Critical Suggestions:'));
              nitSkips.forEach((skip, idx) => {
                console.log(`${idx + 1}. ${skip.username}: ${skip.body?.substring(0, 100)}...`);
              });
            }
          }
        }
        
        // Only show debug info if --debug flag is used
        if (options.debug && debugInfo) {
          console.log(chalk.yellow('\n📊 Debug: Comment Detection Summary:'));
          console.log(chalk.gray(`  • Issue comments: ${debugInfo.issueComments}`));
          console.log(chalk.gray(`  • Review comments: ${debugInfo.reviewComments}`));
          console.log(chalk.gray(`  • PR reviews: ${debugInfo.prReviews}`));
        }
        
        // Show merge readiness when no issues found
        console.log(chalk.bold('\n📋 Merge Readiness:'));
        const checkMark = chalk.green('✅');
        const crossMark = chalk.red('❌');
        
        console.log(`  ${checkMark} All bot reviews passed`);
        console.log(`  ${checkMark} No critical issues found`);
        
        // Check CI status if available
        if (ciStatus) {
          const ciPassing = ciStatus.failing === 0 && ciStatus.pending === 0;
          const ciText = ciStatus.failing > 0 
            ? `CI checks failing (${ciStatus.failing}/${ciStatus.total})`
            : ciStatus.pending > 0
              ? `CI checks pending (${ciStatus.pending}/${ciStatus.total})`
              : `CI checks passing (${ciStatus.passing}/${ciStatus.total})`;
          console.log(`  ${ciPassing ? checkMark : crossMark} ${ciText}`);
          
          if (ciPassing) {
            console.log(chalk.green.bold('\n  ✅ Ready to merge!'));
          } else {
            console.log(chalk.yellow.bold('\n  ⚠️  Not ready to merge - CI checks must pass'));
          }
        } else {
          console.log(chalk.green.bold('\n  ✅ Ready to merge!'));
        }
        
        return;
      }
      
      // 2. Show bot summary
      console.log(chalk.bold('\n🤖 Bot Review Summary:'));
      const reviewers = [...new Set(comments.map(c => c.user.login))];
      console.log(`  Bot reviewers: ${reviewers.join(', ')}`);
      console.log(`  Bot comments: ${comments.length}`);
      console.log(`  Bot threads: ${Object.keys(threads).length}\n`);
      
      // Track bot comments in report
      comments.forEach(comment => {
        const botName = comment.user?.login || comment.author?.login || 'unknown';
        reportBuilder.addBotComment(botName, comment);
      });
      
      const decisions = [];
      const filteredCounts = {
        [PRIORITY_LEVELS.MUST_FIX]: 0,
        [PRIORITY_LEVELS.SUGGESTION]: 0,
        [PRIORITY_LEVELS.NITPICK]: 0
      };
      const projectContext = {
        projectName: options.repo,
        validPatterns: [
          'console.log in Lambda functions for CloudWatch',
          'any types for complex webhook payloads'
        ]
      };
      
      // 3. Process each thread
      for (const [threadId, threadComments] of Object.entries(threads)) {
        console.log(chalk.gray('─'.repeat(50)));
        
        // Display thread
        displayThread(threadComments);
        
        // Get the main comment (first in thread)
        const mainComment = threadComments[0];
        
        // Analyze with decision engine + LLM
        spinner.start('Analyzing comment...');
        let analysis;
        
        if (llm) {
          try {
            analysis = await llm.analyzeComment(mainComment, projectContext);
          } catch (error) {
            console.warn(chalk.yellow(`LLM failed, using rule-based analysis: ${error.message}`));
            analysis = analyzeComment(mainComment);
          }
        } else {
          analysis = analyzeComment(mainComment);
        }
        spinner.stop();
        
        // Apply priority filtering
        if (priorityFilter) {
          const commentPriority = analysis.priority || PRIORITY_LEVELS.SUGGESTION;
          const priorityOrder = [PRIORITY_LEVELS.MUST_FIX, PRIORITY_LEVELS.SUGGESTION, PRIORITY_LEVELS.NITPICK];
          const filterIndex = priorityOrder.indexOf(priorityFilter);
          const commentIndex = priorityOrder.indexOf(commentPriority);
          
          // Skip if comment priority is lower than filter threshold
          if (commentIndex > filterIndex) {
            console.log(chalk.gray(`\n⏭️  Skipping ${commentPriority} (filtered by --${options.criticalOnly ? 'critical-only' : 'priority-threshold'})`));
            filteredCounts[commentPriority]++;
            continue;
          }
        }
        
        // Show AI analysis
        console.log(chalk.bold('\n🤖 AI Analysis:'));
        console.log(`  Decision: ${chalk.cyan(analysis.action)}`);
        console.log(`  Reason: ${analysis.reason}`);
        console.log(`  Priority: ${chalk.yellow(analysis.priority || PRIORITY_LEVELS.SUGGESTION)}`);
        if (analysis.confidence) {
          console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
        }
        
        if (analysis.suggestedFix) {
          console.log(chalk.bold('\n📝 Suggested Fix:'));
          console.log(chalk.green(analysis.suggestedFix));
        }
        
        // Interactive mode
        let userAction = 'skip';
        if (options.autoFix && analysis.action === 'AUTO_FIX' && analysis.suggestedFix && mainComment.path) {
          // Auto-fix mode - apply fixes automatically
          userAction = 'fix';
        } else if (!options.autoFix) {
          // Manual mode - ask user
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: [
                { name: 'Apply fix', value: 'fix', disabled: !analysis.suggestedFix || !mainComment.path },
                { name: 'Post reply', value: 'reply' },
                { name: 'Skip', value: 'skip' },
                { name: 'Mark for backlog', value: 'backlog' }
              ]
            }
          ]);
          userAction = action;
        }
        
        // Handle user action
        if (userAction === 'fix' && analysis.suggestedFix && mainComment.path) {
          try {
            await fileModifier.applyFix(mainComment, analysis.suggestedFix);
            console.log(chalk.green(`  ✅ Fix queued for ${mainComment.path}`));
          } catch (error) {
            console.error(chalk.red(`  ❌ Failed to queue fix: ${error.message}`));
          }
        } else if (userAction === 'reply' && !options.noComments) {
          const replyText = llm 
            ? await llm.generateReply(mainComment, analysis, projectContext)
            : `${analysis.action}: ${analysis.reason}`;
          
          if (!options.dryRun) {
            await commentPoster.replyToComment(prNumber, mainComment, replyText, {
              reaction: analysis.action,
              action: analysis.action
            });
            console.log(chalk.green('  ✅ Reply posted'));
          } else {
            console.log(chalk.gray(`  Would post: "${replyText}"`));
          }
        } else if (userAction === 'backlog') {
          analysis.action = 'DEFER';
          
          // Create GitHub issue if requested
          if (options.createIssues && !options.dryRun) {
            const botName = mainComment.user?.login || mainComment.author?.login || 'unknown-bot';
            const truncatedBody = mainComment.body.length > 50 
              ? mainComment.body.substring(0, 50) + '...' 
              : mainComment.body;
            
            const issueTitle = `[Bot: ${botName}] ${truncatedBody}`;
            const issueBody = `## Bot Feedback from PR #${prNumber}
            
**Bot:** ${botName}
**PR:** #${prNumber}
**Comment:** ${provider.repo}#${prNumber} (comment)

### Original Comment
${mainComment.body}

${mainComment.path ? `**File:** \`${mainComment.path}\`${mainComment.line ? ` (line ${mainComment.line})` : ''}` : ''}

### Context
This feedback was deferred from PR review for future consideration.

---
*Created by [pr-vibe](https://github.com/stroupaloop/pr-vibe)*`;

            try {
              const issueResult = await provider.createIssue({
                title: issueTitle,
                body: issueBody,
                labels: ['bot-feedback', 'pr-vibe', botName.toLowerCase().replace(/\[bot\]/, '')]
              });
              
              if (issueResult.success) {
                console.log(chalk.green(`  📝 Created issue #${issueResult.number}`));
                // Store issue URL in the decision
                analysis.issueUrl = issueResult.url;
                analysis.issueNumber = issueResult.number;
              } else {
                console.log(chalk.yellow(`  ⚠️  Failed to create issue: ${issueResult.error}`));
              }
            } catch (error) {
              console.log(chalk.yellow(`  ⚠️  Failed to create issue: ${error.message}`));
            }
          }
        }
        
        decisions.push({ comment: mainComment, decision: analysis, userAction });
        
        // Track in report builder
        // Check if this is a non-critical suggestion
        if (!options.showAll && (analysis.priority === 'low' || analysis.category === 'NITPICK' || analysis.category === 'STYLE')) {
          // Track as non-critical but don't process further
          reportBuilder.addNonCriticalSuggestion(mainComment, analysis);
        } else {
          reportBuilder.addDecision(mainComment, analysis, userAction);
        }
        
        console.log(chalk.dim(`  → Action: ${userAction}\n`));
      }
      
      // 4. Process human reviews
      if (humanComments.length > 0) {
        console.log(chalk.bold('\n👥 Human Reviews\n'));
        console.log(chalk.gray('─'.repeat(50)));

        for (const [threadId, threadComments] of Object.entries(humanThreads)) {
          const mainComment = threadComments[0];
          const author = mainComment.user?.login || 'Unknown';

          console.log(chalk.bold(`\n👤 ${author}:`));
          console.log(chalk.white(mainComment.body));

          if (mainComment.path) {
            console.log(chalk.dim(`  📄 ${mainComment.path}${mainComment.line ? `:${mainComment.line}` : ''}`));
          }

          // Analyze human feedback for actionable items
          const humanAnalysis = analyzeHumanComment(mainComment);

          if (humanAnalysis.isActionable) {
            console.log(chalk.yellow(`\n🎯 Actionable feedback detected (${humanAnalysis.priority} priority)`));

            if (humanAnalysis.category) {
              console.log(chalk.dim(`   Category: ${humanAnalysis.category}`));
            }

            // Ask what to do with human feedback
            const { humanAction } = await inquirer.prompt([
              {
                type: 'list',
                name: 'humanAction',
                message: 'How would you like to handle this feedback?',
                choices: [
                  { name: '✅ Mark as addressed', value: 'addressed' },
                  { name: '📝 Track for follow-up', value: 'track' },
                  { name: '🎓 Learn pattern for future', value: 'learn' },
                  { name: '⏭️ Skip for now', value: 'skip' }
                ]
              }
            ]);

            if (humanAction === 'learn') {
              // Learn from this human review
              const learningResult = await patternManager.learnFromHumanReview(
                mainComment,
                'human_feedback',
                { pr: prNumber, repo: options.repo }
              );

              console.log(chalk.green(`  ✅ Pattern learned from ${learningResult.reviewer}!`));
              console.log(chalk.dim(`     Confidence: ${(learningResult.confidence * 100).toFixed(0)}%`));
              console.log(chalk.dim(`     Patterns updated: ${learningResult.patternsUpdated}`));
            } else if (humanAction === 'addressed') {
              console.log(chalk.green('  ✅ Marked as addressed'));
              reportBuilder.addHumanReview(mainComment, 'addressed', humanAnalysis);
            } else if (humanAction === 'track') {
              console.log(chalk.blue('  📝 Tracking for follow-up'));
              reportBuilder.addHumanReview(mainComment, 'tracked', humanAnalysis);
            }
          } else {
            console.log(chalk.dim('\n💬 Informational comment - no action required'));
            reportBuilder.addHumanReview(mainComment, 'acknowledged', humanAnalysis);
          }
        }

        console.log(chalk.gray('\n─'.repeat(50)));
      }
      
      // 5. Apply all fixes
      const fixesToApply = decisions.filter(d => d.userAction === 'fix');
      if (fixesToApply.length > 0) {
        if (!options.dryRun) {
          const applySpinner = ora('Applying fixes and creating commit...').start();
          const result = await fileModifier.createCommit(
            `Apply PR review fixes\n\nAddressed ${fixesToApply.length} review comments.`
          );
          
          if (result.success) {
            applySpinner.succeed(`Applied ${fixesToApply.length} fixes to branch ${result.branch}`);
          } else {
            applySpinner.fail(`Failed to apply fixes: ${result.error}`);
          }
        } else {
          console.log(chalk.bold('\n🔍 Dry Run - Changes that would be applied:'));
          const summary = fileModifier.getChangesSummary();
          summary.forEach(change => {
            console.log(chalk.gray(`  - ${change.path}: ${change.description}`));
          });
        }
      }
      
      // 5. Post summary comment
      if (!options.noComments && !options.dryRun) {
        const summarySpinner = ora('Posting summary...').start();
        try {
          await commentPoster.postSummary(prNumber, decisions, fileModifier.getChangesSummary());
          summarySpinner.succeed('Summary posted to PR');
        } catch (error) {
          summarySpinner.fail(`Failed to post summary: ${error.message}`);
        }
      }
      
      // 6. Final summary
      console.log(chalk.green('\n✅ Review complete!\n'));
      const stats = {
        total: decisions.length,
        fixed: decisions.filter(d => d.userAction === 'fix').length,
        replied: decisions.filter(d => d.userAction === 'reply').length,
        skipped: decisions.filter(d => d.userAction === 'skip').length,
        backlogged: decisions.filter(d => d.userAction === 'backlog').length
      };
      
      console.log(chalk.bold('📈 Final Statistics:'));
      console.log(`  Total comments processed: ${stats.total}`);
      console.log(`  Fixes applied: ${stats.fixed}`);
      console.log(`  Replies posted: ${stats.replied}`);
      console.log(`  Skipped: ${stats.skipped}`);
      console.log(`  Added to backlog: ${stats.backlogged}`);
      
      // Show priority breakdown
      const byPriority = reportBuilder.report.summary.byPriority || {};
      if (byPriority['must-fix'] > 0 || byPriority.suggestion > 0 || byPriority.nitpick > 0) {
        console.log(`\n  By Priority:`);
        if (byPriority['must-fix'] > 0) console.log(`    Must Fix: ${byPriority['must-fix']}`);
        if (byPriority.suggestion > 0) console.log(`    Suggestions: ${byPriority.suggestion}`);
        if (byPriority.nitpick > 0) console.log(`    Nitpicks: ${byPriority.nitpick}`);
      }
      
      // Show filtered counts if priority filtering is active
      if (priorityFilter) {
        const totalFiltered = Object.values(filteredCounts).reduce((sum, count) => sum + count, 0);
        if (totalFiltered > 0) {
          console.log(chalk.yellow('\n  📋 Filtered by priority:'));
          if (filteredCounts[PRIORITY_LEVELS.MUST_FIX] > 0) {
            console.log(`    Must Fix: ${filteredCounts[PRIORITY_LEVELS.MUST_FIX]} (hidden)`);
          }
          if (filteredCounts[PRIORITY_LEVELS.SUGGESTION] > 0) {
            console.log(`    Suggestions: ${filteredCounts[PRIORITY_LEVELS.SUGGESTION]} (hidden)`);
          }
          if (filteredCounts[PRIORITY_LEVELS.NITPICK] > 0) {
            console.log(`    Nitpicks: ${filteredCounts[PRIORITY_LEVELS.NITPICK]} (hidden)`);
          }
        }
      }
      
      const nonCriticalCount = (reportBuilder.report.detailedActions.nonCritical || []).length;
      if (options.showAll && nonCriticalCount > 0) {
        console.log(`\n  ${chalk.yellow(`ℹ️  Showing ${nonCriticalCount} non-critical suggestions`)}`);
      } else if (!options.showAll && nonCriticalCount > 0) {
        console.log(`\n  ${chalk.gray(`(${nonCriticalCount} non-critical suggestions hidden - use --show-all to view)`)}`);
      }
      
      // Generate and save report
      reportBuilder.addConversationSummary(conversationManager);
      reportBuilder.finalize(fileModifier.getChangesSummary());
      
      const reportFiles = reportStorage.saveReport(prNumber, reportBuilder);
      console.log(chalk.green(`\n📊 Report saved to ${reportFiles.markdown}`));
      
      // Show preview of report
      console.log(chalk.gray('\nReport preview:'));
      const reportPreview = reportBuilder.toMarkdown().split('\n').slice(0, 15).join('\n');
      console.log(chalk.gray(reportPreview));
      console.log(chalk.gray('...\n'));
      console.log(chalk.cyan(`View full report: pr-vibe report ${prNumber}`));
      
      // Show merge readiness summary
      console.log(chalk.bold('\n📋 Merge Readiness:'));
      
      // Check bot approvals
      const botApprovals = reportBuilder.report.summary.botApprovals || {};
      const allBotsApproved = Object.values(botApprovals).every(approval => approval.approved);
      const botCount = Object.keys(botApprovals).length;
      
      // Check critical issues
      const hasCriticalIssues = reportBuilder.report.summary.actions.escalated > 0 || 
                                reportBuilder.report.summary.actions.fixed > 0;
      
      // Get CI status if available
      let ciStatus = null;
      let ciPassing = false;
      try {
        ciStatus = await provider.getPRChecks(prNumber);
        ciPassing = ciStatus && ciStatus.total > 0 && 
                    ciStatus.failing === 0 && 
                    ciStatus.pending === 0;
      } catch (error) {
        // Silently ignore CI status errors
      }
      
      // Display checklist
      const checkMark = chalk.green('✅');
      const crossMark = chalk.red('❌');
      
      console.log(`  ${allBotsApproved || botCount === 0 ? checkMark : crossMark} All bot reviews passed`);
      console.log(`  ${!hasCriticalIssues ? checkMark : crossMark} No critical issues found`);
      
      if (ciStatus) {
        const ciText = ciStatus.failing > 0 
          ? `CI checks failing (${ciStatus.failing}/${ciStatus.total})`
          : ciStatus.pending > 0
          ? `CI checks pending (${ciStatus.pending}/${ciStatus.total})`
          : `CI checks passing (${ciStatus.passing}/${ciStatus.total})`;
        console.log(`  ${ciPassing ? checkMark : crossMark} ${ciText}`);
      }
      
      // Overall readiness
      const isReadyToMerge = (allBotsApproved || botCount === 0) && 
                             !hasCriticalIssues && 
                             (ciPassing || !ciStatus);
      
      if (isReadyToMerge) {
        console.log(chalk.green.bold('\n  ✅ Ready to merge!'));
      } else {
        console.log(chalk.yellow.bold('\n  ⚠️  Not ready to merge - address the issues above'));
      }
      
    } catch (error) {
      spinner.fail('Error during review');
      console.error(chalk.red(error.message));
      console.error(chalk.gray(error.stack));
      process.exit(1);
    }
  });

program
  .command('watch <number>')
  .description('Watch a PR for bot comments and auto-process when they appear')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('--timeout <minutes>', 'max time to wait (default: 10)', '10')
  .option('--auto-fix', 'automatically apply safe fixes')
  .option('--llm <provider>', 'LLM provider (openai/anthropic/none)', 'none')
  .option('--auto-process', 'automatically process when all expected bots have responded')
  .action(async (prNumber, options) => {
    console.log(chalk.blue('\n👀 PR Watch Mode - Smart bot detection enabled\n'));
    
    const timeout = parseInt(options.timeout) * 60 * 1000; // Convert to ms
    const startTime = Date.now();
    
    // Expected bots and their typical response times
    const expectedBots = {
      'coderabbit[bot]': { avgTime: 90, maxTime: 180 },
      'deepsource[bot]': { avgTime: 60, maxTime: 120 },
      'sonarcloud[bot]': { avgTime: 120, maxTime: 240 },
      'snyk[bot]': { avgTime: 60, maxTime: 120 },
      'claude[bot]': { avgTime: 45, maxTime: 90 }
    };
    
    // Adaptive polling intervals
    const getPollingInterval = (elapsedSeconds) => {
      if (elapsedSeconds < 30) return 5000;    // First 30s: check every 5s
      if (elapsedSeconds < 120) return 10000;  // Next 90s: check every 10s  
      if (elapsedSeconds < 300) return 20000;  // Next 3min: check every 20s
      return 30000;                             // After 5min: check every 30s
    };
    
    const foundBots = new Set();
    const processedComments = new Set();
    const botCompletionSignals = new Map(); // Track completion signals
    const detectedBots = new Set(); // Track which bots we've seen on this PR
    
    // First, check what bots have already commented
    const initialCheck = await analyzeGitHubPR(prNumber, options.repo, { skipNits: false });
    initialCheck.comments.forEach(comment => {
      const bot = comment.user?.login || comment.author?.login || 'unknown';
      if (bot && expectedBots[bot]) {
        detectedBots.add(bot);
      }
    });
    
    const spinner = ora('Checking for bot activity...').start();
    
    // Show expected bots
    const activeBots = Array.from(detectedBots);
    if (activeBots.length > 0) {
      spinner.text = `Detected active bots: ${activeBots.join(', ')}. Waiting for completion...`;
    }
    
    while (Date.now() - startTime < timeout) {
      const elapsed = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      
      // Update spinner with smart status
      const waitingFor = [];
      detectedBots.forEach(bot => {
        if (!botCompletionSignals.has(bot)) {
          const botInfo = expectedBots[bot];
          if (botInfo && elapsedSeconds < botInfo.avgTime) {
            waitingFor.push(`${bot} (usually ~${botInfo.avgTime}s)`);
          } else if (botInfo && elapsedSeconds < botInfo.maxTime) {
            waitingFor.push(`${bot} (should finish soon)`);
          } else {
            waitingFor.push(`${bot} (taking longer than usual)`);
          }
        }
      });
      
      if (waitingFor.length > 0) {
        spinner.text = `⏳ Waiting for: ${waitingFor.join(', ')}`;
      }
      
      // Determine current interval
      const currentInterval = getPollingInterval(elapsedSeconds);
      
      try {
        // Fetch PR data with debug flag
        const { botComments } = await analyzeGitHubPR(prNumber, options.repo, { debug: false });
        
        // Track new bots and detect completion signals
        botComments.forEach(comment => {
          const bot = comment.user?.login || comment.author?.login || 'unknown';
          const body = comment.body || '';
          
          if (!foundBots.has(bot)) {
            foundBots.add(bot);
            spinner.succeed(`${bot} posted ${comment.type === 'pr_review' ? 'review' : 'comment'}`);
            
            // Add to detected bots if it's an expected bot
            if (expectedBots[bot]) {
              detectedBots.add(bot);
            }
            
            spinner.start('Analyzing bot responses...');
          }
          
          // Detect completion signals
          if (!botCompletionSignals.has(bot)) {
            const completionPatterns = [
              /review\s+complete/i,
              /analysis\s+(complete|finished)/i,
              /actionable\s+comments\s+posted:\s*\d+/i,
              /found\s+\d+\s+issues?/i,
              /all\s+checks\s+pass/i,
              /no\s+issues?\s+found/i,
              /approved/i,
              /lgtm/i
            ];
            
            const hasCompletionSignal = completionPatterns.some(pattern => pattern.test(body));
            if (hasCompletionSignal) {
              botCompletionSignals.set(bot, true);
              spinner.succeed(`${bot} review complete!`);
              spinner.start('Checking other bots...');
            }
          }
        });
        
        // Check for new comments since last check
        const newComments = botComments.filter(c => {
          const id = c.id || `${c.user?.login}-${c.created_at}`;
          return !processedComments.has(id);
        });
        
        // Check if all detected bots have completed
        const allBotsComplete = detectedBots.size > 0 && 
          Array.from(detectedBots).every(bot => botCompletionSignals.has(bot));
        
        if (newComments.length > 0) {
          spinner.stop();
          console.log(chalk.green(`\n✓ Found ${newComments.length} new bot comments from ${foundBots.size} bots\n`));
          
          // Show what we found
          const botSummary = {};
          newComments.forEach(comment => {
            const bot = comment.user?.login || comment.author?.login || 'unknown';
            const type = comment.type || 'comment';
            if (!botSummary[bot]) botSummary[bot] = { reviews: 0, comments: 0 };
            if (type === 'pr_review') {
              botSummary[bot].reviews++;
            } else {
              botSummary[bot].comments++;
            }
          });
          
          console.log(chalk.bold('📊 Bot Activity Summary:'));
          Object.entries(botSummary).forEach(([bot, stats]) => {
            const parts = [];
            if (stats.reviews > 0) parts.push(`${stats.reviews} review${stats.reviews > 1 ? 's' : ''}`);
            if (stats.comments > 0) parts.push(`${stats.comments} comment${stats.comments > 1 ? 's' : ''}`);
            console.log(`  • ${bot}: ${parts.join(', ')}`);
          });
          
          // Show completion status
          if (detectedBots.size > 0) {
            console.log(chalk.bold('\n🎯 Bot Completion Status:'));
            detectedBots.forEach(bot => {
              const isComplete = botCompletionSignals.has(bot);
              console.log(`  ${isComplete ? '✅' : '⏳'} ${bot}: ${isComplete ? 'Complete' : 'In progress'}`);
            });
          }
          
          // Auto-process if enabled and all bots complete
          if (options.autoProcess && allBotsComplete) {
            console.log(chalk.green.bold('\n✅ All expected bots have completed their reviews!'));
            console.log(chalk.blue('\n🎵 Auto-processing bot comments...\n'));
            
            // Run the normal pr command
            const args = ['node', 'pr-vibe', 'pr', prNumber, '-r', options.repo];
            if (options.autoFix) args.push('--auto-fix');
            if (options.llm !== 'none') args.push('--llm', options.llm);
            
            await program.parseAsync(args, { from: 'user' });
            
            return;
          }
          
          // Ask user if they want to process now or wait for more
          const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: '\nWhat would you like to do?',
            choices: [
              { name: 'Process these comments now', value: 'process' },
              { name: 'Wait for more bots (continue watching)', value: 'wait' },
              { name: 'Exit watch mode', value: 'exit' }
            ]
          }]);
          
          if (action === 'process') {
            console.log(chalk.blue('\n🎵 Processing bot comments...\n'));
            
            // Run the normal pr command
            await program.parseAsync(['node', 'pr-vibe', 'pr', prNumber, 
              '-r', options.repo,
              ...(options.autoFix ? ['--auto-fix'] : []),
              ...(options.llm !== 'none' ? ['--llm', options.llm] : [])
            ], { from: 'user' });
            
            break;
          } else if (action === 'exit') {
            console.log(chalk.gray('\nExiting watch mode...'));
            break;
          } else {
            // Mark these as processed so we don't alert again
            newComments.forEach(c => {
              const id = c.id || `${c.user?.login}-${c.created_at}`;
              processedComments.add(id);
            });
            spinner.start('Continuing to watch for more bots...');
          }
        }
        
        // Check for completion without new comments (in case we missed the initial check)
        if (allBotsComplete && !newComments.length && options.autoProcess) {
          spinner.stop();
          console.log(chalk.green.bold('\n✅ All expected bots have completed their reviews!'));
          console.log(chalk.blue('\n🎵 Auto-processing bot comments...\n'));
          
          const args = ['node', 'pr-vibe', 'pr', prNumber, '-r', options.repo];
          if (options.autoFix) args.push('--auto-fix');
          if (options.llm !== 'none') args.push('--llm', options.llm);
          
          await program.parseAsync(args, { from: 'user' });
          
          return;
        }
        
        // Update spinner with elapsed time and status
        const elapsedMin = Math.floor(elapsed / 60000);
        const elapsedSec = Math.floor((elapsed % 60000) / 1000);
        const timeStr = `${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}`;
        
        if (waitingFor.length === 0 && detectedBots.size > 0) {
          spinner.text = `All detected bots have responded! (${timeStr} elapsed)`;
        } else if (waitingFor.length > 0) {
          // Already set above with bot-specific info
        } else {
          spinner.text = `Waiting for bot reviews... (${timeStr} elapsed, checking every ${currentInterval/1000}s)`;
        }
        
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
        console.error(chalk.red('Failed to check PR. Retrying...'));
        spinner.start('Retrying...');
      }
      
      // Wait for next check
      await new Promise(resolve => setTimeout(resolve, currentInterval));
    }
    
    if (Date.now() - startTime >= timeout) {
      spinner.fail(`Timeout reached (${options.timeout} minutes)`);
      console.log(chalk.yellow('\n⏰ Watch timeout reached.'));
      console.log(chalk.gray(`Found ${foundBots.size} bots during watch period.`));
      
      if (foundBots.size > 0) {
        console.log(chalk.cyan(`\nRun 'pr-vibe pr ${prNumber}' to process the comments.`));
      }
    }
  });

program
  .command('test')
  .description('Run decision engine tests')
  .action(() => {
    import('./test-runner.js');
  });

program
  .command('export <prNumber>')
  .description('Export PR data for external analysis (Claude Code mode)')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('-o, --output <file>', 'output file', 'pr-review.json')
  .action(async (prNumber, options) => {
    const spinner = ora('Exporting PR data...').start();
    
    try {
      const { pr, comments, threads } = await analyzeGitHubPR(prNumber, options.repo);
      
      // Analyze each comment with pattern learning
      const analyzedComments = comments.map(comment => {
        // First check patterns
        const patternMatch = patternManager.findPattern(comment, { 
          path: comment.path,
          repo: options.repo 
        });
        
        let analysis;
        if (patternMatch && patternMatch.confidence > 0.85) {
          // Use pattern-based decision
          analysis = {
            action: patternMatch.action,
            reason: patternMatch.pattern.reason || patternMatch.pattern.description,
            confidence: patternMatch.confidence,
            source: patternMatch.source,
            suggestedReply: patternMatch.reply
          };
        } else {
          // Fall back to rule-based analysis
          analysis = analyzeComment(comment);
          analysis.source = 'rules';
        }
        
        return {
          id: comment.id,
          author: comment.user?.login || comment.author?.login,
          body: comment.body,
          path: comment.path,
          line: comment.line,
          created_at: comment.created_at || comment.createdAt,
          analysis: analysis,
          thread: Object.entries(threads).find(([id, thread]) => 
            thread.some(c => c.id === comment.id)
          )?.[0]
        };
      });
      
      const exportData = {
        pr: {
          number: prNumber,
          title: pr.title,
          author: pr.author?.login,
          state: pr.state
        },
        comments: analyzedComments,
        stats: {
          total: comments.length,
          byAuthor: analyzedComments.reduce((acc, c) => {
            acc[c.author] = (acc[c.author] || 0) + 1;
            return acc;
          }, {}),
          byAction: analyzedComments.reduce((acc, c) => {
            acc[c.analysis.action] = (acc[c.analysis.action] || 0) + 1;
            return acc;
          }, {})
        },
        metadata: {
          exported_at: new Date().toISOString(),
          tool_version: '0.0.1',
          repo: options.repo
        }
      };
      
      writeFileSync(options.output, JSON.stringify(exportData, null, 2));
      spinner.succeed(`Exported ${comments.length} comments to ${options.output}`);
      
      // Also output summary to console for Claude Code
      console.log(chalk.bold('\n📊 Summary for Claude Code:'));
      console.log(`Total comments: ${comments.length}`);
      console.log(`Suggested auto-fixes: ${exportData.stats.byAction.AUTO_FIX || 0}`);
      console.log(`Valid patterns to reject: ${exportData.stats.byAction.REJECT || 0}`);
      console.log(`Needs discussion: ${exportData.stats.byAction.DISCUSS || 0}`);
      
    } catch (error) {
      spinner.fail(`Export failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('apply <prNumber>')
  .description('Apply decisions from Claude Code')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('-d, --decisions <file>', 'decisions file', 'decisions.json')
  .option('--dry-run', 'preview changes without applying')
  .action(async (prNumber, options) => {
    console.log(chalk.blue('\n🤖 Applying Claude Code decisions...\n'));
    
    try {
      // Read decisions file
      const decisions = JSON.parse(readFileSync(options.decisions, 'utf-8'));
      
      // Initialize services
      const provider = new GitHubProvider({ repo: options.repo });
      const fileModifier = createFileModifier(provider, prNumber);
      const commentPoster = createCommentPoster(provider);
      
      // Apply each decision
      for (const decision of decisions) {
        console.log(chalk.gray(`Processing: ${decision.commentId}`));
        
        // Handle different action types
        if (decision.action === 'FIX' && decision.fix) {
          if (!options.dryRun) {
            await fileModifier.applyFix(
              { path: decision.path, line: decision.line, body: decision.fix },
              decision.fix
            );
          }
          console.log(chalk.green(`  ✅ Fix ${options.dryRun ? 'would be' : ''} applied to ${decision.path}`));
        } else if (decision.action === 'REJECT') {
          console.log(chalk.yellow('  ❌ Pattern rejected - valid in this codebase'));
        } else if (decision.action === 'DEFER') {
          console.log(chalk.blue('  📝 Deferred to backlog'));
        } else if (decision.action === 'ESCALATE') {
          console.log(chalk.red('  ⚠️ Escalated for human review'));
        }
        
        if (decision.reply && !options.dryRun) {
          // Post reply
          await commentPoster.replyToComment(prNumber, 
            { id: decision.commentId }, 
            decision.reply,
            { reaction: decision.reaction }
          );
          console.log(chalk.blue('  💬 Reply posted'));
        } else if (decision.reply && options.dryRun) {
          console.log(chalk.gray(`  💬 Would post reply: "${decision.reply.substring(0, 50)}..."`));
        }
        
        // Record pattern learning
        if (decision.learned) {
          console.log(chalk.magenta(`  🧠 Pattern learned: ${decision.pattern || 'new pattern'}`));
        }
      }
      
      // Commit changes if any
      if (fileModifier.changes.length > 0 && !options.dryRun) {
        const result = await fileModifier.createCommit(
          'Apply Claude Code review decisions'
        );
        console.log(chalk.green(`\n✅ Committed ${fileModifier.changes.length} changes`));
      }
      
    } catch (error) {
      console.error(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('init-patterns')
  .description('Initialize patterns file for this repository')
  .action(() => {
    const template = `# PR Bot Response Patterns
version: 1.0
project: ${process.cwd().split('/').pop()}
created_at: ${new Date().toISOString()}

# Valid patterns to reject with explanation
valid_patterns:
  - id: console-log-lambda
    pattern: "console.log"
    condition:
      files: ["**/lambda/**", "**/*-handler.js"]
    reason: "We use console.log for CloudWatch logging"
    confidence: 1.0
    auto_reply: |
      Thanks for the feedback. We use console.log for CloudWatch 
      logging in our Lambda functions.

# Auto-fix rules
auto_fixes:
  - id: api-key-to-env
    trigger: "hardcoded.+(api|key|token)"
    severity: CRITICAL
    fix_template: |
      const {{CONST_NAME}} = process.env.{{ENV_NAME}};

# When to escalate
escalation_rules:
  - id: architecture
    pattern: "refactor|architecture"
    notify: ["@stroupaloop"]
`;

    try {
      const dir = join(process.cwd(), '.pr-bot');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'patterns.yml'), template);
      
      console.log(chalk.green('✅ Created .pr-bot/patterns.yml'));
      console.log(chalk.gray('Edit this file to add your project-specific patterns.'));
    } catch (error) {
      console.error(chalk.red(`Failed: ${error.message}`));
    }
  });

program
  .command('changelog')
  .description('Show recent changes and updates')
  .option('--full', 'show full changelog')
  .action(async (options) => {
    console.log(chalk.bold('\n🎵 pr-vibe Changelog\n'));
    
    if (options.full) {
      // Show full changelog
      try {
        const changelogPath = join(__dirname, '../CHANGELOG.md');
        const changelog = readFileSync(changelogPath, 'utf-8');
        console.log(changelog);
      } catch (error) {
        console.log(chalk.yellow('Full changelog not available in this version.'));
      }
    } else {
      // Show recent highlights
                  console.log(chalk.cyan('## Version 0.14.0 (Current)'));
      console.log('  ✨ New features and improvements');
      console.log('  🐛 Bug fixes and enhancements\n');
      
      console.log(chalk.cyan('## Version 0.3.x'));
      console.log('  🤝 Full conversation management with bots');
      console.log('  🔒 Security fix for shell injection vulnerability');
      console.log('  📏 GitHub comment length handling');
      console.log('  🎯 Zero-setup demo experience\n');
      
      console.log(chalk.cyan('## Version 0.2.0'));
      console.log('  ✨ Human review support with --include-human-reviews flag');
      console.log('  🔔 Automatic update notifications');
      console.log('  🐛 Case-insensitive bot detection');
      console.log('  📊 Pattern learning from team feedback\n');
      
console.log(chalk.gray('Run with --full to see complete changelog'));
    }
  });

program
  .command('check <prNumber>')
  .description('Check if PR is ready to merge (all bot comments resolved)')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('-v, --verbose', 'show detailed output')
  .action(async (prNumber, options) => {
    const spinner = ora('Checking PR merge readiness...').start();
    
    try {
      const provider = new GitHubProvider({ repo: options.repo });
      const reportStorage = createReportStorage();
      
      // Check if we have a report for this PR
      const reportStatus = reportStorage.checkPRStatus(prNumber);
      
      // Get current PR comments
      spinner.text = 'Fetching current PR comments...';
      const { pr, comments, threads } = await analyzeGitHubPR(prNumber, options.repo);
      
      // Filter for bot comments
      const botComments = comments.filter(c => 
        c.user?.login?.includes('[bot]') || c.author?.login?.includes('[bot]')
      );
      
      // Group by bot
      const botStats = {};
      botComments.forEach(comment => {
        const botName = comment.user?.login || comment.author?.login || 'unknown';
        if (!botStats[botName]) {
          botStats[botName] = { total: 0, resolved: 0 };
        }
        botStats[botName].total++;
      });
      
      // Check resolved status from report if available
      let resolvedCount = 0;
      let unresolvedComments = [];
      
      if (reportStatus.hasReports && reportStatus.summary) {
        // Use report data
        Object.entries(reportStatus.summary.bots).forEach(([bot, stats]) => {
          if (botStats[bot]) {
            botStats[bot].resolved = stats.processed;
            resolvedCount += stats.processed;
          }
        });
        
        // Find unresolved comments
        unresolvedComments = botComments.filter(comment => {
          const botName = comment.user?.login || comment.author?.login;
          const botData = reportStatus.summary.bots[botName];
          return !botData || botData.processed < botData.total;
        });
      }
      
      spinner.stop();
      
      // Display results
      console.log(chalk.bold('\n🔍 PR #' + prNumber + ' Merge Readiness Check\n'));
      
      console.log(chalk.bold('✅ Bot Comment Status:'));
      let allResolved = true;
      Object.entries(botStats).forEach(([bot, stats]) => {
        const resolved = stats.resolved || 0;
        const icon = resolved === stats.total ? '✓' : '✗';
        const color = resolved === stats.total ? chalk.green : chalk.red;
        console.log(color(`  - ${bot}: ${resolved}/${stats.total} resolved ${icon}`));
        if (resolved < stats.total) allResolved = false;
      });
      console.log(`  - Total: ${resolvedCount}/${botComments.length} (${Math.round(resolvedCount/botComments.length*100)}%)`);
      
      if (reportStatus.hasReports) {
        const timeSince = Date.now() - new Date(reportStatus.lastReport).getTime();
        const minutes = Math.round(timeSince / 60000);
        console.log(chalk.gray(`\n⏰ Last Checked: ${minutes} minutes ago`));
        console.log(chalk.gray(`📝 Last pr-vibe run: ${reportStatus.lastReportId}`));
      }
      
      // Check for new comments since last run
      let hasNewComments = false;
      if (reportStatus.hasReports && reportStatus.lastReport) {
        const newComments = botComments.filter(c => 
          new Date(c.created_at || c.createdAt) > new Date(reportStatus.lastReport)
        );
        if (newComments.length > 0) {
          hasNewComments = true;
          console.log(chalk.yellow('\n⚠️  New Activity:'));
          console.log(chalk.yellow(`  - ${newComments.length} new bot comments since last run`));
        }
      }
      
      // Final status
      console.log('');
      if (allResolved && !hasNewComments) {
        console.log(chalk.green.bold('✅ PR is ready to merge!\n'));
        process.exit(0);
      } else {
        if (unresolvedComments.length > 0 && options.verbose) {
          console.log(chalk.red.bold('❌ Unresolved Comments:\n'));
          unresolvedComments.slice(0, 5).forEach(comment => {
            const bot = comment.user?.login || comment.author?.login;
            console.log(chalk.yellow(`  ${bot}:`));
            console.log(chalk.gray(`    "${comment.body.substring(0, 100)}..."`));
          });
          if (unresolvedComments.length > 5) {
            console.log(chalk.gray(`  ... and ${unresolvedComments.length - 5} more\n`));
          }
        }
        
        console.log(chalk.red.bold('❌ PR is not ready to merge'));
        if (hasNewComments) {
          console.log(chalk.yellow(`Run: pr-vibe pr ${prNumber}`));
        }
        console.log('');
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Error checking PR status');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('status <prNumber>')
  .description('Post or check GitHub status check for PR')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('--post', 'post status check to GitHub')
  .action(async (prNumber, options) => {
    const spinner = ora('Checking PR status...').start();
    
    try {
      const provider = new GitHubProvider({ repo: options.repo });
      const reportStorage = createReportStorage();
      const reportStatus = reportStorage.checkPRStatus(prNumber);
      
      // Get current bot comment status
      const { pr, comments } = await analyzeGitHubPR(prNumber, options.repo);
      const botComments = comments.filter(c => 
        c.user?.login?.includes('[bot]') || c.author?.login?.includes('[bot]')
      );
      
      let status = 'pending';
      let description = 'Checking bot comments...';
      
      if (reportStatus.hasReports && reportStatus.isReadyToMerge) {
        status = 'success';
        description = `All bot comments resolved (${botComments.length}/${botComments.length})`;
      } else if (reportStatus.hasReports) {
        status = 'failure';
        const unresolved = botComments.length - (reportStatus.summary?.actions?.total || 0);
        description = `${unresolved} bot comments need attention`;
      }
      
      spinner.stop();
      
      if (options.post) {
        console.log(chalk.bold('📊 Posting status check to PR #' + prNumber + '...'));
        
        // Get the latest commit SHA
        const commitData = execSync(
          `gh pr view ${prNumber} --repo ${options.repo} --json commits --jq '.commits[-1].oid'`,
          { encoding: 'utf-8' }
        ).trim();
        
        // Post status check
        execSync(
          `gh api repos/${options.repo}/statuses/${commitData} ` +
          `-f state="${status}" ` +
          `-f description="${description}" ` +
          '-f context="pr-vibe"',
          { stdio: 'pipe' }
        );
        
        console.log(chalk.green(`✅ Status posted: "${description}"`));
      } else {
        console.log(chalk.bold('\n📊 PR #' + prNumber + ' Status\n'));
        const statusIcon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
        const statusColor = status === 'success' ? chalk.green : status === 'failure' ? chalk.red : chalk.yellow;
        console.log(statusColor(`${statusIcon} ${description}`));
        
        if (reportStatus.hasReports) {
          console.log(chalk.gray(`\nLast checked: ${new Date(reportStatus.lastReport).toLocaleString()}`));
          console.log(chalk.gray(`Reports available: ${reportStatus.reportCount}`));
        }
        
        console.log(chalk.gray('\nTo post this status to GitHub, run with --post flag'));
      }
      
    } catch (error) {
      spinner.fail('Error checking status');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('report <prNumber>')
  .description('View saved pr-vibe reports for a PR')
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('-l, --list', 'list all available reports')
  .option('-t, --timestamp <timestamp>', 'view specific report by timestamp')
  .option('-j, --json', 'output in JSON format')
  .action(async (prNumber, options) => {
    const reportStorage = createReportStorage();
    
    if (options.list) {
      const reports = reportStorage.listReportsForPR(prNumber);
      
      if (reports.length === 0) {
        console.log(chalk.yellow(`\nNo reports found for PR #${prNumber}\n`));
        return;
      }
      
      console.log(chalk.bold(`\n📊 Reports for PR #${prNumber}:\n`));
      reports.forEach((report, idx) => {
        const isLatest = idx === 0;
        const icon = isLatest ? '⭐' : '📄';
        console.log(`${icon} ${report.timestamp}`);
        console.log(chalk.gray(`   Created: ${report.created.toLocaleString()}`));
        console.log(chalk.gray(`   Size: ${Math.round(report.size / 1024)}KB`));
        if (isLatest) console.log(chalk.green('   (latest)'));
        console.log('');
      });
      
      console.log(chalk.gray('Use --timestamp to view a specific report\n'));
      return;
    }
    
    const report = reportStorage.getReport(prNumber, options.timestamp);
    
    if (!report) {
      console.log(chalk.red(`\nNo report found for PR #${prNumber}${options.timestamp ? ' at ' + options.timestamp : ''}\n`));
      console.log(chalk.gray('Run `pr-vibe pr ' + prNumber + '` to generate a report\n'));
      process.exit(1);
    }
    
    if (options.json) {
      const jsonPath = report.path.replace('.md', '.json');
      try {
        const jsonContent = readFileSync(jsonPath, 'utf-8');
        console.log(jsonContent);
      } catch (error) {
        console.error(chalk.red('JSON report not found'));
        process.exit(1);
      }
    } else {
      console.log(report.content);
      
      if (!options.timestamp) {
        console.log(chalk.gray('\n---'));
        console.log(chalk.gray('This is the latest report. Use --list to see all available reports.'));
      }
    }
  });

program
  .command('cleanup')
  .description('Clean up old pr-vibe reports')
  .option('--reports', 'clean up old reports (default)')
  .option('--all', 'clean up all pr-vibe data')
  .option('--dry-run', 'show what would be deleted without deleting')
  .action(async (options) => {
    const reportStorage = createReportStorage();
    
    console.log(chalk.bold('\n🧹 Running pr-vibe cleanup...\n'));
    
    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN - no files will be deleted\n'));
    }
    
    // For now, just run the report cleanup
    reportStorage.runCleanup();
    
    console.log(chalk.green('\n✅ Cleanup complete!\n'));
  });

program
  .command('update')
  .description('Check for updates')
  .action(() => {
    const update = notifier.update;
    
    if (update) {
      console.log(chalk.yellow(`\n🎵 Update available: ${update.current} → ${update.latest}`));
      console.log(chalk.cyan('\nRun: npm update -g pr-vibe\n'));
    } else {
      console.log(chalk.green('\n✅ You are running the latest version of pr-vibe!\n'));
    }
    
    // Force check for updates
    notifier.notify({ defer: false });
  });

program
  .command('issues <number>')
  .description('Create GitHub issues for deferred items from a saved report')
  .option('-r, --repo <repo>', 'repository (owner/name)')
  .option('--dry-run', 'preview issues without creating them')
  .action(async (prNumber, options) => {
    console.log(chalk.blue('\n📋 Creating Issues from Deferred Items\n'));
    
    const spinner = ora('Loading report...').start();
    
    try {
      // Initialize services
      const provider = new GitHubProvider({ repo: options.repo });
      const reportStorage = createReportStorage();
      
      // Load the latest report
      const report = reportStorage.loadReport(prNumber);
      
      if (!report) {
        spinner.fail('No report found for PR #' + prNumber);
        console.log(chalk.gray('\nRun `pr-vibe pr ' + prNumber + '` first to generate a report.'));
        process.exit(1);
      }
      
      spinner.succeed('Report loaded');
      
      // Find deferred items without issues
      const deferredItems = report.detailedActions?.deferred || [];
      const itemsNeedingIssues = deferredItems.filter(item => !item.issue);
      
      if (itemsNeedingIssues.length === 0) {
        console.log(chalk.green('\n✅ All deferred items already have issues created!\n'));
        
        if (deferredItems.length > 0) {
          console.log(chalk.bold('Existing Issues:'));
          deferredItems.filter(item => item.issue).forEach(item => {
            console.log(`  - [#${item.issue.number}](${item.issue.url}) - ${item.bot}`);
          });
        }
        return;
      }
      
      console.log(chalk.bold(`\nFound ${itemsNeedingIssues.length} deferred items without issues:\n`));
      
      // Show what will be created
      itemsNeedingIssues.forEach((item, idx) => {
        console.log(chalk.cyan(`${idx + 1}. ${item.bot}:`));
        console.log(`   ${item.comment.body.substring(0, 100)}...`);
        if (item.comment.path) {
          console.log(chalk.dim(`   📄 ${item.comment.path}${item.comment.line ? `:${item.comment.line}` : ''}`));
        }
        console.log();
      });
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run - no issues will be created\n'));
        return;
      }
      
      // Confirm creation
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Create ${itemsNeedingIssues.length} GitHub issues?`,
        default: true
      }]);
      
      if (!confirm) {
        console.log(chalk.gray('\nCancelled.'));
        return;
      }
      
      // Create issues
      const createdIssues = [];
      const createSpinner = ora('Creating issues...').start();
      
      for (const item of itemsNeedingIssues) {
        const botName = item.bot;
        const truncatedBody = item.comment.fullBody?.substring(0, 50) || 
                            item.comment.body.substring(0, 50);
        
        const issueTitle = `[Bot: ${botName}] ${truncatedBody}...`;
        const issueBody = `## Bot Feedback from PR #${prNumber}

**Bot:** ${botName}
**PR:** #${prNumber}
**Comment:** ${provider.repo}#${prNumber} (comment)

### Original Comment
${item.comment.fullBody || item.comment.body}

${item.comment.path ? `**File:** \`${item.comment.path}\`${item.comment.line ? ` (line ${item.comment.line})` : ''}` : ''}

### Context
This feedback was deferred from PR review for future consideration.

### Decision Details
- **Action:** ${item.decision.action}
- **Reason:** ${item.decision.reason}
${item.decision.confidence ? `- **Confidence:** ${Math.round(item.decision.confidence * 100)}%` : ''}

---
*Created by [pr-vibe](https://github.com/stroupaloop/pr-vibe)*`;

        try {
          const issueResult = await provider.createIssue({
            title: issueTitle,
            body: issueBody,
            labels: ['bot-feedback', 'pr-vibe', botName.toLowerCase().replace(/\[bot\]/, '')]
          });
          
          if (issueResult.success) {
            createdIssues.push({
              ...issueResult,
              bot: botName
            });
            createSpinner.text = `Created issue #${issueResult.number}`;
          } else {
            createSpinner.warn(`Failed to create issue for ${botName}: ${issueResult.error}`);
          }
        } catch (error) {
          createSpinner.warn(`Failed to create issue for ${botName}: ${error.message}`);
        }
      }
      
      createSpinner.succeed(`Created ${createdIssues.length} issues`);
      
      // Show created issues
      if (createdIssues.length > 0) {
        console.log(chalk.green('\n✅ Issues Created:'));
        createdIssues.forEach(issue => {
          console.log(`  - [#${issue.number}](${issue.url}) - ${issue.bot} feedback`);
        });
        
        console.log(chalk.gray('\nThese issues are now ready for triage and prioritization.'));
      }
      
    } catch (error) {
      spinner.fail('Error creating issues');
      console.error(chalk.red(error.message));
      if (options.debug) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();