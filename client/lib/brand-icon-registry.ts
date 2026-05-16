/**
 * Brand Icon Registry
 * ============================================================================
 * Maps LUCCCA sidebar / panel IDs → gold-on-black brand icon assets.
 *
 * Source spec: docs/UX_ICON_MASTER_LIST.md
 * Asset spec : docs/UX_ICON_SYSTEM.md
 *
 * Icons live under /public/brand-icons/{tier1,tier1c,tier2,tier3}/*.png
 * and are served by the static host at the same path (e.g. "/brand-icons/...").
 *
 * Lookup precedence inside Sidebar.tsx:
 *   1. Brand icon (this registry)  ←  rendered as <img>
 *   2. Lucide icon component       ←  fallback for un-commissioned modules
 *
 * 21 Tier-4 UI/system icons + ~22 unbuilt module icons keep using Lucide
 * until the illustrator delivers them.
 *
 * To add a new icon:
 *   1. Drop the PNG into /public/brand-icons/{tier}/
 *   2. Add a row below mapping the sidebar `id` (or `panelId`) → path
 *   3. Update docs/UX_ICON_MASTER_LIST.md status to "Shipped"
 */

const TIER1 = "/brand-icons/tier1";
const TIER1C = "/brand-icons/tier1c";
const TIER2 = "/brand-icons/tier2";
const TIER3 = "/brand-icons/tier3";

/**
 * Brand icon map keyed by sidebar `id` AND panel `panelId`.
 * Multiple keys can point at the same icon — both the parent group id and
 * the destination panel id route to the same brand mark.
 */
