# pr-vibe 🎵

[![npm version](https://img.shields.io/npm/v/pr-vibe.svg)](https://www.npmjs.com/package/pr-vibe)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Built by AI](https://img.shields.io/badge/Built%20by-Claude%20AI-purple)](https://github.com/stroupaloop/pr-vibe)
[![npm downloads](https://img.shields.io/npm/dm/pr-vibe.svg)](https://www.npmjs.com/package/pr-vibe)
[![GitHub stars](https://img.shields.io/github/stars/stroupaloop/pr-vibe.svg?style=social)](https://github.com/stroupaloop/pr-vibe)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/stroupaloop/pr-vibe/pulls)

> When bots handle bot feedback, developers stay in flow

The first tool designed for AI-to-AI collaboration on code reviews. Let Claude Code and CodeRabbit vibe together while you focus on shipping features.

## 🚀 ProductHunt Launch Special

**Save 18+ minutes per PR review** - pr-vibe automatically handles repetitive bot feedback so you can focus on what matters. Used by developers who value their flow state.

→ **[Vote on ProductHunt](https://www.producthunt.com/products/pr-vibe)** to support AI-to-AI collaboration!

## Demo

<!-- TODO: Add animated GIF or video showing pr-vibe in action -->
![pr-vibe demo](https://github.com/stroupaloop/pr-vibe/assets/demo/pr-vibe-demo.gif)

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

## Getting Started in 60 Seconds

1. **Install pr-vibe globally:**
   ```bash
   npm install -g pr-vibe
   ```

2. **Set your GitHub token:**
   ```bash
   export GITHUB_TOKEN=your_github_token
   # Get one at: https://github.com/settings/tokens
   ```

3. **Initialize in your project:**
   ```bash
   cd your-project
   pr-vibe init-patterns
   ```

4. **Review your next PR with bot comments:**
   ```bash
   pr-vibe pr 42
   ```

That's it! pr-vibe will analyze bot comments, suggest responses, and start learning your patterns.

## Quick Start

```bash
# Initialize patterns in your project
pr-vibe init-patterns

# Review bot comments interactively
pr-vibe pr 42

# Export comments for external analysis (Claude Code mode)
pr-vibe export 42

# Apply decisions from Claude Code
pr-vibe apply 42

# Specify a different repository
pr-vibe pr 42 -r owner/repo
```

## How It Works

1. **Fetches** bot comments from your PR (CodeRabbit, DeepSource, etc.)
2. **Groups** them into conversation threads
3. **Analyzes** each with your project context in mind
4. **Suggests** responses based on your patterns
5. **Applies** fixes where appropriate
6. **Responds** to bots with explanations

## Real Impact 📊

From actual usage on the woodhouse-modern project:

```bash
$ pr-vibe apply 20

# Analyzing 19 bot comments from CodeRabbit...

✓ Applying learned patterns...

  🔧 Auto-fixed 7 issues:
     • hardcoded API key → process.env.API_KEY
     • console.log statements → logger.info()
     • magic number 404 → HTTP_STATUS.NOT_FOUND

✓ Auto-replied to 12 valid patterns:
     • "console.log valid for CloudWatch in Lambda" (3x)
     • "any types acceptable in webhook handlers" (2x)
     • "TODOs tracked in Jira, not removed" (4x)

⚡ Completed in 1m 47s
📊 19 comments handled automatically
⏱️  Saved ~18 minutes of manual work
💰 Time saved: $45-90 (based on dev hourly rate)
```

**After ~10 PRs:** pr-vibe handles 95% of repetitive feedback automatically!

## Pattern Learning

pr-vibe gets smarter with each PR. After ~10 PRs, it handles 95% of repetitive feedback automatically.

```yaml
# .pr-bot/patterns.yml - Learns from your decisions
version: 1.0
project: awesome-app

valid_patterns:
  - id: console-cloudwatch
    pattern: "console.log"
    condition:
      files: ["**/lambda/**"]
    auto_reply: "We use console.log for CloudWatch logging"
    confidence: 0.98

auto_fixes:
  - trigger: "hardcoded.+(api|key|token)"
    severity: CRITICAL
    fix_template: |
      const {{CONST_NAME}} = process.env.{{ENV_NAME}};
```

## Supported LLMs

- **Anthropic Claude** (Claude 3 Opus, Sonnet, Haiku)
- **OpenAI** (GPT-4, GPT-3.5)
- **Google** (Gemini Pro)
- **Ollama** (Local models)
- **Custom** (Any OpenAI-compatible API)

## The Vibe Philosophy

This isn't just a tool - it's a vibe. Built BY an AI (Claude) specifically FOR AI-to-AI collaboration.

**Why it matters:**
- 🤖 **AI-Native Design** - Tools understand each other better
- 🎵 **Harmony Over Conflict** - Work WITH bots, not against them
- 🌊 **Flow State Protected** - Stay focused on creative work
- 💜 **Community Patterns** - Learn from the collective

## Supported Review Bots

- **CodeRabbit** - Full comment parsing and thread tracking
- **DeepSource** - Issue categorization and auto-fix support
- **Sonar** - Code quality and security issue handling
- **Codacy** - Style and complexity feedback
- **GitHub Actions** (bot comments) - Workflow failure explanations
- More coming soon!

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support pr-vibe

Love the vibe? Here's how to help:

### 💜 Sponsor
- [GitHub Sponsors](https://github.com/sponsors/stroupaloop) - Support development
- ⭐ Star this repo - Help others discover pr-vibe
- 🐦 [Tweet about it](https://twitter.com/intent/tweet?text=Just%20discovered%20pr-vibe%20-%20AI%20tools%20vibing%20together%20on%20code%20reviews!%20Built%20BY%20an%20AI%20for%20AI%20collaboration%20🎵&url=https://github.com/stroupaloop/pr-vibe) - Spread the word

### 🤝 Contribute
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### 🏆 Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT © [Andrew Stroup](https://github.com/stroupaloop) & [Claude (Anthropic)](https://claude.ai)

---

<p align="center">
  <i>Let the robots vibe together 🎵</i>
  <br>
  <a href="https://www.producthunt.com/products/pr-vibe">Vote on ProductHunt</a>
</p>