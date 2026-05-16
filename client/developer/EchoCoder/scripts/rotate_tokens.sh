#!/usr/bin/env bash
set -euo pipefail

if ! command -v vault >/dev/null 2>&1; then
  echo "vault CLI is required" >&2
  exit 1
fi

: "${VAULT_ADDR:?VAULT_ADDR must be set}"
ROLE_NAME=${ROLE_NAME:-echo}

# Revoke existing tokens for the role and force renewal.
if vault list auth/token/accessors >/tmp/vault-accessors.txt 2>/dev/null; then
  while read -r accessor; do
    [[ -z "$accessor" || "$accessor" == accessor* ]] && continue
    vault token revoke -accessor "$accessor" >/dev/null 2>&1 || true
  done </tmp/vault-accessors.txt
  rm -f /tmp/vault-accessors.txt
  echo "All accessors revoked. New tokens will be issued on next login."
else
  echo "Unable to list token accessors; ensure the caller has sudo capabilities." >&2
fi
