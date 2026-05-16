# Fresh Meal Program — Industry-Standard Upgrade Plan
**Owner:** William · **Drafted:** Feb 2026 (iter192) · **Status:** APPROVED, PARKED until Mobile Build 4 complete
**Source spec:** Claude "LUCCCA Fresh-Packed Meal Platform — Emergent Build Specification"

> **Intent:** promote the existing `FreshMealSystems` module (currently a 10-tab UI shell with no backend) into the category-defining operating system for fresh-packed meal programs, aligned with the 7 architectural revelations in the Claude spec. Ship each upgrade *complete at its depth* — no half-done modules.

---

## 0 · Current State Audit (iter192)

| Layer | Reality |
|---|---|
| **UI panel** | `/app/client/modules/FreshMealSystems/index.tsx` — 931 lines, 10 tabs (Ops Center, Overview, Production Runs, Assembly, Packaging, Subscriptions, Distribution, Forecasting, Margin, Safety, Routing) |
| **Backend routes** | ❌ **None wired.** Frontend calls `/api/fresh-meals/*` but no route file exists. Tests (`test_fresh_meal_systems.py`, iter33/34/43) all reference endpoints that 404 in production. |
| **Tests on disk** | `/app/backend/tests/test_fresh_meal_systems.py` (609 lines) · `test_iteration33_ops_dashboard.py` · `test_iteration34_security_hardening.py::TestFreshMealSystemsEndpoints` · `test_iteration43_refactor_cost_tracker.py::TestFreshMealsRegression` |
| **Adjacent LUCCCA assets to leverage** | `kitchen_production.py` · `production_engine.py` · `production_schedules.py` · `inventory_receiving.py` · `purchasing_hub.py` · `purchasing_engine.py` · `compliance.py` · `kitchen_routing.py` · `culinary_notes.py` · `recipe_import.py` · `echoai3_evolution.py` · `my_schedule.py` · `hours_of_operation.py` · `leadership_coverage.py` |

---

## 1 · 10 Non-Negotiable Quality Bars — Current Pass/Fail

| Bar | Pass/Fail | Notes |
|---|---|---|
| Every state change emits TimelineEvent | ❌ | 6+ fragmented logs; no unified stream |
| Recipe change cascades to nutrition/allergens/cost/labels | ❌ | Recipes are flat, no graph |
| Every benchmark is explainable (peer-set + method) | N/A | No benchmarking yet — lock UX contract before shipping |
| Echo actions reversible + auditable (rungs ≤ 3) | ❌ | No rung system |
| Labels pass FDA 21 CFR 101 validation | ❌ | No label generator |
| Mock recall < 5 s forward+back trace | ❌ | No lot-level inventory |
| Floor surface offline-capable | ⚠️ | iter192 added offline cache for Group Events only |
| Customer interactions → Timeline | ⚠️ | Scattered in guest_concierge |
| Sensitive ops audit trail | ⚠️ | Admin-gated but not unified |
| Perf: <200 ms panel · <2 s cross-entity query | ✅ | Current panels meet bar |

**Verdict:** 7 of 10 bars fail. Industry-standard claim blocked until P0 shipped.

---

## 2 · The 7 Revelations — Gap Table

