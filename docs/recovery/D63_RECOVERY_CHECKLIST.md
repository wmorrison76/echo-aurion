# D63 Recovery Checklist for Emergent

> **Purpose:** Once PR #72 (`chore/D63-recovery-consolidated`) lands in `chore/preview-swap-and-shell-integration` and is synced to Emergent's workspace, work through this list to verify what's wired vs what's dangling.
>
> Each item lists **the file that should exist**, **the route/component**, and **a 1-line verification test**. If an item is missing or not visible in the running app, log it in `/app/memory/D63_RECOVERY_REPORT.md` under "missing" with the line number from this file.

---

## How to use this document

For each item below:
1. ✅ Confirm the source file exists at the path shown.
2. ✅ Confirm the route is registered (grep `backend/server.py` for the include_router line) **or** the React component is imported by something user-visible.
3. ✅ Run the test command, or open the URL, and confirm it returns expected output.
4. ❌ If any of the above fails, that item is **dangling** — list it in the recovery report.

Branches are listed in **merge order** (newest priority work first).

---

## D63 · Docs + Help Agent + Onboarding Wizard + OCR + Icon System

Branch: `claude/D63-docs-help-onboarding-ocr-icons` · 1 commit · 11 files · +2,936 lines

### Backend modules
- [ ] `backend/routes/help_agent.py` — LUCCCA mascot help-agent state machine. Tour registry, 5 starter tours, `/ask` free-form question routing. Should be registered as `help_agent_router` in `server.py`. **Test:** `curl http://localhost:8001/api/help-agent/tours` returns 5 tours.
- [ ] `backend/routes/onboarding_wizard_v2.py` — Apple-style 10-step onboarding (property → outlets → users → invites → payroll basics → integrations → Atlas verify → doctrine → Face ID → ready). Resumable, idempotent. Should be registered as `onboarding_wizard_v2_router`. **Test:** `curl http://localhost:8001/api/onboarding-v2/steps` returns 10 steps.
- [ ] `backend/echo/ocr_active_learning.py` — Path-to-98.5% OCR. LLM-as-extractor seam when confidence < 0.85, user-correction endpoint, per-vendor accuracy trend, `/path-to-985` strategy explainer. Registered as `ocr_active_learning_router`.

### Documentation
- [ ] `docs/UX_ICON_SYSTEM.md` — Module icon registry (30+ entries), 5-accent color system (cyan/emerald/amber/indigo/rose), LUCCCA mascot animation states, TypeScript registry pattern. **Note:** the merged version is the D64-aesthetic-corrected one.
- [ ] `docs/ops-runbooks/DOCUMENTATION_HOMES.md` — 4 documentation homes mapped (repo / in-app / Aurion Holdings governance / public marketing), decision rubric, Aurion Holdings governance repo structure.
- [ ] `docs/modules/_TEMPLATE.md` — Standard module README template.
- [ ] `docs/modules/admin.md` — 6 top tasks, 12 endpoints documented.
- [ ] `docs/modules/financial.md` — 7 top tasks, 30+ endpoints across payroll/forensic/COGS/tip share/forecast accuracy.
- [ ] `docs/modules/myecho.md` — 8 top tasks (clock in, paystub, swap, W-2, etc.), D60 Face ID documented.
- [ ] `docs/modules/echo_ai3.md` — Doctrine implementation layer, 10+ collections.

### NOT in D63 — Emergent frontend scope (verify these are still TODO)
- [ ] Mascot SVG illustrations + Lottie/Rive animations
- [ ] Sidebar component reading from icon registry
- [ ] Mascot floating animation across the screen
- [ ] Onboarding wizard UI screens (the backend is ready; UI is not)
- [ ] OCR correction review UI
- [ ] Module-doc rendering at `/docs/{module}`

---

## D62 · 3-Click UX Doctrine + AI-to-AI Handoff

Branch: `claude/D62-ux-3-click-doctrine-and-handoff` · 1 commit · 3 files · +691 lines

