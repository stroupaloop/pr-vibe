# Pattern Learning System

## Overview

A dual-layer pattern system that learns from decisions and shares knowledge across projects.

## Architecture

```
├── Repository Level (.pr-bot/patterns.yml)
│   └── Project-specific patterns and decisions
│
└── Global Level (~/.pr-bot/learned-patterns.json)
    └── Patterns learned across all projects
```

## 1. Repository-Level Context File

### `.pr-bot/patterns.yml` (in each repo)

```yaml
# Project-specific patterns that override global patterns
version: 1.0
project: woodhouse-modern
last_updated: 2024-06-17T10:00:00Z
updated_by: claude-code

# Patterns this project has validated
valid_patterns:
  - id: console-log-lambda
    pattern: "console.log in Lambda"
    files: ["**/lambda/**/*.js", "**/*-handler.js"]
    reason: "CloudWatch logging required for Lambda functions"
    confidence: 1.0
    examples:
      - pr: 15
        comment_id: RC_kwDOO7pDnc6XnJFP
        bot: coderabbitai
        
  - id: any-type-webhooks
    pattern: "any type for webhook payloads"
    files: ["**/webhooks/**/*.ts", "**/stripe-webhook.ts"]
    reason: "External API payloads are complex and untyped"
    confidence: 0.95

# Auto-fix templates specific to this project
auto_fixes:
  - id: env-var-pattern
    trigger: "hardcoded.*(key|secret|token)"
    template: |
      const {{VARIABLE_NAME}} = process.env.{{ENV_NAME}};
      if (!{{VARIABLE_NAME}}) {
        throw new Error('{{ENV_NAME}} environment variable is required');
      }
    applies_to: ["**/*.js", "**/*.ts"]

# Escalation rules
escalation_rules:
  - pattern: "architectural|refactor|redesign"
    notify: ["@stroupaloop", "@team-leads"]
    reason: "Architecture decisions need team input"
    
  - pattern: "performance|n+1|optimization"
    notify: ["@backend-team"]
    reason: "Performance impacts need specialist review"

# History of decisions made
decision_history:
  - date: 2024-06-17
    pr: 26
    bot: coderabbitai
    comment: "Remove console.log from Lambda"
    decision: REJECT
    learned: true
    
  - date: 2024-06-16
    pr: 25
    bot: deepsource
    comment: "Function exceeds 50 lines"
    decision: DEFER
    reason: "Working code, refactor later"
```

## 2. Global Learning File

### `~/.pr-bot/learned-patterns.json`

```json
{
  "version": "1.0",
  "total_decisions": 1847,
  "last_updated": "2024-06-17T10:00:00Z",
  
  "patterns": {
    "console-log-lambda": {
      "id": "console-log-lambda",
      "occurrences": 47,
      "projects": ["woodhouse-modern", "my-api", "serverless-app"],
      "confidence": 0.98,
      "description": "console.log in Lambda functions for CloudWatch",
      "auto_decision": "REJECT",
      "suggested_reply": "Console.log is intentionally used in Lambda functions for CloudWatch logging."
    },
    
    "hardcoded-table-names": {
      "id": "hardcoded-table-names",
      "occurrences": 23,
      "projects": ["woodhouse-modern"],
      "confidence": 0.87,
      "description": "DynamoDB table names in CDK/infrastructure",
      "auto_decision": "REJECT",
      "conditions": ["path contains 'cdk' or 'infrastructure'"]
    }
  },
  
  "bot_behaviors": {
    "coderabbitai": {
      "total_comments": 892,
      "patterns": {
        "console-log": {
          "frequency": 0.15,
          "typical_severity": "warning"
        },
        "any-type": {
          "frequency": 0.08,
          "typical_severity": "suggestion"
        }
      }
    }
  },
  
  "effectiveness": {
    "auto_decisions": {
      "total": 1523,
      "correct": 1498,
      "accuracy": 0.984
    },
    "time_saved_hours": 127.5
  }
}
```

## 3. Learning Flow

### When Claude Code Makes a Decision:

```javascript
// 1. Check repo-specific patterns first
const repoPatterns = loadRepoPatterns('.pr-bot/patterns.yml');
const decision = matchPattern(comment, repoPatterns);

// 2. Fall back to global learned patterns
if (!decision) {
  const globalPatterns = loadGlobalPatterns();
  decision = matchPattern(comment, globalPatterns);
}

// 3. Record the decision
recordDecision({
  pr: prNumber,
  comment: comment,
  decision: decision,
  timestamp: new Date()
});

// 4. Update confidence scores
if (userConfirmsDecision) {
  pattern.confidence += 0.01;
} else if (userOverridesDecision) {
  pattern.confidence -= 0.05;
}

// 5. Share learnings globally (if confidence > 0.9)
if (pattern.confidence > 0.9 && pattern.occurrences > 10) {
  addToGlobalPatterns(pattern);
}
```

## 4. CLI Commands for Pattern Management

### View Patterns
```bash
# Show project patterns
pr-bot patterns --repo .

# Show global patterns
pr-bot patterns --global

# Show patterns for specific bot
pr-bot patterns --bot coderabbitai
```

### Learn from History
```bash
# Analyze past PRs to build patterns
pr-bot learn --repo stroupaloop/woodhouse-modern --last 50

# Import patterns from another project
pr-bot patterns import --from ~/other-project/.pr-bot/patterns.yml
```

### Share Patterns
```bash
# Export patterns for team
pr-bot patterns export --output team-patterns.yml

# Submit patterns to community database
pr-bot patterns share --pattern console-log-lambda
```

## 5. Pattern Precedence

1. **Repo-specific patterns** (highest priority)
2. **User-confirmed patterns** (high confidence)
3. **Global learned patterns** (medium confidence)
4. **Default rules** (fallback)

## 6. Benefits

### For Individual Developers
- Decisions get smarter over time
- Never explain the same pattern twice
- Share patterns across your projects

### For Teams
- Consistent responses across team members
- Onboard new devs with existing patterns
- Document your "why" decisions

### For Community
- Learn from others' patterns
- Contribute validated patterns
- Build collective intelligence

## 7. Privacy & Control

```yaml
# .pr-bot/config.yml
learning:
  # What to track
  track_decisions: true
  track_patterns: true
  
  # What to share
  share_anonymous_patterns: true
  share_with_team: true
  share_publicly: false
  
  # Auto-apply confidence threshold
  auto_apply_threshold: 0.95
```

## 8. Example Learning Scenario

1. **Week 1**: CodeRabbit flags console.log in Lambda
   - You: REJECT (manual)
   - Pattern recorded with confidence: 0.7

2. **Week 2**: Same issue, different PR
   - System suggests: REJECT (confidence: 0.7)
   - You: Confirm
   - Confidence increases to 0.8

3. **Week 4**: After 10 similar decisions
   - Pattern confidence: 0.95
   - Now auto-applied without asking

4. **Month 2**: Pattern shared globally
   - Helps 100s of other developers
   - You never see this comment again

## Implementation Status

- [ ] Repository-level patterns file
- [ ] Global learning system
- [ ] Pattern matching engine
- [ ] Confidence scoring
- [ ] Pattern sharing mechanism
- [ ] Community pattern database

This creates a true learning system that gets smarter with every PR!