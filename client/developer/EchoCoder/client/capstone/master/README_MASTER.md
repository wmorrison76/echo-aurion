# Echo Capstone — Master Bundle (Batches 01–12)

This archive merges all deliverables into a single tree, including QA, E2E, security, and monitoring docs.

## Quick Start
1. Install dev/CI tooling:
   ```bash
   bash scripts/setup_ci.sh
   ```
2. Run unit + E2E tests:
   ```bash
   bash scripts/run_unit_tests.sh
   bash scripts/run_e2e.sh
   ```
3. Local build & run:
   ```bash
   node scripts/build_prod.mjs
   docker compose up -d
   ```
4. Cluster deploy:
   ```bash
   kubectl apply -f k8s/
   helm upgrade --install echo ./helm/echo-capstone
   ```

See `MASTER_MANIFEST.md` for full file index.
