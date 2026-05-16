#!/usr/bin/env bash
set -euo pipefail
echo "🛠 Installing Feature Control Panel"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"
copy(){ mkdir -p "$(dirname "$2")"; cp -R "$1" "$2"; }
copy "./src/feature-flags" "$SRC/feature-flags"
copy "./src/hooks" "$SRC/hooks"
copy "./src/admin" "$SRC/admin"
echo "✓ Installed Feature Control Panel under src/admin and src/feature-flags"
