# Production Deploy Checklist — Echo Capstone

## Pre-flight
- [ ] `bash scripts/setup_ci.sh` executed; CI green on main
- [ ] `bash scripts/run_unit_tests.sh` passes locally
- [ ] `node scripts/env_check.mjs` reports OK
- [ ] `node scripts/env_render.mjs` generated `config.json`
- [ ] Lint/format clean: `npm run lint` / `npm run format`

## Build
- [ ] `npm run build` or `node scripts/build_prod.mjs` produced `dist/`
- [ ] `docker build -t echo-capstone:TAG .` succeeded

## Run
- [ ] `.env` prepared (based on `.env.example`)
- [ ] `docker compose up -d` serving on `${APP_PORT}`
- [ ] SPA routes resolve correctly (nginx `try_files` rule)

## Observability
- [ ] RedPhoenix telemetry endpoint configured (optional)
- [ ] Error boundary (`RecoveryGuard`) wraps critical panels

## Release
- [ ] `node scripts/gen_release_notes.mjs` created `RELEASE_NOTES.md`
- [ ] Tag created: `git tag -a vX.Y.Z -m "Release vX.Y.Z"` then `git push --tags`
- [ ] Artifact retention policy set in CI

## Post-deploy
- [ ] Smoke test core panels (Mixology, Sommelier, Scheduler, Wheel)
- [ ] Verify CLI checksums: `node src/safety/RedPhoenix/cli/commands/bulk.js verify ./src`
- [ ] Capture any incidents via telemetry and file issues
