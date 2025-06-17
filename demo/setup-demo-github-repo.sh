#!/bin/bash

# Script to create a demo GitHub repository for pr-vibe video recording
# This creates a realistic scenario with bot comments

echo "🎵 Setting up pr-vibe demo repository on GitHub..."
echo ""
echo "Prerequisites:"
echo "1. GitHub CLI (gh) installed and authenticated"
echo "2. GitHub account with repo creation permissions"
echo ""
read -p "Press Enter to continue..."

# Repository name
REPO_NAME="pr-vibe-demo-$(date +%Y%m%d)"
GITHUB_USERNAME=$(gh api user --jq .login)

echo "Creating repository: $GITHUB_USERNAME/$REPO_NAME"

# Create GitHub repository
gh repo create "$REPO_NAME" --public --description "Demo repository for pr-vibe video recording" --clone

cd "$REPO_NAME" || exit

# Create initial structure
echo "📁 Creating project structure..."

# Main branch setup
cat > README.md << 'EOF'
# Weather API Service

A simple weather API service for demonstration purposes.

## Overview
This service provides weather data through AWS Lambda functions and Express endpoints.

## Setup
```bash
npm install
npm start
```

## Notes
- Uses console.log for CloudWatch logging in Lambda functions
- Webhook payloads are untyped due to varying provider formats
- Legacy code uses `var` for backward compatibility
EOF

# Create the same structure as our demo script
mkdir -p src lib tests api

# Copy demo files from create-demo-repo.sh
cat > package.json << 'EOF'
{
  "name": "weather-api-service",
  "version": "1.0.0",
  "description": "A simple weather API service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0",
    "aws-sdk": "^2.1000.0"
  }
}
EOF

# Lambda function with patterns that trigger bot comments
cat > api/weather-lambda.js << 'EOF'
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Received weather request:', event);
    
    const apiKey = "sk-1234567890abcdef";  // Bot will flag hardcoded key
    
    try {
        const city = event.queryStringParameters.city;
        console.log(`Fetching weather for ${city}`);
        
        const weatherData = await fetchWeather(city, apiKey);
        
        return {
            statusCode: 200,
            body: JSON.stringify(weatherData)
        };
    } catch (error) {
        console.error('Weather fetch failed:', error);  // Valid for CloudWatch
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function fetchWeather(city, key) {
    // Simulated weather fetch
    return { temp: 72, condition: 'sunny' };
}
EOF

# Express webhook handler
cat > src/webhook-handler.js << 'EOF'
const express = require('express');
const router = express.Router();

// Handle incoming webhooks from various services
router.post('/webhook', (req, res) => {
    const payload = req.body;  // Bot will suggest typing
    
    // Complex webhook payload from external service
    processWebhook(payload);
    
    res.status(200).send('OK');
});

function processWebhook(data) {
    // Different webhooks have different structures
    if (data.type === 'payment') {
        handlePayment(data);
    } else if (data.type === 'user') {
        handleUser(data);
    }
}

module.exports = router;
EOF

# Add .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
.DS_Store
EOF

# Initial commit
git add .
git commit -m "Initial commit: Weather API service"

# Create feature branch
git checkout -b feature/add-metrics

# Add metrics file that will trigger multiple bot comments
cat > src/metrics.js << 'EOF'
let metrics = {};  // Bot will suggest const

function trackMetric(name, value) {
    console.log(`Metric: ${name} = ${value}`);  // Bot will flag
    
    if (metrics[name] == undefined) {  // Bot will suggest ===
        metrics[name] = [];
    }
    
    metrics[name].push({
        value: value,
        timestamp: Date.now()
    });
}

// Intentionally using var for legacy compatibility
var exportMetrics = function() {  // Bot will suggest const
    return { ...metrics };
};

module.exports = { trackMetric, exportMetrics };
EOF

# Add test with TODO
cat > tests/metrics.test.js << 'EOF'
const { trackMetric, exportMetrics } = require('../src/metrics');

describe('Metrics', () => {
    test('should track metrics', () => {
        trackMetric('api_calls', 1);
        const data = exportMetrics();
        expect(data.api_calls).toBeDefined();
    });
    
    // TODO: Add more test cases  // Bot will flag TODO
});
EOF

git add .
git commit -m "Add metrics tracking functionality"

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main
git push -u origin feature/add-metrics

# Create PR
echo ""
echo "🔄 Creating Pull Request..."
PR_URL=$(gh pr create \
  --title "Add metrics tracking functionality" \
  --body "## Overview
This PR adds basic metrics tracking to our weather API service.

### Changes
- Added metrics collection module
- Integrated console logging for CloudWatch monitoring
- Track API usage and response times

### Notes
- Using console.log intentionally for CloudWatch integration
- The \`var\` usage is for compatibility with legacy systems
- Webhook payloads are intentionally untyped due to varying structures

### Testing
- [ ] Manually tested metrics collection
- [ ] Verified CloudWatch logging works
- [ ] Checked backward compatibility" \
  --base main \
  --head feature/add-metrics \
  --web)

echo ""
echo "✅ Demo repository created!"
echo ""
echo "📝 Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "🔗 Pull Request: $PR_URL"
echo ""
echo "⏱️  Wait 30-60 seconds for bots to comment, then run:"
echo ""
echo "pr-vibe pr <PR_NUMBER> --repo $GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "🎬 Ready for recording!"

# Create a demo config file
cat > demo-commands.txt << EOF
# Demo Commands for Recording

# 1. Show the PR with bot comments
gh pr view <PR_NUMBER> --comments

# 2. Install pr-vibe (if needed)
npm install -g pr-vibe

# 3. Run pr-vibe on the PR
pr-vibe pr <PR_NUMBER> --repo $GITHUB_USERNAME/$REPO_NAME

# 4. Show the learned patterns
cat .pr-bot/patterns.yml

# 5. Show time saved
echo "Time saved: ~18 minutes"
EOF

echo ""
echo "📄 Demo commands saved to: demo-commands.txt"