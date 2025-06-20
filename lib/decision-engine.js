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
          explanation: `This is a valid pattern in our codebase. ${validPattern.reason}`,
          confidence: 0.95
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
        suggestedFix: suggestedFix,
        confidence: suggestedFix ? 0.90 : 0.95
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
        suggestedFix: suggestedFix,
        confidence: suggestedFix ? 0.85 : 0.90
      };
    }
  }
  
  // Check for architectural discussions
  if (/refactor|restructur|architect|design\s*pattern/i.test(body)) {
    return {
      action: 'DISCUSS',
      reason: 'Architectural changes require discussion',
      suggestedReply: 'Thanks for the suggestion. Could you provide more context on the benefits of this approach for our use case?',
      confidence: 0.70
    };
  }
  
  // Check for future work/enhancement suggestions
  if (/future|enhancement|nice\s*to\s*have|consider|roadmap|later|eventually|long[\s-]?term/i.test(body)) {
    return {
      action: 'DEFER',
      reason: 'Enhancement suggestion for future consideration',
      suggestedReply: 'Thanks for the suggestion! This is a good idea for future improvement. I\'ll create a tracking issue for this.',
      confidence: 0.75,
      severity: 'LOW'
    };
  }
  
  // Check for non-critical improvements
  if (/could\s*be|might\s*want|consider|suggestion|improvement|optimize|enhance/i.test(body)) {
    // If it's not a security or critical issue, defer it
    if (!/(security|critical|vulnerability|risk)/i.test(body)) {
      return {
        action: 'DEFER',
        reason: 'Non-critical improvement suggestion',
        suggestedReply: 'Good suggestion! I\'ll track this for future improvement.',
        confidence: 0.65,
        severity: 'LOW'
      };
    }
  }
  
  // Check if this is marked as a nit comment
  if (comment.isNit) {
    return {
      action: 'NIT',
      reason: 'Minor style/cosmetic suggestion',
      suggestedReply: 'Thanks for the suggestion. We\'ll consider this for future improvements.',
      confidence: 0.80,
      severity: 'LOW'
    };
  }
  
  // Default to discussion for unclear items
  return {
    action: 'DISCUSS',
    reason: 'Need more context to make a decision',
    suggestedReply: 'Could you clarify the preferred approach here?',
    confidence: 0.50
  };
}

export function categorizeIssue(description, isNit = false) {
  const desc = description.toLowerCase();
  
  // If marked as nit, categorize appropriately
  if (isNit) {
    return 'NITPICK';
  }
  
  // Check for style/formatting issues FIRST (before security)
  if (/type-only\s*import|prefer\s*type\s*import|import\s*type/i.test(desc)) {
    return 'STYLE';
  }
  
  if (/console\.(log|error|warn|debug)|remove\s*console|debug\s*(statement|logging)/i.test(desc)) {
    return 'DEBUG';
  }
  
  if (/empty\s*(catch|block)|catch\s*block.*empty/i.test(desc)) {
    return 'CODE_QUALITY';
  }
  
  if (/\b(formatting|indent|indentation|spacing|semicolon|quotes|lint|eslint|prettier)\b/i.test(desc)) {
    return 'STYLE';
  }
  
  // Check for nit patterns before checking security
  if (/\bnit\b|minor|trivial|style|cosmetic|consider|suggestion/i.test(desc)) {
    return 'NITPICK';
  }
  
  // NOW check for actual security issues (with more specific patterns)
  if (/hardcoded.*(api|secret|key|token|password)/i.test(desc) ||
      /exposed?\s*(credentials?|secrets?|api\s*key|token)/i.test(desc) ||
      /sql\s*injection|xss|cross-site|vulnerability|security\s*(risk|issue|vulnerability)/i.test(desc) ||
      /plain\s*text\s*password|unencrypted\s*password/i.test(desc)) {
    return 'SECURITY';
  }
  
  // Check for auth issues separately (to avoid false positives from file paths)
  if (/missing\s*(auth|authentication|authorization)/i.test(desc) ||
      /broken\s*(auth|authentication)/i.test(desc) ||
      /bypass\s*(auth|authentication)/i.test(desc)) {
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
    category: categorizeIssue(comment.body, comment.isNit)
  }));
}

// Generate appropriate commit message based on category
export function generateCommitMessageForCategory(category, description) {
  const categoryMessages = {
    'STYLE': 'style: Apply code formatting and style improvements',
    'DEBUG': 'chore: Remove debug statements and console logs',
    'CODE_QUALITY': 'refactor: Improve code quality and maintainability',
    'TYPE_SAFETY': 'types: Fix TypeScript type issues',
    'PERFORMANCE': 'perf: Apply performance optimizations',
    'SECURITY': 'security: Fix security vulnerabilities',
    'NITPICK': 'style: Apply minor style suggestions',
    'GENERAL': 'fix: Apply code review feedback'
  };
  
  return categoryMessages[category] || categoryMessages.GENERAL;
}

// Generate accurate description based on category and issue type
export function generateAccurateDescription(category, issueDescription) {
  // Extract key information from the issue description
  const desc = issueDescription.toLowerCase();
  
  if (category === 'STYLE') {
    if (desc.includes('type-only') || desc.includes('import type')) {
      return 'Convert to type-only imports for better tree-shaking';
    }
    if (desc.includes('formatting') || desc.includes('indent')) {
      return 'Fix code formatting and indentation';
    }
    return 'Apply style improvements';
  }
  
  if (category === 'DEBUG') {
    if (desc.includes('console.log')) {
      return 'Remove console.log statements';
    }
    if (desc.includes('debug')) {
      return 'Remove debug code';
    }
    return 'Clean up debug statements';
  }
  
  if (category === 'CODE_QUALITY') {
    if (desc.includes('empty catch')) {
      return 'Add error handling or comments to empty catch blocks';
    }
    if (desc.includes('unused')) {
      return 'Remove unused code';
    }
    if (desc.includes('complex')) {
      return 'Simplify complex code';
    }
    return 'Improve code quality';
  }
  
  if (category === 'SECURITY') {
    if (desc.includes('api key') || desc.includes('token')) {
      return 'Move sensitive credentials to environment variables';
    }
    if (desc.includes('sql injection')) {
      return 'Fix SQL injection vulnerability';
    }
    if (desc.includes('xss')) {
      return 'Fix XSS vulnerability';
    }
    return 'Fix security vulnerability';
  }
  
  return issueDescription;
}