# Context and Learnings from Woodhouse Project

## Why This Tool Exists

Started as a complex GitHub Actions workflow system to automatically respond to CodeRabbit reviews on the Woodhouse project. After building extensive webhook orchestration, realized a simpler CLI tool focused on RESPONDING TO BOTS (not replacing them) would be more maintainable and useful.

## Key Learnings

### 1. What Didn't Work
- **GitHub Actions for conversational state** - Too complex, hard to debug
- **Fully automated responses** - Needed human oversight for trust
- **Tight coupling to one LLM** - Users want choice
- **Distributed webhook choreography** - Overengineered for the problem

### 2. What We Discovered
- **Human-in-the-loop is better** - Quick approval beats full automation
- **CLI tools are easier to test** - Run locally, see what happens
- **Project patterns matter** - Each codebase has valid "anti-patterns"
- **Conversation context is crucial** - Single-shot responses miss nuance

### 3. Technical Patterns from Woodhouse

#### Valid "Issues" That Should Be Rejected:
```javascript
// console.log in Lambda - VALID for CloudWatch
exports.handler = async (event) => {
  console.log('Processing event:', event); // This is correct!
}

// 'any' type for complex external APIs - VALID
const stripeWebhook: any = req.body; // Stripe types are complex

// Hardcoded values in infrastructure - SOMETIMES VALID
const TABLE_NAME = 'users-prod'; // OK in CDK/deployment code
```

#### Always Fix:
- Hardcoded API keys/secrets
- SQL injection vulnerabilities  
- Password/sensitive data in logs
- Missing error handling
- Stack traces in API responses

### 4. CodeRabbit Specific Insights

CodeRabbit comments have structure:
- Main summary comment
- Inline file comments
- Often hidden "nitpick" sections
- Tool findings (Gitleaks, ESLint, etc.)

Must check all locations for complete review.

### 5. Decision Framework

Developed these categories:
- **AUTO-FIX**: Security issues, clear bugs, simple type fixes
- **DISCUSS**: Need more context, multiple valid approaches
- **REJECT**: Valid project patterns with explanation
- **ESCALATE**: Architecture changes, business logic
- **BACKLOG**: Good ideas but not urgent

### 6. Bot Response Philosophy

Key insight: Bots are valuable but need context about YOUR project. Instead of fighting them:
- Work WITH bots, not against them
- Educate bots about your patterns
- Fix real issues they find
- Explain why false positives are valid
- Remember explanations for next time

### 7. Integration Insights

Best approach for Claude Code integration:
1. CLI prepares structured bot comments
2. Saves to `.pr-bot/` directory  
3. Claude Code reads context when needed
4. Shared response history

## Code Snippets Worth Keeping

### Thread Grouping Logic
```javascript
function groupIntoThreads(comments) {
  const threads = {};
  comments.forEach(comment => {
    const threadId = comment.in_reply_to_id || comment.id;
    if (!threads[threadId]) threads[threadId] = [];
    threads[threadId].push(comment);
  });
  return Object.values(threads);
}
```

### Pattern Matching
```javascript
const validPatterns = [
  {
    pattern: /console\.log.*Lambda/,
    reason: "CloudWatch logging in Lambda",
    action: "REJECT"
  },
  {
    pattern: /any.*stripe|webhook/i,
    reason: "Complex external API types",
    action: "REJECT"
  }
];
```

### Decision Prompt Structure
```
Project Context: [specific patterns]
Thread History: [full conversation]
Current Issue: [what to analyze]
Required: Suggest action and reasoning
```

## Mistakes to Avoid

1. Don't over-automate - keep human control
2. Don't assume one-size-fits-all - projects differ
3. Don't ignore conversation history - context matters
4. Don't make it GitHub-only - GitLab/Bitbucket exist
5. Don't require cloud deployment - local is simpler

## Future Ideas

- VS Code extension version
- Web UI for team reviews
- Integration with more review tools
- Learning system that improves suggestions
- Metrics on time saved