export const BRAND_ICON_REGISTRY: Record<string, string> = {
  // -------- Tier 1: Echo platform products --------
  "echo-concierge": `${TIER1}/EchoConcierge_sidebar.png`,
  "concierge-hub": `${TIER1}/EchoConcierge_sidebar.png`,
  "foh-concierge-hub": `${TIER1}/EchoConcierge_sidebar.png`,

  "echo-connect": `${TIER1}/EchoConnect.png`,
  "integration-control": `${TIER1}/EchoConnect.png`,
  "integration-command-center": `${TIER1}/EchoConnect.png`,

  "echo-events": `${TIER1}/EchoEventStudio.png`,
  "events_catering": `${TIER1}/EchoEventStudio.png`,
  "echo-event-studio": `${TIER1}/EchoEventStudio.png`,

  "layout": `${TIER1}/EchoLayout.png`,
  "echo-layout": `${TIER1}/EchoLayout.png`,

  "echowaste": `${TIER1}/EchoWaste.png`,
  "echo-waste": `${TIER1}/EchoWaste.png`,
  "waste-sheet": `${TIER1}/EchoWaste.png`,

  "stratus": `${TIER1}/EchoStratus_badge.png`,
  "stratus-forecast": `${TIER1}/EchoStratus_badge.png`,
  "forecast-21day": `${TIER1}/EchoStratus_badge.png`,
  "forecast-hub": `${TIER1}/EchoStratus_badge.png`,

  "chronos": `${TIER1}/EchoCronos.png`,

  "ai3-intelligence": `${TIER1}/EchoAI3.png`,
  "intelligence": `${TIER1}/EchoAI3.png`,
  "ai3": `${TIER1}/EchoAI3.png`,

  "aurium-gm": `${TIER1}/EchoAurum.png`,
  "aurum": `${TIER1}/EchoAurum.png`,
  "echo-aurum": `${TIER1}/EchoAurum.png`,
  "financial": `${TIER1}/EchoAurum.png`,
  "financial-ops": `${TIER1}/EchoAurum.png`,
  "budget-center": `${TIER1}/EchoAurum.png`,

  "canvas": `${TIER1}/EchoCanvasStudio.png`,
  "studio": `${TIER1}/EchoCanvasStudio.png`,
  "echo-canvas-studio": `${TIER1}/EchoCanvasStudio.png`,

  // -------- Tier 1c: Sub-brand assets (within parent modules) --------
  "echo-custom-cakes": `${TIER1C}/EchoCustomCakes.png`,
  "cake-viewer": `${TIER1C}/EchoCustomCakes.png`,

  // -------- Tier 2: Department badges & stickers --------
  "pastry": `${TIER2}/BAKERY.png`,
  "pastry_ops": `${TIER2}/BAKERY.png`,
  "chef-carissa-training": `${TIER2}/BAKERY.png`,

  "beverage-ops": `${TIER2}/BEVERAGE.png`,
  "mixology_sommelier": `${TIER2}/BEVERAGE.png`,
  "mixology-rd-lab": `${TIER2}/BEVERAGE.png`,

  "garde-manger": `${TIER2}/GardeManger.png`,

  "hskp-command": `${TIER2}/Housekeeping.png`,
  "housekeeping": `${TIER2}/Housekeeping.png`,

  "ird-hub": `${TIER2}/IRD.png`,
  "ird-builder": `${TIER2}/IRD.png`,

  "retail-ops": `${TIER2}/RETAIL.png`,

  "spa-dashboard": `${TIER2}/SPA.png`,
  "spa-builder": `${TIER2}/SPA.png`,

  "steward": `${TIER2}/Steward.png`,

  "engineering-ops": `${TIER2}/Engineering_Maintenance.png`,
  "eng-command": `${TIER2}/Engineering_Maintenance.png`,
  "energy-tracking": `${TIER2}/Engineering_Maintenance.png`,

  "foh-command": `${TIER2}/FOH.png`,

  "maestro-bqt": `${TIER2}/MaestroBqt.png`,
  "maestro-dashboard": `${TIER2}/MaestroBanquet.png`,
  "beo-planner": `${TIER2}/MaestroBanquet.png`,
  "beo-menu-builder": `${TIER2}/MaestroBanquet.png`,
  "group-resume": `${TIER2}/MaestroBanquet.png`,

  "reservations": `${TIER2}/Reservations.png`,

  // -------- Tier 3: Functional / cross-cutting --------
  "schedule": `${TIER3}/Schedule.png`,
  "my-schedule": `${TIER3}/Schedule.png`,
  "global-calendar": `${TIER3}/Schedule.png`,

  "hr-payroll": `${TIER3}/Payroll.png`,
  "payroll": `${TIER3}/Payroll.png`,

  "myecho": `${TIER3}/MyEcho.png`,
  "help-mascot": `${TIER3}/MyEcho.png`,

  "admin-onboarding": `${TIER3}/Onboarding.png`,
  "admin-onboarding-top": `${TIER3}/Onboarding.png`,
  "onboarding": `${TIER3}/Onboarding.png`,

  "pto": `${TIER3}/PTO.png`,

  "approvals": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "audit-security": `${TIER3}/Audit_EchoAurionSeal.png`,
  "audit-timeline": `${TIER3}/Audit_EchoAurionSeal.png`,

  // ─── iter265 · Brand-family aliasing for the 71 unmapped panels ──────────
  // Until dedicated PNGs are commissioned per MISSING_BRAND_ICONS.md, every
  // panel below inherits the closest brand-family mark so the dock + sidebar
  // never fall back to a Lucide glyph. When new art arrives, update the
  // mapping in-place; no consumer changes needed.

  // Kitchen family → BAKERY mark (culinary umbrella)
  "kitchen-war-room": `${TIER2}/BAKERY.png`,
  "kitchen-routing": `${TIER2}/BAKERY.png`,
  "kitchen-fire-expo": `${TIER2}/BAKERY.png`,
  "kds-expo": `${TIER2}/BAKERY.png`,
  "dish-assembly": `${TIER2}/BAKERY.png`,
  "food-gallery": `${TIER2}/BAKERY.png`,
  "culinary": `${TIER2}/BAKERY.png`,
  "chef-daily-report": `${TIER2}/BAKERY.png`,
  "chef-gio-training": `${TIER2}/BAKERY.png`,
  "menu-engineering": `${TIER2}/BAKERY.png`,
  "menu-design-studio": `${TIER2}/BAKERY.png`,
  "outlet-menus": `${TIER2}/BAKERY.png`,
  "plate-costing": `${TIER2}/BAKERY.png`,
  "pos-menu-analytics": `${TIER2}/BAKERY.png`,
  "ecw-menu-builder": `${TIER2}/BAKERY.png`,

  // Procurement / inventory / vendor → Steward (back-of-house operations)
  "inventory": `${TIER2}/Steward.png`,
  "vendor-scorecard": `${TIER2}/Steward.png`,
  "vendor-pareto": `${TIER2}/Steward.png`,
  "purchasing-receiving": `${TIER2}/Steward.png`,
  "purchrec-sprint1": `${TIER2}/Steward.png`,
  "commissary-ordering": `${TIER2}/Steward.png`,
  "ecw-procurement": `${TIER2}/Steward.png`,
  "pos-router": `${TIER2}/Steward.png`,

  // Engineering / work tickets → Engineering badge
  "eng-work-tickets": `${TIER2}/Engineering_Maintenance.png`,

  // Guest 360 / VIP / concierge admin → EchoConcierge family
  "guest-360": `${TIER1}/EchoConcierge_sidebar.png`,
  "guest360-hub": `${TIER1}/EchoConcierge_sidebar.png`,
  "guest-intelligence": `${TIER1}/EchoConcierge_sidebar.png`,
  "guest-booking": `${TIER1}/EchoConcierge_sidebar.png`,
  "concierge-mobile-admin": `${TIER1}/EchoConcierge_sidebar.png`,
  "vip-admin-desktop": `${TIER1}/EchoConcierge_sidebar.png`,
  "qr-scanner": `${TIER1}/EchoConcierge_sidebar.png`,

  // Spa / lifestyle → SPA mark
  "spa-wellness": `${TIER2}/SPA.png`,
  "lifestyle-dashboard": `${TIER2}/SPA.png`,

  // CFO / finance / BI deep-dives → EchoAurum
  "pace-mtd": `${TIER1}/EchoAurum.png`,
  "cash-runway-deep": `${TIER1}/EchoAurum.png`,
  "exception-review-daily": `${TIER1}/EchoAurum.png`,
  "cross-property-benchmark": `${TIER1}/EchoAurum.png`,
  "tip-audit-panel": `${TIER1}/EchoAurum.png`,
  "executive-command": `${TIER1}/EchoAurum.png`,
  "enterprise-bi-suite": `${TIER1}/EchoAurum.png`,
  "property-pulse": `${TIER1}/EchoAurum.png`,
  "gm-flash-report": `${TIER1}/EchoAurum.png`,

  // Operational intelligence / BI → EchoAI3
  "pattern-intelligence": `${TIER1}/EchoAI3.png`,
  "performance-intelligence": `${TIER1}/EchoAI3.png`,
  "manager-dashboard": `${TIER1}/EchoAI3.png`,
  "manager-workflow": `${TIER1}/EchoAI3.png`,
  "dept-dashboard": `${TIER1}/EchoAI3.png`,
  "labor-command-center": `${TIER1}/EchoAI3.png`,
  "reports-hub": `${TIER1}/EchoAI3.png`,
  "daily-briefing-admin": `${TIER1}/EchoAI3.png`,
  "daily-standup": `${TIER1}/EchoAI3.png`,
  "activity-timeline": `${TIER1}/EchoAI3.png`,

  // Whiteboard / collaboration → EchoCanvasStudio (creative surface)
  "whiteboard": `${TIER1}/EchoCanvasStudio.png`,

  // Weather / outdoor ops → EchoStratus (forecast family)
  "weather-forecast": `${TIER1}/EchoStratus_badge.png`,
  "weather-rebook": `${TIER1}/EchoStratus_badge.png`,

  // Echo Relay / ChefNet / Jarvis / ZARO → EchoConnect (comms umbrella)
  "relay": `${TIER1}/EchoConnect.png`,
  "chefnet": `${TIER1}/EchoConnect.png`,
  "luccca-jarvis-dashboard": `${TIER1}/EchoConnect.png`,
  "zaro-guardian": `${TIER1}/EchoConnect.png`,
  "gmail": `${TIER1}/EchoConnect.png`,
  "outlook-mail": `${TIER1}/EchoConnect.png`,
  "ms-teams": `${TIER1}/EchoConnect.png`,

  // Admin / system / IT → AurionSeal family (trust/governance)
  "admin-console": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "desktop-installers": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "it-operations": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "feature-flags": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "security-compliance": `${TIER3}/Audit_EchoAurionSeal.png`,
  "notification-center": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "people-admin": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "role-assigner": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "settings-overhaul": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "support": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "tech-support": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "system-updates": `${TIER3}/Approvals_EchoAurionSeal.png`,
  "fire-safety": `${TIER3}/Audit_EchoAurionSeal.png`,
};

