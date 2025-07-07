import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { BotDetector } = require('pr-vibe/lib/bot-detector.js');

const detector = new BotDetector();

// Test Claude Code detection
console.log('Testing Claude Code bot detection in pr-vibe v0.8.0:\n');

const result = detector.detectBot('claude-code[bot]');
console.log('Claude Code detection result:', result);

// Test review parsing
const review = 'MUST_FIX: Security issue (90% confidence)';
const parsed = detector.parseClaudeCodeReview(review);
console.log('\nClaude Code review parsing:', parsed);