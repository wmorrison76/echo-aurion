#!/usr/bin/env bash
set -euo pipefail
TAG=${1:-"vNEXT"}
echo "📝 Generating release notes for $TAG"
echo "# Release $TAG" > RELEASE_NOTES.md
echo "" >> RELEASE_NOTES.md
echo "## Highlights" >> RELEASE_NOTES.md
git log --pretty=format:"- %s" $(git describe --tags --abbrev=0)..HEAD >> RELEASE_NOTES.md || true
echo "" >> RELEASE_NOTES.md
echo "✓ RELEASE_NOTES.md generated."
