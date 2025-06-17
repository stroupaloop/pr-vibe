import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { detectGitHubToken, isAuthRequired } from '../lib/auth.js';

// Mock child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync
}));

describe('Authentication', () => {
  beforeEach(() => {
    // Clear all mocks
    mockExecSync.mockClear();
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    
    // Reset environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_ACCESS_TOKEN;
  });

  describe('Token Detection', () => {
    test('should detect token from GITHUB_TOKEN env var', async () => {
      process.env.GITHUB_TOKEN = 'test-token-123';
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('test-token-123');
      expect(result.source).toBe('environment variable (GITHUB_TOKEN)');
    });

    test('should detect token from GH_TOKEN env var', async () => {
      process.env.GH_TOKEN = 'test-gh-token';
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('test-gh-token');
      expect(result.source).toBe('environment variable (GH_TOKEN)');
    });

    test('should detect token from GitHub CLI', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd === 'gh auth token') {
          return 'gh-cli-token\n';
        }
        throw new Error('Command not found');
      });
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('gh-cli-token');
      expect(result.source).toBe('GitHub CLI (gh)');
    });

    test('should handle missing GitHub CLI gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBeNull();
    });

    test('should detect VS Code integration', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path.includes('.vscode-server') || path.includes('.vscode-insiders');
      });
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('vscode-integrated');
      expect(result.source).toBe('VS Code GitHub extension');
      expect(result.requiresSetup).toBe(true);
    });

    test('should detect token from git config', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git config --global github.token')) {
          return 'git-config-token\n';
        }
        throw new Error('Not found');
      });
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('git-config-token');
      expect(result.source).toBe('git config (github.token)');
    });

    test('should detect token from common files with warning', async () => {
      mockExistsSync.mockImplementation(path => path.includes('.github_token'));
      mockReadFileSync.mockImplementation(() => 'GITHUB_TOKEN=file-token-123\nOTHER_VAR=value');
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('file-token-123');
      expect(result.source).toContain('file');
      expect(result.warning).toContain('plain text file');
    });

    test('should return null when no token found', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });
      mockExistsSync.mockReturnValue(false);
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBeNull();
      expect(result.source).toBeNull();
    });

    test('should prioritize environment variables over other methods', async () => {
      process.env.GITHUB_TOKEN = 'env-token';
      mockExecSync.mockImplementation(() => 'gh-token');
      
      const { detectGitHubToken } = await import('../lib/auth.js');
      const result = detectGitHubToken();
      
      expect(result.token).toBe('env-token');
      expect(result.source).toBe('environment variable (GITHUB_TOKEN)');
    });
  });

  describe('Auth Requirements', () => {
    test('should not require auth for demo command', () => {
      expect(isAuthRequired('demo')).toBe(false);
    });

    test('should not require auth for help command', () => {
      expect(isAuthRequired('help')).toBe(false);
    });

    test('should not require auth for auth command', () => {
      expect(isAuthRequired('auth')).toBe(false);
    });

    test('should not require auth for version commands', () => {
      expect(isAuthRequired('version')).toBe(false);
      expect(isAuthRequired('--version')).toBe(false);
      expect(isAuthRequired('-v')).toBe(false);
    });

    test('should require auth for pr command', () => {
      expect(isAuthRequired('pr')).toBe(true);
    });

    test('should require auth for export command', () => {
      expect(isAuthRequired('export')).toBe(true);
    });

    test('should require auth for apply command', () => {
      expect(isAuthRequired('apply')).toBe(true);
    });
  });
});