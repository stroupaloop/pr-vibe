import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { runDemo } from '../lib/demo.js';
import { demoPRData, demoPatterns, demoBotResponses, getDemoSummary } from '../lib/demo-data.js';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Demo Mode', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  describe('Demo Data', () => {
    test('should have valid demo PR data', () => {
      expect(demoPRData).toBeDefined();
      expect(demoPRData.number).toBe(42);
      expect(demoPRData.title).toBeTruthy();
      expect(demoPRData.comments).toHaveLength(5);
      
      // Verify all comments have required fields
      demoPRData.comments.forEach(comment => {
        expect(comment.id).toBeDefined();
        expect(comment.user.login).toMatch(/\[bot\]$/);
        expect(comment.body).toBeTruthy();
        expect(comment.path).toBeTruthy();
        expect(comment.line).toBeGreaterThan(0);
      });
    });

    test('should have valid demo patterns', () => {
      expect(demoPatterns.version).toBe('1.0');
      expect(demoPatterns.valid_patterns).toHaveLength(2);
      expect(demoPatterns.auto_fixes).toHaveLength(1);
      
      // Verify pattern structure
      demoPatterns.valid_patterns.forEach(pattern => {
        expect(pattern.id).toBeTruthy();
        expect(pattern.pattern).toBeTruthy();
        expect(pattern.reason).toBeTruthy();
        expect(pattern.confidence).toBeGreaterThan(0);
      });
    });

    test('should have responses for all demo comments', () => {
      demoPRData.comments.forEach(comment => {
        expect(demoBotResponses[comment.id]).toBeDefined();
        expect(demoBotResponses[comment.id].decision).toMatch(/AUTO_FIX|REJECT|DEFER|ESCALATE/);
        expect(demoBotResponses[comment.id].response).toBeTruthy();
      });
    });

    test('should calculate correct summary', () => {
      const summary = getDemoSummary();
      expect(summary.total_comments).toBe(5);
      expect(summary.auto_fixed).toBe(1);
      expect(summary.rejected_with_explanation).toBe(2);
      expect(summary.deferred).toBe(1);
      expect(summary.escalated).toBe(1);
      expect(summary.time_saved_minutes).toBe(18);
      expect(summary.patterns_learned).toBe(2);
    });
  });

  describe('Demo Execution', () => {
    test('should run demo without errors', async () => {
      await expect(runDemo({ fast: true })).resolves.not.toThrow();
    });

    test('should display welcome message', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Welcome to pr-vibe!');
      expect(output).toContain('Let\'s see how it handles bot comments');
    });

    test('should show PR information', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('PR #42');
      expect(output).toContain(demoPRData.title);
      expect(output).toContain('awesome-app/backend');
    });

    test('should display all bot comments', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      demoPRData.comments.forEach(comment => {
        expect(output).toContain(comment.user.login);
        // Check that at least part of the comment body is shown
        expect(output).toContain(comment.body.substring(0, 30));
      });
    });

    test('should show decision outcomes', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('AUTO_FIX');
      expect(output).toContain('REJECT');
      expect(output).toContain('DEFER');
      expect(output).toContain('ESCALATE');
    });

    test('should display summary statistics', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Time saved: 18 minutes');
      expect(output).toContain('Auto-fixed: 1');
      expect(output).toContain('Explained: 2');
      expect(output).toContain('Patterns learned: 2');
    });

    test('should show call to action', async () => {
      await runDemo({ fast: true });
      
      const output = mockConsoleLog.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Ready to try on your own PRs?');
      expect(output).toContain('npm install -g pr-vibe');
      expect(output).toContain('pr-vibe auth');
      expect(output).toContain('pr-vibe pr <number>');
    });
  });
});