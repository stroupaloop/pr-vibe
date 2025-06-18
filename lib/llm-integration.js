import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export class LLMService {
  constructor(provider = 'openai', apiKey = null) {
    this.provider = provider;
    
    // Try to load API key from various sources
    if (!apiKey) {
      apiKey = this.loadApiKey(provider);
    }
    
    if (!apiKey) {
      throw new Error(`No API key found for ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.`);
    }
    
    // Initialize the appropriate client
    switch (provider) {
    case 'openai':
      this.client = new OpenAI({ apiKey });
      break;
    case 'anthropic':
      this.client = new Anthropic({ apiKey });
      break;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
  
  loadApiKey(provider) {
    // Try environment variable first
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (envKey) return envKey;
    
    // Try config file
    try {
      const configPath = join(homedir(), '.pr-review-config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config[`${provider}ApiKey`];
    } catch {
      // Config file doesn't exist or is invalid
    }
    
    return null;
  }
  
  async analyzeComment(comment, projectContext) {
    const prompt = this.buildPrompt(comment, projectContext);
    
    try {
      if (this.provider === 'openai') {
        return await this.analyzeWithOpenAI(prompt);
      } else if (this.provider === 'anthropic') {
        return await this.analyzeWithAnthropic(prompt);
      }
    } catch (error) {
      console.error(`LLM analysis failed: ${error.message}`);
      return {
        action: 'DISCUSS',
        reason: 'LLM analysis failed, manual review needed',
        confidence: 0.0
      };
    }
  }
  
  buildPrompt(comment, projectContext) {
    return `You are an expert code reviewer helping to process PR feedback.

PROJECT CONTEXT:
${projectContext.projectName || 'Unknown project'}
${projectContext.validPatterns ? `Valid patterns in this project:\n${projectContext.validPatterns.join('\n')}` : ''}

COMMENT TO ANALYZE:
Author: ${comment.author}
File: ${comment.path || 'General comment'}
Line: ${comment.line || 'N/A'}
Body: ${comment.body}

Based on this comment, determine the appropriate action:
1. AUTO_FIX - This is a clear issue that should be fixed (security, bugs, typos)
2. REJECT - This suggestion conflicts with project patterns (e.g., console.log in Lambda is valid)
3. DISCUSS - This needs human input (architecture changes, business logic)
4. DEFER - Valid improvement but not urgent (can be backlogged)

Respond with JSON containing:
{
  "action": "AUTO_FIX|REJECT|DISCUSS|DEFER",
  "reason": "Brief explanation",
  "suggestedFix": "Code to fix the issue (if AUTO_FIX)",
  "confidence": 0.0-1.0
}`;
  }
  
  async analyzeWithOpenAI(prompt) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a code review assistant. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  async analyzeWithAnthropic(prompt) {
    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.3,
      system: 'You are a code review assistant. Always respond with valid JSON.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Claude returns text, so we need to parse it
    const content = response.content[0].text;
    return JSON.parse(content);
  }
  
  async generateReply(comment, decision, context) {
    const prompt = `Generate a professional PR comment reply for this decision:

ORIGINAL COMMENT: ${comment.body}
DECISION: ${decision.action}
REASON: ${decision.reason}
${decision.suggestedFix ? `SUGGESTED FIX:\n${decision.suggestedFix}` : ''}

Write a brief, friendly reply that:
1. Acknowledges the feedback
2. Explains the decision clearly
3. Is respectful and collaborative
4. Uses emoji sparingly and appropriately

Keep it under 3 sentences.`;

    try {
      if (this.provider === 'openai') {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200
        });
        return response.choices[0].message.content.trim();
      } else {
        const response = await this.client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].text.trim();
      }
    } catch (error) {
      // Fallback to template-based reply
      return this.generateTemplateReply(decision);
    }
  }
  
  generateTemplateReply(decision) {
    const templates = {
      AUTO_FIX: 'Thanks for catching this! I\'ll apply the fix right away. ✅',
      REJECT: `Thanks for the feedback. ${decision.reason} In this project, this pattern is intentional and valid.`,
      DISCUSS: `Good point! ${decision.reason} Let's discuss the best approach here. @stroupaloop what do you think?`,
      DEFER: `Valid suggestion! ${decision.reason} I've added this to our backlog for future improvement. 📝`
    };
    
    return templates[decision.action] || 'Thanks for the feedback. I\'ll look into this.';
  }
}

// Export a factory function for easy use
export function createLLMService(provider, apiKey) {
  return new LLMService(provider, apiKey);
}