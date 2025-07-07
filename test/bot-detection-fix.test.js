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
  });
});