| # | Revelation | LUCCCA Today | Gap → Build |
|---|---|---|---|
| 1 | **TimelineEvent** — one primitive every entity emits on state change | Fragmented logs (`echoai3_evolution`, `concierge_liability`, `briefing_push_log`, `email_outbox`, `dismissal_audit`, `billing_runs`) | One `timeline_events` collection + `lib/timeline.py` emitter. Drives audit, recall graph, activity feed, Echo training, cycle-time metrics. **Six wins from one primitive.** |
| 2 | **Recipe is a graph** — RecipeNode DAG, cost/nutrition/allergens propagate up | Flat ingredient lists (`recipe_import.py`) | `recipe_nodes` model + graph walker + save-cascade → dirty-mark dependent recipes → queue label regen |
| 3 | **Channel is first-class** (b2c_sub, b2b_corp, clinical, retail…) — not a customer tag | Scattered: Concierge, Showrooms, Group Events, Guest app — each reinvents pricing/SLA/labels | `channels` collection with `{pricing_rules, label_format, cadence, sla, menu_subset, compliance}`. `Order/Pack/Label` all get `channel_id`. |
| 4 | **Pack is atomic** — one physical container with lot composition + temp history + label | Only `Order` exists (in guest_concierge, IRD) — no Pack | `packs` collection `{order_id, lot_composition[], pack_date, expiry_date, temp_history[], label_id, status, weight, batch_id}`. Kitchen and labels operate on Packs. |
| 5 | **Echo Permission Ladder** (0 Observe → 4 Autonomous) per capability | Binary on/off | `echo_capabilities` config doc; guardrail engine enforces reversibility window at rung ≥ 3 |
| 6 | **Glass-Box Benchmarks** — always show peer-set + sample + method | No benchmarks yet | Ship `<Benchmark>` React component **now** with required props `{value, peerSet, sample, method, recommendation}` — enforces contract before first black-box sneak-in |
| 7 | **Kitchen Calendar** — weekly tempo primitive that shifts UI + brief | Fragmented (`hours_of_operation`, `my_schedule`, `leadership_coverage`) | `kitchen_calendar` primitive `{monday: 'prep', tuesday: 'pack', …}`. Morning brief tone + UI defaults + notification urgency keyed off today's `DayType`. |

---

## 3 · Phased Upgrade Roadmap

### 🔴 PHASE P0 — "Foundation Pack" (mandatory — must ship together)

#### FM-Upgrade 1 · TimelineEvent primitive
**Why first:** highest leverage — one primitive unlocks audit, recall, activity feed, Echo training, cycle-time metrics, SLA enforcement.

**Scope**
- New MongoDB collection `timeline_events` with index on `(tenant_id, entity_refs.id, timestamp)`, `(type, timestamp)`, `(actor.id, timestamp)`
- `/app/backend/lib/timeline.py` with:
  - `emit(event_type: str, actor: dict, entity_refs: list[dict], payload: dict, location: dict | None = None) -> str`
  - `query(entity_id: str, direction: Literal["forward","backward","both"] = "both", limit: int = 500) -> list[TimelineEvent]`
  - `cycle_time(from_type: str, to_type: str, entity_id: str) -> timedelta | None`
- **Wire order** (hottest 6 routes first, one PR each):
  1. `guest_concierge` (orders, VIP, IRD) → `order.placed`, `order.status_changed`
  2. `inventory_receiving` → `lot.received`, `case.accepted`, `case.rejected`, `lot.quarantined`
  3. `purchasing_engine` → `po.drafted`, `po.approved`, `po.sent`, `po.received`
  4. `production_engine` → `batch.planned`, `batch.started`, `batch.completed`, `batch.held`
  5. `kitchen_production` → `ccp.logged`, `batch.cooled`, `yield.recorded`
  6. `daily_standup` → `standup.sent`, `mobile_push.dispatched` (already partially wired)
- **UI**: new `Activity` panel (module key `activity-timeline`) — live tail + filter chips (by type / actor / entity) + entity drill-down
- **Fresh Meal Ops Center**: embed the top-10 most-recent TimelineEvents as a live strip

**API surface (new)**
```
POST /api/timeline/query  { entity_id?, type?, actor?, from?, to?, limit? }
GET  /api/timeline/stream (SSE)  live tail for tenant
GET  /api/timeline/recall/:lot_id  → forward+backward trace (<5 s target)
GET  /api/timeline/cycle-time?from=&to=&entity_id=
```

