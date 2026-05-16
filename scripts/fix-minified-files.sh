#!/bin/bash
# Fix Minified Files Script
# Identifies and restores minified source files from git history

set -e

echo "🔍 Scanning for minified files..."
echo ""

# Find minified files (files with < 25 lines but > 3000 chars)
MINIFIED_FILES=()

while IFS= read -r -d '' file; do
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    size=$(wc -c < "$file" 2>/dev/null || echo "0")
    
    if [ "$lines" -lt 25 ] && [ "$size" -gt 3000 ]; then
        # Check for minified patterns
        if grep -q '} from"' "$file" 2>/dev/null || [ "$lines" -lt 20 ]; then
            MINIFIED_FILES+=("$file")
        fi
    fi
done < <(find client/modules -name "*.tsx" -type f -print0 2>/dev/null)

if [ ${#MINIFIED_FILES[@]} -eq 0 ]; then
    echo "✅ No minified files found!"
    exit 0
fi

echo "Found ${#MINIFIED_FILES[@]} minified files:"
echo ""

for file in "${MINIFIED_FILES[@]}"; do
    lines=$(wc -l < "$file")
    size=$(wc -c < "$file")
    echo "  $file: $lines lines, $size chars"
done

echo ""
echo "🔧 Attempting to restore files from git history..."
echo ""

RESTORED=0
FAILED=0

for file in "${MINIFIED_FILES[@]}"; do
    # Try to restore from git HEAD first
    if git cat-file -e "HEAD:$file" 2>/dev/null; then
        GIT_CONTENT=$(git show "HEAD:$file" 2>/dev/null)
        GIT_LINES=$(echo "$GIT_CONTENT" | wc -l)
        
        if [ "$GIT_LINES" -gt 25 ]; then
            echo "$GIT_CONTENT" > "$file"
            echo "  ✅ Restored from HEAD: $file"
            RESTORED=$((RESTORED + 1))
            continue
        fi
    fi
    
    # Try to find last commit where file was modified
    LAST_COMMIT=$(git log --format="%H" -1 -- "$file" 2>/dev/null | head -1)
    
    if [ -n "$LAST_COMMIT" ]; then
        GIT_CONTENT=$(git show "$LAST_COMMIT:$file" 2>/dev/null)
        GIT_LINES=$(echo "$GIT_CONTENT" | wc -l)
        
        if [ "$GIT_LINES" -gt 25 ]; then
            echo "$GIT_CONTENT" > "$file"
            echo "  ✅ Restored from commit ${LAST_COMMIT:0:8}: $file"
            RESTORED=$((RESTORED + 1))
            continue
        fi
    fi
    
    echo "  ⚠️  Could not restore from git: $file"
    FAILED=$((FAILED + 1))
done

echo ""
echo "📊 Summary:"
echo "  ✅ Restored: $RESTORED"
echo "  ❌ Failed: $FAILED"
echo "  📁 Total: ${#MINIFIED_FILES[@]}"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "⚠️  $FAILED files could not be automatically restored."
    echo "   These files may need manual restoration or formatting."
fi

if [ $RESTORED -gt 0 ]; then
    echo ""
    echo "✅ Successfully restored $RESTORED files from git history!"
    echo "   Please review the changes and test the build."
fi
