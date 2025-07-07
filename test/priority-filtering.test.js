import { jest } from '@jest/globals';
import { PRIORITY_LEVELS, analyzeComment, getPriorityLevel } from '../lib/decision-engine.js';

describe('Priority filtering', () => {
  describe('Priority level assignment', () => {
    test('should assign must-fix priority to security issues', () => {
      const comment = {
        body: 'Hardcoded API key found in code',
        user: { login: 'coderabbit[bot]' }
      };
      
      const analysis = analyzeComment(comment);
      expect(analysis.priority).toBe(PRIORITY_LEVELS.MUST_FIX);
      expect(analysis.category).toBe('SECURITY');
    });

    test('should assign must-fix priority to critical issues', () => {
      const comment = {
        body: 'SQL injection vulnerability detected',
        user: { login: 'deepsource[bot]' }
      };
      
      const analysis = analyzeComment(comment);
      expect(analysis.priority).toBe(PRIORITY_LEVELS.MUST_FIX);
      expect(analysis.severity).toBe('CRITICAL');
    });

    test('should assign suggestion priority to code quality issues', () => {
      const comment = {
        body: 'Function is too complex, consider refactoring',
        user: { login: 'sonarcloud[bot]' }
      };
      
      const analysis = analyzeComment(comment);
      expect(analysis.priority).toBe(PRIORITY_LEVELS.SUGGESTION);
    });

    test('should assign nitpick priority to style issues', () => {
      const comment = {
        body: 'nit: Missing semicolon at end of line',
        user: { login: 'eslint[bot]' },
        isNit: true
      };
      
      const analysis = analyzeComment(comment);
      // When isNit is true, the decision engine assigns NITPICK priority
      expect(analysis.priority).toBe(PRIORITY_LEVELS.NITPICK);
      expect(analysis.action).toBe('NIT');
      
      // Test with explicit categorization
      const category = 'NITPICK';
      const priority = getPriorityLevel(category);
      expect(priority).toBe(PRIORITY_LEVELS.NITPICK);
    });
  });

  describe('Priority filtering logic', () => {
    test('should filter comments based on priority threshold', () => {
      const comments = [
        { priority: PRIORITY_LEVELS.MUST_FIX, body: 'Security issue' },
        { priority: PRIORITY_LEVELS.SUGGESTION, body: 'Code quality' },
        { priority: PRIORITY_LEVELS.NITPICK, body: 'Style issue' }
      ];
      
      const priorityOrder = [PRIORITY_LEVELS.MUST_FIX, PRIORITY_LEVELS.SUGGESTION, PRIORITY_LEVELS.NITPICK];
      
      // Filter: must-fix only
      const mustFixFilter = PRIORITY_LEVELS.MUST_FIX;
      const mustFixFiltered = comments.filter(c => {
        const filterIndex = priorityOrder.indexOf(mustFixFilter);
        const commentIndex = priorityOrder.indexOf(c.priority);
        return commentIndex <= filterIndex;
      });
      expect(mustFixFiltered).toHaveLength(1);
      expect(mustFixFiltered[0].priority).toBe(PRIORITY_LEVELS.MUST_FIX);
      
      // Filter: suggestions and above
      const suggestionFilter = PRIORITY_LEVELS.SUGGESTION;
      const suggestionFiltered = comments.filter(c => {
        const filterIndex = priorityOrder.indexOf(suggestionFilter);
        const commentIndex = priorityOrder.indexOf(c.priority);
        return commentIndex <= filterIndex;
      });
      expect(suggestionFiltered).toHaveLength(2);
      
      // Filter: all (nitpicks and above)
      const nitpickFilter = PRIORITY_LEVELS.NITPICK;
      const allFiltered = comments.filter(c => {
        const filterIndex = priorityOrder.indexOf(nitpickFilter);
        const commentIndex = priorityOrder.indexOf(c.priority);
        return commentIndex <= filterIndex;
      });
      expect(allFiltered).toHaveLength(3);
    });
  });

  describe('getPriorityLevel', () => {
    test('should map categories to correct priority levels', () => {
      expect(getPriorityLevel('SECURITY')).toBe(PRIORITY_LEVELS.MUST_FIX);
      expect(getPriorityLevel('CRITICAL')).toBe(PRIORITY_LEVELS.MUST_FIX);
      expect(getPriorityLevel('BREAKING')).toBe(PRIORITY_LEVELS.MUST_FIX);
      expect(getPriorityLevel('BUG')).toBe(PRIORITY_LEVELS.MUST_FIX);
      
      expect(getPriorityLevel('PERFORMANCE')).toBe(PRIORITY_LEVELS.SUGGESTION);
      expect(getPriorityLevel('CODE_QUALITY')).toBe(PRIORITY_LEVELS.SUGGESTION);
      expect(getPriorityLevel('TYPE_SAFETY')).toBe(PRIORITY_LEVELS.SUGGESTION);
      
      expect(getPriorityLevel('STYLE')).toBe(PRIORITY_LEVELS.NITPICK);
      expect(getPriorityLevel('DEBUG')).toBe(PRIORITY_LEVELS.NITPICK);
      expect(getPriorityLevel('NITPICK')).toBe(PRIORITY_LEVELS.NITPICK);
      
      expect(getPriorityLevel('UNKNOWN')).toBe(PRIORITY_LEVELS.SUGGESTION);
    });
  });

  describe('CLI option validation', () => {
    test('should validate priority threshold values', () => {
      const validLevels = Object.values(PRIORITY_LEVELS);
      
      expect(validLevels).toContain('must-fix');
      expect(validLevels).toContain('suggestion');
      expect(validLevels).toContain('nitpick');
      
      expect(validLevels).not.toContain('invalid-level');
    });

    test('should detect conflicts between critical-only and priority-threshold', () => {
      const options1 = { criticalOnly: true, priorityThreshold: 'suggestion' };
      const hasConflict1 = options1.criticalOnly && options1.priorityThreshold;
      expect(hasConflict1).toBeTruthy();
      
      const options2 = { criticalOnly: true };
      const hasConflict2 = options2.criticalOnly && options2.priorityThreshold;
      expect(hasConflict2).toBeFalsy();
    });
  });
});