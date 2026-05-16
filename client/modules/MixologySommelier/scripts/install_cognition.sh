#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-.}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PACKAGE_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

printf 'Installing Echo AI³ cognition assets into %s\n' "$TARGET"

rsync -a --info=stats1 \
  "${PACKAGE_ROOT}/cognition" \
  "${PACKAGE_ROOT}/docs/COGNITION_INSTALL.md" \
  "$TARGET"/

printf 'Cognition installation complete. Review docs/COGNITION_INSTALL.md for configuration guidance.\n'
