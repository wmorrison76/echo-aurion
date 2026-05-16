#!/usr/bin/env bash
set -euo pipefail
URL="${E2E_BASE_URL:-http://localhost:8080}"
echo "🔎 Running Playwright E2E against ${URL}"
if ! command -v npx >/dev/null 2>&1; then echo "npx not found"; exit 1; fi
npx -y playwright@1.47.2 install --with-deps
E2E_BASE_URL="$URL" npx -y playwright@1.47.2 test tests/e2e
