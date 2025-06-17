import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

class PatternManager {
  constructor() {
    this.patterns = {
      repo: null,
      global: null
    };
    this.loadPatterns();
  }

  loadPatterns() {
    // Load repo-specific patterns
    const repoPatternPath = join(process.cwd(), '.pr-bot', 'patterns.yml');
    if (existsSync(repoPatternPath)) {
      try {
        const content = readFileSync(repoPatternPath, 'utf-8');
        this.patterns.repo = this.parseYaml(content);
      } catch (error) {
        console.warn('Failed to load repo patterns:', error.message);
      }
    }

    // Load global learned patterns
    const globalPatternPath = join(homedir(), '.pr-bot', 'learned-patterns.json');
    if (existsSync(globalPatternPath)) {
      try {
        const content = readFileSync(globalPatternPath, 'utf-8');
        this.patterns.global = JSON.parse(content);
      } catch (error) {
        console.warn('Failed to load global patterns:', error.message);
      }
    } else {
      // Initialize global patterns structure
      this.patterns.global = {
        learned_patterns: {},
        team_playbook: {
          reviewers: {},
          common_patterns: []
        },
        statistics: {
          total_reviews: 0,
          patterns_learned: 0,
          time_saved_minutes: 0
        }
      };
    }
  }

  savePatterns() {
    // Save global patterns
    const globalDir = join(homedir(), '.pr-bot');
    if (!existsSync(globalDir)) {
      mkdirSync(globalDir, { recursive: true });
    }
    
    const globalPatternPath = join(globalDir, 'learned-patterns.json');
    writeFileSync(globalPatternPath, JSON.stringify(this.patterns.global, null, 2));
  }

  findPattern(comment, context = {}) {
    const patterns = [];
    
    // Check repo patterns first (higher priority)
    if (this.patterns.repo?.valid_patterns) {
      for (const pattern of this.patterns.repo.valid_patterns) {
        if (this.matchesPattern(comment, pattern, context)) {
          patterns.push({
            ...pattern,
            source: 'repo',
            confidence: pattern.confidence || 1.0
          });
        }
      }
    }

    // Check global learned patterns
    for (const [id, pattern] of Object.entries(this.patterns.global.learned_patterns)) {
      if (this.matchesPattern(comment, pattern, context)) {
        patterns.push({
          ...pattern,
          id,
          source: 'global',
          confidence: pattern.confidence || 0.8
        });
      }
    }

    // Return highest confidence match
    return patterns.sort((a, b) => b.confidence - a.confidence)[0];
  }

  matchesPattern(comment, pattern, context) {
    // Check if comment body matches pattern
    const bodyMatches = new RegExp(pattern.pattern, 'i').test(comment.body);
    if (!bodyMatches) return false;

    // Check file conditions if specified
    if (pattern.condition?.files && context.path) {
      const fileMatches = pattern.condition.files.some(filePattern => {
        const regex = filePattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp(regex).test(context.path);
      });
      if (!fileMatches) return false;
    }

    return true;
  }

  recordDecision(comment, decision, context) {
    // Update statistics
    this.patterns.global.statistics.total_reviews++;
    
    // Record pattern usage
    if (decision.pattern) {
      const patternId = decision.pattern.id || `pattern-${Date.now()}`;
      
      if (!this.patterns.global.learned_patterns[patternId]) {
        this.patterns.global.learned_patterns[patternId] = {
          pattern: decision.pattern.pattern || comment.body.substring(0, 50),
          action: decision.action,
          reason: decision.reason,
          confidence: 0.7,
          occurrences: 0,
          last_used: null,
          contexts: []
        };
        this.patterns.global.statistics.patterns_learned++;
      }
      
      const learnedPattern = this.patterns.global.learned_patterns[patternId];
      learnedPattern.occurrences++;
      learnedPattern.last_used = new Date().toISOString();
      learnedPattern.contexts.push({
        repo: context.repo,
        pr: context.pr,
        timestamp: new Date().toISOString()
      });
      
      // Increase confidence with usage
      learnedPattern.confidence = Math.min(1.0, learnedPattern.confidence + 0.05);
    }
    
    // Track time saved
    if (decision.action === 'AUTO_FIX' || decision.action === 'REJECT') {
      this.patterns.global.statistics.time_saved_minutes += 2.5;
    }
  }

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
    
