#!/usr/bin/env node

/**
 * Demo: Nit Comment Filtering
 * 
 * This example demonstrates how pr-vibe can filter nitpick comments from AI bots.
 * Run with: node examples/nit-filtering-demo.js
 */

import { botDetector } from '../lib/bot-detector.js';
import chalk from 'chalk';

console.log(chalk.blue('\n🔍 pr-vibe Nit Detection Demo\n'));

// Example comments from various bots
const testComments = [
  {
    user: 'coderabbit[bot]',
    body: 'Actionable comments posted: 1\n\nnit: Consider using const instead of let for variables that don\'t change.',
    type: 'nit'
  },
  {
    user: 'coderabbit[bot]',
    body: 'Actionable comments posted: 1\n\nSecurity vulnerability: Hardcoded API key detected in config.js',
    type: 'critical'
  },
  {
    user: 'coderabbit[bot]',
    body: 'Actionable comments posted: 1\n\nMinor suggestion: Add a blank line between imports and code for better readability.',
    type: 'nit'
  },
  {
    user: 'deepsource[bot]',
    body: 'Consider using arrow functions for consistency across the codebase.',
    type: 'nit'
  },
  {
    user: 'coderabbit[bot]',
    body: `<details>
<summary>🔍 Review details</summary>

**Configuration used: CodeRabbit UI**
**Review profile: CHILL**

Additional comments not posted (3)
- Missing semicolon
- Variable naming convention
- Extra whitespace
</details>`,
    type: 'nit_section'
  }
];

// Test different filtering modes
console.log(chalk.bold('1. Normal Mode (process all comments):'));
testComments.forEach(comment => {
  const result = botDetector.shouldProcessComment(
    comment.user,
    comment.body,
    'comment',
    {} // No filtering
  );
  
  const status = result.process ? chalk.green('✓ Process') : chalk.red('✗ Skip');
  const nitStatus = result.details?.isNit ? chalk.yellow('[NIT]') : '';
  console.log(`${status} ${comment.user} ${nitStatus}`);
  console.log(chalk.gray(`  ${comment.body.split('\n')[0].substring(0, 60)}...`));
  console.log(chalk.gray(`  Reason: ${result.reason}\n`));
});

console.log(chalk.bold('\n2. Skip Nits Mode (--skip-nits):'));
testComments.forEach(comment => {
  const result = botDetector.shouldProcessComment(
    comment.user,
    comment.body,
    'comment',
    { skipNits: true }
  );
  
  const status = result.process ? chalk.green('✓ Process') : chalk.red('✗ Skip');
  const nitStatus = result.details?.isNit ? chalk.yellow('[NIT]') : '';
  console.log(`${status} ${comment.user} ${nitStatus}`);
  console.log(chalk.gray(`  ${comment.body.split('\n')[0].substring(0, 60)}...`));
  console.log(chalk.gray(`  Reason: ${result.reason}\n`));
});

console.log(chalk.bold('\n3. Nits Only Mode (--nits-only):'));
testComments.forEach(comment => {
  const result = botDetector.shouldProcessComment(
    comment.user,
    comment.body,
    'comment',
    { nitsOnly: true }
  );
  
  const status = result.process ? chalk.green('✓ Process') : chalk.red('✗ Skip');
  const nitStatus = result.details?.isNit ? chalk.yellow('[NIT]') : '';
  console.log(`${status} ${comment.user} ${nitStatus}`);
  console.log(chalk.gray(`  ${comment.body.split('\n')[0].substring(0, 60)}...`));
  console.log(chalk.gray(`  Reason: ${result.reason}\n`));
});

console.log(chalk.blue('\n📌 Summary:'));
console.log('- Use --skip-nits to focus on critical issues only');
console.log('- Use --nits-only to review only style/formatting comments');
console.log('- Default behavior processes all comments\n');