# Security Policy

## NPM Token Management

### ⚠️ IMPORTANT: Never commit npm tokens to the repository

The npm token that was previously exposed in commit 54cd908 has been identified and should be revoked immediately if it hasn't been already.

### Proper Token Setup

1. **Create a local .npmrc file** (this file is gitignored):
   ```bash
   echo "//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN" >> .npmrc
   ```

2. **Use environment variables** (recommended):
   ```bash
   export NPM_TOKEN=your_token_here
   npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
   ```

3. **For CI/CD**, use secrets management:
   - GitHub Actions: Use repository secrets
   - Store tokens in `NPM_TOKEN` secret
   - Never log or echo tokens

### If a Token is Exposed

1. **Immediately revoke the token** at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. **Generate a new token** with appropriate permissions
3. **Update local .npmrc** with the new token
4. **Check all systems** that might be using the old token

### Best Practices

- Use tokens with minimal required permissions
- Rotate tokens regularly
- Use read-only tokens when possible
- Enable 2FA on your npm account
- Review npm audit logs regularly

## Reporting Security Vulnerabilities

Please report security vulnerabilities to andrew@stroup.dev

Do NOT create public issues for security problems.