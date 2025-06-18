# pr-vibe ProductHunt Launch 🎵

## Tagline
When AI tools vibe together on your code reviews

## Description
pr-vibe is the first tool built BY an AI (Claude) FOR AI collaboration. It lets CodeRabbit and Claude Code handle repetitive PR feedback while you ship features.

### The Problem
Every PR, you explain the same things to review bots:
- "We use console.log for CloudWatch in Lambda functions"
- "This 'any' type is intentional for webhook payloads"
- "Yes, I know about the security warning, but..."

### The Solution
pr-vibe learns your patterns and handles bot conversations automatically:
- 🤖 Works WITH existing bots (CodeRabbit, DeepSource, Sonar)
- 💬 Handles full conversations including follow-ups and rate limits
- 🧠 Learns from every interaction
- ⚡ Saves 20+ minutes per PR

### Key Features
- **Zero-Setup Demo** - Try instantly: `npx pr-vibe@latest demo`
- **Smart Auth** - Detects GitHub tokens from gh CLI, env vars, VS Code
- **Conversation Manager** - Handles multi-round bot dialogues
- **Pattern Learning** - Gets smarter with each use
- **Time Tracking** - Shows exactly how much time you save

### Built Different
This isn't another review bot - it's an orchestrator. Built by Claude during actual PR reviews, it understands the frustration of repetitive bot feedback better than any human-built tool could.

## Gallery Images

1. **Hero Image**: Terminal showing pr-vibe handling CodeRabbit comments
2. **Demo GIF**: The zero-setup demo in action
3. **Before/After**: Split screen showing manual vs automated bot handling
4. **Time Saved**: Dashboard showing cumulative time savings
5. **Architecture**: Simple diagram showing pr-vibe between developer and bots

## Links
- Website: https://stroupaloop.github.io/pr-vibe/
- GitHub: https://github.com/stroupaloop/pr-vibe
- npm: https://www.npmjs.com/package/pr-vibe

## First Comment
Hey ProductHunt! 👋

I'm Andrew, and I built pr-vibe with Claude after getting frustrated explaining the same patterns to CodeRabbit over and over.

What makes pr-vibe special:
1. **Built BY an AI** - Claude created this during real PR reviews
2. **Zero friction** - Try the demo without any setup
3. **Actually saves time** - ~20 minutes per PR with lots of bot comments
4. **Gets smarter** - Learns your project's patterns

Happy to answer any questions! And yes, the vibe aesthetic is intentional - code reviews should feel good 🎵

## FAQs

**Q: How is this different from CodeRabbit/DeepSource?**
A: pr-vibe doesn't replace them - it orchestrates them. Think of it as your personal assistant that handles the back-and-forth with review bots.

**Q: Does it work with [my review bot]?**
A: Yes! CodeRabbit, DeepSource, Sonar, GitHub Security, and any bot that comments on PRs.

**Q: Is it safe?**
A: Absolutely. You review every action before it's taken. No automatic commits without your approval.

**Q: Why the music theme?**
A: Because when tools work together harmoniously, it's like they're vibing. Plus, it makes code reviews less boring!