### Documentation
- [ ] `docs/UX_3_CLICK_DOCTRINE.md` — Formalizes "every operator action ≤ 3 taps from home OR ≤ 1 voice utterance from anywhere." Two paths (tap, voice), 7 forbidden patterns (are-you-sure modals, multi-step wizards, hidden 3-dot menus, etc.), 3 exception classes.
- [ ] `docs/ops-runbooks/UX_3_CLICK_AUDIT_RUBRIC.md` — 0–5 scoring per action, surface inventory of 30+ surfaces by audience, audit artifact template, "audit-of-the-audit" consistency rule.
- [ ] `docs/AI_TO_AI_HANDOFF_TO_EMERGENT.md` — Candid AI-to-AI message re: 80% files + mock smoke tests. Reading order for next session, scope boundary (UX cleanup ONLY, don't touch D31-D62 backends).

---

## D55–D59 · PII Sanitize + Foundation Gates + Atlas + Face ID

Branch: `claude/D55-D59-pii-sanitize-and-foundation-gates` · 1 commit · 36 files · +4,941 lines

### D55 · PII redaction
- [ ] `backend/tests/fixtures/invoices/*.txt` — Property name "Pier Sixty Six" replaced with `[PROPERTY]`, addresses replaced with `[ADDRESS]`, staff names with `[STAFF]`. D54's 6/6 fixture tests still pass.

### D56 · Foundation gates
- [ ] `.github/dependabot.yml` — Weekly pip + npm + github-actions + docker scans.
- [ ] `.github/workflows/license-and-coverage.yml` — License compliance (fails on GPL/AGPL/Commons Clause), coverage soft-gate at 60%, CHANGELOG check.
- [ ] `scripts/generate_changelog.py` — Reads git log, groups by D-series prefix, emits CHANGELOG.md.
- [ ] `CHANGELOG.md` — Initial generation against main.

### D57 · Security + i18n + a11y
- [ ] `backend/middleware/security_headers.py` — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP. Wired via `app.add_middleware`. Skips `/healthz`, `/readyz`, `/version`.
- [ ] `backend/lib/i18n.py` + `backend/i18n/locales/{en,es}/` — `t(key, lang, **vars)` translation primitive, 6 languages supported (en/es/ht/pt/tl/fr), 30 starter keys, Accept-Language parser. **Test:** `t('payroll.runs_locked', lang='es')` returns "La nómina del periodo {run_id} está bloqueada."
- [ ] `.github/workflows/a11y.yml` — axe-core via Playwright, WCAG 2 A + AA, soft gate.

### D58 · Incident response runbook
- [ ] `docs/ops-runbooks/INCIDENT_RESPONSE.md` — SEV-1/2/3/4 ladder, SEV-1 playbooks (allergen cascade, POS-failover stuck reconcile, Mongo primary down, guest data exposure), on-call template, SLO targets, blameless post-mortem template.

### D59 · OpenTaxSolver tax-table seed
- [ ] `backend/jobs/seed_tax_tables.py` — 2026 Federal 7-bracket tables (single/MFJ/MFS/HoH per IRS Pub 15-T), FICA (OASDI to $168.6k cap, Medicare + addl 0.9%), states: FL/TX/NV/WY/TN/SD/AK/WA/NH (no income), CA (9-bracket), NY (9-bracket), `_DEFAULT` (5% fallback). When D47 payroll runs, this seed makes the placeholder constants inert.

### D60 · MyEcho Face ID / WebAuthn
- [ ] `backend/routes/myecho_webauthn.py` — `/register/options + /register`, `/assert/options + /assert`, `/credentials` (list/revoke). Per-credential sign_count regression detection (cloning indicator → auto-revoke + audit). Anchored to D34 session_token. D17 fuse-box seam at `services/clients.py:get_webauthn_verifier`. Bearer token issued on assert (8h TTL).
- [ ] Registered as `myecho_webauthn_router` in `server.py`.

### Atlas walkthrough
- [ ] `docs/ops-runbooks/MONGODB_ATLAS_SETUP.md` — 10-step walkthrough, cost table (M0-M30), production rec (M10 prod $57/mo + M2 staging $9/mo), quarterly restore-drill, "what's wired vs manual" table.

### Foundation health-check (D53.3 partial)
- [ ] `backend/routes/health.py` — `GET /healthz`, `/readyz`, `/version`. Registered as `health_router`.

### Data retention (D53.12 partial)
- [ ] `backend/jobs/data_retention.py` — Tenet §7 nightly tombstone+scrub @ 03:30 UTC. Should appear in `scheduler.py` as `d53_data_retention` job.

---

## D54 · Invoice Extractor — 91-Invoice Corpus Calibration

Branch: `claude/D54-invoice-extractor-corpus-trained` · 1 commit

### Module
- [ ] `backend/echo/invoice_extractor.py` — 71 vendor templates (Mr. Greens, Waste Management, 2J Logistics, Amazon TPC, Sysco Guest Supply, US Foods, Halpern's, Breakthru, SGWS, Cintas, Chef's Warehouse, Tartufo Prestige, Golden Goat Caviar, Boucher Brothers, Bayfront Floral, Maritz Travel, Les Clefs d'Or, etc.). Universal regex (invoice_number 3-pattern, date 2-pattern, total 3-pattern, due_date 2-pattern, po_number).
- [ ] Endpoints `/api/echo/invoice-extract`: `POST /extract`, `GET /vendors`, `GET /extractions`. Registered as `echo_invoice_extractor_router_d63`.
- [ ] Confidence scoring per extraction. Review-required flag when overall_confidence < 0.7.

### Test fixtures + accuracy targets
- [ ] `backend/tests/test_invoice_extractor.py` — 6 fixture tests pass (Mr Greens #NF9012, Waste Management #2460417-2237-1, 2J Logistics $5,000, Amazon TPC #1PXX-1LG6-DJPQ, unknown-vendor graceful, 71 templates loaded).
- **Field accuracy on 91-invoice corpus:** invoice_number 93%, total 79%, po 75%, date 47%; vendor recognition 83%; overall confidence ≥0.7 → 98%.

---

## D53 · Production Hardening — 10 Modules

Branch: `claude/D53-production-hardening` · 1 commit

### Backend infrastructure
- [ ] `backend/db_indexes.py` — 60+ Mongo indexes leading with `(tenant_id, created_at)`. Wired at server.py boot, idempotent.
- [ ] `backend/middleware/rate_limit.py` — In-process sliding window. Categories: default 60/min, voice 20/min, payroll_run 4/min, channel_inbound 300/min. (NOT wired by default — slowapi covers it; this is the no-Redis fallback.)
- [ ] `backend/middleware/webhook_signatures.py` — HMAC-SHA256 constant-time verify. Per-channel key from `ECHO_WEBHOOK_KEY_<CHANNEL_UPPER>`. 18 channels mapped.
- [ ] `backend/lib/transactions.py` — `with_transaction(fn)` wraps callable in Mongo txn if supported, falls back to non-atomic.
- [ ] `backend/lib/structured_logging.py` — One-line JSON per record. Configured BEFORE Sentry init in server.py. `ECHO_LOG_LEVEL` env var.

### Tests
- [ ] `backend/tests/test_tenant_isolation_contract.py` — 6 contracts proving cross-tenant leakage is impossible across D27-touched modules. CI runs on every PR.

### Documentation
- [ ] `docs/adr/0001-mongodb-event-store.md`
- [ ] `docs/adr/0002-fastapi-python-backend.md`
- [ ] `docs/adr/0003-d17-fuse-box-pattern.md`
- [ ] `docs/adr/0004-tenant-isolation-contract.md`
- [ ] `docs/adr/0005-doctrine-as-enforced-contract.md`
- [ ] `_PRODUCTION_READINESS.md` (repo root) — Single source of truth: what's ready, what's seam, what infrastructure decisions still need the human.

### CI
- [ ] `.github/workflows/ci.yml` — 4 jobs: python-tests, semgrep, lint-syntax (py_compile every backend module), node-build.

---

## D51–D52 · Chef P&L Review + Quarantine Sweep + Sommelier Salvage

Branch: `claude/D51-D52-chef-pnl-and-quarantine` · 2 commits

### D51 · Chef P&L review
- [ ] `backend/echo/chef_pnl_review.py` — Registered as `echo_chef_pnl_router` in server.py.

### D52 · Quarantine + sommelier knowledge salvage
- [ ] `_quarantine/client/imported/` — 59M moved from `client/imported/` (zero references in code).
- [ ] `_quarantine/client/MixologySommelier-archive/` — 44M moved from `client/modules/MixologySommelier/archive/`.
- [ ] `client/modules/MixologySommelier/lib/sommelier-knowledge/` — 5 files + README. Includes `pairing.js` (7-feature wine-food scorer: acidity_match, salt_vs_acid, fat_vs_tannin, sweet_vs_heat, umami_penalty, intensity_match, aromatic_bridge), `grape-db.json` (5 varietals), `food-flavor-map.json`.
- [ ] `client/modules/MixologySommelier/lib/liquor-knowledge/` — 5 files + README. Includes `liquor-db.json`, `liquor-rules.js` (substitution + legality), `price-intel.js` (9-category price bands), `label-ocr.js`, `liquor-entities.js`.
- [ ] `client/modules/MixologySommelier/schemas/` — `wine.schema.json`, `liquor-entity.schema.json`.
- [ ] `docs/ops-runbooks/SECURITY_BASELINE.md`
- [ ] `docs/ops-runbooks/MONITORING_RUNBOOK.md`
- [ ] `docs/ops-runbooks/PERFORMANCE_BUDGETS.json`
- [ ] `docs/ops-runbooks/QA_SMOKE_TEST_PLAYBOOK.md`
- [ ] `docs/ops-runbooks/DEPLOY_CHECKLIST.md`
- [ ] `docs/ops-runbooks/PROD_DEPLOY_CHECKLIST.md`
- [ ] `docs/ops-runbooks/HEALTH_CHECKS.md`
- [ ] `docs/ops-runbooks/ACCESSIBILITY_CHECKLIST.md`

---

## D49–D50 · Tip Share + Reservation Channels

Branch: `claude/D49-D50-tipshare-and-reservation-channels` · 1 commit

### D49 · Tip share engine + what-if simulator
- [ ] `backend/routes/tip_share_engine.py` — Endpoints under `/api/tip-share`: `GET/PUT /policy/{outlet_id}`, `POST /allocate/{outlet_id}`, `POST /simulate/{outlet_id}` (side-by-side current vs proposed), `GET /allocations/{outlet_id}`. Registered as `tip_share_router`.
- Policy contract: `pool_basis` (total | credit_card_only), `shares` ({role: points}), `auto_distribute`, `manager_overrides`.
- Allocation math: weight = role_share × hours; share = pool × weight/Σweights.

### D50 · 18-channel reservation manager
- [ ] `backend/routes/reservation_channels.py` — `/api/reservation-channel/*`: `GET /channels`, `POST /connections`, `POST /inbound` (dedupe on (channel, external_id), table-collision 409 with alternatives), `GET /unified/{outlet_id}`, `POST /availability/sync`, `POST /reservations/{id}/cancel`. Registered as `reservation_channels_router`.
- Channels catalog (18): **Restaurant (6)** OpenTable, Resy, Tock, SevenRooms, Yelp Reservations, TheFork. **Hotel OTA (5)** Booking.com, Expedia, Marriott CRS, Hilton CRS, Google Hotel Ads. **Spa (4)** MindBody, Booker, Vagaro, Acuity. **Activities (3)** Viator, GetYourGuide, Klook.

---

## D48 · PMS Core (Reservations + Folio + Channel Manager + Metrics)

Branch: `claude/D48-pms-core` · 1 commit

- [ ] `backend/routes/pms_core.py` — Endpoints under `/api/pms`:
  - `POST /reservations` (create), `GET /reservations` (search), `GET /reservations/{id}` (detail with folio)
  - `POST /reservations/{id}/check-in` (assign room + open folio + pre-post nightly room charges)
  - `POST /reservations/{id}/check-out` (close folio, room → dirty)
  - `POST /reservations/{id}/cancel`
  - `POST /availability` (rate plans × room types over a window)
  - `POST /folios/{folio_id}/charge` (room/fnb/spa/ird/retail/tax/fee/other)
  - `POST /folios/{folio_id}/payment` (cc/cash/check/comp/ach)
  - `GET /folios/{folio_id}`
  - `POST /channel/inbound` (OTA push), `GET /channel/outbound/inventory` (ARI feed)
  - `GET /metrics/{property_id}` (occupancy, ADR, RevPAR)
- [ ] Registered as `pms_core_router`. 14 test cases cover the live flow.

---

## D47 · Full Payroll Engine + Self-Service + Job Share + Schedule Request

Branch: `claude/D47-payroll-and-self-service` · 1 commit

### Payroll runs (admin) `/api/payroll`
- [ ] `POST /api/payroll/run/{outlet_id}` — walks time_clock, calcs regular/daily-OT/weekly-OT, federal via IRS Pub 15-T, FICA (OASDI 6.2% to cap, Medicare 1.45%+0.9%), state via tax_tables (5% fallback).
- [ ] `GET /api/payroll/runs/{run_id}` — detail + paystub roster.
- [ ] `POST /api/payroll/runs/{run_id}/post` — lock run + generate ACH batch (masked account at rest) + update YTD. Idempotent.
- [ ] `POST /api/payroll/year-end/w2/{tax_year}` — generate W2s (boxes 1/2/3/4/5/6/16/17). Idempotent on (tax_year, employee_id).

### Self-service MyEcho `/api/myecho/payroll`
- [ ] `GET /paystubs`, `GET /paystubs/{id}`, `GET /w2/{tax_year}`, `GET/PUT /direct-deposit` (account number masked), `GET /ytd`.

### Job share + schedule request
- [ ] `POST /api/myecho/job-share` — post own shift. `GET /offers` — list claimable (same-dept, not own). `POST /{offer_id}/claim` — reassign + record swapped_from.
- [ ] `POST /api/myecho/schedule-request` — time_off / specific_shift / prefer_avoid.

### Files
- [ ] `backend/routes/payroll_engine_full.py` (or similar) — registered as `payroll_engine_full_router`, `payroll_self_service_router`, `payroll_job_share_router`, `payroll_schedule_request_router`. 13 test cases.

---

## D46 · Vendor Mobile Ordering

Branch: `claude/D46-vendor-mobile-ordering` · 1 commit

- [ ] `backend/routes/vendor_mobile_ordering.py` — Endpoints under `/api/vendor-order`:
  - `POST /voice` — free-form transcript → parsed line items (qty + unit + sku_hint) → SKU resolution via supplier_catalog.
  - `POST /compare` — cross-vendor composite score = unit_price / on_time_rate (D30 fingerprint integration). Cheapest-but-unreliable doesn't always win.
  - `POST /sub-suggest` — out-of-stock sub via item_mapping or same-category fallback.
  - `POST /draft` — group lines by vendor, persist draft + per-vendor POs, surface in D39 activity drawer.
  - `POST /submit/{draft_id}` — approve + submit, stamp external_po_id. Idempotent.
- [ ] Registered as `vendor_mobile_ordering_router`. 10 test cases.

---

## D33 · POS-Down Failover + 8h Heartbeat + Auto-Reconcile

Branch: `claude/D33-pos-failover` · 2 commits

### Core failover
- [ ] `backend/routes/pos_failover.py` — Endpoints under `/api/pos-failover`:
  - `POST /sessions` — GM activates failover, returns session_token + qr_payload URL.
  - Session token PWA loads EchoLayout floor plan; servers take orders; orders fan out to KDS via kitchen_routing.
- [ ] Registered as `pos_failover_router`.

### D33-followup (added in same branch)
- [ ] Defaults: `DEFAULT_SESSION_HOURS = 8` (was 4), `MAX_SESSION_HOURS = 24` (was 12), `POS_AUTO_RECONCILE_ON_RECOVERY = True`.
- [ ] `POST /heartbeat/pos-status` — PWA pings every 60s. On false → true transition AND active failover session, `_do_reconcile()` fires with `trigger=auto_recovery:pwa_heartbeat`.
- [ ] `GET /heartbeat/{session_token}` — server PWA keepalive + next-ping interval + last_pwa_seen_at stamping.
- [ ] `_do_reconcile()` shared between manual + auto paths (no drift). Idempotent: orders with `pos_external_id` skipped.

### Test coverage
- [ ] 17 (original D33) + 11 (followup) = 28 test cases.

---

## D31–D60 · Bulk Merge

Branch: `claude/D31-D60-bulk-merge` · ~20 merge commits

This branch is a roll-up of D31 through D60 sub-merges. The included sub-tickets (each verifiable independently):

- [ ] **D10–D11**: smoke tests + unified schedule view
- [ ] **D31**: EchoWaste deep integration
- [ ] **D32**: concierge depth
- [ ] **D34**: MyEcho install + tablet
- [ ] **D35**: cross-dept borrow PAF
- [ ] **D36**: service auditors framework
- [ ] **D37**: QR library + storyboard
- [ ] **D38**: cross-correlation engine
- [ ] **D39–D40**: activity drawer + voice + recipe scan
- [ ] **D41–D42**: stress harness + chef divergence
- [ ] **D43**: variance + complaint diffusion + FOH auditor
- [ ] **D44**: orphan module wiring + onboarding alias fix
- [ ] **D45**: personal sous chef voice agent
- [ ] (D46/D47/D48/D49-D50/D51-D52/D53/D54/D55-D60 — covered separately above)

**Verification:** any module listed above should have a corresponding `backend/routes/<module>.py` and an entry in `server.py`.

---

## D11a · Chronos Profile-Driven Outlet Assignment

Branch: `claude/D11a-user-roles-into-scope` · 1 net commit

- [ ] `backend/routes/chronos.py` — `_resolve_user_scope` now reads `admin_users` + `user_roles` BEFORE falling back to hardcoded ROLE_OUTLET_ACCESS. Carries `_assignment_source` for review.
- [ ] `_scope_from_outlet_ids(outlet_ids, role)` derives scope shape: `["all"]` → all_properties; multi-outlet 1 property → outlets tier; multi-outlet N properties → properties tier (district-chef landing); empty → ROLE_OUTLET_ACCESS fallback.
- [ ] `_outlets_for("properties", ...)` honors explicit `outlet_ids` filter.
- **Outcome:** admin-created profile with 4 restaurants assigned to a CDC now lands that CDC on exactly those 4 outlets via Chronos.

---

## D9 · Chronos Profile-Driven Drill-Down + CDC Role Fix

Branch: `claude/D9-chronos-property-drill-down` · 1 net commit

### Backend
- [ ] `backend/routes/access_matrix.py` — Adds `chef-de-cuisine` (depts=[chronos_view, culinary, pastry, purchasing]) and `district-chef` (extras=[reports-hub, atlas-regional]). Both land on Chronos.
- [ ] `backend/routes/chronos.py` — `ROLE_OUTLET_ACCESS` gains district-chef + CDC. `ROLE_LANDING_TIER` map: district/regional → properties, CDC → outlet, default → outlets.
- [ ] `_outlets_for()` handles "properties" scope. `_properties_for()` / `_property_card()` compute property-level KPIs.
- [ ] `/api/chronos/portfolio` response carries `view_tier` + `property_cards`. Auto-collapses: 1 property → outlets tier; 1 outlet → outlet tier.
- [ ] `GET /api/chronos/property/{id}?user_id=…` — outlets-in-property drill, 403s on no access (no leak).

### Frontend
- [ ] `client/modules/Chronos/index.tsx` — Reads `view_tier` from server, renders PropertyCardView (district/regional) or Outlet grid. Breadcrumb with back-button. CDC auto-open: `tier="outlet"` + 1 outlet → ops view opens automatically.

---

## D8 · Modular Framework — FeatureFlagService End-to-End

Branch: `claude/D8-modular-framework` · 1 net commit

- [ ] `server/lib/module-gate.ts` — `isModuleEnabledForOrg(name, orgId)` with 60s cache; `requireModuleEnabled(name)` Express middleware (503 + structured body when disabled); KNOWN_MODULES (13 modules). Fail-open by default; `MODULE_GATE_FAIL_CLOSED=true` reverses.
- [ ] `server/routes/modules.ts` — admin list/get/toggle. Toggle requires `ADMIN_TOKEN`. Supports global + per-org (`targetType="org_ids"`). Invalidates gate cache after write.
- [ ] `server/index.ts` — `requireModuleEnabled` applied to `/api/aurum`, `/api/aurum/approvals`, all schedule mounts, `/api/echolayout`.
- [ ] `client/lib/useModuleEnabled.ts` — React hook + `useAllModules`; 60s in-memory cache (one fetch for 13-entry sidebar).
- [ ] `client/components/admin/ModuleSettings.tsx` — admin panel grouping modules by category with per-module toggle.

**Currently gated:** aurum, schedule, echolayout, modules. **Not gated yet (intentional):** 9 more modules in registry — wire as consumers stabilize.

---

## D7 · 5 EMERGENT Modules — Import-Shadow Fix + AI³ Shim

Branch: `claude/D7-emergent-module-backends` · 1 net commit

### Engineering import-shadow bug (load-bearing fix)
- [ ] `backend/server.py` previously had 3 imports all aliased to `eng_ops_router` (lines 117, 169, 182) — each shadowed the prior. Engineering UI's calls to `/api/eng-ops/kpis`, `/today`, `/assets`, `/pm-schedule`, `/utilities` were 404-ing. Now each import has its own variable: `eng_work_tickets_router`, `eng_ops_router`, `eng_ops_notifications_router`. All three routers live.

### AI³ intelligence shim
- [ ] `backend/routes/intelligence_ai3.py` — deterministic seeded insights for foh/spa/retail/security/engineering/housekeeping. Catch-all `/api/intelligence/ai3/{module}`. Each insight: `{title, message, severity, confidence, generated_at, source_signals}`.

**Modules now functional in demo:** FOH (10+ endpoints + AI³ panel), Spa (10), Retail (5), Engineering (15 — was broken by shadow, NOW fixed), Security (client-only mock, no backend needed).

**Honest scope note:** Spa + Retail revenue events to EchoAurum NOT yet emitting journal entries — separate followup.

---

## D6 · Chronos Outlet Card Morph (Portfolio Grid → Fullscreen Ops View)

Branch: `claude/D6-chronos-outlet-morph` · 1 net commit

- [ ] `client/modules/Chronos/index.tsx` — `OutletCard` wraps outer container in `motion.div` with `layoutId="chronos-outlet-{id}"`. Click → framer-motion shared-layout transition computes card → fullscreen geometry, runs spring (stiffness 220, damping 30) in 300–500ms.
- [ ] Backdrop fades to 55% black on enter, click to close. Morph window `fixed inset-3 md:inset-6`.
- [ ] `whileHover` lifts card 3px (replaces prior CSS hover).
- [ ] Portfolio stays mounted underneath with `blur(6px) saturate(0.6)` filter.
- [ ] Back button inside `ChronosOpsView` reverses the animation via `AnimatePresence` exit.

---

## D5 · EchoLayout Kitchen-Design Tab (Option B)

Branch: `claude/D5-echolayout-kitchen-tab` · 1 net commit

### Database
- [ ] Migration `079_layout_designs_kitchen.sql` — extends `layout_designs` with `design_type` ('event'|'kitchen'|'custom'), `equipment`, `utility_zones`, `thermal_zones`, `compliance` JSONB. New `kitchen_equipment_catalog` table (~30 NSF-listed items across cooking, refrigeration, prep, dish, storage, bar, pastry).

### Algorithm
- [ ] `server/services/echo-layout/kitchen-algorithm.ts` (~440 LOC). 5 workflows: line_kitchen, banquet_prep, pastry_bakery, bar_only, ghost_kitchen. `buildStationGrid` (front strip hot line + expo, 4ft aisle, back strip walk-in/cold prep/dish/storage). `packStation` honors per-equipment side clearances. `buildThermalZones` (groups by thermal_class, bbox + BTU). `buildUtilityRuns` (gas/water/electric routing). `checkCompliance` (6 rules: hand-sink coverage, 3-comp-sink, walk-in for banquet, hood for cooking, ADA aisle, gas >500K BTU warning, per-equipment clearance).

### Routes
- [ ] `server/routes/echolayout-kitchen.ts`:
  - `GET /api/echolayout/kitchen/equipment-library`
  - `POST /api/echolayout/kitchen/design` (auth)
  - `POST /api/echolayout/kitchen/designs` (auth, persist)
  - `GET /api/echolayout/kitchen/designs/:id`

### UI
- [ ] `client/modules/EchoLayout/client/components/KitchenDesigner.tsx` (~600 LOC) — workflow picker, room inputs, equipment library browser (category-tabbed), SVG canvas (room outline, thermal gradient red/amber/blue, equipment rects, utility runs in orange/blue/dark-blue/red/gold, dashed for electric), totals card, compliance card.
- [ ] `EchoLayoutDashboard.tsx` — new `kitchen-design` View type, ChefHat icon card, renders `KitchenDesigner`.

---

## D4 · Chronos Live Tiles + POS Check-Close Bus Event

Branch: `claude/D4-chronos-live-tiles` · 1 net commit

### Live tiles
- [ ] `backend/routes/chronos_live_tiles.py` (~280 LOC) — `merge_live_tiles(seeded, db, outlet_id)`. Per tile `_source` tag: `live` | `derived` | `seed`. Wired tiles: `net_sales`, `covers`, `avg_check`, `labor_pct`, `inventory`, `purchases`, `food_cost`. `_safe_query` wraps each DB call → fallback to seed with `_basis: "no live data"`.
- [ ] `chronos.py outlet_detail` calls `merge_live_tiles`, adds `_meta` with live/derived/seed counts + `computed_at`.

### POS bus event
- [ ] `server/services/pos-integration-layer.ts` — `storeTransaction` emits `POS_CHECK_CLOSED` on the unified bus when `payment_status === 'completed'`. Payload: `transactionId`, `checkId`, `outletId`, `orgId`, `subtotal/tax/tip/total`, `itemCount`, `transactionDate`, `posType`.

**Honest scope:** 9 tiles still seeded (theo_gap, voids_comps, tip_pct, wait, sales_labor_hr, forecast_acc, guardian, sentiment, reo). No UI subscriber consumes `POS_CHECK_CLOSED` yet — needs Socket.IO subscription.

---

## D3 · Receive-from-Truck (Barcode → PO Lookup + Auto-AP Invoice)

Branch: `claude/D3-receive-from-truck` · 1 net commit

### Backend
- [ ] `client/modules/PurchasingReceiving/server/routes/receiving.ts`:
  - `+/po-lookup` endpoint (~80 LOC) — resolves barcode to vendor + items table, returns item info + matching PO line.
  - `+autoCreateAPInvoiceFromCheckins()` helper (~95 LOC) — runs after summary upsert in `/complete`. Resolves vendor, looks up items by (vendor_id, sku) for last_cost, computes subtotal, best-effort PO link via `delivery_schedules.po_numbers[0]`, inserts `invoices` row (status='new') + `invoice_lines`. Number format: `AUTO-{shipmentId}-{ts}`. Non-blocking.
  - Receiving summary response carries `auto_ap_invoice_id`.

### Frontend
- [ ] `client/modules/PurchasingReceiving/client/components/receiving/ItemCheckinForm.tsx:51` — TODO replaced with real fetch flow. Fallback to manual entry with SKU prefilled if lookup misses.

### Mount
- [ ] `server/index.ts` mounts receiving router at `/api/receiving` (was previously unmounted — entire flow was hitting nonexistent endpoints).

---

## D2 · Voice-Driven Inventory Count

Branch: `claude/D2-voice-driven-inventory` · 1 net commit

### Backend
- [ ] `server/routes/voice-transcribe.ts` — `POST /api/voice/transcribe`, multipart audio (field "audio"), thin Whisper wrapper. Returns 503 `provisioned: false` when `OPENAI_API_KEY` unset. multer in-memory, 25MB limit. Uses openai SDK `toFile()` helper.

### Frontend
- [ ] `client/.../hooks/useVoiceCapture.ts` (~174 LOC) — MediaRecorder + permission handling, state machine `idle → requesting-permission → recording → uploading → done | error`. Mime types: webm/opus, webm, mp4, ogg. 250ms chunk emission. Imperative API: start/stop/reset.
- [ ] `client/.../components/inventory/VoiceCaptureButton.tsx` (~138 LOC) — Tappable mic button, two modes (tap-toggle / hold-to-talk). Quote card shows heard transcript.
- [ ] `client/.../components/inventory/MobileCountSession.tsx` — Voice/manual toggle, voice is default. `handleVoiceTranscript` runs `parseVoiceInput()`. HIGH_CONFIDENCE ≥ 0.7 + matched itemId → straight to records list; below threshold → confirmation card with Accept/Edit/Discard.

### Wiring
- [ ] `server/index.ts` mounts `/api/voice` at the voice-commands neighborhood.

---

## D1 · EMERGENT Cleanup — 3 Safe Deletions

Branch: `claude/D1-emergent-deletions` · 1 net commit

### Deleted (verify they're gone)
- [ ] `client/modules/CulinaryRecipeBuilder/` — shadow of Culinary's canonical recipe builder. Sidebar entry removed (was line 162). Panel-registry entry removed (was line 1103).
- [ ] `client/modules/Dashboard/` (4 files: DashboardModule.tsx, hooks.ts, index.tsx, types.ts) — old dashboard superseded by Chronos. panel-registry "dashboard" entry removed (was line 521).
- [ ] `backend/routes/invoice_ocr.py` — superseded by `invoice_ingest.py` (iter253 pipeline). Import + include_router removed from server.py (lines 89, 596).

### Deferred (intentionally NOT deleted)
- [ ] `client/modules/Maestro/` — PurchasingReceiving imports from `@modules/Maestro/committee` (live consumers). Need to migrate committee logic to `shared/` first.
- [ ] `client/components/dashboard/DetailedPnLView.tsx` — chain runs DetailedPnLView → FinancialHealthPanel → FinancialHealthWidget → DashboardWidgetSystem → RestaurantDashboard. Verify RestaurantDashboard is dead before pulling.

### Post-deletion verification
- [ ] Sidebar: 131 panelIds (was 132 — `CulinaryRecipeBuilder` removed).
- [ ] panel-registry: 2 fewer entries (`dashboard`, `culinary-recipe-builder`).

---

## Conflict-resolution decisions Emergent should be aware of

| Where | Decision |
|---|---|
| `docs/UX_ICON_SYSTEM.md` (D63 vs preview-swap) | Kept the **D64-aesthetic-corrected** version (newer). |
| `backend/server.py` route registrations (8 merges) | **Union** of both sides — every router from every branch preserved. Final dedup pass dropped 7 duplicate imports + 13 duplicate `include_router(…)` calls. |
| `backend/scheduler.py` (D55-D59) | Union — both D63 outlet-capture jobs AND D53 data-retention cron preserved. |
| `echo.invoice_extractor` | Imported under TWO aliases: `echo_invoice_extractor_router_d63` (D63 block) is canonical. The D51-D52 import of the same router was dropped to avoid double-mount. |

---

## What Emergent should produce

After diffing the synced workspace against this checklist, write `/app/memory/D63_RECOVERY_REPORT.md` with three sections:

1. **✅ Verified present + wired** — items in this checklist that exist in code AND are reachable from a user action.
2. **🟡 Present but dangling** — code exists but no UI consumer / no route registration / no entry in panel-registry.
3. **❌ Missing entirely** — checklist item with no corresponding file in the synced tree.

For each item in (2) and (3), include the checklist line number from this file plus a one-line proposed fix.

---

Generated by Claude Code on the web during the PR #72 consolidation pass.
Branch: `chore/D63-recovery-consolidated`
Date: 2026-05-11
