/**
 * Decision Engine - Core logic for analyzing PR comments
 */

// Pattern definitions for different issue types
const PATTERNS = {
  SECURITY: {
    CRITICAL: [
      /hardcoded.*(api|secret|key|token|password)/i,
      /sql\s*injection/i,
      /exposed?\s*(credentials?|secrets?)/i,
      /plain\s*text\s*password/i
    ],
    HIGH: [
      /missing\s*(auth|validation|sanitization)/i,
      /cors\s*wildcard|\*/i,
      /eval\(|new Function\(/
    ]
  },
  VALID_PATTERNS: [
    {
      pattern: /console\.(log|error|warn).*lambda/i,
      reason: 'Console logging is valid for CloudWatch in Lambda functions'
    },
    {
      pattern: /any.*type.*(stripe|webhook|external\s*api)/i,
      reason: 'Using any type is acceptable for complex external API payloads'
    },
    {
      pattern: /hardcoded.*(table|bucket).*name/i,
      condition: (comment) => comment.path?.includes('infrastructure') || comment.path?.includes('cdk'),
      reason: 'Hardcoded resource names are valid in infrastructure code'
    }
  ]
};

export function analyzeComment(comment) {
  const body = comment.body.toLowerCase();
  const path = comment.path || '';
  
  // Check for valid patterns first
  for (const validPattern of PATTERNS.VALID_PATTERNS) {
    if (validPattern.pattern.test(body)) {
      if (!validPattern.condition || validPattern.condition(comment)) {
        return {
          action: 'REJECT',
          reason: validPattern.reason,
          explanation: `This is a valid pattern in our codebase. ${validPattern.reason}`
        };
      }
    }
  }
  
  // Check for security issues
  for (const pattern of PATTERNS.SECURITY.CRITICAL) {
    if (pattern.test(body)) {
      const suggestedFix = generateSecurityFix(body, path);
      return {
        action: suggestedFix ? 'AUTO_FIX' : 'ESCALATE',
        severity: 'CRITICAL',
        reason: suggestedFix 
          ? 'Critical security vulnerability must be fixed immediately'
          : 'Critical security issue requires human review',
        suggestedFix: suggestedFix
      };
    }
  }
  
  // Check for high priority issues
  for (const pattern of PATTERNS.SECURITY.HIGH) {
    if (pattern.test(body)) {
      const suggestedFix = generateSecurityFix(body, path);
      return {
        action: suggestedFix ? 'AUTO_FIX' : 'ESCALATE',
        severity: 'HIGH',
        reason: suggestedFix
          ? 'Security issue that should be fixed'
          : 'Security issue requires human review',
        suggestedFix: suggestedFix
      };
    }
  }
  
  // Check for architectural discussions
  if (/refactor|restructur|architect|design\s*pattern/i.test(body)) {
    return {
      action: 'DISCUSS',
      reason: 'Architectural changes require discussion',
      suggestedReply: 'Thanks for the suggestion. Could you provide more context on the benefits of this approach for our use case?'
    };
  }
  
  // Default to discussion for unclear items
  return {
    action: 'DISCUSS',
    reason: 'Need more context to make a decision',
    suggestedReply: 'Could you clarify the preferred approach here?'
  };
}

export function categorizeIssue(description) {
  const desc = description.toLowerCase();
  
  if (/security|api\s*key|sql\s*injection|credential|password|auth/i.test(desc)) {
    return 'SECURITY';
  }
  
  if (/performance|n\+1|slow|inefficient|optimize/i.test(desc)) {
    return 'PERFORMANCE';
  }
  
  if (/unused|complex|refactor|clean|quality/i.test(desc)) {
    return 'CODE_QUALITY';
  }
  
  if (/type|typescript|any/i.test(desc)) {
    return 'TYPE_SAFETY';
  }
  
  return 'GENERAL';
}

function generateSecurityFix(issue, path) {
  if (/hardcoded.*(api|key|token)/i.test(issue)) {
    return `Move to environment variable:
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}`;
  }
  
  if (/sql\s*injection/i.test(issue)) {
    return `Use parameterized queries:
// Instead of: query = \`SELECT * FROM users WHERE id = \${userId}\`
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId], callback);`;
  }
  
  if (/missing\s*validation/i.test(issue)) {
    return `Add input validation:
if (!input || typeof input !== 'string') {
  return res.status(400).json({ error: 'Invalid input' });
}

// Sanitize input
const sanitized = input.trim().replace(/[^a-zA-Z0-9]/g, '');`;
  }
  
  // Return null to indicate no auto-fix available
  // This prevents replacing working code with TODO placeholders
  return null;
}

// Helper for batch analysis
export function analyzeMultipleComments(comments) {
  return comments.map(comment => ({
    comment,
    analysis: analyzeComment(comment),
    category: categorizeIssue(comment.body)
  }));
}