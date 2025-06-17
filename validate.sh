#!/bin/bash

echo "🎵 Validating pr-vibe setup..."
echo ""

# Check if all required files exist
echo "✓ Checking file structure..."
required_files=(
    "bin/cli.js"
    "lib/decision-engine.js"
    "lib/pattern-manager.js"
    "lib/llm-integration.js"
    "lib/comment-poster.js"
    "lib/file-modifier.js"
    "package.json"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ Missing: $file"
        exit 1
    fi
done

echo ""
echo "✓ Testing CLI..."
node bin/cli.js --version

echo ""
echo "✓ Package info:"
echo "  Name: $(node -p "require('./package.json').name")"
echo "  Version: $(node -p "require('./package.json').version")"
echo "  Bin: $(node -p "Object.keys(require('./package.json').bin).join(', ')")"

echo ""
echo "✓ Dependencies check..."
npm ls --depth=0 2>/dev/null | head -20

echo ""
echo "🎉 pr-vibe is ready to ship!"
echo ""
echo "Next steps:"
echo "1. cd ../pr-review-assistant"
echo "2. npm test"
echo "3. git add -A && git commit -m 'feat: renamed to pr-vibe and migrated code'"
echo "4. git push origin main"
echo "5. npm publish"