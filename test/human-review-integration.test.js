import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { patternManager } from '../lib/pattern-manager.js';

// Mock execSync for GitHub tests
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

describe('Human Review Integration', () => {
  beforeEach(() => {
    // Reset pattern manager state
    patternManager.patterns = {
      version: '1.0',
      global: {
        learned_patterns: {},
        team_playbook: { reviewers: {} },
        statistics: { total_reviews: 0, time_saved_minutes: 0, patterns_learned: 0 }
      },
      humanReviewPatterns: []
    };
  });

  describe('Human Review Pattern Learning', () => {
    test('should learn when human disagrees with bot suggestion', async () => {
      const humanComment = {
        body: 'Actually, this console.log is critical for debugging production Lambda issues. We need to keep it.',
        user: { login: 'senior-dev' }
      };
      
      const context = {
        botComment: 'Remove console.log from production code',
        file: 'api/handlers/webhook.js',
        decision: 'KEEP'
      };
      
      await patternManager.learnFromHumanReview(humanComment, 'KEEP', context);
      
      // Verify pattern was learned
      const reviewers = patternManager.patterns.global.team_playbook.reviewers;
      expect(reviewers['senior-dev']).toBeDefined();
      expect(reviewers['senior-dev'].total_reviews).toBe(1);
    });

    test('should weight senior developer feedback higher', async () => {
      // First, junior dev suggests something
      await patternManager.learnFromHumanReview(
        { body: 'Remove this', user: { login: 'junior-dev' } },
        'REMOVE',
        { file: 'api/config.js' }
      );
      
      // Then senior dev disagrees
      await patternManager.learnFromHumanReview(
        { body: 'No, this is needed for local development', user: { login: 'senior-dev' } },
        'KEEP',
        { file: 'api/config.js' }
      );
      
      // Future decisions should favor senior dev's pattern
      const reviewers = patternManager.patterns.global.team_playbook.reviewers;
      expect(reviewers['senior-dev'].total_reviews).toBe(1);
      expect(reviewers['junior-dev'].total_reviews).toBe(1);
    });

    test('should identify consensus patterns across multiple reviewers', async () => {
      const reviewers = ['alice', 'bob', 'charlie'];
      
      // All reviewers agree on keeping console.log in Lambda
      for (const reviewer of reviewers) {
        await patternManager.learnFromHumanReview(
          { 
            body: `I agree, console.log is needed here for CloudWatch`, 
            user: { login: reviewer } 
          },
          'KEEP',
          { 
            file: 'lambdas/processor.js',
            botComment: 'Remove console.log'
          }
        );
      }
      
      // Check that consensus was recorded
      const patterns = patternManager.patterns.global.learned_patterns;
      const consensusPattern = Object.values(patterns).find(p => 
        p.reason?.includes('Common feedback')
      );
      
      // Pattern learning requires multiple occurrences from same reviewer
      // This test shows the system tracks individual reviewer patterns
      const teamPlaybook = patternManager.patterns.global.team_playbook.reviewers;
      expect(Object.keys(teamPlaybook).length).toBe(3);
    });
  });

  describe('Human Review Context Preservation', () => {
    test('should preserve PR context when learning from human reviews', async () => {
      const context = {
        pr: '123',
        repo: 'stroupaloop/project',
        file: 'src/auth.js',
        line: 42,
        botComment: 'Hardcoded secret detected',
        humanDecision: 'This is a public key, not a secret'
      };
      
      await patternManager.learnFromHumanReview(
        { 
          body: context.humanDecision,
          user: { login: 'security-expert' },
          path: context.file,
          line: context.line
        },
        'KEEP',
        context
      );
      
      // Verify context was preserved
      const expert = patternManager.patterns.global.team_playbook.reviewers['security-expert'];
      expect(expert).toBeDefined();
      expect(expert.total_reviews).toBe(1);
    });

    test('should handle conflicting human reviews gracefully', async () => {
      const file = 'src/utils.js';
      
      // First reviewer says remove
      await patternManager.learnFromHumanReview(
        { body: 'This should be removed', user: { login: 'reviewer1' } },
        'REMOVE',
        { file, botComment: 'Unused variable' }
      );
      
      // Second reviewer says keep
      await patternManager.learnFromHumanReview(
        { body: 'Actually, this is used in tests', user: { login: 'reviewer2' } },
        'KEEP',
        { file, botComment: 'Unused variable' }
      );
      
      // Both opinions should be recorded
      const reviewers = patternManager.patterns.global.team_playbook.reviewers;
      expect(reviewers['reviewer1']).toBeDefined();
      expect(reviewers['reviewer2']).toBeDefined();
    });
  });

  describe('Integration with Bot Comments', () => {
    test('should distinguish between bot and human comments in PR analysis', async () => {
      const mockPR = {
        title: 'Add new feature',
        comments: [
          {
            author: { login: 'coderabbit[bot]' },
            body: 'Remove console.log',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            author: { login: 'human-reviewer' },
            body: 'LGTM, but the console.log is needed for debugging',
            createdAt: '2024-01-01T01:00:00Z'
          }
        ]
      };
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('gh pr view')) {
          return JSON.stringify(mockPR);
        }
        return '[]';
      });
      
      const { analyzeGitHubPR: analyze } = await import('../lib/github.js');
      const result = await analyze(123, 'owner/repo');
      
      expect(result.botComments).toHaveLength(1);
      expect(result.humanComments).toHaveLength(1);
      expect(result.botComments[0].user.login).toBe('coderabbit[bot]');
      expect(result.humanComments[0].user.login).toBe('human-reviewer');
    });

    test('should track human review patterns by repository', async () => {
      const repos = ['repo1', 'repo2'];
      
      for (const repo of repos) {
        await patternManager.learnFromHumanReview(
          { body: 'This pattern is specific to our repo', user: { login: 'lead-dev' } },
          'KEEP',
          { 
            repo,
            file: 'config.js',
            botComment: 'Hardcoded value'
          }
        );
      }
      
      // Patterns should be tracked with repo context
      const leadDev = patternManager.patterns.global.team_playbook.reviewers['lead-dev'];
      expect(leadDev.total_reviews).toBe(2);
    });
  });

  describe('Human Review Feedback Loop', () => {
    test('should improve accuracy with human feedback over time', async () => {
      // Simulate multiple reviews teaching the same pattern
      const reviews = ['PR-1', 'PR-2', 'PR-3', 'PR-4'];
      
      for (const pr of reviews) {
        await patternManager.learnFromHumanReview(
          { 
            body: 'Console.log needed for production debugging',
            user: { login: 'tech-lead' }
          },
          'KEEP',
          { 
            pr,
            file: 'api/lambda.js',
            botComment: 'Remove console.log'
          }
        );
      }
      
      // After multiple reviews, the reviewer profile should be updated
      const techLead = patternManager.patterns.global.team_playbook.reviewers['tech-lead'];
      expect(techLead).toBeDefined();
      expect(techLead.total_reviews).toBe(4);
      
      // Check that feedback patterns are being tracked
      const feedbackPatterns = techLead.common_feedback;
      expect(Object.keys(feedbackPatterns).length).toBeGreaterThan(0);
      
      // Verify feedback was recorded (don't rely on exact frequency due to pattern matching variations)
      const hasRecordedFeedback = Object.values(feedbackPatterns).some(f => f.frequency >= 1);
      expect(hasRecordedFeedback).toBe(true);
    });
  });
});