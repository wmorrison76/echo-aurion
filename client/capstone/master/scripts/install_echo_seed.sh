#!/usr/bin/env bash
set -euo pipefail
echo "🌀 Echo Final Install Seed — Batch 03"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"
echo "→ Project root: $PROJECT_ROOT"

mkdir -p "$SRC"

copy_dir() {
  local FROM="$1"; local TO="$2";
  echo "→ Installing $FROM → $TO"
  mkdir -p "$(dirname "$TO")"
  cp -R "$FROM" "$TO"
}

# This script expects to be run from inside the extracted archive directory.
# Example:
#   PROJECT_ROOT=~/Desktop/LUCCCA/frontend bash scripts/install_echo_seed.sh
copy_dir "./src/mobile/scheduler" "$SRC/mobile/scheduler"
copy_dir "./src/modules/LiquorAI" "$SRC/modules/LiquorAI"

echo "✓ Installed Mobile Scheduler and LiquorAI modules."
echo "Next steps:"
echo "  - Import { MobileScheduler } from '@/mobile/scheduler' and mount under your /mobile route."
echo "  - Wire LiquorAI parsing into Mixology intake: Entities.canonicalKey(), parseLabel()."
echo "  - Commit the changes and run your smoke tests."
