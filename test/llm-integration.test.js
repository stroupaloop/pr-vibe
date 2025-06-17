import { describe, test, expect, jest } from '@jest/globals';
import { LLMAnalyzer, createAnalyzer } from '../lib/llm.js';

describe('LLM Integration', () => {
  describe('Provider Selection', () => {
    test('should create Claude analyzer', () => {
      const analyzer = createAnalyzer({
        provider: 'anthropic',
        apiKey: 'test-key'
      });
      
      expect(analyzer).toBeInstanceOf(ClaudeAnalyzer);
    });

    test('should create OpenAI analyzer', () => {
      const analyzer = createAnalyzer({
        provider: 'openai',
        apiKey: 'test-key'
      });
      
      expect(analyzer).toBeInstanceOf(OpenAIAnalyzer);
    });

    test('should handle local LLM', () => {
      const analyzer = createAnalyzer({
        provider: 'ollama',
        model: 'codellama'
      });
      
      expect(analyzer).toBeInstanceOf(LocalAnalyzer);
    });
  });

  describe('Prompt Building', () => {
    test('should include project context in prompt', () => {
      const analyzer = new LLMAnalyzer();
      const prompt = analyzer.buildPrompt({
        comment: { body: 'Security issue' },
        projectPatterns: ['console.log is valid in Lambda']
      });
      
      expect(prompt).toContain('console.log is valid in Lambda');
      expect(prompt).toContain('Security issue');
    });

    test('should include conversation history', () => {
      const analyzer = new LLMAnalyzer();
      const prompt = analyzer.buildPrompt({
        comment: { body: 'Latest comment' },
        thread: [
          { body: 'Original issue' },
          { body: 'First reply' }
        ]
      });
      
      expect(prompt).toContain('Original issue');
      expect(prompt).toContain('First reply');
      expect(prompt).toContain('Latest comment');
    });
  });

  describe('Response Parsing', () => {
    test('should parse AUTO_FIX response', () => {
      const mockResponse = {
        action: 'AUTO_FIX',
        fix: 'const API_KEY = process.env.API_KEY;',
        reason: 'Security vulnerability'
      };
      
      const parsed = parseLLMResponse(JSON.stringify(mockResponse));
      
      expect(parsed.action).toBe('AUTO_FIX');
      expect(parsed.fix).toBeDefined();
    });

    test('should handle malformed responses gracefully', () => {
      const malformed = 'This is not JSON';
      
      const parsed = parseLLMResponse(malformed);
      
      expect(parsed.action).toBe('ESCALATE');
      expect(parsed.reason).toContain('Failed to parse');
    });
  });
});