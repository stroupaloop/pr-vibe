# pr-vibe Quick Start 🎵

## Installation

```bash
npm install -g pr-vibe
```

## Basic Workflow

### 1. Initialize pr-vibe in your project
```bash
cd your-project
pr-vibe init

# This creates:
# - .pr-bot/patterns.yml (your project's learned patterns)
# - .pr-bot/config.yml (configuration)
```

### 2. When you get bot reviews on a PR
```bash
# Export bot comments for analysis
pr-vibe export 123 -o pr-123-review.json

# Review what the bots found
pr-vibe review 123

# Apply decisions (auto-fix issues, respond to comments)
pr-vibe apply 123 --decisions decisions.json
```

## Example: Real CodeRabbit Review

Here's how pr-vibe handled PR #20 with 19 CodeRabbit comments:

```bash
# 1. Export CodeRabbit's comments
pr-vibe export 20 -o review.json
# Found 19 comments from coderabbitai[bot]

# 2. Analyze and create decisions
pr-vibe review 20
# ✓ REJECT: console.log in Lambda (valid CloudWatch pattern)
# ✓ AUTO_FIX: Hardcoded API key → environment variable
# ✓ AUTO_FIX: SQL injection → parameterized query
# ✓ ESCALATE: Error handling strategy needs human input

# 3. Apply the decisions
pr-vibe apply 20
# ✓ Posted 3 replies explaining rejections
# ✓ Fixed 2 security issues automatically
# ✓ Tagged @stroupaloop for escalated issue
```

## Pattern Learning

After each PR, pr-vibe gets smarter:

```yaml
# .pr-bot/patterns.yml
valid_patterns:
  - id: console-log-lambda
    pattern: "console.log"
    condition:
      files: ["**/lambda/**", "**/*-handler.js"]
    confidence: 0.95
    auto_reply: "We use console.log for CloudWatch logging in Lambda functions"
```

## Commands

- `pr-vibe init` - Set up pr-vibe in your project
- `pr-vibe export <PR>` - Export bot comments from a PR
- `pr-vibe review <PR>` - Interactively review bot comments
- `pr-vibe apply <PR>` - Apply decisions (fix code, post replies)
- `pr-vibe patterns` - Manage learned patterns
- `pr-vibe stats` - See how much time you've saved

## Configuration

Set your API keys:
```bash
export GITHUB_TOKEN=ghp_xxxx
export OPENAI_API_KEY=sk-xxxx  # Optional: for LLM features
```

## The Vibe ✨

Let pr-vibe handle the repetitive bot feedback so you can focus on building great software. The more you use it, the smarter it gets!