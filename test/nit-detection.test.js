import { describe, test, expect } from '@jest/globals';
import { botDetector } from '../lib/bot-detector.js';

describe('Nit Detection', () => {
  describe('isNitComment', () => {
    test('should detect explicit nit prefixes', () => {
      const testCases = [
        { body: 'nit: Consider using const instead of let', expected: true },
        { body: 'Nit: Missing semicolon', expected: true },
        { body: 'NIT: Spacing issue', expected: true },
        { body: 'This is a nit: formatting', expected: true },
      ];
      
      testCases.forEach(({ body, expected }) => {
        const result = botDetector.isNitComment(body);
        expect(result.isNit).toBe(expected);
        if (expected) {
          expect(result.confidence).toBeGreaterThanOrEqual(0.85);
        }
      });
    });
    
    test('should detect minor/trivial patterns', () => {
      const testCases = [
        { body: 'Minor suggestion: add spacing', expected: true },
        { body: 'This is a trivial issue', expected: true },
        { body: 'Consider using a more descriptive name', expected: true },
        { body: 'Style suggestion: use camelCase', expected: true },
        { body: 'Optional: you might want to add a comment', expected: true },
        { body: 'Non-blocking comment about formatting', expected: true },
        { body: 'Cosmetic issue with indentation', expected: true },
      ];
      
      testCases.forEach(({ body, expected }) => {
        const result = botDetector.isNitComment(body);
        expect(result.isNit).toBe(expected);
      });
    });
    
    test('should detect CodeRabbit review details sections', () => {
      const codeRabbitReviewDetails = `<details>
<summary>🔍 Review details</summary>

**Configuration used: CodeRabbit UI**
**Review profile: CHILL**

Some review content here
</details>`;
      
      const result = botDetector.isNitComment(codeRabbitReviewDetails);
      expect(result.isNit).toBe(true);
      expect(result.pattern).toBe('coderabbit_review_details');
    });
    
    test('should detect "Additional comments not posted"', () => {
      const body = 'Additional comments not posted (3)';
      const result = botDetector.isNitComment(body);
      expect(result.isNit).toBe(true);
      expect(result.pattern).toBe('coderabbit_additional_comments');
      expect(result.confidence).toBe(0.95);
    });
    
    test('should not detect serious issues as nits', () => {
      const testCases = [
        'Security vulnerability: SQL injection detected',
        'Critical bug: Memory leak in auth handler',
        'Performance issue: N+1 query detected',
        'Breaking change: API contract violated',
      ];
      
      testCases.forEach(body => {
        const result = botDetector.isNitComment(body);
        expect(result.isNit).toBe(false);
      });
    });
  });
  
  describe('shouldProcessComment with nit filtering', () => {
    test('should skip nits when skipNits is enabled', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbit[bot]',
        'nit: Consider using const instead of let',
        'comment',
        { skipNits: true }
      );
      
      expect(result.process).toBe(false);
      expect(result.reason).toBe('nit_comment_skipped');
      expect(result.details.isNit).toBe(true);
    });
    
    test('should process nits when skipNits is not enabled', () => {
      const result = botDetector.shouldProcessComment(
        'coderabbit[bot]',
        'Actionable comments posted: 1\n\nnit: Consider using const instead of let',
        'comment',
        { skipNits: false }
      );
      
      expect(result.process).toBe(true);
      expect(result.details.isNit).toBe(true);
    });
    
    test('should only process nits when nitsOnly is enabled', () => {
      const nitResult = botDetector.shouldProcessComment(
        'coderabbit[bot]',
        'Actionable comments posted: 1\n\nnit: formatting issue',
        'comment',
        { nitsOnly: true }
      );
      
      expect(nitResult.process).toBe(true);
      
      const seriousResult = botDetector.shouldProcessComment(
        'coderabbit[bot]',
        'Actionable comments posted: 1\n\nSecurity issue: hardcoded API key',
        'comment',
        { nitsOnly: true }
      );
      
      expect(seriousResult.process).toBe(false);
      expect(seriousResult.reason).toBe('non_nit_comment_skipped');
    });
    
    test('should skip CodeRabbit nit sections when skipNits is enabled', () => {
      // Create a review body that would be parsed as a nit section
      const reviewBodyText = `<details>
<summary>🔍 Review details</summary>

**Configuration used: CodeRabbit UI**

Additional comments not posted (3)
</details>`;
      
      const result = botDetector.shouldProcessComment(
        'coderabbit[bot]',
        reviewBodyText,
        'comment',
        { skipNits: true }
      );
      
      expect(result.process).toBe(false);
      // Since the comment itself is detected as a nit (review details section), 
      // it will be skipped as 'nit_comment_skipped'
      expect(result.reason).toBe('nit_comment_skipped');
      expect(result.details.isNit).toBe(true);
    });
  });
});