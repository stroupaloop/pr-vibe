#!/bin/bash

# Script to create mock bot comments for demo purposes
# This simulates CodeRabbit comments without needing actual integration

echo "🤖 Creating mock bot comments for demo..."

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./create-mock-bot-comments.sh <owner/repo> <pr-number>"
    exit 1
fi

REPO=$1
PR=$2

# Create realistic CodeRabbit-style comments using GitHub CLI
echo "Creating mock CodeRabbit comments on PR #$PR..."

# Comment 1: Console.log in Lambda
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-    console.log('Received weather request:', event);
+    // Remove console.log statements before production
\`\`\`

Console.log statements should be removed from production code.

📍 **api/weather-lambda.js:4**"

# Comment 2: Hardcoded API key
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-    const apiKey = \"sk-1234567890abcdef\";
+    const apiKey = process.env.WEATHER_API_KEY;
\`\`\`

**Security Issue**: Hardcoded API keys should be stored in environment variables.

📍 **api/weather-lambda.js:6**"

# Comment 3: Use const instead of let
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-let metrics = {};
+const metrics = {};
\`\`\`

Use \`const\` instead of \`let\` for variables that are not reassigned.

📍 **src/metrics.js:1**"

# Comment 4: Use strict equality
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-    if (metrics[name] == undefined) {
+    if (metrics[name] === undefined) {
\`\`\`

Use strict equality (\`===\`) instead of loose equality (\`==\`).

📍 **src/metrics.js:6**"

# Comment 5: Console.log in metrics
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-    console.log(\`Metric: \${name} = \${value}\`);
+    // Remove console.log or use proper logging library
\`\`\`

Avoid using console.log in production code. Consider using a proper logging library.

📍 **src/metrics.js:4**"

# Comment 6: Use const for function
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-var exportMetrics = function() {
+const exportMetrics = function() {
\`\`\`

Use \`const\` instead of \`var\` for function declarations.

📍 **src/metrics.js:14**"

# Comment 7: Add type annotations
gh pr comment $PR --repo $REPO --body "**🤖 CodeRabbit Review**

\`\`\`suggestion
-    const payload = req.body;
+    const payload: any = req.body;
\`\`\`

Consider adding type annotations for better type safety.

📍 **src/webhook-handler.js:6**"

# Comment 8: TODO comment
gh pr comment $PR --repo $REPO --body "**🤖 DeepSource Review**

\`\`\`suggestion
-    // TODO: Add more test cases
+    // Add more test cases
\`\`\`

TODO comments should be tracked in issues rather than left in code.

📍 **tests/metrics.test.js:10**"

echo ""
echo "✅ Created 8 mock bot comments!"
echo ""
echo "These comments simulate what CodeRabbit would typically flag."
echo "Now you can run: pr-vibe pr $PR --repo $REPO"