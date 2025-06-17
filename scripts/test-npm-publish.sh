#!/bin/bash

echo "🔍 Testing NPM Publish Permission..."
echo "====================================="

if [ -z "$1" ]; then
    echo "Usage: ./test-npm-publish.sh YOUR_NPM_TOKEN"
    exit 1
fi

TOKEN=$1

# Create temporary npmrc
echo "//registry.npmjs.org/:_authToken=${TOKEN}" > .npmrc.temp

# Test with npm access command more thoroughly
echo -e "\n1. Checking all packages you have access to:"
NPM_CONFIG_USERCONFIG=.npmrc.temp npm access ls-packages 2>&1 | head -10 || echo "❌ Could not list packages"

echo -e "\n2. Checking collaborators on pr-vibe:"
NPM_CONFIG_USERCONFIG=.npmrc.temp npm access ls-collaborators pr-vibe 2>&1 || echo "❌ Could not check collaborators"

echo -e "\n3. Testing publish permission (dry-run):"
# Create a minimal test package
mkdir -p /tmp/npm-test-pkg
cat > /tmp/npm-test-pkg/package.json << EOF
{
  "name": "@stroupaloop/test-publish-perms-${RANDOM}",
  "version": "0.0.1",
  "description": "Test package - safe to delete",
  "private": true
}
EOF

cd /tmp/npm-test-pkg
NPM_CONFIG_USERCONFIG=$OLDPWD/.npmrc.temp npm publish --dry-run --access public 2>&1 | grep -E "(npm notice|forbidden|error)" || echo "✅ Dry run succeeded"
cd - > /dev/null

# Clean up
rm -f .npmrc.temp
rm -rf /tmp/npm-test-pkg

echo -e "\n====================================="
echo "Token permission check complete"
echo ""
echo "🔑 To fix this, create a new token with PUBLISH permissions:"
echo "1. Go to: https://www.npmjs.com/settings/stroupaloop/tokens"
echo "2. Click 'Generate New Token' → 'Classic Token'"
echo "3. Select type: 'Publish'"
echo "4. Name it: 'pr-vibe-github-actions'"
echo "5. Update GitHub secret NPM_TOKEN with the new token"