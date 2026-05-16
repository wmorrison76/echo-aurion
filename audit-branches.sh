#!/bin/bash
echo "=== REPO STATE ==="
echo "Current branch: $(git branch --show-current)"
echo "Total branches: $(git branch -a | wc -l | tr -d ' ')"
echo "Total commits on main: $(git rev-list --count main 2>/dev/null || echo 'main not found')"
echo ""

echo "=== FETCHING LATEST FROM GITHUB ==="
git fetch --all --prune
echo ""

echo "=== BRANCHES ALREADY MERGED INTO MAIN (safe to delete) ==="
git branch -r --merged origin/main | grep -v 'origin/main$' | grep -v 'HEAD' | sort
echo ""

echo "=== BRANCHES NOT YET MERGED INTO MAIN (need review) ==="
git branch -r --no-merged origin/main | grep -v 'HEAD' | sort
echo ""

echo "=== EMERGENT CONFLICT BRANCHES ==="
git branch -r | grep -i 'conflict' | sort
echo ""

echo "=== UNIQUE COMMITS ON EACH CONFLICT BRANCH (vs main) ==="
for branch in $(git branch -r | grep -i 'conflict' | tr -d ' '); do
  count=$(git rev-list --count origin/main..$branch 2>/dev/null)
  last_date=$(git log -1 --format='%ai' $branch 2>/dev/null)
  echo "$branch | $count unique commits | last commit: $last_date"
done
echo ""

echo "=== CLAUDE FEATURE BRANCHES ==="
git branch -r | grep -i 'claude/' | sort
echo ""

echo "=== STALE BRANCHES (no activity in 30+ days) ==="
for branch in $(git branch -r | grep -v 'HEAD' | tr -d ' '); do
  last_commit=$(git log -1 --format='%ct' $branch 2>/dev/null)
  if [ -n "$last_commit" ]; then
    age_days=$(( ( $(date +%s) - $last_commit ) / 86400 ))
    if [ $age_days -gt 30 ]; then
      echo "$branch | $age_days days old"
    fi
  fi
done

echo ""
echo "=== DONE - No changes made ==="
