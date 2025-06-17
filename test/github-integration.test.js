import { describe, test, expect, jest } from '@jest/globals';
import { analyzeGitHubPR, postComment, applyFix } from '../lib/github.js';

// Mock execSync for testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('GitHub Integration', () => {
  describe('Fetching PR Data', () => {
    test('should fetch and parse PR comments', async () => {
      const mockPR = {
        title: 'Test PR',
        comments: [
          { id: 1, author: { login: 'user1' }, body: 'Test comment' }
        ]
      };
      
      // Mock the gh CLI response
      require('child_process').execSync.mockReturnValue(JSON.stringify(mockPR));
      
      const result = await analyzeGitHubPR(18, 'test/repo');
      
      expect(result.pr).toBeDefined();
      expect(result.comments).toHaveLength(1);
      expect(result.threads).toBeDefined();
    });

    test('should group comments into threads correctly', async () => {
      const mockComments = [
        { id: 1, body: 'Original comment' },
        { id: 2, in_reply_to_id: 1, body: 'Reply to comment' },
        { id: 3, body: 'New thread' }
      ];
      
      const threads = groupIntoThreads(mockComments);
      
      expect(Object.keys(threads)).toHaveLength(2);
      expect(threads['1']).toHaveLength(2); // Original + reply
      expect(threads['3']).toHaveLength(1); // Standalone
    });
  });

  describe('Posting Responses', () => {
    test('should format reply correctly for inline comments', () => {
      const reply = formatReply({
        commentId: 123,
        message: 'Fixed the issue',
        type: 'review'
      });
      
      expect(reply).toContain('Fixed the issue');
    });

    test('should handle different reviewer types', () => {
      const codeRabbitReply = formatReply({
        reviewer: 'coderabbitai[bot]',
        message: 'Applied fix'
      });
      
      expect(codeRabbitReply).toContain('@coderabbitai');
    });
  });
});