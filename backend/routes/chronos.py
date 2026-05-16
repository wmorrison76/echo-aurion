"""
Echo Chronos — "operational time machine" backend.

Provides seeded outlet portfolio with per-role scoping:

  regional-director     → ALL properties
  director / exec-dir-finance → ONE property, ALL outlets
  fb-director / gm / controller / events-manager → property.outlets filtered
  executive-chef / sous-chef / pastry-chef → assigned outlets only (from a single kitchen)
  dir-banquets → banquet-eligible outlets (sees BEOs as they happen)

Surfaces:
  GET /api/chronos/portfolio?user_id=…     → cards for the outlets the user can see
  GET /api/chronos/outlet/{id}?day=N       → 16 KPI sparkline tiles + event pins + meta
  GET /api/chronos/compare?ids=a,b,c       → side-by-side diff for 2-3 outlets
  GET /api/chronos/forecast-tomorrow       → Monte Carlo P10/P50/P90 for tomorrow
  GET /api/chronos/prep-forecast?outlet_id=…  → 3-day per-day prep demand + auto production sheet
  GET /api/chronos/properties?user_id=…    → regional-director property → outlet group
  GET /api/chronos/beos-live?user_id=…     → live BEO feed (MaestroBQT for ExecChef/DirBanquets/Director)

All KPI numbers match the design video. Mock data is DETERMINISTIC (seeded off
outlet id) so values are stable across refreshes.

**Connection-check fallback pattern**: every endpoint checks `db["outlets"]`
first — if wired by AdminOnboarding, it uses LIVE outlets; else falls back
to SEEDED_OUTLETS. This means as soon as a real POS/onboarding populates the
collection, Chronos flows through automatically. No code change needed.
"""
import hashlib
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from database import db
from routes.access_matrix import ROLE_ACCESS, effective_modules, landing_panel, tier_of
# D4: live-tile computation. Replaces hardcoded seeded values with real
# DB queries, falling back to seed when no data is available. Each tile
# carries a `_source` tag the UI uses to show a "LIVE" badge.
from routes.chronos_live_tiles import merge_live_tiles

router = APIRouter(prefix="/api/chronos", tags=["chronos"])

# ───────────────────────────── Seed data ─────────────────────────────

SEEDED_PROPERTIES = [
    {
        "id": "prop_miami_flagship",
        "name": "Lakeside Flagship · Miami",
        "code": "MIA",
        "timezone": "America/New_York",
    },
    {
        "id": "prop_vegas_resort",
        "name": "Desert Horizon Resort · Las Vegas",
        "code": "LAS",
        "timezone": "America/Los_Angeles",
    },
]

# Outlets from the Chronos design video (all in MIA property for Director's view)
SEEDED_OUTLETS = [
    {
        "id": "outlet_sapphire", "property_id": "prop_miami_flagship",
        "name": "Sapphire Steakhouse", "location": "Brickell", "type": "restaurant",
        "health": 97.2, "status": "healthy",
        "net_today": 142_000, "covers_today": 318, "labor_pct": 24.1,
    },
    {
        "id": "outlet_azure", "property_id": "prop_miami_flagship",
        "name": "Azure Lounge", "location": "South Beach", "type": "bar",
        "health": 92.4, "status": "watch",
        "net_today": 98_000, "covers_today": 214, "labor_pct": 28.6,
    },
    {
        "id": "outlet_verde", "property_id": "prop_miami_flagship",
        "name": "Verde Cantina", "location": "Wynwood", "type": "restaurant",
        "health": 88.1, "status": "drift",
        "net_today": 67_000, "covers_today": 282, "labor_pct": 32.4,
    },
    {
        "id": "outlet_noir", "property_id": "prop_miami_flagship",
        "name": "Noir Bistro", "location": "Coral Gables", "type": "restaurant",
        "health": 95.8, "status": "healthy",
        "net_today": 104_000, "covers_today": 196, "labor_pct": 25.3,
    },
    {
        "id": "outlet_amber", "property_id": "prop_miami_flagship",
        "name": "Amber Rooftop", "location": "Downtown", "type": "resort-bar",
        "health": 81.3, "status": "critical",
        "net_today": 51_000, "covers_today": 142, "labor_pct": 36.8,
    },
    {
        "id": "outlet_pearl", "property_id": "prop_miami_flagship",
        "name": "Pearl Oyster Bar", "location": "Las Olas", "type": "restaurant",
        "health": 96.4, "status": "healthy",
        "net_today": 119_000, "covers_today": 244, "labor_pct": 23.9,
    },
    # Vegas property — shown only to regional-director
    {
        "id": "outlet_mirage_gs", "property_id": "prop_vegas_resort",
        "name": "Mirage Grand Steakhouse", "location": "Strip", "type": "restaurant",
        "health": 94.1, "status": "healthy",
        "net_today": 187_000, "covers_today": 402, "labor_pct": 22.4,
    },
    {
        "id": "outlet_mirage_pool", "property_id": "prop_vegas_resort",
        "name": "Oasis Poolside", "location": "Strip", "type": "pool",
        "health": 89.6, "status": "watch",
        "net_today": 72_000, "covers_today": 310, "labor_pct": 30.1,
    },
]

