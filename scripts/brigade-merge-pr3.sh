#!/bin/bash
# ============================================================================
# brigade-merge-pr3.sh
# ============================================================================
# Merges feature/ticket-001-foundation-tests into main from the command line.
# Bypasses GitHub's PR UI to avoid Close vs Merge button confusion.
#
# Usage:
#   bash scripts/brigade-merge-pr3.sh
#
# What this does:
#   1. Verifies repo location and current state
#   2. Switches to main and pulls latest
#   3. Merges feature/ticket-001-foundation-tests with --no-ff (preserves
#      branch history so the merge looks like a PR merge)
#   4. Pushes merged main to origin
#   5. Verifies the merge landed and shows recent commits
#
# What this does NOT do:
#   - Touch the GitHub PR page directly. PR #3 stays "Closed with unmerged
#     commits" but that's cosmetic — the actual code lands on main.
#   - Delete the feature branch (you can do that after, optional)
# ============================================================================

set -e  # halt on any error

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
FEATURE_BRANCH="feature/ticket-001-foundation-tests"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE MERGE — landing PR #3 work to main"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

cd "$REPO_PATH"

# --- Step 1: Verify we're in the right place ---
echo "→ Step 1 of 5: Verifying repo and state"
echo "  At: $(pwd)"

# Make sure feature branch exists locally and is up to date with origin
git fetch origin --quiet
if ! git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
  echo ""
  echo "  ✗ HALT: local branch '$FEATURE_BRANCH' does not exist."
  echo "  Cannot proceed."
  exit 1
fi
echo "  Feature branch exists locally ✓"
echo ""

# --- Step 2: Switch to main and pull latest ---
echo "→ Step 2 of 5: Switching to main, pulling latest from origin"
git checkout main
git pull origin main
echo ""

# --- Step 3: Merge the feature branch with --no-ff ---
echo "→ Step 3 of 5: Merging $FEATURE_BRANCH into main"
echo "  Using --no-ff so the merge is recorded as a merge commit"
echo "  (preserves branch history same as a GitHub PR merge would)"
echo ""

git merge --no-ff "$FEATURE_BRANCH" -m "Merge branch '$FEATURE_BRANCH' into main

Lands TICKET_001 foundation migrations test layer:
- 35 static tests passing in 9ms
- 9 DB-integration tests as it.todo gated on DATABASE_URL_TEST
- HANDOFF_OVERNIGHT.md with three blockers + two editorial decisions

CI was failing systemically (pre-existing issue unrelated to this branch).
Merge performed via command line after PR #3 was inadvertently closed
without merging in the GitHub UI."

echo "  Merge committed locally ✓"
echo ""

# --- Step 4: Push merged main to origin ---
echo "→ Step 4 of 5: Pushing merged main to origin"
git push origin main
echo "  Pushed to origin ✓"
echo ""

# --- Step 5: Verify ---
echo "→ Step 5 of 5: Verifying the merge landed"
echo ""
echo "  Recent commits on main:"
git log --oneline -5
echo ""

# Spot-check that the test file is now on main
if [ -f "tests/echo_resonance/migrations/foundation-migrations.test.ts" ]; then
  echo "  ✓ tests/echo_resonance/migrations/foundation-migrations.test.ts is on main"
else
  echo "  ✗ Test file not found on main — investigate"
fi

if [ -f "HANDOFF_OVERNIGHT.md" ]; then
  echo "  ✓ HANDOFF_OVERNIGHT.md is on main"
else
  echo "  ✗ Handoff file not found on main — investigate"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  MERGE COMPLETE. Main contains TICKET_001 foundation tests."
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Optional cleanup — delete the now-merged feature branch:"
echo ""
echo "    git branch -d $FEATURE_BRANCH"
echo "    git push origin --delete $FEATURE_BRANCH"
echo ""
echo "  (Skip if you want to keep the branch for reference.)"
echo ""
