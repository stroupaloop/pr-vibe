# Contributing to pr-bot-responder

First off, thanks for taking the time to contribute! 🎉

## 🚀 Quick Start

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🎯 Most Wanted Contributions

### 1. New Git Providers (Perfect First Contribution!)

We've made it easy to add new providers. Here's how:

```javascript
// lib/providers/gitlab-provider.js
import { BaseProvider } from './base-provider.js';

export class GitLabProvider extends BaseProvider {
  async getPullRequest(id) {
    // Your implementation
  }
  
  async getComments(prId) {
    // Your implementation
  }
  
  // ... implement other required methods
}
```

**Bounties Available** 💰
- GitLab support: $100
- Bitbucket support: $100
- Gitea support: $50

### 2. New Bot Parsers (Core to our mission!)

Add support for more PR review bots:
- SonarQube bot
- DeepSource bot
- Codacy bot
- ESLint bot comments
- Renovate bot suggestions
- Custom in-house review bots

### 3. LLM Providers

Add support for:
- Google Gemini
- Anthropic Claude (via Bedrock)
- Cohere
- Local models (Ollama)
- Azure OpenAI

## 📝 Development Process

### Setting Up

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pr-bot-responder.git
cd pr-bot-responder

# Install dependencies
npm install

# Run tests
npm test

# Test your changes
npm link
pr-bot --version
```

### Testing Your Provider

1. Create test fixtures:
```javascript
// test/fixtures/gitlab-comments.json
{
  "comments": [
    // Real comment data from your provider
  ]
}
```

2. Write tests:
```javascript
// test/providers/gitlab.test.js
describe('GitLab Provider', () => {
  test('fetches merge request comments', async () => {
    // Your tests
  });
});
```

3. Test with real PRs:
```bash
pr-bot respond 123 --provider=gitlab --repo=owner/name
```

## 🏗️ Architecture Overview

```
pr-bot-responder/
├── bin/
│   └── cli.js              # Entry point
├── lib/
│   ├── providers/          # Git providers (GitHub, GitLab, etc)
│   │   ├── base-provider.js
│   │   ├── github-provider.js
│   │   └── [your-provider].js  # Add here!
│   ├── responders/         # LLM-powered response generators
│   ├── parsers/           # Bot comment parsers (CodeRabbit, etc)
│   └── core/              # Core logic
└── test/                  # Tests for everything
```

## 🎨 Code Style

- Use ES modules (`import`/`export`)
- Async/await over promises
- Descriptive variable names
- Comments for complex logic
- Tests for new features

## 🧪 Testing Requirements

- All PRs must include tests
- Maintain 80%+ code coverage
- Test with real data when possible
- Mock external API calls

## 📚 Documentation

Update docs for:
- New CLI options
- Provider-specific setup
- Configuration examples
- Common issues

## 🐛 Reporting Issues

Use issue templates for:
- Bug reports
- Feature requests  
- Provider requests

Include:
- pr-bot version
- Node.js version
- Full error messages
- Steps to reproduce

## 💡 Feature Ideas

Check issues labeled `good first issue` or `help wanted`.

Popular requests:
- Slack notifications
- Web UI dashboard
- GitHub Action version
- Pre-commit hook mode
- Batch PR processing

## 🤝 Code of Conduct

- Be welcoming and inclusive
- Respect different viewpoints
- Focus on what's best for the community
- Show empathy towards others

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🎉 Recognition

Contributors get:
- Credit in README
- Mention in release notes
- Eternal gratitude
- Potential bounties for major features

## Questions?

- Open an issue
- Tweet @stroupaloop
- Email: contribute@pr-bot.dev

Happy coding! 🚀