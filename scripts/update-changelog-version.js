#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read current version from package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const currentVersion = pkg.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

console.log(`Updating changelog in CLI to version ${currentVersion}...`);

// Read cli.js
const cliPath = join(rootDir, 'bin', 'cli.js');
let cliContent = readFileSync(cliPath, 'utf-8');

// Update the changelog command section
// Find the changelog section
const changelogStart = cliContent.indexOf("console.log(chalk.cyan('## Version");
if (changelogStart === -1) {
  console.error('Could not find changelog section in cli.js');
  process.exit(1);
}

// Extract current changelog section
const changelogEnd = cliContent.indexOf('console.log(chalk.gray(\'Run with --full', changelogStart);
const oldChangelog = cliContent.substring(changelogStart, changelogEnd);

// Build new changelog based on current version
let newChangelog = `      console.log(chalk.cyan('## Version ${currentVersion} (Current)'));\n`;

// Add version-specific features
if (major === 0 && minor === 4) {
  newChangelog += `      console.log('  📊 Comprehensive reporting with decision logs');\n`;
  newChangelog += `      console.log('  🛡️ Pre-merge safety checks (check, status, report commands)');\n`;
  newChangelog += `      console.log('  📝 Persistent report storage with 30-day TTL');\n`;
  newChangelog += `      console.log('  🐛 Fixed critical file replacement bug\\n');\n`;
} else if (major === 0 && minor === 3) {
  newChangelog += `      console.log('  🤝 Full conversation management with bots');\n`;
  newChangelog += `      console.log('  🔒 Security fix for shell injection vulnerability');\n`;
  newChangelog += `      console.log('  📏 GitHub comment length handling');\n`;
  newChangelog += `      console.log('  🎯 Zero-setup demo experience\\n');\n`;
} else if (major === 0 && minor === 2) {
  newChangelog += `      console.log('  ✨ Human review support with --include-human-reviews flag');\n`;
  newChangelog += `      console.log('  🔔 Automatic update notifications');\n`;
  newChangelog += `      console.log('  🐛 Case-insensitive bot detection');\n`;
  newChangelog += `      console.log('  📊 Pattern learning from team feedback\\n');\n`;
} else {
  // Generic features for unknown versions
  newChangelog += `      console.log('  ✨ New features and improvements');\n`;
  newChangelog += `      console.log('  🐛 Bug fixes and enhancements\\n');\n`;
}

// Add previous versions (always show at least 2 previous minor versions)
newChangelog += `      \n`;

// Add previous versions based on current
if (major === 0 && minor >= 4) {
  newChangelog += `      console.log(chalk.cyan('## Version 0.3.x'));\n`;
  newChangelog += `      console.log('  🤝 Full conversation management with bots');\n`;
  newChangelog += `      console.log('  🔒 Security fix for shell injection vulnerability');\n`;
  newChangelog += `      console.log('  📏 GitHub comment length handling');\n`;
  newChangelog += `      console.log('  🎯 Zero-setup demo experience\\n');\n`;
  newChangelog += `      \n`;
  newChangelog += `      console.log(chalk.cyan('## Version 0.2.0'));\n`;
  newChangelog += `      console.log('  ✨ Human review support with --include-human-reviews flag');\n`;
  newChangelog += `      console.log('  🔔 Automatic update notifications');\n`;
  newChangelog += `      console.log('  🐛 Case-insensitive bot detection');\n`;
  newChangelog += `      console.log('  📊 Pattern learning from team feedback\\n');\n`;
} else if (major === 0 && minor === 3) {
  newChangelog += `      console.log(chalk.cyan('## Version 0.2.0'));\n`;
  newChangelog += `      console.log('  ✨ Human review support with --include-human-reviews flag');\n`;
  newChangelog += `      console.log('  🔔 Automatic update notifications');\n`;
  newChangelog += `      console.log('  🐛 Case-insensitive bot detection');\n`;
  newChangelog += `      console.log('  📊 Pattern learning from team feedback\\n');\n`;
  newChangelog += `      \n`;
  newChangelog += `      console.log(chalk.cyan('## Version 0.1.2'));\n`;
  newChangelog += `      console.log('  🚀 Initial public release');\n`;
  newChangelog += `      console.log('  🤖 CodeRabbit and DeepSource support');\n`;
  newChangelog += `      console.log('  🧠 Pattern learning system');\n`;
  newChangelog += `      console.log('  ⚡ Auto-fix common issues\\n');\n`;
}

newChangelog += `      \n`;

// Replace the old changelog with new
cliContent = cliContent.substring(0, changelogStart) + newChangelog + cliContent.substring(changelogEnd);

// Also update the version hint function
const versionHintPattern = /if \(latest\.startsWith\('0\.\d+'\)\) \{[\s\S]*?return '[^']+';[\s\S]*?\}/g;
const versionHints = [];

// Add hints for known versions
if (minor >= 4) {
  versionHints.push(`    if (latest.startsWith('0.4')) {\n      return 'Comprehensive reporting and pre-merge safety checks';\n    }`);
}
if (minor >= 3) {
  versionHints.push(`    if (latest.startsWith('0.3')) {\n      return 'Conversation management and security fixes';\n    }`);
}
if (minor >= 2) {
  versionHints.push(`    if (latest.startsWith('0.2')) {\n      return 'Human review support with --include-human-reviews flag';\n    }`);
}

// Find and update the version hints section
const hintSectionMatch = cliContent.match(/\/\/ Specific highlights for known versions[\s\S]*?return 'New features and improvements';/);
if (hintSectionMatch) {
  const newHintSection = `// Specific highlights for known versions\n${versionHints.map(hint => '    ' + hint.trim()).join(' else ')}\n    return 'New features and improvements';`;
  cliContent = cliContent.replace(hintSectionMatch[0], newHintSection);
}

// Write updated content
writeFileSync(cliPath, cliContent);

console.log(`✅ Updated changelog in CLI to version ${currentVersion}`);

// Make the script executable
import { chmodSync } from 'fs';
try {
  chmodSync(__filename, '755');
} catch (e) {
  // Ignore chmod errors on Windows
}