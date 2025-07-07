#!/usr/bin/env node

/**
 * Smart Watch Mode Demo
 * 
 * Demonstrates the new intelligent watch mode features in pr-vibe v0.11.0:
 * - Bot completion detection
 * - Adaptive polling intervals
 * - Expected bot tracking
 * - Auto-process functionality
 * 
 * Usage: node examples/smart-watch-demo.js
 */

import chalk from 'chalk';
import ora from 'ora';

console.log(chalk.blue.bold('🎵 pr-vibe Smart Watch Mode Demo\n'));

// Simulate bot completion patterns
const completionExamples = [
  { 
    bot: 'coderabbit[bot]', 
    body: '**Review complete** ✅\n\nI found 3 suggestions and 2 nitpicks.',
    isComplete: true 
  },
  { 
    bot: 'deepsource[bot]', 
    body: 'Analysis finished. No issues found in this pull request.',
    isComplete: true 
  },
  { 
    bot: 'sonarcloud[bot]', 
    body: 'All checks passed ✓\n\nCode coverage: 95%',
    isComplete: true 
  },
  { 
    bot: 'codacy[bot]', 
    body: 'Analyzing your code...',
    isComplete: false 
  }
];

console.log(chalk.bold('📊 Bot Completion Detection:'));
completionExamples.forEach(({ bot, body, isComplete }) => {
  const icon = isComplete ? chalk.green('✅') : chalk.yellow('⏳');
  console.log(`  ${icon} ${bot}: ${isComplete ? 'Complete' : 'In progress'}`);
  console.log(chalk.gray(`     "${body.split('\n')[0]}"`));
});

// Demonstrate adaptive polling
console.log(chalk.bold('\n⏱️  Adaptive Polling Intervals:'));
const intervals = [
  { elapsed: '0-30s', interval: '5s', reason: 'Bots typically respond quickly' },
  { elapsed: '30s-2m', interval: '10s', reason: 'Most bots have responded' },
  { elapsed: '2-5m', interval: '20s', reason: 'Waiting for slower bots' },
  { elapsed: '5m+', interval: '30s', reason: 'Long-running analysis' }
];

intervals.forEach(({ elapsed, interval, reason }) => {
  console.log(`  ${chalk.cyan(elapsed.padEnd(8))} → Check every ${chalk.yellow(interval)} (${reason})`);
});

// Show expected bot tracking
console.log(chalk.bold('\n🤖 Expected Bot Tracking:'));
const expectedBots = [
  { name: 'CodeRabbit', avgTime: '30s', status: 'detected' },
  { name: 'DeepSource', avgTime: '45s', status: 'waiting' },
  { name: 'SonarCloud', avgTime: '1m', status: 'not expected' }
];

expectedBots.forEach(({ name, avgTime, status }) => {
  const statusColor = status === 'detected' ? chalk.green : 
                     status === 'waiting' ? chalk.yellow : chalk.gray;
  console.log(`  ${name}: ${statusColor(status)} (avg response: ${avgTime})`);
});

// Demonstrate watch flow
console.log(chalk.bold('\n🔄 Smart Watch Flow:'));
console.log('1. Start watching immediately after PR creation');
console.log('2. Detect bots as they arrive and analyze comments');
console.log('3. Track completion signals from each bot');
console.log('4. Auto-process when all bots complete (with --auto-process)');
console.log('5. Or prompt user when bots are ready');

// Show command examples
console.log(chalk.bold('\n💻 Command Examples:'));
console.log(chalk.gray('  # Basic watch mode'));
console.log('  pr-vibe watch 123');
console.log(chalk.gray('\n  # Auto-process when all bots complete'));
console.log('  pr-vibe watch 123 --auto-process');
console.log(chalk.gray('\n  # Custom timeout (default 10 minutes)'));
console.log('  pr-vibe watch 123 --timeout 30');
console.log(chalk.gray('\n  # Watch with auto-fix enabled'));
console.log('  pr-vibe watch 123 --auto-process --auto-fix');

// Simulate a watch session
console.log(chalk.bold('\n🎬 Simulated Watch Session:'));
const spinner = ora('Starting watch mode...').start();

setTimeout(() => {
  spinner.text = 'Waiting for bot reviews... (0:05 elapsed, checking every 5s)';
}, 1000);

setTimeout(() => {
  spinner.succeed('Found new bot comment from coderabbit[bot]');
  console.log(chalk.green('  ✓ CodeRabbit posted review with 3 comments'));
  spinner.start('Waiting for deepsource[bot]... (0:15 elapsed, checking every 5s)');
}, 2000);

setTimeout(() => {
  spinner.succeed('Found new bot comment from deepsource[bot]');
  console.log(chalk.green('  ✓ DeepSource analysis complete - no issues found'));
  console.log(chalk.bold('\n🎯 Bot Completion Status:'));
  console.log('  ✅ coderabbit[bot]: Complete');
  console.log('  ✅ deepsource[bot]: Complete');
  console.log(chalk.green.bold('\n✅ All expected bots have completed their reviews!'));
  console.log(chalk.blue('\n🎵 Ready to process bot comments!\n'));
}, 3500);

// Clean up after demo
setTimeout(() => {
  process.exit(0);
}, 4000);