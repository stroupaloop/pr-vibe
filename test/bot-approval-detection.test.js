import { botDetector } from '../lib/bot-detector.js';

describe('Bot approval detection', () => {
  describe('detectApproval', () => {
    test('should detect explicit approval keywords', () => {
      const result = botDetector.detectApproval('coderabbit[bot]', 'LGTM! This PR looks good to merge.');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('lgtm');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    test('should detect "approved" keyword', () => {
      const result = botDetector.detectApproval('deepsource[bot]', 'This PR is approved. No issues found.');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('approved');
    });

    test('should detect "looks good to me" phrase', () => {
      const result = botDetector.detectApproval('sonarcloud[bot]', 'Everything looks good to me. Ready to merge.');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('looks good to me');
    });

    test('should detect "no issues found" pattern', () => {
      const result = botDetector.detectApproval('snyk[bot]', 'Security scan complete. No issues detected.');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('no issues found');
    });

    test('should detect CodeRabbit-specific "0 actionable comments"', () => {
      const result = botDetector.detectApproval('coderabbit[bot]', 'I have reviewed this PR. Actionable comments posted: 0');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('0 actionable comments');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should detect emoji approval', () => {
      const result = botDetector.detectApproval('claude[bot]', '✅ Approved - All checks passed');
      expect(result.hasApproval).toBe(true);
      expect(result.signals).toContain('approved');
    });

    test('should override approval when blocking issues present', () => {
      const result = botDetector.detectApproval('coderabbit[bot]', 'Approved overall, but you must fix the security vulnerability first.');
      expect(result.hasApproval).toBe(false);
      expect(result.signals).toContain('has blocking issues');
      expect(result.confidence).toBe(0.95);
    });

    test('should not detect approval from human reviewers', () => {
      const result = botDetector.detectApproval('john-doe', 'LGTM! Great work.');
      expect(result.hasApproval).toBe(false);
      expect(result.confidence).toBe(0.95);
    });

    test('should handle multiple approval signals', () => {
      const result = botDetector.detectApproval('coderabbit[bot]', 'LGTM! This is approved and ready to merge. All checks passed.');
      expect(result.hasApproval).toBe(true);
      expect(result.signals.length).toBeGreaterThan(1);
      expect(result.signals).toContain('lgtm');
      expect(result.signals).toContain('approved');
    });
  });

  describe('extractIssueSummary', () => {
    test('should extract CodeRabbit actionable comments count', () => {
      const summary = botDetector.extractIssueSummary('coderabbit[bot]', 
        'Review completed. Actionable comments posted: 3. 2 suggestions, 1 critical issue.');
      expect(summary.total).toBe(3);
      expect(summary.suggestions).toBe(2);
      expect(summary.mustFix).toBe(1);
      expect(summary.confidence).toBe(0.95);
    });

    test('should extract DeepSource issue count', () => {
      const summary = botDetector.extractIssueSummary('deepsource[bot]', 
        'DeepSource found 5 issues in this pull request.');
      expect(summary.total).toBe(5);
      expect(summary.mustFix).toBe(5); // DeepSource issues are typically must-fix
      expect(summary.confidence).toBe(0.90);
    });

    test('should return null for human comments', () => {
      const summary = botDetector.extractIssueSummary('jane-doe', 
        'I found 3 issues that need to be fixed.');
      expect(summary).toBe(null);
    });

    test('should handle zero issues', () => {
      const summary = botDetector.extractIssueSummary('coderabbit[bot]', 
        'Great work! Actionable comments posted: 0');
      expect(summary.total).toBe(0);
      expect(summary.mustFix).toBe(0);
      expect(summary.suggestions).toBe(0);
    });

    test('should estimate breakdown when not provided', () => {
      const summary = botDetector.extractIssueSummary('coderabbit[bot]', 
        'Actionable comments posted: 5');
      expect(summary.total).toBe(5);
      expect(summary.suggestions).toBe(5); // Default to suggestions when no breakdown
    });
  });
});