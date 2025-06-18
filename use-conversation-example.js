#!/usr/bin/env node
// Example of how to use conversation manager with pr-vibe

import { GitHubProvider } from './lib/providers/github-provider.js';
import { ConversationManager } from './lib/conversation-manager.js';
import { analyzeComment } from './lib/decision-engine.js';
import chalk from 'chalk';

async function handleWithConversations(prNumber, repo) {
  console.log(chalk.bold.magenta('\n🎵 pr-vibe with Conversation Management\n'));
  
  const provider = new GitHubProvider({ repo });
  const manager = new ConversationManager(provider);
  
  // Get PR comments
  const { comments } = await analyzeGitHubPR(prNumber, repo);
  const botComments = comments.filter(c => c.user.login.includes('[bot]'));
  
  console.log(`Found ${botComments.length} bot comments\n`);
  
  // Handle each comment with conversation support
  for (const comment of botComments) {
    const analysis = analyzeComment(comment);
    
    // Generate initial response
    let response;
    if (analysis.action === 'REJECT') {
      response = `Thank you for the feedback. ${analysis.reason}`;
    } else if (analysis.action === 'AUTO_FIX') {
      response = `I'll fix this issue. ${analysis.reason}`;
    } else {
      response = analysis.reason;
    }
    
    console.log(chalk.cyan(`Handling comment from ${comment.user.login}...`));
    
    // Start conversation and wait for resolution
    const conversation = await manager.startConversation(prNumber, comment, response);
    
    if (conversation) {
      console.log(`  Status: ${conversation.status}`);
      console.log(`  Rounds: ${conversation.rounds.length}`);
      if (conversation.resolution) {
        console.log(`  Resolution: ${conversation.resolution}`);
      }
    }
  }
  
  // Show summary
  const summary = manager.getConversationSummary();
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`  Conversations: ${summary.total}`);
  console.log(`  Resolved: ${summary.resolved}`);
  console.log(`  Total rounds: ${summary.totalRounds}`);
}

// Usage: node use-conversation-example.js <PR> <repo>
const [,, prNumber, repo] = process.argv;
if (!prNumber || !repo) {
  console.log('Usage: node use-conversation-example.js <PR> <repo>');
  process.exit(1);
}

handleWithConversations(prNumber, repo).catch(console.error);