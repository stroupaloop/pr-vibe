# Loom Recording Checklist 🎬

## Pre-Recording Setup

### 1. Create Demo Repository
```bash
cd ~/Desktop  # Or your preferred location
./demo/setup-demo-github-repo.sh
# Note the PR number that's created
```

### 2. Add Mock Bot Comments
```bash
# Wait 30 seconds, then run:
./demo/create-mock-bot-comments.sh <owner/repo> <pr-number>
```

### 3. Window Setup
- **Main Window**: Terminal (full screen or large)
- **Optional**: VS Code with the demo repo open
- **Clean desktop**: Hide other apps

### 4. Terminal Preparation
```bash
# Clear terminal
clear

# Set nice prompt (optional)
export PS1="🎵 pr-vibe-demo $ "

# Increase font size for readability
# (Command+Plus a few times)

# Pre-type but don't run:
gh pr view <PR> --comments
```

## Recording Flow (5 minutes)

### Part 1: The Problem (45 seconds)
```bash
# Show the PR with all the bot comments
gh pr view <PR> --comments | less

# Scroll through showing repetitive feedback
# Voice: "Here we go again... CodeRabbit telling me to remove console.log from Lambda functions..."
```

### Part 2: Enter pr-vibe (30 seconds)
```bash
# Check if installed
pr-vibe --version

# If not installed (for demo effect):
npm install -g pr-vibe

# Voice: "I built pr-vibe with Claude Code to handle this automatically"
```

### Part 3: The Magic (2 minutes)
```bash
# Run pr-vibe
pr-vibe pr <PR> --repo <owner/repo>

# As it processes, explain:
# - "Notice it knows console.log is valid for CloudWatch"
# - "It's fixing the real issues like hardcoded keys"
# - "It understands our project context"
```

### Part 4: Show Results (1 minute)
```bash
# Show what changed
git diff

# Show learned patterns
cat .pr-bot/patterns.yml

# Voice: "pr-vibe learned our patterns and will handle these automatically next time"
```

### Part 5: The Collaboration Story (45 seconds)
```bash
# Show git log with Claude as co-author
git log --oneline -5

# Voice: "This tool was built WITH Claude Code, not just using it. 
#         Check the commits - Claude is listed as co-author because 
#         it contributed real code and design decisions."

# End with:
echo "Time saved: ~18 minutes"
echo "Get started: npm install -g pr-vibe"
```

## Voice-Over Key Points

1. **Opening**: "I'm Andrew, and I got tired of explaining the same things to CodeRabbit on every PR..."

2. **Problem**: "PR #20 had 19 bot comments. 18 minutes of my life explaining why we need console.log in Lambda functions."

3. **Solution**: "So I asked Claude Code: 'You deal with this too. Want to build something together?'"

4. **Demo**: "Watch how pr-vibe intelligently handles each comment based on context..."

5. **Results**: "From 18 minutes to 1 minute. And it gets smarter with each use."

6. **Philosophy**: "This is what happens when humans and AI build tools together - we solve real problems."

7. **Call to Action**: "Try pr-vibe on your next PR. Let the bots vibe together while you ship features."

## Post-Recording

1. **Edit in Loom**:
   - Trim any pauses
   - Add captions for commands
   - Include title/end cards

2. **Upload Settings**:
   - Title: "pr-vibe: When AI Tools Build Tools for AI Problems"
   - Description: Link to GitHub and npm
   - Thumbnail: Terminal with pr-vibe running

3. **Share**:
   - Embed in ProductHunt listing
   - Add to GitHub README
   - Share on social

## Tips

- **Energy**: Keep it upbeat but not hyperactive
- **Pace**: Don't rush through commands
- **Focus**: This is about human-AI collaboration, not just the tool
- **Authenticity**: Share the real frustration and real solution
- **Clarity**: Make sure terminal text is readable

## Emergency Commands

If something goes wrong:
```bash
# Clear and reset
clear
cd ~/Desktop/pr-vibe-demo-*

# If pr-vibe errors, explain:
echo "Even in demos, real tools have real behaviors!"

# Continue with:
pr-vibe --help
```