#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-.}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PACKAGE_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

printf 'Installing Echo AI³ core assets into %s\n' "$TARGET"

rsync -a --info=stats1 \
  "${PACKAGE_ROOT}/policies" \
  "${PACKAGE_ROOT}/schemas" \
  "${PACKAGE_ROOT}/orchestrator" \
  "${PACKAGE_ROOT}/client/components/admin" \
  "${PACKAGE_ROOT}/secrets" \
  "${PACKAGE_ROOT}/tests" \
  "${PACKAGE_ROOT}/docs/CORE_INSTALL.md" \
  "$TARGET"/

printf 'Core installation complete. Review docs/CORE_INSTALL.md for next steps.\n'