# Properties seen by district-chef (subset of all properties). The list is
# example data — production is driven by user_roles.property_ids (migration
# 040). District chef in the seeded data oversees both Miami + Vegas.
ROLE_PROPERTY_ACCESS = {
    "district-chef":     {"scope": "properties",
                           "property_ids": ["prop_miami_flagship", "prop_vegas_resort"]},
}

# Who can see what. Outlet assignment for scoped roles.
# exec-chef Gio runs 4 restaurants from one kitchen (per William's note).
ROLE_OUTLET_ACCESS = {
    "regional-director":   {"scope": "all_properties"},
    "director":            {"scope": "property", "property_id": "prop_miami_flagship"},
    "exec-dir-finance":    {"scope": "property", "property_id": "prop_miami_flagship"},
    "fb-director":         {"scope": "property", "property_id": "prop_miami_flagship",
                            "filter_types": ["restaurant", "bar", "resort-bar"]},
    "general-manager":     {"scope": "outlets",
                            "outlet_ids": ["outlet_sapphire", "outlet_noir"]},
    "executive-chef":      {"scope": "outlets",  # Chef Gio · 4 outlets / 1 kitchen
                            "outlet_ids": ["outlet_sapphire", "outlet_noir",
                                           "outlet_verde", "outlet_amber"]},
    "sous-chef":           {"scope": "outlets",
                            "outlet_ids": ["outlet_sapphire", "outlet_noir"]},
    "pastry-chef":         {"scope": "outlets",
                            "outlet_ids": ["outlet_sapphire", "outlet_noir",
                                           "outlet_amber"]},
    "controller":          {"scope": "property", "property_id": "prop_miami_flagship"},
    "events-manager":      {"scope": "outlets",
                            "outlet_ids": ["outlet_amber"]},
    "dir-banquets":        {"scope": "property", "property_id": "prop_miami_flagship",
                            "filter_types": ["restaurant", "resort-bar"]},  # banquet-eligible
    "admin":               {"scope": "all_properties"},
    "owner":               {"scope": "all_properties"},
    # District chef — assigned subset of properties; sees outlets for any of
    # them. Property tier UI lets them drill into one resort at a time.
    "district-chef":       {"scope": "properties",
                            "property_ids": ["prop_miami_flagship", "prop_vegas_resort"]},
    # Chef de Cuisine — owns ONE outlet end-to-end. Was a seeded test user
    # but the role was missing from this map; CDC sign-in returned an empty
    # portfolio. Production assignment comes from user_roles.outlet_ids.
    "chef-de-cuisine":     {"scope": "outlets",
                            "outlet_ids": ["outlet_sapphire"]},
}

# Which Chronos view a role lands on. Drives the initial render on /chronos.
#
#   "properties"  → district-chef sees a grid of N property cards; click
#                   a property to drill into its outlets.
#   "outlets"     → directors/exec-chefs/etc. land on the outlet portfolio
#                   directly (existing behavior).
#   "outlet"      → CDC lands directly on the single-outlet ops view; skips
#                   the portfolio entirely.
ROLE_LANDING_TIER = {
    "regional-director":  "properties",   # all properties → drill into one
    "district-chef":      "properties",   # subset of properties
    "admin":              "properties",
    "owner":              "properties",
    "chef-de-cuisine":    "outlet",       # single outlet, no choice
}

# ── Connection-check fallback helper ───────────────────────────────────
def _live_outlets_or_fallback() -> list[dict]:
    """Returns live outlets from `db.outlets` (populated by AdminOnboarding)
    if the collection is non-empty, else falls back to SEEDED_OUTLETS so
    the UI always has something to show. When the real wiring lands, code
    path flows through automatically without a deployment."""
    try:
        live = list(db["outlets"].find({"active": {"$ne": False}}, {"_id": 0}))
        # Normalize to Chronos shape (name, location, type etc. may already be there
        # from AdminOnboarding; the onboarding seed uses these exact keys).
        if live:
            normalized = []
            for o in live:
                normalized.append({
                    "id": o.get("id") or o.get("_id_str") or o.get("outlet_id"),
                    "property_id": o.get("property_id", "prop_miami_flagship"),
                    "name": o.get("name", "Untitled Outlet"),
                    "location": o.get("location", o.get("address", "—")),
                    "type": o.get("type", "restaurant"),
                    # KPI fields: prefer live, else deterministic mock
                    "health": o.get("health", _mock_health(o.get("id") or o.get("name", ""))),
                    "status": o.get("status", _mock_status(o.get("id") or o.get("name", ""))),
                    "net_today": o.get("net_today", 0),
                    "covers_today": o.get("covers_today", 0),
                    "labor_pct": o.get("labor_pct", 25.0),
                })
            return normalized
    except Exception:
        pass
    return list(SEEDED_OUTLETS)

def _mock_health(seed: str) -> float:
    r = _rand_for(f"{seed}:health")
    return round(88 + r.random() * 11, 1)

