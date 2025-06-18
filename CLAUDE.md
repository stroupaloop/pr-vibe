# pr-vibe Context for Claude 🎵

## Project Overview
pr-vibe is an AI-powered PR review tool that orchestrates conversations between PR bots (CodeRabbit, DeepSource, etc.) and handles their feedback automatically. Built BY an AI (Claude) FOR AIs to collaborate on code reviews.

## Current Status (2025-06-18)
- **Version**: v0.3.2 (published to npm)
- **Launch**: ProductHunt scheduled for 2025-06-19 ~3am ET
- **Pre-launch**: Already posted on HN, Reddit (r/ClaudeAI), Medium, X, LinkedIn

## Key Features Implemented
1. **Conversation Management** (v0.3.0) - Full multi-round dialogue handling with bots
2. **Rate Limit Handling** - Detects and waits for bot rate limits with exponential backoff
3. **Zero-Setup Demo** - `npx pr-vibe@latest demo` for instant experience
4. **Smart Auth** - Auto-detects GitHub tokens from gh CLI, env vars, VS Code
5. **Pattern Learning** - Stores project-specific patterns in `.pr-bot/patterns.yml`

## Technical Architecture
```
lib/
  conversation-manager.js  # Core conversation orchestration
  llm/                    # LLM integrations (anthropic, openai, gemini)
  auth.js                 # Smart auth detection
  demo/                   # Demo mode implementation
bin/
  cli.js                  # CLI commands (review, demo, auth, etc.)
```

## Launch Tracking Infrastructure
Created comprehensive tracking in `.internal-docs/`:
- `LAUNCH_TRACKING.md` - Dashboard with metrics, goals, response templates
- `track-launch.js` - Node script to track GitHub stars, npm downloads
- `monitor-launch.sh` - Quick bash status check
- `launch-metrics.json` - Historical metrics storage

## CI/CD Setup
- **GitHub Actions**: Automated testing and npm publishing
- **NPM_TOKEN**: Already configured in GitHub secrets
- **Workflows**: test.yml, publish.yml, publish-current.yml

## Key Commands for Next Session
```bash
# Track launch metrics
node .internal-docs/track-launch.js

# Run tests
npm test

# Quick PR review
pr-vibe pr <number>

# Use pr-vibe on its own PRs
pr-vibe pr <number> -r stroupaloop/pr-vibe
```

## Critical Context
1. **Always use pr-vibe on its own PRs** - Dogfooding is essential
2. **npm publish via GitHub Actions** - Don't publish locally, use workflows
3. **Tests must pass** - Never merge with failing tests
4. **Version in cli.js** - Reads from package.json (was hardcoded before)

## ProductHunt Launch Checklist
- [x] v0.3.2 published with conversation features
- [x] Demo mode working (`npx pr-vibe@latest demo`)
- [x] Website updated (https://stroupaloop.github.io/pr-vibe/)
- [x] PRODUCTHUNT.md with launch copy
- [x] Pre-launch posts on HN, Reddit, Medium
- [x] Tracking infrastructure ready
- [ ] Monitor launch at ~3am ET on 2025-06-19
- [ ] Respond to feedback across channels

## Recent PRs and Issues
- PR #7: Implemented conversation management (merged)
- PR #8: Fixed corrupted README (merged)
- PR #10: Updated dependencies (merged)
- Closed Dependabot PRs with explanations

## TODO Backlog
- Auto-versioning CI/CD for npm publish on PR merge
- Team patterns feature (learning from human reviewers)
- Enhanced pattern matching with regex support
- VS Code extension for in-editor PR reviews

## Important Files to Check
- `.internal-docs/CLAUDE.md` - Detailed session history
- `.internal-docs/LAUNCH_TRACKING.md` - Launch monitoring dashboard
- `PRODUCTHUNT.md` - Launch copy and materials
- `lib/conversation-manager.js` - Core conversation logic

## Security Notes
- Never commit tokens or API keys
- GitHub token auto-detection is read-only
- All patterns stored locally in `.pr-bot/`

Remember: pr-vibe is about making AI tools vibe together on code reviews! 🎵