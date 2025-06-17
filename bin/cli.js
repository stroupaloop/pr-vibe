#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import updateNotifier from 'update-notifier';
import { analyzeGitHubPR } from '../lib/github.js';
import { analyzeComment } from '../lib/decision-engine.js';
import { createLLMService } from '../lib/llm-integration.js';
import { createFileModifier } from '../lib/file-modifier.js';
import { createCommentPoster } from '../lib/comment-poster.js';
import { GitHubProvider } from '../lib/providers/github-provider.js';
import { displayThread } from '../lib/ui.js';
import { patternManager } from '../lib/pattern-manager.js';

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
    if (latest.startsWith('0.2')) {
      return 'Human review support with --experimental flag';
    }
    return 'New features and improvements';
  }
  return 'Bug fixes and improvements';
}

const program = new Command();

program
  .name('pr-vibe')
  .description('AI-powered PR review responder that vibes with bots')
  .version('0.1.2');

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
              reaction: analysis.action
            });
            console.log(chalk.green('  ✅ Reply posted'));
          } else {
            console.log(chalk.gray(`  Would post: "${replyText}"`));
          }
        } else if (userAction === 'backlog') {
          analysis.action = 'DEFER';
        }
        
        decisions.push({ comment: mainComment, decision: analysis, userAction });
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
          console.log(chalk.yellow(`  ❌ Pattern rejected - valid in this codebase`));
        } else if (decision.action === 'DEFER') {
          console.log(chalk.blue(`  📝 Deferred to backlog`));
        } else if (decision.action === 'ESCALATE') {
          console.log(chalk.red(`  ⚠️ Escalated for human review`));
        }
        
        if (decision.reply && !options.dryRun) {
          // Post reply
          await commentPoster.replyToComment(prNumber, 
            { id: decision.commentId }, 
            decision.reply,
            { reaction: decision.reaction }
          );
          console.log(chalk.blue(`  💬 Reply posted`));
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
      console.log(chalk.cyan('## Version 0.2.0 (Coming Soon)'));
      console.log('  ✨ Human review support with --experimental flag');
      console.log('  🔔 Automatic update notifications');
      console.log('  🐛 Case-insensitive bot detection');
      console.log('  📊 Pattern learning from team feedback\n');
      
      console.log(chalk.cyan('## Version 0.1.2 (Current)'));
      console.log('  🚀 Initial public release');
      console.log('  🤖 CodeRabbit and DeepSource support');
      console.log('  🧠 Pattern learning system');
      console.log('  ⚡ Auto-fix common issues\n');
      
      console.log(chalk.gray('Run with --full to see complete changelog'));
    }
  });

program
  .command('update')
  .description('Check for updates')
  .action(() => {
    const update = notifier.update;
    
    if (update) {
      console.log(chalk.yellow(`\n🎵 Update available: ${update.current} → ${update.latest}`));
      console.log(chalk.cyan(`\nRun: npm update -g pr-vibe\n`));
    } else {
      console.log(chalk.green('\n✅ You are running the latest version of pr-vibe!\n'));
    }
    
    // Force check for updates
    notifier.notify({ defer: false });
  });

program.parse();