**Success metrics**
- Mock recall of any lot returns forward+backward trace in **< 2 s** (target: beat Claude's <5 s bar)
- Activity feed shows >10 events/min in a live kitchen session without UI jank
- All 6 wired routes emit exactly once per state change (idempotency key: `{entity_id}:{event_type}:{timestamp_ms}`)

**Tests**
- `backend/tests/test_fm1_timeline.py` — unit + integration for all 6 hot routes
- Playwright: Activity panel live tail, filter, drill-down
- Recall benchmark test: seed 100 lots × 5 batches × 50 packs, assert `<2s` recall

---

#### FM-Upgrade 2 · RecipeNode graph + cascade
**Why together with 1:** labels depend on graph; graph depends on traceability to work.

**Scope**
- New collection `recipe_nodes` `{id, type: "ingredient"|"sub_recipe", parent_id, ingredient_id?, sub_recipe_id?, quantity, scale_factor, computed_{nutrition,allergens,cost,yield}}`
- `Recipe` gets `root_node_id` field
- `/app/backend/lib/recipe_graph.py`:
  - `walk(root_node_id) -> dict[node_id, computed]`
  - `propagate(changed_node_id)` → marks dependent recipes dirty
  - `computed_at_root(recipe_id) -> {nutrition, allergens, cost, yield}`
- Save-hook on `PUT /api/recipes/:id`:
  - Diff old vs new graph
  - Dirty-flag all ancestor recipes
  - Queue `label.regeneration_required` events
- UI: `CulinaryRecipeBuilder` gets nested sub-recipe composer (collapsible tree) + live nutrition/allergen panel that recomputes on every edit

**Success metrics**
- Change "peanut-sauce" sub-recipe → 12+ parent recipes' nutrition/allergens update within 500 ms
- FDA 21 CFR 101-compliant ingredient statement auto-generated (descending weight order, allergens bold)
- Zero stale nutrition panels after a node edit

**Tests**
- `backend/tests/test_fm2_recipe_graph.py` — cascade, cycles detection, yield propagation
- FDA validator: test 20 recipes against 21 CFR 101 spec

---

#### FM-Upgrade 3 · Pack primitive + Fresh Meal backend revival
**Why:** unblocks the entire 10-tab module that currently 404s.

**Scope**
- New `routes/fresh_meal_systems.py` — implement the 18 endpoints the frontend + tests already expect:
  ```
  GET  /api/fresh-meals/ops-dashboard
  GET  /api/fresh-meals/overview
  GET/POST /api/fresh-meals/products          (+ DELETE /:id)
  GET  /api/fresh-meals/production-runs
  GET  /api/fresh-meals/assembly-lanes
  GET  /api/fresh-meals/packaging-options
  POST /api/fresh-meals/packaging/validate
  GET  /api/fresh-meals/subscriptions         (+ /stats)
  GET  /api/fresh-meals/distribution/channels
  GET  /api/fresh-meals/forecast
  GET  /api/fresh-meals/margin-analysis
  POST /api/fresh-meals/safety/check
  GET  /api/fresh-meals/safety/records
  GET  /api/fresh-meals/shelf-life
  GET  /api/fresh-meals/routes
  ```
- New `packs` collection with full atomic schema (see §4)
- `Pack` lifecycle states: `planned → in_production → cooling → packed → staged → out_for_delivery → delivered → consumed` (or `issue`)
- Each transition emits TimelineEvent
- Label generator stub (HTML → PDF via WeasyPrint or headless Chromium) with FDA 21 CFR 101 validator
- Regenerate-on-graph-change hook (from FM-Upgrade 2)
- Fresh Meal module's "Safety" tab wires to real `safety/check` with CCP logs

**Success metrics**
- All 10 tabs in Fresh Meal module render with real data (no 404s)
- Existing test suites (`test_fresh_meal_systems.py` + iter33/34/43 regressions) pass 100%
- Label PDF regenerates automatically when a sub-recipe changes (queued, not blocking)

**Tests**
- Resurrect + re-green `test_fresh_meal_systems.py` (609 lines)
- New `test_fm3_pack_lifecycle.py` + `test_fm3_label_fda.py`

---

### 🟡 PHASE P1 — "Operator Trust Layer"

#### FM-Upgrade 4 · Channel entity + Kitchen Calendar
- `channels` collection with `{type, pricing_rules, label_format, cadence, sla, menu_subset[], compliance_requirements[]}`
- Migrate scattered channel-ish code (Concierge/Showrooms/Group Events/Guest app) to reference `channel_id`
- `kitchen_calendar` primitive driving:
  - Morning brief tone (prep-day = "tight PO review", pack-day = "label audit", delivery-day = "route sweep")
  - Dashboard default view per day-type
  - Notification urgency thresholds

#### FM-Upgrade 5 · Echo Permission Ladder
- `echo_capabilities` config doc (per-tenant)
- Defaults from Claude spec §4 table (brief=4, anomaly=4, PO draft=2, etc.)
- Guardrail engine: rung ≥ 3 requires 1-hour reversibility window (undo token stored on TimelineEvent)
- UI: per-capability slider in Echo settings panel, with confidence-gating ("must run 20 observed runs before unlocking rung 2")

---

### 🟢 PHASE P2 — "Network + Surfaces"

#### FM-Upgrade 6 · Glass-Box Benchmark UX Contract (ship UX now, data later)
- `<Benchmark>` React component — required props: `value`, `peerSet: {size, geo, volume_range, channel_mix}`, `sample: {window, n}`, `method: string`, `recommendation?: {action, vendors?}`
- Enforce via TypeScript + lint rule: any new benchmark-shaped render must use this component
- Even before network data exists, single-operator self-benchmarks (week-over-week) render through it → locks the pattern

#### FM-Upgrade 7 · Floor + Route surfaces
- **Floor** (Kitchen Tablet `/floor/:token`): station dashboard, batch execution step-by-step, CCP capture, voice input, portion scale integration, offline-capable (builds on the mobile offline cache pattern from iter192)
- **Route** (Driver mobile): next-stop card, 2-tap POD, BLE cooler temp telemetry, end-of-shift summary

---

## 4 · Core Data Model (TypeScript interfaces, source of truth)

*(Full types from Claude spec §2 — RecipeNode, Recipe, Channel, Pack, Order, Customer, Account, Ingredient, Lot, ProductionBatch, Fulfillment, KitchenCalendar, Label, NutritionProfile, AllergenProfile, CollisionWarning. See Claude spec file kept at `/app/memory/FRESH_MEAL_CLAUDE_SPEC.md` for full verbatim.)*

Key non-obvious decisions:
- **Pack** stores full `lot_composition[]` (not just `batch_id`) so a single-pack recall works without touching production tables
- **TimelineEvent.entity_refs** is an array (not single `entity_id`) because one event can touch 6+ entities (e.g., `pack.sealed` touches pack + order + customer + batch + 3 lots + label)
- **Recipe.actual_yield** is separate from `yield` — populated from rolling 30-day trim data — this is what costing uses, not the theoretical number
- **Channel.menu_subset** allows a single recipe to be available to B2C but not hospital channel without duplicating the recipe

---

## 5 · Migration & Rollout Strategy (zero downtime)

Platform already supports hot reload + rolling deploy via Emergent. Our plan inside that:

1. **Every upgrade ships behind a feature flag** `fm_upgrade_<N>_enabled` stored in `tenant_feature_flags` collection (introduced as FM-Upgrade 0 prerequisite)
2. **TimelineEvent emission** is additive — old logs stay writing until FM-Upgrade 1 is green in production for 14 days, then legacy loggers are retired one-by-one
3. **Recipe graph migration**: run a one-time backfill script that converts every existing flat recipe into a single-node graph, then operators opt-in to splitting sub-recipes
4. **Pack primitive**: existing orders stay on the order-only model; new orders placed *after* flag enable use packs. Backfill only on explicit operator action.
5. **Every phase has a rollback playbook** documented in `/app/memory/FM_ROLLBACK_PLAYBOOKS.md` (to be created with FM-Upgrade 0)

---

## 6 · Definition of Done (per upgrade)

Each upgrade is "done" only when ALL of:
- ✅ Backend tests green (pytest in `/app/backend/tests/test_fm<N>_*.py`)
- ✅ Frontend Playwright tests green (via `testing_agent_v3_fork`)
- ✅ Quality Bars §1 relevant to the upgrade now flip from ❌ → ✅
- ✅ `PRD.md` + `test_credentials.md` updated
- ✅ Feature flag defaults to ON after 72h internal bake
- ✅ Rollback playbook documented
- ✅ Operator-facing changelog note drafted for the in-app release-notes panel

---

## 7 · Execution order (decided)

```
Mobile Build 4 (HR Hiring + Finance tiles)   ← CURRENT PRIORITY (William's call)
     ↓
FM-Upgrade 0 · Feature flag system + rollback playbooks
     ↓
FM-Upgrade 1 · TimelineEvent                 ← P0 start
     ↓
FM-Upgrade 2 · RecipeNode graph
     ↓
FM-Upgrade 3 · Pack + Fresh Meal backend revival
     ↓
[ship P0, bake 14 days]
     ↓
FM-Upgrade 4 · Channel + Kitchen Calendar    ← P1
     ↓
FM-Upgrade 5 · Echo Permission Ladder
     ↓
FM-Upgrade 6 · Glass-Box Benchmark UX
     ↓
FM-Upgrade 7 · Floor + Route surfaces
```

---

## 8 · Open questions to revisit before starting P0

1. **Multi-tenancy**: Claude spec assumes tenanted. Do we keep single-tenant (Luccca-only) or architect for multi-tenant from FM-Upgrade 1? → **Decision:** single-tenant scaffolding, but `tenant_id` column in `timeline_events` from day one.
2. **Label printer integration**: CUPS vs vendor SDK (Dymo, Zebra)? → Defer to FM-Upgrade 3 scope decision.
3. **Scale integration** (USB HID vs BT): defer to FM-Upgrade 7.
4. **Real customer for pilot**: do we pilot on Luccca internal before opening to other operators? → Yes, Luccca-first for Phase P0.

---

## 9 · Links
- Claude source spec: `/app/memory/FRESH_MEAL_CLAUDE_SPEC.md` (verbatim archive)
- Test credentials: `/app/memory/test_credentials.md`
- Key provisioning guide: `/app/memory/how_to_get_keys.md`
- Mobile build runbook: `/app/memory/mobile_build_runbook.md`
- PRD main: `/app/memory/PRD.md` (iter192 section)

---

## 10 · HelloFresh Deep-Dive · What to Include (Feb 2026 research)

Findings from a targeted web scan of HelloFresh's operations platform (AutoStore / Swisslog), plus FSMA 204 (effective **January 2026**) and 2026 FDA priorities. What we borrow, what we improve, what we skip.

### What HelloFresh Does Well (→ we must match or beat)
| Capability | HelloFresh signal | LUCCCA action |
|---|---|---|
| **Throughput automation** | AutoStore: 380 K order-lines/day, 4 K bin presentations/hour, 300 SKUs | Design Pack + Batch schemas to scale linearly. Index TimelineEvent on `(entity_refs.id, timestamp)` from day one. Defer physical automation — our moat is intelligence, not robots. |
| **Cold chain control end-to-end** | Temperature maintained warehouse → delivery | **First-class `temp_history[]` on every Pack** (we already have `TempReading` in Claude spec §2). BLE cooler tags + driver phone ingestion as planned in FM-Upgrade 7. |
| **Supply-chain insights from customer feedback** | Real-time alerts on logistics, procurement, food safety from feedback tools | Close the loop: customer feedback → Echo anomaly detection → auto-drafted supplier/ops actions. Build as FM-Upgrade 5 behaviour. |
| **SKU velocity + swap flexibility** | Rapid menu rotation | Recipe versioning + channel `menu_subset[]` already in spec. No gap. |

### What HelloFresh **Lacks** (→ our moat)
1. **Explicit FSMA 204 traceability** — search found no evidence of TLCs/CTEs/KDEs implementation. **This is the category-open-ing play.** We ship it standard.
2. **Glass-box explainability** — no operator-facing intelligence that *explains* recommendations. Our Echo ladder + benchmark contract is differentiating.
3. **Recipe-as-graph** — HelloFresh (and every peer) treats recipes as flat lists. Sub-recipe cascade is unique.
4. **Channel-as-first-class** — HelloFresh is B2C-only. We serve B2C + B2B + clinical + retail from one graph.
5. **Kitchen Calendar tempo** — no peer software is aware of the operator's weekly rhythm.

### FSMA 204 (effective **Jan 2026** — we're building under the rule)
Mandatory for high-risk foods on the FTL (fresh leafy greens, seafood, soft cheeses, cut fruits/veg, etc.):
- **TLC** — unique alphanumeric Traceability Lot Code, assigned at packing / first receiving / transformation
- **CTEs** — Critical Tracking Events: harvesting, packing, shipping, receiving, transformation
- **KDEs** — Key Data Elements recorded at each CTE
- **Records** retained 2 years
- **24-hour response** to FDA recall request (spreadsheet export)

**Implication for our build:**
1. FM-Upgrade 1 `TimelineEvent.type` enum must include: `lot.tlc_assigned`, `lot.received`, `lot.transformed`, `batch.lot_consumed`, `pack.sealed` (all are CTEs)
2. FM-Upgrade 1 `TimelineEvent.payload` must carry KDEs (commodity, quantity, location, date, source/destination business + address, reference doc)
3. FM-Upgrade 3 `Pack.lot_composition[]` + `Lot.supplierLotNumber` + the new `tlc` field become the spine of the 24-hour FDA export
4. A `/api/timeline/recall/:tlc` endpoint returns **forward + backward** trace as a CSV/JSON bundle ready for FDA submission

### 2026 FDA Front-of-Package (FOP) Nutrition Labeling (proposed — final in 2026)
Highlights: sugars, sodium, saturated fat signal on the front of the package. Already covered by our `Label.content.nutritionFacts` + the recipe-graph cascade; we add a `Label.fop_signals` computed field in FM-Upgrade 3.

### Trends to Integrate (from Clean Eatz 2026 industry report + MightyMeals)
- **Dietitian-designed nutrition data** visible to customer — maps to `Customer.profile.goals` + per-recipe `NutritionProfile`. Surface a "Dietitian score" inline in the Taste surface.
- **Frozen vs chilled format differentiation** — add `Recipe.format: chilled|frozen|ready_to_heat|grab_and_go` (already via `tags`; promote to a first-class enum in FM-Upgrade 2).
- **Flexible / no-subscription** — our `Channel.orderCadence` already handles à-la-carte. No gap.
- **Short delivery windows (days)** — informs our Kitchen Calendar `DayType` cadence.

### What HelloFresh Has That We Won't Copy (Yet)
- AutoStore physical robotics (capex out of scope; we optimise the software layer they sit on top of)
- Customer-facing recipe cards printed on insert paper (defer — digital first)
- Weekly "box" as the atomic customer unit (we stay at Pack — more flexible)

### Net effect on the Upgrade Plan
- FM-Upgrade 1 scope confirmed; TLC + CTE event taxonomy added (see §11 below)
- FM-Upgrade 3 scope expands slightly: `Pack.tlc` field + FDA recall-export endpoint
- New FM-Upgrade 3.5: **FDA 24-hour export** (CSV + JSON bundle) — built on top of TimelineEvent + Pack.lot_composition
- Echo anomaly-detection training corpus = TimelineEvent stream + customer feedback (closes HelloFresh's feedback loop)

---

## 11 · TimelineEvent Type Taxonomy (FM-Upgrade 1 authoritative)

Event types use dot-notation `entity.verb`. All types are lowercase. New types require a PR + update to `/app/backend/lib/timeline_types.py`.

### Procurement & Inventory (CTEs under FSMA 204)
- `po.drafted` · `po.approved` · `po.sent` · `po.received_partial` · `po.received_full` · `po.cancelled`
- `lot.received` · `lot.tlc_assigned` · `lot.quarantined` · `lot.released` · `lot.transformed` · `lot.expired` · `lot.recalled`
- `case.accepted` · `case.rejected` · `case.substituted`

### Production
- `batch.planned` · `batch.started` · `batch.cooling` · `batch.completed` · `batch.held` · `batch.failed`
- `ccp.logged` (temperature/time checkpoint — HACCP) · `yield.recorded` · `waste.logged`

### Packs (atomic operational unit)
- `pack.planned` · `pack.weighed` · `pack.sealed` · `pack.labeled` · `pack.staged`
- `pack.loaded_cooler` · `pack.picked_up_driver` · `pack.delivered` · `pack.consumed` · `pack.issue_raised`
- `pack.temp_excursion` (out-of-range reading)

### Orders & Customers
- `order.placed` · `order.modified` · `order.cancelled` · `order.skipped` · `order.paused` · `order.resumed`
- `customer.goal_updated` · `customer.feedback_submitted` · `customer.churn_risk_flagged`

### Labels & Compliance
- `label.generated` · `label.printed` · `label.invalidated` · `label.regenerated`
- `allergen.cross_contact_detected` · `audit.export_generated`

### Echo & Operations
- `echo.suggestion_made` · `echo.action_executed` · `echo.action_reversed` · `echo.anomaly_flagged`
- `standup.sent` · `mobile_push.dispatched` (already partially wired)
- `feature_flag.toggled` · `migration.run_completed`

### Key Data Elements on every event `payload`
Minimum for FSMA 204 alignment: `commodity`, `quantity`, `unit`, `location_id`, `reference_document_id`, `source_business?`, `destination_business?`. Emitter helpers in `lib/timeline.py` enforce KDE presence for CTE types.

