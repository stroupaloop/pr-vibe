import { categorizeIssue, getPriorityLevel, PRIORITY_LEVELS, analyzeComment } from '../lib/decision-engine.js';

describe('Priority level categorization', () => {
  test('should categorize security issues as must-fix', () => {
    const category = categorizeIssue('SQL injection vulnerability found');
    const priority = getPriorityLevel(category);
    expect(category).toBe('SECURITY');
    expect(priority).toBe(PRIORITY_LEVELS.MUST_FIX);
  });

  test('should categorize performance issues as suggestions', () => {
    const category = categorizeIssue('This query could be optimized for better performance');
    const priority = getPriorityLevel(category);
    expect(category).toBe('PERFORMANCE');
    expect(priority).toBe(PRIORITY_LEVELS.SUGGESTION);
  });

  test('should categorize style issues as nitpicks', () => {
    const category = categorizeIssue('Missing semicolon at end of line');
    const priority = getPriorityLevel(category);
    expect(category).toBe('STYLE');
    expect(priority).toBe(PRIORITY_LEVELS.NITPICK);
  });

  test('should categorize code quality issues as suggestions', () => {
    const category = categorizeIssue('This function is too complex and should be refactored');
    const priority = getPriorityLevel(category);
    expect(category).toBe('CODE_QUALITY');
    expect(priority).toBe(PRIORITY_LEVELS.SUGGESTION);
  });
});

describe('Comment analysis includes priority', () => {
  test('should include priority in security analysis', () => {
    const comment = {
      body: 'Hardcoded API key detected in the code',
      path: 'src/config.js',
      line: 42
    };
    
    const analysis = analyzeComment(comment);
    expect(analysis.priority).toBe(PRIORITY_LEVELS.MUST_FIX);
    expect(analysis.category).toBe('SECURITY');
  });

  test('should include priority in architectural discussions', () => {
    const comment = {
      body: 'Consider refactoring this module to use a more scalable architecture',
      path: 'src/main.js'
    };
    
    const analysis = analyzeComment(comment);
    expect(analysis.priority).toBe(PRIORITY_LEVELS.SUGGESTION);
    expect(analysis.category).toBe('ARCHITECTURE');
  });

  test('should include priority in nit comments', () => {
    const comment = {
      body: 'nit: Extra whitespace here',
      isNit: true
    };
    
    const analysis = analyzeComment(comment);
    expect(analysis.priority).toBe(PRIORITY_LEVELS.NITPICK);
    expect(analysis.category).toBe('NITPICK');
  });
});

describe('Valid pattern matching preserves priority', () => {
  test('should mark valid patterns as suggestions', () => {
    const comment = {
      body: 'Remove console.log statements in Lambda function',
      path: 'src/lambda/handler.js'
    };
    
    const analysis = analyzeComment(comment);
    expect(analysis.action).toBe('REJECT');
    expect(analysis.priority).toBe(PRIORITY_LEVELS.SUGGESTION);
    expect(analysis.category).toBe('PATTERN_MATCH');
  });
});