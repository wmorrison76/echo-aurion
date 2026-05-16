#!/usr/bin/env bash
# Golden Seed — spawn a new platform from the kit.
# Usage: ./scripts/spawn-platform.sh --name "MyCustomOS" --domain "app.example.com"

set -euo pipefail

NAME=""
DOMAIN=""
TEMPLATES="stripe-standalone,admin-dashboard"

while [[ $# -gt 0 ]]; do
  case $1 in
    --name) NAME="$2"; shift 2;;
    --domain) DOMAIN="$2"; shift 2;;
    --templates) TEMPLATES="$2"; shift 2;;
    *) echo "unknown arg: $1"; exit 2;;
  esac
done

if [[ -z "$NAME" ]]; then
  echo "Usage: spawn-platform.sh --name <name> [--domain <domain>] [--templates a,b,c]"
  exit 2
fi

SLUG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | cut -c1-40)
TARGET="./spawns/${SLUG}"
mkdir -p "${TARGET}"

cat > "${TARGET}/SPAWN.json" <<EOF
{
  "name": "${NAME}",
  "slug": "${SLUG}",
  "domain": "${DOMAIN}",
  "templates": [$(echo "$TEMPLATES" | sed 's/,/","/g; s/^/"/; s/$/"/')],
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Copy the seed kit into the spawn
cp -r ../brain ../spine ../sidebar ../auth ../observability "${TARGET}/"
for T in $(echo "$TEMPLATES" | tr ',' ' '); do
  if [[ -d "../templates/${T}" ]]; then
    cp -r "../templates/${T}" "${TARGET}/modules/"
  fi
done

echo "✓ Spawned ${NAME} at ${TARGET}"
echo "  Next: cd ${TARGET} && ./scripts/init.sh"
