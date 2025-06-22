# Changelog

All notable changes to pr-vibe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-06-20

### 🐛 Fixed
- **Fixed false positive security categorization** - ESLint style warnings no longer flagged as security vulnerabilities
  - Type imports (e.g., "prefer type-only import") now correctly categorized as STYLE, not SECURITY
  - Empty catch blocks now correctly categorized as CODE_QUALITY, not SECURITY
  - Console.log statements now correctly categorized as DEBUG, not SECURITY
  - Added context-aware categorization that checks style patterns before security patterns
  - Commit messages now accurate: "style: Apply code formatting" instead of "SECURITY: Fixed vulnerability"

### 🔧 Improvements
- Added new issue categories: STYLE and DEBUG for better classification
- Enhanced bot comment parsing to understand CodeRabbit severity indicators (⚠️ ≠ security)
- Added comprehensive test suite for categorization logic

## [0.7.0] - 2025-06-22

### 🎉 Major Features
- **Enhanced Comment Categorization** - Better visibility into all bot feedback
  - Priority-based categorization: must-fix vs suggestions vs nitpicks
  - Bot approval status shown in summary (e.g., "CodeRabbit: Approved")
  - `--show-all` flag to display non-critical suggestions
  - PR URL included in output with terminal hyperlink support
  - Comments grouped by priority in reports
  
### 🤖 Bot Review Summary
- Shows which bots approved your PR at a glance
- Displays breakdown of comment types per bot
- Clear indication of actionable vs non-actionable items

### 📊 Enhanced Reports
- New "Bot Review Summary" section at top of reports
- "Non-Critical Suggestions" section for optional improvements
- Priority breakdown in summary statistics
- Better organization of comments by severity

### 🔧 Improvements
- Added `PRIORITY_LEVELS` export for consistent categorization
- Enhanced decision engine to include priority in all analyses
- Terminal hyperlink support for PR URLs (supported terminals only)
- Report builder tracks bot approvals and priority counts

### 📚 Documentation
- Updated README with enhanced output examples
- Added priority filtering documentation
- Documented new bot approval summary feature

## [Unreleased]

### 🎉 Major Features
- **GitHub Issue Creation for Deferred Items** - Never lose important bot feedback
  - `--create-issues` flag to automatically create issues when deferring items
  - New `pr-vibe issues <pr>` command to create issues from saved reports
  - Issues include full context: bot name, PR link, file/line info, decision reasoning
  - Automatic labeling with `bot-feedback`, `pr-vibe`, and bot-specific labels
  - Track created issues in reports and PR summaries
  - `--dry-run` support to preview issues before creation
  
### 🔧 Improvements
- Enhanced ReportBuilder to track issue URLs for deferred items
- Updated PR summary to show count of issues created
- Added dedicated "Deferred to Backlog" section in reports
- New "Created Issues" section in PR comment summary

### 📚 Documentation
- Added issue creation commands to README
- Created `examples/issue-creation-demo.js` to showcase the feature

## [0.6.0] - 2025-06-19

### 🎉 Major Features
- **Nit Comment Filtering** - Focus on what matters with intelligent nit detection
  - `--skip-nits` flag to exclude minor style/formatting comments
  - `--nits-only` flag to review only nitpick comments
  - Detects common nit patterns: "nit:", "minor", "consider", "style", etc.
  - Recognizes CodeRabbit's "review details" and "additional comments" sections
  - 90%+ confidence in nit detection
  - New `NIT` action type in decision engine with lower priority

### 🔧 Improvements
- Enhanced bot detection to track whether comments are nitpicks
- Updated UI to show [NIT] indicator for nitpick comments
- Added comprehensive test suite for nit detection
- Created example demo script showing nit filtering in action

### 📚 Documentation
- Added nit filtering options to README
- Created `examples/nit-filtering-demo.js` to demonstrate the feature

## [0.5.0] - 2025-06-19

### 🎉 Major Features
- **PR Review Detection** - Now detects CodeRabbit and other bots that post as PR reviews
  - Added `getReviews()` method to fetch GitHub PR reviews
  - Processes both inline comments AND PR reviews
  - Parses CodeRabbit's structured format ("Actionable comments posted: N")

