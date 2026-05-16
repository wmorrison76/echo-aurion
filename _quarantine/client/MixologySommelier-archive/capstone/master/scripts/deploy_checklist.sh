#!/usr/bin/env bash
set -euo pipefail
echo "🚀 LUCCCA Echo Capstone Deploy Checklist"
echo "1. Ensure unit tests pass (bash scripts/run_unit_tests.sh)"
echo "2. Verify linting/formatting (npm run lint && npm run format)"
echo "3. Build Docker image (docker build -t luccca:latest .)"
echo "4. Run docker-compose up -d"
echo "5. Check logs (docker logs -f luccca_app)"
echo "6. Confirm app available at http://localhost:3000"
echo "7. Tag and push release: git tag vX.Y.Z && git push origin vX.Y.Z"
