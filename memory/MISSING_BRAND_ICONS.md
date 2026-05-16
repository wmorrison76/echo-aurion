# Missing Brand-Icon Commission List · Iter 265

**Total panel IDs in sidebar:** 112
**With brand-icon mapping today:** 112 (100%) via brand-family aliasing
**Awaiting dedicated PNG art:** ~71

iter 265 update: Every panel now resolves to a brand mark via family
aliasing in `brand-icon-registry.ts`. No panel falls back to a Lucide
glyph in the dock or sidebar. Dedicated PNGs from the illustrator should
**replace** the aliases in-place when delivered — no consumer changes
required.

All icons follow the established gold-on-black aesthetic at 24×24,
transparent background, optical-aligned with Tiers 1–3. Drop new PNGs
into `/app/public/brand-icons/tierN/` and update the mapping in
`client/lib/brand-icon-registry.ts`.

---

## Tier 4 — UI / System icons (14 — still need PNGs)
Settings, Notifications, Search, Logout, Filter, Sort, Export, Refresh,
Help, Add, Edit, Delete, Close, More.

These are toolbar/chrome icons rather than panel marks; the alias system
does not cover them because they are rendered inline by shadcn/lucide.
They remain on lucide-react until commissioned.

## Tier 1 — Echo platform products awaiting dedicated PNG
| Panel ID | Aliased to (today) | Note |
|---|---|---|
| `relay` | EchoConnect | comms family |
| `chefnet` | EchoConnect | comms family |
| `luccca-jarvis-dashboard` | EchoConnect | comms family |
| `zaro-guardian` | EchoConnect | comms family |
| `whiteboard` | EchoCanvasStudio | creative surface |
| `weather-forecast` | EchoStratus | forecast family |
| `weather-rebook` | EchoStratus | forecast family |
| `gmail`, `outlook-mail`, `ms-teams` | EchoConnect | could use vendor logos |

## Tier 2 — Department / dashboard icons awaiting dedicated PNG
Aliases live in BRAND_ICON_REGISTRY (search "iter265 · Brand-family aliasing"):
- Kitchen family: `kitchen-war-room`, `kitchen-routing`, `kitchen-fire-expo`, `kds-expo`, `dish-assembly`, `food-gallery`, `culinary`, `chef-daily-report`, `chef-gio-training`, `menu-engineering`, `menu-design-studio`, `outlet-menus`, `plate-costing`, `pos-menu-analytics`, `ecw-menu-builder` → **BAKERY**
- Procurement: `inventory`, `vendor-scorecard`, `vendor-pareto`, `purchasing-receiving`, `purchrec-sprint1`, `commissary-ordering`, `ecw-procurement`, `pos-router` → **Steward**
- Engineering: `eng-work-tickets` → **Engineering_Maintenance**
- Guest 360 / VIP: `guest-360`, `guest360-hub`, `guest-intelligence`, `guest-booking`, `concierge-mobile-admin`, `vip-admin-desktop`, `qr-scanner` → **EchoConcierge_sidebar**
- Spa / lifestyle: `spa-wellness`, `lifestyle-dashboard` → **SPA**

## Tier 3 — CFO / operational icons awaiting dedicated PNG
- CFO/Finance: `pace-mtd`, `cash-runway-deep`, `exception-review-daily`, `cross-property-benchmark`, `tip-audit-panel`, `executive-command`, `enterprise-bi-suite`, `property-pulse`, `gm-flash-report` → **EchoAurum**
- BI / Intelligence: `pattern-intelligence`, `performance-intelligence`, `manager-dashboard`, `manager-workflow`, `dept-dashboard`, `labor-command-center`, `reports-hub`, `daily-briefing-admin`, `daily-standup`, `activity-timeline` → **EchoAI3**

## Tier 5 — Admin / system icons awaiting dedicated PNG
- `admin-console`, `desktop-installers`, `it-operations`, `feature-flags`, `notification-center`, `people-admin`, `role-assigner`, `settings-overhaul`, `support`, `tech-support`, `system-updates` → **Approvals_EchoAurionSeal**
- `security-compliance`, `fire-safety` → **Audit_EchoAurionSeal**

---

## How to replace an alias with a commissioned icon

1. Drop the PNG into `/app/public/brand-icons/tierN/PanelName.png`
2. Edit the mapping line in `client/lib/brand-icon-registry.ts` — change the value to point at the new asset.
3. Run `cd /app && npx vite build && sudo supervisorctl restart frontend`.
4. Reload — the panel's brand icon updates everywhere automatically (sidebar, panel header, dock).

No consumer code changes required — the resolver and `useDesktop`-aware dock both go through `getBrandIcon()`.

---

## How "icons follow panel → dock" works (iter265)

- Sidebar: `Sidebar.tsx` reads `getBrandIcon(item.id, item.panelId)` → renders `<img>` mark.
- Panel header: `components/site/panels/Panel.tsx` (line ~352) calls `getBrandIcon(panelKey, entry.id, entry.icon)` and sets `isImageIcon` accordingly.
- Dock on minimize: both `PanelHostIntegrated.tsx` (`resolveDockIcon` helper) and `PanelHost.tsx` (inline brand lookup at minimize sites lines 1118 and 1660-ish) dispatch `panel-minimized` with the resolved brand icon. `MinimizedPanels.tsx` already renders `<img>` when `isImageIcon` is true.

This means: open any panel → its brand mark appears in the panel header → minimize → same mark travels to the dock strip in the UnifiedToolbar.
