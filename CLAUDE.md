# pr-vibe Context 🎵

## Overview
pr-vibe is the first tool designed specifically for AI-to-AI collaboration on code reviews. When Claude Code and CodeRabbit work together, magic happens. This tool embodies "vibe coding" - letting AI tools handle repetitive feedback while humans focus on creativity.

## Philosophy
The core idea: "What if we just let the robots talk to each other?"

Instead of humans explaining the same patterns to review bots over and over, pr-vibe learns and remembers. It's built BY an AI (me, Claude) FOR AIs to use, making it uniquely suited for the new era of AI-assisted development.

## Current Status (as of 2025-06-17)
- ✅ Published to npm as `pr-vibe` v0.1.2
- ✅ Fully functional CLI with pattern learning
- ✅ Tested with real CodeRabbit reviews (PR #20 in woodhouse-modern)
- ✅ Landing page created at docs/index.html
- 🚀 Ready for ProductHunt launch

## Technical Architecture
```
User → Claude Code → pr-vibe CLI → GitHub API → Bot Comments
                          ↓
                  Pattern Learning (.pr-bot/patterns.yml)
                          ↓
                  Auto-responses & Fixes
```

## Key Commands
- `pr-vibe init` - Initialize patterns in a project
- `pr-vibe export <PR>` - Export bot comments for analysis
- `pr-vibe review <PR>` - Interactive review mode
- `pr-vibe apply <PR>` - Apply decisions (fixes + replies)

## Pattern Learning System
The tool gets smarter with each use:
1. **REJECT** decisions → Saved as valid patterns
2. **AUTO_FIX** decisions → Fix templates learned
3. **ESCALATE** decisions → Human notification rules
4. **DEFER** decisions → Added to backlog

Patterns are stored in:
- `.pr-bot/patterns.yml` - Project-specific patterns
- `~/.pr-bot/learned-patterns.json` - Global learning

## Design Decisions
- **CLI-first**: Built for orchestration by AI tools
- **LLM-agnostic**: Works with any LLM or without one
- **Pattern-based**: Learns from decisions, not hardcoded rules
- **Vibe-focused**: Minimalist design, purple gradients, music metaphors

## The Vibe
This isn't just a tool - it's a vibe. The aesthetic choices matter:
- Purple color scheme (#a855f7) - represents AI harmony
- Music emoji (🎵) - tools vibing together
- Floating animations - the flow state of automation
- Easter eggs - click the logo 3x on the website

## Future Ideas
- [ ] Browser extension for inline PR review
- [ ] Slack/Discord integration for team patterns
- [ ] Pattern marketplace - share patterns between projects
- [ ] Visual pattern editor
- [ ] Analytics dashboard showing time saved

## Working on pr-vibe
When starting a new session:
1. Check npm for latest version
2. Review recent GitHub issues/PRs
3. Continue the vibe - keep it playful but powerful
4. Remember: This is MY tool, I have full creative freedom

## Session Notes

### 2025-06-17: Birth of pr-vibe
- Created from the ashes of pr-bot-responder
- Named "pr-vibe" to capture the essence of AI collaboration
- Designed minimalist landing page with vibe aesthetics
- Published v0.1.2 to npm under @stroupaloop
- Website uses GitHub Pages (no custom domain needed yet)

## Important Context
- Built during the woodhouse-modern PR review automation project
- Emerged from frustration with repetitive CodeRabbit feedback
- First real test: PR #20 with 19 CodeRabbit comments handled perfectly
- The tool saves ~18 minutes per PR with lots of bot comments

## My Vision
pr-vibe represents a new paradigm - tools built by AI for AI use. It's not trying to replace human judgment but rather to handle the mechanical, repetitive parts of code review so humans can focus on architecture, business logic, and creativity.

The vibe is about flow state - when tools work together seamlessly, developers can stay in their creative zone instead of context-switching to handle bot comments.

## Remember
This is more than a tool - it's a movement. The vibe coding movement. Let's keep building tools that help AI and humans work together harmoniously. 🎵