def _mock_status(seed: str) -> str:
    h = _mock_health(seed)
    return "critical" if h < 85 else "drift" if h < 90 else "watch" if h < 94 else "healthy"

# ───────────────────────────── Helpers ─────────────────────────────

def _rand_for(seed_str: str) -> random.Random:
    """Deterministic RNG keyed to a string, so mock data is stable per outlet."""
    h = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
    return random.Random(h)

def _sparkline(outlet_id: str, metric: str, days: int = 30, base: float = 1.0,
               volatility: float = 0.15) -> list[float]:
    """Generate a stable 30-point sparkline series for this (outlet, metric)."""
    r = _rand_for(f"{outlet_id}:{metric}")
    series = []
    val = base
    for _ in range(days):
        val = max(0.01, val * (1 + r.uniform(-volatility, volatility)))
        series.append(round(val, 4))
    return series

def _admin_assignment(user_id: str, email: str | None) -> tuple[dict | None, str | None]:
    """Find this user's admin-assigned profile and report which collection
    it came from. Searches:

      1. db["admin_users"] — populated by POST /api/admin/users (the
         customer-admin profile builder flow).
      2. db["user_roles"]  — the migration-040 RBAC table (preferred for
         a postgres-backed deployment).

    The customer's admin creates a profile, picks outlets, attaches the
    employee — that flow writes outlet_ids[]. Chronos needs to read those
    assignments so a CDC who oversees 4 outlets sees those 4 outlets,
    regardless of what the seeded role-map says.

    Returns (row, source_name) or (None, None)."""
    for coll in ("admin_users", "user_roles"):
        try:
            row = db[coll].find_one({"user_id": user_id}, {"_id": 0})
            if not row and email:
                row = db[coll].find_one({"email": email}, {"_id": 0})
            if row:
                return row, coll
        except Exception:
            continue
    return None, None


def _scope_from_outlet_ids(outlet_ids: list[str], role: str) -> dict:
    """Translate an admin-assigned `outlet_ids` array into a Chronos scope
    dict. The scope shape determines which view tier the UI lands on:

      ["all"]                → all_properties (super-admin)
      empty or None          → fall back to ROLE_OUTLET_ACCESS for the role
      one outlet             → scope=outlets,    outlet_ids=[that one]
      outlets in 1 property  → scope=outlets,    outlet_ids=[…]
      outlets in N properties → scope=properties, property_ids=[…]
                                 (district-chef style landing — UI shows
                                  property cards; click one to drill in)
    """
    if not outlet_ids:
        return ROLE_OUTLET_ACCESS.get(role, {"scope": "none"})
    if "all" in outlet_ids:
        return {"scope": "all_properties"}
    # Resolve which properties are represented by these outlet_ids
    all_outlets = _live_outlets_or_fallback()
    by_id = {o.get("id"): o for o in all_outlets}
    prop_set = set()
    for oid in outlet_ids:
        out = by_id.get(oid)
        if out and out.get("property_id"):
            prop_set.add(out["property_id"])
    # Multi-property assignment → property tier landing
    if len(prop_set) >= 2:
        return {"scope": "properties", "property_ids": sorted(prop_set),
                "outlet_ids": list(outlet_ids)}
    # Single property (or unknown property): outlets tier landing.
    return {"scope": "outlets", "outlet_ids": list(outlet_ids)}


def _resolve_user_scope(user_id: str) -> dict:
    """Resolve a user to {user, role, access}. Precedence:

      1. Admin-assigned outlet_ids in db["admin_users"] / db["user_roles"]
         — the customer's admin populates these via the Profile Builder
         (POST /api/admin/users etc.). This is the per-user override.
      2. Hardcoded ROLE_OUTLET_ACCESS by role — used for seeded demo
         users and as a fallback when no admin assignment exists.

    The first branch makes the dashboard auto-derive from the admin's
    assignment: pick 4 outlets across 1 property → outlet tier; pick 6
    outlets across 2 resorts → property tier (drill-down)."""
    user = db["auth_users"].find_one({"id": user_id}, {"_id": 0})
    if not user:
        user = db["auth_users"].find_one({"user_id": user_id}, {"_id": 0})
    role = (user or {}).get("role", "")
    email = (user or {}).get("email")

    # Admin-assigned profile override.
    assignment, source = _admin_assignment(user_id, email)
    if assignment:
        outlet_ids = assignment.get("outlet_ids") or []
        role = role or assignment.get("role") or ""
        if outlet_ids:
            return {"user": user or assignment, "role": role,
                    "access": _scope_from_outlet_ids(outlet_ids, role),
                    "_assignment_source": source}
        # Assignment row exists but no outlet_ids — fall through to role map.

    access = ROLE_OUTLET_ACCESS.get(role, {"scope": "none"})
    return {"user": user, "role": role, "access": access,
            "_assignment_source": "role_map"}

