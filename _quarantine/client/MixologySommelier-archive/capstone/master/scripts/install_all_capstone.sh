#!/usr/bin/env bash
set -euo pipefail
echo "🌀 Echo Capstone — Install ALL batches (01–05 prerequisites)"
PROJECT_ROOT="${PROJECT_ROOT:-$PWD}"
SRC="$PROJECT_ROOT/src"
copy_dir(){ local FROM="$1"; local TO="$2"; echo "→ $FROM → $TO"; mkdir -p "$(dirname "$TO")"; cp -R "$FROM" "$TO"; }

# This script expects the capstone batch folders to be present in the current directory structure.
# Copy core modules and safety layers into the project.
copy_dir "./src/modules/EchoMixologyAI" "$SRC/modules/EchoMixologyAI"
copy_dir "./src/modules/EchoSommelier" "$SRC/modules/EchoSommelier"
copy_dir "./src/modules/EchoSommelierMixologyBridge" "$SRC/modules/EchoSommelierMixologyBridge"
copy_dir "./src/modules/VisualSyncLiveControl" "$SRC/modules/VisualSyncLiveControl"
copy_dir "./src/modules/MixologyWheel" "$SRC/modules/MixologyWheel"
copy_dir "./src/modules/SommelierMerge" "$SRC/modules/SommelierMerge"
copy_dir "./src/modules/LiquorAI" "$SRC/modules/LiquorAI"
copy_dir "./src/mobile/scheduler" "$SRC/mobile/scheduler"
copy_dir "./src/safety/RedPhoenix" "$SRC/safety/RedPhoenix"
copy_dir "./src/final/install-orchestrator" "$SRC/final/install-orchestrator"

# Schemas and tests
copy_dir "./schemas" "$PROJECT_ROOT/schemas"
copy_dir "./tests" "$PROJECT_ROOT/tests"

echo "✓ Capstone modules installed. Next:"
echo " - Run tests: bash scripts/run_unit_tests.sh"
echo " - Optionally start telemetry: import { startTelemetry } from '@/safety/RedPhoenix/telemetry/phoenix-telemetry'"
