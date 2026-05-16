#!/usr/bin/env bash
set -euo pipefail
echo "🌀 Echo Capstone — Unified Installer"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"

copy(){ local FROM="$1"; local TO="$2"; echo "→ $FROM → $TO"; mkdir -p "$(dirname "$TO")"; cp -R "$FROM" "$TO"; }

copy "./src/modules/EchoMixologyAI" "$SRC/modules/EchoMixologyAI"
copy "./src/modules/EchoSommelier" "$SRC/modules/EchoSommelier"
copy "./src/modules/LiquorAI" "$SRC/modules/LiquorAI"
copy "./src/mobile/scheduler" "$SRC/mobile/scheduler"
copy "./src/safety/RedPhoenix" "$SRC/safety/RedPhoenix"
copy "./src/modules/MixologyWheel" "$SRC/modules/MixologyWheel"
copy "./src/modules/SommelierMerge" "$SRC/modules/SommelierMerge"
copy "./src/final/install-orchestrator" "$SRC/final/install-orchestrator"

echo "✓ All capstone modules installed."
