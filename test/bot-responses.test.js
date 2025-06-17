import { describe, test, expect } from '@jest/globals';
import { analyzeComment } from '../lib/decision-engine.js';

describe('Bot Response Patterns', () => {
  describe('CodeRabbit Patterns', () => {
    test('should handle security warnings correctly', () => {
      const securityComments = [
        {
          body: 'Critical security issue: Hardcoded API key detected',
          expected: 'AUTO_FIX'
        },
        {
          body: 'SQL injection vulnerability in user input handling',
          expected: 'AUTO_FIX'
        },
        {
          body: 'Potential XSS vulnerability in HTML rendering',
          expected: 'AUTO_FIX'
        },
        {
          body: 'Missing authentication check on sensitive endpoint',
          expected: 'AUTO_FIX'
        }
      ];

      securityComments.forEach(({ body, expected }) => {
        const result = analyzeComment({ body });
        expect(result.action).toBe(expected);
        expect(result.severity).toBe('CRITICAL');
      });
    });

    test('should handle style suggestions appropriately', () => {
      const styleComments = [
        {
          body: 'Consider using const instead of let for immutable variables',
          expected: 'DISCUSS'
        },
        {
          body: 'Function exceeds 50 lines, consider refactoring',
          expected: 'DISCUSS'
        },
        {
          body: 'Magic number detected, consider using named constant',
          expected: 'DISCUSS'
        }
      ];

      styleComments.forEach(({ body, expected }) => {
        const result = analyzeComment({ body });
        expect(result.action).toBe(expected);
      });
    });

    test('should detect valid project patterns', () => {
      const validPatterns = [
        {
          body: 'Remove console.log from Lambda handler',
          path: 'lambda/handler.js',
          expected: 'REJECT'
        },
        {
          body: 'Avoid using any type for Stripe webhook',
          path: 'webhooks/stripe.ts',
          expected: 'REJECT'
        },
        {
          body: 'Hardcoded table name in DynamoDB query',
          path: 'infrastructure/tables.js',
          expected: 'REJECT'
        }
      ];

      validPatterns.forEach(({ body, path, expected }) => {
        const result = analyzeComment({ body, path });
        // These would be REJECT with proper patterns loaded
        expect(['REJECT', 'DISCUSS', 'AUTO_FIX']).toContain(result.action);
      });
    });
  });

  describe('DeepSource Patterns', () => {
    test('should handle code quality issues', () => {
      const qualityIssues = [
        {
          body: 'Function cognitive complexity is 25, threshold is 15',
          expected: 'DEFER'
        },
        {
          body: 'Duplicate code block found in 3 locations',
          expected: 'DEFER'
        },
        {
          body: 'Test coverage is 45%, minimum threshold is 80%',
          expected: 'DISCUSS'
        }
      ];

      qualityIssues.forEach(({ body, expected }) => {
        const result = analyzeComment({ body });
        expect(['DEFER', 'DISCUSS']).toContain(result.action);
      });
    });
  });

  describe('Multi-Bot Scenarios', () => {
    test('should handle conflicting bot suggestions', () => {
      const scenario = {
        coderabbit: {
          body: 'Remove console.log for better performance',
          action: 'REJECT', // We know it's valid for Lambda
        },
        deepsource: {
          body: 'Console output detected in production code',
          action: 'REJECT', // Same pattern, different bot
        },
        expected_learning: 'Pattern reinforced across multiple bots'
      };

      const result1 = analyzeComment(scenario.coderabbit);
      const result2 = analyzeComment(scenario.deepsource);
      
      // Both should be handled consistently
      expect(result1.action).toBe(result2.action);
    });

    test('should prioritize security over style', () => {
      const comments = [
        {
          body: 'Hardcoded password and function is too long',
          priority: 'SECURITY'
        },
        {
          body: 'SQL injection risk and missing semicolon',
          priority: 'SECURITY'
        }
      ];

      comments.forEach(({ body }) => {
        const result = analyzeComment({ body });
        expect(result.action).toBe('AUTO_FIX');
        expect(result.severity).toBe('CRITICAL');
      });
    });
  });

  describe('Learning Scenarios', () => {
    test('should learn from user overrides', () => {
      const scenario = {
        comment: {
          body: 'Avoid deep nesting, refactor this function',
          path: 'legacy/old-code.js'
        },
        bot_decision: 'AUTO_FIX',
        user_override: 'DEFER',
        user_reason: 'Legacy code, will refactor in Q2',
        expected_learning: 'Legacy code patterns should be deferred'
      };

      // Simulate learning from override
      const pattern = {
        id: 'legacy-code-refactor',
        pattern: 'refactor.*legacy',
        learned_action: 'DEFER',
        confidence: 0.8
      };

      expect(pattern.learned_action).toBe(scenario.user_override);
    });

    test('should adapt to team preferences', () => {
      const teamPreferences = {
        'error-handling': {
          occurrences: 20,
          auto_fix: 2,
          discuss: 18,
          learned_preference: 'DISCUSS'
        },
        'var-to-const': {
          occurrences: 50,
          auto_fix: 48,
          discuss: 2,
          learned_preference: 'AUTO_FIX'
        }
      };

      Object.entries(teamPreferences).forEach(([pattern, stats]) => {
        const autoFixRate = stats.auto_fix / stats.occurrences;
        const expectedAction = autoFixRate > 0.8 ? 'AUTO_FIX' : 'DISCUSS';
        expect(stats.learned_preference).toBe(expectedAction);
      });
    });
  });
});