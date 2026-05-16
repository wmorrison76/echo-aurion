#!/bin/bash
BRANCHES=(
  claude/D10-D11-smoke-and-schedule-merge
  feature/audit-001-type-errors
  feature/doctrine-raw-notes
)
for b in "${BRANCHES[@]}"; do
  echo "================================================================"
  echo "=== $b ==="
  echo "================================================================"
  echo "--- Commit ---"
  git log origin/main..origin/$b --format='%h %an %ai%n  %s%n  %b'
  echo ""
  echo "--- Files touched (vs main) ---"
  git diff --name-only origin/main...origin/$b
  echo ""
  echo "--- For each file, does main have it? ---"
  for f in $(git diff --name-only origin/main...origin/$b); do
    if git ls-tree origin/main -- "$f" | grep -q .; then
      branch_lines=$(git show origin/$b:"$f" 2>/dev/null | wc -l)
      main_lines=$(git show origin/main:"$f" 2>/dev/null | wc -l)
      diff_size=$(git diff origin/main origin/$b -- "$f" | wc -l)
      echo "  ON_MAIN  $f  (branch:$branch_lines main:$main_lines diff:$diff_size lines)"
    else
      echo "  MISSING  $f  (only on branch)"
    fi
  done
  echo ""
done
