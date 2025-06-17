import { describe, test, expect, jest } from '@jest/globals';
import { processWithLLM } from '../lib/llm.js';

describe('LLM Integration', () => {
  describe('processWithLLM', () => {
    test('should AUTO_FIX hardcoded API keys', async () => {
      const comments = [{
        body: 'Found hardcoded API key in the code',
        user: { login: 'coderabbit[bot]' }
      }];
      
      const result = await processWithLLM(comments);
      
      expect(result.decision).toBe('AUTO_FIX');
      expect(result.reason).toContain('Security issue');
      expect(result.suggestedFix).toContain('process.env');
    });

    test('should REJECT valid console.log in Lambda', async () => {
      const comments = [{
        body: 'Remove console.log from Lambda function',
        user: { login: 'coderabbit[bot]' }
      }];
      
      const result = await processWithLLM(comments);
      
      expect(result.decision).toBe('REJECT');
      expect(result.reason).toContain('CloudWatch logging');
    });

    test('should AUTO_FIX SQL injection vulnerabilities', async () => {
      const comments = [{
        body: 'Potential SQL injection vulnerability detected',
        user: { login: 'deepsource[bot]' }
      }];
      
      const result = await processWithLLM(comments);
      
      expect(result.decision).toBe('AUTO_FIX');
      expect(result.reason).toContain('Critical security');
      expect(result.suggestedFix).toContain('parameterized');
    });

    test('should DISCUSS for unclear feedback', async () => {
      const comments = [{
        body: 'Consider refactoring this method',
        user: { login: 'coderabbit[bot]' }
      }];
      
      const result = await processWithLLM(comments);
      
      expect(result.decision).toBe('DISCUSS');
      expect(result.reason).toContain('more context');
    });
  });
});