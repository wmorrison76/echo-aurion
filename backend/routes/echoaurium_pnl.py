"""iter230 · EchoAurium Full P&L · 8 demo outlets for a hospitality resort.

Seeds the EchoAurium finance module with the full GL-coded structure based
on a typical resort F&B statement. Uses neutral demo outlet names
(Rooftop Lounge, Garden Room, Club Bar, Pool Grill, Market Cafe,
Coastal Kitchen, In-Room Dining, Ballroom Catering). All amounts are
demo/synthesized — swap names/numbers via DB without code changes.

Collections:
  echoaurium_outlets        — 8 outlet catalog
  echoaurium_pnl_lines      — one row per (outlet_id, period, gl_code)
                              with actual/budget/variance/pct_rev
  echoaurium_occupancy      — hotel-level occupancy / ADR / RevPAR

Endpoints:
  GET /api/echoaurium/outlets                               — list W's 8 outlets
  GET /api/echoaurium/pnl/full?outlet_id=X&period=2026-03   — full GL P&L
  GET /api/echoaurium/pnl/occupancy?period=2026-03          — resort occupancy
  POST /api/echoaurium/seed-march-2026                       — idempotent seed
"""
from __future__ import annotations
import random
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/echoaurium", tags=["echoaurium"])


# ══════════════════════════════════════════════════════════════════════
# Outlet catalog — 8 neutral demo resort outlets
# ══════════════════════════════════════════════════════════════════════

OUTLETS = [
    {"id": "outlet-rooftop",     "name": "Rooftop Lounge",    "kind": "lounge",
      "gl_prefix": "66",  "seats": 80,  "covers_capacity": 120, "active": True},
    {"id": "outlet-garden",      "name": "Garden Room",       "kind": "lounge",
      "gl_prefix": "68",  "seats": 45,  "covers_capacity": 80,  "active": True},
    {"id": "outlet-clubbar",     "name": "Club Bar",          "kind": "lounge",
      "gl_prefix": "70",  "seats": 60,  "covers_capacity": 100, "active": True},
    {"id": "outlet-poolgrill",   "name": "Pool Grill",        "kind": "restaurant",
      "gl_prefix": "72",  "seats": 90,  "covers_capacity": 180, "active": True},
    {"id": "outlet-marketcafe",  "name": "Market Cafe",       "kind": "cafe",
      "gl_prefix": "74",  "seats": 50,  "covers_capacity": 150, "active": True},
    {"id": "outlet-coastal",     "name": "Coastal Kitchen",   "kind": "restaurant",
      "gl_prefix": "76",  "seats": 85,  "covers_capacity": 160, "active": True},
    {"id": "outlet-ird",         "name": "In-Room Dining",    "kind": "ird",
      "gl_prefix": "78",  "seats": 0,   "covers_capacity": 400, "active": True},
    {"id": "outlet-ballroom",    "name": "Ballroom Catering", "kind": "restaurant",
      "gl_prefix": "80",  "seats": 0,   "covers_capacity": 500, "active": True},
]


