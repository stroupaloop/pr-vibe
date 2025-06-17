# pr-vibe 🎵

The first tool to intelligently respond to PR review bots. Stop explaining the same patterns to bots over and over again.

## Why pr-vibe?

PR review bots like CodeRabbit and DeepSource are great, but they don't understand *your* project. You find yourself:
- Explaining why `console.log` is valid in Lambda functions... again
- Rejecting the same "any types" warnings for complex webhooks
- Manually fixing the same security issues they flag

pr-vibe bridges this gap by:
- 🤝 **Working WITH bots** - Enhances CodeRabbit, DeepSource, etc. rather than replacing them
- 🧠 **Learning your patterns** - Remembers your project's conventions and valid exceptions
- ⚡ **Automating responses** - Fixes what should be fixed, explains what's intentional
- 🎯 **Saving time** - Handle bot comments in seconds, not minutes

## Features

- 🔍 **Bot Comment Analysis** - Parses and understands comments from all major PR review bots
- 💬 **Intelligent Responses** - Maintains conversation context across bot exchanges  
- 🛠️ **Smart Actions** - Auto-fix simple issues, explain valid patterns, or escalate edge cases
- 🧠 **Project Memory** - Learns and remembers your project-specific patterns
- 🔌 **LLM Flexibility** - Works with Claude, GPT-4, Gemini, or local models
- ⚡ **CLI First** - Full control with human-in-the-loop design

## Installation

```bash
npm install -g pr-vibe

# Or use directly with npx
npx pr-vibe review 42
```

## Quick Start

```bash
# Initialize in your project
pr-vibe init

# Review and respond to bot comments on a PR
pr-vibe review 18

# Auto-fix and respond to safe issues
pr-vibe review 18 --auto-fix

# Watch for new bot comments
pr-vibe watch 18 --interval=5

# Use a different LLM
pr-bot respond 18 --llm=gpt-4
```

## How It Works

1. **Fetches** bot comments from your PR (CodeRabbit, DeepSource, etc.)
2. **Groups** them into conversation threads
3. **Analyzes** each with your project context in mind
4. **Suggests** responses based on your patterns
5. **Applies** fixes where appropriate
6. **Responds** to bots with explanations

## Example Session

```bash
$ pr-bot respond 42

🔍 Fetching bot comments on PR #42...
Found 12 comments from CodeRabbit

📋 Review Summary:
- 5 security issues (2 critical)
- 4 code quality suggestions  
- 3 performance improvements

Issue 1/12: Hardcoded API key (security-issues.js:7)
Reviewer: CodeRabbit
Severity: Critical

Suggested action: AUTO-FIX
Move API key to environment variable

[A]pply fix / [D]iscuss / [S]kip / [E]scalate? > A
✅ Fixed and ready to commit

Issue 2/12: console.log in Lambda handler
Reviewer: CodeRabbit  
Severity: Low

Suggested action: REJECT
This is valid for CloudWatch logging in Lambda

[R]eject with explanation / [D]iscuss / [F]ix anyway? > R
✅ Will reply: "This is intentional for CloudWatch logging in Lambda functions"

...

Ready to push fixes and post 7 replies? [Y/n] > Y
✅ Pushed fixes to PR
✅ Posted responses to reviewers
```

## Configuration

Create `.pr-bot/config.json` in your project:

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-opus-20240229",
    "apiKey": "${ANTHROPIC_API_KEY}"
  },
  "patterns": {
    "valid": [
      "console.log in Lambda handlers",
      "any types for complex webhooks"
    ],
    "autoFix": [
      "hardcoded secrets",
      "missing error handling"
    ],
    "escalate": [
      "architectural changes",
      "breaking API changes"
    ]
  },
  "reviewers": {
    "coderabbitai[bot]": {
      "trustLevel": "high",
      "autoFix": ["security", "types"]
    }
  }
}
```

## Supported LLMs

- **Anthropic Claude** (Claude 3 Opus, Sonnet, Haiku)
- **OpenAI** (GPT-4, GPT-3.5)
- **Google** (Gemini Pro)
- **Ollama** (Local models)
- **Custom** (Any OpenAI-compatible API)

## Integration with Claude Code

Designed to work seamlessly with Claude Code or standalone:

```bash
# Let pr-bot-responder prepare context
pr-bot analyze 42 --output=.claude-context

# Then in Claude Code
"Handle the bot comments from PR 42"
# Claude Code reads the prepared context and handles everything
```

## Supported Review Bots

- **CodeRabbit** - Full comment parsing and thread tracking
- **DeepSource** - Issue categorization and auto-fix support
- **Sonar** - Code quality and security issue handling
- **Codacy** - Style and complexity feedback
- **GitHub Actions** (bot comments) - Workflow failure explanations
- More coming soon!

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Andrew Stroup

---

Built with ❤️ to work WITH bots, not against them