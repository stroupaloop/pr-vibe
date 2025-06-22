import { test } from 'node:test';
import assert from 'node:assert';
import { categorizeIssue, getPriorityLevel, PRIORITY_LEVELS, analyzeComment } from '../lib/decision-engine.js';

test('Priority level categorization', async (t) => {
  await t.test('should categorize security issues as must-fix', () => {
    const category = categorizeIssue('SQL injection vulnerability found');
    const priority = getPriorityLevel(category);
    assert.strictEqual(category, 'SECURITY');
    assert.strictEqual(priority, PRIORITY_LEVELS.MUST_FIX);
  });

  await t.test('should categorize performance issues as suggestions', () => {
    const category = categorizeIssue('This query could be optimized for better performance');
    const priority = getPriorityLevel(category);
    assert.strictEqual(category, 'PERFORMANCE');
    assert.strictEqual(priority, PRIORITY_LEVELS.SUGGESTION);
  });

  await t.test('should categorize style issues as nitpicks', () => {
    const category = categorizeIssue('Missing semicolon at end of line');
    const priority = getPriorityLevel(category);
    assert.strictEqual(category, 'STYLE');
    assert.strictEqual(priority, PRIORITY_LEVELS.NITPICK);
  });

  await t.test('should categorize code quality issues as suggestions', () => {
    const category = categorizeIssue('This function is too complex and should be refactored');
    const priority = getPriorityLevel(category);
    assert.strictEqual(category, 'CODE_QUALITY');
    assert.strictEqual(priority, PRIORITY_LEVELS.SUGGESTION);
  });
});

test('Comment analysis includes priority', async (t) => {
  await t.test('should include priority in security analysis', () => {
    const comment = {
      body: 'Hardcoded API key detected in the code',
      path: 'src/config.js',
      line: 42
    };
    
    const analysis = analyzeComment(comment);
    assert.strictEqual(analysis.priority, PRIORITY_LEVELS.MUST_FIX);
    assert.strictEqual(analysis.category, 'SECURITY');
  });

  await t.test('should include priority in architectural discussions', () => {
    const comment = {
      body: 'Consider refactoring this module to use a more scalable architecture',
      path: 'src/main.js'
    };
    
    const analysis = analyzeComment(comment);
    assert.strictEqual(analysis.priority, PRIORITY_LEVELS.SUGGESTION);
    assert.strictEqual(analysis.category, 'ARCHITECTURE');
  });

  await t.test('should include priority in nit comments', () => {
    const comment = {
      body: 'nit: Extra whitespace here',
      isNit: true
    };
    
    const analysis = analyzeComment(comment);
    assert.strictEqual(analysis.priority, PRIORITY_LEVELS.NITPICK);
    assert.strictEqual(analysis.category, 'NITPICK');
  });
});

test('Valid pattern matching preserves priority', async (t) => {
  await t.test('should mark valid patterns as suggestions', () => {
    const comment = {
      body: 'Remove console.log statements in Lambda function',
      path: 'src/lambda/handler.js'
    };
    
    const analysis = analyzeComment(comment);
    assert.strictEqual(analysis.action, 'REJECT');
    assert.strictEqual(analysis.priority, PRIORITY_LEVELS.SUGGESTION);
    assert.strictEqual(analysis.category, 'PATTERN_MATCH');
  });
});