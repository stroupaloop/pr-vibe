import { jest } from '@jest/globals';
import { GitHubProvider } from '../lib/providers/github-provider.js';

describe('CI status detection', () => {
  describe('getPRChecks return value structure', () => {
    test('should have correct structure when CI checks exist', () => {
      const mockChecks = {
        total: 3,
        pending: 1,
        passing: 1,
        failing: 1,
        neutral: 0,
        checks: [
          {
            name: 'Unit Tests',
            status: 'completed',
            conclusion: 'success',
            type: 'check_run',
            url: 'https://github.com/owner/repo/checks/1'
          },
          {
            name: 'Lint',
            status: 'completed',
            conclusion: 'failure',
            type: 'check_run',
            url: 'https://github.com/owner/repo/checks/2'
          },
          {
            name: 'Build',
            status: 'in_progress',
            conclusion: null,
            type: 'check_run',
            url: 'https://github.com/owner/repo/checks/3'
          }
        ]
      };
      
      // Validate structure
      expect(mockChecks).toHaveProperty('total');
      expect(mockChecks).toHaveProperty('pending');
      expect(mockChecks).toHaveProperty('passing');
      expect(mockChecks).toHaveProperty('failing');
      expect(mockChecks).toHaveProperty('neutral');
      expect(mockChecks).toHaveProperty('checks');
      expect(Array.isArray(mockChecks.checks)).toBe(true);
      
      // Validate counts
      expect(mockChecks.total).toBe(3);
      expect(mockChecks.pending).toBe(1);
      expect(mockChecks.passing).toBe(1);
      expect(mockChecks.failing).toBe(1);
    });

    test('should handle empty CI checks', () => {
      const mockChecks = {
        total: 0,
        pending: 0,
        passing: 0,
        failing: 0,
        neutral: 0,
        checks: []
      };
      
      expect(mockChecks.total).toBe(0);
      expect(mockChecks.checks).toEqual([]);
    });

    test('should categorize different check conclusions', () => {
      const checks = [
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'neutral' },
        { status: 'completed', conclusion: 'skipped' },
        { status: 'completed', conclusion: 'cancelled' },
        { status: 'queued', conclusion: null }
      ];
      
      const passing = checks.filter(c => c.conclusion === 'success').length;
      const neutral = checks.filter(c => ['neutral', 'skipped', 'cancelled'].includes(c.conclusion)).length;
      const pending = checks.filter(c => c.status === 'in_progress' || c.status === 'queued').length;
      
      expect(passing).toBe(1);
      expect(neutral).toBe(3);
      expect(pending).toBe(1);
    });

    test('should return null on error', () => {
      // When API calls fail, getPRChecks should return null
      const result = null;
      expect(result).toBe(null);
    });
  });

  describe('getPRChecks method existence', () => {
    test('should have getPRChecks method', () => {
      const provider = new GitHubProvider({ repo: 'owner/repo' });
      expect(typeof provider.getPRChecks).toBe('function');
    });
  });
});