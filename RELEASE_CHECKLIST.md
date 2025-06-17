# Release Checklist for v0.2.0 🚀

## Pre-Release Steps

### 1. Merge PR #1
- [ ] Review PR at https://github.com/stroupaloop/pr-vibe/pull/1
- [ ] Ensure all CI checks pass
- [ ] Merge via GitHub UI (squash and merge)

### 2. Prepare Main Branch
```bash
# Pull latest changes
git checkout main
git pull origin main

# Verify everything works
node bin/cli.js --version  # Should show 0.1.2
node bin/cli.js update     # Test update command
node bin/cli.js changelog  # Test changelog command
```

### 3. Update Version & Changelog
```bash
# Bump to minor version (0.2.0)
npm version minor

# This creates a git tag and commits the version bump
```

## Release Steps

### 4. Publish to npm
```bash
# Ensure you're logged in
npm whoami  # Should show your npm username

# Publish the new version
npm publish

# Verify it worked
npm view pr-vibe@latest version  # Should show 0.2.0
```

### 5. Push Tags to GitHub
```bash
# Push the version tag
git push origin main --tags
```

### 6. Create GitHub Release
```bash
# Create release with auto-generated notes
gh release create v0.2.0 \
  --title "v0.2.0: Human Review Support & Update Notifications" \
  --notes "## Highlights 🎵

### ✨ Human Review Support (Experimental)
- Learn from human reviewers with pattern recognition
- Build team playbooks based on reviewer preferences  
- Interactive feedback loop with --experimental flag
- Confidence-based pattern learning

### 🔔 Update Notifications
- Automatic update checks (once daily)
- pr-vibe changelog command
- pr-vibe update command
- Version-specific update highlights

### 🐛 Improvements
- Case-insensitive bot detection (catches Renovate[bot], etc)
- Better error handling
- Enhanced pattern matching

### 📚 Documentation
- ProductHunt launch preparation
- Comprehensive roadmap
- Updated examples

## Full Changelog
https://github.com/stroupaloop/pr-vibe/blob/main/CHANGELOG.md"
```

## Post-Release Steps

### 7. Update Documentation
- [ ] Update README.md to show v0.2.0 as current
- [ ] Update CHANGELOG.md with release date
- [ ] Tweet about the release
- [ ] Update ProductHunt listing (if launched)

### 8. Verify Everything Works
```bash
# Install globally to test
npm install -g pr-vibe@latest

# Test key features
pr-vibe --version           # Should show 0.2.0
pr-vibe pr 1 --experimental # Test human review support
pr-vibe update              # Should say you're on latest
```

### 9. Monitor for Issues
- Watch GitHub issues for bug reports
- Monitor npm downloads
- Check for any critical feedback

## Rollback Plan (if needed)
```bash
# Deprecate broken version
npm deprecate pr-vibe@0.2.0 "Critical bug found, use 0.1.2"

# Or unpublish if within 72 hours
npm unpublish pr-vibe@0.2.0
```

## Success Metrics
- [ ] npm package published successfully
- [ ] Update notifications working for existing users
- [ ] No critical bugs reported in first 24 hours
- [ ] Human review features accessible with --experimental

---

🎵 Let the vibes flow to all pr-vibe users!