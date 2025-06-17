import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { join } from 'path';

describe('End-to-End Tests with Woodhouse PRs', () => {
  const CLI_PATH = join(__dirname, '..', 'cli.js');
  
  describe('PR #18 - Security Test Files', () => {
    test('should detect and suggest fixes for hardcoded API keys', () => {
      const output = execSync(`node ${CLI_PATH} pr 18 --json`, {
        encoding: 'utf-8'
      });
      
      const result = JSON.parse(output);
      
      // Should find the hardcoded API key issue
      const apiKeyIssue = result.issues.find(i => 
        i.type === 'SECURITY' && i.description.includes('API key')
      );
      
      expect(apiKeyIssue).toBeDefined();
      expect(apiKeyIssue.action).toBe('AUTO_FIX');
      expect(apiKeyIssue.fix).toContain('process.env.API_KEY');
    });

    test('should reject valid console.log patterns', () => {
      const output = execSync(`node ${CLI_PATH} pr 18 --json`, {
        encoding: 'utf-8'
      });
      
      const result = JSON.parse(output);
      
      // Should reject console.log in Lambda as valid
      const consoleLogIssue = result.issues.find(i => 
        i.description.includes('console.log') && 
        i.file.includes('mixed-issues.js')
      );
      
      expect(consoleLogIssue).toBeDefined();
      expect(consoleLogIssue.action).toBe('REJECT');
      expect(consoleLogIssue.reason).toContain('CloudWatch');
    });

    test('should handle conversation threads', () => {
      // This tests our ability to follow CodeRabbit conversations
      const output = execSync(`node ${CLI_PATH} pr 18 --show-threads --json`, {
        encoding: 'utf-8'
      });
      
      const result = JSON.parse(output);
      
      expect(result.threads).toBeDefined();
      expect(result.threads.length).toBeGreaterThan(0);
      
      // Check if we maintain context
      const threadWithReplies = result.threads.find(t => t.comments.length > 1);
      if (threadWithReplies) {
        expect(threadWithReplies.context).toBeDefined();
      }
    });
  });

  describe('Decision Validation', () => {
    test('should categorize issues correctly', () => {
      const expectedDecisions = {
        'hardcoded api key': 'AUTO_FIX',
        'sql injection': 'AUTO_FIX',
        'console.log in lambda': 'REJECT',
        'missing validation': 'AUTO_FIX',
        'complex refactoring': 'DISCUSS',
        'any type for webhook': 'REJECT'
      };
      
      Object.entries(expectedDecisions).forEach(([issue, expectedAction]) => {
        const decision = getDecisionForIssue(issue);
        expect(decision.action).toBe(expectedAction);
      });
    });
  });

  describe('Claude Code Integration', () => {
    test('should prepare context files for Claude Code', () => {
      execSync(`node ${CLI_PATH} pr 18 --prepare-for-claude`, {
        encoding: 'utf-8'
      });
      
      // Check if context files were created
      const contextFile = '.pr-review/current-task.json';
      expect(fs.existsSync(contextFile)).toBe(true);
      
      const context = JSON.parse(fs.readFileSync(contextFile, 'utf-8'));
      expect(context.issues).toBeDefined();
      expect(context.suggestedFixes).toBeDefined();
    });
  });
});