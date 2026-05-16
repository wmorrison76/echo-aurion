# EchoAurion · Architecture Connections — "Free Wins" Roadmap
**Generated:** iter267 · 2026-02 · William J. Morrison Studio  
**Purpose:** Show every existing backend that the UI can lean on _today_ without writing new business logic. Each row is something you can wire up in <1 day because the data already exists.

---

## TL;DR

The Chronos → MaestroBQT → EchoEvents Studio → Beverage Network → VIP Atlas chain is already a closed loop on the backend. Most of the "next features" the user keeps asking for are just **UI joins of payloads we already produce**. The cheapest wins are joining those payloads together inside one panel.

```
                                  ┌──────────────────────────┐
                                  │  Chronos · roll-up shell │
                                  │   (district → outlet)    │
                                  └──────┬───────────────────┘
                                         │ openPanel(chef-outlet-dashboard, outlet_id)
                                         ▼
   ┌────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
   │ Beverage Network      │◄──►│  Chef Outlet Dashboard   │◄──►│ MaestroBQT BEO Timeline  │
   │ /vip-precheck         │    │  /chef-outlet/*          │    │  /chef-outlet/beo-time…  │
   │ /briefing, /transfer  │    │  YTD · MC forecast       │    │  detail · auto-build     │
   └────────┬──────────────┘    └──────────┬───────────────┘    └────────────┬─────────────┘
            │                              │                                  │
            ▼                              ▼                                  ▼
   ┌────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
   │ VIP Atlas + Concierge │    │ Echo AI³ Auto-Build      │    │ Echo Events Studio       │
   │ /vip-tracker/list     │    │ (recipes · prep · POs)   │    │ /demo-create · feed      │
   └────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
```

---

## 1. Already-Wired Backends (you don't need to build these)

| Backend route                              | Data it produces                          | Where it's already consumed         | Where you could ALSO use it (free win) |
|---|---|---|---|
| `/api/chef-outlet/dashboard`               | YTD sales + Monte Carlo 1-7d forecast     | Chef Outlet Dashboard panel         | **Chronos district roll-up** (sum per outlet) |
| `/api/chef-outlet/beo-timeline/{id}/detail`| Menu + prep + setup + schedule team       | BEO Timeline drawer                 | **MyEcho mobile** banquet shift view |
| `/api/chef-outlet/beo-timeline/.../auto-build` | recipes + prep rows from menu          | "Auto-Build (Echo AI³)" button      | **Pre-week production plan** in MaestroBQT |
| `/api/beverage-network/briefing`           | Cross-outlet inventory rollup             | Beverage Director panel             | **Concierge VIP Precheck** (already!) |
| `/api/beverage-network/vip-precheck`       | Shortfall units, days supply              | Concierge VIP Atlas tile            | **GM Daily Briefing email** (already!) |
| `/api/beverage-network/transfer-link`      | 1-click intra-outlet transfer landing     | GM Daily Briefing email             | **Echo Activity tape** auto-row when a transfer fires |
| `/api/echo-events-studio/activity-feed`    | Real Echo AI³ pipeline steps              | Echo Command Bar EventTape          | **Owner dashboard** "what is Echo doing right now" tile |
| `/api/echo-events-studio/demo-create`      | 7-step BEO auto-build (PO + layout + recipes) | Run-Demo button               | **Onboarding tour** — show day-1 user a complete pipeline |
| `/api/supplier-catalog/compare`            | Sysco vs USF price diff for any item      | Supplier Catalog Compare tab        | **Auto-PO** chooses cheapest by default |
| `/api/supplier-catalog/price-history/{sku}`| 26-week price walk (iter267 NEW)          | Supplier Deep Dive modal            | **Forecast Hub** food-cost CPI line |
| `/api/supplier-catalog/outlet-usage/{sku}` | Units/week per outlet (iter267 NEW)       | Supplier Deep Dive modal            | **Plate Costing** "are we paying the right price" check |
| `/api/help-agent/ask` (now LLM-backed)     | Free-form Q&A (calculus → P&L)            | Echo Command Bar drawer (iter267)   | **In-line panel coach** — any panel can call ask() |
| `/api/admin/users/{id}/onboarding-bundle`  | Role's default panel + sidebar pins       | First-login bootstrap (NEW iter267) | **Sidebar.tsx** can pre-pin items from this endpoint |
| `/api/admin/role-provisioning`             | Full role→bundle map                       | Admin "preview role" tooltip        | **CSV bulk user import** assigns by role automatically |
| `/api/ai3-nlp/transcribe`                  | Whisper voice → text                      | Echo Command Bar mic (NEW iter267)  | **Hands-free Recipe capture**, **BEO voice notes** |

