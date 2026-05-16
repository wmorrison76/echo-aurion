"""
Role → Program Access Matrix — SINGLE SOURCE OF TRUTH.

Rule: if a role has access to restaurant/outlet DETAILS for a department,
      they automatically also get access to every program/module used by
      that department.

Three tiers of enterprise desktop access:
  TIER 1 — Enterprise-wide oversight (Atlas/Chronos, cross-property reports)
  TIER 2 — Property oversight (all outlets + all department modules)
  TIER 3 — Enterprise Desktop baseline (Sous Chef / Dining Room Manager and up)
           — department-scoped dashboards, recipe/BEO/order ops, but not
             HR/Finance admin.
  MOBILE — MyEcho only for hourly staff.

The matrix is consumed by:
  /api/access/effective-modules?user_id=…  → flat list of module_ids the user can open
  Sidebar.tsx (role → sidebar groups)
  PanelHostIntegrated.tsx (role → landing panel)
  Each panel can defensively check via /api/access/can-open?module=…
"""

# ── Module catalogue — every panel in the app grouped by department ───
DEPT_MODULES = {
    "culinary":       ["culinary-dashboard", "recipe-builder", "cdc-launchpad",
                       "kds", "haccp-logs", "food-cost-analytics",
                       "waste-sheet", "station-ops"],
    "pastry":         ["pastry-dashboard", "pastry-recipe-builder", "pastry-production",
                       "pastry-cake-designer", "pastry-order-board",
                       "allergen-impact-tree"],
    "banquets":       ["maestro-bqt", "beo-execution", "beo-builder",
                       "events-calendar", "banquet-floorplan"],
    "foh_service":    ["dining-room-pulse", "reservations", "floor-map",
                       "server-scorecard", "mixology-sommelier"],
    "beverage":       ["beverage-ops", "beverage-program", "beverage-cost",
                       "mixology-sommelier"],
    "rooms":          ["hotel-ops", "housekeeping", "front-desk",
                       "guest-experience"],
    "spa":            ["spa-ops", "spa-appointments"],
    "engineering":    ["engineering-ops", "preventive-maintenance"],
    "finance":        ["financial-reports", "enterprise-bi-suite",
                       "cost-center-analytics", "gl-codes"],
    "purchasing":     ["purchasing-receiving", "vendor-master", "invoice-ingest",
                       "approval-hierarchy", "three-way-match"],
    "hr":             ["schedule", "manager-workflow", "pto", "hiring",
                       "onboarding"],
    "events":         ["events-manager-board", "specials-group-blocks"],
    "chronos_view":   ["chronos"],       # the time machine landing
    "enterprise_bi":  ["reports-hub", "enterprise-bi-suite", "aurium-gm",
                       "atlas-regional"],
    "admin_sys":      ["admin-onboarding", "integration-hub", "security-audit",
                       "activity-timeline", "system-settings", "zaro-guardian"],
}

# ── Role → which DEPARTMENTS that role can fully oversee ──────────────
# A role "oversees" a dept → gets ALL modules in that dept (inheritance rule).
# A role can also get specific read-only modules listed under "extras".
ROLE_ACCESS = {
    # ── Tier 1 — Enterprise oversight ──
    "admin":              {"tier": "admin",      "depts": list(DEPT_MODULES.keys())},
    "owner":              {"tier": "admin",      "depts": list(DEPT_MODULES.keys())},
    "regional-director":  {"tier": "enterprise", "depts": ["chronos_view", "enterprise_bi",
                                                            "finance", "hr"],
                                                 "extras": ["reports-hub", "atlas-regional"]},
    # District chef oversees a SUBSET of the org's properties (e.g. 6 of 30).
    # Outlet/property assignment is per-user via user_roles.outlet_ids /
    # user_roles.property_ids (migration 040). Lands on Chronos at the
    # property tier — drilldown into a property reveals its outlets.
    "district-chef":      {"tier": "enterprise", "depts": ["chronos_view", "culinary",
                                                            "pastry", "banquets",
                                                            "purchasing"],
                                                 "extras": ["reports-hub",
                                                            "atlas-regional"]},

    # ── Tier 2 — Property oversight (all outlets + all dept modules on property) ──
    "director":           {"tier": "property",   "depts": ["chronos_view", "enterprise_bi",
                                                            "culinary", "pastry", "banquets",
                                                            "foh_service", "beverage", "rooms",
                                                            "spa", "engineering", "finance",
                                                            "purchasing", "hr", "events"]},
    "exec-dir-finance":   {"tier": "property",   "depts": ["chronos_view", "enterprise_bi",
                                                            "finance", "purchasing", "hr"]},
    "general-manager":    {"tier": "property",   "depts": ["chronos_view", "enterprise_bi",
                                                            "culinary", "pastry", "banquets",
                                                            "foh_service", "beverage", "rooms",
                                                            "finance", "purchasing", "hr", "events"]},
    "fb-director":        {"tier": "property",   "depts": ["chronos_view", "culinary", "pastry",
                                                            "banquets", "foh_service",
                                                            "beverage", "events", "purchasing"]},
    "controller":         {"tier": "property",   "depts": ["chronos_view", "enterprise_bi",
                                                            "finance", "purchasing"]},

    # ── Tier 2b — Dept heads (property-wide within their dept) ──
    "executive-chef":     {"tier": "dept-head",  "depts": ["chronos_view", "culinary", "pastry",
                                                            "banquets", "purchasing"],
                                                 "extras": ["beverage-program"]},
    "pastry-chef":        {"tier": "dept-head",  "depts": ["chronos_view", "pastry", "banquets",
                                                            "purchasing"]},
    "dir-banquets":       {"tier": "dept-head",  "depts": ["chronos_view", "banquets", "events",
                                                            "purchasing"],
                                                 "extras": ["culinary-dashboard",
                                                            "pastry-dashboard"]},  # read BEOs as they happen
    "events-manager":     {"tier": "dept-head",  "depts": ["events", "banquets"],
                                                 "extras": ["reports-hub"]},
    "spa-manager":        {"tier": "dept-head",  "depts": ["spa"]},
    "dir-engineering":    {"tier": "dept-head",  "depts": ["engineering"]},
    "purchasing-manager": {"tier": "dept-head",  "depts": ["purchasing"]},

    # ── Tier 3 — Enterprise Desktop BASELINE (Sous Chef / Dining Room Manager up) ──
    # Get their outlet's department modules, no HR/Finance admin.
    "sous-chef":          {"tier": "enterprise-desktop", "depts": ["culinary", "purchasing"]},
    "dining-room-manager":{"tier": "enterprise-desktop", "depts": ["foh_service", "beverage"]},
    # Chef de Cuisine — owns a single outlet's culinary program top to bottom.
    # Lands directly on the outlet ops view (skips portfolio + property tiers).
    # Was a seeded test user (cdc@luccca.com) but missing from the matrix —
    # the EMERGENT/original merge had not registered the role here.
    "chef-de-cuisine":    {"tier": "enterprise-desktop", "depts": ["chronos_view",
                                                                    "culinary", "pastry",
                                                                    "purchasing"]},
    # (Bar lead, banquet captain etc. go here as they're added.)

    # ── Mobile-only / Hourly ──
    "staff":              {"tier": "mobile",     "depts": []},
}

