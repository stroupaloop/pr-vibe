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
- **Version**: v0.4.0 (comprehensive reporting & pre-merge safety)
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
- **Release Process**: 
  1. Create release branch: `git checkout -b release/vX.Y.Z`
  2. Bump version in package.json
  3. Update CHANGELOG.md with release notes
  4. Run `node scripts/update-changelog-version.js` (or let CI do it)
  5. Create PR and merge
  6. Create GitHub Release: `gh release create vX.Y.Z`
  7. This triggers automatic npm publish via GitHub Actions (including changelog update)

## v0.4.0 Release (2025-06-18)
**Major Features**: Comprehensive reporting and pre-merge safety
- Enhanced reporting with detailed decision logs and confidence scores
- Pre-merge safety checks: `pr-vibe check`, `pr-vibe status`, `pr-vibe report`
- Report storage with automatic TTL (30 days)
- Fixed CRITICAL bug: pr-vibe no longer replaces files with TODO placeholders
- All GitHub Actions tests passing

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
- PR #14: v0.4.0 release with reporting and pre-merge safety (merged)
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
- Verify/setup ProductHunt launch submission

## Important Files to Check
- `.internal-docs/CLAUDE.md` - Detailed session history
- `.internal-docs/LAUNCH_TRACKING.md` - Launch monitoring dashboard
- `lib/conversation-manager.js` - Core conversation logic
- `lib/demo.js` - Demo implementation (critical for onboarding)
- `lib/bot-detector.js` - Bot-specific detection and parsing (NEW)

## Security Notes
- Never commit tokens or API keys
- GitHub token auto-detection is read-only
- All patterns stored locally in `.pr-bot/`

## Confidence Levels Throughout pr-vibe

pr-vibe now tracks confidence at multiple levels:

### Bot Detection Confidence (bot-detector.js)
- **95% confidence**: Known bots (CodeRabbit, DeepSource, SonarCloud, Snyk)
- **90% confidence**: CodeClimate bots
- **80% confidence**: Generic [bot] suffix
- **95% confidence**: NOT a bot (human reviewers)

### Decision Engine Confidence (decision-engine.js)
- **95% confidence**: Valid patterns that should be rejected
- **90-95% confidence**: Critical security issues
- **85-90% confidence**: High priority security issues  
- **70% confidence**: Architectural discussions
- **50% confidence**: Unclear items needing more context

### Comment Processing Confidence
- **95% confidence**: Skip CodeRabbit summary comments
- **90% confidence**: Skip comments with no actionable items
- **85% confidence**: Process actionable bot content

### Report Display
- All decisions show confidence percentages
- Average confidence calculated and displayed in summary
- Low confidence items escalated to human review

Remember: pr-vibe is about making AI tools vibe together on code reviews! 🎵

## Session Summary (2025-06-19) - v0.5.0 Release

**Major Bot Detection Improvements Released!**

### What We Built
1. **PR Review Detection** (95% confidence)
   - Added `getReviews()` to GitHubProvider
   - Now detects CodeRabbit reviews (not just comments)
   - Successfully tested on PR #16

2. **Smart Watch Mode** (90% confidence)
   - `pr-vibe watch <pr>` with intelligent polling
   - Perfect for fresh PRs
   - Auto-processes when bots arrive

3. **Bot-Specific Detection** (95% confidence)
   - Created `bot-detector.js` module
   - Detects all major bots with confidence scoring
   - Filters non-actionable content

4. **Enhanced UX**
   - Better error messages showing what was found
   - `--debug` flag for troubleshooting
   - Confidence scores throughout

### Release Details
- PR #16: Successfully detected CodeRabbit's 6 actionable comments
- Fixed all CodeRabbit feedback (linting, validation)
- v0.5.0 published to npm successfully
- GitHub Actions automated the release

### Key Validation
```bash
npx pr-vibe@latest --version  # Shows 0.5.0
npx pr-vibe@latest help watch  # New command available
npx pr-vibe@latest changelog   # Shows v0.5.0 as current
```

### Critical Learning
Our improvements successfully detected CodeRabbit PR reviews that were previously missed. The debug output showed:
- 2 PR reviews from CodeRabbit
- 6 review comments
- Correct bot type detection

This directly addresses the user feedback that started this session!

## Session Summary (2025-06-19)

