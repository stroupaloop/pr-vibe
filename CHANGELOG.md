# Changelog

All notable changes to pr-vibe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-06-17 (Ready for Release)

### Added
- 🧑‍💻 **Human Review Support** - Learn from your team's review patterns
  - Separate bot and human comment detection
  - Interactive pattern learning with confidence tracking
  - Team playbook that grows smarter with each review
  - Extract key phrases like "needs error handling", "add tests"
  - `--include-human-reviews` flag to also process human feedback
  - Gradual confidence building - pr-vibe learns what matters to YOUR team
- 🔔 **Update Notifications** - Never miss a pr-vibe improvement
  - Automatic daily checks for new versions
  - `pr-vibe changelog` command to see what's new
  - `pr-vibe update` command for manual update checks
  - Version-specific highlights in notifications
- 📚 **Better Documentation**
  - Comprehensive ROADMAP.md with feature wishlist
  - ProductHunt launch preparation
  - Enhanced README with clearer getting started guide

### Changed
- 🐛 Bot detection is now case-insensitive (catches Renovate[bot], Dependabot)
- 📦 Added more npm keywords for better discoverability
- 🎨 Landing page now has 6 feature panels (better visual balance)

### Fixed
- Pattern manager YAML parsing improvements
- Regex matches now capture all occurrences, not just the first

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