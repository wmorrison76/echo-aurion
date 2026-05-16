#!/bin/bash
# Module Cleanup Script Template
# Copy this template and rename it to [MODULE_NAME]_CLEANUP.sh
# Run: bash scripts/module-cleanup-templates/[MODULE_NAME]_CLEANUP.sh

set -e

MODULE_NAME="${1:-YOUR_MODULE_NAME}"
MODULE_PATH="client/modules/$MODULE_NAME"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧹 $MODULE_NAME Module Cleanup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if module directory exists
if [ ! -d "$MODULE_PATH" ]; then
  echo -e "${RED}❌ Module directory not found: $MODULE_PATH${NC}"
  exit 1
fi

echo "📂 Module path: $MODULE_PATH"
echo ""

# Count files before cleanup
BEFORE=$(find "$MODULE_PATH" -type f | wc -l)
BEFORE_SIZE=$(du -sh "$MODULE_PATH" | cut -f1)

echo "📊 Before cleanup:"
echo "   Files: $BEFORE"
echo "   Size:  $BEFORE_SIZE"
echo ""

# Step 1: Remove nested node_modules
if [ -d "$MODULE_PATH/node_modules" ]; then
  echo "🗑️  Removing nested node_modules..."
  rm -rf "$MODULE_PATH/node_modules"
  echo -e "${GREEN}   ✓ Removed${NC}"
fi

# Step 2: Remove build artifacts
BUILD_DIRS=("dist" "build" ".next" "out" "coverage" ".cache" ".vite" ".parcel")
for dir in "${BUILD_DIRS[@]}"; do
  if [ -d "$MODULE_PATH/$dir" ]; then
    echo "🗑️  Removing $dir directory..."
    rm -rf "$MODULE_PATH/$dir"
    echo -e "${GREEN}   ✓ Removed${NC}"
  fi
done

# Step 3: Remove large archives
echo "🗑️  Removing archive files..."
find "$MODULE_PATH" -maxdepth 1 \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tar.bz2" -o -name "*.rar" \) -delete
echo -e "${GREEN}   ✓ Removed (if any found)${NC}"

# Step 4: Remove duplicate lock files
LOCK_FILES=("pnpm-lock.yaml" "yarn.lock" "package-lock.json")
for lockfile in "${LOCK_FILES[@]}"; do
  if [ -f "$MODULE_PATH/$lockfile" ]; then
    echo "🗑️  Removing duplicate lock file: $lockfile..."
    rm "$MODULE_PATH/$lockfile"
    echo -e "${GREEN}   ✓ Removed${NC}"
  fi
done

echo ""

# Count files after cleanup
AFTER=$(find "$MODULE_PATH" -type f | wc -l)
AFTER_SIZE=$(du -sh "$MODULE_PATH" | cut -f1)
FILES_REMOVED=$((BEFORE - AFTER))

echo "📊 After cleanup:"
echo "   Files: $AFTER"
echo "   Size:  $AFTER_SIZE"
echo ""
echo -e "${GREEN}✅ Cleaned up $FILES_REMOVED files${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✨ Cleanup complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Run:  pnpm validate:modules"
echo "  2. Check that $MODULE_NAME shows as 'healthy'"
echo "  3. Run:  pnpm dev:safe"
echo "  4. Test that the module loads correctly"
echo ""
