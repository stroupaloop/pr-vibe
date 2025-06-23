import { describe, it, expect, beforeEach } from '@jest/globals';
import { BotDetector } from '../lib/bot-detector.js';
import { analyzeComment } from '../lib/decision-engine.js';

describe('Claude Code Integration', () => {
  let botDetector;
  
  beforeEach(() => {
    botDetector = new BotDetector();
  });
  
  describe('Bot Detection', () => {
    it('should detect Claude Code bot by various patterns', () => {
      const patterns = [
        'claude-code',
        'ClaudeCode',
        'claude[bot]',
        'claudecode[bot]',
        '@claude'
      ];
      
      patterns.forEach(username => {
        const result = botDetector.detectBot(username);
        expect(result.isBot).toBe(true);
        expect(result.botType).toBe('claudeCode');
        expect(result.confidence).toBe(0.95);
      });
    });
    
    it('should not detect regular Claude mentions as bot', () => {
      const result = botDetector.detectBot('regular-user-claude');
      expect(result.isBot).toBe(false);
    });
  });
  
  describe('Claude Code Review Parsing', () => {
    it('should extract confidence percentage', () => {
      const review = `
        This change looks problematic (85% confidence).
        The API key is hardcoded which is a security risk.
      `;
      
      const result = botDetector.parseClaudeCodeReview(review);
      expect(result.confidence).toBe(0.85);
    });
    
    it('should extract category tags', () => {
      const categories = ['MUST_FIX', 'SUGGESTION', 'NITPICK', 'FACT', 'INFERENCE', 'GUESS'];
      
      categories.forEach(category => {
        const review = `${category}: This needs attention`;
        const result = botDetector.parseClaudeCodeReview(review);
        expect(result.category).toBe(category);
      });
    });
    
    it('should extract priority levels', () => {
      const priorities = ['critical', 'high', 'medium', 'low'];
      
      priorities.forEach(priority => {
        const review = `This is a ${priority} priority issue`;
        const result = botDetector.parseClaudeCodeReview(review);
        expect(result.priority).toBe(priority);
      });
    });
    
    it('should detect approval patterns', () => {
      const approvals = [
        'LGTM!',
        'Looks good to me',
        'I approve these changes',
        'approve'
      ];
      
      approvals.forEach(approval => {
        const result = botDetector.parseClaudeCodeReview(approval);
        expect(result.hasApproval).toBe(true);
      });
    });
    
    it('should detect @claude mentions', () => {
      const review = 'Hey @claude, can you look at this?';
      const result = botDetector.parseClaudeCodeReview(review);
      expect(result.hasMention).toBe(true);
    });
  });
  
  describe('Decision Engine Integration', () => {
    it('should skip LLM analysis for Claude Code comments', () => {
      const comment = {
        author: 'claude-code[bot]',
        body: 'MUST_FIX: SQL injection vulnerability (95% confidence)',
        claudeAnalysis: {
          category: 'MUST_FIX',
          priority: 'critical',
          confidence: 95
        }
      };
      
      const result = analyzeComment(comment);
      expect(result.action).toBe('AUTO_FIX');
      expect(result.skipLLMAnalysis).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toBe('Claude Code has already analyzed this issue');
    });
    
    it('should map Claude categories to pr-vibe actions', () => {
      const mappings = [
        { category: 'MUST_FIX', expectedAction: 'AUTO_FIX' },
        { category: 'SUGGESTION', expectedAction: 'DEFER' },
        { category: 'NITPICK', expectedAction: 'NIT' }
      ];
      
      mappings.forEach(({ category, expectedAction }) => {
        const comment = {
          author: 'claude[bot]',
          body: `${category}: Some issue`,
          claudeAnalysis: { category, confidence: 80 }
        };
        
        const result = analyzeComment(comment);
        expect(result.action).toBe(expectedAction);
      });
    });
  });
  
  describe('Should Process Logic', () => {
    it('should process Claude Code comments with actionable items', () => {
      const result = botDetector.shouldProcessComment(
        'claude-code[bot]',
        'MUST_FIX: Security vulnerability detected (90% confidence)'
      );
      
      expect(result.process).toBe(true);
      expect(result.details.botType).toBe('claudeCode');
    });
    
    it('should handle Claude Code approvals', () => {
      const result = botDetector.shouldProcessComment(
        'claude[bot]',
        'LGTM! The changes look good. (95% confidence)'
      );
      
      expect(result.process).toBe(true);
      expect(result.details.parsedContent.hasApproval).toBe(true);
    });
  });
  
  describe('Real-world Claude Code Comments', () => {
    it('should parse complex Claude Code review', () => {
      const review = `
        MUST_FIX: SQL Injection Vulnerability (95% confidence - FACT)
        
        The current implementation is vulnerable to SQL injection:
        \`\`\`javascript
        const query = \`SELECT * FROM users WHERE id = \${userId}\`;
        \`\`\`
        
        High priority security issue that needs immediate attention.
        
        Suggested fix:
        \`\`\`javascript
        const query = 'SELECT * FROM users WHERE id = ?';
        db.query(query, [userId]);
        \`\`\`
      `;
      
      const parsed = botDetector.parseClaudeCodeReview(review);
      expect(parsed.category).toBe('MUST_FIX');
      expect(parsed.confidence).toBe(0.95);
      expect(parsed.priority).toBe('high');
    });
    
    it('should parse Claude Code suggestion', () => {
      const review = `
        SUGGESTION: Consider using TypeScript (70% confidence - INFERENCE)
        
        Based on the complexity of this codebase, migrating to TypeScript
        could help catch type-related bugs early. This is a medium priority
        enhancement that could improve code quality.
      `;
      
      const parsed = botDetector.parseClaudeCodeReview(review);
      expect(parsed.category).toBe('SUGGESTION');
      expect(parsed.confidence).toBe(0.70);
      expect(parsed.priority).toBe('medium');
    });
  });
});