#!/usr/bin/env bash
# scripts/freeze-build.sh — 409A build artifact freeze (FW-1)
# Captures commit hash + sha256 of dist/spa/assets/*.js to:
#   valuation/evidence/build-frozen-<shortsha>-<YYYY-MM-DD>.txt
# Idempotent: same commit + same date overwrites; different inputs create new file.

set -euo pipefail

[ -f package.json ] || { echo "ERROR: run from repo root" >&2; exit 1; }

shopt -s nullglob
JS_FILES=(dist/spa/assets/*.js)
shopt -u nullglob
if [ ${#JS_FILES[@]} -eq 0 ]; then
  echo "ERROR: no JS bundles at dist/spa/assets/*.js" >&2
  echo "       run 'pnpm run build:client' first" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD=(sha256sum)
else
  HASH_CMD=(shasum -a 256)
fi

SHORT_SHA=$(git rev-parse --short HEAD)
DATE=$(date -u +%Y-%m-%d)
OUT_DIR=valuation/evidence
OUT="${OUT_DIR}/build-frozen-${SHORT_SHA}-${DATE}.txt"
mkdir -p "$OUT_DIR"

{
  echo "# Build artifact freeze"
  echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Commit:    $(git rev-parse HEAD)"
  echo "# Branch:    $(git rev-parse --abbrev-ref HEAD)"
  echo "# Tool:      ${HASH_CMD[*]}"
  echo ""
  echo "## SHA256 — dist/spa/assets/*.js"
  "${HASH_CMD[@]}" "${JS_FILES[@]}"
} > "$OUT"

echo "Wrote: $OUT"
