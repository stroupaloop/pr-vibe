/**
 * Bot-specific parsing and detection logic
 */

export class BotDetector {
  constructor() {
    // Bot patterns with confidence levels
    this.botPatterns = {
      coderabbit: {
        pattern: /coderabbit/i,
        confidence: 0.95,
        reviewFormat: {
          actionablePattern: /actionable\s+comments\s+posted:\s*(\d+)/i,
          nitpickPattern: /review\s+details|nitpicks/i,
          summaryPattern: /<!-- walkthrough_start -->|## summary/i,
          additionalCommentsPattern: /additional\s+comments\s+not\s+posted/i,
          reviewDetailsSection: /<details>[\s\S]*?<summary>[\s\S]*?[rR]eview\s+details[\s\S]*?<\/summary>/
        }
      },
      deepsource: {
        pattern: /deepsource/i,
        confidence: 0.95,
        reviewFormat: {
          issuePattern: /found\s+(\d+)\s+issue/i,
          fixedPattern: /fixed\s+(\d+)\s+issue/i
        }
      },
      sonarcloud: {
        pattern: /sonarcloud/i,
        confidence: 0.95,
        reviewFormat: {
          issuePattern: /code\s+smell|bug|vulnerability/i
        }
      },
      codeclimate: {
        pattern: /codeclimate/i,
        confidence: 0.90,
        reviewFormat: {
          issuePattern: /issue\s+found|complexity/i
        }
      },
      snyk: {
        pattern: /snyk/i,
        confidence: 0.95,
        reviewFormat: {
          vulnerabilityPattern: /vulnerability|security/i
        }
      },
      genericBot: {
        pattern: /\[bot\]|bot$/i,
        confidence: 0.80
      }
    };
    
    // Patterns to identify nitpick/minor comments
    this.nitPatterns = [
      /^nit:/i,
      /\bnit\b.*?:/i,
      /\bnitpick\b/i,
      /\bminor\b.*?(suggestion|issue|comment)/i,
      /\bconsider\b.*?(using|adding|removing)/i,
      /\bstyle\b.*?(suggestion|issue)/i,
      /\boptional\b.*?:/i,
      /\btrivial\b/i,
      /\bnon-blocking\b/i,
      /\bcosmetic\b/i,
      /\bsuggestion:\s*consider/i,
      /^📝\s*(minor|nit|style)/i,
      /additional\s+comments?\s+not\s+posted/i
    ];
  }

  /**
   * Detect if a comment is a nitpick/minor suggestion
   */
  isNitComment(commentBody) {
    if (!commentBody) return { isNit: false, confidence: 0 };
    
    const lowerBody = commentBody.toLowerCase();
    
    // Check for CodeRabbit's "review details" section first (higher priority)
    if (this.botPatterns.coderabbit.reviewFormat.reviewDetailsSection.test(commentBody)) {
      return { 
        isNit: true, 
        confidence: 0.85,
        pattern: 'coderabbit_review_details'
      };
    }
    
    // Check for "Additional comments not posted"
    if (this.botPatterns.coderabbit.reviewFormat.additionalCommentsPattern.test(commentBody)) {
      return { 
        isNit: true, 
        confidence: 0.95,
        pattern: 'coderabbit_additional_comments'
      };
    }
    
    // Check for explicit nit patterns
    for (const pattern of this.nitPatterns) {
      if (pattern.test(commentBody)) {
        return { 
          isNit: true, 
          confidence: 0.90,
          pattern: 'nit_pattern'
        };
      }
    }
    
    return { isNit: false, confidence: 0.80 };
  }

  /**
   * Detect if a user is a bot and return confidence level
   */
  detectBot(username) {
    if (!username) return { isBot: false, confidence: 0 };
    
    const lowerUsername = username.toLowerCase();
    
    for (const [botName, config] of Object.entries(this.botPatterns)) {
      if (config.pattern.test(lowerUsername)) {
        return {
          isBot: true,
          botType: botName,
          confidence: config.confidence || 0.80
        };
      }
    }
    
    return { isBot: false, confidence: 0.95 }; // 95% confident it's NOT a bot
  }

