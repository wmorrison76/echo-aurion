#!/usr/bin/env bash
set -euo pipefail
URL=${1:-http://localhost:8080}
echo "Probing $URL ..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)
if [ "$STATUS" -eq 200 ]; then
  echo "✓ Healthy (HTTP $STATUS)"
  exit 0
else
  echo "❌ Unhealthy (HTTP $STATUS)"
  exit 1
fi