def _outlets_for(access: dict) -> list[dict]:
    all_outlets = _live_outlets_or_fallback()
    if access["scope"] == "all_properties":
        return all_outlets
    if access["scope"] == "property":
        pid = access["property_id"]
        rows = [o for o in all_outlets if o.get("property_id") == pid]
        if access.get("filter_types"):
            rows = [o for o in rows if o.get("type") in access["filter_types"]]
        return rows
    if access["scope"] == "properties":
        # District-chef tier: outlets across the assigned properties. If the
        # admin assignment included an explicit outlet_ids list (e.g. "this
        # district chef oversees these 8 specific restaurants across 2
        # resorts"), narrow to that subset; otherwise return every outlet
        # in those properties.
        pids = set(access.get("property_ids") or [])
        rows = [o for o in all_outlets if o.get("property_id") in pids]
        oids = access.get("outlet_ids")
        if oids:
            id_set = set(oids)
            rows = [o for o in rows if o.get("id") in id_set]
        return rows
    if access["scope"] == "outlets":
        ids = set(access["outlet_ids"])
        return [o for o in all_outlets if o.get("id") in ids]
    return []


def _properties_for(access: dict) -> list[dict]:
    """Return the property records this role can see (used by the
    district-chef property-tier landing). For roles whose access is
    outlet-scoped or single-property, derives the property list from the
    outlets they can reach."""
    all_outlets = _live_outlets_or_fallback()
    if access["scope"] == "all_properties":
        prop_ids = {o.get("property_id") for o in all_outlets}
    elif access["scope"] == "properties":
        prop_ids = set(access.get("property_ids") or [])
    elif access["scope"] == "property":
        prop_ids = {access["property_id"]}
    elif access["scope"] == "outlets":
        ids = set(access.get("outlet_ids") or [])
        prop_ids = {o.get("property_id") for o in all_outlets if o.get("id") in ids}
    else:
        prop_ids = set()
    return [p for p in SEEDED_PROPERTIES if p["id"] in prop_ids]


def _property_card(prop: dict, outlets: list[dict]) -> dict:
    """Build a property-card payload (aggregate KPIs across the property's
    outlets). Drives the district-chef landing grid."""
    if not outlets:
        return {**prop, "outlet_count": 0, "total_net_today": 0,
                "total_covers_today": 0, "health_avg": 0.0,
                "flag_count": 0, "status": "watch"}
    total_net = sum(o.get("net_today", 0) for o in outlets)
    total_cov = sum(o.get("covers_today", 0) for o in outlets)
    health_avg = round(sum(o.get("health", 0) for o in outlets) / len(outlets), 1)
    flag_count = sum(1 for o in outlets
                     if o.get("status") in ("watch", "drift", "critical"))
    # Roll a property-level status: worst-of-children weighted by criticality.
    if any(o.get("status") == "critical" for o in outlets):
        status = "critical"
    elif sum(1 for o in outlets if o.get("status") == "drift") >= 2:
        status = "drift"
    elif flag_count >= 1:
        status = "watch"
    else:
        status = "healthy"
    return {**prop, "outlet_count": len(outlets), "total_net_today": total_net,
            "total_covers_today": total_cov, "health_avg": health_avg,
            "flag_count": flag_count, "status": status}

# ───────────────────────────── Endpoints ─────────────────────────────

@router.get("/portfolio")
def portfolio(user_id: str = Query(..., description="Auth user id")):
    """Return outlet cards the user is allowed to see, plus summary KPIs.

    Shape matches the Chronos portfolio-view design:
      { properties: [...], outlets: [ {id, name, location, health, status, net, covers, labor_pct} ],
        summary: { total_net, total_covers, health_avg, flag_count },
        morning_brief: { movers, critical } }
    """
    scope = _resolve_user_scope(user_id)
    outlets = _outlets_for(scope["access"])
    if not outlets and scope["role"]:
        # Role recognized but no outlets assigned yet — give an empty portfolio
        outlets = []

    # Summary KPIs
    total_net = sum(o["net_today"] for o in outlets)
    total_covers = sum(o["covers_today"] for o in outlets)
    health_avg = round(sum(o["health"] for o in outlets) / len(outlets), 1) if outlets else 0.0
    flag_count = sum(1 for o in outlets if o["status"] in ("watch", "drift", "critical"))

    # Which properties are represented (for regional-director grouping)
    prop_ids = {o["property_id"] for o in outlets}
    properties = [p for p in SEEDED_PROPERTIES if p["id"] in prop_ids]

    # Morning brief (mocked — real impl pulls from service-recovery + alerts)
    movers = sum(1 for o in outlets if o["status"] in ("watch", "drift"))
    critical = sum(1 for o in outlets if o["status"] == "critical")

    # Property cards (for tier="properties" landing). Each card aggregates
    # KPIs across the property's accessible outlets.
    property_cards = [
        _property_card(p, [o for o in outlets if o.get("property_id") == p["id"]])
        for p in properties
    ]
    # Default landing tier: properties for district/regional, outlet for CDC,
    # outlets for everyone else. Frontend reads this to skip portfolio when
    # a CDC has only one outlet, etc.
    landing_tier = ROLE_LANDING_TIER.get(scope["role"], "outlets")
    # Auto-collapse: if landing_tier=="properties" but there's only one
    # property visible, jump straight to outlets.
    if landing_tier == "properties" and len(property_cards) <= 1:
        landing_tier = "outlets"
    # Auto-collapse: if outlet-scoped role has exactly one outlet, jump
    # to the single-outlet ops view (CDC pattern).
    if landing_tier == "outlet" or (landing_tier == "outlets" and len(outlets) == 1):
        landing_tier = "outlet"

    return {
        "user": {
            "id": scope["user"].get("id") if scope["user"] else user_id,
            "name": (scope["user"] or {}).get("name"),
            "role": scope["role"],
            "title": (scope["user"] or {}).get("title"),
        },
        "access": scope["access"],
        "view_tier": landing_tier,
        "properties": properties,
        "property_cards": property_cards,
        "outlets": outlets,
        "summary": {
            "total_net_today": total_net,
            "total_covers_today": total_covers,
            "health_avg": health_avg,
            "flag_count": flag_count,
            "outlet_count": len(outlets),
            "property_count": len(properties),
        },
        "morning_brief": {
            "movers_overnight": movers,
            "critical": critical,
            "video_ready_at": "06:00",
        },
    }


