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
          summaryPattern: /<!-- walkthrough_start -->|## summary/i
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
      hasNitpicks: false,
      isSummary: false,
      confidence: 0.90
    };
    
    // Check if it's a summary comment (skip these)
    if (this.botPatterns.coderabbit.reviewFormat.summaryPattern.test(reviewBody)) {
      result.isSummary = true;
      result.confidence = 0.95;
      return result;
    }
    
    // Extract actionable comments count
    const actionableMatch = reviewBody.match(this.botPatterns.coderabbit.reviewFormat.actionablePattern);
    if (actionableMatch) {
      const count = parseInt(actionableMatch[1], 10);
      result.actionableComments = isNaN(count) ? 0 : count;
      result.confidence = 0.95;
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
   * Determine if a comment/review should be processed
   */
  shouldProcessComment(username, reviewBody, commentType = 'comment') {
    const detection = this.detectBot(username);
    if (!detection.isBot) return { process: false, reason: 'not_a_bot', confidence: detection.confidence };
    
    // Parse the review
    const parsed = this.parseBotReview(username, reviewBody);
    
    // Skip CodeRabbit summaries
    if (parsed.botType === 'coderabbit' && parsed.parsedContent?.isSummary) {
      return { process: false, reason: 'summary_comment', confidence: 0.95 };
    }
    
    // Skip if no actionable content
    if (parsed.botType === 'coderabbit' && parsed.parsedContent?.actionableComments === 0) {
      return { process: false, reason: 'no_actionable_items', confidence: 0.90 };
    }
    
    // Process everything else
    return { 
      process: true, 
      reason: 'actionable_content',
      confidence: parsed.confidence || 0.85,
      details: parsed
    };
  }
}

// Singleton instance
export const botDetector = new BotDetector();