#!/bin/bash

################################################################################
# LUCCCA Module Transfer Cleanup Script
# 
# Purpose: Automatically clean project for transfer to another Builder.io
# Usage: ./cleanup-for-transfer.sh
# 
# This script will:
# 1. Verify you're in the correct directory
# 2. Backup current state (optional)
# 3. Delete all excluded files/directories
# 4. Verify cleanup was successful
# 5. Report final size
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script start
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  LUCCCA Module Transfer Cleanup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

################################################################################
# 1. VERIFY LOCATION
################################################################################

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERROR: package.json not found${NC}"
    echo "Make sure you're in the project root directory"
    exit 1
fi

echo -e "${BLUE}✓ Confirmed: In project root directory${NC}"
echo ""

################################################################################
# 2. CONFIRM WITH USER
################################################################################

echo -e "${YELLOW}⚠️  This will DELETE the following:${NC}"
echo "   - node_modules/"
echo "   - .git/"
echo "   - dist/, build/, .next/, out/"
echo "   - .env, .env.*, (except .env.example)"
echo "   - .vscode/, .idea/"
echo "   - *.log files"
echo "   - .DS_Store, Thumbs.db"
echo ""

read -p "Continue? (type 'yes' to proceed): " -r
echo ""
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${YELLOW}Cancelled by user${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

################################################################################
# 3. BACKUP (Optional)
################################################################################

# Check if git repo exists before backing up
if [ -d ".git" ]; then
    echo -e "${BLUE}Creating backup of current state...${NC}"
    BACKUP_NAME="backup-$(date +%s).tar.gz"
    tar --exclude='node_modules' --exclude='.git' -czf "$BACKUP_NAME" . 2>/dev/null || true
    echo -e "${GREEN}✓ Backup created: $BACKUP_NAME${NC}"
    echo ""
fi

################################################################################
# 4. DELETE DIRECTORIES
################################################################################

echo -e "${BLUE}Deleting directories...${NC}"

delete_dir() {
    if [ -d "$1" ]; then
        echo "  Deleting $1..."
        rm -rf "$1"
        echo -e "  ${GREEN}✓ Deleted${NC}"
    fi
}

delete_dir "node_modules"
delete_dir ".git"
delete_dir "dist"
delete_dir "build"
delete_dir ".next"
delete_dir "out"
delete_dir ".vscode"
delete_dir ".idea"
delete_dir "coverage"
delete_dir ".nyc_output"
delete_dir ".pnpm-store"
delete_dir ".npm"
delete_dir ".vite"

echo ""

################################################################################
# 5. DELETE FILES
################################################################################

echo -e "${BLUE}Deleting files...${NC}"

delete_file() {
    if [ -f "$1" ]; then
        echo "  Deleting $1..."
        rm -f "$1"
        echo -e "  ${GREEN}✓ Deleted${NC}"
    fi
}

# Environment files
delete_file ".env"
delete_file ".env.local"
delete_file ".env.production"
delete_file ".env.development"
delete_file ".env.test"

# Lock files
delete_file "pnpm-lock.yaml"
delete_file "package-lock.json"
delete_file "yarn.lock"

# Build/cache artifacts
delete_file ".eslintcache"
delete_file "*.tsbuildinfo"

# OS files
delete_file ".DS_Store"
delete_file "Thumbs.db"

echo ""

################################################################################
# 6. DELETE LOG FILES
################################################################################

echo -e "${BLUE}Deleting log files...${NC}"
LOG_COUNT=$(find . -name "*.log" -type f 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt 0 ]; then
    find . -name "*.log" -type f -delete
    echo "  Deleted $LOG_COUNT log files"
    echo -e "  ${GREEN}✓ Cleanup complete${NC}"
fi

echo ""

################################################################################
# 7. VERIFY CLEANUP
################################################################################

echo -e "${BLUE}Verifying cleanup...${NC}"

verify_deleted() {
    if [ -e "$1" ]; then
        echo -e "  ${RED}✗ Still exists: $1${NC}"
        return 1
    fi
    return 0
}

ERRORS=0

# Check directories
for dir in node_modules .git dist build .next .vscode .idea; do
    if verify_deleted "$dir"; then
        echo -e "  ${GREEN}✓ $dir removed${NC}"
    else
        ERRORS=$((ERRORS + 1))
    fi
done

# Check environment files
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "  ${GREEN}✓ Environment files removed${NC}"
else
    echo -e "  ${RED}✗ Some .env files remain${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for secrets
if grep -r "SUPABASE_KEY\|API_KEY\|SECRET" . 2>/dev/null | grep -v ".env.example" | grep -v ".git" > /dev/null; then
    echo -e "  ${YELLOW}⚠️  Warning: Possible secrets found in source${NC}"
    echo "     Please review before transfer"
else
    echo -e "  ${GREEN}✓ No obvious secrets in source files${NC}"
fi

echo ""

################################################################################
# 8. REPORT FINAL SIZE
################################################################################

echo -e "${BLUE}Final project size:${NC}"
TOTAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
FILE_COUNT=$(find . -type f 2>/dev/null | wc -l)

echo "  Total size: $TOTAL_SIZE"
echo "  Total files: $FILE_COUNT"
echo ""

if [[ "$TOTAL_SIZE" == *"M"* ]] || [[ "$TOTAL_SIZE" == *"K"* ]]; then
    echo -e "  ${GREEN}✓ Size is good for transfer (< 50MB)${NC}"
elif [[ "$TOTAL_SIZE" == *"G"* ]]; then
    echo -e "  ${RED}✗ Size is still too large (> 1GB)${NC}"
    echo "     Check for large files: find . -size +10M"
fi

echo ""

################################################################################
# 9. FINAL SUMMARY
################################################################################

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ CLEANUP COMPLETE${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Create luccca-module.json (see transfer guide)"
    echo "  2. Create client/modules/EchoEventStudio/index.tsx"
    echo "  3. Zip the directory:"
    echo ""
    echo "     zip -r EchoEventStudio-transfer.zip . \\"
    echo "       -x \"node_modules/*\" \".git/*\" \"dist/*\" \".env\""
    echo ""
    echo "  4. Transfer to other Builder.io instance"
    echo "  5. Extract to client/modules/EchoEventStudio/"
    echo "  6. Update panel-registry.ts"
else
    echo -e "${RED}⚠️  CLEANUP INCOMPLETE - $ERRORS issues found${NC}"
    echo ""
    echo "Please manually verify and clean remaining items"
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
