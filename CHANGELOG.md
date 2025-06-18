# Changelog

All notable changes to pr-vibe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2025-06-18

### 🐛 Fixed
- **GitHub Comment Length Limit** - Automatically handles messages exceeding GitHub's 65,536 character limit
  - Intelligent truncation at natural boundaries (code blocks, paragraphs)
  - Adds truncation notice to inform users when content is cut
  - Automatic retry with aggressive truncation on API validation errors
  - Prevents 422 errors when posting long responses

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