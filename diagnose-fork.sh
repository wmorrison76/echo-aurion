#!/bin/bash
echo "=== DIAGNOSING conflict_040526_1458 ==="
echo ""

echo "--- Merge base with main (the common ancestor commit) ---"
MERGE_BASE=$(git merge-base origin/main origin/conflict_040526_1458 2>/dev/null)
if [ -z "$MERGE_BASE" ]; then
  echo "NO COMMON ANCESTOR FOUND - this branch is a completely separate history"
else
  echo "Common ancestor: $MERGE_BASE"
  echo "Date of common ancestor:"
  git log -1 --format='%ai %s' $MERGE_BASE
fi
echo ""

echo "--- Commits on conflict_040526_1458 NOT on main (count) ---"
git rev-list --count origin/main..origin/conflict_040526_1458
echo ""

echo "--- Commits on main NOT on conflict_040526_1458 (count) ---"
git rev-list --count origin/conflict_040526_1458..origin/main
echo ""

echo "--- First 5 commits unique to conflict_040526_1458 (oldest) ---"
git log origin/main..origin/conflict_040526_1458 --oneline --reverse | head -5
echo ""

echo "--- Last 5 commits unique to conflict_040526_1458 (newest) ---"
git log origin/main..origin/conflict_040526_1458 --oneline | head -5
echo ""

echo "--- Author breakdown of unique commits ---"
git log origin/main..origin/conflict_040526_1458 --format='%an' | sort | uniq -c | sort -rn
echo ""

echo "--- Top-level files/dirs that differ between main and conflict_040526_1458 ---"
git diff --name-only origin/main origin/conflict_040526_1458 | awk -F/ '{print $1}' | sort -u | head -30
echo ""

echo "--- Total files different between the two ---"
git diff --name-only origin/main origin/conflict_040526_1458 | wc -l
echo ""

echo "=== DONE ==="
