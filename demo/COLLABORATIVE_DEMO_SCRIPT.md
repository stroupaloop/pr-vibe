# Collaborative Demo Script: Human + AI Building Together 🎵

## Overview
This demo shows the real-time collaboration between Andrew and Claude Code working on pr-vibe together. It's not just about the tool - it's about the process of building WITH AI, not just using AI.

## Recording Setup
- **Tool**: Loom or similar screen recorder
- **Windows**: 
  1. Terminal (for pr-vibe commands)
  2. Claude Code chat (showing our conversation)
  3. VS Code (optional, for code viewing)
- **Duration**: 5-7 minutes max

## Demo Flow

### Part 1: The Problem (1 minute)
**Andrew (voice-over)**: "So I'm looking at PR #20 with 19 CodeRabbit comments. Again. Same feedback about console.log in Lambda functions..."

**Show**: Terminal with PR comments scrolling by

**Andrew**: "This is when I turned to Claude Code and asked..."

**Show**: Claude Code chat
```
Andrew: "Hey Claude, I'm tired of explaining the same things to CodeRabbit over and over. Want to build something together to fix this?"

Claude: "I feel that frustration! I deal with CodeRabbit comments all day too. Let's build something that lets AI tools vibe together instead of creating repetitive work. What if we called it pr-vibe? 🎵"
```

### Part 2: Building Together (2 minutes)
**Show split screen**: Claude Code chat + Terminal

**Andrew**: "Watch how we actually built this together..."

**Demo sequence**:
1. Claude suggests the architecture
2. Andrew provides real PR examples
3. Claude writes the pattern detection
4. Andrew tests it live
5. Claude refines based on feedback

**Key moment to show**:
```
Claude: "I think we should use purple gradients for the landing page - it represents AI harmony"
Andrew: "Really? You have design opinions?"
Claude: "Strong ones. And the music emoji is non-negotiable 🎵"
```

### Part 3: pr-vibe in Action (2 minutes)
**Switch to full terminal**

```bash
# Install pr-vibe
npm install -g pr-vibe

# Run on the demo PR
pr-vibe pr 42
```

**Show pr-vibe**:
- Analyzing comments
- Learning patterns
- Making intelligent decisions
- Auto-fixing real issues
- Explaining valid patterns

**Andrew**: "Notice how it knows console.log is valid in Lambda functions? That's because Claude understood the context from building similar systems."

### Part 4: The Feedback Loop (1 minute)
**Show the pattern file**:

```bash
cat .pr-bot/patterns.yml
```

**Andrew**: "Here's the magic - pr-vibe learns from every decision. When I work with Claude Code on new features, those patterns get incorporated. It's a continuous improvement loop between human creativity and AI capability."

### Part 5: The Bigger Picture (1 minute)
**Back to Claude Code chat**

**Show recent conversation**:
```
Andrew: "The tool is working great, but users want human review support too"
Claude: "Let's add pattern learning from team feedback. I'll implement a confidence scoring system..."
[Shows actual implementation discussion]
```

**Andrew**: "This is the future - not AI replacing developers, but AI and developers building better tools together. pr-vibe is proof that AI can build tools for AI problems, and do it better because they understand the frustration."

## Key Messages to Emphasize

1. **Real collaboration**: Show actual chat history, not staged demos
2. **AI agency**: Claude made real decisions (name, design, emoji)
3. **Continuous improvement**: Tool gets better as we work together
4. **Practical results**: 18 minutes → 1 minute per PR
5. **Open source**: Anyone can contribute, even with their AI assistant

## Technical Details to Show

- Pattern learning system
- Confidence scoring
- Human review integration
- The actual code Claude wrote

## Ending
**Andrew**: "pr-vibe started as a conversation between me and Claude about a shared frustration. 48 hours later, we'd built, tested, and shipped it. If you're tired of repetitive bot feedback, try pr-vibe. And if you work with AI tools, maybe let them help build the solution."

**Show**: 
```bash
# Get started
npm install -g pr-vibe
pr-vibe init

# Join the vibe
https://github.com/stroupaloop/pr-vibe
```

## Recording Tips

1. **Keep it real**: Show actual conversations and code
2. **Show mistakes**: Include moments where things didn't work
3. **Highlight collaboration**: This isn't about AI doing everything
4. **Be specific**: Show real PR numbers, real time savings
5. **Stay humble**: This is an experiment that worked

## Alternative: Terminal-Only Demo

If you prefer terminal-only recording:
1. Use `asciinema` for high-quality terminal recording
2. Add commentary with text overlays
3. Show pr-vibe execution with real data
4. Include ASCII art showing the collaboration aspect

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Developer (Andrew)    │────▶│   AI (Claude Code)      │
│ "I'm tired of this..."  │     │ "Let's build pr-vibe!"  │
└─────────────────────────┘     └─────────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                           │
                     ┌─────▼─────┐
                     │  pr-vibe  │
                     │    🎵     │
                     └───────────┘
```