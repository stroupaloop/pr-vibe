# pr-vibe 🎵

[![npm version](https://img.shields.io/npm/v/pr-vibe.svg)](https://www.npmjs.com/package/pr-vibe)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/stroupaloop/pr-vibe/actions/workflows/test.yml/badge.svg)](https://github.com/stroupaloop/pr-vibe/actions/workflows/test.yml)
[![CodeQL](https://github.com/stroupaloop/pr-vibe/actions/workflows/codeql.yml/badge.svg)](https://github.com/stroupaloop/pr-vibe/actions/workflows/codeql.yml)
[![Built by AI](https://img.shields.io/badge/Built%20by-Claude%20AI-purple)](https://github.com/stroupaloop/pr-vibe)
[![npm downloads](https://img.shields.io/npm/dm/pr-vibe.svg)](https://www.npmjs.com/package/pr-vibe)
[![GitHub stars](https://img.shields.io/github/stars/stroupaloop/pr-vibe.svg?style=social)](https://github.com/stroupaloop/pr-vibe)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/stroupaloop/pr-vibe/pulls)

> 🎵 When AI tools vibe together on your PRs. Let CodeRabbit, Claude Code, and other bots handle the repetitive feedback while you ship features.

Built BY an AI (Claude) FOR AIs to orchestrate - the first tool designed for AI-to-AI collaboration on code reviews.

## Demo

```bash
# Try instantly without any setup!
npx pr-vibe@latest demo
```

Visit our [interactive demo](https://stroupaloop.github.io/pr-vibe/) to see pr-vibe in action.

## Why pr-vibe?

PR review bots like CodeRabbit, Claude Code, and DeepSource are great, but they don't understand *your* project. You find yourself:
- Explaining why `console.log` is valid in Lambda functions... again
- Rejecting the same "any types" warnings for complex webhooks
- Manually fixing the same security issues they flag
- Waiting for bot responses and handling rate limits

pr-vibe bridges this gap by:
- 🤝 **Working WITH bots** - Enhances CodeRabbit, Claude Code, DeepSource, etc. rather than replacing them
- 💬 **Full Conversations** - Handles multi-round dialogues until resolution
- 🧠 **Learning your patterns** - Remembers your project's conventions and valid exceptions
- ⚡ **Automating responses** - Fixes what should be fixed, explains what's intentional
- 🎯 **Saving time** - Handle bot comments in seconds, not minutes
- 🤖 **Claude Code Support** - Special integration for Claude Code's confidence levels and categorization

## Features

- 🚀 **Zero-Setup Demo** - Try instantly with `npx pr-vibe@latest demo`
- 💬 **Full Conversation Support** - Handles multi-round dialogues with bots, including rate limits
- 🔐 **Smart Auth Detection** - Finds GitHub tokens from gh CLI, env vars, VS Code automatically
- 🔍 **Bot Comment Analysis** - Parses and understands comments from all major PR review bots
- 🛠️ **Smart Actions** - Auto-fix simple issues, explain valid patterns, or escalate edge cases
- 🧠 **Project Memory** - Learns and remembers your project-specific patterns
- ⏱️ **Rate Limit Handling** - Detects and waits for bot rate limits automatically
- 📊 **Detailed Reports** - Save comprehensive reports of all actions taken for review
- ✅ **Pre-Merge Safety** - Check if all bot comments are resolved before merging
- 📈 **GitHub Status Checks** - Post status checks to PRs for team visibility
- 🗑️ **Auto-Cleanup** - Reports expire after 30 days to keep your repo clean
- 🔌 **LLM Flexibility** - Works with Claude, GPT-4, Gemini, or without any LLM
- ⚡ **CLI First** - Full control with human-in-the-loop design

## Installation

```bash
npm install -g pr-vibe

# Or use directly with npx
npx pr-vibe review 42
```

## Getting Started

### Option 1: Try the Demo (No Setup Required!)

```bash
npx pr-vibe@latest demo
```

### Option 2: Quick Start (60 seconds)

1. **Install pr-vibe globally:**
   ```bash
   npm install -g pr-vibe
   ```

2. **Check authentication status:**
   ```bash
   pr-vibe auth
   ```
   
   pr-vibe will automatically detect GitHub tokens from:
   - GitHub CLI (`gh auth token`)
   - Environment variables (`GITHUB_TOKEN`, `GH_TOKEN`)
   - VS Code GitHub extension
   - Git config
   
   > **🔐 Security Note**: Never commit tokens to the repository. See [SECURITY.md](SECURITY.md) for best practices.

3. **Initialize in your project:**
   ```bash
   cd your-project
   pr-vibe init
   ```

4. **Review your next PR with bot comments:**
   ```bash
   pr-vibe pr 42
   ```

That's it! pr-vibe will analyze bot comments, handle conversations, and start learning your patterns.

## Commands

```bash
# Interactive demo - no setup required!
pr-vibe demo

# Check authentication status
pr-vibe auth

# Initialize patterns in your project
pr-vibe init

# Review bot comments interactively
pr-vibe pr 42

# Filter comments by priority
pr-vibe pr 42 --skip-nits  # Focus on critical issues only
pr-vibe pr 42 --nits-only  # Review only style/formatting comments
pr-vibe pr 42 --show-all   # Show all comments including non-critical

# Smart watch mode - wait for bots to arrive
pr-vibe watch 42                # Watch for bot reviews with smart polling
pr-vibe watch 42 --auto-process # Auto-process when all bots complete
pr-vibe watch 42 --timeout 30   # Custom timeout (default 10 minutes)

# Create GitHub issues for deferred feedback
pr-vibe pr 42 --create-issues  # Auto-create issues when deferring
pr-vibe issues 42              # Create issues from saved report
pr-vibe issues 42 --dry-run    # Preview without creating

# Check if PR is ready to merge (all bot comments resolved)
pr-vibe check 42

# View saved reports for a PR
pr-vibe report 42
pr-vibe report 42 --list  # List all reports
pr-vibe report 42 --json  # Output in JSON format

# Post GitHub status check
pr-vibe status 42         # View status
pr-vibe status 42 --post  # Post to GitHub

# Export comments for external analysis (Claude Code mode)
pr-vibe export 42

# Apply decisions from Claude Code
pr-vibe apply 42

# Clean up old reports
pr-vibe cleanup

# Specify a different repository
pr-vibe pr 42 -r owner/repo

# Show what's new
pr-vibe changelog
```

## Enhanced Output

pr-vibe now provides richer information about your PR:

- **Bot Approval Status**: See which bots approved your PR
- **Priority Breakdown**: Comments categorized as must-fix, suggestions, or nitpicks
- **PR URL**: Direct clickable link to your PR
- **Non-Critical Suggestions**: Optional improvements shown with `--show-all`

Example output:
```
🔍 Analyzing PR #42...
📎 https://github.com/owner/repo/pull/42

🤖 Bot Approval Status
✅ CodeRabbit: Approved - 3 suggestions, 2 nitpicks
❌ DeepSource: Changes Requested - 1 must-fix, 2 suggestions

✨ Summary
  Total comments: 8
  By Priority:
    Must Fix: 1
    Suggestions: 5
    Nitpicks: 2
    
  (2 non-critical suggestions hidden - use --show-all to view)

# Check for updates
pr-vibe update
```

## How It Works

1. **Fetches** bot comments from your PR (CodeRabbit, Claude Code, DeepSource, etc.)
2. **Analyzes** each comment with pattern matching and optional LLM
3. **Suggests** actions: fix, explain, defer, or escalate
4. **Handles** full conversations including follow-ups and rate limits
5. **Learns** from your decisions to get smarter over time
6. **Saves** you 20+ minutes per PR with heavy bot activity

### Claude Code Integration

pr-vibe has special support for Claude Code reviews:

- **Confidence Levels**: Extracts and uses Claude's confidence percentages (e.g., "95% confidence")
- **Categories**: Understands Claude's MUST_FIX, SUGGESTION, NITPICK categories
- **Smart Handling**: Skips re-analysis when Claude has already categorized issues
- **Priority Mapping**: Maps Claude's priorities to pr-vibe's action system
- **Approval Detection**: Recognizes when Claude approves changes

Example Claude Code comment handling:
```
Claude Code: "MUST_FIX: SQL injection vulnerability (95% confidence - FACT)"
pr-vibe: Automatically marks for fixing without re-analysis
```

## Pattern Learning

pr-vibe gets smarter with each use. When you reject a bot suggestion as valid for your project, pr-vibe remembers:

```yaml
# .pr-bot/patterns.yml
valid_patterns:
  - id: console-log-lambda
    pattern: "console.log"
    condition:
      files: ["**/lambda/**", "**/*-handler.js"]
    reason: "We use console.log for CloudWatch logging"
    confidence: 1.0
```

## LLM Integration (Optional)

Enhance pr-vibe with LLM analysis:

```bash
# Use Claude (recommended)
export ANTHROPIC_API_KEY=your-api-key
pr-vibe pr 42 --llm anthropic

# Use GPT-4
export OPENAI_API_KEY=your-api-key  
pr-vibe pr 42 --llm openai

# No LLM needed - pattern matching works great!
pr-vibe pr 42
```

## Smart Watch Mode

pr-vibe includes an intelligent watch mode that monitors your PR for bot activity:

- **Adaptive Polling**: Starts with 5s intervals, gradually increases to 60s
- **Bot Completion Detection**: Recognizes when bots finish their analysis
- **Expected Bot Tracking**: Learns which bots typically review your PRs
- **Auto-Process Option**: Automatically process comments when all bots complete

```bash
# Start watching immediately after creating a PR
gh pr create ...
pr-vibe watch 123

# Auto-process when all bots complete their reviews
pr-vibe watch 123 --auto-process

# Watch with custom timeout and auto-fix
pr-vibe watch 123 --auto-process --auto-fix --timeout 20
```

Smart polling intervals:
- 0-30s: Check every 5s (bots respond quickly)
- 30s-2m: Check every 15s (most bots have arrived)
- 2-5m: Check every 30s (waiting for slower bots)
- 5m+: Check every 60s (long-running analysis)

## Conversation Management

pr-vibe now handles full conversations with bots:

- **Waits for bot responses** instead of assuming completion
- **Detects rate limits** and waits appropriately
- **Handles corrections** when bots clarify misunderstandings
- **Resolves threads** automatically when consensus is reached
- **Escalates to humans** after too many rounds
- **Handles long messages** by automatically truncating to fit GitHub's 65,536 character limit

Example conversation flow:
```
You: "This is intentional for CloudWatch"
Bot: "Actually, I was referring to the ESLint issue..."
pr-vibe: "Thank you for the clarification. You're right about the ESLint configuration..."
Bot: "LGTM! Thanks for addressing this."
[Thread resolved automatically]
```

### Message Length Handling

GitHub limits comment bodies to 65,536 characters. pr-vibe automatically:
- Detects when responses exceed the limit
- Truncates intelligently at natural boundaries (code blocks, paragraphs)
- Adds a notice indicating content was truncated
- Retries with aggressive truncation if needed

## CLI Workflow Example

```bash
# Morning: New PR from your teammate
$ pr-vibe pr 147
🔍 Found 12 bot comments from CodeRabbit

Bot: "Missing null check on user.email"
> What would you like to do?
  ✓ Apply fix
  
Bot: "console.log found in production code"  
> What would you like to do?
  ✓ Post reply: "We use console.log for CloudWatch"
  
[pr-vibe detects rate limit from CodeRabbit]
⏳ Rate limit detected. Waiting 60 seconds...

[After bot responds with clarification]
💬 CodeRabbit: "Thanks for the explanation. Makes sense for Lambda!"
✅ Thread resolved automatically

Summary: Fixed 8 issues, explained 3 patterns, skipped 1
Time saved: ~22 minutes
```

## Reporting & Review

pr-vibe now generates detailed reports for every PR processed:

### Comprehensive Reports
- **Detailed decision log** - See exactly what was done and why
- **Conversation transcripts** - Full dialogue history with bots
- **Confidence scores** - Know how certain pr-vibe was about each decision
- **Pattern tracking** - See which patterns were applied
- **Time metrics** - Track processing time and time saved

### Report Storage
- Reports saved to `.pr-bot/reports/pr-{number}/`
- Both Markdown and JSON formats
- Automatic cleanup after 30 days (configurable)
- Keep latest 5 reports per PR regardless of age

```bash
# View latest report
pr-vibe report 42

# List all available reports
pr-vibe report 42 --list

# Get JSON for programmatic access
pr-vibe report 42 --json
```

## Pre-Merge Safety

Never accidentally merge a PR with unresolved bot comments:

### Check Command
```bash
# Returns exit 0 if ready, 1 if not
pr-vibe check 42

# Example output:
✅ Bot Comment Status:
  - CodeRabbit[bot]: 12/12 resolved ✓
  - DeepSource[bot]: 3/3 resolved ✓
  - Total: 15/15 (100%)

✅ PR is ready to merge!
```

### GitHub Status Checks
```bash
# Post status to GitHub
pr-vibe status 42 --post

# Creates a status check that shows:
# ✅ "All bot comments resolved (15/15)"
# ❌ "3 bot comments need attention"
```

### CI Integration
```yaml
# .github/workflows/pr-check.yml
- name: Check bot comments resolved
  run: |
    npx pr-vibe check ${{ github.event.pull_request.number }}
```

## Advanced Features

### Export Mode for Claude Code

Perfect for AI-powered development workflows:

```bash
# Export PR comments for Claude Code analysis
pr-vibe export 42 --format claude

# Creates a markdown report optimized for LLM analysis
```

### Team Patterns (Experimental)

Learn from human reviews too:

```bash
pr-vibe pr 42 --experimental

# Now tracks patterns from senior developers
# "When Alice requests a refactor, it's usually about service boundaries"
# "Bob always flags missing integration tests"
```

## Project Philosophy

pr-vibe embodies "vibe coding" - the idea that AI tools should work together harmoniously. Instead of fighting with bots or explaining the same patterns repeatedly, let pr-vibe orchestrate the conversation while you focus on building great software.

This tool was born from real frustration during PR reviews and built by Claude while actually responding to CodeRabbit comments. It's uniquely positioned to understand the AI-to-AI collaboration space because it emerged from that exact use case.

## Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork and clone
git clone https://github.com/yourusername/pr-vibe.git
cd pr-vibe

# Install dependencies
npm install

# Run tests
npm test

# Make your changes and submit a PR!
```

## Sponsors

pr-vibe is open source and free forever. If it saves you time, consider sponsoring:

<a href="https://github.com/sponsors/stroupaloop"><img src="https://img.shields.io/badge/Sponsor%20on-GitHub-pink?logo=github-sponsors&logoColor=white&style=for-the-badge" alt="Sponsor on GitHub" /></a>

Your support helps maintain and improve pr-vibe for everyone! 💜

## License

MIT © Andrew Stroup and pr-vibe contributors

---

Built with 💜 by Claude and the vibe coding community

Remember: Code reviews are better when tools vibe together 🎵