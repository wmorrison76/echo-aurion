#!/bin/bash
echo "Branch | Age(d) | Unique | OnMain(cherry) | Files | LastAuthor | LastSubject"
echo "---"
for branch in $(git branch -r --no-merged origin/main | grep -v 'HEAD' | grep -v 'origin/main$' | grep -v 'conflict_110526_1036' | tr -d ' '); do
  short=${branch#origin/}
  last_ct=$(git log -1 --format='%ct' $branch 2>/dev/null)
  age_days=$(( ( $(date +%s) - $last_ct ) / 86400 ))
  unique=$(git rev-list --count origin/main..$branch 2>/dev/null)
  cherry_minus=$(git cherry origin/main $branch 2>/dev/null | grep -c '^-')
  files=$(git diff --name-only origin/main...$branch 2>/dev/null | wc -l | tr -d ' ')
  last_author=$(git log -1 --format='%an' $branch 2>/dev/null)
  last_subject=$(git log -1 --format='%s' $branch 2>/dev/null | cut -c1-50)
  echo "$short | $age_days | $unique | $cherry_minus | $files | $last_author | $last_subject"
done