**v0.4.1 Patch Release:**
1. **Fixed CLI Changelog Bug**: 
   - Issue: `pr-vibe changelog` was showing v0.2.0 as current instead of v0.4.0
   - Created automated solution with `scripts/update-changelog-version.js`
   - Updated GitHub Actions workflows to run changelog sync on every release
   - Released v0.4.1 to fix the issue for users

2. **Improved Release Process**:
   - Added changelog version sync to CI/CD pipeline
   - Documented in release checklist
   - Future releases will automatically have correct version in CLI

**Key Files Created/Modified:**
- `scripts/update-changelog-version.js` - Automated changelog version sync
- `.github/workflows/publish.yml` - Added changelog update step
- `.github/workflows/publish-current.yml` - Added changelog update step
- `CLAUDE.md` - Updated release process documentation

**Release Details:**
- PR #15: https://github.com/stroupaloop/pr-vibe/pull/15
- Release: https://github.com/stroupaloop/pr-vibe/releases/tag/v0.4.1
- Successfully used pr-vibe on its own PR
- All tests passed, CodeRabbit review completed

**Important Note on Changelog Update Script:**
- The automated script (`scripts/update-changelog-version.js`) only handles major.minor versions
- It doesn't know about patch-specific features (e.g., v0.4.1 shows v0.4.0 features)
- This is semantically correct but could be enhanced in the future
- For patch releases with specific changelog needs, consider manual updates

**What Actually Got Published:**
- v0.4.1 shows correct version number (fixed the main bug)
- Shows v0.4.0 features instead of v0.4.1-specific fixes (limitation of current script)
- Future releases will auto-update version numbers correctly

## Session Summary (2025-06-18)

**Morning Session Accomplishments:**
1. **Security Crisis Resolved**: Fixed critical shell injection vulnerability discovered by CodeRabbit
   - Replaced unsafe execSync with execFileSync
   - pr-vibe successfully reviewed its own security fix (PR #13)
2. **Message Length Handling**: Implemented smart truncation for GitHub's 65,536 char limit
3. **Demo Command Restored**: Fixed critical regression where demo was missing in v0.3.3
4. **Successful Releases**: Published v0.3.3 (security) and v0.3.4 (demo hotfix)

**Afternoon Session Accomplishments (v0.4.0):**
1. **Comprehensive Reporting System**: 
   - Built ReportBuilder class with detailed decision logging
   - Added ReportStorage with TTL management (30 days)
   - Reports saved in `.pr-bot/reports/` with Markdown and JSON formats
2. **Pre-Merge Safety Features**:
   - `pr-vibe check` - Returns exit code 0/1 for CI integration
   - `pr-vibe status` - Posts GitHub status checks
   - `pr-vibe report` - View saved reports
   - `pr-vibe cleanup` - Remove old reports
3. **Critical Bug Fix**: Prevented pr-vibe from replacing files with TODO placeholders
   - Fixed decision-engine.js to return null instead of TODO strings
   - Added safety checks in file-modifier.js
4. **GitHub Release Process Documented**: Uses GitHub releases to trigger npm publish

**Launch Status:**
- ProductHunt scheduled for 2025-06-19 ~3am ET (needs verification)
- v0.4.0 live on npm with all features
- Documentation fully updated
- Demo provides zero-setup experience
- 0 stars/downloads (normal pre-launch)

**Key Learning:**
Using pr-vibe on its own PRs proved invaluable - CodeRabbit caught a critical security vulnerability that could have been catastrophic post-launch. This validates the entire concept of AI tools working together!

## Critical Workflow Reminders
1. **ALWAYS create PRs for changes** - Never push directly to main
2. **ALWAYS use pr-vibe on its own PRs** - Run `pr-vibe pr <number> -r stroupaloop/pr-vibe`
3. **ALWAYS run pr-vibe check before merging** - Ensures all bot comments resolved
4. **ALWAYS use GitHub releases for npm publish** - Never publish locally
5. **ALWAYS verify tests pass** - GitHub Actions must be green
6. **ALWAYS update changelog** - Either run `node scripts/update-changelog-version.js` or let CI handle it

## Next Session Priorities
1. Verify ProductHunt launch is actually submitted/scheduled
2. Monitor launch metrics using tracking tools
3. Respond to user feedback across all channels
4. Address any critical bugs from early adopters
5. Consider implementing browser extension
6. Continue dogfooding pr-vibe on its own development