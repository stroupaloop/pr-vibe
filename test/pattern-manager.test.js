import { jest } from '@jest/globals';
import { patternManager } from '../lib/pattern-manager.js';

describe('PatternManager', () => {
  beforeEach(() => {
    // Reset patterns
    patternManager.patterns = {
      repo: null,
      global: {
        learned_patterns: {},
        team_playbook: {
          reviewers: {},
          common_patterns: []
        },
        statistics: {
          total_reviews: 0,
          patterns_learned: 0,
          time_saved_minutes: 0
        }
      }
    };
  });

  describe('Core functionality', () => {
    test('should be importable', () => {
      expect(patternManager).toBeDefined();
      expect(patternManager.findPattern).toBeDefined();
      expect(patternManager.recordDecision).toBeDefined();
    });

    test('should find patterns in comments', () => {
      // Add a test pattern
      patternManager.patterns.global.learned_patterns['test-1'] = {
        pattern: 'console\\.log',
        action: 'REJECT',
        reason: 'Valid for CloudWatch',
        confidence: 0.9
      };

      const comment = {
        body: 'Remove console.log statement',
        path: 'src/index.js'
      };

      const match = patternManager.findPattern(comment);
      expect(match).toBeDefined();
      expect(match.action).toBe('REJECT');
      expect(match.source).toBe('global');
    });

    test('should record decisions', () => {
      const comment = { body: 'Test comment', id: 123 };
      const decision = { action: 'AUTO_FIX', reason: 'Test reason' };
      const context = { repo: 'test/repo', pr: '42' };

      patternManager.recordDecision(comment, decision, context);

      expect(patternManager.patterns.global.statistics.total_reviews).toBe(1);
      expect(patternManager.patterns.global.statistics.time_saved_minutes).toBe(2.5);
    });
  });

  describe('Human review learning', () => {
    test('should learn from human reviews', async () => {
      const humanComment = {
        user: { login: 'testuser' },
        body: 'Please add error handling here',
        path: 'src/api.js',
        line: 42
      };

      const result = await patternManager.learnFromHumanReview(
        humanComment,
        'suggestion',
        { pr: '123', repo: 'test/repo' }
      );

      expect(result.reviewer).toBe('testuser');
      expect(result.pattern).toBeDefined();
      expect(result.patternsUpdated).toBe(1);

      // Check reviewer profile was created
      const reviewer = patternManager.patterns.global.team_playbook.reviewers.testuser;
      expect(reviewer).toBeDefined();
      expect(reviewer.total_reviews).toBe(1);
    });

    test('should match human patterns', () => {
      // Add a human pattern
      patternManager.patterns.global.learned_patterns['human-test'] = {
        pattern: 'error handling',
        action: 'HUMAN_SUGGESTED',
        human_review: true,
        learned_from: 'testuser',
        confidence: 0.8
      };

      const comment = { body: 'Add error handling for this API call' };
      const match = patternManager.matchHumanPattern(comment);

      expect(match.matched).toBe(true);
      expect(match.learnedFrom).toContain('testuser');
    });
  });

  describe('Pattern matching', () => {
    test('should match patterns with file conditions', () => {
      const pattern = {
        pattern: 'console\\.log',
        condition: { files: ['**/lambda/**', '**/*-handler.js'] }
      };

      const comment1 = { body: 'Remove console.log' };
      const context1 = { path: 'src/lambda/index.js' };
      
      expect(patternManager.matchesPattern(comment1, pattern, context1)).toBe(true);

      const context2 = { path: 'src/regular.js' };
      expect(patternManager.matchesPattern(comment1, pattern, context2)).toBe(false);
    });

    test('should handle patterns without conditions', () => {
      const pattern = { pattern: 'hardcoded.+key' };
      const comment = { body: 'Remove hardcoded API key' };
      
      expect(patternManager.matchesPattern(comment, pattern, {})).toBe(true);
    });
  });

  describe('YAML parsing', () => {
    test('should parse basic YAML patterns', () => {
      const yaml = `
valid_patterns:
  - id: console-log-lambda
    pattern: console.log
    reason: Valid for CloudWatch
    confidence: 1.0
auto_fixes:
  - id: api-key-fix
    trigger: hardcoded key
    fix_template: process.env.API_KEY
`;

      const parsed = patternManager.parseYaml(yaml);
      
      expect(parsed.valid_patterns).toHaveLength(1);
      expect(parsed.valid_patterns[0].id).toBe('console-log-lambda');
      expect(parsed.auto_fixes).toHaveLength(1);
      expect(parsed.auto_fixes[0].trigger).toBe('hardcoded key');
    });
  });
});

// Integration test
describe('PatternManager Integration', () => {
  test('should handle full review cycle', () => {
    const comments = [
      { id: 1, body: 'Remove console.log', path: 'lambda/handler.js' },
      { id: 2, body: 'Add type annotations', path: 'src/types.ts' },
      { id: 3, body: 'Hardcoded API key detected', path: 'config.js' }
    ];

    // Process comments
    comments.forEach(comment => {
      const decision = {
        action: comment.body.includes('console.log') ? 'REJECT' : 'AUTO_FIX',
        reason: 'Test decision'
      };
      patternManager.recordDecision(comment, decision, { pr: '100' });
    });

    // Check statistics
    const stats = patternManager.patterns.global.statistics;
    expect(stats.total_reviews).toBe(3);
    expect(stats.time_saved_minutes).toBe(5.0); // 2 auto-fixes * 2.5
  });
});