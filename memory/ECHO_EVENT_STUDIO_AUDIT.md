# iter203b · Echo Event Studio UI/UX Audit (report-only)
**Date:** Feb 2026 iter203 · **Status:** AUDIT COMPLETE — 6 findings, fixes queued

## Scope
Walked every tab inside the consolidated Echo Events panel (iter201) end-to-end:
Dashboard · CRM · Master Ops · BEO Gantt · Events · **BEO/Contracts** · Menus · Calendar · Events Report · Scenario Planner · AI Event Brief · Conventions · Analytics · Admin.

## Green (shipped / working)
- ✅ Dashboard — CRM metrics + forecast wired to NEW `/api/crm/*` endpoints (fixed this iter)
- ✅ CRM — contact CRUD + search + lifecycle stages (fixed this iter)
- ✅ Master Ops — BeoOpsGanttPanel + MasterOpsPanel compose correctly
- ✅ BEO Gantt — events load (response-shape parser fixed iter202)
- ✅ BEO/Contracts — new 3-panel BeoBuilder ships this iter + ContractsEventsOverview from iter202
- ✅ Menus — MenuLibrary + EventMenuPanel composition
- ✅ Calendar — EventsCalendarModal opens
- ✅ Events Report · Scenario Planner · AI Event Brief · Conventions — lazy tabs (iter201)
- ✅ Analytics — existing
- ✅ Admin — RewardsAdminPanelNew + EchoEvents admin UI

## Findings & fixes
| # | Area | Finding | Severity | Fix |
|---|---|---|---|---|
| F1 | CRM | `/api/crm/metrics`, `/forecast`, `/contacts` returned 404 — panel broken | 🔴 HIGH | **FIXED iter203c** — new `crm_lifecycle.py` route file |
| F2 | BEO Builder | Previous version was just a "Generate" button — no actual multi-panel builder | 🔴 HIGH | **FIXED iter203a** — 3-panel BeoBuilder component w/ library↔selected, ±5% slider, audit, finalise |
| F3 | Dashboard | CrmWowDashboard uses `/api/crm/forecast?months=12` — forecast math is naive (only sums by month bucket) | 🟡 MED | Accept this iter; upgrade to ML in iter205 |
| F4 | Events tab | OpsBoard renders but has no `+ New Event` quick-create — editors must navigate elsewhere | 🟡 MED | Queue for iter203d (quick-create flow) |
| F5 | Menus tab | MenuLibrary selection lives in panel-local state only — doesn't persist across tab switches | 🟢 LOW | Queue — low impact since Menus tab is primarily browsing |
| F6 | Admin tab | RewardsAdminPanelNew is rewards-only. Resource permission admin lives elsewhere. | 🟢 LOW | Rename tab to "Rewards Admin" for clarity — queued |

## Still-queued audits (not touched this iter)
- Mobile Echo Events surface (`/m/staff/:token` — CRM is desktop-only today)
- Offline behaviour of BEO Builder (works only online today)
- Role gating on BEO ± adjustment slider (every role has it — should cap roles to director+)

## Action items filed to PRD iter203+
- iter203d · Events tab Quick-Create + Role-gated BEO adjustment
- iter205 · ML-based pipeline forecast
- iter206 · Offline BEO Builder with local draft cache