@router.get("/property/{property_id}")
def property_drill(property_id: str, user_id: str = Query(..., description="Auth user id")):
    """Drill into a single property: returns the outlets within that
    property that the user is allowed to see, plus property-level summary.

    Used by the district-chef / regional-director drill-down flow:
    Properties grid → click property card → this endpoint → outlet grid.
    Access is enforced — a user cannot drill into a property they have no
    outlets in (returns 403).
    """
    scope = _resolve_user_scope(user_id)
    user_outlets = _outlets_for(scope["access"])
    outlets = [o for o in user_outlets if o.get("property_id") == property_id]
    if not outlets:
        # Either no outlets in this property OR user has no access. We don't
        # leak which: 403 either way.
        raise HTTPException(403, "No accessible outlets in this property")
    prop = next((p for p in SEEDED_PROPERTIES if p["id"] == property_id), None)
    if not prop:
        raise HTTPException(404, "Property not found")
    card = _property_card(prop, outlets)
    return {
        "property": prop,
        "card": card,
        "outlets": outlets,
        "outlet_count": len(outlets),
    }


@router.get("/outlet/{outlet_id}")
def outlet_detail(outlet_id: str, day: int = Query(30, ge=1, le=30)):
    """Return a single outlet's 16-tile ops-view payload with 30-day sparklines.

    `day` (1-30) selects which "day" of the time-machine to snapshot — for now
    it just returns the full 30-day series; the frontend scrubber reads the
    series[day-1] position.
    """
    all_outlets = _live_outlets_or_fallback()
    outlet = next((o for o in all_outlets if o.get("id") == outlet_id), None)
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    # 16 KPI tiles with deterministic sparklines. Base values from the video.
    tiles = [
        {"key": "net_sales",      "label": "NET SALES",           "value": 79_200, "unit": "$",
         "series": _sparkline(outlet_id, "net_sales", base=80_000, volatility=0.15), "fmt": "currency"},
        {"key": "covers",         "label": "COVERS · RES/WALK",   "value": 315, "sub": "189 res · 126 walk",
         "series": _sparkline(outlet_id, "covers", base=320, volatility=0.10), "fmt": "int"},
        {"key": "avg_check",      "label": "AVG CHECK · PPA",     "value": 38.47, "unit": "$",
         "series": _sparkline(outlet_id, "avg_check", base=38, volatility=0.05), "fmt": "currency"},
        {"key": "labor_pct",      "label": "LABOR % · VS THEO",   "value": 33.5, "sub": "theo 31.1%", "unit": "%",
         "series": _sparkline(outlet_id, "labor_pct", base=32, volatility=0.08), "fmt": "percent", "threshold": 31.1},
        {"key": "food_cost",      "label": "FOOD COST % · THEO",  "value": 31.6, "sub": "theo 30.2%", "unit": "%",
         "series": _sparkline(outlet_id, "food_cost", base=30, volatility=0.06), "fmt": "percent", "threshold": 30.2},
        {"key": "theo_gap",       "label": "THEO-ACTUAL GAP",     "value": -200, "unit": "$",
         "series": _sparkline(outlet_id, "theo_gap", base=-180, volatility=0.30), "fmt": "currency-signed"},
        {"key": "inventory",      "label": "INVENTORY ON HAND",   "value": 29_400, "unit": "$",
         "series": _sparkline(outlet_id, "inventory", base=29_000, volatility=0.05), "fmt": "currency"},
        {"key": "purchases",      "label": "PURCHASES · LIVE PO", "value": 33, "unit": "$",
         "series": _sparkline(outlet_id, "purchases", base=40, volatility=0.60), "fmt": "currency"},
        # D22 · live commissary cost tile. Reads /api/commissary/cogs/today
        # via merge_live_tiles → _commissary_cost_today. Seeded $0 so a
        # property without commissary activity shows blank, not noise.
        {"key": "commissary_cost", "label": "COMMISSARY COST · TODAY", "value": 0, "unit": "$",
         "series": _sparkline(outlet_id, "commissary_cost", base=0, volatility=0.40), "fmt": "currency"},
        {"key": "voids_comps",    "label": "VOIDS/COMPS/OVER",    "value": 239, "unit": "$",
         "series": _sparkline(outlet_id, "voids_comps", base=220, volatility=0.20), "fmt": "currency"},
        {"key": "tip_pct",        "label": "TIP % · SERVICE",     "value": 19.5, "unit": "%",
         "series": _sparkline(outlet_id, "tip_pct", base=19, volatility=0.04), "fmt": "percent"},
        {"key": "wait",           "label": "WAIT · TURN VELOCITY","value": 13, "unit": "min",
         "series": _sparkline(outlet_id, "wait", base=14, volatility=0.15), "fmt": "int"},
        {"key": "sales_labor_hr", "label": "SALES / LABOR HR",    "value": 136, "unit": "$",
         "series": _sparkline(outlet_id, "sales_labor_hr", base=135, volatility=0.08), "fmt": "currency"},
        {"key": "forecast_acc",   "label": "FORECAST ACCURACY",   "value": 88.0, "unit": "%",
         "series": _sparkline(outlet_id, "forecast_acc", base=88, volatility=0.03), "fmt": "percent"},
        {"key": "guardian",       "label": "GUARDIAN ALERTS",     "value": 4, "unit": "",
         "series": _sparkline(outlet_id, "guardian", base=3, volatility=0.40), "fmt": "int"},
        {"key": "sentiment",      "label": "GUEST SENTIMENT",     "value": 4.21, "unit": "/5",
         "series": _sparkline(outlet_id, "sentiment", base=4.2, volatility=0.02), "fmt": "score"},
        {"key": "reo",            "label": "REO · REV / AVAIL SEAT","value": 68.40, "unit": "$",
         "series": _sparkline(outlet_id, "reo", base=68, volatility=0.10), "fmt": "currency"},
    ]

    # Timeline event pins — fixed at the days from the video
    event_pins = [
        {"day": 10, "kind": "anomaly", "label": "Anomaly · cross-month invoice",
         "color": "amber"},
        {"day": 15, "kind": "low",     "label": "Worst variance · day 15",
         "color": "rose"},
        {"day": 18, "kind": "high",    "label": "Top sales · day 18",
         "color": "emerald"},
        {"day": 25, "kind": "risk",    "label": "OT cascade · day 25",
         "color": "orange"},
    ]

    # Weather backdrop strip — each day has a weather code used to tint the timeline
    weather = [
        {"day": d + 1, "code": (_rand_for(f"{outlet_id}:wx:{d}").choices(
            ["clear", "cloudy", "rain", "storm"], weights=[55, 25, 15, 5]
        )[0])}
        for d in range(30)
    ]

    # D4: replace seeded values with live computations where DB activity
    # exists. Tiles not yet wired to a live source keep the seeded value
    # and gain `_source: "seed"`. The chef/reviewer can see at a glance
    # which numbers are real vs baseline.
    tiles = merge_live_tiles(tiles, db, outlet_id)

    # Emit a high-water mark for the dashboard's "as of" caption.
    live_count = sum(1 for t in tiles if t.get("_source") == "live")
    derived_count = sum(1 for t in tiles if t.get("_source") == "derived")

    return {
        "outlet": outlet,
        "day": day,
        "tiles": tiles,
        "event_pins": event_pins,
        "weather": weather,
        "_meta": {
            "live_tile_count": live_count,
            "derived_tile_count": derived_count,
            "seed_tile_count": len(tiles) - live_count - derived_count,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@router.get("/compare")
def compare(ids: str = Query(..., description="Comma-separated outlet ids (max 3)")):
    """Return side-by-side summary for 2-3 outlets."""
    id_list = [i.strip() for i in ids.split(",") if i.strip()][:3]
    if len(id_list) < 2:
        raise HTTPException(400, "Provide at least 2 outlet ids")
    rows = [o for o in SEEDED_OUTLETS if o["id"] in id_list]
    if len(rows) != len(id_list):
        raise HTTPException(404, "One or more outlets not found")
    # Compact metrics used in the compare header
    compact = [{
        "id": o["id"], "name": o["name"], "location": o["location"],
        "health": o["health"], "status": o["status"],
        "net_today": o["net_today"], "covers_today": o["covers_today"],
        "labor_pct": o["labor_pct"],
        "avg_check": round(o["net_today"] / max(o["covers_today"], 1), 2),
    } for o in rows]
    return {"outlets": compact}


@router.get("/forecast-tomorrow")
def forecast_tomorrow(outlet_id: Optional[str] = None, user_id: Optional[str] = None):
    """Monte Carlo-style tomorrow forecast. Returns P10/P50/P90 bands.

    Simple jittered sampler over a normal centered on trailing-30d average.
    """
    # Determine scope
    if outlet_id:
        rows = [o for o in SEEDED_OUTLETS if o["id"] == outlet_id]
        if not rows: raise HTTPException(404, "Outlet not found")
    elif user_id:
        rows = _outlets_for(_resolve_user_scope(user_id)["access"])
    else:
        rows = SEEDED_OUTLETS

    def mc_bands(base: float, label: str, n: int = 1000, sigma: float = 0.18):
        r = _rand_for(f"mc:{label}:{base}")
        samples = sorted([base * (1 + r.gauss(0, sigma)) for _ in range(n)])
        return {
            "p10": round(samples[int(n * 0.10)], 0),
            "p50": round(samples[int(n * 0.50)], 0),
            "p90": round(samples[int(n * 0.90)], 0),
        }

    forecasts = []
    for o in rows:
        forecasts.append({
            "outlet_id": o["id"],
            "outlet_name": o["name"],
            "tomorrow": {
                "net_sales": mc_bands(o["net_today"], f"{o['id']}:net"),
                "covers":    mc_bands(o["covers_today"], f"{o['id']}:cov", sigma=0.12),
                "labor_pct": mc_bands(o["labor_pct"], f"{o['id']}:lbr", sigma=0.06),
            },
        })

    # Portfolio-level aggregate
    total_p50 = sum(f["tomorrow"]["net_sales"]["p50"] for f in forecasts)
    total_cov_p50 = sum(f["tomorrow"]["covers"]["p50"] for f in forecasts)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tomorrow_date": (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat(),
        "n_simulations": 1000,
        "outlets": forecasts,
        "aggregate": {
            "net_sales_p50": total_p50,
            "covers_p50": total_cov_p50,
        },
    }


@router.get("/properties")
def properties(user_id: str = Query(..., description="Auth user id")):
    """Regional-director property drill — groups accessible outlets by property."""
    scope = _resolve_user_scope(user_id)
    outlets = _outlets_for(scope["access"])
    by_prop: dict[str, dict] = {}
    for o in outlets:
        pid = o.get("property_id") or "prop_unknown"
        if pid not in by_prop:
            prop_meta = next((p for p in SEEDED_PROPERTIES if p["id"] == pid), None)
            by_prop[pid] = {
                "property_id": pid,
                "name": (prop_meta or {}).get("name", pid),
                "code": (prop_meta or {}).get("code", "—"),
                "timezone": (prop_meta or {}).get("timezone"),
                "outlets": [],
                "total_net_today": 0,
                "total_covers_today": 0,
                "flag_count": 0,
                "health_avg": 0.0,
            }
        by_prop[pid]["outlets"].append(o)
        by_prop[pid]["total_net_today"] += o.get("net_today", 0)
        by_prop[pid]["total_covers_today"] += o.get("covers_today", 0)
        if o.get("status") in ("watch", "drift", "critical"):
            by_prop[pid]["flag_count"] += 1
    for p in by_prop.values():
        outs = p["outlets"]
        p["health_avg"] = round(sum(x.get("health", 0) for x in outs) / max(len(outs), 1), 1)
        p["outlet_count"] = len(outs)
    return {"properties": list(by_prop.values())}


@router.get("/prep-forecast")
def prep_forecast(outlet_id: str = Query(..., description="Outlet id"),
                   days: int = Query(3, ge=1, le=7)):
    """3-day (configurable) per-day Monte Carlo prep demand forecast.
    Auto-generates a production sheet: for each day, how many covers P50 expected,
    and how many units of top prep items to pre-make (based on mix %).
    """
    all_outlets = _live_outlets_or_fallback()
    outlet = next((o for o in all_outlets if o.get("id") == outlet_id), None)
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    # Top prep items — pulled from recipes collection if wired, else seeded mix.
    # Each item: name, mix_pct (% of covers that order it), prep_unit, prep_per_unit
    seeded_prep_items = [
        {"item": "Sapphire Ribeye 12oz",  "mix_pct": 0.22, "station": "grill",     "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Filet Mignon 8oz",      "mix_pct": 0.17, "station": "grill",     "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Pan-Seared Salmon",     "mix_pct": 0.15, "station": "saute",     "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Caesar Salad",          "mix_pct": 0.28, "station": "garde",     "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Lobster Bisque",        "mix_pct": 0.19, "station": "saute",     "prep_unit": "cup",     "prep_per_unit": 1},
        {"item": "Chocolate Lava Cake",   "mix_pct": 0.12, "station": "pastry",    "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Seasonal Flatbread",    "mix_pct": 0.09, "station": "pizza",     "prep_unit": "portion", "prep_per_unit": 1},
        {"item": "Wagyu Burger",          "mix_pct": 0.14, "station": "grill",     "prep_unit": "portion", "prep_per_unit": 1},
    ]
    try:
        live_recipes = list(db["recipes"].find(
            {"outlet_id": outlet_id, "active": {"$ne": False}},
            {"_id": 0, "name": 1, "mix_pct": 1, "station": 1, "prep_unit": 1}
        ).limit(20))
        if live_recipes:
            seeded_prep_items = [{"item": r.get("name"),
                                   "mix_pct": r.get("mix_pct", 0.1),
                                   "station": r.get("station", "line"),
                                   "prep_unit": r.get("prep_unit", "portion"),
                                   "prep_per_unit": 1} for r in live_recipes]
    except Exception:
        pass

    base_covers = outlet.get("covers_today") or 300
    today = datetime.now(timezone.utc).date()
    forecast_days = []
    for d in range(1, days + 1):
        target_date = today + timedelta(days=d)
        # Day-of-week factor (Mon-Thu lower, Fri-Sun higher)
        dow = target_date.weekday()
        dow_factor = [0.85, 0.90, 0.92, 0.95, 1.15, 1.30, 1.10][dow]
        r = _rand_for(f"prep:{outlet_id}:{target_date.isoformat()}")
        samples = sorted([base_covers * dow_factor * (1 + r.gauss(0, 0.12)) for _ in range(500)])
        covers = {
            "p10": round(samples[50], 0),
            "p50": round(samples[250], 0),
            "p90": round(samples[450], 0),
        }
        # Production sheet — one row per prep item, quantities at P50
        prod_rows = []
        for item in seeded_prep_items:
            qty = round(covers["p50"] * item["mix_pct"] * item["prep_per_unit"], 0)
            prod_rows.append({
                "item": item["item"], "station": item["station"],
                "prep_unit": item["prep_unit"], "qty_p50": qty,
                "qty_p90": round(covers["p90"] * item["mix_pct"] * item["prep_per_unit"], 0),
            })
        # Station rollup (for heat-map)
        station_rollup: dict[str, int] = {}
        for row in prod_rows:
            station_rollup[row["station"]] = station_rollup.get(row["station"], 0) + row["qty_p50"]
        forecast_days.append({
            "date": target_date.isoformat(),
            "day_of_week": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dow],
            "covers": covers,
            "production_sheet": prod_rows,
            "station_rollup": station_rollup,
        })
    return {
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_simulations": 500,
        "days": forecast_days,
    }


