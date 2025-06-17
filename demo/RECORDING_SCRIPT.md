# Demo Recording Script 🎬

## Setup (Before Recording)
1. Run `./create-demo-repo.sh` to create the demo repository
2. Create a dummy GitHub repo and push the demo code
3. Open a PR from `feature/add-metrics` to `main`
4. Wait for CodeRabbit to comment (or simulate with mock comments)

## Recording Flow (3-4 minutes max)

### Scene 1: The Problem (30 seconds)
```bash
# Show terminal with PR comments
gh pr view 42 --comments

# Scroll through showing multiple bot comments
# "Look at all these comments... console.log in Lambda, hardcoded keys, var instead of const..."
# "I've explained these patterns so many times..."
```

### Scene 2: Enter pr-vibe (30 seconds)
```bash
# Install pr-vibe (if not already)
npm install -g pr-vibe

# Check version to show it's real
pr-vibe --version
# "Let's see how pr-vibe handles this..."
```

### Scene 3: The Magic (90 seconds)
```bash
# Run pr-vibe on the PR
pr-vibe pr 42

# As it processes each comment:
# 1. "console.log in Lambda" → AUTO_FIX: "Actually, we need this for CloudWatch"
# 2. "hardcoded API key" → AUTO_FIX: Moves to env variable
# 3. "use === instead of ==" → AUTO_FIX: Applied
# 4. "var instead of const" → REJECT: "Legacy compatibility required"
# 5. "TODO comment" → DEFER: "Tracked in issue #123"

# Show the intelligent decisions being made
```

### Scene 4: The Result (60 seconds)
```bash
# Show the summary
# "✅ Review complete!"
# "Fixed: 3, Explained: 2, Deferred: 1"
# "Time saved: ~18 minutes"

# Quick look at the automated fixes
git diff

# Show the PR with bot comments now handled
gh pr view 42 --comments
# "All bot feedback handled intelligently!"
```

### Scene 5: The Vibe (30 seconds)
```bash
# Show pattern learning
cat .pr-bot/patterns.yml

# "pr-vibe learned our patterns!"
# "Next time, it'll handle these automatically"
# "Built BY an AI that gets the AI frustration"

# End with:
pr-vibe --help
# "Get started in 60 seconds: npm install -g pr-vibe"
```

## Voice-over Key Points
- Start with frustration: "Every PR, same comments..."
- Emphasize intelligence: "It knows Lambda needs console.log"
- Show time saved: "From 18 minutes to 1"
- End with invitation: "Try it on your next PR"

## Visual Notes
- Use a clean terminal (maybe Warp or iTerm2)
- Have VS Code open showing the PR diff
- Keep energy upbeat but not hyperactive
- Let the tool's intelligence speak for itself