---

## 2. Connections the UI Should Make Next (cheapest first)

### 2.1. Chronos roll-up chain (P2 in backlog · ~½ day)
- **What:** Director / district view sums `/api/chef-outlet/dashboard` across owned outlets.
- **Build:** Add `/api/chronos/roll-up?scope=district&id=...` that loops outlets and aggregates `ytd_sales`, `mc_p50`, `mc_p90`. The per-outlet endpoint already does the heavy math.
- **Free win:** No new analytics. Just a fan-out + sum.

### 2.2. Owner dashboard "Echo Live" tile (~2 hours)
- **What:** Drop the `EchoCommandBar` `EventTape` content into a tile on the GM/Owner dashboard so they don't have to open the drawer.
- **Build:** Reuse `useEffect(load /api/echo-events-studio/activity-feed)` from `EchoCommandBar.tsx` — render the last 5 rows in a card. No new endpoint.
- **Free win:** Sells the "we have an AI doing real work" story without any backend lift.

### 2.3. BEO Drawer ⇒ Supplier Deep Dive (~2 hours)
- **What:** Inside the BEO Production Sheet, every ingredient row gets a "View pricing" link → opens the new Supplier Deep Dive modal pre-keyed to that SKU.
- **Build:** Hash the BEO recipe ingredient → catalog SKU by `name` match; if hit, render `<a onClick={() => openSupplierDeepDive(sku)}>`. Re-uses the modal already built in iter267.
- **Free win:** Chef Gio can confirm a vendor + lock pricing without leaving the BEO.

### 2.4. VIP Atlas → BEO auto-mark "VIP arrival in flight" (~2 hours)
- **What:** When `vip_beverage_alerts` has `status=open` for a VIP whose `event_id` matches a BEO, the BEO card in the MaestroBQT timeline gets a 🟡 VIP-on-floor badge.
- **Build:** On the BEO Timeline payload, left-join `vip_beverage_alerts` by `event_id`. No new endpoint.
- **Free win:** Concierge + Banquet finally talk through the system instead of Slack.

### 2.5. Echo Activity tape → Audit & Security panel (~1 hour)
- **What:** Mirror the merged `EventTape` into the `audit-security` panel so the compliance officer has the exact same feed.
- **Build:** Audit panel re-fetches `/api/echo-events-studio/activity-feed?limit=200`. Done.

### 2.6. Onboarding bundle → Sidebar.tsx (~3 hours)
- **What:** When a user hits the shell, GET `/api/admin/users/{me}/onboarding-bundle` and use `sidebar_pins` + `default_panel` to:
  - pre-pin those items at the top of the sidebar, and
  - if it's their first session (`last_login==null`), auto-open `default_panel`.
- **Build:** One `useEffect` in `Sidebar.tsx`. The endpoint already exists (iter267).
- **Free win:** Closes the "Onboarding Auto-setup" P1 item from William's notes.

### 2.7. GM Briefing PDF (~2 hours)
- **What:** `/api/beverage-network/vip-precheck/gm-daily-briefing` already returns server-rendered HTML. Pipe through WeasyPrint to expose `gm-daily-briefing.pdf` for archival.
- **Build:** Add `?format=pdf` branch. Use the same WeasyPrint pipeline as the 409A doc.

### 2.8. Help Agent → in-panel Coach button (~2 hours)
- **What:** Every panel gets a "?" pill bottom-right. Click → opens Echo drawer with a pre-filled context-aware question (e.g. "How do I read this panel?").
- **Build:** `useContext(PanelId)` → `POST /api/help-agent/ask {context_panel: pid}`. The endpoint already accepts `context_panel`.

---

## 3. Joins that Convert Three Backends into One Product Story

These are mini-products that emerge for free once you join the existing payloads:

