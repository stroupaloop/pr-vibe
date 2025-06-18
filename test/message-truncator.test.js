import { describe, it, expect } from '@jest/globals';
import { MessageTruncator } from '../lib/utils/message-truncator.js';

describe('MessageTruncator', () => {
  const GITHUB_LIMIT = 65536;
  
  describe('truncate', () => {
    it('should not truncate messages under the limit', () => {
      const shortMessage = 'This is a short message';
      const result = MessageTruncator.truncate(shortMessage);
      
      expect(result.wasTruncated).toBe(false);
      expect(result.message).toBe(shortMessage);
      expect(result.originalLength).toBe(shortMessage.length);
    });
    
    it('should truncate messages over the limit', () => {
      const longMessage = 'x'.repeat(GITHUB_LIMIT + 1000);
      const result = MessageTruncator.truncate(longMessage);
      
      expect(result.wasTruncated).toBe(true);
      expect(result.message.length).toBeLessThanOrEqual(GITHUB_LIMIT);
      expect(result.originalLength).toBe(longMessage.length);
    });
    
    it('should add truncation notice when specified', () => {
      const longMessage = 'x'.repeat(GITHUB_LIMIT + 1000);
      const result = MessageTruncator.truncate(longMessage, { addNotice: true });
      
      expect(result.message).toContain('Message truncated');
      expect(result.message).toContain('characters removed');
    });
    
    it('should preserve code blocks when truncating', () => {
      const messageWithCode = `
Some text before code

\`\`\`javascript
function example() {
  console.log('This is important code');
}
\`\`\`

${'x'.repeat(GITHUB_LIMIT)}`;
      
      const result = MessageTruncator.truncate(messageWithCode, { 
        preserveCodeBlocks: true 
      });
      
      expect(result.wasTruncated).toBe(true);
      // Should truncate after the code block
      expect(result.message).toContain('```');
    });
  });
  
  describe('split', () => {
    it('should not split messages under the limit', () => {
      const shortMessage = 'This is a short message';
      const parts = MessageTruncator.split(shortMessage);
      
      expect(parts.length).toBe(1);
      expect(parts[0]).toBe(shortMessage);
    });
    
    it('should split long messages into multiple parts', () => {
      const longMessage = 'x'.repeat(GITHUB_LIMIT * 2);
      const parts = MessageTruncator.split(longMessage);
      
      expect(parts.length).toBeGreaterThan(1);
      parts.forEach(part => {
        expect(part.length).toBeLessThanOrEqual(GITHUB_LIMIT);
      });
    });
    
    it('should add continuation markers when specified', () => {
      const longMessage = 'x'.repeat(GITHUB_LIMIT * 2);
      const parts = MessageTruncator.split(longMessage, { 
        addContinuationMarkers: true 
      });
      
      expect(parts[0]).toContain('continues in next comment');
      expect(parts[1]).toContain('continued from previous comment');
    });
  });
  
  describe('exceedsLimit', () => {
    it('should correctly identify messages that exceed the limit', () => {
      const shortMessage = 'Short';
      const longMessage = 'x'.repeat(GITHUB_LIMIT + 1);
      
      expect(MessageTruncator.exceedsLimit(shortMessage)).toBe(false);
      expect(MessageTruncator.exceedsLimit(longMessage)).toBe(true);
    });
  });
  
  describe('getExcessInfo', () => {
    it('should provide detailed information about message length', () => {
      const message = 'x'.repeat(GITHUB_LIMIT + 1000);
      const info = MessageTruncator.getExcessInfo(message);
      
      expect(info.exceedsLimit).toBe(true);
      expect(info.messageLength).toBe(message.length);
      expect(info.limit).toBe(GITHUB_LIMIT);
      expect(info.excessCharacters).toBe(1000);
      expect(info.excessPercentage).toBeCloseTo(1.53, 1);
    });
    
    it('should handle messages under the limit', () => {
      const message = 'Short message';
      const info = MessageTruncator.getExcessInfo(message);
      
      expect(info.exceedsLimit).toBe(false);
      expect(info.excessCharacters).toBe(0);
      expect(info.excessPercentage).toBe(0);
    });
  });
  
  describe('truncateAtNaturalBoundary', () => {
    it('should prefer to truncate at code block boundaries', () => {
      const message = `
Start of message

\`\`\`
code block 1
\`\`\`

Middle text that is quite long to push us past the truncation point

\`\`\`
code block 2
\`\`\`

${'x'.repeat(1000)}`;
      
      const truncated = MessageTruncator.truncateAtNaturalBoundary(message, 60);
      
      // Should truncate after first code block
      expect(truncated).toContain('code block 1');
      expect(truncated).not.toContain('code block 2');
      // The truncation should happen at a natural boundary
      expect(truncated.length).toBeLessThan(message.length);
    });
    
    it('should fall back to paragraph boundaries', () => {
      const message = `First paragraph.

Second paragraph.

Third paragraph with ${'x'.repeat(100)}`;
      
      const truncated = MessageTruncator.truncateAtNaturalBoundary(message, 50);
      
      expect(truncated).toContain('First paragraph');
      expect(truncated).toContain('Second paragraph');
      expect(truncated).not.toContain('Third paragraph');
    });
  });
});