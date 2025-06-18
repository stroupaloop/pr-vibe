import { execSync } from 'child_process';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export function detectGitHubToken() {
  // Priority order for token detection
  const detectionMethods = [
    checkEnvironmentVariable,
    checkGitHubCLI,
    checkVSCodeExtension,
    checkGitConfig,
    checkCommonFiles
  ];

  for (const method of detectionMethods) {
    const result = method();
    if (result.token) {
      return result;
    }
  }

  return { token: null, source: null };
}

function checkEnvironmentVariable() {
  if (process.env.GITHUB_TOKEN) {
    return { 
      token: process.env.GITHUB_TOKEN, 
      source: 'environment variable (GITHUB_TOKEN)' 
    };
  }
  
  // Also check common variants
  const variants = ['GH_TOKEN', 'GITHUB_ACCESS_TOKEN', 'GH_ACCESS_TOKEN'];
  for (const variant of variants) {
    if (process.env[variant]) {
      return { 
        token: process.env[variant], 
        source: `environment variable (${variant})` 
      };
    }
  }
  
  return { token: null };
}

function checkGitHubCLI() {
  try {
    // Check if gh CLI is installed and authenticated
    const token = execSync('gh auth token', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    }).trim();
    
    if (token) {
      return { 
        token, 
        source: 'GitHub CLI (gh)' 
      };
    }
  } catch (e) {
    // gh CLI not installed or not authenticated
  }
  
  return { token: null };
}

function checkVSCodeExtension() {
  // Check for VS Code GitHub authentication
  const vscodeDir = join(homedir(), '.vscode-server', 'data', 'User', 'globalStorage', 'github.vscode-pull-request-github');
  const vscodeInsidersDir = join(homedir(), '.vscode-insiders', 'data', 'User', 'globalStorage', 'github.vscode-pull-request-github');
  
  for (const dir of [vscodeDir, vscodeInsidersDir]) {
    if (existsSync(dir)) {
      // VS Code stores tokens encrypted, we can't read them directly
      // But we can detect that auth exists
      return { 
        token: 'vscode-integrated', 
        source: 'VS Code GitHub extension',
        requiresSetup: true 
      };
    }
  }
  
  return { token: null };
}

function checkGitConfig() {
  try {
    // Check if user has github.token in git config (not recommended but some use it)
    const token = execSync('git config --global github.token', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    if (token) {
      return { 
        token, 
        source: 'git config (github.token)' 
      };
    }
  } catch (e) {
    // Not configured
  }
  
  return { token: null };
}

function checkCommonFiles() {
  // Check common locations where people might store tokens (not recommended)
  const commonPaths = [
    join(homedir(), '.github_token'),
    join(homedir(), '.env'),
    join(homedir(), '.bashrc'),
    join(homedir(), '.zshrc'),
    join(homedir(), '.profile')
  ];
  
  for (const path of commonPaths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf8');
        const tokenMatch = content.match(/(?:GITHUB_TOKEN|GH_TOKEN)=([^\s\n]+)/);
        if (tokenMatch) {
          return { 
            token: tokenMatch[1], 
            source: `file (${path})`,
            warning: 'Token found in plain text file - consider using secure storage'
          };
        }
      } catch (e) {
        // Can't read file
      }
    }
  }
  
  return { token: null };
}

export function showAuthStatus() {
  const { token, source, warning, requiresSetup } = detectGitHubToken();
  
  console.log('\n🔐 ' + chalk.bold('GitHub Authentication Status\n'));
  
  if (token && !requiresSetup) {
    console.log(chalk.green('✓') + ' Token detected from: ' + chalk.cyan(source));
    if (warning) {
      console.log(chalk.yellow('⚠') + ' ' + warning);
    }
    console.log('\n' + chalk.gray('You\'re all set to use pr-vibe!'));
  } else if (requiresSetup) {
    console.log(chalk.yellow('⚠') + ' Found: ' + chalk.cyan(source));
    console.log('  However, we cannot access VS Code tokens directly.');
    console.log('  Please set up authentication using one of these methods:\n');
    showAuthHelp();
  } else {
    console.log(chalk.red('✗') + ' No GitHub token detected\n');
    showAuthHelp();
  }
}

export function showAuthHelp() {
  console.log(chalk.bold('Quick Setup Options:\n'));
  
  console.log('1. ' + chalk.green('Use GitHub CLI') + ' (Recommended)');
  console.log('   ' + chalk.gray('$') + ' gh auth login');
  console.log('   ' + chalk.gray('$') + ' pr-vibe pr 123\n');
  
  console.log('2. ' + chalk.blue('Use Personal Access Token'));
  console.log('   ' + chalk.gray('$') + ' export GITHUB_TOKEN=your_token_here');
  console.log('   ' + chalk.gray('$') + ' pr-vibe pr 123\n');
  
  console.log('3. ' + chalk.magenta('Interactive Setup'));
  console.log('   ' + chalk.gray('$') + ' pr-vibe auth setup\n');
  
  console.log(chalk.gray('Need a token? Create one at:'));
  console.log(chalk.cyan('https://github.com/settings/tokens/new?scopes=repo'));
}

export function isAuthRequired(command) {
  // Commands that don't require auth
  const noAuthCommands = ['demo', 'help', 'auth', 'version', '--version', '-v'];
  return !noAuthCommands.includes(command);
}

export function ensureAuth(options = {}) {
  const { token, source } = detectGitHubToken();
  
  if (!token || token === 'vscode-integrated') {
    if (options.allowLimited) {
      console.log(chalk.yellow('\n⚠️  Running in limited mode (no auth detected)'));
      console.log('   ✓ Can analyze public PRs');
      console.log('   ✗ Cannot post responses');
      console.log('   ✗ Cannot save patterns\n');
      console.log('→ Run ' + chalk.cyan('pr-vibe auth') + ' for full features\n');
      return { limited: true };
    } else {
      console.log(chalk.red('\n❌ GitHub authentication required\n'));
      showAuthHelp();
      process.exit(1);
    }
  }
  
  return { token, source, limited: false };
}