/**
 * Resolve a brand icon for a given key. Pass either the sidebar item id or
 * its panelId — both are looked up; the first hit wins.
 * Returns `null` when no brand icon is registered (the caller should fall
 * back to the Lucide component on the item).
 */
export function getBrandIcon(...keys: Array<string | undefined | null>): string | null {
  for (const k of keys) {
    if (!k) continue;
    const hit = BRAND_ICON_REGISTRY[k];
    if (hit) return hit;
  }
  return null;
}

/** Static asset path of the LUCCCA help mascot (used by EchoHelpMascot). */
export const HELP_MASCOT_SRC = `${TIER3}/MyEcho.png`;

/* ============================================================================
 * Tier 4 — UI / system icons
 * ============================================================================
 * Status: BRIEF READY · NOT YET ILLUSTRATED (as of Iter 5 · 2026-05-11).
 *
 * The 14 icons below are listed as "Brief ready" in docs/UX_ICON_MASTER_LIST.md
 * but have not yet been commissioned. The Sidebar / app shell will continue
 * to use `lucide-react` for these slots until the PNGs land. When they do,
 * drop the file into `/public/brand-icons/tier4/` and add the mapping here.
 *
 *   1.  Settings        →  tier4/Settings.png         (replace <Settings />)
 *   2.  Notifications   →  tier4/Notifications.png    (replace <Bell />)
 *   3.  Search          →  tier4/Search.png           (replace <Search />)
 *   4.  Logout          →  tier4/Logout.png           (replace <LogOut />)
 *   5.  Filter          →  tier4/Filter.png           (replace <Filter />)
 *   6.  Sort            →  tier4/Sort.png             (replace <ArrowUpDown />)
 *   7.  Export          →  tier4/Export.png           (replace <Download />)
 *   8.  Refresh         →  tier4/Refresh.png          (replace <RefreshCw />)
 *   9.  Help / Question →  tier4/Help.png             (replace <HelpCircle />)
 *  10.  Add / Plus      →  tier4/Add.png              (replace <Plus />)
 *  11.  Edit            →  tier4/Edit.png             (replace <Pencil />)
 *  12.  Delete          →  tier4/Delete.png           (replace <Trash2 />)
 *  13.  Close           →  tier4/Close.png            (replace <X />)
 *  14.  More menu       →  tier4/More.png             (replace <MoreHorizontal />)
 *
 * Spec for the visual treatment: gold-on-black, 24×24 viewport, transparent
 * background, optical-aligned to feel uniform alongside the Tier 1/2/3 set.
 * See docs/UX_ICON_SYSTEM.md §"Tier 4 system icons" for the full brief.
 */
