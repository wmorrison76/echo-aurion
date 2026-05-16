# Role → Program Access Matrix

**Source of truth**: `/app/backend/routes/access_matrix.py` (code) + this doc.

**Access inheritance rule**: if a role has access to restaurant/outlet details for a department, they automatically get access to every module/program used by that department.

**Tier hierarchy**:
- **admin** — Unlimited (Admin, Owner).
- **enterprise** — Cross-property oversight (Regional Director). Chronos multi-property + Enterprise BI + Finance summary + HR approvals.
- **property** — Whole-property oversight (Director, Exec Dir Finance, GM, F&B Director, Controller). Chronos single-property + every department on property.
- **dept-head** — Property-wide within a single department (Exec Chef, Pastry Chef, Dir Banquets, Events Mgr, Spa Mgr, Dir Engineering, Purchasing Mgr).
- **enterprise-desktop** — Baseline Enterprise Desktop. Sous Chef, Dining Room Manager and up. Their outlet's dept modules, no HR/Finance admin.
- **mobile** — Hourly staff. MyEcho mobile only.

---

## Module Catalogue (by Department)

| Department | Modules |
|---|---|
| **chronos_view** | chronos |
| **enterprise_bi** | reports-hub · enterprise-bi-suite · aurium-gm · atlas-regional |
| **culinary** | culinary-dashboard · recipe-builder · cdc-launchpad · kds · haccp-logs · food-cost-analytics · waste-sheet · station-ops |
| **pastry** | pastry-dashboard · pastry-recipe-builder · pastry-production · pastry-cake-designer · pastry-order-board · allergen-impact-tree |
| **banquets** | maestro-bqt · beo-execution · beo-builder · events-calendar · banquet-floorplan |
| **foh_service** | dining-room-pulse · reservations · floor-map · server-scorecard · mixology-sommelier |
| **beverage** | beverage-ops · beverage-program · beverage-cost · mixology-sommelier |
| **rooms** | hotel-ops · housekeeping · front-desk · guest-experience |
| **spa** | spa-ops · spa-appointments |
| **engineering** | engineering-ops · preventive-maintenance |
| **finance** | financial-reports · enterprise-bi-suite · cost-center-analytics · gl-codes |
| **purchasing** | purchasing-receiving · vendor-master · invoice-ingest · approval-hierarchy · three-way-match |
| **hr** | schedule · manager-workflow · pto · hiring · onboarding |
| **events** | events-manager-board · specials-group-blocks |
| **admin_sys** | admin-onboarding · integration-hub · security-audit · activity-timeline · system-settings · zaro-guardian |

---

## Role → Effective Access

| Role | Tier | Landing | Departments Covered | Extras |
|---|---|---|---|---|
| **admin** | admin | dashboard | ALL | — |
| **owner** | admin | dashboard | ALL | — |
| **regional-director** | enterprise | chronos | chronos_view, enterprise_bi, finance, hr | reports-hub, atlas-regional |
| **director** | property | chronos | chronos_view, enterprise_bi, culinary, pastry, banquets, foh_service, beverage, rooms, spa, engineering, finance, purchasing, hr, events | — |
| **exec-dir-finance** | property | chronos | chronos_view, enterprise_bi, finance, purchasing, hr | — |
| **general-manager** | property | chronos | chronos_view, enterprise_bi, culinary, pastry, banquets, foh_service, beverage, rooms, finance, purchasing, hr, events | — |
| **fb-director** | property | chronos | chronos_view, culinary, pastry, banquets, foh_service, beverage, events, purchasing | — |
| **controller** | property | chronos | chronos_view, enterprise_bi, finance, purchasing | — |
| **executive-chef** | dept-head | chronos | chronos_view, culinary, pastry, banquets, purchasing | beverage-program |
| **pastry-chef** | dept-head | chronos | chronos_view, pastry, banquets, purchasing | — |
| **dir-banquets** 🆕 | dept-head | chronos | chronos_view, banquets, events, purchasing | culinary-dashboard, pastry-dashboard (read BEOs as they happen) |
| **events-manager** | dept-head | chronos | events, banquets | reports-hub |
| **spa-manager** | dept-head | — | spa | — |
| **dir-engineering** | dept-head | — | engineering | — |
| **purchasing-manager** | dept-head | — | purchasing | — |
| **sous-chef** | enterprise-desktop | chronos | culinary, purchasing | — |
| **dining-room-manager** | enterprise-desktop | chronos | foh_service, beverage | — |
| **staff** (hourly) | mobile | myecho-home | — | — |

---

## API

- `GET /api/chronos/access/me?user_id=…` → `{role, tier, landing, modules: [...], depts: [...]}`
- Frontend Sidebar consumes `ROLE_SIDEBAR_ACCESS` (mirrors this matrix)

---

## MaestroBQT Live BEO Feed

**Who sees it**: admin, owner, regional-director, director, fb-director, general-manager, executive-chef, **dir-banquets**, events-manager.

**Endpoint**: `GET /api/chronos/beos-live?user_id=…&days_ahead=31`

Returns up to 200 BEOs in the horizon window (default 31 days), with `by_day` rollup for month-view calendar. Rendered as a feed on the Chronos portfolio view for the allowed roles.

---

## 3-Day Prep Forecast (Monte Carlo → Auto Production Sheet)

**Endpoint**: `GET /api/chronos/prep-forecast?outlet_id=…&days=3` (max 7)

For each day:
- P10/P50/P90 covers (500-sim Monte Carlo with day-of-week factor)
- Production sheet: per-item qty at P50 + qty at P90, station, prep_unit
- Station rollup for heat-map

**Rendered in**: Chronos Ops View (below the 16 KPI tiles).

**Who sees it**: anyone who can drill into an outlet — i.e. any tier 1-3 oversight role for outlets they're scoped to.

---

## Connection-Check / Fallback Pattern

Every Chronos endpoint uses `_live_outlets_or_fallback()`:
1. Checks `db.outlets` collection (populated by AdminOnboarding).
2. If rows exist → uses live. Normalizes keys to Chronos shape (id, name, location, type, health, status, net_today, covers_today, labor_pct). Missing KPIs fall back to deterministic mock values keyed off outlet id.
3. If no rows → uses `SEEDED_OUTLETS` (Sapphire/Amber/Pearl demo set).

Same pattern applied to:
- `prep-forecast` → checks `db.recipes` for live prep items, falls back to 8-item demo menu.
- `beos-live` → checks `db.beos` for live events, falls back to deterministic mock set.

**Result**: when real POS/onboarding/BEO systems write to their collections, the UI flows through automatically. No code changes.
