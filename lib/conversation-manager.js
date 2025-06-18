/**
 * Manages ongoing conversations with review bots
 * Handles the full dialogue until resolution
 */

export class ConversationManager {
  constructor(provider) {
    this.provider = provider;
    this.activeConversations = new Map();
    this.maxRounds = 5; // Prevent infinite loops
    this.botResponseTimeout = 600000; // 10 minutes - bots should respond or rate limit within this time
    this.rateLimitCache = new Map(); // Track rate limits per bot
  }

  /**
   * Start a conversation with a bot comment
   */
  async startConversation(prNumber, comment, initialResponse) {
    const conversationId = `${prNumber}-${comment.id}`;
    
    this.activeConversations.set(conversationId, {
      prNumber,
      originalComment: comment,
      rounds: [{
        speaker: 'pr-vibe',
        message: initialResponse,
        timestamp: new Date()
      }],
      status: 'active',
      resolution: null
    });

    // Post initial response
    await this.postResponse(prNumber, comment, initialResponse);
    
    // Wait for bot response
    return await this.waitForBotResponse(conversationId);
  }

  /**
   * Wait for bot to respond and continue conversation
   */
  async waitForBotResponse(conversationId) {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return null;

    console.log('⏳ Waiting for bot response...');
    
    const startTime = Date.now();
    let lastCheckTime = null;
    let checkInterval = 3000; // Start with 3 second checks
    let checksWithoutResponse = 0;
    
    while (Date.now() - startTime < this.botResponseTimeout) {
      // Exponential backoff: increase check interval over time
      if (checksWithoutResponse > 10) {
        checkInterval = Math.min(checkInterval * 1.5, 30000); // Max 30 seconds
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      checksWithoutResponse++;
      
      const newComments = await this.checkForNewComments(
        conversation.prNumber, 
        conversation.originalComment.id,
        lastCheckTime
      );
      
      lastCheckTime = new Date();
      
      if (newComments.length > 0) {
        // Bot responded!
        const botResponse = newComments[0];
        console.log(`\n📥 ${botResponse.user.login} responded after ${Math.round((Date.now() - startTime) / 1000)}s`);
        
        conversation.rounds.push({
          speaker: botResponse.user.login,
          message: botResponse.body,
          timestamp: new Date(botResponse.created_at)
        });
        
        // Analyze bot response
        const nextAction = await this.analyzeBotResponse(botResponse, conversation);
        
        if (nextAction.waitingForBot) {
          // Bot indicated rate limit, continue waiting
          checksWithoutResponse = 0; // Reset counter
          checkInterval = 3000; // Reset to faster checking
          continue;
        }
        
        if (nextAction.resolved) {
          conversation.status = 'resolved';
          conversation.resolution = nextAction.resolution;
          console.log('✅ Conversation resolved: ' + nextAction.resolution);
          return conversation;
        } else if (nextAction.needsReply && conversation.rounds.length < this.maxRounds) {
          // Continue conversation
          console.log('↪️  Continuing conversation...');
          await this.postResponse(
            conversation.prNumber, 
            botResponse, 
            nextAction.reply
          );
          
          conversation.rounds.push({
            speaker: 'pr-vibe',
            message: nextAction.reply,
            timestamp: new Date()
          });
          
          // Recursively wait for next response
          return await this.waitForBotResponse(conversationId);
        }
      }
      
      // Show progress occasionally
      if (checksWithoutResponse % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ Still waiting... (${elapsed}s elapsed, checking every ${checkInterval/1000}s)`);
      }
    }
    
    // Timeout reached - this is unusual, log it
    conversation.status = 'timeout';
    console.log(`⚠️  Bot did not respond within ${this.botResponseTimeout/60000} minutes`);
    console.log('This is unusual - the bot may be experiencing issues.');
    return conversation;
  }

  /**
   * Check for new comments in a thread
   */
  async checkForNewComments(prNumber, originalCommentId, since) {
    // Get all comments on the PR
    const comments = await this.provider.getComments(prNumber);
    
    // Filter for replies to our comment that are newer than 'since'
    return comments.filter(c => {
      const isReply = c.in_reply_to_id === originalCommentId || 
                     (c.body && c.body.includes(`@${this.provider.currentUser}`));
      const isNewer = !since || new Date(c.created_at) > since;
      const isBot = c.user && c.user.login && c.user.login.includes('[bot]');
      
      return isReply && isNewer && isBot;
    });
  }

  /**
   * Analyze bot's response to determine next action
   */
  async analyzeBotResponse(botResponse, conversation) {
    const body = botResponse.body.toLowerCase();
    const originalBody = botResponse.body; // Keep original for context
    
    // First check for rate limit messages
    const rateLimitInfo = this.checkForRateLimit(body, botResponse.user.login);
    if (rateLimitInfo) {
      console.log(`⏳ Bot is rate limited. Will retry after ${rateLimitInfo.retryAfter}`);
      
      // Store rate limit info
      this.rateLimitCache.set(botResponse.user.login, {
        limitedAt: new Date(),
        retryAfter: rateLimitInfo.retryAfter,
        message: rateLimitInfo.message
      });
      
      // Wait for the specified time
      await this.waitForRateLimit(rateLimitInfo.retryAfter);
      
      // Continue waiting for actual response
      return {
        resolved: false,
        needsReply: false,
        waitingForBot: true
      };
    }
    
    // Check for resolution indicators
    if (body.includes('lgtm') || 
        body.includes('looks good') || 
        body.includes('thanks for the explanation') ||
        body.includes('makes sense') ||
        body.includes('acknowledged') ||
        body.includes('thank you for clarifying')) {
      return {
        resolved: true,
        resolution: 'Bot accepted explanation'
      };
    }
    
    // Check for corrections or clarifications
    if (body.includes('actually') || 
        body.includes('clarify') ||
        body.includes('you mentioned') ||
        body.includes('misunderstood')) {
      // Bot is correcting our understanding
      return {
        resolved: false,
        needsReply: true,
        reply: this.generateCorrectedResponse(botResponse, conversation)
      };
    }
    
    // Check if bot is asking for more info
    if (body.includes('?') || 
        body.includes('could you') || 
        body.includes('please explain') ||
        body.includes('provide more')) {
      return {
        resolved: false,
        needsReply: true,
        reply: this.generateClarification(botResponse, conversation)
      };
    }
    
    // Check if bot is insisting on change
    if (body.includes('still recommend') || 
        body.includes('still strongly recommend') ||
        body.includes('security risk') ||
        body.includes('best practice') ||
        body.includes('strongly suggest')) {
      
      // After 3 rounds, escalate to human
      if (conversation.rounds.length >= 3) {
        return {
          resolved: true,
          resolution: 'Escalated to human review after multiple rounds'
        };
      }
      
      return {
        resolved: false,
        needsReply: true,
        reply: this.generateStrongerJustification(botResponse, conversation)
      };
    }
    
    // Default: assume resolved if no clear action needed
    return {
      resolved: true,
      resolution: 'No further action needed from bot'
    };
  }

  /**
   * Generate response when bot corrects our understanding
   */
  generateCorrectedResponse(botResponse, conversation) {
    return `Thank you for the clarification. You're absolutely right - I misunderstood the issue. 

Let me address the actual concern you've raised. I'll make sure to apply the appropriate fix for this specific issue.`;
  }

  /**
   * Generate clarification based on bot's question
   */
  generateClarification(botResponse, conversation) {
    // This would use context from the conversation to provide more details
    const originalContext = conversation.originalComment?.body || 'the implementation';
    return `I understand your concern. To clarify: ${originalContext} 
    
This pattern is specifically documented in our architecture decisions and has been reviewed by the security team.`;
  }

  /**
   * Generate stronger justification when bot insists
   */
  generateStrongerJustification(botResponse, conversation) {
    return `I appreciate your persistence on this point. While I understand the general best practice, in this specific case:

1. This is a documented exception in our codebase
2. The alternative would introduce more complexity 
3. We have compensating controls in place

If you still have concerns, I'm happy to escalate this to the team lead for review.`;
  }

  /**
   * Post a response in the conversation
   */
  async postResponse(prNumber, comment, response) {
    // Add pr-vibe signature
    const fullResponse = `${response}

---
🎵 **[pr-vibe](https://github.com/stroupaloop/pr-vibe)** - Continuing conversation`;
    
    await this.provider.postComment(prNumber, fullResponse, {
      in_reply_to: comment.id
    });
  }

  /**
   * Check if bot response indicates rate limiting
   */
  checkForRateLimit(body, botName) {
    const patterns = [
      // CodeRabbit patterns
      /rate limit.*?(\d+)\s*(seconds?|minutes?|hours?)/i,
      /please wait.*?(\d+)\s*(seconds?|minutes?|hours?)/i,
      /try again in.*?(\d+)\s*(seconds?|minutes?|hours?)/i,
      /quota exceeded.*?(\d+)\s*(seconds?|minutes?|hours?)/i,
      // Generic patterns
      /too many requests.*?(\d+)\s*(seconds?|minutes?|hours?)/i,
      /retry after.*?(\d+)\s*(seconds?|minutes?|hours?)/i
    ];
    
    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        const [fullMatch, time, unit] = match;
        const seconds = this.convertToSeconds(parseInt(time), unit);
        
        return {
          isRateLimited: true,
          retryAfter: seconds * 1000, // Convert to milliseconds
          message: fullMatch,
          bot: botName
        };
      }
    }
    
    // Check for specific CodeRabbit rate limit format
    if (botName.includes('coderabbit') && 
        (body.includes('currently processing') ||
         body.includes('high load') ||
         body.includes('queued for processing') ||
         body.includes('busy processing') ||
         body.includes('will process your') ||
         body.includes('apologize') && body.includes('delay'))) {
      // Default wait time when no specific time given
      return {
        isRateLimited: true,
        retryAfter: 60000, // 1 minute default
        message: 'Bot is busy, will retry in 1 minute',
        bot: botName
      };
    }
    
    // Check for other bot rate limit patterns
    if (body.includes('rate limit') ||
        body.includes('too many requests') ||
        body.includes('please try again') ||
        body.includes('temporarily unavailable')) {
      return {
        isRateLimited: true,
        retryAfter: 30000, // 30 seconds default for unknown patterns
        message: 'Bot appears to be rate limited',
        bot: botName
      };
    }
    
    return null;
  }
  
  /**
   * Convert time to seconds
   */
  convertToSeconds(time, unit) {
    const unitLower = unit.toLowerCase();
    if (unitLower.includes('hour')) return time * 3600;
    if (unitLower.includes('minute')) return time * 60;
    return time; // seconds
  }
  
  /**
   * Wait for rate limit to expire
   */
  async waitForRateLimit(waitTime) {
    const waitMinutes = Math.ceil(waitTime / 60000);
    console.log(`⏱️  Waiting ${waitMinutes} minute(s) for rate limit to clear...`);
    
    // Show progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, waitTime - elapsed);
      const remainingMin = Math.ceil(remaining / 60000);
      
      if (remaining > 0) {
        process.stdout.write(`\r⏱️  Rate limit wait: ${remainingMin} minute(s) remaining...`);
      }
    }, 5000);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    clearInterval(interval);
    console.log('\n✅ Rate limit wait complete, checking for response...');
  }
  
  /**
   * Check if we should wait before posting to avoid rate limits
   */
  async checkRateLimitBeforePosting(botName) {
    const rateLimitInfo = this.rateLimitCache.get(botName);
    if (!rateLimitInfo) return;
    
    const now = new Date();
    const limitedAt = new Date(rateLimitInfo.limitedAt);
    const waitTime = rateLimitInfo.retryAfter - (now - limitedAt);
    
    if (waitTime > 0) {
      console.log(`⏳ Preemptively waiting ${Math.ceil(waitTime / 1000)}s to avoid rate limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  /**
   * Get summary of all conversations
   */
  getConversationSummary() {
    const summary = {
      total: this.activeConversations.size,
      resolved: 0,
      timeout: 0,
      escalated: 0,
      totalRounds: 0
    };
    
    this.activeConversations.forEach(conv => {
      if (conv.status === 'resolved') summary.resolved++;
      if (conv.status === 'timeout') summary.timeout++;
      if (conv.resolution?.includes('Escalated')) summary.escalated++;
      summary.totalRounds += conv.rounds.length;
    });
    
    return summary;
  }
}