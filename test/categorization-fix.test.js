import { describe, it, expect } from '@jest/globals';
import { categorizeIssue, generateCommitMessageForCategory, generateAccurateDescription } from '../lib/decision-engine.js';

describe('Issue Categorization Fix', () => {
  describe('categorizeIssue', () => {
    it('should categorize type-only import issues as STYLE, not SECURITY', () => {
      const typeImportIssue = 'Prefer type-only import for TypeBox types. Using regular imports for types can lead to unnecessary runtime dependencies.';
      const category = categorizeIssue(typeImportIssue);
      expect(category).toBe('STYLE');
      expect(category).not.toBe('SECURITY');
    });

    it('should categorize empty catch blocks as CODE_QUALITY, not SECURITY', () => {
      const emptyCatchIssue = 'Avoid empty catch blocks. Empty catch blocks can hide errors. At least add a comment explaining why errors are being ignored.';
      const category = categorizeIssue(emptyCatchIssue);
      expect(category).toBe('CODE_QUALITY');
      expect(category).not.toBe('SECURITY');
    });

    it('should categorize console.log as DEBUG, not SECURITY', () => {
      const consoleLogIssue = 'Remove console.log statements or replace with proper logging.';
      const category = categorizeIssue(consoleLogIssue);
      expect(category).toBe('DEBUG');
      expect(category).not.toBe('SECURITY');
    });

    it('should still categorize actual security issues correctly', () => {
      const securityIssue1 = 'Hardcoded API key detected. This exposes sensitive credentials.';
      expect(categorizeIssue(securityIssue1)).toBe('SECURITY');

      const securityIssue2 = 'SQL injection vulnerability detected in query construction.';
      expect(categorizeIssue(securityIssue2)).toBe('SECURITY');

      const securityIssue3 = 'Missing authentication check on sensitive endpoint.';
      expect(categorizeIssue(securityIssue3)).toBe('SECURITY');
    });

    it('should not categorize auth in file paths as SECURITY', () => {
      const pathIssue = 'Update imports in src/auth/login.ts file';
      const category = categorizeIssue(pathIssue);
      expect(category).not.toBe('SECURITY');
    });

    it('should categorize ESLint/formatting issues as STYLE', () => {
      const eslintIssue = 'ESLint: Missing semicolon at end of statement';
      expect(categorizeIssue(eslintIssue)).toBe('STYLE');

      const formattingIssue = 'Incorrect indentation, expected 2 spaces but found 4';
      expect(categorizeIssue(formattingIssue)).toBe('STYLE');
    });
  });

  describe('generateCommitMessageForCategory', () => {
    it('should generate style commit message for STYLE category', () => {
      const message = generateCommitMessageForCategory('STYLE', 'type import issue');
      expect(message).toBe('style: Apply code formatting and style improvements');
      expect(message).not.toContain('security');
    });

    it('should generate chore commit message for DEBUG category', () => {
      const message = generateCommitMessageForCategory('DEBUG', 'console.log issue');
      expect(message).toBe('chore: Remove debug statements and console logs');
      expect(message).not.toContain('security');
    });

    it('should generate refactor commit message for CODE_QUALITY category', () => {
      const message = generateCommitMessageForCategory('CODE_QUALITY', 'empty catch block');
      expect(message).toBe('refactor: Improve code quality and maintainability');
      expect(message).not.toContain('security');
    });

    it('should generate security commit message only for SECURITY category', () => {
      const message = generateCommitMessageForCategory('SECURITY', 'api key exposure');
      expect(message).toBe('security: Fix security vulnerabilities');
    });
  });

  describe('generateAccurateDescription', () => {
    it('should generate accurate descriptions for STYLE issues', () => {
      const desc1 = generateAccurateDescription('STYLE', 'Prefer type-only import for types');
      expect(desc1).toBe('Convert to type-only imports for better tree-shaking');

      const desc2 = generateAccurateDescription('STYLE', 'Fix indentation issues');
      expect(desc2).toBe('Fix code formatting and indentation');
    });

    it('should generate accurate descriptions for DEBUG issues', () => {
      const desc1 = generateAccurateDescription('DEBUG', 'Remove console.log statements');
      expect(desc1).toBe('Remove console.log statements');

      const desc2 = generateAccurateDescription('DEBUG', 'Clean up debug code');
      expect(desc2).toBe('Remove debug code');
    });

    it('should generate accurate descriptions for CODE_QUALITY issues', () => {
      const desc1 = generateAccurateDescription('CODE_QUALITY', 'Empty catch block detected');
      expect(desc1).toBe('Add error handling or comments to empty catch blocks');

      const desc2 = generateAccurateDescription('CODE_QUALITY', 'Remove unused variables');
      expect(desc2).toBe('Remove unused code');
    });

    it('should not mention security for non-security issues', () => {
      const styleDesc = generateAccurateDescription('STYLE', 'type import issue');
      expect(styleDesc).not.toContain('security');
      expect(styleDesc).not.toContain('vulnerability');

      const debugDesc = generateAccurateDescription('DEBUG', 'console.log issue');
      expect(debugDesc).not.toContain('security');
      expect(debugDesc).not.toContain('vulnerability');
    });
  });
});