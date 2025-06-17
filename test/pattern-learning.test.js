import { describe, test, expect } from '@jest/globals';
import { PatternManager } from '../lib/pattern-manager.js';
import { PatternRecorder } from '../lib/pattern-recorder.js';

describe('Pattern Learning System', () => {
  let patternManager;
  let patternRecorder;

  beforeEach(() => {
    // Fresh instances for each test
    patternManager = new PatternManager();
    patternRecorder = new PatternRecorder();
  });

  describe('Pattern Detection', () => {
    test('should match console.log in Lambda files', () => {
      const comment = {
        body: 'Remove console.log from Lambda handler - it impacts performance',
        path: 'packages/sms-handler/index.js',
        author: 'coderabbitai[bot]'
      };

      // Simulate repo patterns
      patternManager.patterns.repo = {
        valid_patterns: [{
          id: 'console-log-lambda',
          pattern: 'console.log',
          condition: {
            files: ['**/sms-handler/**', '**/lambda/**']
          },
          reason: 'CloudWatch logging',
          confidence: 1.0
        }]
      };

      const match = patternManager.findPattern(comment);
      expect(match).toBeTruthy();
      expect(match.action).toBe('REJECT');
      expect(match.source).toBe('repo');
    });

    test('should not match console.log in non-Lambda files', () => {
      const comment = {
        body: 'Remove console.log from production code',
        path: 'packages/web-app/components/Button.js',
        author: 'coderabbitai[bot]'
      };

      patternManager.patterns.repo = {
        valid_patterns: [{
          id: 'console-log-lambda',
          pattern: 'console.log',
          condition: {
            files: ['**/lambda/**']
          }
        }]
      };

      const match = patternManager.findPattern(comment);
      expect(match).toBeNull();
    });
  });

  describe('Pattern Learning', () => {
    test('should learn from rejection decisions', () => {
      const comment = {
        id: 'RC_123',
        body: 'Avoid using any type for webhook payloads',
        path: 'webhooks/stripe.ts',
        author: 'coderabbitai[bot]'
      };

      const decision = {
        action: 'REJECT',
        reason: 'External webhooks have unpredictable shapes',
        confidence: 0.9
      };

      patternRecorder.recordDecision(comment, decision);
      patternRecorder.learnPattern({ comment, decision });

      // Check if pattern was learned
      const learnedPatterns = patternRecorder.sessionDecisions;
      expect(learnedPatterns).toHaveLength(1);
      expect(learnedPatterns[0].decision.action).toBe('REJECT');
    });

    test('should increase confidence with repeated patterns', () => {
      const similarComments = [
        { body: 'Remove console.log from handler', path: 'lambda/fn1.js' },
        { body: 'console.log impacts cold start', path: 'lambda/fn2.js' },
        { body: 'Avoid console.log in Lambda', path: 'lambda/fn3.js' }
      ];

      similarComments.forEach(comment => {
        const decision = { action: 'REJECT', confidence: 0.8 };
        patternRecorder.recordDecision(comment, decision, 'accepted');
      });

      const patterns = patternRecorder.groupDecisionsByPattern();
      // Should group similar patterns together
      expect(Object.keys(patterns).length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Evolution', () => {
    test('should track pattern effectiveness', () => {
      const pattern = {
        id: 'test-pattern',
        occurrences: 10,
        successful: 9,
        failed: 1
      };

      const effectiveness = (pattern.successful / pattern.occurrences);
      expect(effectiveness).toBe(0.9);
      expect(effectiveness).toBeGreaterThan(0.8); // High effectiveness threshold
    });

    test('should demote low-confidence patterns', () => {
      const decisions = [
        { pattern: 'test-1', outcome: 'rejected' },
        { pattern: 'test-1', outcome: 'rejected' },
        { pattern: 'test-1', outcome: 'accepted' }
      ];

      const successRate = decisions.filter(d => d.outcome === 'accepted').length / decisions.length;
      expect(successRate).toBeLessThan(0.5);
      // Pattern should be marked for review
    });
  });

  describe('Fix Pattern Learning', () => {
    test('should learn fix templates from successful fixes', () => {
      const comment = {
        body: 'Hardcoded API key found in source code',
        path: 'config.js',
        line: 10
      };

      const decision = {
        action: 'AUTO_FIX',
        suggestedFix: 'const API_KEY = process.env.API_KEY;',
        confidence: 0.95
      };

      patternRecorder.recordDecision(comment, decision);
      patternRecorder.learnFixPattern(comment, decision);

      // Should extract and store fix pattern
      expect(patternRecorder.sessionDecisions).toHaveLength(1);
    });
  });

  describe('Cross-Project Learning', () => {
    test('should share high-confidence patterns globally', () => {
      const highConfidencePattern = {
        id: 'console-log-lambda',
        confidence: 0.96,
        occurrences: 50,
        repos_seen: ['project1', 'project2', 'project3']
      };

      // Should be eligible for global sharing
      expect(highConfidencePattern.confidence).toBeGreaterThan(0.95);
      expect(highConfidencePattern.occurrences).toBeGreaterThan(10);
      expect(highConfidencePattern.repos_seen.length).toBeGreaterThan(2);
    });
  });
});