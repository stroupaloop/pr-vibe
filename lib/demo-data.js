// Demo data for pr-vibe showcase - no authentication required

export const demoPRData = {
  number: 42,
  title: "Add user authentication system",
  repository: "awesome-app/backend",
  url: "https://github.com/awesome-app/backend/pull/42",
  author: "dev-user",
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  comments: [
    {
      id: 1,
      user: { login: "coderabbit[bot]" },
      body: "🚨 **Security Issue**: Hardcoded API key detected in `config.js` line 42. This should be moved to environment variables.",
      path: "src/config.js",
      line: 42,
      created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      user: { login: "coderabbit[bot]" },
      body: "⚠️ **Code Quality**: Remove `console.log` statements before merging to production.",
      path: "src/handlers/auth.js",
      line: 156,
      created_at: new Date(Date.now() - 85 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      user: { login: "deepsource[bot]" },
      body: "Found usage of `any` type. Consider using more specific types for better type safety.",
      path: "src/webhooks/stripe.ts",
      line: 23,
      created_at: new Date(Date.now() - 80 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      user: { login: "coderabbit[bot]" },
      body: "📝 **TODO Comment**: Found TODO comment that should be tracked in your issue tracker.",
      path: "src/utils/validation.js",
      line: 89,
      created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString()
    },
    {
      id: 5,
      user: { login: "sonarcloud[bot]" },
      body: "Code smell: Function 'processPayment' has a Cognitive Complexity of 21 (exceeds 15 allowed).",
      path: "src/payments/processor.js",
      line: 145,
      created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString()
    }
  ]
};

export const demoPatterns = {
  version: "1.0",
  project: "awesome-app",
  valid_patterns: [
    {
      id: "console-lambda",
      pattern: "console.log",
      condition: { files: ["**/lambda/**", "**/handlers/**"] },
      reason: "CloudWatch logging in Lambda functions",
      auto_reply: "This console.log is intentional - we use CloudWatch for Lambda monitoring",
      confidence: 0.95
    },
    {
      id: "any-webhooks",
      pattern: "any.*type",
      condition: { files: ["**/webhooks/**"] },
      reason: "Webhook payloads have dynamic schemas",
      auto_reply: "Webhook payloads from external services don't have stable types",
      confidence: 0.88
    }
  ],
  auto_fixes: [
    {
      trigger: "hardcoded.+(api|key|secret|token)",
      fix_template: "const {{CONST_NAME}} = process.env.{{ENV_NAME}};",
      message: "Moving sensitive data to environment variables"
    }
  ]
};

export const demoBotResponses = {
  1: {
    decision: "AUTO_FIX",
    response: "Fixed by moving to environment variable",
    fix: "const API_KEY = process.env.API_KEY;"
  },
  2: {
    decision: "REJECT",
    response: "This console.log is intentional - we use CloudWatch for Lambda monitoring",
    pattern_learned: true
  },
  3: {
    decision: "REJECT", 
    response: "Webhook payloads from Stripe don't have stable types - using 'any' is appropriate here",
    pattern_learned: true
  },
  4: {
    decision: "DEFER",
    response: "TODO is already tracked in Jira ticket PROJ-1234"
  },
  5: {
    decision: "ESCALATE",
    response: "Refactoring needed - adding to technical debt backlog"
  }
};

export function getDemoSummary() {
  return {
    total_comments: 5,
    auto_fixed: 1,
    rejected_with_explanation: 2,
    deferred: 1,
    escalated: 1,
    time_saved_minutes: 18,
    patterns_learned: 2
  };
}