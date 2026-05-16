#!/usr/bin/env bash
set -euo pipefail
CHART=helm/echo-capstone
OUT=k8s-rendered
mkdir -p "$OUT"
helm template echo "$CHART" > "$OUT/all.yaml"
echo "✓ Rendered Helm chart to $OUT/all.yaml"