### A. **"Pre-Week Production Plan"** = MaestroBQT week × Echo Auto-Build × Supplier Catalog
1. `MaestroBQT /week?starts=…` → all BEOs this coming week.
2. For each BEO → `auto-build` already returns prep rows.
3. Aggregate prep across the week → list of ingredients with totals.
4. Hit `/api/supplier-catalog/compare` once per ingredient → cheapest vendor list.
5. Drop into `/api/supplier-catalog/auto-po` → single weekly PO.
> Effort: 1 day. Backend already produces every input.

### B. **"VIP Service Brief"** = VIP Atlas × Beverage Network × Echo Concierge
1. `/vip-tracker/list?status=upcoming&days=7` → who's arriving.
2. Per VIP → `/vip-precheck` for shortfalls and `/transfer-link` for fixes.
3. Per VIP → `/concierge/notes/{guest_id}` (already exists) for likes/dislikes.
4. Render as a 1-page "morning huddle" PDF.
> Effort: ½ day. PDF pipeline is the only new piece.

### C. **"Chronos Live"** = Chef Dashboard × Echo Activity × Beverage Network
1. Top strip: per-outlet YTD + MC forecast (already).
2. Middle band: live Echo Activity tape filtered to this outlet (already).
3. Bottom row: beverage shortfalls + open transfers (already).
> Effort: 4 hours of UI composition. Zero new backend.

### D. **"Owner Tape"** = Echo Activity × Aurum P&L × VIP Atlas
1. Daily digest email: top 10 Echo actions, P&L delta vs forecast, VIP highlight.
2. Same WeasyPrint pipeline as 409A doc.
> Effort: 1 day. Aurum P&L endpoints exist, VIP exists, Activity exists.

---

## 4. What the Sidebar Knows But Doesn't Yet Use

Today: `Sidebar.tsx` renders a fixed list per RBAC. From iter267 we now have `/api/admin/role-provisioning` returning a richer map (modules + default_panel + sidebar_pins).

**Free win:** Make Sidebar.tsx _data-driven_ from `/api/admin/users/{me}/onboarding-bundle`. Removes the hard-coded role gates inside the sidebar and centralizes them in one provisioning map. Net: fewer code changes when adding a role.

---

## 5. Hot-Path Performance Notes (don't skip)

- **Calendar BEO merge** still slices after combining (handoff note). Once volume crosses ~800 BEOs/month, this drops events. Move to a true paginated merge endpoint `/api/calendar/events?cursor=...`. Same payload, no UI changes.
- **Activity feed** is polled every 8s in the drawer. If multiple drawers open across the shell, push it to a context provider + single interval.
- **Supplier Catalog Deep Dive** does two parallel fetches per click. If users click rapidly, debounce 200ms or cache by sku.

---

## 6. Recommended Order (1-week sprint)

| Day | Ship | Why |
|---|---|---|
| Mon | 2.6 Sidebar.tsx data-driven from bundle | Visible to every user instantly |
| Tue | 2.2 Owner "Echo Live" tile + 2.5 Audit feed | Two free wins from one endpoint |
| Wed | 2.3 BEO Drawer → Supplier Deep Dive | Chef-facing, ROI in one shift |
| Thu | 2.4 VIP-on-floor badge in BEO Timeline | Bridges Concierge + Banquet |
| Fri | A. Pre-Week Production Plan (mini-product) | Demonstrable "Echo ran our week" moment |

After this week the only remaining backend new-builds are:
1. `/api/chronos/roll-up` (district fan-out)
2. WeasyPrint PDF endpoints (`gm-daily-briefing.pdf`, `owner-tape.pdf`)
3. Calendar paginated merge

Everything else is composition.

---

## 7. Risks / Watch-outs

- **Single source of truth for SKU → ingredient name.** Supplier Deep Dive joins by name today. If chef recipes spell items differently than catalog, joins miss. Either canonicalize or add a `recipe_sku_alias` map.
- **Talk-to-talk** uses Whisper via `/api/ai3-nlp/transcribe` — costs $0.006 / min. Cap to 30s/clip in the UI.
- **LLM Q&A** (`/api/help-agent/ask`) is now LLM-backed. Add rate-limiting once you take this public.
- **Role provisioning** does not retroactively patch existing accounts. Run `apply-role-defaults` once after deploy to backfill.