- **Smart Watch Mode** - New `pr-vibe watch <pr>` command for seamless workflow
  - Intelligent polling: 5s intervals for first 30s, then 15s, then 30s
  - Live progress updates showing elapsed time
  - Auto-processes when bots arrive
  - Perfect for use right after creating a PR

- **Nit Comment Filtering** - Focus on what matters with intelligent nit detection
  - `--skip-nits` flag to exclude minor style/formatting comments
  - `--nits-only` flag to review only nitpick comments
  - Detects common nit patterns: "nit:", "minor", "consider", "style", etc.
  - Recognizes CodeRabbit's "review details" and "additional comments" sections
  - 90%+ confidence in nit detection

- **Bot-Specific Detection** - New `bot-detector.js` with confidence-based detection
  - Detects CodeRabbit, DeepSource, SonarCloud, CodeClimate, Snyk
  - Filters out non-actionable content (summaries, metadata)
  - 95% confidence for known bots
  - Parses bot-specific review formats

### 🔧 Improvements
- **Better Error Messages** - Shows exactly what was found
  - Displays comment counts by type (issue, review, PR review)
  - Lists which bots were detected or skipped
  - Explains why comments weren't processed
  - Suggests using watch mode for fresh PRs

- **Debug Mode** - New `--debug` flag for troubleshooting
  - Shows all API calls and responses
  - Displays detection logic and confidence scores
  - Helps diagnose why bots aren't being detected

- **Confidence Tracking** - Every decision now includes confidence levels
  - 95% confidence for pattern matching
  - 90-95% for security issues
  - 70% for architectural discussions
  - Reports show average confidence

### 🚀 Usage
```bash
# New seamless workflow
gh pr create ...
pr-vibe watch 123  # Waits for and processes bot reviews automatically
```

## [0.4.1] - 2025-06-19

### 🐛 Fixed
- **CLI Changelog Command** - Updated hardcoded version from 0.2.0 to current version
  - The `pr-vibe changelog` command now correctly shows v0.4.0 as the current version
  - Added automated changelog version updates to CI/CD pipeline
  - Future releases will automatically update the CLI changelog

### 🔧 Improved
- **Release Process** - Added automated changelog version synchronization
  - Created `scripts/update-changelog-version.js` to sync CLI with package.json version
  - Updated GitHub Actions workflows to run changelog update during releases
  - Ensures users always see the correct version information

## [0.4.0] - 2025-06-18

### ✨ Added
- **Comprehensive Reporting System** - Detailed decision logs for every PR review
  - ReportBuilder generates structured reports with bot comments, decisions, and actions
  - Reports saved in `.pr-bot/reports/` in both Markdown and JSON formats
  - Automatic TTL management (30-day retention by default)
  
- **Pre-Merge Safety Commands** - New commands to ensure PR readiness
  - `pr-vibe check <pr>` - Exit code 0/1 for CI integration
  - `pr-vibe status <pr>` - View or post GitHub status checks
  - `pr-vibe report <pr>` - Access saved reports
  - `pr-vibe cleanup` - Remove old reports

### 🐛 Fixed
- **Critical File Replacement Bug** - pr-vibe no longer replaces files with TODO placeholders
  - Fixed decision-engine.js to return null instead of TODO strings
  - Added safety checks in file-modifier.js
  - Prevents accidental file corruption

## [0.3.4] - 2025-06-18

### 🐛 Fixed
- **CRITICAL**: Restored missing `demo` command that was accidentally removed in v0.3.3
  - The demo command is essential for the zero-setup experience
  - Now `npx pr-vibe@latest demo` works correctly again
  - No authentication required for demo mode

## [0.3.3] - 2025-06-18

### 🔒 Security
- **CRITICAL**: Fixed shell injection vulnerability in GitHub comment posting
  - Replaced direct shell interpolation with safe execFileSync calls
  - Uses temp files or stdin to pass comment bodies securely
  - Prevents command injection from untrusted bot responses

### 🐛 Fixed
- **GitHub Comment Length Limit** - Automatically handles messages exceeding GitHub's 65,536 character limit
  - Intelligent truncation at natural boundaries (code blocks, paragraphs)
  - Adds truncation notice to inform users when content is cut
  - Automatic retry with aggressive truncation on API validation errors
  - Prevents 422 errors when posting long responses
