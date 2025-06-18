# pr-vibe v0.3.3 Release Notes 🎵

## 🔒 Critical Security Fix

This release includes a **critical security fix** for a shell injection vulnerability. All users should update immediately.

### Security Issue Fixed
- **Shell Injection in GitHub Comments**: Fixed vulnerability where malicious content in bot responses could execute arbitrary commands
  - Replaced unsafe `execSync` with shell interpolation with secure `execFileSync` calls
  - Comments are now passed via temp files or stdin, preventing command injection
  - Thanks to @coderabbitai for identifying this issue!

## 🐛 Bug Fixes

### GitHub Comment Length Handling
- Automatically handles messages exceeding GitHub's 65,536 character limit
- Intelligent truncation at natural boundaries (code blocks, paragraphs)
- Adds clear notice when content is truncated
- Prevents 422 API errors when posting long responses

### Message Splitting
- Fixed bug that silently dropped content when splitting long messages
- Correctly tracks content length to ensure all text is preserved
- Continuation markers no longer affect content tracking

## 🚀 What's New

### MessageTruncator Utility
- New utility class for handling long messages safely
- Smart truncation that preserves code blocks
- Message splitting with continuation markers
- Comprehensive test coverage

## 📚 Documentation
- Updated README with message length handling details
- Enhanced CHANGELOG with security notices
- Added comprehensive tests for all edge cases

## 🙏 Thanks
Special thanks to CodeRabbit for the thorough security review that identified these critical issues!

## 📦 Installation
```bash
npm install -g pr-vibe@latest
```

## 🔗 Links
- [GitHub Release](https://github.com/stroupaloop/pr-vibe/releases/tag/v0.3.3)
- [npm Package](https://www.npmjs.com/package/pr-vibe)
- [Issue #12](https://github.com/stroupaloop/pr-vibe/issues/12) - GitHub message length limit
- [PR #13](https://github.com/stroupaloop/pr-vibe/pull/13) - Security and bug fixes

---

🤖 Built with love by humans and AI working together!