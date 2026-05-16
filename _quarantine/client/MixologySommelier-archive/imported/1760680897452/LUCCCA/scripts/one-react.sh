#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
pushd "$ROOT" >/dev/null

# Remove stray node_modules outside the frontend workspace (these cause 2nd React)
rm -rf "$ROOT/node_modules" 2>/dev/null || true
# Remove accidental nested node_modules inside modules
find "$ROOT/frontend/src/modules" -maxdepth 3 -type d -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true

# Clean Vite caches
rm -rf "$ROOT/frontend/node_modules/.vite" "$ROOT/frontend/.vite" "$ROOT/frontend/dist" 2>/dev/null || true

# Reinstall once (frontend workspace only)
cd "$ROOT/frontend"
pnpm install

echo
echo "== React versions (should be a single copy under frontend) =="
pnpm list react react-dom || true
popd >/dev/null
