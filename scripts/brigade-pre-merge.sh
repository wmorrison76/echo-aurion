#!/bin/bash
# ============================================================================
# brigade-pre-merge.sh
# ============================================================================
# Verifies the feature branch is fully synced and ready for GitHub PR review.
# Opens GitHub's Compare & pull request page in your browser.
#
# Usage:
#   bash brigade-pre-merge.sh
#
# What this does:
#   1. Confirms we are in the right repo
#   2. Confirms we are on feature/echo-resonance-scaffold
#   3. Confirms working tree is clean (no uncommitted changes)
#   4. Pushes any unpushed commits up to origin
#   5. Opens GitHub's Compare page in your browser
#
# What this does NOT do:
#   - Merge anything. The merge happens in GitHub's UI.
#   - Touch main. Main stays untouched until you click "Merge" on GitHub.
# ============================================================================

set -e  # halt on any error

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
EXPECTED_BRANCH="feature/echo-resonance-scaffold"
GITHUB_REPO="wmorrison76/Echo_Aurion-LUCCCA_Framework"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE PRE-MERGE — preparing the plate for the pass"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# --- Step 1: Repo location ---
echo "→ Step 1 of 5: Confirming repo location"
cd "$REPO_PATH"
echo "  At: $(pwd)"
echo ""

# --- Step 2: Branch check ---
echo "→ Step 2 of 5: Confirming branch"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo ""
  echo "  ✗ HALT: expected branch '$EXPECTED_BRANCH', currently on '$CURRENT_BRANCH'"
  echo "  Run: git checkout $EXPECTED_BRANCH"
  echo "  Then re-run this script."
  exit 1
fi
echo "  On branch: $CURRENT_BRANCH ✓"
echo ""

# --- Step 3: Working tree check ---
echo "→ Step 3 of 5: Confirming working tree is clean"
if [ -n "$(git status --porcelain)" ]; then
  echo ""
  echo "  ✗ HALT: working tree has uncommitted changes."
  echo "  Run 'git status' to see what's pending."
  echo "  Either commit or stash the changes, then re-run this script."
  exit 1
fi
echo "  Working tree clean ✓"
echo ""

# --- Step 4: Push any unpushed commits ---
echo "→ Step 4 of 5: Pushing branch to origin (if anything unpushed)"
git push origin "$EXPECTED_BRANCH"
echo "  Branch is in sync with origin ✓"
echo ""

# --- Step 5: Open GitHub Compare page ---
echo "→ Step 5 of 5: Opening GitHub Compare & pull request page"
COMPARE_URL="https://github.com/${GITHUB_REPO}/compare/main...${EXPECTED_BRANCH}?expand=1"
echo "  URL: $COMPARE_URL"
echo ""

# Try to open in default browser
if command -v open >/dev/null 2>&1; then
  open "$COMPARE_URL"
  echo "  Browser opening..."
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$COMPARE_URL"
  echo "  Browser opening..."
else
  echo "  Copy the URL above into your browser manually."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  PASS-OFF TO GITHUB"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  In your browser:"
echo ""
echo "  1. Add a title:"
echo "       feat: Echo Resonance scaffolding + brigade methodology + BMB"
echo ""
echo "  2. Paste the description (use the one from THE_PASS or write your own)"
echo ""
echo "  3. Click  →  Create pull request"
echo ""
echo "  4. On the next page, scroll down and click  →  Merge pull request"
echo ""
echo "  5. Click  →  Confirm merge"
echo ""
echo "  6. Optionally  →  Delete branch"
echo ""
echo "  Then come back here and run:  bash brigade-post-merge.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""
