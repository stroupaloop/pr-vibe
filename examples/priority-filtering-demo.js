#!/usr/bin/env node

/**
 * Priority Filtering Demo
 * 
 * Demonstrates the new priority-based filtering features in pr-vibe v0.12.0:
 * - --critical-only flag for must-fix issues only
 * - --priority-threshold for custom filtering
 * - Priority breakdown in summary
 * 
 * Usage: node examples/priority-filtering-demo.js
 */

import chalk from 'chalk';
import { PRIORITY_LEVELS } from '../lib/decision-engine.js';

console.log(chalk.blue.bold('🎯 pr-vibe Priority Filtering Demo\n'));

// Sample bot comments with different priorities
const sampleComments = [
  {
    bot: 'coderabbit[bot]',
    body: 'SQL injection vulnerability in user input handling',
    priority: PRIORITY_LEVELS.MUST_FIX,
    category: 'SECURITY',
    file: 'api/users.js',
    line: 42
  },
  {
    bot: 'deepsource[bot]',
    body: 'Hardcoded API key found in configuration',
    priority: PRIORITY_LEVELS.MUST_FIX,
    category: 'SECURITY',
    file: 'config/api.js',
    line: 15
  },
  {
    bot: 'sonarcloud[bot]',
    body: 'Function complexity is too high (15 > 10)',
    priority: PRIORITY_LEVELS.SUGGESTION,
    category: 'CODE_QUALITY',
    file: 'services/processor.js',
    line: 120
  },
  {
    bot: 'codacy[bot]',
    body: 'Unused variable "tempData" should be removed',
    priority: PRIORITY_LEVELS.SUGGESTION,
    category: 'CODE_QUALITY',
    file: 'utils/helpers.js',
    line: 88
  },
  {
    bot: 'eslint[bot]',
    body: 'nit: Missing semicolon at end of line',
    priority: PRIORITY_LEVELS.NITPICK,
    category: 'STYLE',
    file: 'components/Button.js',
    line: 23
  },
  {
    bot: 'prettier[bot]',
    body: 'Incorrect indentation (expected 2 spaces, found 4)',
    priority: PRIORITY_LEVELS.NITPICK,
    category: 'STYLE',
    file: 'components/Card.js',
    line: 45
  }
];

// Display all comments first
console.log(chalk.bold('📋 All Bot Comments:'));
sampleComments.forEach((comment, idx) => {
  const priorityColor = comment.priority === PRIORITY_LEVELS.MUST_FIX ? chalk.red :
                       comment.priority === PRIORITY_LEVELS.SUGGESTION ? chalk.yellow :
                       chalk.gray;
  
  console.log(`\n${idx + 1}. ${chalk.cyan(comment.bot)}`);
  console.log(`   ${comment.body}`);
  console.log(`   📄 ${comment.file}:${comment.line}`);
  console.log(`   ${priorityColor(`Priority: ${comment.priority}`)}`);
});

// Simulate different filtering scenarios
console.log(chalk.bold('\n\n🔍 Filtering Scenarios:\n'));

// Scenario 1: --critical-only
console.log(chalk.bold('1. Using --critical-only flag:'));
console.log(chalk.gray('   pr-vibe pr 123 --critical-only'));
console.log('\n   Showing only must-fix issues:');
const criticalOnly = sampleComments.filter(c => c.priority === PRIORITY_LEVELS.MUST_FIX);
criticalOnly.forEach(comment => {
  console.log(`   • ${chalk.red(comment.category)}: ${comment.body.substring(0, 50)}...`);
});
console.log(chalk.gray(`\n   (${sampleComments.length - criticalOnly.length} lower priority items hidden)`));

// Scenario 2: --priority-threshold suggestion
console.log(chalk.bold('\n2. Using --priority-threshold suggestion:'));
console.log(chalk.gray('   pr-vibe pr 123 --priority-threshold suggestion'));
console.log('\n   Showing must-fix and suggestions:');
const suggestionAndUp = sampleComments.filter(c => 
  c.priority === PRIORITY_LEVELS.MUST_FIX || c.priority === PRIORITY_LEVELS.SUGGESTION
);
suggestionAndUp.forEach(comment => {
  const color = comment.priority === PRIORITY_LEVELS.MUST_FIX ? chalk.red : chalk.yellow;
  console.log(`   • ${color(comment.category)}: ${comment.body.substring(0, 50)}...`);
});
console.log(chalk.gray(`\n   (${sampleComments.length - suggestionAndUp.length} nitpicks hidden)`));

// Scenario 3: Default (all)
console.log(chalk.bold('\n3. Default behavior (no filtering):'));
console.log(chalk.gray('   pr-vibe pr 123'));
console.log('\n   Showing all comments with priority breakdown');

// Show summary statistics
console.log(chalk.bold('\n📊 Priority Breakdown:'));
const counts = {
  [PRIORITY_LEVELS.MUST_FIX]: sampleComments.filter(c => c.priority === PRIORITY_LEVELS.MUST_FIX).length,
  [PRIORITY_LEVELS.SUGGESTION]: sampleComments.filter(c => c.priority === PRIORITY_LEVELS.SUGGESTION).length,
  [PRIORITY_LEVELS.NITPICK]: sampleComments.filter(c => c.priority === PRIORITY_LEVELS.NITPICK).length
};

console.log(`  Must Fix: ${counts[PRIORITY_LEVELS.MUST_FIX]} ${chalk.red('(critical)')}`);
console.log(`  Suggestions: ${counts[PRIORITY_LEVELS.SUGGESTION]} ${chalk.yellow('(improvements)')}`);
console.log(`  Nitpicks: ${counts[PRIORITY_LEVELS.NITPICK]} ${chalk.gray('(style)')}`);
console.log(`  Total: ${sampleComments.length}`);

// Show command examples
console.log(chalk.bold('\n💻 Command Examples:'));
console.log(chalk.gray('  # Focus on critical security/bug fixes only'));
console.log('  pr-vibe pr 123 --critical-only');
console.log(chalk.gray('\n  # Include suggestions but hide nitpicks'));
console.log('  pr-vibe pr 123 --priority-threshold suggestion');
console.log(chalk.gray('\n  # Show only nitpicks (for cleanup tasks)'));
console.log('  pr-vibe pr 123 --priority-threshold nitpick --nits-only');
console.log(chalk.gray('\n  # Combine with other flags'));
console.log('  pr-vibe pr 123 --critical-only --auto-fix');

// Workflow recommendations
console.log(chalk.bold('\n🎯 Recommended Workflows:'));
console.log('\n1. ' + chalk.cyan('Pre-release Review:'));
console.log('   Use --critical-only to focus on blockers');
console.log('\n2. ' + chalk.cyan('Regular Development:'));
console.log('   Use --priority-threshold suggestion for balanced review');
console.log('\n3. ' + chalk.cyan('Code Quality Sprint:'));
console.log('   Review all comments including nitpicks');
console.log('\n4. ' + chalk.cyan('Quick Fix Mode:'));
console.log('   Combine --critical-only --auto-fix for rapid resolution');

console.log(chalk.green.bold('\n✨ Priority filtering helps you focus on what matters most!\n'));