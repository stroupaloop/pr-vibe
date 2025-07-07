import { execSync } from 'child_process';
import { GitHubProvider } from './providers/github-provider.js';
import { botDetector } from './bot-detector.js';

export async function analyzeGitHubPR(prNumber, repo, options = {}) {
  try {
    const provider = new GitHubProvider({ repo });
    
    // Use gh CLI for now (simpler for prototype)
    const prJson = execSync(`gh pr view ${prNumber} --repo ${repo} --json title,body,state,comments,reviews`, 
      { encoding: 'utf-8' });
    const pr = JSON.parse(prJson);
    
    // Get review comments (inline)
    const reviewCommentsJson = execSync(`gh api repos/${repo}/pulls/${prNumber}/comments`, 
      { encoding: 'utf-8' });
    const reviewComments = JSON.parse(reviewCommentsJson);
    
    // Get PR reviews (this is where CodeRabbit posts!)
    const reviews = await provider.getReviews(prNumber);
    
    // Debug info for what we found
    const debugInfo = {
      issueComments: pr.comments.length,
      reviewComments: reviewComments.length,
      prReviews: reviews.length,
      reviewDetails: reviews.map(r => ({
        author: r.author,
        hasBody: !!r.body,
        state: r.state,
        commentsCount: r.comments?.length || 0
      }))
    };
    
    if (options.debug) {
      console.log('Debug: Found comments/reviews:', debugInfo);
    }
    
    // Combine all comments - normalize the structure
    const allComments = [
      ...pr.comments.map(c => ({ 
        ...c, 
        type: 'issue',
        user: c.user || c.author || (c.author ? { login: c.author } : null),
        created_at: c.created_at || c.createdAt
      })),
      ...reviewComments.map(c => ({ ...c, type: 'review_comment' })),
      // Add PR reviews as comments
      ...reviews.map(r => ({
        id: `review-${r.id}`,
        user: { login: r.author },
        body: r.body,
        created_at: r.submitted_at,
        type: 'pr_review',
        state: r.state,
        review_comments: r.comments
      })),
      // Also add individual review comments from PR reviews
      ...reviews.flatMap(r => r.comments.map(c => ({
        ...c,
        id: `review-comment-${c.id}`,
        user: { login: r.author },
        type: 'pr_review_comment',
        review_id: r.id
      })))
    ];
    
    // Separate bot and human comments using the bot detector
    const botComments = [];
    const humanComments = [];
    const skippedComments = [];
    
    if (options.debug) {
      console.log(`Debug: Processing ${allComments.length} total comments`);
    }
    
    allComments.forEach(comment => {
      const username = comment.user?.login || comment.author?.login || '';
      
      if (options.debug && (comment.type === 'pr_review_comment' || username.includes('rabbit'))) {
        console.log(`Debug: Comment from ${username} (${comment.type}), has body: ${!!comment.body}`);
      }
      
      // Skip Vercel bot
      if (username.toLowerCase() === 'vercel' || username.toLowerCase() === 'vercel[bot]') {
        skippedComments.push({ username, reason: 'vercel_bot' });
        return;
      }
      
      // Use bot detector with nit filtering options
      const shouldProcess = botDetector.shouldProcessComment(
        username, 
        comment.body || '', 
        comment.type,
        { skipNits: options.skipNits, nitsOnly: options.nitsOnly }
      );
      
      if (options.debug && username.includes('coderabbit')) {
        console.log(`Debug: Processing ${username} (${comment.type}):`, shouldProcess);
      }
      
      if (shouldProcess.process && shouldProcess.details?.isBot) {
        // It's a bot comment that should be processed
        botComments.push({ 
          ...comment, 
          isBot: true,
          botType: shouldProcess.details.botType,
          confidence: shouldProcess.confidence,
          isNit: shouldProcess.details.isNit,
          nitPattern: shouldProcess.details.nitPattern
        });
      } else if (!shouldProcess.process && shouldProcess.reason === 'not_a_bot') {
        // It's a human comment
        if (username && !username.includes('github-actions')) {
          humanComments.push({ ...comment, isBot: false });
        }
      } else {
        // Bot comment that should be skipped
        skippedComments.push({ 
          username, 
          reason: shouldProcess.reason,
          confidence: shouldProcess.confidence,
          isNit: shouldProcess.details?.isNit,
          nitPattern: shouldProcess.details?.nitPattern,
          body: comment.body?.substring(0, 50) + '...'
        });
      }
    });
    
    // Group into threads
    const botThreads = groupIntoThreads(botComments);
    const humanThreads = groupIntoThreads(humanComments);
    
    if (options.debug) {
      console.log('Debug: Bot comments processed:', botComments.length);
      console.log('Debug: Human comments processed:', humanComments.length);
      console.log('Debug: Skipped comments:', skippedComments.length);
    }
    
    return {
      pr,
      comments: botComments,  // Maintain backward compatibility
      threads: botThreads,     // Maintain backward compatibility
      botComments,
      humanComments,
      botThreads,
      humanThreads,
      allComments: [...botComments, ...humanComments],
      debugInfo: options.debug ? { ...debugInfo, skippedComments } : undefined
    };
  } catch (error) {
    throw new Error(`Failed to fetch PR: ${error.message}`);
  }
}

function groupIntoThreads(comments) {
  const threads = {};
  
  comments.forEach(comment => {
    // For review comments, use the discussion thread ID
    const threadId = comment.in_reply_to_id || comment.id;
    
    if (!threads[threadId]) {
      threads[threadId] = [];
    }
    threads[threadId].push(comment);
  });
  
  // Sort threads by timestamp
  Object.values(threads).forEach(thread => {
    thread.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
  });
  
  return threads;
}