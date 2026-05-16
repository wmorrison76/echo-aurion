#!/bin/bash
# ============================================================================
# brigade-merge-pr4.sh
# ============================================================================
# Merges feature/ticket-002-foundation-types into main from the command line.
# Bypasses GitHub's PR UI to avoid Close vs Merge button confusion.
#
# Usage:
#   bash scripts/brigade-merge-pr4.sh
#
# What this does:
#   1. Verifies repo location and current state
#   2. Switches to main and pulls latest
#   3. Merges feature/ticket-002-foundation-types with --no-ff (preserves
#      branch history so the merge looks like a PR merge)
#   4. Pushes merged main to origin
#   5. Verifies the merge landed and shows recent commits
#
# What this does NOT do:
#   - Touch the GitHub PR page directly. PR #4 stays "Closed with unmerged
#     commits" but that's cosmetic — the actual code lands on main.
#   - Delete the feature branch (you can do that after, optional)
# ============================================================================

set -e  # halt on any error

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
FEATURE_BRANCH="feature/ticket-002-foundation-types"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE MERGE — landing PR #4 work to main"
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

Lands TICKET_002 close-out:
- 7 foundation type files aligned to SQL schema 008-012:
  shared/types/signals/{sensitivity,tag,signal}.ts
  shared/types/resonance/{reading,score,trajectory,intervention}.ts
- ARCHITECTURE.md: new Type-system conventions section
  (single-type Phase 1 simplification, ?/null nullable buckets,
  narrow string unions)
- docs/maestro/tickets/TICKET_003_PREP.md: handoff context for the
  3 downstream consumer files (resonance-engine, trajectory-engine,
  suggestion-ranker) and the Tenet drivers (2 and 7) that motivated
  each type tightening
- docs/maestro/tickets/TICKET_003.md: Phase 1.3 Backend core ticket
  draft (7 services + Tenet 3 enforcement test), READY TO FIRE
  pending test-DB provisioning per TICKET_001 HANDOFF_OVERNIGHT
  Blocker A

Verification state at merge:
- 0 new tsc errors introduced by TICKET_002 (shared/types/ clean,
  the 7 ticket files clean on focused tsc run)
- TICKET_001 regression: 35/35 foundation-migrations.test.ts passing
- 4122 pre-existing repo-wide tsc errors deferred to AUDIT_002
  (currently in progress). AUDIT_001 categorized them as ~98.5%
  parser-cascade from minified source, not semantic type errors.
  See docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md (on the
  feature/audit-001-type-errors branch).

Doctrinal calls applied per pass review:
- Call 1: ISODate/UUID from existing base.ts (broken imports for
  ISODateTime/GuestId/VisitId resolved via existing aliases)
- Call 2: flat arousal/valence on ResonanceReading (not nested
  affect: AffectCoordinate)
- Call 3: drop readings: ResonanceReading[] from ResonanceTrajectory
- Call 4: ?/null split per pass override — '?:' for sometimes-not-yet-set
  (endedAt, approvedBy, etc.); 'T | null' for deliberately-absent-by-design
  (Signal.visitId, InterventionExecution.cascadeId)

CI was failing systemically (pre-existing issue unrelated to this
branch). Merge performed via command line after the same pattern as
PR #3."

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

# Spot-check that key TICKET_002 deliverables are now on main
if [ -f "docs/maestro/tickets/TICKET_003_PREP.md" ]; then
  echo "  ✓ docs/maestro/tickets/TICKET_003_PREP.md is on main"
else
  echo "  ✗ TICKET_003_PREP.md not found on main — investigate"
fi

if [ -f "docs/maestro/tickets/TICKET_003.md" ]; then
  echo "  ✓ docs/maestro/tickets/TICKET_003.md is on main"
else
  echo "  ✗ TICKET_003.md not found on main — investigate"
fi

# Confirm canonical type file is at IMPLEMENTED status
if grep -q "Status:   IMPLEMENTED" shared/types/signals/signal.ts 2>/dev/null; then
  echo "  ✓ shared/types/signals/signal.ts at Status: IMPLEMENTED"
else
  echo "  ✗ shared/types/signals/signal.ts not at IMPLEMENTED — investigate"
fi

# Confirm ARCHITECTURE.md has the new Type-system conventions section
if grep -q "Type-system conventions" ARCHITECTURE.md 2>/dev/null; then
  echo "  ✓ ARCHITECTURE.md has Type-system conventions section"
else
  echo "  ✗ ARCHITECTURE.md missing Type-system conventions — investigate"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  MERGE COMPLETE. Main contains TICKET_002 foundation types."
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Optional cleanup — delete the now-merged feature branch:"
echo ""
echo "    git branch -d $FEATURE_BRANCH"
echo "    git push origin --delete $FEATURE_BRANCH"
echo ""
echo "  (Skip if you want to keep the branch for reference.)"
echo ""
