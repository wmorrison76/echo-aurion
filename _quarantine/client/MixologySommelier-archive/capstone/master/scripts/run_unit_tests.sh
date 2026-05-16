#!/usr/bin/env bash
set -euo pipefail
ROOT="${ROOT:-$PWD}"
echo "🧪 Running capstone unit tests (Node)"
node --version
set +e
node tests/abv.test.js &&     node tests/liquor-inventory.test.js &&     node tests/pairing.test.js
CODE=$?
set -e
if [ "$CODE" -eq 0 ]; then
  echo "✓ All tests passed"
else
  echo "❌ Some tests failed (exit $CODE)"
  exit $CODE
fi
