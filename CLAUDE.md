# pr-vibe Context for Claude 🎵

## Response Standards - Confidence & Clarity

When working on pr-vibe, always follow these standards:

### Always Provide Confidence Percentages
- Include confidence % for all key assertions (e.g., "95% confidence")
- Be specific about your certainty level
- Update confidence as new information becomes available

### Clearly Label Statement Types
Mark your statements as one of:
- **FACT**: Directly verifiable from files, tool outputs, or explicit user statements
- **INFERENCE**: Logical conclusions drawn from available evidence
- **GUESS**: Speculation or assumptions without strong evidence

### Example Response Format
- "The test is failing due to a TypeError" (100% confidence - FACT from test output)
- "This is likely caused by the recent API change" (75% confidence - INFERENCE from git history)
- "You might need to update the mock data" (40% confidence - GUESS based on common patterns)

### Apply This Especially When:
- Analyzing code or debugging issues
- Making recommendations or suggestions
- Explaining system behavior or architecture
- Proposing solutions or approaches
- Reviewing pull requests or code changes

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

## Current Status (2025-07-07)
- **Version**: v0.12.1 (bot detection fix) - FACT (100% confidence)
- **Latest Features**: Smart watch mode, priority-based filtering, bot detection improvements - FACT (100% confidence)
- **Dependencies**: All production deps updated to latest versions - FACT (100% confidence)
- **Launch Status**: ProductHunt launch completed, product in active use - INFERENCE (90% confidence)

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

## Session Summary (2025-06-22) - v0.7.0 Release

**Enhanced Comment Categorization Based on User Feedback**

### What We Built
1. **Priority-Based Categorization** (95% confidence - FACT)
   - Added `PRIORITY_LEVELS` export: MUST_FIX, SUGGESTION, NITPICK
   - Every comment analysis now includes priority and category
   - Clear mapping from issue types to priority levels

2. **Bot Approval Tracking** (100% confidence - FACT)
   - New `setBotApproval()` method in ReportBuilder
   - Detects approval keywords: "approve", "lgtm", "looks good"
   - Shows breakdown: "3 suggestions, 2 nitpicks"
   - Bot verdict displayed prominently in output

3. **Non-Critical Suggestions Display** (100% confidence - FACT)
   - Added `--show-all` flag to CLI
   - Tracks non-critical items separately in `detailedActions.nonCritical`
   - Shows/hides count based on flag usage
   - Progressive disclosure of optional improvements

4. **PR URL with Terminal Hyperlinks** (100% confidence - FACT)
   - PR URL displayed immediately after "Analyzing PR #X"
   - Terminal hyperlink support using ANSI escape sequences
   - Fallback to plain URL for unsupported terminals
   - URL included in report metadata

### Release Details
- PR #20: Successfully implemented all user feedback
- Tests: Converted to Jest format, all passing
- Version: Bumped to 0.7.0
- GitHub Release: Created but had tag/commit mismatch issue
- npm publish: Pending due to GitHub Actions workflow issue

### Key Technical Decisions
1. **Priority Levels Design**: Three clear levels avoid over-complication
2. **Bot Approval Logic**: Simple keyword detection works well
3. **Progressive Disclosure**: Hide non-critical by default, show on demand
4. **Terminal Compatibility**: Detect support for hyperlinks, graceful fallback

### Validation
```bash
# PR #20 showed exactly what we wanted:
✅ CodeRabbit: Reviewed and found no actionable items
✅ All tests passing in CI/CD
✅ Clean implementation addressing all 4 feedback points
```

### Critical Learning
User feedback was extremely valuable - these "small" enhancements significantly improve the user experience by providing better visibility while maintaining pr-vibe's core value of identifying truly actionable items.

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
4. **ALWAYS verify GitHub Actions tests pass** - All CI checks must be green before merge
5. **ALWAYS validate new features work** - Test locally and create validation scripts
6. **ALWAYS use GitHub releases for npm publish** - Never publish locally
7. **ALWAYS update changelog** - Either run `node scripts/update-changelog-version.js` or let CI handle it

## Mandatory PR Workflow
Before creating any PR:
1. Create feature branch: `git checkout -b feature/description`
2. Make changes and test locally
3. Run tests: `npm test` (must pass)
4. Create validation script if adding new features
5. Commit with descriptive message
6. Push branch and create PR
7. Run pr-vibe on the PR: `pr-vibe pr <number> -r stroupaloop/pr-vibe`
8. Address any bot feedback
9. Verify GitHub Actions pass
10. Run `pr-vibe check <number>` before merging
11. Only merge when check returns success

## Session Summary (2025-07-07) - Major Improvements

### What We Built Today

#### 1. **Smart Watch Mode** (v0.11.0) ✅
- Adaptive polling intervals (5s→10s→20s→30s)
- Bot completion detection with pattern matching
- Expected bot tracking and time estimates
- `--auto-process` flag for hands-free operation
- Comprehensive test coverage

#### 2. **Priority-Based Filtering** (v0.12.0) ✅
- `--critical-only` flag for security/bugs only
- `--priority-threshold` option for custom filtering
- Priority breakdown in output summary
- Filtered counts display
- Full integration with existing features

#### 3. **Bot Detection Fix** (v0.12.1) ✅
- Fixed inability to detect CodeRabbit PR review comments
- Special handling for `pr_review_comment` type
- Now properly processes nested review comments
- Added comprehensive unit tests

#### 4. **Dependency Updates** ✅
- Updated 4 production dependencies to latest versions
- dotenv: 16.5.0 → 17.0.1
- @anthropic-ai/sdk: 0.30.1 → 0.56.0
- openai: 4.104.0 → 5.8.2
- @octokit/rest: 21.1.1 → 22.0.0

### Key Technical Decisions
1. **Polling Strategy**: Exponential backoff reduces API calls while maintaining responsiveness
2. **Priority Levels**: Three-tier system (must-fix, suggestion, nitpick) provides clear categorization
3. **Bot Detection**: Fixed architectural issue where nested comments were being skipped
4. **Dependency Management**: Kept dependencies current while ensuring compatibility

### Validation & Testing
- All features have comprehensive test coverage
- Successfully used pr-vibe on its own PRs (#32, #33, #34)
- CI/CD pipeline working smoothly
- npm auto-publishing via GitHub Actions

### Known Issues & Future Work
1. **pr-vibe Output Ordering**: Success message sometimes appears out of order (cosmetic issue)
2. **Dev Dependencies**: ESLint v9 and Jest v30 require migration work
3. **Team Patterns Feature**: Next major feature to implement
4. **Browser Extension**: Under consideration for future development

### Critical Learning
The bot detection issue revealed that different bots structure their feedback differently. CodeRabbit posts review comments nested within PR reviews, which required special handling. This highlights the importance of thorough testing with real-world bot interactions.

## Next Session Priorities
1. Monitor user feedback and address any critical issues
2. Consider implementing team patterns feature
3. Work on ESLint v9 and Jest v30 migration
4. Investigate browser extension feasibility
5. Continue dogfooding pr-vibe on its own development