    // Extract patterns from the comment
    const extractedPattern = this.extractPatternFromComment(humanComment);
    
    // Record the pattern
    const patternKey = extractedPattern.key;
    if (!reviewerProfile.common_feedback[patternKey]) {
      reviewerProfile.common_feedback[patternKey] = {
        pattern: extractedPattern.pattern,
        examples: [],
        frequency: 0
      };
    }
    
    const feedback = reviewerProfile.common_feedback[patternKey];
    feedback.frequency++;
    feedback.examples.push({
      comment: humanComment.body,
      file: humanComment.path,
      line: humanComment.line,
      pr: context.pr
    });
    
    // Add to learned patterns if frequent enough
    if (feedback.frequency >= 3) {
      const learnedId = `human-${reviewer}-${patternKey}`;
      this.patterns.global.learned_patterns[learnedId] = {
        pattern: extractedPattern.pattern,
        action: 'HUMAN_SUGGESTED',
        reason: `Common feedback from ${reviewer}`,
        confidence: Math.min(0.9, feedback.frequency * 0.15),
        learned_from: reviewer,
        occurrences: feedback.frequency,
        human_review: true
      };
    }
    
    this.savePatterns();
    
    return {
      reviewer,
      pattern: extractedPattern,
      confidence: feedback.frequency * 0.15,
      patternsUpdated: 1
    };
  }

  extractPatternFromComment(comment) {
    const body = comment.body.toLowerCase();
    
    // Common code review patterns
    const patterns = [
      { key: 'error-handling', pattern: 'error handling|try.?catch|exception' },
      { key: 'naming', pattern: 'naming|variable name|function name' },
      { key: 'types', pattern: 'type|typescript|any type|type annotation' },
      { key: 'comments', pattern: 'comment|documentation|doc|explain' },
      { key: 'performance', pattern: 'performance|optimize|slow|efficient' },
      { key: 'security', pattern: 'security|vulnerability|injection|xss' },
      { key: 'testing', pattern: 'test|testing|coverage|unit test' },
      { key: 'style', pattern: 'style|formatting|indent|spacing' }
    ];
    
    for (const { key, pattern } of patterns) {
      if (new RegExp(pattern, 'i').test(body)) {
        return { key, pattern };
      }
    }
    
    // Default pattern based on keywords
    const words = body.split(/\s+/).slice(0, 5).join(' ');
    return { 
      key: 'general-' + Date.now(), 
      pattern: words 
    };
  }

  matchHumanPattern(comment) {
    const humanPatterns = Object.entries(this.patterns.global.learned_patterns)
      .filter(([_, p]) => p.human_review);
    
    for (const [id, pattern] of humanPatterns) {
      if (this.matchesPattern(comment, pattern)) {
        return {
          matched: true,
          pattern,
          learnedFrom: [pattern.learned_from],
          confidence: pattern.confidence
        };
      }
    }
    
    return { matched: false };
  }

  // Simple YAML parser for patterns file
  parseYaml(content) {
    // This is a very basic YAML parser - in production, use a proper library
    const result = {
      valid_patterns: [],
      auto_fixes: [],
      escalation_rules: []
    };
    
    let currentSection = null;
    let currentItem = null;
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('valid_patterns:')) {
        currentSection = 'valid_patterns';
      } else if (trimmed.startsWith('auto_fixes:')) {
        currentSection = 'auto_fixes';
      } else if (trimmed.startsWith('escalation_rules:')) {
        currentSection = 'escalation_rules';
      } else if (trimmed.startsWith('- id:')) {
        currentItem = { id: trimmed.substring(5).trim() };
        if (currentSection) result[currentSection].push(currentItem);
      } else if (currentItem && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        currentItem[key.trim()] = value;
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const patternManager = new PatternManager();