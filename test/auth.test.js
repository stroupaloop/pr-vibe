import { describe, test, expect, jest, beforeEach } from '@jest/globals';

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
  readFileSync: mockReadFileSync,
  // Add other fs methods that might be imported
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock os
jest.unstable_mockModule('os', () => ({
  homedir: () => '/home/test'
}));

// Mock path
jest.unstable_mockModule('path', () => ({
  join: (...args) => args.join('/'),
  dirname: (path) => path.split('/').slice(0, -1).join('/'),
  basename: (path) => path.split('/').pop()
}));

describe('Authentication', () => {
  let auth;

  beforeEach(async () => {
    // Clear all mocks
    mockExecSync.mockClear();
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    
    // Reset environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_ACCESS_TOKEN;
    
    // Reset modules to ensure clean import
    jest.resetModules();
    
    // Import the module fresh for each test
    auth = await import('../lib/auth.js');
  });

  describe('Token Detection', () => {
    test('should detect token from GITHUB_TOKEN env var', () => {
      process.env.GITHUB_TOKEN = 'test-token-123';
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('test-token-123');
      expect(result.source).toBe('environment variable (GITHUB_TOKEN)');
    });

    test('should detect token from GH_TOKEN env var', () => {
      process.env.GH_TOKEN = 'test-gh-token';
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('test-gh-token');
      expect(result.source).toBe('environment variable (GH_TOKEN)');
    });

    test('should detect token from GitHub CLI', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd === 'gh auth token') {
          return 'gh-cli-token\n';
        }
        throw new Error('Command not found');
      });
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('gh-cli-token');
      expect(result.source).toBe('GitHub CLI (gh)');
    });

    test('should handle missing GitHub CLI gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });
      mockExistsSync.mockReturnValue(false);
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBeNull();
    });

    test('should detect VS Code integration', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });
      mockExistsSync.mockImplementation((path) => {
        return path.includes('.vscode-server') || path.includes('.vscode-insiders');
      });
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('vscode-integrated');
      expect(result.source).toBe('VS Code GitHub extension');
      expect(result.requiresSetup).toBe(true);
    });

    test('should detect token from git config', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git config --global github.token')) {
          return 'git-config-token\n';
        }
        throw new Error('Not found');
      });
      mockExistsSync.mockReturnValue(false);
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('git-config-token');
      expect(result.source).toBe('git config (github.token)');
    });

    test('should detect token from common files with warning', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });
      mockExistsSync.mockImplementation(path => path.includes('.github_token'));
      mockReadFileSync.mockImplementation(() => 'GITHUB_TOKEN=file-token-123\nOTHER_VAR=value');
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('file-token-123');
      expect(result.source).toContain('file');
      expect(result.warning).toContain('plain text file');
    });

    test('should return null when no token found', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });
      mockExistsSync.mockReturnValue(false);
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBeNull();
      expect(result.source).toBeNull();
    });

    test('should prioritize environment variables over other methods', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      mockExecSync.mockImplementation(() => 'gh-token');
      
      const result = auth.detectGitHubToken();
      
      expect(result.token).toBe('env-token');
      expect(result.source).toBe('environment variable (GITHUB_TOKEN)');
    });
  });

  describe('Auth Requirements', () => {
    test('should not require auth for demo command', () => {
      expect(auth.isAuthRequired('demo')).toBe(false);
    });

    test('should not require auth for help command', () => {
      expect(auth.isAuthRequired('help')).toBe(false);
    });

    test('should not require auth for auth command', () => {
      expect(auth.isAuthRequired('auth')).toBe(false);
    });

    test('should not require auth for version commands', () => {
      expect(auth.isAuthRequired('version')).toBe(false);
      expect(auth.isAuthRequired('--version')).toBe(false);
      expect(auth.isAuthRequired('-v')).toBe(false);
    });

    test('should require auth for pr command', () => {
      expect(auth.isAuthRequired('pr')).toBe(true);
    });

    test('should require auth for export command', () => {
      expect(auth.isAuthRequired('export')).toBe(true);
    });

    test('should require auth for apply command', () => {
      expect(auth.isAuthRequired('apply')).toBe(true);
    });
  });
});