  /**
   * Parse CodeRabbit review format
   */
  parseCodeRabbitReview(reviewBody) {
    if (!reviewBody) return null;
    
    const result = {
      type: 'coderabbit',
      actionableComments: 0,
      nitComments: 0,
      criticalComments: 0,
      hasNitpicks: false,
      isSummary: false,
      isNitSection: false,
      confidence: 0.90
    };
    
    // Check if it's a summary comment (skip these)
    if (this.botPatterns.coderabbit.reviewFormat.summaryPattern.test(reviewBody)) {
      result.isSummary = true;
      result.confidence = 0.95;
      return result;
    }
    
    // Check if this is a "review details" or "additional comments" section
    if (this.botPatterns.coderabbit.reviewFormat.reviewDetailsSection.test(reviewBody) ||
        this.botPatterns.coderabbit.reviewFormat.additionalCommentsPattern.test(reviewBody)) {
      result.isNitSection = true;
      result.hasNitpicks = true;
      result.confidence = 0.95;
      
      // These sections typically contain only nits
      result.nitComments = result.actionableComments || 1;
      return result;
    }
    
    // Extract actionable comments count
    const actionableMatch = reviewBody.match(this.botPatterns.coderabbit.reviewFormat.actionablePattern);
    if (actionableMatch) {
      const count = parseInt(actionableMatch[1], 10);
      result.actionableComments = isNaN(count) ? 0 : count;
      result.confidence = 0.95;
      
      // For now, assume they're critical unless we find evidence of nits
      result.criticalComments = result.actionableComments;
    }
    
    // Check for nitpicks section
    if (this.botPatterns.coderabbit.reviewFormat.nitpickPattern.test(reviewBody)) {
      result.hasNitpicks = true;
    }
    
    return result;
  }

  /**
   * Parse any bot review and extract key information
   */
  parseBotReview(username, reviewBody) {
    const detection = this.detectBot(username);
    if (!detection.isBot) return null;
    
    const result = {
      ...detection,
      parsedContent: null
    };
    
    switch (detection.botType) {
    case 'coderabbit':
      result.parsedContent = this.parseCodeRabbitReview(reviewBody);
      break;
    case 'deepsource':
      result.parsedContent = this.parseDeepSourceReview(reviewBody);
      break;
    case 'sonarcloud':
      result.parsedContent = this.parseSonarCloudReview(reviewBody);
      break;
    default:
      result.parsedContent = this.parseGenericBotReview(reviewBody);
    }
    
    return result;
  }

  /**
   * Parse DeepSource review format
   */
  parseDeepSourceReview(reviewBody) {
    if (!reviewBody) return null;
    
    const result = {
      type: 'deepsource',
      issuesFound: 0,
      issuesFixed: 0,
      confidence: 0.85
    };
    
    const issueMatch = reviewBody.match(this.botPatterns.deepsource.reviewFormat.issuePattern);
    if (issueMatch) {
      result.issuesFound = parseInt(issueMatch[1], 10);
      result.confidence = 0.90;
    }
    
    const fixedMatch = reviewBody.match(this.botPatterns.deepsource.reviewFormat.fixedPattern);
    if (fixedMatch) {
      result.issuesFixed = parseInt(fixedMatch[1], 10);
      result.confidence = 0.90;
    }
    
    return result;
  }

  /**
   * Parse SonarCloud review format
   */
  parseSonarCloudReview(reviewBody) {
    if (!reviewBody) return null;
    
    const result = {
      type: 'sonarcloud',
      hasIssues: false,
      issueTypes: [],
      confidence: 0.85
    };
    
    const pattern = this.botPatterns.sonarcloud.reviewFormat.issuePattern;
    if (pattern.test(reviewBody)) {
      result.hasIssues = true;
      result.confidence = 0.90;
      
      // Extract issue types
      if (/code\s+smell/i.test(reviewBody)) result.issueTypes.push('code_smell');
      if (/bug/i.test(reviewBody)) result.issueTypes.push('bug');
      if (/vulnerability/i.test(reviewBody)) result.issueTypes.push('vulnerability');
    }
    
    return result;
  }

