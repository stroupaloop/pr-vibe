#!/bin/bash

# Script to create a demo repository with realistic PR scenarios
# Perfect for recording pr-vibe in action

echo "🎵 Creating pr-vibe demo repository..."

# Create demo repo structure
mkdir -p pr-vibe-demo-repo/{src,lib,tests,api}
cd pr-vibe-demo-repo

# Initialize git
git init
git config user.name "Demo Developer"
git config user.email "demo@example.com"

# Create a realistic Node.js project
cat > package.json << 'EOF'
{
  "name": "weather-api-service",
  "version": "1.0.0",
  "description": "A simple weather API service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0"
  }
}
EOF

# Create Lambda function with console.log (CodeRabbit will flag this)
cat > api/weather-lambda.js << 'EOF'
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Received weather request:', event);
    
    const apiKey = "sk-1234567890abcdef";  // CodeRabbit will flag hardcoded key
    
    try {
        const city = event.queryStringParameters.city;
        console.log(`Fetching weather for ${city}`);
        
        // Fetch weather data
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
    // Implementation here
    return { temp: 72, condition: 'sunny' };
}
EOF

# Create Express route with any type (CodeRabbit will flag)
cat > src/webhook-handler.js << 'EOF'
const express = require('express');
const router = express.Router();

// Handle incoming webhooks from various services
router.post('/webhook', (req, res) => {
    const payload = req.body;  // CodeRabbit will want: as any
    
    // Complex webhook payload from external service
    processWebhook(payload);
    
    res.status(200).send('OK');
});

function processWebhook(data) {
    // Different webhooks have different structures
    // Using any is intentional here
    if (data.type === 'payment') {
        handlePayment(data);
    } else if (data.type === 'user') {
        handleUser(data);
    }
}

module.exports = router;
EOF

# Create test file with TODO (DeepSource will flag)
cat > tests/utils.test.js << 'EOF'
const { formatDate, parseConfig } = require('../lib/utils');

describe('Utility functions', () => {
    test('formatDate returns correct format', () => {
        const date = new Date('2024-01-01');
        expect(formatDate(date)).toBe('01/01/2024');
    });
    
    // TODO: Add more test cases  // DeepSource flags TODO comments
    
    test('parseConfig handles edge cases', () => {
        const config = parseConfig('');
        expect(config).toBeNull();
    });
});
EOF

# Create utility with console.log for debugging (valid pattern)
cat > lib/debug-logger.js << 'EOF'
const isDevelopment = process.env.NODE_ENV !== 'production';

class DebugLogger {
    static log(...args) {
        if (isDevelopment) {
            console.log('[DEBUG]', ...args);  // Valid for local debugging
        }
    }
    
    static error(...args) {
        console.error('[ERROR]', ...args);  // Always log errors
    }
}

module.exports = DebugLogger;
EOF

# Create initial commit
git add .
git commit -m "Initial commit: Weather API service"

# Create feature branch with "issues"
git checkout -b feature/add-metrics

# Add changes that will trigger bot comments
cat > src/metrics.js << 'EOF'
let metrics = {};  // CodeRabbit: should be const

function trackMetric(name, value) {
    console.log(`Metric: ${name} = ${value}`);  // CodeRabbit will flag
    
    if (metrics[name] == undefined) {  // CodeRabbit: use ===
        metrics[name] = [];
    }
    
    metrics[name].push({
        value: value,
        timestamp: Date.now()
    });
}

// Intentionally using var for legacy compatibility
var exportMetrics = function() {  // CodeRabbit will suggest const
    return { ...metrics };
};

module.exports = { trackMetric, exportMetrics };
EOF

git add .
git commit -m "Add metrics tracking functionality"

echo ""
echo "✅ Demo repository created!"
echo ""
echo "📝 Suggested PR description for the demo:"
echo ""
cat << 'EOF'
## Add Metrics Tracking

This PR adds basic metrics tracking functionality to our weather API service.

### Changes
- Added metrics collection module
- Integrated console logging for CloudWatch monitoring
- Track API usage and response times

### Notes
- Using console.log intentionally for CloudWatch integration
- The `var` usage is for compatibility with legacy systems
- Webhook payloads are intentionally untyped due to varying structures from different providers

### Testing
- [ ] Manually tested metrics collection
- [ ] Verified CloudWatch logging works
- [ ] Checked backward compatibility
EOF

echo ""
echo "🤖 Expected bot comments:"
echo "1. CodeRabbit: 'Use const instead of let for metrics'"
echo "2. CodeRabbit: 'Remove console.log statements'"
echo "3. CodeRabbit: 'Use === instead of =='"
echo "4. CodeRabbit: 'Replace var with const'"
echo "5. CodeRabbit: 'Add type annotations for payload'"
echo "6. DeepSource: 'Remove TODO comment'"
echo "7. CodeRabbit: 'Move API key to environment variable'"
echo ""
echo "🎵 pr-vibe will intelligently handle each based on context!"