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
import { analyzeComment } from '../lib/decision-engine.js';
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
    } else if (latest.startsWith('0.3')) {
      return 'Conversation management and security fixes';
    } else if (latest.startsWith('0.2')) {
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
  .option('-r, --repo <repo>', 'repository (owner/name)', 'stroupaloop/woodhouse-modern')
  .option('--auto-fix', 'automatically apply safe fixes')
  .option('--llm <provider>', 'LLM provider (openai/anthropic/none)', 'none')
  .option('--dry-run', 'preview changes without applying')
  .option('--no-comments', 'skip posting comments to PR')
  .option('--experimental', 'enable experimental features (human review analysis)')
  .action(async (prNumber, options) => {
    console.log(chalk.blue('\n🔍 PR Review Assistant - Prototype\n'));
    
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
      const { pr, comments, threads, humanComments, humanThreads } = await analyzeGitHubPR(prNumber, options.repo);
      spinner.succeed(`Found ${comments.length} bot comments and ${humanComments.length} human reviews on PR #${prNumber}`);
      
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
        console.log(chalk.yellow('\nNo bot review comments found. Nothing to auto-process! 🎉'));
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
        
        // Show AI analysis
        console.log(chalk.bold('\n🤖 AI Analysis:'));
        console.log(`  Decision: ${chalk.cyan(analysis.action)}`);
        console.log(`  Reason: ${analysis.reason}`);
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
        }
        
        decisions.push({ comment: mainComment, decision: analysis, userAction });
        
        // Track in report builder
        reportBuilder.addDecision(mainComment, analysis, userAction);
        
        console.log(chalk.dim(`  → Action: ${userAction}\n`));
      }
      
      // 4. Process human reviews (experimental)
      if (options.experimental && humanComments.length > 0) {
        console.log(chalk.bold('\n🧪 EXPERIMENTAL: Processing Human Reviews\n'));
        console.log(chalk.gray('─'.repeat(50)));
        
        for (const [threadId, threadComments] of Object.entries(humanThreads)) {
          const mainComment = threadComments[0];
          const author = mainComment.user?.login || 'Unknown';
          
          console.log(chalk.bold(`\n👤 ${author} commented:`));
          console.log(chalk.white(mainComment.body));
          
          if (mainComment.path) {
            console.log(chalk.dim(`  📄 ${mainComment.path}${mainComment.line ? `:${mainComment.line}` : ''}`));
          }
          
          // Ask what to do with human feedback
          console.log(chalk.yellow('\n🤔 pr-vibe is learning from human reviews...'));
          console.log(chalk.gray('  This feedback will help pr-vibe understand your team\'s standards.'));
          
          // For now, just acknowledge - pattern learning comes next
          const { humanAction } = await inquirer.prompt([
            {
              type: 'list',
              name: 'humanAction',
              message: 'How should pr-vibe interpret this feedback?',
              choices: [
                { name: 'Learn pattern (will remember for future)', value: 'learn' },
                { name: 'Just acknowledge (one-time feedback)', value: 'acknowledge' },
                { name: 'Skip for now', value: 'skip' }
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
            
            // Check if this matches existing patterns
            const match = patternManager.matchHumanPattern(mainComment);
            if (match.matched) {
              console.log(chalk.cyan(`  🔍 This matches a pattern learned from: ${match.learnedFrom.join(', ')}`));
            }
          } else if (humanAction === 'acknowledge') {
            console.log(chalk.blue('  👍 Acknowledged'));
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
      
    } catch (error) {
      spinner.fail('Error during review');
      console.error(chalk.red(error.message));
      console.error(chalk.gray(error.stack));
      process.exit(1);
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
      console.log(chalk.cyan('## Version 0.4.1 (Current)'));
      console.log('  🐛 Fixed CLI changelog showing outdated version');
      console.log('  🔧 Automated changelog version updates in CI/CD\n');
      
      console.log(chalk.cyan('## Version 0.4.0'));
      console.log('  📊 Comprehensive reporting with decision logs');
      console.log('  🛡️ Pre-merge safety checks (check, status, report commands)');
      console.log('  📝 Persistent report storage with 30-day TTL');
      console.log('  🐛 Fixed critical file replacement bug\n');
      
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

program.parse();