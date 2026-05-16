# BACKLOG

Living list of deferred work, open decisions, and known gaps. Maintained alongside the BMB integration sprint (`INSTALL/files-3/06_INTEGRATION_REPORT.md` and `07_INTEGRATION_RUNBOOK.md`).

**Conventions:**
- `[ ]` = open · `[x]` = done · `[~]` = in flight
- Owner: `@william` = needs William's call · `@cc` = Claude Code can do · `@both` = lockstep
- Format: `[ ] <one-line item>` then optional sub-bullets for context

Last updated: **2026-04-29** (Day 1 of foundation pass)

---

## 1. Day 1 deferrals (do soon)

- [ ] **Rotate LogRocket app ID** (runbook §1.3) — `@both`
  - Create new LogRocket project (`EchoAurum-LUCCCA-v2` or similar), copy app ID
  - I update `.env` line 7 (`VITE_LOGROCKET_APP_ID=…`)
  - Mark old project inactive (don't delete — preserve historical session recordings)
- [ ] **File GitHub support ticket** to expedite expiry of old objects from server-side garbage — `@william`
  - Context: history rewrite removed `client.zip` (78.8 MB blob) and 8 `.env` files; default GH grace is ~30 days
  - Ticket text: "Please run `git gc --prune=now` on `wmorrison76/Echo_Aurion-LUCCCA_Framework` after a history rewrite removed sensitive blobs."
  - Compresses retention window from weeks to hours

---

## 2. Open decisions awaiting William (blockers for later phases)

- [ ] **Maestro folder consolidation** — are these meant to merge later, or are they distinct? — `@william`
  - `client/modules/MaestroBQT` (canonical for BMB sprint per Day 1 decision)
  - `client/modules/MaestroBanquets`
  - `client/modules/Maestro`
  - `client/modules/MaestroDashboard`
  - `client/modules/BEOMenuBuilder`
  - `client/modules/MenuDesignStudio`
  - `client/modules/MenuEngineering`
  - `client/modules/BanquetIntelligence`
  - **Defer to a follow-up sprint**; for BMB sprint we only touch `MaestroBQT`.
- [ ] **`@dnd-kit/sortable` v7 vs v8 — final call** — `@cc` (verify), then `@william` (decide)
  - Day 1 decision: try v7 first (current `^7.0.2`)
  - Phase 1 Day 3 will surface whether Pkg 3's patterns work on v7. If they break, propose upgrade plan.
- [ ] **Three pilot operators** — names + properties needed by end of Week 1 — `@william`
  - Phase 7 (Days 36-42) is gated on this
  - Send weekly Friday demos to keep them engaged
- [ ] **Atlas Vector Search provisioning** — implement now or defer to v2? — `@william`
  - Pkg 4's `echoEmbeddingService.ts` references it but ships as ID-lookup-only
  - ~1 day implementation cost if we do it; affects `searchForGenerate` quality
  - Recommend: defer to v2 unless pilots specifically demand semantic search at deploy
- [ ] **System templates: static array vs MongoDB-backed** (Pkg 5) — `@william`
  - Currently ship as `systemTemplates.ts` (328-line static array)
  - v1 fine; v2 should migrate so templates can be edited without redeploys
  - Document timing decision in BACKLOG when we know the v2 trigger
- [ ] **Network Intelligence backend aggregator** — when does it light up? — `@william`
  - Synthetic for v1 (k=20 floor unreachable with 3 pilots)
  - Phase 3 of Collective per the broader roadmap
  - Be explicit with pilots: "demo data" labeling

---

## 3. BMB sprint pending work — by phase (from runbook)

### Phase 0 (Day 1)
- [x] Pre-flight verifications (`@cc`, done 2026-04-29)
- [x] Foundation pass status confirmed at 0% (`@cc`, done 2026-04-29)
- [x] Source packages located in `INSTALL/` (`@cc`, done 2026-04-29)
- [x] `$BMB_DIR` decision = `client/modules/MaestroBQT/BanquetMenuBuilder/` (`@william`, done 2026-04-29)

### Day 1 — Repo Hygiene + Privacy
- [x] Pre-flight `git status` (done)
- [x] Rotate `ECHO_API_TOKEN` — rotated **twice** (first one exposed) — done
- [ ] Rotate LogRocket app ID — see §1
- [x] Untrack `.env*`, remove `client.zip`, commit — done (`3e6c8c48d` → rewritten as `7f8662429`)
- [x] Repo private (William) — done
- [x] History rewrite via `git filter-repo` (9,494 commits) + force-push — done
- [x] Verified in fresh clone — done

### Day 2 — GitNexus Indexing
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 npx gitnexus analyze --skills` — `@william`
- [ ] Add `.gitnexus/` to `.gitignore` — `@cc`
- [ ] Generate architectural report via Cursor → save to `memory/GITNEXUS_REPORT_v1.md` — `@william`
- [ ] Send report for refactor backlog generation — `@both`

### Day 3 — Install `lucca-doctor`
- [ ] Build 5 diagnostic scripts per `03_LUCCCA_DOCTOR.md` — `@cc`
  - `collapsed-files.ts`, `circular-deps.ts`, `missing-indexes.ts`, `missing-exports.ts`, `alias-check.ts`, `run-all.ts`
- [ ] Add scripts to `package.json` and add `madge` devDep — `@cc`
- [ ] Run first scan; triage failures (don't auto-fix) — `@both`
- [ ] Wire pre-commit hook (Husky or `.git/hooks/pre-commit`) — `@cc`
- [ ] Wire CI workflow `.github/workflows/lucca-doctor.yml` — `@cc`

### Day 4-5 — Targeted Cleanup
- [ ] Resolve only the cycles that block BMB integration — `@both`
- [ ] Resolve missing indexes/exports in BMB import graph — `@both`
- [ ] Resolve alias misalignments — `@cc`
- [ ] Resolve any collapsed files in BMB import graph — `@cc`
- [ ] Backlog the rest in this file — `@cc`

### Day 6 — SOC 2 Readiness Kickoff
- [ ] Schedule intro calls: Vanta, Drata, Secureframe — `@william`
- [ ] Pick vendor based on solo-founder pricing — `@william`

### Phase 1 — Pkg 1 + 2 install + Pkg 3 integration (Days 8-15, expanded from runbook to install all 5 packages)
- [ ] Install Pkg 1 (Foundation) into `$BMB_DIR` — `@cc`
- [ ] Install Pkg 2 (Library/utils/seeds) into `$BMB_DIR` — `@cc`
- [ ] Run Pkg 2's `verifyDataIntegrity.ts` — `@cc`
- [ ] Type reconciliation pass between Pkg 1 and Pkg 3 expectations — `@cc`
- [ ] Install missing deps (`nanoid`); confirm `@dnd-kit/utilities` already present — `@cc`
- [ ] dnd-kit/sortable v7 verification (try existing v7.0.2 against Pkg 3's patterns) — `@cc`
- [ ] Drop in Pkg 3 files — `@cc`
- [ ] Build adapter hooks `useMenuComposition.ts` + `useLiveCalculations.ts` — `@cc`
- [ ] Wire registration into MaestroBqts panel registry — `@cc`
- [ ] Smoke test: drag → pricing updates → autosave to MongoDB — `@both`
- [ ] PR: `feat(banquet-menu-builder): Pkg 1+2+3 integration` — `@cc`

### Phase 2 — Pkg 4 (Echo) + proxy audit (Days 16-22)
- [ ] **Echo proxy contract audit** — Days 16-17 — `@both`
  - Read in-repo `server/services/echo-ai3/` and Railway proxy code
  - Compare to Pkg 4 services' expected request/response shapes
  - Document in `memory/handoff_2026_04/ECHO_PROXY_CONTRACT.md`
- [ ] Decision matrix: adapt Pkg 4 services vs extend proxy — `@william`
- [ ] Build server-side forwarding layer (~50 lines) so Pkg 4 routes through `/api/echo-ai3/*` rather than Railway directly — `@cc`
- [ ] Drop in Pkg 4 files — `@cc`
- [ ] Adapt Pkg 4 services to in-repo proxy contract — `@cc`
- [ ] Add `propertyItemRepository.searchForGenerate({ … })` method — `@cc`
- [ ] Wire `echoAuditLogger.ts` to existing `unified-audit-service.ts` — `@cc`
- [ ] Wire `EchoCompanion` into BMB panel — `@cc`
- [ ] Test all three modes: compose, critique, generate — 5 scenarios each — `@both`
- [ ] PR: `feat(banquet-menu-builder): Pkg 4 (Echo AI³) integration` — `@cc`

### Phase 3 — Pkg 5 + DCA wiring (Days 23-29)
- [ ] Drop in Pkg 5 files — `@cc`
- [ ] Resolve duplicate `NetworkPercentileBadge.tsx` (Pkg 3 + Pkg 5 ship one each) — `@cc`
- [ ] Extend adapter for `replaceWithGenerated`, `mergeGenerated` — `@cc`
- [ ] Read `server/services/aurionos/decision-engine/decision-clearance.ts` `evaluate()` shape — `@cc`
- [ ] Build adapter (don't modify decision-clearance.ts) so Pkg 5 `workflowService.ts` calls DCA — `@cc`
- [ ] Wire `WorkflowStageBar` + `PublishPipeline` into panel — `@cc`
- [ ] Wire Template Gallery + brand overlay editor — `@cc`
- [ ] Author template seed script + run it — `@cc`
- [ ] Smoke test: workflow transitions, templates apply, network percentile, publish pipeline — `@both`
- [ ] PR: `feat(banquet-menu-builder): Pkg 5 integration` — `@cc`

### Phase 4 — AI Enhancement Layer (Days 30-36)
- [ ] Cost Variance Detector (`services/costVarianceService.ts`) — `@cc`
- [ ] `services/eventCostHistoryService.ts` (wrap existing event data) — `@cc`
- [ ] Waste Prediction (`services/wastePredictionService.ts`) — `@cc`
- [ ] Continuous Audit (`services/continuousAuditService.ts`, 7+ signals) — `@cc`
- [ ] Wire all three into `echoCritiqueService.ts` deterministic pass — `@cc`
- [ ] Pre-flight gate: continuous audit blocks publish on critical findings — `@cc`
- [ ] PR: `feat(banquet-menu-builder): AI enhancement layer (cost/waste/audit)` — `@cc`

### Phase 5 — Test Coverage Pass (Days 34-36, overlap)
- [ ] `pricingEngine.ts` 95% coverage — `@cc`
- [ ] `dietaryEngine.ts` 85% coverage — `@cc`
- [ ] `operationalEngine.ts` 85% coverage — `@cc`
- [ ] `workflowService.ts` 90% coverage — `@cc`
- [ ] `templateBindingService.ts` 80% coverage — `@cc`
- [ ] `publishingService.ts` 75% coverage — `@cc`
- [ ] **Three reference banquet fixtures** (hand-calculated to $0.01) — `@william` for math review, `@cc` for fixture authoring
  - Banquet A: 100-guest plated dinner, mixed dietary
  - Banquet B: 250-guest reception, 5 stations
  - Banquet C: 50-guest tasting menu w/ package tiers + add-ons
- [ ] Property tests: 100 random scenarios per pricing kind — `@cc`

### Phase 6 — Audit Gates (Days 37-43)
- [ ] Gate 1 — Financial Precision (reference banquets exact + property tests) — `@cc`
- [ ] Gate 7 — Accessibility (axe-core + keyboard walkthrough) — `@cc`
- [ ] Gate 2 — Multi-Tenant Isolation (50 attack vectors in staging) — `@both`
- [ ] Gate 3 — Allergen Safety (20 edge-case menus) — `@cc`
- [ ] Gate 5 — Prompt Injection (50-prompt corpus, three modes) — `@cc`
- [ ] Gate 4 — Performance (k6 load test, p95 targets) — `@cc`
- [ ] Gate 6 — Data Integrity (backup/restore drill, audit immutability) — `@both`
- [ ] Gate 8 — Pilot baselines captured before deployment — `@william` with pilots

### Phase 7 — Pilot Onboarding (Days 44-50)
- [ ] White-glove import of pilot operators' item libraries — `@william`
- [ ] Train pilots on the canvas (1-2 hr session each) — `@william`
- [ ] Set up direct support channel (Slack/text) — `@william`
- [ ] Daily issue triage during first 2 weeks — `@both`
- [ ] Friday retro with all 3 pilots — `@william`
- [ ] 30/60/90 day measurements per Gate 8 — `@william`

---

## 4. Code-level gaps to address during integration (from 06 §4)

### Pkg 3 — Composition Canvas
- [ ] `pricingEngine.ts` uses native floating point — swap to integer-cents fixed-point for audit-grade arithmetic (Gate 1 dependency)
- [ ] `pricingEngine.ts` capacity thresholds in `operationalEngine.ts` are hardcoded — make configurable per property
- [ ] `compositionPersistence.ts` — verify it uses Pkg 1's `menuDraftRepository`, not a parallel implementation
- [ ] `compositionPersistence.ts` — verify error/retry behavior under network failure
- [ ] `useNetworkPercentile.ts` is a stub — calls Pkg 5 service; will fail compile until Pkg 5 lands

### Pkg 4 — Echo Companion
- [ ] `echoEmbeddingService.ts` — vector search referenced but only ID-lookup implemented
- [ ] `echoAuditLogger.ts` — wire to `unified-audit-service.ts` (currently console writes)
- [ ] `useVoiceRecognition.ts` — Safari/Firefox compat varies; document fallback; UX for denied mic permission
- [ ] `EchoOrb` perf on iPad (Gate 4 dependency)
- [ ] `propertyItemRepository.searchForGenerate({ … })` method missing from Pkg 1 — add

### Pkg 5 — Network Intelligence + Templates + Workflow + Publishing
- [ ] `networkIntelligenceService.ts` — server-side aggregator endpoint not built; v1 ships synthetic only
- [ ] `workflowService.ts` — replace local gate evaluation with DCA calls (see Phase 3)
- [ ] `templateBindingService.ts` — author/permission audit (Senior Art & Media Director role)
- [ ] System templates static array → MongoDB-backed (v2 — see §2)

### Cross-cutting
- [ ] **Zero tests in Pkg 3/4/5 as delivered** — addressed in Phase 5
- [ ] **No explicit ARIA labels in components** — Gate 7 risk; remediate in Phase 6 prep
- [ ] PRD.md is from sister Python `/app` repo — confusing; consider relocating or annotating

---

## 5. Repo housekeeping (separate cleanup sprint, low priority)

Found during Day 1 audit. None of these block BMB sprint.

- [ ] **Purge `node_modules/` from git history** — at least 2 esbuild binaries committed (~21 MB total)
  - Same `git filter-repo --invert-paths --path node_modules` pattern as Day 1
  - Verify nothing else was inadvertently in `node_modules/` history
- [ ] **Audit + purge other large blobs in history**
  - `client/imported/1760680897452/LUCCCA/Tools/argus_manifest.json` (20.7 MB)
  - `client/modules/Archive.zip` (11.6 MB)
  - `client/modules/Culinary/server/data/uploaded-terms.json` (14.0 MB) — likely legitimate, verify before purging
  - Decide: purge or migrate to git-LFS
- [ ] **Clean up nested `.gitignore` files in `client/modules/*`**
  - 5 of 6 modules (`EchoAurum`, `EchoCanvasStudio`, `EchoLayout`, `MixologySommelier`, `PurchasingReceiving`) have nested gitignores that don't inherit the root `.env` rule
  - Untracked `.env` files in those modules show as `??` in `git status` instead of being silently ignored
- [ ] **Dedupe root `.gitignore`**
  - `.env` listed at lines 69, 80, 89, 98, 107
  - `.env.*` listed at lines 72, 81, 90, 99, 108
  - Result of merging nested gitignores; functionally OK but messy
- [ ] **Audit `.env.example` / `.env.template` files for placeholder-only contents**
  - Root `.env.example` (kept tracked intentionally)
  - `client/capstone/master/.env.example`, `.env.template`
  - `client/developer/EchoCoder/client/capstone/master/.env.example`, `.env.template`
  - Per-module `.env.example` files
  - Verify none contain real secrets
- [ ] **Echo-related directories proliferate across the repo** — needs consolidation pass to identify canonical home per concern (config, services, components, routes, tests). Defer to follow-up sprint. — `@william`

---

## 6. Things to verify / questions to confirm with William

- [ ] **PRD.md memory drift** — `memory/PRD.md` describes `/app/backend/...` Python paths. Is that the sister project's PRD living in this repo by mistake, or is the iteration narrative meant to span both? — `@william`
- [ ] **Echo proxy auth pattern** — exact header (Bearer? `X-Echo-Token`?) used by Railway proxy — surfaces in Phase 2 audit
- [ ] **`unified-audit-service.ts` schema** — confirm log entry shape matches what `echoAuditLogger.ts` will emit (tenantId, userId, module, action, inputDigest, outputDigest, latencyMs, proxyResponseStatus)
- [ ] **Confirm MongoDB Atlas Vector Search index exists or doesn't** before Phase 2 (per §2 above)
- [ ] **Confirm Pier 66 reference seed (`pierSixtySixSeed.ts`) round-trips through new engines** — Pkg 2 ships it; Phase 1 should run it as smoke test

---

## 7. Notes from today's lockstep loop (2026-04-29)

For future sessions and audit trail:

- **`ECHO_API_TOKEN` was rotated twice on 2026-04-29**; first rotation was discarded due to operational exposure in another window before Railway sync. Second rotation is the current value (in `.env`, Railway, and wherever else the token is needed). Audit detail logged in `memory/handoff_2026_04/DAY_1_LOG.md`.
- **`git filter-repo` rewrote 9,494 commits** in 4.14 seconds. `.git/` shrank 261 MB → 188 MB. Deeper history than originally estimated.
- **Mirror backup at `/tmp/lucca-mirror-backup-2026-04-29.git`** (259 MB). Valid until next reboot. If a problem with the rewrite surfaces in the next 24 hours, restore from there.
- **Local safety tag `backup/pre-history-rewrite-2026-04-29`** was created and pushed to GitHub. Note: it points to a *rewritten* commit (filter-repo rewrites tags too), so it's the new HEAD's content but only useful as a name marker — not an escape hatch. The `/tmp/` mirror is the real escape hatch.
- **GitHub will retain old objects** in server-side garbage for ~30 days unless we file a support ticket (see §1).

---

## 8. Done — Day 1 (for the record)

- [x] Pre-flight: working tree clean, branch `main`, origin captured
- [x] `ECHO_API_TOKEN` rotated locally + on Railway (twice)
- [x] 8 `.env` files untracked (`git rm --cached`); local copies preserved
- [x] `client.zip` removed (`git rm`)
- [x] `client.zip` added to `.gitignore`
- [x] Commit `3e6c8c48d` "chore: stop tracking .env files…" (later rewritten as `7f8662429`)
- [x] Repo made private on GitHub
- [x] `git-filter-repo` installed via Homebrew
- [x] Mirror backup at `/tmp/lucca-mirror-backup-2026-04-29.git`
- [x] Safety tag `backup/pre-history-rewrite-2026-04-29` created
- [x] `git filter-repo` rewrote 9,494 commits, purging 9 paths
- [x] Verified: 0 commits reference any purged path; `git fsck` clean
- [x] `origin` re-added; force-pushed `main` and tags to GitHub
- [x] Verified: fresh clone confirms purged paths absent from public history
- [x] Memory entries saved (William profile, lockstep pattern, sprint context)
