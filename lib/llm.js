export async function processWithLLM(threadComments) {
  // For prototype, use simple rules
  // Later this will call Claude/GPT-4/etc
  
  const firstComment = threadComments[0];
  const commentBody = firstComment.body.toLowerCase();
  
  // Mock analysis based on patterns
  if (commentBody.includes('hardcoded') && commentBody.includes('api key')) {
    return {
      decision: 'AUTO_FIX',
      reason: 'Security issue - exposed credentials must be fixed',
      suggestedFix: 'Move to environment variable:\nconst API_KEY = process.env.API_KEY;',
      suggestedReply: 'Fixed! Moved the API key to an environment variable.'
    };
  }
  
  if (commentBody.includes('console.log') && commentBody.includes('lambda')) {
    return {
      decision: 'REJECT',
      reason: 'Valid pattern - console.log is used for CloudWatch logging in Lambda',
      suggestedReply: 'This is intentional - we use console.log for CloudWatch logging in our Lambda functions.'
    };
  }
  
  if (commentBody.includes('sql injection')) {
    return {
      decision: 'AUTO_FIX',
      reason: 'Critical security vulnerability',
      suggestedFix: 'Use parameterized queries:\nconst query = "SELECT * FROM users WHERE id = ?";',
      suggestedReply: 'Fixed! Now using parameterized queries to prevent SQL injection.'
    };
  }
  
  // Default to discussion
  return {
    decision: 'DISCUSS',
    reason: 'Need more context to make a decision',
    suggestedReply: 'Thanks for the feedback. Could you provide more context on the preferred approach here?'
  };
}