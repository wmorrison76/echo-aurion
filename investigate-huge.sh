#!/bin/bash
BRANCHES=(
  release/d63-snapshot
  chore/preview-swap-and-shell-integration
  chore/D63-recovery-consolidated
  claude/D31-D60-bulk-merge
  claude/D51-D52-chef-pnl-and-quarantine
)

echo "=== Tip SHA of each (look for duplicates) ==="
for b in "${BRANCHES[@]}"; do
  sha=$(git rev-parse origin/$b 2>/dev/null)
  subj=$(git log -1 --format='%s' origin/$b 2>/dev/null | cut -c1-60)
  echo "$sha  $b  | $subj"
done
echo ""

echo "=== Ahead/behind vs origin/main ==="
echo "Branch | ahead | behind"
for b in "${BRANCHES[@]}"; do
  counts=$(git rev-list --left-right --count origin/main...origin/$b 2>/dev/null)
  behind=$(echo $counts | awk '{print $1}')
  ahead=$(echo $counts | awk '{print $2}')
  echo "$b | $ahead | $behind"
done
echo ""

echo "=== Ahead/behind vs origin/conflict_110526_1036 (your current) ==="
echo "Branch | ahead | behind"
for b in "${BRANCHES[@]}"; do
  counts=$(git rev-list --left-right --count origin/conflict_110526_1036...origin/$b 2>/dev/null)
  behind=$(echo $counts | awk '{print $1}')
  ahead=$(echo $counts | awk '{print $2}')
  echo "$b | $ahead | $behind"
done
echo ""

echo "=== Last 5 commits on each (newest first) ==="
for b in "${BRANCHES[@]}"; do
  echo "--- $b ---"
  git log origin/$b --oneline -5
  echo ""
done
