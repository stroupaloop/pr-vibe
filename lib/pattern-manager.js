import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';

export class PatternManager {
  constructor() {
    this.globalPatternsPath = join(homedir(), '.pr-bot', 'learned-patterns.json');
    this.ensureGlobalDirectory();
    this.patterns = this.loadPatterns();
  }
  
  ensureGlobalDirectory() {
    const dir = join(homedir(), '.pr-bot');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Load patterns with precedence:
   * 1. Repo-specific patterns (highest priority)
   * 2. Global learned patterns
   * 3. Default patterns (fallback)
   */
  loadPatterns() {
    const patterns = {
      repo: null,
      global: this.loadGlobalPatterns(),
      defaults: this.getDefaultPatterns()
    };
    
    // Try to load repo patterns
    const repoPatternsPath = join(process.cwd(), '.pr-bot', 'patterns.yml');
    if (existsSync(repoPatternsPath)) {
      try {
        patterns.repo = yaml.load(readFileSync(repoPatternsPath, 'utf-8'));
      } catch (error) {
        console.warn('Failed to load repo patterns:', error.message);
      }
    }
    
    return patterns;
  }
  
  loadGlobalPatterns() {
    if (!existsSync(this.globalPatternsPath)) {
      return this.initializeGlobalPatterns();
    }
    
    try {
      return JSON.parse(readFileSync(this.globalPatternsPath, 'utf-8'));
    } catch {
      return this.initializeGlobalPatterns();
    }
  }
  
  initializeGlobalPatterns() {
    const initial = {
      version: '1.0',
      last_updated: new Date().toISOString(),
      total_decisions: 0,
      learned_patterns: {},
      bot_profiles: {},
      effectiveness_metrics: {
        patterns_by_confidence: {},
        decision_accuracy: {},
        time_savings: {}
      }
    };
    
    this.saveGlobalPatterns(initial);
    return initial;
  }
  
  /**
   * Find matching pattern for a comment
   */
  findPattern(comment, context = {}) {
    // Check repo-specific patterns first
    if (this.patterns.repo?.valid_patterns) {
      const repoMatch = this.matchRepoPatterns(comment, context);
      if (repoMatch) return repoMatch;
    }
    
    // Check global learned patterns
    const globalMatch = this.matchGlobalPatterns(comment, context);
    if (globalMatch && globalMatch.confidence > 0.8) return globalMatch;
    
    // No pattern match found
    return null;
  }
  
  matchRepoPatterns(comment, context) {
    for (const pattern of this.patterns.repo.valid_patterns) {
      if (this.patternMatches(pattern, comment, context)) {
        return {
          source: 'repo',
          pattern: pattern,
          action: 'REJECT',
          reply: pattern.auto_reply,
          confidence: pattern.confidence || 1.0
        };
      }
    }
    
    // Check auto-fix patterns
    if (this.patterns.repo.auto_fixes) {
      for (const fix of this.patterns.repo.auto_fixes) {
        if (this.triggerMatches(fix.trigger, comment.body)) {
          return {
            source: 'repo',
            pattern: fix,
            action: 'AUTO_FIX',
            fix: this.generateFix(fix, comment),
            confidence: 1.0
          };
        }
      }
    }
    
    return null;
  }
  
  matchGlobalPatterns(comment, context) {
    const patterns = this.patterns.global.learned_patterns || {};
    
    for (const [id, pattern] of Object.entries(patterns)) {
      if (this.globalPatternMatches(pattern, comment, context)) {
        return {
          source: 'global',
          pattern: pattern,
          action: pattern.auto_decision,
          reply: pattern.suggested_reply,
          confidence: pattern.confidence
        };
      }
    }
    
    return null;
  }
  
  patternMatches(pattern, comment, context) {
    // Check text pattern - make it more flexible
    const patternText = pattern.pattern.toLowerCase();
    const commentBody = comment.body.toLowerCase();
    
    // Check if all words in pattern appear in comment
    const patternWords = patternText.split(/\s+/);
    const allWordsMatch = patternWords.every(word => commentBody.includes(word));
    
    if (!allWordsMatch) return false;
    
    // Check file conditions
    if (pattern.condition?.files) {
      const filePath = comment.path || context.path;
      if (!filePath) return false;
      
      const matchesFile = pattern.condition.files.some(filePattern => {
        const regex = new RegExp(filePattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });
      
      if (!matchesFile) return false;
    }
    
    // Check bot conditions
    if (pattern.condition?.bots) {
      const bot = comment.user?.login || comment.author?.login;
      if (!pattern.condition.bots.includes(bot)) return false;
    }
    
    return true;
  }
  
  globalPatternMatches(pattern, comment, context) {
    // Check variations
    if (pattern.variations_seen) {
      const matches = pattern.variations_seen.some(variation => 
        comment.body.toLowerCase().includes(variation.toLowerCase())
      );
      if (!matches) return false;
    }
    
    // Check conditions
    if (pattern.conditions) {
      // Simplified condition matching for now
      return pattern.conditions.some(condition => 
        this.evaluateCondition(condition, comment, context)
      );
    }
    
    return false;
  }
  
  /**
   * Learn from a decision
   */
  async recordDecision(comment, decision, context) {
    const record = {
      timestamp: new Date().toISOString(),
      comment: {
        body: comment.body,
        author: comment.user?.login || comment.author?.login,
        path: comment.path
      },
      decision: decision,
      context: context
    };
    
    // Update repo history
    if (this.patterns.repo) {
      this.updateRepoHistory(record);
    }
    
    // Update global patterns
    this.updateGlobalPatterns(record);
    
    // Save changes
    this.savePatterns();
  }
  
  updateRepoHistory(record) {
    if (!this.patterns.repo.decision_history) {
      this.patterns.repo.decision_history = [];
    }
    
    this.patterns.repo.decision_history.push({
      date: record.timestamp,
      pr: record.context.pr,
      bot: record.comment.author,
      comment: record.comment.body.substring(0, 100) + '...',
      decision: record.decision.action,
      pattern_learned: record.decision.pattern?.id
    });
    
    // Keep only last 100 decisions
    if (this.patterns.repo.decision_history.length > 100) {
      this.patterns.repo.decision_history = 
        this.patterns.repo.decision_history.slice(-100);
    }
  }
  
  updateGlobalPatterns(record) {
    // Increment total decisions
    this.patterns.global.total_decisions++;
    
    // Update bot profiles
    const bot = record.comment.author;
    if (!this.patterns.global.bot_profiles[bot]) {
      this.patterns.global.bot_profiles[bot] = {
        total_comments_seen: 0,
        common_patterns: []
      };
    }
    this.patterns.global.bot_profiles[bot].total_comments_seen++;
    
    // Learn new patterns or reinforce existing ones
    if (record.decision.confidence > 0.9) {
      this.reinforcePattern(record);
    }
  }
  
  reinforcePattern(record) {
    // Extract pattern signature
    const signature = this.extractPatternSignature(record);
    
    if (!this.patterns.global.learned_patterns[signature.id]) {
      // New pattern
      this.patterns.global.learned_patterns[signature.id] = {
        id: signature.id,
        description: signature.description,
        occurrences: 1,
        repos_seen: [record.context.repo || 'unknown'],
        confidence: 0.7,
        auto_decision: record.decision.action,
        suggested_reply: record.decision.reply,
        created_at: new Date().toISOString()
      };
    } else {
      // Reinforce existing pattern
      const pattern = this.patterns.global.learned_patterns[signature.id];
      pattern.occurrences++;
      pattern.confidence = Math.min(0.99, pattern.confidence + 0.01);
      
      if (!pattern.repos_seen.includes(record.context.repo)) {
        pattern.repos_seen.push(record.context.repo);
      }
    }
  }
  
  extractPatternSignature(record) {
    // Simple signature extraction - can be made more sophisticated
    const body = record.comment.body.toLowerCase();
    
    if (body.includes('console.log') && record.comment.path?.includes('lambda')) {
      return {
        id: 'console-log-lambda',
        description: 'Console.log in Lambda functions'
      };
    }
    
    if (body.includes('hardcoded') && body.includes('key')) {
      return {
        id: 'hardcoded-api-keys',
        description: 'Hardcoded API keys or secrets'
      };
    }
    
    // Generic signature
    const keywords = body.match(/\b\w{4,}\b/g) || [];
    const topKeywords = keywords.slice(0, 3).join('-');
    return {
      id: `pattern-${topKeywords}`,
      description: body.substring(0, 50)
    };
  }
  
  /**
   * Get pattern statistics
   */
  getStats() {
    return {
      repo_patterns: this.patterns.repo?.valid_patterns?.length || 0,
      global_patterns: Object.keys(this.patterns.global.learned_patterns || {}).length,
      total_decisions: this.patterns.global.total_decisions,
      confidence_distribution: this.getConfidenceDistribution()
    };
  }
  
  getConfidenceDistribution() {
    const patterns = this.patterns.global.learned_patterns || {};
    const distribution = {
      'high': 0,    // > 0.9
      'medium': 0,  // 0.7 - 0.9
      'low': 0      // < 0.7
    };
    
    Object.values(patterns).forEach(pattern => {
      if (pattern.confidence > 0.9) distribution.high++;
      else if (pattern.confidence > 0.7) distribution.medium++;
      else distribution.low++;
    });
    
    return distribution;
  }
  
  savePatterns() {
    // Save global patterns
    this.saveGlobalPatterns(this.patterns.global);
    
    // Save repo patterns if modified
    if (this.patterns.repo) {
      const repoPatternsPath = join(process.cwd(), '.pr-bot', 'patterns.yml');
      writeFileSync(repoPatternsPath, yaml.dump(this.patterns.repo));
    }
  }
  
  saveGlobalPatterns(patterns) {
    patterns.last_updated = new Date().toISOString();
    writeFileSync(this.globalPatternsPath, JSON.stringify(patterns, null, 2));
  }
  
  getDefaultPatterns() {
    return {
      'console-log': {
        pattern: /console\.(log|error|warn)/i,
        message: 'Consider using a proper logging library'
      },
      'hardcoded-secret': {
        pattern: /api[_-]?key|secret|password|token/i,
        severity: 'CRITICAL',
        action: 'AUTO_FIX'
      }
    };
  }
  
  // Helper methods
  triggerMatches(trigger, text) {
    return new RegExp(trigger, 'i').test(text);
  }
  
  generateFix(fixPattern, comment) {
    // Simple template replacement
    let fix = fixPattern.fix_template;
    
    // Extract variable name from comment
    const match = comment.body.match(/const (\w+) = ['"]([^'"]+)['"]/);
    if (match) {
      fix = fix.replace(/{{CONST_NAME}}/g, match[1]);
      fix = fix.replace(/{{ENV_NAME}}/g, match[1].toUpperCase());
    }
    
    return fix;
  }
  
  evaluateCondition(condition, comment, context) {
    // Simple condition evaluation
    return condition.toLowerCase().includes(comment.path?.toLowerCase() || '');
  }
}

// Export singleton instance
export const patternManager = new PatternManager();