#!/bin/bash
# EchoCanva Modules - Cleanup Script for Export
# Run this BEFORE creating the download package for Echo Recipe Pro
# Usage: bash cleanup-for-export.sh

echo "🧹 Cleaning EchoCanva modules for export..."

# Remove from entire project (optional - only if doing full export)
echo "Removing unnecessary files..."

# Remove node_modules
rm -rf node_modules/
echo "✓ Removed node_modules/"

# Remove lock files
rm -f pnpm-lock.yaml package-lock.json yarn.lock
echo "✓ Removed lock files"

# Remove git metadata
rm -rf .git/
echo "✓ Removed .git/"

# Remove environment files
rm -f .env .env.local .env.*.local
echo "✓ Removed .env files"

# Remove build output
rm -rf dist/ build/ .next/
echo "✓ Removed build output"

# Remove IDE/editor config
rm -rf .vscode/ .idea/
echo "✓ Removed IDE configs"

# Remove OS metadata
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete
echo "✓ Removed OS metadata"

# Remove cache/temp
rm -rf .cache/ .turbo/ .eslintcache
echo "✓ Removed cache files"

# Remove test coverage
rm -rf coverage/
echo "✓ Removed coverage/"

# Remove log files
find . -name "*.log" -delete
echo "✓ Removed log files"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📦 Ready to download/zip. Include these files only:"
echo "   - client/modules/echo-canva-*/"
echo "   - QUICKSTART.md"
echo "   - INSTALL.md"
echo "   - ECHOCANVA_MODULES_SETUP_GUIDE.md"
echo "   - README_MODULES.md"
echo "   - package.json (for reference only)"
echo ""
echo "ℹ️  Do NOT include:"
echo "   - node_modules/"
echo "   - .git/"
echo "   - .env files"
echo "   - dist/ build/ .next/"
echo "   - Lock files"
echo "   - .vscode/ .idea/"
echo ""