  /**
   * Generic bot review parser
   */
  parseGenericBotReview(reviewBody) {
    if (!reviewBody) return null;
    
    return {
      type: 'generic',
      hasContent: reviewBody.length > 0,
      confidence: 0.70
    };
  }

  /**
   * Extract severity from CodeRabbit comment indicators
   */
  extractCodeRabbitSeverity(commentBody) {
    if (!commentBody) return { severity: 'info', confidence: 0.5 };
    
    // Check for emoji indicators first
    if (/⚠️\s*(potential issue|warning)/i.test(commentBody)) {
      // This is a warning, NOT necessarily security
      return { severity: 'warning', confidence: 0.90 };
    }
    
    if (/🛠️\s*(refactor|suggestion)/i.test(commentBody)) {
      // This is a refactor suggestion
      return { severity: 'refactor', confidence: 0.95 };
    }
    
    if (/🧹\s*(nitpick|style)/i.test(commentBody)) {
      // This is explicitly a nitpick
      return { severity: 'nitpick', confidence: 0.95 };
    }
    
    if (/📝\s*(note|comment)/i.test(commentBody)) {
      // This is just a note
      return { severity: 'note', confidence: 0.90 };
    }
    
    // Check for text indicators
    if (/critical|high\s*priority|security\s*vulnerability/i.test(commentBody)) {
      return { severity: 'critical', confidence: 0.85 };
    }
    
    if (/suggestion|consider|optional/i.test(commentBody)) {
      return { severity: 'suggestion', confidence: 0.80 };
    }
    
    return { severity: 'info', confidence: 0.60 };
  }

  /**
   * Determine if a comment/review should be processed
   */
  shouldProcessComment(username, reviewBody, commentType = 'comment', options = {}) {
    const detection = this.detectBot(username);
    if (!detection.isBot) return { process: false, reason: 'not_a_bot', confidence: detection.confidence };
    
    // Parse the review
    const parsed = this.parseBotReview(username, reviewBody);
    
    // Skip CodeRabbit summaries
    if (parsed.botType === 'coderabbit' && parsed.parsedContent?.isSummary) {
      return { process: false, reason: 'summary_comment', confidence: 0.95 };
    }
    
    // Extract severity for CodeRabbit comments
    let severityInfo = null;
    if (parsed.botType === 'coderabbit') {
      severityInfo = this.extractCodeRabbitSeverity(reviewBody);
    }
    
    // Check if this is a nit comment BEFORE checking actionable content
    const nitCheck = this.isNitComment(reviewBody);
    
    // Handle nit filtering based on options
    if (options.skipNits && nitCheck.isNit) {
      return { 
        process: false, 
        reason: 'nit_comment_skipped', 
        confidence: nitCheck.confidence,
        details: { ...parsed, isNit: true, nitPattern: nitCheck.pattern, severity: severityInfo }
      };
    }
    
    if (options.nitsOnly && !nitCheck.isNit) {
      return { 
        process: false, 
        reason: 'non_nit_comment_skipped', 
        confidence: nitCheck.confidence,
        details: { ...parsed, isNit: false, severity: severityInfo }
      };
    }
    
    // Skip CodeRabbit nit sections if skipNits is enabled
    if (options.skipNits && parsed.botType === 'coderabbit' && parsed.parsedContent?.isNitSection) {
      return { 
        process: false, 
        reason: 'nit_section_skipped', 
        confidence: 0.95,
        details: { ...parsed, isNit: true, severity: severityInfo }
      };
    }
    
    // Skip if no actionable content (moved after nit check)
    if (parsed.botType === 'coderabbit' && parsed.parsedContent?.actionableComments === 0) {
      return { process: false, reason: 'no_actionable_items', confidence: 0.90 };
    }
    
    // Process everything else
    return { 
      process: true, 
      reason: 'actionable_content',
      confidence: parsed.confidence || 0.85,
      details: { ...parsed, isNit: nitCheck.isNit, nitPattern: nitCheck.pattern, severity: severityInfo }
    };
  }
}

// Singleton instance
export const botDetector = new BotDetector();