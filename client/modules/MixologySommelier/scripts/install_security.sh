#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-.}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PACKAGE_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

printf 'Installing Echo AI³ security wiring into %s\n' "$TARGET"

mkdir -p \
  "$TARGET/.config" \
  "$TARGET/.github/workflows" \
  "$TARGET/opa" \
  "$TARGET/builder" \
  "$TARGET/scripts" \
  "$TARGET/zaro" \
  "$TARGET/docs"

rsync -a --info=stats1 "${PACKAGE_ROOT}/.config/" "$TARGET/.config/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/.github/workflows/" "$TARGET/.github/workflows/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/.gitlab-ci.yml" "$TARGET/.gitlab-ci.yml"
rsync -a --info=stats1 "${PACKAGE_ROOT}/builder/actions" "$TARGET/builder/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/docs/SECURITY-HARDENING.md" "$TARGET/docs/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/opa/" "$TARGET/opa/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/scripts/setup_vault_oidc.sh" "$TARGET/scripts/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/scripts/rotate_tokens.sh" "$TARGET/scripts/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/scripts/register_zaro_policies.sh" "$TARGET/scripts/"
rsync -a --info=stats1 "${PACKAGE_ROOT}/zaro/" "$TARGET/zaro/"

printf 'Security wiring installed. Review docs/SECURITY-HARDENING.md for activation steps.\n'
