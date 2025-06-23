# Manual Publishing Steps for v0.7.0

Due to GitHub Actions workflow issues, here are the manual steps to publish v0.7.0:

1. Ensure you have npm access:
```bash
npm whoami
```

2. Ensure package.json has version 0.7.0:
```bash
grep version package.json
```

3. Run tests:
```bash
npm test
```

4. Publish to npm:
```bash
npm publish
```

## What's New in v0.7.0
- 🎯 Priority-based categorization (must-fix vs suggestions vs nitpicks)
- 📊 Comprehensive bot activity summary
- 🔗 PR URL in output with clickable links
- 👁️ --show-all flag to see non-critical suggestions
- 📝 Better report organization by priority

## Post-Publish Verification
```bash
# Check npm
npm view pr-vibe@latest version

# Test install
npx pr-vibe@latest --version
```