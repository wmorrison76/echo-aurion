#!/usr/bin/env bash
set -euo pipefail
echo "🌀 Echo Capstone — Install Mixology Wheel + Sommelier Merge + SafePatch"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"

copy_dir(){ local FROM="$1"; local TO="$2"; echo "→ $FROM → $TO"; mkdir -p "$(dirname "$TO")"; cp -R "$FROM" "$TO"; }

copy_dir "./src/modules/MixologyWheel" "$SRC/modules/MixologyWheel"
copy_dir "./src/modules/SommelierMerge" "$SRC/modules/SommelierMerge"
copy_dir "./src/safety/RedPhoenix/SafePatch.js" "$SRC/safety/RedPhoenix/SafePatch.js"
copy_dir "./src/safety/RedPhoenix/guards" "$SRC/safety/RedPhoenix/guards"

echo "✓ Installed MixologyWheel, SommelierMerge, and RedPhoenix SafePatch."
echo "Next:"
echo " - Import { SommelierMixologyConsole } from '@/modules/SommelierMerge'"
echo " - Import { MixologyWheel } from '@/modules/MixologyWheel'"
echo " - Wrap fragile panels with withRecovery(Component)"
