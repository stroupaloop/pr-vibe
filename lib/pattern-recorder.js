import { patternManager } from './pattern-manager.js';

export class PatternRecorder {
  constructor() {
    this.sessionDecisions = [];
    this.learningThreshold = 0.85; // Confidence threshold for auto-learning
  }
  
  /**
   * Record a decision made during PR review
   */
  recordDecision(comment, decision, outcome = null) {
    const record = {
      timestamp: new Date().toISOString(),
      comment: {
        id: comment.id,
        body: comment.body,
        path: comment.path,
        author: comment.author || comment.user?.login
      },
      decision: decision,
      outcome: outcome // 'accepted', 'rejected', 'modified'
    };
    
    this.sessionDecisions.push(record);
    
    // Learn immediately if high confidence
    if (decision.confidence >= this.learningThreshold) {
      this.learnPattern(record);
    }
  }
  
  /**
   * Learn from a decision and update patterns
   */
  learnPattern(record) {
    const { comment, decision } = record;
    
    // Extract pattern signature
    const signature = this.extractSignature(comment, decision);
    
    // Update or create pattern
    patternManager.recordDecision(comment, decision, {
      pr: process.env.PR_NUMBER || 'unknown',
      repo: process.env.REPO || process.cwd()
    });
    
    // If this is a rejection of a bot suggestion, learn it
    if (decision.action === 'REJECT' && decision.reason) {
      this.learnRejectionPattern(comment, decision);
    }
    
    // If this is an auto-fix, learn the fix pattern
    if (decision.action === 'AUTO_FIX' && decision.suggestedFix) {
      this.learnFixPattern(comment, decision);
    }
  }
  
  /**
   * Learn why we reject certain bot suggestions
   */
  learnRejectionPattern(comment, decision) {
    // Extract key phrases from the comment
    const keywords = this.extractKeywords(comment.body);
    
    // Create a new valid pattern
    const newPattern = {
      id: `learned-${Date.now()}`,
      pattern: keywords.join(' '),
      condition: {
        files: [comment.path],
        learned_from: comment.id
      },
      reason: decision.reason,
      confidence: 0.7, // Start with moderate confidence
      auto_reply: decision.reply || decision.reason,
      learned_at: new Date().toISOString()
    };
    
    // Add to repo patterns if it doesn't exist
    this.addToRepoPatterns(newPattern);
  }
  
  /**
   * Learn fix patterns from successful fixes
   */
  learnFixPattern(comment, decision) {
    const trigger = this.extractTriggerPattern(comment.body);
    
    const newFix = {
      id: `fix-${Date.now()}`,
      trigger: trigger,
      learned_from: comment.id,
      fix_template: decision.suggestedFix,
      success_rate: 1.0,
      applied_count: 1
    };
    
    this.addToRepoFixes(newFix);
  }
  
  /**
   * End of PR review - consolidate learning
   */
  async finalizeLearning(prNumber, stats) {
    console.log('\n📚 Learning from this PR review...');
    
    // Group decisions by pattern
    const patterns = this.groupDecisionsByPattern();
    
    // Update confidence scores based on outcomes
    for (const [pattern, decisions] of Object.entries(patterns)) {
      const successRate = decisions.filter(d => d.outcome === 'accepted').length / decisions.length;
      
      if (successRate > 0.8 && decisions.length >= 3) {
        // High success pattern - increase confidence
        this.increasePatternConfidence(pattern, 0.1);
        console.log(`  ✅ Pattern "${pattern}" worked well (${Math.round(successRate * 100)}% success)`);
      } else if (successRate < 0.5) {
        // Low success - decrease confidence
        this.decreasePatternConfidence(pattern, 0.2);
        console.log(`  ⚠️ Pattern "${pattern}" needs adjustment (${Math.round(successRate * 100)}% success)`);
      }
    }
    
    // Save all learned patterns
    patternManager.savePatterns();
    
    // Log learning summary
    console.log('\n📊 Learning Summary:');
    console.log(`  Decisions made: ${this.sessionDecisions.length}`);
    console.log(`  New patterns learned: ${this.getNewPatternsCount()}`);
    console.log(`  Patterns reinforced: ${this.getReinforcedCount()}`);
    console.log(`  Time saved next time: ~${this.estimateTimeSaved()} minutes`);
  }
  
