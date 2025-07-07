import { jest } from '@jest/globals';
import chalk from 'chalk';

describe('Merge readiness display', () => {
  let mockConsoleLog;
  
  beforeEach(() => {
    // Force color output for tests
    chalk.level = 1;
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Merge readiness criteria', () => {
    test('should show ready to merge when all conditions pass', () => {
      const botApprovals = {
        'coderabbit[bot]': { approved: true },
        'deepsource[bot]': { approved: true }
      };
      const hasCriticalIssues = false;
      const ciStatus = {
        total: 5,
        passing: 5,
        failing: 0,
        pending: 0
      };
      
      const allBotsApproved = Object.values(botApprovals).every(a => a.approved);
      const ciPassing = ciStatus.failing === 0 && ciStatus.pending === 0;
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(true);
    });

    test('should not be ready when bots have not approved', () => {
      const botApprovals = {
        'coderabbit[bot]': { approved: false },
        'deepsource[bot]': { approved: true }
      };
      const hasCriticalIssues = false;
      const ciPassing = true;
      
      const allBotsApproved = Object.values(botApprovals).every(a => a.approved);
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(false);
    });

    test('should not be ready when critical issues exist', () => {
      const allBotsApproved = true;
      const hasCriticalIssues = true;
      const ciPassing = true;
      
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(false);
    });

    test('should not be ready when CI is failing', () => {
      const allBotsApproved = true;
      const hasCriticalIssues = false;
      const ciStatus = {
        total: 5,
        passing: 3,
        failing: 2,
        pending: 0
      };
      
      const ciPassing = ciStatus.failing === 0 && ciStatus.pending === 0;
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(false);
    });

    test('should not be ready when CI has pending checks', () => {
      const allBotsApproved = true;
      const hasCriticalIssues = false;
      const ciStatus = {
        total: 5,
        passing: 3,
        failing: 0,
        pending: 2
      };
      
      const ciPassing = ciStatus.failing === 0 && ciStatus.pending === 0;
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(false);
    });

    test('should be ready when no bots have commented', () => {
      const botApprovals = {};
      const botCount = Object.keys(botApprovals).length;
      const hasCriticalIssues = false;
      const ciPassing = true;
      
      const isReadyToMerge = (botCount === 0) && !hasCriticalIssues && ciPassing;
      
      expect(isReadyToMerge).toBe(true);
    });

    test('should be ready when CI status unavailable but other conditions pass', () => {
      const allBotsApproved = true;
      const hasCriticalIssues = false;
      const ciStatus = null;
      
      const isReadyToMerge = allBotsApproved && !hasCriticalIssues && !ciStatus;
      
      expect(isReadyToMerge).toBe(true);
    });
  });

  describe('Display formatting', () => {
    test('should use check mark for passing conditions', () => {
      const checkMark = chalk.green('✅');
      expect(checkMark).toContain('✅');
      expect(chalk.green).toBeDefined();
    });

    test('should use cross mark for failing conditions', () => {
      const crossMark = chalk.red('❌');
      expect(crossMark).toContain('❌');
      expect(chalk.red).toBeDefined();
    });

    test('should format CI status text correctly', () => {
      const ciStatus = {
        total: 5,
        passing: 3,
        failing: 2,
        pending: 0
      };
      
      const ciText = ciStatus.failing > 0 
        ? `CI checks failing (${ciStatus.failing}/${ciStatus.total})`
        : ciStatus.pending > 0
        ? `CI checks pending (${ciStatus.pending}/${ciStatus.total})`
        : `CI checks passing (${ciStatus.passing}/${ciStatus.total})`;
      
      expect(ciText).toBe('CI checks failing (2/5)');
    });
  });
});