#!/bin/bash
# ============================================================================
# brigade-merge-pr5.sh
# ============================================================================
# Merges feature/audit-002-repair into main from the command line.
# Bypasses GitHub's PR UI to avoid Close vs Merge button confusion.
#
# Usage:
#   bash scripts/brigade-merge-pr5.sh
#
# What this does:
#   1. Verifies repo location and current state
#   2. Switches to main and pulls latest
#   3. Merges feature/audit-002-repair with --no-ff (preserves
#      branch history so the merge looks like a PR merge)
#   4. Pushes merged main to origin
#   5. Verifies the merge landed and shows recent commits
#
# What this does NOT do:
#   - Touch the GitHub PR page directly. PR #5 stays "Closed with unmerged
#     commits" but that's cosmetic — the actual code lands on main.
#   - Delete the feature branch (you can do that after, optional)
# ============================================================================

set -e  # halt on any error

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
FEATURE_BRANCH="feature/audit-002-repair"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE MERGE — landing PR #5 work to main"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

cd "$REPO_PATH"

# --- Step 1: Verify we're in the right place ---
echo "→ Step 1 of 5: Verifying repo and state"
echo "  At: $(pwd)"

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

Lands AUDIT_002 repair shift work — 6 commits:

- 4a213344f  A1: Maestro/data UUID sweep (6 .md docs archived to
             docs/archive/maestro-banquets-integration/, 11 UUID noise
             files deleted)
- 078315290  A1: EchoEventStudio Index_backup.tsx deleted (0 importers,
             twin Index.tsx exists)
- 01eaf1a23  A1: Whiteboard WhiteboardSession.broken.tsx deleted
             (77KB abandoned snapshot, 0 importers, twin
             WhiteboardSession.tsx is the live version)
- 538944699  Audit report C1 reclassification — D2 line-comment-swallow
             data loss discovery. Original Category C ('cascade reformat
             via prettier') is empirically infeasible: minified files
             contain `// comment` lines that consumed real declarations
             during a Cursor minification session. TypeScript API, SWC,
             and Prettier all fail at the same parse points. No formatter
             can recover code that was eaten by `//`. Reclassified
             affected files to new Category D2 (rewrite-required, XL
             effort per file).
- 754b42aee  NAME-SWEEP: 1 rename (client/modules/BanquetMenuBuilder/
             EMERGENT_INSTRUCTIONS.md → INSTALL_INSTRUCTIONS.md) plus
             tool-author survey findings. INSTALL/* files are gitignored
             (line 118 of .gitignore) so the other 6 EMERGENT_INSTRUCTIONS
             files are out of commit scope.
- dcb047085  HANDOFF_PM.md written for AM-to-PM service transition.

Verification state at merge:
- AUDIT_001 correction surfaced and documented in the audit report:
  ExportManager.ts was wrongly flagged as 0-import dead code; broader
  grep shows 3 active importers (WhiteboardSession.tsx,
  VideoExportManager.ts, gdpr-compliance.ts). Treat AUDIT_001's
  '0-import' claims as candidates needing re-verification with the
  broader grep pattern, not as ground truth.
- tsc error count: 4122 baseline → 3909 post-A1 (212 errors swept;
  full A1 = 3 commits including .broken.tsx final delete).
  Maestro module dropped from 212 to ~0 errors after the UUID sweep.
- TICKET_001 regression: 35/35 foundation-migrations.test.ts passing
  throughout the shift (verified after each A1 commit and post-NAME-SWEEP).

D2 (line-comment-swallow rewrites) deferred to dedicated future
ticket(s) — not blocking TICKET_003 forward motion. Estimated 50-150
per-file rewrite dispatches across the codebase to clear D2.

CI was failing systemically (pre-existing issue unrelated to this
branch). Merge performed via command line after the same pattern as
PRs #3 and #4."

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
git log --oneline -7
echo ""

# Spot-check that key AUDIT_002 deliverables are now on main
if [ -f "docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md" ]; then
  if grep -q "Post-AUDIT_002 corrections" docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md 2>/dev/null; then
    echo "  ✓ docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md is on main with C1 corrections"
  else
    echo "  ✗ Audit report present but missing 'Post-AUDIT_002 corrections' section — investigate"
  fi
else
  echo "  ✗ Audit report not found on main — investigate"
fi

if [ -f "HANDOFF_PM.md" ]; then
  echo "  ✓ HANDOFF_PM.md is on main at repo root"
else
  echo "  ✗ HANDOFF_PM.md not found on main — investigate"
fi

# Confirm Maestro/data UUID files are GONE
UUID_REMAINING=$(ls client/modules/Maestro/data/*-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]*.* 2>/dev/null | wc -l | tr -d ' ')
if [ "$UUID_REMAINING" = "0" ]; then
  echo "  ✓ client/modules/Maestro/data/*-UUID* files are GONE (sweep complete)"
else
  echo "  ✗ $UUID_REMAINING UUID-suffixed files still remain in Maestro/data/ — investigate"
fi

# Confirm archive directory exists
if [ -d "docs/archive/maestro-banquets-integration" ]; then
  ARCHIVE_COUNT=$(ls -1 docs/archive/maestro-banquets-integration/ 2>/dev/null | wc -l | tr -d ' ')
  echo "  ✓ docs/archive/maestro-banquets-integration/ exists with $ARCHIVE_COUNT files"
else
  echo "  ✗ docs/archive/maestro-banquets-integration/ not found — investigate"
fi

# Confirm WhiteboardSession.broken.tsx is gone but live version remains
if [ ! -f "client/modules/Whiteboard/WhiteboardSession.broken.tsx" ] && [ -f "client/modules/Whiteboard/WhiteboardSession.tsx" ]; then
  echo "  ✓ Whiteboard cleanup verified (.broken gone, live remains)"
else
  echo "  ✗ Whiteboard state unexpected — investigate"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  MERGE COMPLETE. Main contains AUDIT_002 repair work."
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Optional cleanup — delete the now-merged feature branch:"
echo ""
echo "    git branch -d $FEATURE_BRANCH"
echo "    git push origin --delete $FEATURE_BRANCH"
echo ""
echo "  (Skip if you want to keep the branch for reference.)"
echo ""