@router.get("/outlets")
def list_outlets(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Returns the chef's accessible outlets (William has all 9 active + Pelican)."""
    access = list(db["chef_outlet_access"].find(
        {"chef_id": x_user_id or "chef-william"}, {"_id": 0}))
    allowed = {a.get("outlet_id") for a in access} if access else None
    rows = [o for o in OUTLETS if (allowed is None or o["id"] in allowed)]
    return {"ok": True, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# GL line structure — based on William's real March 2026 P&L
# ══════════════════════════════════════════════════════════════════════

# Format: (gl_code, label, section, sub_section)
# Amounts will be assigned in the seeder with slight randomization per outlet.
PNL_STRUCTURE: List[Dict[str, Any]] = [
    # ── REVENUE ─────────────────────────────────────────
    {"gl_code": "4000", "label": "Venue Food Revenue",            "section": "revenue", "sub": "food"},
    {"gl_code": "4010", "label": "In-Room Dining Food Revenue",   "section": "revenue", "sub": "food", "ird_only": True},
    {"gl_code": "4020", "label": "Banquet/Catering Food Revenue", "section": "revenue", "sub": "food", "banquet": True},
    {"gl_code": "4030", "label": "Other Food Revenue",            "section": "revenue", "sub": "food"},
    {"gl_code": "4100", "label": "Venue Beverage Revenue",        "section": "revenue", "sub": "beverage"},
    {"gl_code": "4110", "label": "In-Room Dining Beverage",       "section": "revenue", "sub": "beverage", "ird_only": True},
    {"gl_code": "4120", "label": "Banquet/Catering Beverage",     "section": "revenue", "sub": "beverage", "banquet": True},
    {"gl_code": "4200", "label": "Other Beverage Revenue",        "section": "revenue", "sub": "beverage"},
    {"gl_code": "4300", "label": "Audio Visual",                  "section": "revenue", "sub": "other", "banquet": True},
    {"gl_code": "4310", "label": "Function Room Rental",          "section": "revenue", "sub": "other", "banquet": True},
    {"gl_code": "4320", "label": "Surcharges & Service Charges",  "section": "revenue", "sub": "other"},
    {"gl_code": "4330", "label": "Miscellaneous Other Revenue",   "section": "revenue", "sub": "other"},
    {"gl_code": "4900", "label": "Less: Allowances",              "section": "revenue", "sub": "allowance", "negative": True},

    # ── COST OF SALES ───────────────────────────────────
    {"gl_code": "5001", "label": "Cost of Food Sales",    "section": "cogs", "sub": "food"},
    {"gl_code": "5050", "label": "Cost of Beverage Sales", "section": "cogs", "sub": "beverage"},
    {"gl_code": "5100", "label": "Audiovisual Cost",       "section": "cogs", "sub": "other"},
    {"gl_code": "5150", "label": "Miscellaneous Cost",     "section": "cogs", "sub": "other"},

    # ── LABOR · Non-Management (W's exact GL codes) ─────
    {"gl_code": "6600", "label": "Management",                   "section": "labor", "sub": "management"},
    {"gl_code": "6605", "label": "Administrative",               "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6610", "label": "Attendant",                    "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6615", "label": "Bar Attendant",                "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6625", "label": "Bus Attendant",                "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6630", "label": "Captain",                      "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6635", "label": "Cashier/Greeter",              "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6650", "label": "Conference Services",          "section": "labor", "sub": "non_mgmt", "banquet": True},
    {"gl_code": "6665", "label": "Supervisor",                   "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6670", "label": "Food Preparation/Cook",        "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6690", "label": "House Attendant",              "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6760", "label": "Runner",                       "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6770", "label": "Sales Manager",                "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6785", "label": "Server",                       "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6790", "label": "Service Charge Distribution",  "section": "labor", "sub": "service_charge"},
    {"gl_code": "6795", "label": "Stewarding",                   "section": "labor", "sub": "non_mgmt"},
    {"gl_code": "6810", "label": "Overtime (all classes)",       "section": "labor", "sub": "overtime"},

    # ── PAYROLL-RELATED ─────────────────────────────────
    {"gl_code": "6900", "label": "Payroll Taxes",         "section": "payroll_related"},
    {"gl_code": "6910", "label": "FICA",                  "section": "payroll_related", "sub": "taxes"},
    {"gl_code": "6920", "label": "FUTA/SUTA",             "section": "payroll_related", "sub": "taxes"},
    {"gl_code": "6930", "label": "Workers Comp",          "section": "payroll_related"},
    {"gl_code": "6940", "label": "Health Insurance",      "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6945", "label": "401K Contribution",     "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6950", "label": "Vacation Pay",          "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6955", "label": "Holiday Pay",           "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6960", "label": "Sick Pay",              "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6970", "label": "Employee Meals",        "section": "payroll_related", "sub": "benefits"},
    {"gl_code": "6980", "label": "Contracted Labor",      "section": "payroll_related"},
    {"gl_code": "6985", "label": "Bonus/Incentives",      "section": "payroll_related"},

    # ── OTHER OPERATING EXPENSES (real GL codes from a USALI-aligned resort) ──
    {"gl_code": "7110", "label": "China Glass Silver",          "section": "other_exp", "sub": "smallwares"},
    {"gl_code": "7124", "label": "Commissions",                 "section": "other_exp"},
    {"gl_code": "7150", "label": "Complimentary Food & Beverage", "section": "other_exp"},
    {"gl_code": "7152", "label": "Complimentary Services & Gifts", "section": "other_exp"},
    {"gl_code": "7160", "label": "Contract Services",           "section": "other_exp"},
    {"gl_code": "7230", "label": "Decorations",                 "section": "other_exp"},
    {"gl_code": "7290", "label": "Dues & Subscriptions",        "section": "other_exp"},
    {"gl_code": "7340", "label": "Entertainment",               "section": "other_exp"},
    {"gl_code": "7400", "label": "Equipment Rental",            "section": "other_exp"},
    {"gl_code": "7470", "label": "Fuel",                        "section": "other_exp"},
    {"gl_code": "7640", "label": "Laundry & Dry Cleaning",      "section": "other_exp"},
    {"gl_code": "7710", "label": "Linen",                       "section": "other_exp"},
    {"gl_code": "7790", "label": "Menu & Beverage Lists",       "section": "other_exp"},
    {"gl_code": "7810", "label": "Music & Entertainment",       "section": "other_exp"},
    {"gl_code": "7850", "label": "Night Cleaning Allocation",   "section": "other_exp"},
    {"gl_code": "7930", "label": "HR · Development & Training", "section": "other_exp"},
    {"gl_code": "8078", "label": "Reservations",                "section": "other_exp"},
    {"gl_code": "8170", "label": "Supplies · Cleaning",         "section": "other_exp"},
    {"gl_code": "8200", "label": "Supplies · Operating",        "section": "other_exp"},
    # ★ Paper & plastics is SEPARATE from food — William's key requirement
    {"gl_code": "8210", "label": "Supplies · Paper & Plastics", "section": "other_exp", "sub": "paper"},
    {"gl_code": "8220", "label": "Supplies · Printing & Stationery", "section": "other_exp"},
    {"gl_code": "8330", "label": "Travel",                      "section": "other_exp"},
    {"gl_code": "8350", "label": "Uniform Laundry",             "section": "other_exp"},
    {"gl_code": "8360", "label": "Uniforms",                    "section": "other_exp"},
    {"gl_code": "8370", "label": "Utensils",                    "section": "other_exp"},
]


def _base_revenue(outlet_kind: str) -> float:
    """Realistic monthly revenue baselines per outlet type."""
    return {
        "lounge": 350_000, "restaurant": 480_000, "cafe": 95_000,
        "ird": 145_000,
    }.get(outlet_kind, 200_000)


def _pct(line: Dict[str, Any], outlet: Dict[str, Any]) -> float:
    """Target % of revenue per line. Tuned to USALI-aligned resort benchmarks."""
    section = line["section"]
    sub = line.get("sub")
    gl = line["gl_code"]
    # Revenue lines
    if section == "revenue":
        if sub == "food":
            if line.get("banquet"): return 0.0 if outlet["kind"] != "restaurant" else 0.0
            if line.get("ird_only"): return 1.0 if outlet["kind"] == "ird" else 0.0
            return 0.54 if outlet["kind"] in ("restaurant", "cafe", "ird") else 0.22
        if sub == "beverage":
            if line.get("banquet"): return 0.0
            if line.get("ird_only"): return 0.15 if outlet["kind"] == "ird" else 0.0
            return 0.45 if outlet["kind"] == "lounge" else 0.20
        if sub == "other":
            return 0.08
        if sub == "allowance":
            return -0.02
    # COGS
    if section == "cogs":
        if sub == "food": return 0.19      # 19% food cost
        if sub == "beverage": return 0.13  # 13% bev cost
        return 0.02
    # Labor
    if section == "labor":
        labor_map = {
            "6600": 0.065, "6605": 0.004, "6610": 0.003, "6615": 0.012,
            "6625": 0.003, "6630": 0.001, "6635": 0.007, "6650": 0.0015,
            "6665": 0.013, "6670": 0.045, "6690": 0.003, "6760": 0.008,
            "6770": 0.002, "6785": 0.020, "6790": 0.035, "6795": 0.013,
            "6810": 0.002,
        }
        return labor_map.get(gl, 0.005)
    if section == "payroll_related":
        pr_map = {
            "6900": 0.037, "6910": 0.015, "6920": 0.005,
            "6930": 0.007, "6940": 0.022, "6945": 0.004,
            "6950": 0.008, "6955": 0.003, "6960": 0.004, "6970": 0.013,
            "6980": 0.042, "6985": 0.005,
        }
        return pr_map.get(gl, 0.002)
    if section == "other_exp":
        oe_map = {
            "7110": 0.0007, "7124": 0.002, "7150": 0.004, "7152": 0.004,
            "7160": 0.014, "7230": 0.002, "7290": 0.0002, "7340": 0.0016,
            "7400": 0.0007, "7470": 0.0004, "7640": 0.004, "7710": 0.0007,
            "7790": 0.0008, "7810": 0.018, "7850": 0.014, "7930": 0.0002,
            "8078": 0.003, "8170": 0.004, "8200": 0.012,
            "8210": 0.002,   # Paper & plastics
            "8220": 0.0012, "8330": 0.0008, "8350": 0.011, "8360": 0.0014,
            "8370": 0.0002,
        }
        return oe_map.get(gl, 0.001)
    return 0.0


def _seed_outlet_pnl(outlet: Dict[str, Any], period: str) -> int:
    base = _base_revenue(outlet["kind"])
    # ±12% wobble per outlet to make each one different
    wobble = 1 + ((hash(outlet["id"]) % 24) - 12) / 100
    revenue = base * wobble
    docs = []
    for line in PNL_STRUCTURE:
        pct = _pct(line, outlet)
        if pct == 0: continue
        actual = round(revenue * pct, 2)
        # Budget is typically within ±8% of actual, Forecast ±5%
        seed = (outlet["id"] + line["gl_code"] + period).encode()
        h = sum(seed) % 100
        budget = round(actual * (1 + (h - 50) / 800), 2)
        forecast = round(actual * (1 + (h - 50) / 1600), 2)
        prior_year = round(actual * (1 - (h - 50) / 500), 2)
        variance = round(actual - budget, 2)
        var_pct = round(variance / budget * 100, 2) if budget else 0
        pct_rev = round(actual / revenue * 100, 2)
        docs.append({
            "id": f"aur-{outlet['id']}-{line['gl_code']}-{period}",
            "outlet_id": outlet["id"],
            "outlet_name": outlet["name"],
            "period": period,
            "gl_code": line["gl_code"],
            "label": line["label"],
            "section": line["section"],
            "sub_section": line.get("sub"),
            "actual": actual,
            "budget": budget,
            "forecast": forecast,
            "prior_year": prior_year,
            "variance": variance,
            "variance_pct": var_pct,
            "pct_of_rev": pct_rev,
            "updated_at": utcnow_iso(),
        })
    # Idempotent upsert
    for d in docs:
        db["echoaurium_pnl_lines"].update_one(
            {"id": d["id"]}, {"$set": d}, upsert=True)
    return len(docs)


@router.post("/seed-march-2026")
def seed_march_2026(force: bool = False):
    """Idempotent seed for 8 outlets @ period 2026-03.
    Also seeds one prior month (2026-02) so variance flows have data.
    Wipes legacy outlet IDs (windows/nectar/saltbreeze/elate/pools/twoclub/pelican) on first run."""
    # iter234: purge legacy outlet-IDs from previous seed (one-time cleanup)
    legacy_ids = ["outlet-windows", "outlet-nectar", "outlet-twoclub",
                   "outlet-pools", "outlet-elate", "outlet-saltbreeze",
                   "outlet-pelican"]
    db["echoaurium_pnl_lines"].delete_many({"outlet_id": {"$in": legacy_ids}})
    periods = ["2026-03", "2026-02"]
    total = 0
    for p in periods:
        for outlet in OUTLETS:
            if not outlet["active"] and not force: continue
            total += _seed_outlet_pnl(outlet, p)
    # Occupancy seed
    occ = [
        {"id": "occ-2026-03", "period": "2026-03",
          "available_rooms": 10261, "occupied_rooms": 6557, "rooms_sold": 6431,
          "occupancy_pct": 62.7, "adr": 558.40, "revpar": 349.97,
          "total_revpar": 846.57, "covers_total": 24820,
          "updated_at": utcnow_iso()},
        {"id": "occ-2026-02", "period": "2026-02",
          "available_rooms": 9754, "occupied_rooms": 7202, "rooms_sold": 7078,
          "occupancy_pct": 72.5, "adr": 565.20, "revpar": 409.77,
          "total_revpar": 882.10, "covers_total": 28340,
          "updated_at": utcnow_iso()},
    ]
    for o in occ:
        db["echoaurium_occupancy"].update_one({"id": o["id"]},
                                                {"$set": o}, upsert=True)
    # Grant William access to all outlets (wipe legacy access first)
    db["chef_outlet_access"].delete_many({
        "chef_id": "chef-william",
        "outlet_id": {"$in": ["outlet-windows", "outlet-nectar", "outlet-twoclub",
                               "outlet-pools", "outlet-elate", "outlet-saltbreeze",
                               "outlet-pelican"]},
    })
    for o in OUTLETS:
        db["chef_outlet_access"].update_one(
            {"chef_id": "chef-william", "outlet_id": o["id"]},
            {"$set": {"chef_id": "chef-william", "outlet_id": o["id"],
                       "role": "executive_chef", "granted_at": utcnow_iso()}},
            upsert=True)
    return {"ok": True, "periods": periods, "outlets": len(OUTLETS),
            "lines_written": total, "occupancy_rows": len(occ)}


# ══════════════════════════════════════════════════════════════════════
# Full P&L retrieval — the endpoint Echo calls when user says "show P&L"
# ══════════════════════════════════════════════════════════════════════

def _live_commissary_overlay(outlet_id: str, period: str) -> Dict[str, float]:
    """D19 · Sum live cogs_events for (outlet, period). Returns
    {debit_total, credit_total, net} in property currency.

    period is YYYY-MM. We translate to a date range and walk
    cogs_events.occurred_at. Result feeds the P&L overlay below
    so the chef sees REAL commissary transfer cost layered on
    top of the seeded baseline."""
    try:
        # period "2026-03" → start "2026-03-01", end "2026-04-01"
        y, m = period.split("-")
        start = f"{int(y):04d}-{int(m):02d}-01T00:00:00"
        nm = int(m) + 1
        ny = int(y)
        if nm > 12:
            nm = 1; ny += 1
        end = f"{ny:04d}-{nm:02d}-01T00:00:00"
    except Exception:
        return {"debit_total": 0.0, "credit_total": 0.0, "net": 0.0}

    events = list(db["cogs_events"].find(
        {"outlet_id": outlet_id,
         "source": "internal_transfer",
         "occurred_at": {"$gte": start, "$lt": end}}, {"_id": 0}))
    debit  = sum(float(e.get("amount") or 0) for e in events if e.get("direction") == "debit")
    credit = sum(float(e.get("amount") or 0) for e in events if e.get("direction") == "credit")
    return {"debit_total": round(debit, 2),
            "credit_total": round(credit, 2),
            "net": round(debit - credit, 2),
            "event_count": len(events)}


@router.get("/pnl/full")
def full_pnl(outlet_id: str, period: str = "2026-03",
              compare: str = Query("budget", pattern="^(budget|forecast|prior_year)$")):
    """Returns the FULL GL-level P&L for an outlet, grouped by section.
    Auto-seeds if period has no data.

    D19: now overlays live cogs_events from D16g — every confirmed
    commissary transfer adds to the receiving outlet's COGS as a
    LIVE line (gl_code 5001-LIVE) and CREDITS the producing outlet
    similarly. The seeded baseline rows stay so budget / forecast /
    prior_year comparisons still work; the overlay just adds the
    new actual-cost layer on top so the P&L is the truth, not the
    projection."""
    if db["echoaurium_pnl_lines"].count_documents({"period": period}) == 0:
        seed_march_2026()
    rows = list(db["echoaurium_pnl_lines"].find(
        {"outlet_id": outlet_id, "period": period}, {"_id": 0}
    ).sort([("section", 1), ("gl_code", 1)]))
    if not rows:
        return {"ok": False, "detail": f"No P&L data for {outlet_id}/{period}. Call /seed-march-2026 first."}

    # D19 · live commissary overlay before we walk the rows so the
    # COGS section picks it up in the same pass.
    overlay = _live_commissary_overlay(outlet_id, period)
    if overlay["debit_total"] != 0 or overlay["credit_total"] != 0:
        # Net effect on COGS for this outlet: debits add cost,
        # credits remove it (the producing-outlet side of a transfer).
        live_cogs = overlay["debit_total"] - overlay["credit_total"]
        rows.append({
            "id": f"aur-{outlet_id}-5001-LIVE-{period}",
            "outlet_id": outlet_id,
            "outlet_name": (rows[0].get("outlet_name") if rows else outlet_id),
            "period": period,
            "gl_code": "5001-LIVE",
            "label": "Live Commissary Transfers (D16g)",
            "section": "cogs",
            "sub_section": "food",
            "actual": round(live_cogs, 2),
            # Budget for the live overlay is by construction zero (it's
            # the "extra" beyond the budgeted line). Forecast/PY likewise.
            "budget": 0.0,
            "forecast": 0.0,
            "prior_year": 0.0,
            "variance": round(live_cogs, 2),
            "variance_pct": 0.0,
            "pct_of_rev": 0.0,
            "live_overlay": True,
            "event_count": overlay["event_count"],
            "updated_at": utcnow_iso(),
        })

    sections: Dict[str, Dict[str, Any]] = {}
    total_revenue = 0.0
    for r in rows:
        sec = r["section"]
        if sec not in sections:
            sections[sec] = {"lines": [], "actual_total": 0.0, "compare_total": 0.0, "budget_total": 0.0}
        sections[sec]["lines"].append(r)
        sections[sec]["actual_total"] += r["actual"]
        sections[sec]["compare_total"] += r.get(compare, r["budget"])
        sections[sec]["budget_total"] += r["budget"]
        if sec == "revenue":
            total_revenue += r["actual"]

    # Derived totals
    rev = sections.get("revenue", {}).get("actual_total", 0)
    cogs = sections.get("cogs", {}).get("actual_total", 0)
    labor = sections.get("labor", {}).get("actual_total", 0)
    pr = sections.get("payroll_related", {}).get("actual_total", 0)
    other = sections.get("other_exp", {}).get("actual_total", 0)
    total_labor = labor + pr
    gross_profit = rev - cogs
    prime_cost = cogs + total_labor
    departmental_profit = rev - cogs - total_labor - other

    kpis = {
        "total_revenue": round(rev, 2),
        "food_cost_pct": round(cogs / rev * 100, 2) if rev else 0,
        "labor_cost_pct": round(total_labor / rev * 100, 2) if rev else 0,
        "prime_cost": round(prime_cost, 2),
        "prime_cost_pct": round(prime_cost / rev * 100, 2) if rev else 0,
        "gross_profit": round(gross_profit, 2),
        "gross_profit_pct": round(gross_profit / rev * 100, 2) if rev else 0,
        "departmental_profit": round(departmental_profit, 2),
        "departmental_profit_pct": round(departmental_profit / rev * 100, 2) if rev else 0,
        # D19 · live commissary overlay so the UI can render
        # "of $X total food cost, $Y is live commissary transfers
        #  posted today (vs the budgeted recipe BOM line)"
        "live_commissary": overlay,
    }

    # Variance banners per section (William's rule: red if expense up AND %/rev up)
    banners = {}
    for sec_key, sec in sections.items():
        if sec_key == "revenue": continue
        act_pct = sec["actual_total"] / rev * 100 if rev else 0
        cmp_total = sec["compare_total"] or 1
        cmp_pct = sec["compare_total"] / rev * 100 if rev else 0
        if sec["actual_total"] > cmp_total and act_pct > cmp_pct + 0.1:
            banners[sec_key] = {"color": "red", "flash": True,
                                  "label": f"Over {compare} by ${sec['actual_total'] - cmp_total:,.0f} · {act_pct:.1f}% rev (plan {cmp_pct:.1f}%)"}
        elif sec["actual_total"] > cmp_total:
            banners[sec_key] = {"color": "green", "flash": False,
                                  "label": f"Over {compare} by ${sec['actual_total'] - cmp_total:,.0f} · % rev held at {act_pct:.1f}%"}
        else:
            banners[sec_key] = {"color": "neutral", "flash": False,
                                  "label": f"${cmp_total - sec['actual_total']:,.0f} under {compare}"}

    outlet = next((o for o in OUTLETS if o["id"] == outlet_id), {"name": outlet_id})

    return {
        "ok": True,
        "outlet_id": outlet_id, "outlet_name": outlet.get("name"),
        "outlet_kind": outlet.get("kind"),
        "period": period, "compare_to": compare,
        "sections": {k: {
            "lines": v["lines"],
            "actual_total": round(v["actual_total"], 2),
            "compare_total": round(v["compare_total"], 2),
            "budget_total": round(v["budget_total"], 2),
        } for k, v in sections.items()},
        "kpis": kpis,
        "banners": banners,
        "generated_at": utcnow_iso(),
    }


@router.get("/pnl/occupancy")
def get_occupancy(period: str = "2026-03"):
    occ = db["echoaurium_occupancy"].find_one({"period": period}, {"_id": 0})
    if not occ:
        seed_march_2026()
        occ = db["echoaurium_occupancy"].find_one({"period": period}, {"_id": 0})
    return {"ok": True, "occupancy": occ or {}}
