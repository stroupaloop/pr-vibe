# pr-vibe Context for Claude 🎵

## Pre-Merge Protocol
IMPORTANT: Before merging ANY PR with bot comments:

1. **Check Status**: 
   ```bash
   pr-vibe check <pr-number>
   ```
   
2. **If Check Fails**:
   - Run `pr-vibe pr <pr-number>` to process comments
   - Review the generated report
   - Address any escalated items
   
3. **Only Merge When**:
   - `pr-vibe check` returns success (exit 0)
   - OR user explicitly says "merge anyway" or "ignore remaining comments"

4. **Report Access**:
   - Reports auto-saved to `.pr-bot/reports/`
   - View with `pr-vibe report <pr-number>`
   - Reports expire after 30 days (configurable)

## Project Overview
pr-vibe is an AI-powered PR review tool that orchestrates conversations between PR bots (CodeRabbit, DeepSource, etc.) and handles their feedback automatically. Built BY an AI (Claude) FOR AIs to collaborate on code reviews.

## Current Status (2025-06-18)
- **Version**: v0.3.4 (hotfix: restored demo command)
- **Launch**: ProductHunt scheduled for 2025-06-19 ~3am ET
- **Pre-launch**: Posted on HN, Reddit (r/ClaudeAI), Medium, X, LinkedIn

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

## v0.3.4 Hotfix (2025-06-18)
**CRITICAL**: Restored missing demo command for ProductHunt launch
- Demo command was accidentally removed in v0.3.3
- Essential for zero-setup experience: `npx pr-vibe@latest demo`

## v0.3.3 Security Fix (2025-06-18)
**CRITICAL**: Fixed shell injection vulnerability discovered by CodeRabbit
- Replaced `execSync` with shell interpolation with safe `execFileSync` calls
- Comments now passed via temp files or stdin, preventing command injection
- Also fixed message splitting bug and added GitHub comment length handling
- pr-vibe successfully caught its own security issue when reviewing PR #13!

## Key Commands for Next Session
```bash
# Track launch metrics
node .internal-docs/track-launch.js

# Run tests
npm test

# Quick PR review
pr-vibe pr <number>

# Check if PR is ready to merge
pr-vibe check <number>

# View saved reports
pr-vibe report <number>

# Post GitHub status check
pr-vibe status <number> --post

# Use pr-vibe on its own PRs
pr-vibe pr <number> -r stroupaloop/pr-vibe
```

## Critical Context
1. **Always use pr-vibe on its own PRs** - Dogfooding is essential
2. **npm publish via GitHub Actions** - Don't publish locally, use workflows
3. **Tests must pass** - Never merge with failing tests
4. **Version in cli.js** - Reads from package.json (was hardcoded before)

## ProductHunt Launch Checklist
- [x] v0.3.4 published with demo command restored
- [x] Website updated (https://stroupaloop.github.io/pr-vibe/)
- [x] Pre-launch posts on HN, Reddit, Medium
- [x] Tracking infrastructure ready
- [x] Critical security issue found and fixed (v0.3.3)
- [x] Demo command hotfix applied (v0.3.4)
- [ ] ProductHunt launch at ~3am ET 2025-06-19
- [ ] Monitor and respond to feedback across channels

## Recent PRs and Issues
- PR #13: Critical security fix and message length handling (merged)
- Issue #12: GitHub comment length limit (fixed in v0.3.3)
- v0.3.4 Hotfix: Restored missing demo command (critical for ProductHunt)
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
- `lib/conversation-manager.js` - Core conversation logic
- `lib/demo.js` - Demo implementation (critical for onboarding)

## Security Notes
- Never commit tokens or API keys
- GitHub token auto-detection is read-only
- All patterns stored locally in `.pr-bot/`

Remember: pr-vibe is about making AI tools vibe together on code reviews! 🎵

## Session Summary (2025-06-18)

**Major Accomplishments:**
1. **Security Crisis Resolved**: Fixed critical shell injection vulnerability discovered by CodeRabbit
   - Replaced unsafe execSync with execFileSync
   - pr-vibe successfully reviewed its own security fix (PR #13)
2. **Message Length Handling**: Implemented smart truncation for GitHub's 65,536 char limit
3. **Demo Command Restored**: Fixed critical regression where demo was missing in v0.3.3
4. **Successful Releases**: Published v0.3.3 (security) and v0.3.4 (demo hotfix)

**Launch Status:**
- ProductHunt scheduled for 2025-06-19 ~3am ET
- All critical features working
- Demo provides zero-setup experience
- 0 stars/downloads (normal pre-launch)

**Key Learning:**
Using pr-vibe on its own PRs proved invaluable - CodeRabbit caught a critical security vulnerability that could have been catastrophic post-launch. This validates the entire concept of AI tools working together!