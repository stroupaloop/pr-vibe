import { jest } from '@jest/globals';
import { botDetector } from '../lib/bot-detector.js';

describe('Bot Review Comments Detection', () => {
  describe('CodeRabbit PR Review Comments', () => {
    test('should process inline review comments even when parent says 0 actionable', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '_⚠️ Potential issue_\n\n**Fix potential null reference**',
        'pr_review_comment'
      );
      
      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
      expect(result.details.hasContent).toBe(true);
    });
    
    test('should handle empty body PR review comments', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '',
        'pr_review_comment'
      );
      
      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.details.hasContent).toBe(false);
      expect(result.details.isNit).toBe(false);
    });
    
    test('should skip parent review with 0 actionable comments', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '## Walkthrough\n\nThe changes look good.\n\n**Actionable comments posted: 0**',
        'pr_review'
      );
      
      expect(result.process).toBe(false);
      expect(result.reason).toBe('no_actionable_items');
    });
  });

  describe('Multiple AI Review Tools', () => {
    const aiReviewBots = [
      { name: 'claude-code-review[bot]', type: 'claudeCode' },
      { name: 'github-copilot[bot]', type: 'copilot' },
      { name: 'codegeex', type: 'codegeex' },
      { name: 'codacy[bot]', type: 'codacy' },
      { name: 'reviewdog', type: 'reviewdog' },
      { name: 'pr-bot', type: 'prbot' }
    ];
    
    aiReviewBots.forEach(({ name, type }) => {
      test(`should detect ${name} as ${type} bot`, () => {
        const detection = botDetector.detectBot(name);
        
        expect(detection.isBot).toBe(true);
        expect(detection.botType).toBe(type);
        expect(detection.confidence).toBeGreaterThanOrEqual(0.80);
      });
      
      test(`should process ${name} PR review comments`, () => {
        const result = botDetector.shouldProcessComment(
          name,
          'This code has an issue that needs to be fixed.',
          'pr_review_comment'
        );
        
        expect(result.process).toBe(true);
        expect(result.reason).toBe('review_comment');
      });
    });
  });

  describe('Claude Code Review Specific Features', () => {
    test('should detect confidence percentages in Claude reviews', () => {
      const review = botDetector.parseBotReview(
        'claude-code-review[bot]',
        'This is likely a bug (85% confidence) - MUST_FIX'
      );
      
      expect(review.parsedContent).toBeDefined();
      expect(review.botType).toBe('claudeCode');
    });
    
    test('should handle Claude category markers', () => {
      const testCases = [
        'MUST_FIX: Security vulnerability detected',
        'SUGGESTION: Consider using const instead of let',
        'NITPICK: Extra whitespace',
        'FACT: This function is never called',
        'INFERENCE: Based on usage patterns, this might be slow',
        'GUESS: This could potentially cause issues'
      ];
      
      testCases.forEach(body => {
        const result = botDetector.shouldProcessComment(
          'claude-code-review[bot]',
          body,
          'pr_review_comment'
        );
        
        expect(result.process).toBe(true);
      });
    });
  });

  describe('GitHub Copilot Detection', () => {
    test('should detect various Copilot naming patterns', () => {
      const patterns = [
        'github-copilot',
        'github-copilot[bot]',
        'copilot[bot]',
        'GitHub-Copilot[bot]'
      ];
      
      patterns.forEach(name => {
        const detection = botDetector.detectBot(name);
        expect(detection.isBot).toBe(true);
        expect(detection.botType).toBe('copilot');
      });
    });
  });

  describe('Generic Bot Detection', () => {
    test('should detect any username ending with [bot]', () => {
      const detection = botDetector.detectBot('custom-reviewer[bot]');
      
      expect(detection.isBot).toBe(true);
      expect(detection.botType).toBe('genericBot');
      expect(detection.confidence).toBe(0.80);
    });
    
    test('should not detect human reviewers', () => {
      const humanNames = ['john-doe', 'reviewer123', 'alice_smith'];
      
      humanNames.forEach(name => {
        const detection = botDetector.detectBot(name);
        expect(detection.isBot).toBe(false);
        expect(detection.confidence).toBe(0.95); // 95% confident it's NOT a bot
      });
    });
  });

  describe('Empty and Edge Cases', () => {
    test('should handle null username', () => {
      const detection = botDetector.detectBot(null);
      expect(detection.isBot).toBe(false);
      expect(detection.confidence).toBe(0);
    });
    
    test('should handle undefined body', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        undefined,
        'comment'
      );
      
      expect(result.process).toBe(false);
    });
    
    test('should handle whitespace-only body', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '   \n\t  ',
        'pr_review_comment'
      );
      
      expect(result.process).toBe(true);
      expect(result.details.hasContent).toBe(false);
    });
  });
});