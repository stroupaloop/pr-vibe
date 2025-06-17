import { describe, test, expect, beforeAll } from '@jest/globals';
import { analyzeComment, categorizeIssue } from '../lib/decision-engine.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/pr18-comments.json'), 'utf-8'));

describe('Decision Engine', () => {
  describe('Security Issues', () => {
    test('should AUTO_FIX hardcoded API keys', () => {
      const comment = fixtures.comments[0]; // Hardcoded API key
      const decision = analyzeComment(comment);
      
      expect(decision.action).toBe('AUTO_FIX');
      expect(decision.severity).toBe('CRITICAL');
      expect(decision.suggestedFix).toContain('process.env');
      expect(decision.reason).toContain('security');
    });

    test('should AUTO_FIX SQL injection vulnerabilities', () => {
      const comment = fixtures.comments[1]; // SQL injection
      const decision = analyzeComment(comment);
      
      expect(decision.action).toBe('AUTO_FIX');
      expect(decision.severity).toBe('CRITICAL');
      expect(decision.suggestedFix).toContain('parameterized');
      expect(decision.reason).toContain('security');
    });
  });

  describe('Valid Patterns', () => {
    test('should REJECT console.log in Lambda functions', () => {
      const comment = fixtures.comments[2]; // Console.log in Lambda
      const decision = analyzeComment(comment);
      
      expect(decision.action).toBe('REJECT');
      expect(decision.reason).toContain('CloudWatch');
      expect(decision.explanation).toContain('valid pattern');
    });

    test('should REJECT any types for complex webhooks', () => {
      const comment = {
        body: "Using 'any' type for Stripe webhook data",
        path: "handlers/stripe.ts"
      };
      const decision = analyzeComment(comment);
      
      expect(decision.action).toBe('REJECT');
      expect(decision.reason).toContain('complex external API');
    });
  });

  describe('Discussion Items', () => {
    test('should DISCUSS architectural changes', () => {
      const comment = {
        body: "Consider restructuring to use dependency injection",
        user: { login: "senior-dev" }
      };
      const decision = analyzeComment(comment);
      
      expect(decision.action).toBe('DISCUSS');
      expect(decision.suggestedReply).toContain('context');
    });
  });

  describe('Issue Categorization', () => {
    test('should correctly categorize security issues', () => {
      expect(categorizeIssue('hardcoded api key')).toBe('SECURITY');
      expect(categorizeIssue('sql injection')).toBe('SECURITY');
      expect(categorizeIssue('exposed credentials')).toBe('SECURITY');
    });

    test('should correctly categorize performance issues', () => {
      expect(categorizeIssue('n+1 query problem')).toBe('PERFORMANCE');
      expect(categorizeIssue('inefficient loop')).toBe('PERFORMANCE');
    });

    test('should correctly categorize code quality issues', () => {
      expect(categorizeIssue('unused variable')).toBe('CODE_QUALITY');
      expect(categorizeIssue('complex function')).toBe('CODE_QUALITY');
    });
  });
});