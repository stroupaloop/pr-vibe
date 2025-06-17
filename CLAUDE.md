# PR Review Assistant - Claude Context

## Project Overview
AI-powered CLI tool for handling PR reviews from automated services (CodeRabbit, DeepSource, etc.) with conversational context and intelligent decision-making.

## Origin Story
- Born from the Woodhouse project's need to handle CodeRabbit reviews efficiently
- Evolved from complex GitHub Actions approach to simpler CLI tool
- Designed to work with Claude Code and other LLMs

## Core Features
1. **Fetch and analyze PR comments** from various review services
2. **Maintain conversation threads** across multiple exchanges
3. **Intelligent decision engine**:
   - AUTO-FIX: Apply safe fixes automatically
   - DISCUSS: Engage in clarifying conversation
   - REJECT: Identify valid project patterns
   - ESCALATE: Flag for human review
   - BACKLOG: Defer non-critical improvements
4. **LLM-agnostic** - Support for Claude, GPT-4, Gemini, local models
5. **Project-aware** - Learn and remember project-specific patterns

## Technical Design

### Architecture
```
pr-review-assistant/
├── bin/
│   └── cli.js              # Entry point
├── src/
│   ├── commands/           # CLI commands (pr, watch, init)
│   ├── providers/          # GitHub, GitLab API adapters
│   ├── analyzers/          # LLM integrations
│   ├── parsers/           # Review service parsers
│   └── ui/                # Terminal UI components
└── .pr-review/            # Project config directory
```

### Key Decisions
- **CLI over automation**: Human-in-the-loop for control and trust
- **LLM-agnostic**: Not locked to Claude, supports multiple providers
- **Project-local config**: Each project can have its own rules
- **Conversation state**: Maintain context across review exchanges

## Integration with Claude Code

### Three modes of operation:
1. **CLI calls Claude API directly** for quick decisions
2. **CLI prepares context for Claude Code** for complex issues
3. **Claude Code calls CLI** to check and apply review feedback

### Shared context via `.pr-review/` directory:
```
.pr-review/
├── config.json           # Project settings
├── patterns.json         # Learned patterns
├── current-task.json     # Active review task
└── decisions.log         # Decision history
```

## Implementation Plan

### Phase 1: MVP (Week 1)
- [ ] Basic CLI structure with Commander.js
- [ ] GitHub API integration
- [ ] CodeRabbit comment parser
- [ ] Claude/OpenAI analyzer
- [ ] Interactive review flow

### Phase 2: Polish (Week 2)
- [ ] Multiple LLM providers
- [ ] Conversation threading
- [ ] Project pattern learning
- [ ] Better UI with Ink/Blessed

### Phase 3: Launch (Week 3)
- [ ] Documentation
- [ ] Examples for different project types
- [ ] npm package setup
- [ ] Launch on Product Hunt, HN

## Project Patterns from Woodhouse

### Valid Patterns to Remember:
- `console.log` in Lambda functions (CloudWatch logging)
- `any` types for complex external APIs (Stripe, webhooks)
- Hardcoded table names in infrastructure code

### Always Fix:
- Exposed API keys or secrets
- SQL injection vulnerabilities
- Missing error handling
- Sensitive data in logs

### Project-Specific Context:
- Serverless architecture (AWS Lambda)
- TypeScript with some legacy JavaScript
- DynamoDB for data storage
- Twilio for SMS

## Usage Examples

```bash
# Initialize in a project
pr-review init

# Review a PR
pr-review pr 18

# Auto-fix safe issues
pr-review pr 18 --auto-fix

# Watch for new comments
pr-review watch 18

# Use different LLM
pr-review pr 18 --llm=gpt-4

# Continue conversation
pr-review pr 18 --continue
```

## Open Source Strategy
- MIT License
- Publish under @stroupaloop npm scope
- Focus on developer experience
- Build in public
- Dogfood on woodhouse-modern

## Success Metrics
- Reduces PR review time by 50%+
- Handles 80% of routine review comments
- Maintains conversation context accurately
- Works across different project types
- Active community contributions