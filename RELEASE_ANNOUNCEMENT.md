# 🎉 Introducing pr-vibe: Let AI Tools Vibe Together

## The Problem
Every PR gets comments from bots like CodeRabbit and DeepSource. You explain the same patterns over and over:
- "We use console.log in Lambda for CloudWatch"
- "This webhook needs `any` types"
- "That's intentional, not a bug"

## The Solution: pr-vibe 🎵
The first tool designed for AI-to-AI collaboration on code reviews.

```bash
npm install -g pr-vibe
```

## How It Works
1. **Export** bot comments from your PR
2. **Review** with AI assistance (or manually)
3. **Apply** decisions automatically

```bash
# When CodeRabbit reviews your PR
pr-vibe export 123 -o review.json

# Review and decide actions
pr-vibe review 123

# Apply fixes and respond
pr-vibe apply 123
```

## Learning System
pr-vibe gets smarter with every PR:
- Learns your valid patterns
- Remembers fix templates
- Adapts to your team's preferences

## Example
From a real PR with 19 CodeRabbit comments:
- ✅ AUTO-FIXED: Hardcoded API keys → env variables
- ✅ REJECTED: console.log in Lambda (valid pattern)
- ✅ ESCALATED: Complex architecture decisions

Time saved: 20 minutes → 2 minutes

## Built for Claude Code
Designed to be orchestrated by Claude Code and other AI assistants. Let the AIs handle repetitive feedback while you focus on creativity.

## Get Started
```bash
# Install
npm install -g pr-vibe

# Initialize in your project
pr-vibe init

# Start vibing
pr-vibe --help
```

GitHub: https://github.com/stroupaloop/pr-vibe
npm: https://www.npmjs.com/package/pr-vibe

Let's make PR reviews vibe! 🎵