- **Message Splitting** - Fixed bug that dropped content when splitting long messages
  - Correctly tracks raw content length vs augmented length with markers
  - Ensures all content is preserved when splitting across multiple comments

### 🔧 Added
- MessageTruncator utility for handling long messages
- Comprehensive tests for message truncation logic
- Documentation for message length handling in README

## [0.3.2] - 2025-06-18

### 🐛 Fixed
- Version display in CLI now correctly reads from package.json instead of being hardcoded

## [0.3.1] - 2025-06-18

### 🐛 Fixed
- Corrected npm homepage URL to point to GitHub Pages site

## [0.3.0] - 2025-06-18

### 🚀 Added
- **Zero-Setup Demo Mode** - Try pr-vibe instantly with `npx pr-vibe@latest demo`
- **Full Conversation Management** - Handles multi-round dialogues with review bots
- **Smart Token Detection** - Automatically finds GitHub tokens from gh CLI, env vars, VS Code
- **Rate Limit Handling** - Detects and waits for bot rate limits automatically
- **Conversation Monitoring** - Tracks bot responses and continues dialogue until resolution
- **Progressive Enhancement** - Works in limited mode for public repos without auth
- **Interactive Menu** - Run `pr-vibe` without args for guided experience

### 🔧 Improved
- Bot response detection now catches corrections and clarifications
- Enhanced pattern matching for various rate limit messages
- Better error messages with actionable solutions
- Exponential backoff for checking bot responses
- Thread resolution via GraphQL API
- pr-vibe signatures on all bot responses

### 🐛 Fixed
- Handles cases where bots correct misunderstandings
- Properly waits for bot responses instead of using arbitrary timeouts
- Resolved empty test file issues
- Fixed demo.js corruption issues

## [0.2.1] - 2025-06-17

### 🐛 Fixed
- **CRITICAL**: Fixed missing pattern-manager.js implementation that caused import errors
- Added comprehensive test suite to prevent file corruption
- Added CI/CD pipeline with package validation
- Added pre-publish validation script

### 🔧 Added
- GitHub Actions workflow for automated testing
- Package validation before npm publish
- Integration tests for all critical imports
- Demo recording script and test repository generator

## [0.2.0] - 2025-06-17

### ✨ Added
- Human review support with `--include-human-reviews` flag
- Pattern learning from team feedback
- Team playbook tracking for consistent reviews
- Automatic update notifications
- Case-insensitive bot detection (fixes CodeRabbit detection)
- `changelog` and `update` commands

### 🔧 Improved
- Better pattern confidence scoring
- Enhanced learning algorithms
- More informative CLI output

## [0.1.2] - 2025-06-17

### Added
- Full pattern learning system that remembers project-specific conventions
- Interactive review mode with decision tracking
- Export mode for Claude Code integration
- Apply mode for batch processing decisions
- Support for CodeRabbit, DeepSource, and other review bots
- Auto-fix functionality for common issues
- Global and project-specific pattern storage
- Beautiful CLI interface with progress indicators
- Comprehensive documentation and examples

### Changed
- Renamed from pr-bot-responder to pr-vibe for better branding
- Improved command structure and options
- Enhanced pattern matching algorithms

### Fixed
- Thread grouping for better conversation context
- Error handling for missing GitHub tokens
- Pattern confidence scoring

## [0.1.1] - 2025-06-16

### Added
- Initial prototype functionality
- Basic GitHub PR comment fetching
- Simple pattern matching

## [0.1.0] - 2025-06-16

### Added
- Project inception
- Core architecture design
- Initial package setup

---

## Future Releases

### [Unreleased]
- Browser extension for inline PR reviews
- Slack/Discord integration
- Pattern marketplace
- Visual pattern editor
- Analytics dashboard

[0.1.2]: https://github.com/stroupaloop/pr-vibe/releases/tag/v0.1.2
[0.1.1]: https://github.com/stroupaloop/pr-vibe/releases/tag/v0.1.1
[0.1.0]: https://github.com/stroupaloop/pr-vibe/releases/tag/v0.1.0