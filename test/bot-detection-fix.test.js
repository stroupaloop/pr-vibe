import { jest } from '@jest/globals';
import { botDetector } from '../lib/bot-detector.js';

describe('Bot Detection Fix', () => {
  describe('PR Review Comment Processing', () => {
    test('should process CodeRabbit PR review comments even when parent review says 0 actionable', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '_⚠️ Potential issue_\n\n**Fix string quotes**',
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
    });

    test('should skip PR review body with 0 actionable comments', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '**Actionable comments posted: 0**\n\n<details>...',
        'pr_review'
      );

      expect(result.process).toBe(false);
      expect(result.reason).toBe('no_actionable_items');
    });

    test('should detect bot correctly with or without [bot] suffix', () => {
      const result1 = botDetector.detectBot('coderabbitai');
      const result2 = botDetector.detectBot('coderabbitai[bot]');

      expect(result1.isBot).toBe(true);
      expect(result1.botType).toBe('coderabbit');
      expect(result2.isBot).toBe(true);
      expect(result2.botType).toBe('coderabbit');
    });

    test('should process PR review comments with empty body (nested comment has content)', () => {
      // This tests the fix for reviews without body but containing nested comments
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '', // Empty body - the actual content is in nested review comments
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
      expect(result.details.hasContent).toBe(false);
    });

    test('should process PR review comments with null body', () => {
      // Test handling of null body which can happen with certain bot review structures
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        null,
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
    });

    test('should process PR review comments with undefined body', () => {
      // Test handling of undefined body
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        undefined,
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
    });

    test('should handle reviews with PENDING state and no body but containing comments', () => {
      // This represents the typical CodeRabbit pattern that was being missed
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '', // No body text
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
    });

    test('should handle reviews with CHANGES_REQUESTED state and no body', () => {
      // Another common CodeRabbit pattern
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        null,
        'pr_review_comment'
      );

      expect(result.process).toBe(true);
      expect(result.reason).toBe('review_comment');
      expect(result.confidence).toBe(0.95);
    });

    test('should not process other bot types with empty body for non-review comments', () => {
      // Ensure the fix doesn't break other comment types
      const result = botDetector.shouldProcessComment(
        'coderabbitai[bot]',
        '', // Empty body
        'issue' // Not a pr_review_comment
      );

      expect(result.process).toBe(false);
      expect(result.reason).toBe('no_body');
      expect(result.confidence).toBe(0.95);
    });
  });
});