#!/usr/bin/env bash
set -euo pipefail
OUT_DIR=${1:-dist/exports}
mkdir -p "$OUT_DIR"
BASE_URL=${BASE_URL:-http://localhost:3000}
START=${START:-$(date +%F)}
for V in adp quickbooks paychex paylocity gusto dayforce ukg; do
  echo "Exporting $V..."
  curl -fsSL "$BASE_URL/api/payroll/weekly_totals?vendor=$V&start=$START" -o "$OUT_DIR/weekly_totals_${START}_${V}.csv"
  echo "  -> $OUT_DIR/weekly_totals_${START}_${V}.csv"
done
