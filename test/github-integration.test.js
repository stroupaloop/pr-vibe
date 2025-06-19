import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Create mocks before imports
const mockExecSync = jest.fn();
const mockExecFileSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
  execFileSync: mockExecFileSync
}));
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
  execFileSync: mockExecFileSync
}));

// Import after mocking
const { analyzeGitHubPR } = await import('../lib/github.js');

describe('GitHub Integration', () => {
  beforeEach(() => {
    mockExecSync.mockClear();
  });

  describe('analyzeGitHubPR', () => {
    test('should fetch and parse PR data with bot comments', async () => {
      const mockPR = {
        title: 'Test PR',
        comments: [
          { 
            author: { login: 'coderabbit[bot]' }, 
            body: 'Actionable comments posted: 3\n\nFound security vulnerability in authentication logic',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      };
      
      const mockReviewComments = [{
        user: { login: 'deepsource[bot]' },
        body: 'Security issue',
        created_at: '2024-01-01T00:00:00Z'
      }];
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('gh pr view')) {
          return JSON.stringify(mockPR);
        }
        if (cmd.includes('/pulls/123/comments')) {
          return JSON.stringify(mockReviewComments);
        }
        if (cmd.includes('/pulls/123/reviews')) {
          // Return empty reviews array for now
          return JSON.stringify([]);
        }
        if (cmd.includes('git remote get-url')) {
          return 'https://github.com/owner/repo.git';
        }
        return '{}';
      });
      
      const result = await analyzeGitHubPR(123, 'owner/repo');
      
      expect(result.pr.title).toBe('Test PR');
      expect(result.botComments).toHaveLength(2);
      expect(result.botComments[0].isBot).toBe(true);
    });

    test('should handle human comments from PR', async () => {
      const mockPR = {
        title: 'Test PR',
        comments: [
          {
            author: { login: 'human-reviewer' },
            body: 'LGTM with minor suggestions',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      };
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('gh pr view')) {
          return JSON.stringify(mockPR);
        }
        if (cmd.includes('git remote get-url')) {
          return 'https://github.com/owner/repo.git';
        }
        return '[]';
      });
      
      const result = await analyzeGitHubPR(123, 'owner/repo');
      
      expect(result.humanComments).toHaveLength(1);
      expect(result.humanComments[0].body).toContain('LGTM');
    });
  });
});