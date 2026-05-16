#!/usr/bin/env bash
set -euo pipefail

if ! command -v vault >/dev/null 2>&1; then
  echo "vault CLI is required" >&2
  exit 1
fi

: "${VAULT_ADDR:?VAULT_ADDR must be set, e.g. https://vault.example.com}"

ROLE_NAME=${ROLE_NAME:-echo}
POLICY_NAME=${POLICY_NAME:-echo-reader}
MOUNT_PATH=${MOUNT_PATH:-kv/echo}
TTL=${TTL:-1h}
MAX_TTL=${MAX_TTL:-24h}

vault status >/dev/null

vault secrets enable -path="$MOUNT_PATH" kv || true

vault policy write "$POLICY_NAME" - <<EOF
path "${MOUNT_PATH}/data/*" {
  capabilities = ["read"]
}
EOF

vault write auth/oidc/role/"$ROLE_NAME" \
  role_type="jwt" \
  user_claim="sub" \
  policies="$POLICY_NAME" \
  ttl="$TTL" \
  max_ttl="$MAX_TTL"

echo "Vault OIDC role '${ROLE_NAME}' ready with policy '${POLICY_NAME}'."
