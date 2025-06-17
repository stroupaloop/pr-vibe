# Publishing to npm

## First Time Setup

1. **Login to npm**
   ```bash
   npm login
   # Username: stroupaloop
   # Password: [your password]
   # Email: [your email]
   ```

2. **Verify login**
   ```bash
   npm whoami
   # Should show: stroupaloop
   ```

## Publishing Process

1. **Test locally first**
   ```bash
   npm link
   pr-review --version
   ```

2. **Run tests**
   ```bash
   npm test
   npm run lint
   ```

3. **Update version**
   ```bash
   npm version patch  # or minor/major
   ```

4. **Publish**
   ```bash
   npm publish
   ```

   Note: Since the package name is not scoped (@stroupaloop/pr-review-assistant), 
   it will be published as `pr-review-assistant` directly.

## Version Strategy

- **patch** (0.1.1): Bug fixes, documentation
- **minor** (0.2.0): New features, backwards compatible
- **major** (1.0.0): Breaking changes

## Post-Publish

1. Create GitHub release
2. Tweet announcement
3. Post on Dev.to
4. Submit to Product Hunt

## Useful Commands

```bash
# Check what will be published
npm pack --dry-run

# View package info
npm info pr-review-assistant

# Check for name availability
npm view pr-review-assistant
```