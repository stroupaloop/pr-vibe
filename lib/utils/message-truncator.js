/**
 * Utility for handling GitHub comment length limits
 */

const GITHUB_COMMENT_LIMIT = 65536;
const TRUNCATION_BUFFER = 1000; // Leave room for truncation notice
const MAX_SAFE_LENGTH = GITHUB_COMMENT_LIMIT - TRUNCATION_BUFFER;

export class MessageTruncator {
  /**
   * Truncate a message to fit within GitHub's comment limits
   * @param {string} message - The message to potentially truncate
   * @param {Object} options - Truncation options
   * @returns {Object} { message: string, wasTruncated: boolean, originalLength: number }
   */
  static truncate(message, options = {}) {
    const { 
      preserveCodeBlocks = true,
      addNotice = true 
    } = options;

    if (message.length <= MAX_SAFE_LENGTH) {
      return { 
        message, 
        wasTruncated: false, 
        originalLength: message.length 
      };
    }

    let truncatedMessage = message;
    
    if (preserveCodeBlocks) {
      // Try to truncate at a natural boundary (end of code block, paragraph, etc.)
      truncatedMessage = this.truncateAtNaturalBoundary(message, MAX_SAFE_LENGTH);
    } else {
      truncatedMessage = message.substring(0, MAX_SAFE_LENGTH);
    }

    if (addNotice) {
      const truncatedChars = message.length - truncatedMessage.length;
      const truncationNotice = `\n\n---\n⚠️ **Message truncated**: ${truncatedChars.toLocaleString()} characters removed to fit GitHub's comment limit.\n`;
      truncatedMessage += truncationNotice;
    }

    return {
      message: truncatedMessage,
      wasTruncated: true,
      originalLength: message.length
    };
  }

  /**
   * Try to truncate at a natural boundary to preserve readability
   */
  static truncateAtNaturalBoundary(message, maxLength) {
    // Look for natural break points in reverse order of preference
    const boundaries = [
      { pattern: /```\n/g, name: 'code block' },
      { pattern: /\n\n/g, name: 'paragraph' },
      { pattern: /\n/g, name: 'line' },
      { pattern: /\. /g, name: 'sentence' }
    ];

    for (const boundary of boundaries) {
      const matches = Array.from(message.matchAll(boundary.pattern));
      
      // Find the last match before our limit
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        if (match.index < maxLength) {
          // Truncate after this boundary
          const truncateAt = match.index + match[0].length;
          
          // Make sure we're not losing too much content
          if (truncateAt > maxLength * 0.8) {
            return message.substring(0, truncateAt);
          }
        }
      }
    }

    // If no good boundary found, just truncate at maxLength
    return message.substring(0, maxLength);
  }

  /**
   * Split a long message into multiple comments
   * @param {string} message - The message to split
   * @param {Object} options - Split options
   * @returns {Array<string>} Array of message parts
   */
  static split(message, options = {}) {
    const { 
      maxPartLength = MAX_SAFE_LENGTH - 500, // Leave extra room for continuation markers
      addContinuationMarkers = true 
    } = options;

    if (message.length <= maxPartLength) {
      return [message];
    }

    const parts = [];
    let remaining = message;
    let partNumber = 1;
    const totalParts = Math.ceil(message.length / maxPartLength);

    while (remaining.length > 0) {
      let currentPart = remaining.substring(0, maxPartLength);
      
      // Try to break at a natural boundary
      if (remaining.length > maxPartLength) {
        currentPart = this.truncateAtNaturalBoundary(remaining, maxPartLength);
      }

      // Add continuation markers
      if (addContinuationMarkers) {
        if (partNumber > 1) {
          currentPart = `*...continued from previous comment*\n\n${currentPart}`;
        }
        if (partNumber < totalParts) {
          currentPart += `\n\n*...continues in next comment (${partNumber}/${totalParts})*`;
        }
      }

      parts.push(currentPart);
      remaining = remaining.substring(currentPart.length);
      partNumber++;
    }

    return parts;
  }

  /**
   * Check if a message exceeds GitHub's limit
   */
  static exceedsLimit(message) {
    return message.length > GITHUB_COMMENT_LIMIT;
  }

  /**
   * Get a summary of how much a message exceeds the limit
   */
  static getExcessInfo(message) {
    const excess = message.length - GITHUB_COMMENT_LIMIT;
    return {
      exceedsLimit: excess > 0,
      messageLength: message.length,
      limit: GITHUB_COMMENT_LIMIT,
      excessCharacters: Math.max(0, excess),
      excessPercentage: Math.max(0, (excess / GITHUB_COMMENT_LIMIT) * 100)
    };
  }
}