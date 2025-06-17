#!/bin/bash

echo "🔍 Testing NPM Authentication locally..."
echo "====================================="

# Check if token is provided as argument
if [ -z "$1" ]; then
    echo "Usage: ./test-npm-auth.sh YOUR_NPM_TOKEN"
    exit 1
fi

TOKEN=$1

# Create temporary npmrc
echo "//registry.npmjs.org/:_authToken=${TOKEN}" > .npmrc.temp

# Test authentication
echo -e "\n1. Testing npm whoami:"
NPM_CONFIG_USERCONFIG=.npmrc.temp npm whoami 2>&1 || echo "❌ Authentication failed"

echo -e "\n2. Checking access to pr-vibe:"
NPM_CONFIG_USERCONFIG=.npmrc.temp npm access ls-packages 2>&1 | grep pr-vibe || echo "❌ No access to pr-vibe"

echo -e "\n3. Checking package ownership:"
npm owner ls pr-vibe

echo -e "\n4. Token info (safe details only):"
echo "Token length: ${#TOKEN} characters"
echo "Token format: ${TOKEN:0:4}...${TOKEN: -4}"

# Check if it's a classic or granular token
if [[ $TOKEN == npm_* ]]; then
    echo "Token type: Classic npm token"
elif [[ $TOKEN == npma_* ]]; then
    echo "Token type: Granular access token (Automation)"
else
    echo "Token type: Unknown format"
fi

# Clean up
rm -f .npmrc.temp

echo -e "\n====================================="
echo "✅ Test complete (temporary config cleaned up)"