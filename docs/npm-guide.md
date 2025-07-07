# pr-vibe npm Package Guide

## Installation

```bash
# Global installation (recommended)
npm install -g pr-vibe

# Or use directly with npx
npx pr-vibe@latest pr 123
```

## Quick Start

1. **Try the demo** (no setup required):
   ```bash
   npx pr-vibe@latest demo
   ```

2. **Review your first PR**:
   ```bash
   pr-vibe pr 123 -r owner/repo
   ```

## New in v0.12.0: Priority-Based Filtering 🎯

Focus your reviews on what matters most:

### Priority Levels
- **Must Fix** (🔴): Security vulnerabilities, bugs, breaking changes
- **Suggestion** (🟡): Code quality, performance improvements
- **Nitpick** (⚪): Style, formatting, cosmetic issues

### Usage Examples

```bash
# Focus on critical issues only
pr-vibe pr 123 --critical-only

# Include suggestions but hide nitpicks
pr-vibe pr 123 --priority-threshold suggestion

# Quick fix mode for critical issues
pr-vibe pr 123 --critical-only --auto-fix
```

## New in v0.11.0: Smart Watch Mode 👀

Monitor PRs for bot activity:

```bash
# Watch for bots with intelligent polling
pr-vibe watch 123

# Auto-process when all bots complete
pr-vibe watch 123 --auto-process
```

## Key Features

### 1. Bot Comment Analysis
- Works with CodeRabbit, DeepSource, SonarCloud, Snyk, Claude Code, and more
- Understands bot-specific formats and priorities
- Handles multi-round conversations

### 2. Pattern Learning
- Learns your project's conventions
- Remembers valid exceptions (e.g., console.log in Lambda)
- Improves accuracy over time

### 3. Automated Actions
- **AUTO_FIX**: Apply safe fixes automatically
- **DEFER**: Create GitHub issues for later
- **REJECT**: Explain why patterns are valid
- **ESCALATE**: Flag for human review

### 4. Flexible Filtering
- `--skip-nits`: Focus on important issues
- `--critical-only`: Security and bugs only
- `--show-all`: See everything including non-critical

### 5. Pre-Merge Safety
- `pr-vibe check 42`: Verify all bot comments resolved
- `pr-vibe status 42`: View/post GitHub status checks
- Reports saved in `.pr-bot/reports/`

## Common Workflows

### Pre-Release Review
```bash
# Focus on blockers only
pr-vibe pr 123 --critical-only --auto-fix
```

### Regular Development
```bash
# Balanced review (no nitpicks)
pr-vibe pr 123 --priority-threshold suggestion
```

### Fresh PR Monitoring
```bash
# Create PR and watch for bots
gh pr create ...
pr-vibe watch 123 --auto-process
```

### Code Quality Sprint
```bash
# Review everything including style
pr-vibe pr 123 --show-all
```

## Authentication

pr-vibe automatically detects GitHub tokens from:
- GitHub CLI (`gh auth token`)
- Environment variables (`GITHUB_TOKEN`)
- VS Code GitHub extension

Check auth status:
```bash
pr-vibe auth
```

## Configuration

### Project Patterns
Store in `.pr-bot/patterns.yml`:
```yaml
valid_patterns:
  - pattern: "console.log"
    condition:
      files: ["**/lambda/**"]
    reason: "CloudWatch logging"
```

### LLM Integration (Optional)
```bash
# Use Claude
export ANTHROPIC_API_KEY=your-key
pr-vibe pr 123 --llm anthropic

# Use GPT-4
export OPENAI_API_KEY=your-key
pr-vibe pr 123 --llm openai
```

## Troubleshooting

### No bot comments detected
- Use `--debug` flag for detailed output
- Check if bots have finished reviewing
- Try `pr-vibe watch` for fresh PRs

### Rate limits
pr-vibe automatically detects and waits for bot rate limits

### Long responses
Automatically truncated to fit GitHub's 65K character limit

## More Information

- [GitHub Repository](https://github.com/stroupaloop/pr-vibe)
- [Full Documentation](https://github.com/stroupaloop/pr-vibe#readme)
- [Report Issues](https://github.com/stroupaloop/pr-vibe/issues)

## License

MIT © Andrew Stroup