#!/usr/bin/env bash
set -euo pipefail
echo "→ Installing MixologyWheel + SommelierUIBridge"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"

cp -R ./src/modules/MixologyWheel "$SRC/modules/"
cp -R ./src/modules/SommelierUIBridge "$SRC/modules/"
echo "✓ Done"
