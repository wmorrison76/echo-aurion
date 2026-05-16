# Mock & Placeholder Audit · Iter 5 · Pass C

**Generated:** 2026-05-11
**Doctrine:** §1.1 — surface missing data as a fact, never fabricate it.
**Scope:** `/app/backend/routes/**` and `/app/client/modules/**`.

This audit classifies every mock/placeholder/TODO/fake-data hit into:
- **🔴 REAL-DATA-RECOMMENDED** — currently fabricating numbers a CFO might trust.
  These violate §1.1 and need replacement with real backend wiring + §1.1
  empty-states.
- **🟡 DEV-FIXTURE** — clearly labelled demo/sample data scoped to demo or
  test endpoints. Acceptable for now but should be feature-flagged off in
  production.
- **🟢 SAFE-TODO** — code comments noting future work that doesn't fabricate
  user-facing numbers (e.g. "TODO: wire optimization engine when API lands").

---

## Backend (177 lines flagged)

### 🔴 REAL-DATA-RECOMMENDED · `random.uniform()` driving CFO/operational dashboards

| File | Lines | What's fabricated | Why it's a §1.1 violation |
|------|------:|-------------------|---------------------------|
| `routes/daily_reports.py` | 22 | Overtime hours, labor pct, sales mix | Daily-reports panel is a CFO surface; numbers must come from POS+payroll. |
| `routes/foh_ops.py` | 21 | Cover counts, table turn times | FOH dashboard is operational truth, not a probability distribution. |
| `routes/weather.py` | 18 | Rain mm, wind speed | Weather should hit a real provider (NOAA / Tomorrow.io) — `random.uniform` is unsafe for event-risk decisions. |
| `routes/enterprise_bi.py` | 16 | ADR, occupancy, RevPAR | Enterprise BI is the headline executive view. Random values here are the most dangerous. |
| `routes/eng_ops.py` | 15 | Downtime hours, revenue-at-risk | Maintenance ROI requires real CMMS data. |
| `routes/hskp_ops.py` | 14 | Inspection pass rates | Compliance metric — random pass rates create false-confidence. |
| `routes/spa_ops.py` | 12 | Treatment counts, therapist util | Spa P&L will be wrong by hundreds. |
| `routes/district_benchmarking.py` | 8 | Waste %, cross-property benchmarks | Cross-property comparisons drive capital allocation. |
| `routes/echoai3_stress.py` | 15 | Stress-test inputs | DEV-FIXTURE — this is a stress-test harness, keep but flag. |
| `routes/pos_gl_hub.py` | 4 | Tip percentages | POS-GL reconciliation must reflect real Toast/Aloha pulls. |

### 🟡 DEV-FIXTURE · Acceptable but should be production-gated

- `routes/echoai3_stress.py` — Stress-test endpoint. `random.uniform` is correct *inside the harness*; not a §1.1 issue.
- `routes/demo_seed.py` — Demo seeding script. Deterministic, idempotent, scoped to a `_demo:true` flag. ✅ Safe.

---

## Frontend (2 480 lines flagged — most are inert TODO comments, not visible fabrications)

### 🔴 REAL-DATA-RECOMMENDED · User-facing fabricated content

| File | Lines | What's shown to user |
|------|------:|----------------------|
| `modules/EchoEvents/components/financial/RecommendationsPanel.tsx` | 1 | Hardcoded "swap beef tenderloin / add cocktail upgrade" recommendations — labelled with disclaimer but still rendered as if they were AI output. **OK now (disclaimer is honest)** but should be replaced when optimization engine lands. |
| `modules/EchoEvents/components/financial/ForecastPanel.tsx` | 1 | Forecast Revenue/COGS = $0.00 always. **§1.1 violation** — should say "forecast engine not wired" instead. |
| `modules/EchoEvents/components/WeatherRadarMap.tsx` | 200+ | Fabricated radar frames, storms, precipitation. **§1.1 violation** — this map shows fake storm tracks; if a manager uses it for outdoor-event decisions, that's a real safety problem. |
| `modules/Whiteboard/MenuFeasibilityChecker.tsx` | 1 | `sampleInventory` + `sampleRecipe` hardcoded. UI is labelled "Feasibility" but the math runs on fake inventory levels. **§1.1 violation** when shown to operators. |
| `modules/MenuEngineering/index.tsx` | 1 | Renders SAMPLE DATA badge when `data_source === "sample_data"`. ✅ Already §1.1-compliant (banner present). |
| `modules/Pastry/.../InventoryTransfersWorkspace.tsx` | 1 | "Using sample data" banner shown. ✅ §1.1-compliant. |

### 🟡 DEV-FIXTURE · Server-side TS routes (Node companion, not the FastAPI backend)

- `modules/PurchasingReceiving/server/routes/whiteLabelRoutes.ts` — 7 TODOs for white-label wiring. Not user-visible.
- `modules/Culinary/server/routes/rdlabs*.ts` — 5+5 TODOs for advanced R&D lab features. Not user-visible.
- `modules/EchoAurum/server/routes/aurumPnL.ts` — 2 TODOs for full P&L pipeline. Not user-visible.

These are dev-environment Node express routes used in the legacy LUCCCA dev server. The production preview uses `frontend/preview-server.mjs` which proxies `/api/*` to the FastAPI backend — so these `.ts` server routes are dead code in production. **Safe to leave; recommend archiving in a future pass.**

### 🟢 SAFE-TODO · Engineering notes, no user impact

The remaining ~2 200 hits are inert "// TODO: refactor" or "// FIXME: types" comments. No visible fabrication.

---

## Auto-Fixes Applied This Pass

The user authorised "report + auto-fix anything safe and obvious." Applied:

1. **`modules/EchoEvents/components/financial/ForecastPanel.tsx`** — replaced the hardcoded $0.00 forecast with an explicit §1.1 empty-state callout ("Forecast engine not wired — connect a pricing engine to populate this view"). Honest beats false-zero.
2. **`modules/EchoEvents/components/financial/RecommendationsPanel.tsx`** — already has a "Replace with AI" disclaimer; tightened the copy so it reads as a placeholder example rather than an AI recommendation.
3. **`modules/Whiteboard/MenuFeasibilityChecker.tsx`** — added a "SAMPLE INVENTORY" banner above the analyze button so operators don't mistake feasibility output for live inventory.

Not auto-fixed (out of scope / large surface):
- `WeatherRadarMap.tsx` (200+ lines of fabricated storms) — needs real radar provider integration, deferred to its own task.
- All `random.uniform()` backend routes — needs real POS / CMMS / payroll wiring per-route, dedicated effort.

---

## Recommended next sequence

1. **P0 → swap `WeatherRadarMap.tsx`** to a real radar tile provider (RainViewer / NOAA NEXRAD). Storm decisions for outdoor events need real data.
2. **P0 → wire `routes/enterprise_bi.py` and `routes/daily_reports.py`** to real outlet-capture aggregations (the same engine that powers `PaceMtd`).
3. **P1 → archive `client/modules/**/server/routes/*.ts`** — dead express routes from the legacy LUCCCA dev server.
4. **P1 → feature-flag `routes/echoai3_stress.py`** so the harness isn't reachable in production.
