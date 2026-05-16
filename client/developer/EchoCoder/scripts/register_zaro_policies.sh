#!/usr/bin/env bash
set -euo pipefail

: "${ZARO_URL:?Set ZARO_URL to the API endpoint (e.g. https://zaro.example/api)}"
: "${ZARO_TOKEN:?Set ZARO_TOKEN to an API token with policy write permissions}"

BASELINE=${BASELINE:-zaro/security/baseline.yaml}

if [[ ! -f "$BASELINE" ]]; then
  echo "Baseline file '$BASELINE' not found" >&2
  exit 1
fi

curl -sS -X POST "$ZARO_URL/policies" \
  -H "Authorization: Bearer $ZARO_TOKEN" \
  -H "Content-Type: application/x-yaml" \
  --data-binary @"$BASELINE"

echo
