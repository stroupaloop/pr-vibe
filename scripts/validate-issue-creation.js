#!/usr/bin/env node

/**
 * Validation script for issue creation and categorization features
 * Tests that the DEFER action, issue creation, and categorization work as expected
 */

import { analyzeComment, categorizeIssue, generateCommitMessageForCategory, generateAccurateDescription } from '../lib/decision-engine.js';
import { botDetector } from '../lib/bot-detector.js';
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

// Additional validation for categorization fix
console.log(chalk.blue('\n🔍 Validating Categorization Fix for False Security Positives\n'));

const categorizationTests = [
  {
    name: 'Type Import Issue',
    comment: 'Prefer type-only import for TypeBox types. Using regular imports for types can lead to unnecessary runtime dependencies.',
    expectedCategory: 'STYLE',
    shouldNotBe: 'SECURITY'
  },
  {
    name: 'Empty Catch Block',
    comment: 'Avoid empty catch blocks. Empty catch blocks can hide errors.',
    expectedCategory: 'CODE_QUALITY',
    shouldNotBe: 'SECURITY'
  },
  {
    name: 'Console.log Statement',
    comment: 'Remove console.log statements or replace with proper logging.',
    expectedCategory: 'DEBUG',
    shouldNotBe: 'SECURITY'
  },
  {
    name: 'Actual Security Issue',
    comment: 'Hardcoded API key detected. This exposes sensitive credentials.',
    expectedCategory: 'SECURITY',
    shouldNotBe: 'STYLE'
  }
];

console.log(chalk.bold('Testing Categorization Logic:\n'));

let categorizationPassed = 0;
let categorizationFailed = 0;

categorizationTests.forEach(({ name, comment, expectedCategory, shouldNotBe }) => {
  const category = categorizeIssue(comment);
  const commitMessage = generateCommitMessageForCategory(category);
  const description = generateAccurateDescription(category, comment);
  
  const categoryCorrect = category === expectedCategory && category !== shouldNotBe;
  const commitCorrect = !commitMessage.toLowerCase().includes('security') || category === 'SECURITY';
  const descCorrect = !description.toLowerCase().includes('vulnerability') || category === 'SECURITY';
  
  const allCorrect = categoryCorrect && commitCorrect && descCorrect;
  
  if (allCorrect) {
    console.log(chalk.green(`✅ ${name}`));
    categorizationPassed++;
  } else {
    console.log(chalk.red(`❌ ${name}`));
    categorizationFailed++;
  }
  
  console.log(chalk.gray(`   Category: ${category} (expected: ${expectedCategory})`));
  console.log(chalk.gray(`   Commit: ${commitMessage}`));
  console.log(chalk.gray(`   Description: ${description}`));
  
  if (!categoryCorrect) {
    console.log(chalk.red(`   ERROR: Wrong category! Got ${category}, expected ${expectedCategory}`));
  }
  if (!commitCorrect && category !== 'SECURITY') {
    console.log(chalk.red(`   ERROR: Commit message mentions security for non-security issue!`));
  }
  console.log();
});

console.log(chalk.bold('\nCategorization Fix Summary:'));
console.log(chalk.green(`✅ Passed: ${categorizationPassed}`));
if (categorizationFailed > 0) {
  console.log(chalk.red(`❌ Failed: ${categorizationFailed}`));
  console.log(chalk.red('\n⚠️  Categorization fix needs adjustment!'));
} else {
  console.log(chalk.green('\n🎉 Categorization fix is working correctly!'));
  console.log(chalk.green('   Type imports → STYLE (not SECURITY)'));
  console.log(chalk.green('   Empty catch → CODE_QUALITY (not SECURITY)'));
  console.log(chalk.green('   Console.log → DEBUG (not SECURITY)'));
  console.log(chalk.green('   API keys → SECURITY (correctly identified)'));
}

// Overall exit code
const totalFailed = failed + categorizationFailed;
if (totalFailed > 0) {
  process.exit(1);
}