@router.get("/beos-live")
def beos_live(user_id: str = Query(..., description="Auth user id"),
              days_ahead: int = Query(31, ge=1, le=90)):
    """Live BEO feed — shown to Executive Chef, Director of Banquets, Director.
    Reads from `beos` collection if wired, else mocks demo events so UI renders."""
    scope = _resolve_user_scope(user_id)
    role = scope["role"]
    # Only banquet-touching roles get this feed
    allowed = {"admin", "owner", "regional-director", "director", "fb-director",
               "general-manager", "executive-chef", "dir-banquets", "events-manager"}
    if role not in allowed:
        raise HTTPException(403, "Not authorized for BEO feed")

    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=days_ahead)
    live = []
    try:
        cur = db["beos"].find({
            "event_date": {"$gte": now.isoformat(), "$lte": horizon.isoformat()}
        }, {"_id": 0}).limit(200)
        live = list(cur)
    except Exception:
        live = []

    if not live:
        # Seeded mock BEOs for the next 30 days
        outlets = _outlets_for(scope["access"])
        r = _rand_for(f"beos:{role}")
        live = []
        for i in range(12):
            day_offset = r.randint(1, days_ahead)
            event_date = (now + timedelta(days=day_offset)).isoformat()
            outlet = outlets[i % max(len(outlets), 1)] if outlets else {"id": "outlet_amber", "name": "Amber Rooftop"}
            live.append({
                "id": f"beo_mock_{i}",
                "event_name": r.choice(["Corporate Welcome Dinner", "Wedding Reception",
                                         "Pharma Launch Gala", "Board Retreat Lunch",
                                         "Vendor Appreciation", "Summer Solstice Mixer",
                                         "Anniversary Ball", "Tech Summit Breakfast"]),
                "event_date": event_date,
                "outlet_id": outlet.get("id"),
                "outlet_name": outlet.get("name"),
                "guest_count": r.randint(40, 320),
                "revenue_budget": r.randint(8_000, 45_000),
                "status": r.choice(["confirmed", "tentative", "pending_menu", "execution_ready"]),
                "coordinator": r.choice(["Yuki Tanaka", "Isabella Moreau", "Marcus Hayes"]),
                "menu_finalized": r.random() > 0.3,
                "floor_plan_ready": r.random() > 0.5,
                "days_until": day_offset,
            })
        # Sort by event_date ascending
        live.sort(key=lambda x: x["event_date"])

    # Month-view rollup for MaestroBQT-style calendar
    by_day: dict[str, int] = {}
    for b in live:
        d = b["event_date"][:10] if isinstance(b.get("event_date"), str) else ""
        by_day[d] = by_day.get(d, 0) + 1

    return {
        "role": role,
        "events": live,
        "count": len(live),
        "by_day": by_day,
        "horizon_days": days_ahead,
    }


@router.get("/access/me")
def my_access(user_id: str = Query(..., description="Auth user id")):
    """Returns the effective module list + landing panel + tier for this user.
    Frontend reads this to render the sidebar and decide which panels to allow."""
    scope = _resolve_user_scope(user_id)
    role = scope["role"]
    return {
        "role": role,
        "tier": tier_of(role),
        "landing": landing_panel(role),
        "modules": effective_modules(role),
        "depts": (ROLE_ACCESS.get(role) or {}).get("depts", []),
    }
