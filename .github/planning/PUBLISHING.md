# Publishing Guide

## Automated Publishing (Recommended)

pr-vibe uses GitHub Actions for secure, automated publishing. No local npm tokens needed!

### Setup (One-time, for maintainers)

1. **Generate a new npm token** with publish permissions:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Publish" permissions
   - Name it: `pr-vibe-github-actions`

2. **Add to GitHub Secrets**:
   - Go to https://github.com/stroupaloop/pr-vibe/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token
   - Click "Add secret"

### Publishing a New Version

#### Option 1: Manual Trigger (Recommended)
1. Go to [Actions tab](https://github.com/stroupaloop/pr-vibe/actions)
2. Select "Publish to npm" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. Click "Run workflow"

The workflow will:
- Bump version
- Run tests
- Publish to npm
- Create git tag
- Create GitHub release

#### Option 2: Release-based
1. Create a release on GitHub
2. The workflow will automatically publish the tagged version

### Local Publishing (Not Recommended)

If you must publish locally:

1. **Never commit .npmrc**
2. Use environment variable:
   ```bash
   NPM_TOKEN=your-token npm publish
   ```
3. Or create temporary .npmrc:
   ```bash
   echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
   npm publish
   rm .npmrc
   ```

## Security Notes

- **NEVER** commit npm tokens to the repository
- Tokens in GitHub Secrets are encrypted and only visible to workflows
- Use tokens with minimal required permissions
- Rotate tokens regularly (every 90 days)
- Review npm publish logs for anomalies

## Troubleshooting

### "402 Payment Required"
- Check npm account has no outstanding payments
- Ensure package.json has `"publishConfig": {"access": "public"}`

### "403 Forbidden"
- Token lacks publish permissions
- Token has expired
- Package name is taken

### "E404 Not Found"
- First time publishing a scoped package requires `--access public`