# pr-review-assistant 🤖

AI-powered pull request review assistant that helps you handle automated review comments with intelligent, context-aware responses.

## Features

- 🔍 **Intelligent Analysis** - Understands context from CodeRabbit, DeepSource, and other review tools
- 💬 **Conversational** - Maintains thread context across multiple exchanges  
- 🛠️ **Smart Actions** - Auto-fix simple issues, discuss complex ones, or escalate when needed
- 🧠 **Project Aware** - Learns your project's patterns and conventions
- 🔌 **LLM Agnostic** - Works with Claude, GPT-4, Gemini, or local models
- ⚡ **CLI First** - Full control with human-in-the-loop design

## Installation

```bash
npm install -g pr-review-assistant

# Or use directly with npx
npx pr-review-assistant pr 42
```

## Quick Start

```bash
# Initialize in your project
pr-review init

# Review a PR interactively
pr-review pr 18

# Auto-fix safe issues
pr-review pr 18 --auto-fix

# Watch for new comments
pr-review watch 18 --interval=5

# Use a different LLM
pr-review pr 18 --llm=gpt-4
```

## How It Works

1. **Fetches** all review comments from your PR
2. **Groups** them into conversation threads
3. **Analyzes** each issue with your chosen LLM
4. **Suggests** appropriate actions based on context
5. **Applies** fixes with your approval
6. **Responds** to reviewers intelligently

## Example Session

```bash
$ pr-review pr 42

🔍 Fetching PR #42 comments...
Found 12 review comments from CodeRabbit

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

Create `.pr-review/config.json` in your project:

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

This tool works seamlessly with Claude Code:

```bash
# Let pr-review-assistant prepare context
pr-review analyze 42 --output=.claude-context

# Then in Claude Code
"Fix the issues from the PR review"
# Claude Code reads the prepared context and has full understanding
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Andrew Stroup

---

Built with ❤️ to make PR reviews less painful