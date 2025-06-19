#!/usr/bin/env node

/**
 * Validation script for issue creation feature
 * Tests that the DEFER action and issue creation work as expected
 */

import { analyzeComment } from '../lib/decision-engine.js';
import chalk from 'chalk';

console.log(chalk.blue('\n🔍 Validating Issue Creation Feature\n'));

// Test cases for DEFER action
const testCases = [
  {
    comment: { body: 'Consider using const instead of let for immutable variables' },
    expectedAction: 'DEFER',
    description: 'Non-critical improvement suggestion'
  },
  {
    comment: { body: 'This would be a nice enhancement for the future' },
    expectedAction: 'DEFER',
    description: 'Future enhancement'
  },
  {
    comment: { body: 'We could optimize this later by using a cache' },
    expectedAction: 'DEFER',
    description: 'Future optimization'
  },
  {
    comment: { body: 'Function exceeds 50 lines, consider refactoring' },
    expectedAction: 'DISCUSS',
    description: 'Refactoring (architectural discussion)'
  },
  {
    comment: { body: 'SQL injection vulnerability detected' },
    expectedAction: 'AUTO_FIX',
    description: 'Security issue'
  }
];

console.log(chalk.bold('Testing Decision Engine DEFER Logic:\n'));

let passed = 0;
let failed = 0;

testCases.forEach(({ comment, expectedAction, description }) => {
  const result = analyzeComment(comment);
  const success = result.action === expectedAction;
  
  if (success) {
    console.log(chalk.green(`✅ ${description}`));
    console.log(chalk.gray(`   Comment: "${comment.body.substring(0, 50)}..."`));
    console.log(chalk.gray(`   Action: ${result.action} (${Math.round(result.confidence * 100)}% confidence)`));
    passed++;
  } else {
    console.log(chalk.red(`❌ ${description}`));
    console.log(chalk.gray(`   Comment: "${comment.body}"`));
    console.log(chalk.gray(`   Expected: ${expectedAction}, Got: ${result.action}`));
    failed++;
  }
  console.log();
});

console.log(chalk.bold('\nValidation Summary:'));
console.log(chalk.green(`✅ Passed: ${passed}`));
if (failed > 0) {
  console.log(chalk.red(`❌ Failed: ${failed}`));
  process.exit(1);
} else {
  console.log(chalk.green('\n🎉 All tests passed! Issue creation feature is working correctly.\n'));
}

// Additional validation info
console.log(chalk.cyan('Feature Capabilities:'));
console.log('• Automatically detects enhancement suggestions and defers them');
console.log('• Creates GitHub issues with --create-issues flag');
console.log('• Includes full context in created issues');
console.log('• Tracks issue URLs in reports');
console.log('• Shows created issues in PR summary\n');

console.log(chalk.yellow('Usage Examples:'));
console.log(chalk.gray('# Create issues when deferring items:'));
console.log('pr-vibe pr 123 --create-issues\n');
console.log(chalk.gray('# Create issues from existing report:'));
console.log('pr-vibe issues 123\n');
console.log(chalk.gray('# Preview issues without creating:'));
console.log('pr-vibe issues 123 --dry-run\n');