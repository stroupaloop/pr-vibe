import { jest } from '@jest/globals';
import { ConversationManager } from '../lib/conversation-manager.js';

describe('ConversationManager', () => {
  let manager;
  let mockProvider;
  
  beforeEach(() => {
    mockProvider = {
      repo: 'test/repo',
      currentUser: 'pr-vibe[bot]',
      postComment: jest.fn().mockResolvedValue({ id: 123 }),
      getComments: jest.fn().mockResolvedValue([])
    };
    manager = new ConversationManager(mockProvider);
  });
  
  describe('Rate Limit Detection', () => {
    test('should detect explicit rate limit messages', () => {
      const testCases = [
        { text: 'Rate limit exceeded. Please wait 30 seconds.', expectedWait: 30000 },
        { text: 'Please try again in 2 minutes', expectedWait: 120000 },
        { text: 'Too many requests. Retry after 1 hour.', expectedWait: 3600000 }
      ];
      
      testCases.forEach(({ text, expectedWait }) => {
        const result = manager.checkForRateLimit(text, 'bot[bot]');
        expect(result).toBeTruthy();
        expect(result.retryAfter).toBe(expectedWait);
      });
    });
    
    test('should detect CodeRabbit-specific rate limit patterns', () => {
      const result = manager.checkForRateLimit(
        'currently processing other requests',
        'coderabbitai[bot]'
      );
      expect(result).toBeTruthy();
      expect(result.retryAfter).toBe(60000); // 1 minute default
    });
    
    test('should return null for non-rate-limit messages', () => {
      const result = manager.checkForRateLimit(
        'thanks for the explanation',
        'coderabbitai[bot]'
      );
      expect(result).toBeNull();
    });
  });
  
  describe('Response Analysis', () => {
    const mockConversation = {
      originalComment: { body: 'Original issue' },
      rounds: [{ message: 'initial' }]
    };
    
    test('should detect resolution indicators', async () => {
      const responses = [
        'LGTM!',
        'That makes sense, thanks!',
        'Thank you for clarifying',
        'Acknowledged'
      ];
      
      for (const body of responses) {
        const result = await manager.analyzeBotResponse(
          { body, user: { login: 'bot[bot]' } },
          mockConversation
        );
        expect(result.resolved).toBe(true);
        expect(result.resolution).toContain('accepted');
      }
    });
    
    test('should detect when bot corrects our understanding', async () => {
      const result = await manager.analyzeBotResponse(
        { 
          body: 'Actually, I think you misunderstood. This is about ESLint.',
          user: { login: 'bot[bot]' }
        },
        mockConversation
      );
      
      expect(result.resolved).toBe(false);
      expect(result.needsReply).toBe(true);
      expect(result.reply).toContain('Thank you for the clarification');
      expect(result.reply).toContain('misunderstood');
    });
    
    test('should handle questions from bot', async () => {
      const result = await manager.analyzeBotResponse(
        { 
          body: 'Could you explain why this is necessary?',
          user: { login: 'bot[bot]' }
        },
        mockConversation
      );
      
      expect(result.resolved).toBe(false);
      expect(result.needsReply).toBe(true);
      expect(result.reply).toContain('clarify');
    });
    
    test('should escalate after multiple rounds', async () => {
      const longConversation = {
        ...mockConversation,
        rounds: [1, 2, 3, 4].map(i => ({ message: `round ${i}` }))
      };
      
      const result = await manager.analyzeBotResponse(
        { 
          body: 'I still strongly recommend changing this.',
          user: { login: 'bot[bot]' }
        },
        longConversation
      );
      
      expect(result.resolved).toBe(true);
      expect(result.resolution).toContain('Escalated');
    });
  });
  
  describe('Conversation Flow', () => {
    test('should post response with pr-vibe signature', async () => {
      await manager.postResponse(1, { id: 123 }, 'Test response');
      
      expect(mockProvider.postComment).toHaveBeenCalledWith(
        1,
        expect.stringContaining('Test response'),
        expect.objectContaining({ in_reply_to: 123 })
      );
      
      const postedText = mockProvider.postComment.mock.calls[0][1];
      expect(postedText).toContain('pr-vibe');
      expect(postedText).toContain('Continuing conversation');
    });
    
    test('should track conversation state', () => {
      const prNumber = 1;
      const comment = { id: 123 };
      const conversationId = `${prNumber}-${comment.id}`;
      
      manager.activeConversations.set(conversationId, {
        prNumber,
        originalComment: comment,
        rounds: [{ speaker: 'pr-vibe', message: 'test' }],
        status: 'active'
      });
      
      const summary = manager.getConversationSummary();
      expect(summary.total).toBe(1);
      expect(summary.totalRounds).toBe(1);
    });
  });
  
  describe('Utility Functions', () => {
    test('should convert time units correctly', () => {
      expect(manager.convertToSeconds(5, 'seconds')).toBe(5);
      expect(manager.convertToSeconds(2, 'minutes')).toBe(120);
      expect(manager.convertToSeconds(1, 'hour')).toBe(3600);
    });
    
    test('should check for new comments correctly', async () => {
      const allComments = [
        { id: 1, created_at: '2025-06-18T00:00:00Z', user: { login: 'user' } },
        { id: 2, created_at: '2025-06-18T01:00:00Z', user: { login: 'bot[bot]' }, in_reply_to_id: 1 },
        { id: 3, created_at: '2025-06-18T02:00:00Z', user: { login: 'bot[bot]' } }
      ];
      
      mockProvider.getComments.mockResolvedValue(allComments);
      
      const newComments = await manager.checkForNewComments(
        1, 
        1, 
        new Date('2025-06-18T00:30:00Z')
      );
      
      expect(newComments).toHaveLength(1);
      expect(newComments[0].id).toBe(2);
    });
  });
});