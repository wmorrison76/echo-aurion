#!/bin/bash
# ============================================================================
# brigade-post-merge.sh
# ============================================================================
# After GitHub has merged the PR, this brings your local main up to date
# and verifies the scaffolding landed correctly.
#
# Usage:
#   bash brigade-post-merge.sh
#
# What this does:
#   1. Checks out main locally
#   2. Pulls the merged result from GitHub
#   3. Verifies key scaffolding files are present on main
#   4. Optionally deletes the feature branch (with confirmation)
# ============================================================================

set -e

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
FEATURE_BRANCH="feature/echo-resonance-scaffold"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE POST-MERGE — pulling the night's work back to main"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

cd "$REPO_PATH"

# --- Step 1: Switch to main ---
echo "→ Step 1 of 4: Switching to main"
git checkout main
echo ""

# --- Step 2: Pull the merged result ---
echo "→ Step 2 of 4: Pulling merged main from origin"
git pull origin main
echo ""

# --- Step 3: Verify the scaffolding made it ---
echo "→ Step 3 of 4: Verifying scaffolding landed on main"
echo ""

KEY_FILES=(
  "CLAUDE.md"
  "PRIVACY_TENETS.md"
  "docs/maestro/DEDICATION.md"
  "docs/maestro/THE_LINE.md"
  "docs/maestro/THE_PASS.md"
  "docs/maestro/STATIONS/SAUCIER.md"
  "docs/maestro/tickets/TICKET_001.md"
  "shared/types/resonance/score.ts"
  "migrations/echo_resonance/0001_resonance_readings.sql"
)

ALL_PRESENT=true
for f in "${KEY_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ MISSING: $f"
    ALL_PRESENT=false
  fi
done

echo ""

if [ "$ALL_PRESENT" = false ]; then
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  ✗ HALT: not all expected files are present on main."
  echo "  The merge may have been incomplete. Investigate before continuing."
  echo "═══════════════════════════════════════════════════════════════════"
  exit 1
fi

echo "  All key scaffolding files present on main ✓"
echo ""

# --- Step 4: Recent commit log ---
echo "→ Step 4 of 4: Recent commit history on main"
echo ""
git log --oneline -10
echo ""

# --- Optional: branch cleanup ---
echo "═══════════════════════════════════════════════════════════════════"
echo "  OPTIONAL — feature branch cleanup"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  The feature branch '$FEATURE_BRANCH' is still present locally"
echo "  and on origin. Its job is done. You can delete it."
echo ""
echo "  To delete the local branch:"
echo "      git branch -d $FEATURE_BRANCH"
echo ""
echo "  To delete the remote branch:"
echo "      git push origin --delete $FEATURE_BRANCH"
echo ""
echo "  (Skip this step if you want to keep the branch around for reference.)"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "  MERGE COMPLETE. Main contains the scaffolding."
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Next: restart Claude Code from the repo root and dispatch the saucier."
echo "  See docs/maestro/tickets/TICKET_001.md for the first ticket."
echo ""
