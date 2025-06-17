import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('End-to-End Tests with Woodhouse PRs', () => {
  const CLI_PATH = join(__dirname, '..', 'bin', 'cli.js');
  
  describe('Basic CLI', () => {
    test('should show version', () => {
      const output = execSync(`node ${CLI_PATH} --version`, {
        encoding: 'utf-8'
      });
      
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should show help', () => {
      const output = execSync(`node ${CLI_PATH} --help`, {
        encoding: 'utf-8'
      });
      
      expect(output).toContain('pr-vibe');
      expect(output).toContain('Commands:');
    });
  });

  describe.skip('PR Analysis (requires real PR)', () => {
    // These tests require actual GitHub PR access
    // Skip in CI but can be run locally with real PR numbers
    
    test('should analyze PR with bot comments', () => {
      // Example: pr-vibe pr 123 --repo owner/repo
      expect(true).toBe(true);
    });
  });

  describe('Pattern Learning', () => {
    test('should have init-patterns command', () => {
      const output = execSync(`node ${CLI_PATH} --help`, {
        encoding: 'utf-8'
      });
      
      expect(output).toContain('init-patterns');
    });
  });
});