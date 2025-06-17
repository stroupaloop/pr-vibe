#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import { demoPRData, demoPatterns, demoBotResponses, getDemoSummary } from './demo-data.js';

export async function runDemo(options = {}) {
  const { fast = false } = options;
  console.log('\n🎵 ' + chalk.magenta('Welcome to pr-vibe!') + ' Let\'s see how it handles bot comments.\n');
  
  // Simulate fetching PR
  const fetchSpinner = ora('Fetching PR #42 from awesome-app/backend...').start();
  if (!fast) await sleep(1000);
  fetchSpinner.succeed('Found PR with 5 bot comments');
  
  console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
  console.log(chalk.bold('PR #42:'), demoPRData.title);
  console.log(chalk.gray(`By @${demoPRData.author} • ${demoPRData.repository}`));
  console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
  
  // Show bot comments
  console.log(chalk.yellow('📋 Bot Comments Found:\n'));
  for (const comment of demoPRData.comments) {
    console.log(`  ${chalk.cyan(`@${comment.user.login}`)}: ${truncate(comment.body, 60)}`);
    console.log(`  ${chalk.gray(`${comment.path}:${comment.line}`)}\n`);
  }
  
  if (!fast) await sleep(1500);
  
  // Simulate pattern analysis
  const analyzeSpinner = ora('Analyzing patterns and preparing responses...').start();
  if (!fast) await sleep(1500);
  analyzeSpinner.succeed('Analysis complete!');
  
  console.log('\n' + chalk.green('✨ Actions Taken:\n'));
  
  // Show decisions
  for (const [commentId, response] of Object.entries(demoBotResponses)) {
    const comment = demoPRData.comments[parseInt(commentId) - 1];
    const icon = getDecisionIcon(response.decision);
    
    console.log(`${icon} ${chalk.bold(response.decision)}: ${chalk.cyan(`@${comment.user.login}`)}`);
    console.log(`   → ${response.response}`);
    if (response.fix) {
      console.log(chalk.gray(`   → Applied fix: ${response.fix}`));
    }
    if (response.pattern_learned) {
      console.log(chalk.magenta(`   → Pattern learned for future PRs`));
    }
    console.log();
    if (!fast) await sleep(800);
  }
  
  // Show summary
  const summary = getDemoSummary();
  console.log(chalk.gray('─'.repeat(60)) + '\n');
  console.log(chalk.bold.green('📊 Summary:\n'));
  console.log(`  ⚡ Time saved: ${chalk.yellow(`${summary.time_saved_minutes} minutes`)}`);
  console.log(`  🔧 Auto-fixed: ${chalk.green(summary.auto_fixed)}`);
  console.log(`  💬 Explained: ${chalk.blue(summary.rejected_with_explanation)}`);
  console.log(`  📝 Deferred: ${chalk.gray(summary.deferred)}`);
  console.log(`  🚨 Escalated: ${chalk.red(summary.escalated)}`);
  console.log(`  🧠 Patterns learned: ${chalk.magenta(summary.patterns_learned)}`);
  
  console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
  console.log(chalk.bold('🚀 Ready to try on your own PRs?\n'));
  console.log(`  1. Install: ${chalk.cyan('npm install -g pr-vibe')}`);
  console.log(`  2. Set up: ${chalk.cyan('pr-vibe auth')} ${chalk.gray('(30 seconds)')}`);
  console.log(`  3. Use it: ${chalk.cyan('pr-vibe pr <number>')}`);
  console.log('\n' + chalk.gray('Learn more at https://github.com/stroupaloop/pr-vibe') + '\n');
}

function getDecisionIcon(decision) {
  const icons = {
    AUTO_FIX: '🔧',
    REJECT: '❌',
    DEFER: '📝',
    ESCALATE: '🚨'
  };
  return icons[decision] || '•';
}

function truncate(str, length) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}