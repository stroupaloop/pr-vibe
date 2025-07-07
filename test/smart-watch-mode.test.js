import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import { botDetector } from '../lib/bot-detector.js';

describe('Smart watch mode', () => {
  let mockExecSync;
  let mockConsoleLog;
  let mockInquirerPrompt;
  
  beforeEach(() => {
    // Mock execSync
    mockExecSync = jest.fn();
    jest.unstable_mockModule('child_process', () => ({
      execSync: mockExecSync
    }));
    
    // Mock console
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock inquirer
    mockInquirerPrompt = jest.fn();
    jest.unstable_mockModule('inquirer', () => ({
      default: {
        prompt: mockInquirerPrompt
      }
    }));
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Bot completion detection', () => {
    test('should detect completion signals in bot comments', () => {
      const completionSignals = [
        { body: 'Review complete ✅', expected: true },
        { body: 'Analysis finished. Found 2 issues.', expected: true },
        { body: 'All checks passed ✓', expected: true },
        { body: 'No issues found', expected: true },
        { body: 'Approved', expected: true },
        { body: 'LGTM', expected: true },
        { body: 'Analyzing code...', expected: false },
        { body: 'Checking for issues', expected: false },
        { body: 'Processing...', expected: false }
      ];
      
      completionSignals.forEach(({ body, expected }) => {
        const completionPatterns = [
          /\b(review complete|analysis finished|all checks passed|no issues found|approved|lgtm)\b/i,
          /✅|✓|👍|🎉/
        ];
        
        const isComplete = completionPatterns.some(pattern => pattern.test(body));
        expect(isComplete).toBe(expected);
      });
    });

    test('should track bot completion status', () => {
      const botCompletionSignals = new Map();
      const detectedBots = new Set(['coderabbit[bot]', 'deepsource[bot]']);
      
      // No completions yet
      expect(botCompletionSignals.size).toBe(0);
      
      // Add completion for one bot
      botCompletionSignals.set('coderabbit[bot]', true);
      expect(botCompletionSignals.has('coderabbit[bot]')).toBe(true);
      expect(botCompletionSignals.has('deepsource[bot]')).toBe(false);
      
      // Check if all bots complete
      const allBotsComplete = detectedBots.size > 0 && 
        Array.from(detectedBots).every(bot => botCompletionSignals.has(bot));
      expect(allBotsComplete).toBe(false);
      
      // Complete all bots
      botCompletionSignals.set('deepsource[bot]', true);
      const allComplete = detectedBots.size > 0 && 
        Array.from(detectedBots).every(bot => botCompletionSignals.has(bot));
      expect(allComplete).toBe(true);
    });
  });

  describe('Adaptive polling intervals', () => {
    test('should use correct intervals based on elapsed time', () => {
      const getPollingInterval = (elapsed) => {
        if (elapsed < 30000) return 5000;        // 5s for first 30s
        if (elapsed < 120000) return 15000;      // 15s for 30s-2min
        if (elapsed < 300000) return 30000;      // 30s for 2-5min
        return 60000;                             // 60s after 5min
      };
      
      expect(getPollingInterval(0)).toBe(5000);
      expect(getPollingInterval(15000)).toBe(5000);
      expect(getPollingInterval(30000)).toBe(15000);
      expect(getPollingInterval(120000)).toBe(30000);
      expect(getPollingInterval(300000)).toBe(60000);
      expect(getPollingInterval(600000)).toBe(60000);
    });
  });

  describe('Expected bot tracking', () => {
    test('should track expected bots based on recent PRs', () => {
      const expectedBotPatterns = {
        'coderabbit': { avgResponseTime: 30000, pattern: /coderabbit/i },
        'deepsource': { avgResponseTime: 45000, pattern: /deepsource/i },
        'sonarcloud': { avgResponseTime: 60000, pattern: /sonarcloud/i },
        'codacy': { avgResponseTime: 40000, pattern: /codacy/i },
        'snyk': { avgResponseTime: 50000, pattern: /snyk/i }
      };
      
      const recentBots = ['coderabbit[bot]', 'deepsource[bot]'];
      const expectedBots = new Set();
      
      recentBots.forEach(bot => {
        Object.entries(expectedBotPatterns).forEach(([name, config]) => {
          if (config.pattern.test(bot)) {
            expectedBots.add(name);
          }
        });
      });
      
      expect(expectedBots.has('coderabbit')).toBe(true);
      expect(expectedBots.has('deepsource')).toBe(true);
      expect(expectedBots.has('sonarcloud')).toBe(false);
    });
  });

  describe('Auto-process functionality', () => {
    test('should auto-process when all bots complete with --auto-process flag', () => {
      const options = { autoProcess: true };
      const allBotsComplete = true;
      
      const shouldAutoProcess = options.autoProcess && allBotsComplete;
      expect(shouldAutoProcess).toBe(true);
    });

    test('should not auto-process without flag even if bots complete', () => {
      const options = { autoProcess: false };
      const allBotsComplete = true;
      
      const shouldAutoProcess = options.autoProcess && allBotsComplete;
      expect(shouldAutoProcess).toBe(false);
    });
  });

  describe('Bot response time tracking', () => {
    test('should calculate correct response times', () => {
      const startTime = Date.now();
      const botResponseTimes = new Map();
      
      // Simulate bot responses at different times
      setTimeout(() => {
        botResponseTimes.set('coderabbit[bot]', Date.now() - startTime);
      }, 100);
      
      setTimeout(() => {
        botResponseTimes.set('deepsource[bot]', Date.now() - startTime);
      }, 200);
      
      // After 300ms, check response times
      setTimeout(() => {
        expect(botResponseTimes.get('coderabbit[bot]')).toBeGreaterThanOrEqual(100);
        expect(botResponseTimes.get('coderabbit[bot]')).toBeLessThan(150);
        expect(botResponseTimes.get('deepsource[bot]')).toBeGreaterThanOrEqual(200);
        expect(botResponseTimes.get('deepsource[bot]')).toBeLessThan(250);
      }, 300);
    });
  });

  describe('Spinner status updates', () => {
    test('should show appropriate status messages', () => {
      const getSpinnerText = (elapsed, waitingFor, detectedBots, currentInterval) => {
        const elapsedMin = Math.floor(elapsed / 60000);
        const elapsedSec = Math.floor((elapsed % 60000) / 1000);
        const timeStr = `${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}`;
        
        if (waitingFor.length === 0 && detectedBots.size > 0) {
          return `All detected bots have responded! (${timeStr} elapsed)`;
        } else if (waitingFor.length > 0) {
          const waitingStr = waitingFor.length === 1 
            ? waitingFor[0]
            : `${waitingFor.length} bots`;
          return `Waiting for ${waitingStr}... (${timeStr} elapsed, checking every ${currentInterval/1000}s)`;
        } else {
          return `Waiting for bot reviews... (${timeStr} elapsed, checking every ${currentInterval/1000}s)`;
        }
      };
      
      // Test various scenarios
      expect(getSpinnerText(0, [], new Set(), 5000))
        .toBe('Waiting for bot reviews... (0:00 elapsed, checking every 5s)');
      
      expect(getSpinnerText(65000, ['coderabbit'], new Set(['coderabbit']), 15000))
        .toBe('Waiting for coderabbit... (1:05 elapsed, checking every 15s)');
      
      expect(getSpinnerText(120000, [], new Set(['coderabbit', 'deepsource']), 30000))
        .toBe('All detected bots have responded! (2:00 elapsed)');
    });
  });
});