#!/usr/bin/env node

/**
 * Demo script showing the GitHub issue creation feature for deferred bot comments
 */

import chalk from 'chalk';

console.log(chalk.blue('\n🎵 pr-vibe Issue Creation Demo\n'));

console.log(chalk.bold('New Feature: Automatic GitHub Issue Creation'));
console.log('================================================\n');

console.log('When bot comments are deferred to the backlog, pr-vibe can now');
console.log('automatically create GitHub issues to track them!\n');

console.log(chalk.cyan('How it works:'));
console.log('1. During PR review, mark bot comments as "backlog"');
console.log('2. Use --create-issues flag to auto-create issues');
console.log('3. Issues include full context and link back to PR\n');

console.log(chalk.green('Example Commands:'));
console.log(chalk.gray('  # Review PR with automatic issue creation'));
console.log('  pr-vibe pr 123 --create-issues\n');

console.log(chalk.gray('  # Create issues from existing report'));
console.log('  pr-vibe issues 123\n');

console.log(chalk.gray('  # Preview issues without creating'));
console.log('  pr-vibe issues 123 --dry-run\n');

console.log(chalk.yellow('Issue Format:'));
console.log('- Title: [Bot: CodeRabbit] Consider using const instead of let...');
console.log('- Labels: bot-feedback, pr-vibe, coderabbit');
console.log('- Body includes:');
console.log('  - Original bot comment');
console.log('  - Link to PR');
console.log('  - File/line context');
console.log('  - Decision reasoning\n');

console.log(chalk.bold('Benefits:'));
console.log('✅ Never lose important bot feedback');
console.log('✅ Integrate with existing issue workflows');
console.log('✅ Track technical debt from PR reviews');
console.log('✅ Better visibility for deferred work\n');

console.log(chalk.gray('This helps ensure valuable bot suggestions don\'t get lost'));
console.log(chalk.gray('between PRs and become actionable work items!\n'));