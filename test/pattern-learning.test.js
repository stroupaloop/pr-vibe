import { describe, test, expect, beforeEach } from '@jest/globals';
import { patternManager } from '../lib/pattern-manager.js';

describe('Pattern Learning System', () => {
  beforeEach(() => {
    // Reset patterns for each test
    patternManager.patterns = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      patterns: [],
      humanReviewPatterns: [],
      repo: {
        patterns: [],
        team_playbook: {
          reviewers: {}
        }
      },
      global: {
        rejected_patterns: [],
        learned_patterns: {},
        statistics: {
          total_reviews: 0,
          time_saved_minutes: 0,
          patterns_learned: 0
        },
        team_playbook: {
          reviewers: {}
        }
      }
    };
  });

  describe('Pattern Recording', () => {
    test('should record decisions and update statistics', () => {
      const decision = {
        action: 'REJECT',
        reason: 'TODOs are tracked in issues'
      };
      
      const comment = {
        body: 'Remove TODO comments',
        user: { login: 'deepsource[bot]' }
      };
      
      patternManager.recordDecision(comment, decision, {});
      
      const stats = patternManager.patterns.global.statistics;
      expect(stats.total_reviews).toBe(1);
      expect(stats.time_saved_minutes).toBe(2.5);
    });

    test('should track multiple decisions', () => {
      const decisions = [
        { action: 'AUTO_FIX', reason: 'Security fix' },
        { action: 'REJECT', reason: 'Valid pattern' },
        { action: 'DISCUSS', reason: 'Need more info' }
      ];
      
      decisions.forEach((decision, i) => {
        const comment = { body: `Comment ${i}`, user: { login: 'bot' } };
        patternManager.recordDecision(comment, decision, {});
      });
      
      const stats = patternManager.patterns.global.statistics;
      expect(stats.total_reviews).toBe(3);
      // AUTO_FIX + REJECT = 2 * 2.5 = 5.0
      expect(stats.time_saved_minutes).toBe(5.0);
    });
  });

  describe('Human Review Learning', () => {
    test('should learn from human feedback patterns', async () => {
      const humanComment = {
        body: 'This console.log is needed for debugging production issues',
        user: { login: 'human-reviewer' }
      };
      
      await patternManager.learnFromHumanReview(
        humanComment,
        'KEEP',
        {
          file: 'api/lambda.js',
          botComment: 'Remove console.log'
        }
      );
      
      // Check reviewer was tracked
      const reviewers = patternManager.patterns.global.team_playbook.reviewers;
      expect(reviewers['human-reviewer']).toBeDefined();
      expect(reviewers['human-reviewer'].total_reviews).toBe(1);
      
      // Check common feedback was recorded
      const feedback = reviewers['human-reviewer'].common_feedback;
      expect(Object.keys(feedback).length).toBeGreaterThan(0);
    });
  });

  describe('Pattern YAML Parsing', () => {
    test('should parse pattern YAML correctly', () => {
      const yaml = `
valid_patterns:
  - id: console-log-lambda
    description: Console.log in Lambda functions
    matcher:
      bot: coderabbit
      content: console\\.log.*lambda
    action: REJECT
    response: CloudWatch logging is valid

auto_fixes:
  - id: hardcoded-key
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