_LANDINGS = {
    "admin":              "dashboard",
    "owner":              "dashboard",
    "regional-director":  "chronos",
    "district-chef":      "chronos",
    "chef-de-cuisine":    "chronos",
    "director":           "chronos",
    "exec-dir-finance":   "chronos",
    "general-manager":    "chronos",
    "fb-director":        "chronos",
    "controller":         "chronos",
    "executive-chef":     "chronos",
    "pastry-chef":        "chronos",
    "dir-banquets":       "chronos",
    "events-manager":     "chronos",
    "sous-chef":          "chronos",
    "dining-room-manager":"chronos",
    "staff":              "myecho-home",   # mobile
}


def _custom_role_spec(role: str, tenant_id: str = "default") -> dict | None:
    """D11b · Read a tenant's custom role definition from the DB.
    Returns the spec dict or None if the role isn't a custom role.

    Lookups go straight to `db["custom_roles"]` keyed by (tenant_id, role).
    Wrapped in a try/except so a missing/unreachable DB doesn't break
    the access matrix — sign-in degrades to the seeded internal roles
    rather than locking everyone out."""
    try:
        from database import db as _db
        return _db["custom_roles"].find_one(
            {"tenant_id": tenant_id, "role": role},
            {"_id": 0},
        )
    except Exception:
        return None


def _role_spec(role: str, tenant_id: str = "default") -> dict | None:
    """Single resolver for both seeded + custom roles.
    Custom role definitions OVERRIDE seeded ones for the same role
    name — gives an MSP the option to redefine, e.g., "executive-chef"
    for a specific customer if their internal definition differs.

    Precedence:
      1. db["custom_roles"]  (per-tenant override)
      2. ROLE_ACCESS         (seeded internal defaults)"""
    custom = _custom_role_spec(role, tenant_id)
    if custom:
        # Strip storage-only fields the matrix consumers don't need.
        return {
            "tier":   custom.get("tier") or "enterprise-desktop",
            "depts":  list(custom.get("depts") or []),
            "extras": list(custom.get("extras") or []),
            "_source": "custom",
        }
    seeded = ROLE_ACCESS.get(role)
    if seeded:
        return {**seeded, "_source": "internal"}
    return None


def effective_modules(role: str, tenant_id: str = "default") -> list[str]:
    """Resolve a role to its flat list of allowed module ids."""
    spec = _role_spec(role, tenant_id)
    if not spec:
        return []
    allowed: set[str] = set()
    for dept in spec.get("depts", []):
        allowed.update(DEPT_MODULES.get(dept, []))
    for extra in spec.get("extras", []):
        allowed.add(extra)
    return sorted(allowed)


def can_open(role: str, module_id: str, tenant_id: str = "default") -> bool:
    return module_id in effective_modules(role, tenant_id)


def landing_panel(role: str, tenant_id: str = "default") -> str:
    """Which panel auto-opens on sign-in for this role.
    Custom roles can override their landing panel via
    custom_roles.landing_panel."""
    custom = _custom_role_spec(role, tenant_id)
    if custom and custom.get("landing_panel"):
        return custom["landing_panel"]
    return _LANDINGS.get(role, "dashboard")


def tier_of(role: str, tenant_id: str = "default") -> str:
    spec = _role_spec(role, tenant_id)
    return (spec or {}).get("tier", "mobile")
