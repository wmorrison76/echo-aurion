# LUCCCA Echo Capstone — Deploy Checklist

## Pre-deploy
- [ ] Run all unit tests: `bash scripts/run_unit_tests.sh`
- [ ] Lint/format check: `npm run lint && npm run format`
- [ ] Build production bundle: `npm run build`
- [ ] Update environment variables from `.env.template`

## Docker
- [ ] Build image: `docker build -t luccca:latest .`
- [ ] Run with compose: `docker-compose up -d`
- [ ] Confirm container healthy: `docker ps`

## Verification
- [ ] Visit http://localhost:3000
- [ ] Tail logs: `docker logs -f luccca_app`

## Release
- [ ] Generate release notes: `bash scripts/generate_release_notes.sh vX.Y.Z`
- [ ] Tag + push: `git tag vX.Y.Z && git push origin vX.Y.Z`
