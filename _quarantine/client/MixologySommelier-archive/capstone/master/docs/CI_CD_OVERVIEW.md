# CI/CD Overview — Echo Capstone

## Pipelines
- **ci.yml**: lint, test, build (Batch 07)
- **release.yml**: release notes generation (Batch 08)
- **helm-release.yml**: packages Helm chart (Batch 10)

## Flow
1. Developer pushes code → `ci.yml` validates
2. Manual release trigger → `release.yml` generates notes
3. Helm release trigger → `helm-release.yml` publishes chart artifact
4. Ops runs `helm upgrade --install` with uploaded chart

## Notes
- All scripts are idempotent and safe to re-run
- Blue/green scripts (Batch 09) can be layered with Helm for rollout safety
