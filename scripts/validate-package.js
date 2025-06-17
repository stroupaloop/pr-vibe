#!/usr/bin/env node

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🔍 Validating package before publish...\n');

let hasErrors = false;

// Critical files that must exist and not be empty
const criticalFiles = [
  { path: 'lib/pattern-manager.js', minSize: 5000 },
  { path: 'lib/decision-engine.js', minSize: 1000 },
  { path: 'lib/github.js', minSize: 1000 },
  { path: 'bin/cli.js', minSize: 10000 },
  { path: 'package.json', minSize: 500 }
];

// Check each critical file
for (const { path, minSize } of criticalFiles) {
  const fullPath = join(rootDir, path);
  
  if (!existsSync(fullPath)) {
    console.error(`❌ Missing critical file: ${path}`);
    hasErrors = true;
    continue;
  }
  
  const stats = statSync(fullPath);
  if (stats.size < minSize) {
    console.error(`❌ File too small: ${path} (${stats.size} bytes, expected >= ${minSize})`);
    hasErrors = true;
    
    // Check for TODO stub
    const content = readFileSync(fullPath, 'utf-8');
    if (content.includes('TODO: Implement')) {
      console.error(`   ⚠️  File contains TODO stub!`);
    }
  } else {
    console.log(`✅ ${path} (${stats.size} bytes)`);
  }
}

// Check imports work
console.log('\n🔗 Checking imports...');
try {
  await import(join(rootDir, 'lib/pattern-manager.js'));
  console.log('✅ pattern-manager.js imports correctly');
} catch (error) {
  console.error('❌ Failed to import pattern-manager.js:', error.message);
  hasErrors = true;
}

// Check package.json
console.log('\n📦 Checking package.json...');
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

if (!pkg.name || !pkg.version) {
  console.error('❌ Missing name or version in package.json');
  hasErrors = true;
}

if (!pkg.bin || !pkg.bin['pr-vibe']) {
  console.error('❌ Missing bin entry for pr-vibe');
  hasErrors = true;
}

// Final result
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Package validation FAILED!');
  console.error('Please fix the issues above before publishing.\n');
  process.exit(1);
} else {
  console.log('\n✅ Package validation PASSED!');
  console.log('Ready to publish.\n');
}