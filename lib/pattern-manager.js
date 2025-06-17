import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Simple YAML parsing for now - can be replaced with js-yaml later
const parseYaml = (content) => {
  // Very basic YAML parser for our patterns format
  const result = { valid_patterns: [], auto_fixes: [] };
  const lines = content.split('\n');
  let currentSection = null;
  let currentItem = null;
  
  for (const line of lines) {
    if (line.startsWith('valid_patterns:')) {
      currentSection = 'valid_patterns';
    } else if (line.startsWith('auto_fixes:')) {
      currentSection = 'auto_fixes';
    } else if (line.match(/^\s*- id:/)) {
      currentItem = { id: line.split('id:')[1].trim() };
      if (currentSection) result[currentSection].push(currentItem);
    } else if (currentItem && line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        currentItem[key.replace(/^\s*/, '')] = value;
      }
    }
  }
  
  return result;
};

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
        patterns.repo = parseYaml(readFileSync(repoPatternsPath, 'utf-8'));
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
      human_review_patterns: {},  // NEW: Track patterns from human reviewers
      team_playbook: {            // NEW: Team-specific standards
        reviewers: {},
        common_feedback: {},
        confidence_threshold: 0.9
      },
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
  
  /**
   * Learn from human review feedback
   */
  async learnFromHumanReview(humanComment, interpretation, context) {
    const reviewer = humanComment.user?.login || 'unknown';
    const patterns = this.patterns.global;
    
    // Initialize reviewer profile if needed
    if (!patterns.team_playbook.reviewers[reviewer]) {
      patterns.team_playbook.reviewers[reviewer] = {
        name: reviewer,
        total_reviews: 0,
        common_feedback: {},
        learned_patterns: []
      };
    }
    
    const reviewerProfile = patterns.team_playbook.reviewers[reviewer];
    reviewerProfile.total_reviews++;
    
    // Extract key phrases from the comment
    const keyPhrases = this.extractKeyPhrases(humanComment.body);
    
    // Track common feedback patterns
    keyPhrases.forEach(phrase => {
      if (!reviewerProfile.common_feedback[phrase]) {
        reviewerProfile.common_feedback[phrase] = {
          count: 0,
          confidence: 0.3,
          suggested_action: interpretation
        };
      }
      
      const feedback = reviewerProfile.common_feedback[phrase];
      feedback.count++;
      feedback.confidence = Math.min(0.95, feedback.confidence + 0.1);
      
      // Add to team-wide patterns if confidence is high enough
      if (feedback.confidence >= patterns.team_playbook.confidence_threshold) {
        this.promoteToTeamPattern(phrase, feedback, reviewer);
      }
    });
    
    // Save the learning
    this.saveGlobalPatterns(patterns);
    
    return {
      learned: true,
      reviewer,
      patternsUpdated: keyPhrases.length,
      confidence: reviewerProfile.common_feedback[keyPhrases[0]]?.confidence || 0
    };
  }
  
  extractKeyPhrases(text) {
    // Simple extraction - look for common review patterns
    const phrases = [];
    const lowerText = text.toLowerCase();
    
    // Common patterns to look for
    const patterns = [
      /needs?\s+error\s+handling/gi,
      /add\s+(?:unit\s+)?tests?/gi,
      /missing\s+documentation/gi,
      /security\s+(?:issue|concern)/gi,
      /performance\s+(?:issue|concern)/gi,
      /code\s+duplication/gi,
      /magic\s+numbers?/gi,
      /hardcoded\s+values?/gi,
      /naming\s+convention/gi,
      /early\s+return/gi,
      /error\s+handling/gi,
      /null\s+check/gi,
      /type\s+safety/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(matches[0].toLowerCase());
      }
    });
    
    // Also extract quoted suggestions
    const quotedMatches = text.match(/"([^"]+)"/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(m => m.replace(/"/g, '')));
    }
    
    return [...new Set(phrases)]; // Remove duplicates
  }
  
  promoteToTeamPattern(phrase, feedback, reviewer) {
    const patterns = this.patterns.global;
    
    if (!patterns.team_playbook.common_feedback[phrase]) {
      patterns.team_playbook.common_feedback[phrase] = {
        phrase,
        suggested_action: feedback.suggested_action,
        confidence: feedback.confidence,
        learned_from: [reviewer],
        occurrences: feedback.count,
        promoted_at: new Date().toISOString()
      };
    } else {
      const teamPattern = patterns.team_playbook.common_feedback[phrase];
      teamPattern.occurrences += feedback.count;
      teamPattern.confidence = Math.max(teamPattern.confidence, feedback.confidence);
      
      if (!teamPattern.learned_from.includes(reviewer)) {
        teamPattern.learned_from.push(reviewer);
      }
    }
  }
  
  /**
   * Check if human review matches learned patterns
   */
  matchHumanPattern(humanComment) {
    const patterns = this.patterns.global.team_playbook.common_feedback;
    const commentLower = humanComment.body.toLowerCase();
    
    for (const [phrase, pattern] of Object.entries(patterns)) {
      if (commentLower.includes(phrase.toLowerCase())) {
        return {
          matched: true,
          pattern: pattern,
          confidence: pattern.confidence,
          suggestedAction: pattern.suggested_action,
          learnedFrom: pattern.learned_from
        };
      }
    }
    
    return { matched: false };
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