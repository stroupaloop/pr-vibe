#!/usr/bin/env node
import { describe, test, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

describe('pr-vibe Smoke Tests', () => {
  test('CLI entry point exists and is executable', () => {
    const cliPath = join(process.cwd(), 'bin/cli.js');
    expect(existsSync(cliPath)).toBe(true);
  });

  test('All required modules exist', () => {
    const requiredModules = [
      'lib/decision-engine.js',
      'lib/pattern-manager.js',
      'lib/llm-integration.js',
      'lib/comment-poster.js',
      'lib/file-modifier.js',
      'lib/pattern-recorder.js',
      'lib/github.js',
      'lib/ui.js'
    ];

    requiredModules.forEach(module => {
      const modulePath = join(process.cwd(), module);
      expect(existsSync(modulePath)).toBe(true);
    });
  });

  test('CLI shows version', () => {
    const output = execSync('node bin/cli.js --version').toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('CLI shows help', () => {
    const output = execSync('node bin/cli.js --help').toString();
    expect(output).toContain('pr-vibe');
    expect(output).toContain('init');
    expect(output).toContain('export');
    expect(output).toContain('review');
    expect(output).toContain('apply');
  });

  test('Package.json is valid', () => {
    const pkg = require('../package.json');
    expect(pkg.name).toBe('pr-vibe');
    expect(pkg.bin['pr-vibe']).toBe('./bin/cli.js');
    expect(pkg.bin['prv']).toBe('./bin/cli.js');
  });

  test('Decision engine can analyze comments', async () => {
    const { analyzeComment } = await import('../lib/decision-engine.js');
    
    const securityComment = {
      body: 'Hardcoded API key detected in source code',
      author: 'coderabbitai[bot]'
    };
    
    const result = analyzeComment(securityComment);
    expect(result.action).toBe('AUTO_FIX');
    expect(result.severity).toBe('CRITICAL');
  });

  test('Pattern manager can load patterns', async () => {
    const { PatternManager } = await import('../lib/pattern-manager.js');
    const manager = new PatternManager();
    
    // Should initialize without errors
    expect(manager).toBeDefined();
    expect(manager.patterns).toBeDefined();
  });
});

console.log('🎵 Running pr-vibe smoke tests...');