  /**
   * Helper methods
   */
  extractKeywords(text) {
    // Simple keyword extraction
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Return top 3-5 most relevant words
    return [...new Set(words)].slice(0, 5);
  }
  
  extractSignature(comment, decision) {
    return {
      keywords: this.extractKeywords(comment.body),
      action: decision.action,
      path_pattern: comment.path?.split('/').pop() || 'general'
    };
  }
  
  extractTriggerPattern(text) {
    // Extract the core issue pattern
    const patterns = [
      /hardcoded\s+(\w+\s+)?key/i,
      /console\.(log|error|warn)/i,
      /any\s+type/i,
      /sql\s+injection/i,
      /missing\s+error\s+handling/i
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return pattern.source;
      }
    }
    
    return this.extractKeywords(text).join('.*');
  }
  
  addToRepoPatterns(pattern) {
    if (!patternManager.patterns.repo) {
      console.warn('No repo patterns file found');
      return;
    }
    
    if (!patternManager.patterns.repo.valid_patterns) {
      patternManager.patterns.repo.valid_patterns = [];
    }
    
    // Check if similar pattern exists
    const exists = patternManager.patterns.repo.valid_patterns.some(p => 
      p.pattern.toLowerCase() === pattern.pattern.toLowerCase()
    );
    
    if (!exists) {
      patternManager.patterns.repo.valid_patterns.push(pattern);
      console.log(`  📝 Learned new pattern: "${pattern.pattern}"`);
    }
  }
  
  addToRepoFixes(fix) {
    if (!patternManager.patterns.repo) return;
    
    if (!patternManager.patterns.repo.auto_fixes) {
      patternManager.patterns.repo.auto_fixes = [];
    }
    
    patternManager.patterns.repo.auto_fixes.push(fix);
  }
  
  groupDecisionsByPattern() {
    const groups = {};
    
    for (const decision of this.sessionDecisions) {
      const key = decision.decision.pattern?.id || 'no-pattern';
      if (!groups[key]) groups[key] = [];
      groups[key].push(decision);
    }
    
    return groups;
  }
  
  increasePatternConfidence(patternId, amount) {
    // Update in repo patterns
    if (patternManager.patterns.repo?.valid_patterns) {
      const pattern = patternManager.patterns.repo.valid_patterns.find(p => p.id === patternId);
      if (pattern) {
        pattern.confidence = Math.min(1.0, (pattern.confidence || 0.7) + amount);
      }
    }
    
    // Update in global patterns
    if (patternManager.patterns.global.learned_patterns[patternId]) {
      const pattern = patternManager.patterns.global.learned_patterns[patternId];
      pattern.confidence = Math.min(1.0, pattern.confidence + amount);
      pattern.occurrences++;
    }
  }
  
  decreasePatternConfidence(patternId, amount) {
    if (patternManager.patterns.repo?.valid_patterns) {
      const pattern = patternManager.patterns.repo.valid_patterns.find(p => p.id === patternId);
      if (pattern) {
        pattern.confidence = Math.max(0.1, (pattern.confidence || 0.7) - amount);
      }
    }
  }
  
  getNewPatternsCount() {
    return this.sessionDecisions.filter(d => 
      d.decision.source === 'learned' || d.decision.learned_this_session
    ).length;
  }
  
  getReinforcedCount() {
    return this.sessionDecisions.filter(d => 
      d.decision.source === 'repo' || d.decision.source === 'global'
    ).length;
  }
  
  estimateTimeSaved() {
    // Estimate 2-3 minutes per auto-handled comment
    const autoHandled = this.sessionDecisions.filter(d => 
      d.decision.action === 'AUTO_FIX' || d.decision.action === 'REJECT'
    ).length;
    
    return autoHandled * 2.5;
  }
}

// Export singleton
export const patternRecorder = new PatternRecorder();