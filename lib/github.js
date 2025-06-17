import { execSync } from 'child_process';

export async function analyzeGitHubPR(prNumber, repo, options = {}) {
  try {
    // Use gh CLI for now (simpler for prototype)
    const prJson = execSync(`gh pr view ${prNumber} --repo ${repo} --json title,body,state,comments,reviews`, 
      { encoding: 'utf-8' });
    const pr = JSON.parse(prJson);
    
    // Get review comments (inline)
    const reviewCommentsJson = execSync(`gh api repos/${repo}/pulls/${prNumber}/comments`, 
      { encoding: 'utf-8' });
    const reviewComments = JSON.parse(reviewCommentsJson);
    
    // Combine all comments - normalize the structure
    const allComments = [
      ...pr.comments.map(c => ({ 
        ...c, 
        type: 'issue',
        user: c.user || c.author,
        created_at: c.created_at || c.createdAt
      })),
      ...reviewComments.map(c => ({ ...c, type: 'review' }))
    ];
    
    // Filter for review bot comments only
    const filteredComments = allComments.filter(comment => {
      const username = comment.user?.login || comment.author?.login || '';
      
      // Skip if it's from vercel bot or just metadata
      if (username === 'vercel' || username === 'vercel[bot]') return false;
      
      // Skip CodeRabbit summary comments (keep only actionable ones)
      if (username.includes('coderabbit') && comment.body.includes('<!-- walkthrough_start -->')) return false;
      
      // Include CodeRabbit actionable comments
      if (username.includes('coderabbit')) return true;
      
      // Include other bots
      if (username.includes('bot') || username.includes('[bot]')) return true;
      
      return false;
    });
    
    // Group into threads
    const threads = groupIntoThreads(filteredComments);
    
    return {
      pr,
      comments: filteredComments,
      threads
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