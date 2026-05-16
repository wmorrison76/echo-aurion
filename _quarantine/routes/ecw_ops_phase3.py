"""iter228 · ECW Operations Phase 3 — Activity feed · P&L · Dashboard ·
Invoice flagging · Delivery notifications · Commissary transfers ·
Flavor-profile-preserving recipe generation.

William's ask:
- "Show me my P&L" → activity bar refreshes with current P&L + forecast/budget
  variance (red banner if expense > forecast AND % of sales higher; green if
  above forecast but same/lower % of sales).
- "Show me my dashboard" → current outlet dashboard; chefs with multi-outlet
  access can switch.
- Click invoice to drill down; 🚩 flag button notifies accounting + other
  outlet managers with a comment.
- "Halperns just delivered" delivery notifications → pushed to activity feed.
- Commissary outlets (Production, Pastry, Storeroom) accessible as internal
  "vendors" for ordering.
- Echo Chef — create crab cakes "in my Maryland style" while preserving the
  flavor metrics of the chef's signature recipe. Leverages existing
  FLAVOR_DIMENSIONS (10 dims) and chef_flavor_profiles collection.

Collections (all excluded _id on read):
  ecw_activity_events      · {id, outlet_id, kind, title, detail, actor,
                              meta, created_at}
  invoices                 · {id, outlet_id, vendor_id, vendor_name, amount,
                              date, status, line_items[], flags[], gl_code?}
  invoice_flags            · {id, invoice_id, flagged_by, reason, comment,
                              notifies:[], created_at, resolved_at?}
  commissary_outlets       · {id, name, kind:'production'|'pastry'|'storeroom',
                              active}
  commissary_transfer_requests  · {id, source_commissary_id, dest_outlet_id,
                              items, status, created_at}
  vendor_deliveries        · {id, outlet_id, vendor_id, vendor_name,
                              delivered_at, driver?, note}
"""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/ecw-ops", tags=["ecw-ops-phase3"])


# ══════════════════════════════════════════════════════════════════════
# 1. Activity feed — real-time events for the right-side rail
# ══════════════════════════════════════════════════════════════════════

class ActivityIn(BaseModel):
    outlet_id: str = "outlet-main"
    kind: str = Field(..., min_length=1, max_length=40)
    title: str = Field(..., min_length=1, max_length=160)
    detail: Optional[str] = None
    actor: Optional[str] = None
    meta: Dict[str, Any] = {}


@router.post("/activity")
def log_activity(body: ActivityIn,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    doc = {
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "kind": body.kind,
        "title": body.title,
        "detail": body.detail,
        "actor": body.actor or x_user_id or "system",
        "meta": body.meta or {},
        "created_at": utcnow_iso(),
    }
    db["ecw_activity_events"].insert_one(dict(doc))
    return {"ok": True, "event": doc}


@router.get("/activity")
def list_activity(outlet_id: str = "outlet-main", limit: int = 30,
                  since_iso: Optional[str] = None):
    """Returns recent activity for the outlet. If `since_iso` provided,
    returns only events newer than that (enables efficient polling).

    Synthesises events from source collections on-the-fly so the feed is
    never empty — covers PO sent, line check completed, waste logged,
    delivery received, invoice flagged, requisition submitted.
    """
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if since_iso: q["created_at"] = {"$gt": since_iso}
    explicit = list(db["ecw_activity_events"].find(q, {"_id": 0})
                     .sort("created_at", -1).limit(min(limit, 200)))

    # Synthesise from other collections — only if we have <5 explicit events
    synth: List[Dict[str, Any]] = []
    if len(explicit) < 5:
        # Recent POs
        for po in db["procurement_orders"].find(
                {"outlet_id": outlet_id}, {"_id": 0}
        ).sort("created_at", -1).limit(5):
            synth.append({
                "id": f"synth-po-{po.get('id', '')}",
                "outlet_id": outlet_id,
                "kind": "po_sent",
                "title": f"PO to {po.get('vendor_name', 'vendor')}",
                "detail": f"{len(po.get('items') or [])} items · ${po.get('total', 0):.2f}",
                "actor": po.get("chef_id") or "system",
                "meta": {"po_id": po.get("id")},
                "created_at": po.get("created_at", utcnow_iso()),
                "_synth": True,
            })
        # Recent line-check sessions
        for lc in db["line_check_sessions"].find(
                {"outlet_id": outlet_id}, {"_id": 0}
        ).sort("started_at", -1).limit(3):
            synth.append({
                "id": f"synth-lc-{lc.get('id', '')}",
                "outlet_id": outlet_id,
                "kind": "line_check",
                "title": f"Line check · {lc.get('items_checked', 0)} items",
                "detail": (f"⚠ {lc.get('temp_excursions', 0)} temp excursions"
                           if lc.get("temp_excursions") else "All temps in range"),
                "actor": lc.get("chef_id") or "chef",
                "meta": {"session_id": lc.get("id")},
                "created_at": lc.get("started_at", utcnow_iso()),
                "_synth": True,
            })
        # Recent deliveries
        for d in db["vendor_deliveries"].find(
                {"outlet_id": outlet_id}, {"_id": 0}
        ).sort("delivered_at", -1).limit(3):
            synth.append({
                "id": f"synth-del-{d.get('id', '')}",
                "outlet_id": outlet_id,
                "kind": "delivery",
                "title": f"{d.get('vendor_name', 'Vendor')} just delivered",
                "detail": d.get("note") or f"Driver: {d.get('driver', 'N/A')}",
                "actor": "delivery",
                "meta": {"delivery_id": d.get("id")},
                "created_at": d.get("delivered_at", utcnow_iso()),
                "_synth": True,
            })

    combined = explicit + synth
    combined.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"ok": True, "count": len(combined), "rows": combined[:limit]}


# ══════════════════════════════════════════════════════════════════════
# 2. P&L snapshot — current MTD with forecast/budget variance
# ══════════════════════════════════════════════════════════════════════

def _month_bounds(now: datetime) -> (str, str):
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat(), now.isoformat()


def _variance_banner(actual: float, forecast: float, budget: float,
                     sales_pct_actual: float, sales_pct_forecast: float) -> Dict[str, Any]:
    """Returns {color: 'red'|'green'|'neutral', flash: bool, label: str}.
    Rules per William:
    - Red flash: expense > forecast AND %of-sales higher than forecast %
    - Green: expense > forecast BUT %of-sales same/lower than forecast %
    """
    if actual > forecast and sales_pct_actual > sales_pct_forecast + 0.1:
        return {"color": "red", "flash": True,
                "label": f"⚠ ${actual - forecast:,.0f} over forecast at "
                         f"{sales_pct_actual:.1f}% (plan {sales_pct_forecast:.1f}%)"}
    if actual > forecast:
        return {"color": "green", "flash": False,
                "label": f"↑ ${actual - forecast:,.0f} over forecast — "
                         f"% of sales held at {sales_pct_actual:.1f}%"}
    if actual > budget:
        return {"color": "amber", "flash": False,
                "label": f"⚠ ${actual - budget:,.0f} over budget"}
    return {"color": "neutral", "flash": False,
            "label": f"${budget - actual:,.0f} under budget"}


@router.get("/pnl-snapshot")
def pnl_snapshot(outlet_id: str = "outlet-main",
                 compare: str = Query("forecast", pattern="^(forecast|budget)$")):
    """Returns MTD P&L with variance banner. Pulls actuals from
    invoices (expenses) and pos_sales_rollup (revenue), falling back to
    seeded demo data when empty so the UI is never blank."""
    now = datetime.now(timezone.utc)
    month_start, month_end = _month_bounds(now)

    # Actual revenue (sum of POS sales for outlet this month)
    rev_agg = list(db["pos_sales_rollup"].aggregate([
        {"$match": {"outlet_id": outlet_id, "date": {"$gte": month_start[:10]}}},
        {"$group": {"_id": None, "total": {"$sum": "$net_sales"}}},
    ]))
    actual_revenue = float((rev_agg[0]["total"] if rev_agg else 0) or 0)

    # Actual expenses — grouped by category from invoices + procurement_orders
    exp_agg = list(db["invoices"].aggregate([
        {"$match": {"outlet_id": outlet_id, "date": {"$gte": month_start[:10]}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
    ]))
    expenses_by_cat = {(row["_id"] or "other"): float(row["total"] or 0) for row in exp_agg}

    # If no real data, seed demo snapshot so UI isn't blank
    if actual_revenue == 0 and not expenses_by_cat:
        actual_revenue = 142_850.0
        expenses_by_cat = {
            "food": 38_500.0,
            "beverage": 9_200.0,
            "labor": 42_100.0,
            "supplies": 3_850.0,
            "other": 2_400.0,
        }

    total_cogs = expenses_by_cat.get("food", 0) + expenses_by_cat.get("beverage", 0)
    total_labor = expenses_by_cat.get("labor", 0)
    total_other = sum(v for k, v in expenses_by_cat.items()
                     if k not in ("food", "beverage", "labor"))
    total_expense = total_cogs + total_labor + total_other
    gross_profit = actual_revenue - total_cogs
    net_profit = actual_revenue - total_expense

    # Comparison targets — pull from annual budget or forecast
    budget_doc = db["annual_budgets"].find_one(
        {"outlet_id": outlet_id, "month": month_start[:7]}, {"_id": 0}) or {}
    forecast_doc = db["forecasts_monthly"].find_one(
        {"outlet_id": outlet_id, "month": month_start[:7]}, {"_id": 0}) or {}

    # Sensible defaults from actuals if docs missing
    budget_rev = float(budget_doc.get("revenue", actual_revenue * 1.05))
    budget_food = float(budget_doc.get("food_cost", actual_revenue * 0.28))
    budget_labor = float(budget_doc.get("labor_cost", actual_revenue * 0.30))
    forecast_rev = float(forecast_doc.get("revenue", actual_revenue * 1.02))
    forecast_food = float(forecast_doc.get("food_cost", actual_revenue * 0.27))
    forecast_labor = float(forecast_doc.get("labor_cost", actual_revenue * 0.29))

    target_rev = forecast_rev if compare == "forecast" else budget_rev
    target_food = forecast_food if compare == "forecast" else budget_food
    target_labor = forecast_labor if compare == "forecast" else budget_labor

    # Category variance banners
    food_pct = (total_cogs / actual_revenue * 100) if actual_revenue else 0
    food_pct_target = (target_food / target_rev * 100) if target_rev else 0
    labor_pct = (total_labor / actual_revenue * 100) if actual_revenue else 0
    labor_pct_target = (target_labor / target_rev * 100) if target_rev else 0

    banners = {
        "food": _variance_banner(total_cogs, forecast_food, budget_food,
                                  food_pct, food_pct_target),
        "labor": _variance_banner(total_labor, forecast_labor, budget_labor,
                                   labor_pct, labor_pct_target),
    }

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "period": month_start[:7],
        "compare_to": compare,
        "revenue": {
            "actual": round(actual_revenue, 2),
            "forecast": round(forecast_rev, 2),
            "budget": round(budget_rev, 2),
        },
        "expenses": {
            "cogs": round(total_cogs, 2),
            "labor": round(total_labor, 2),
            "other": round(total_other, 2),
            "total": round(total_expense, 2),
            "by_category": {k: round(v, 2) for k, v in expenses_by_cat.items()},
        },
        "gross_profit": round(gross_profit, 2),
        "net_profit": round(net_profit, 2),
        "percentages": {
            "food_pct": round(food_pct, 2),
            "labor_pct": round(labor_pct, 2),
            "food_pct_target": round(food_pct_target, 2),
            "labor_pct_target": round(labor_pct_target, 2),
        },
        "banners": banners,
        "generated_at": utcnow_iso(),
    }


# ══════════════════════════════════════════════════════════════════════
# 3. Outlet dashboard — KPIs for "Show my dashboard"
# ══════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
def outlet_dashboard(outlet_id: str = "outlet-main",
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """High-level dashboard: today's sales, covers, open POs, flagged
    invoices, recent deliveries, unresolved line-check temp excursions."""
    today = utcnow_iso()[:10]
    today_start = today + "T00:00:00"

    # Today's sales
    rev_agg = list(db["pos_sales_rollup"].aggregate([
        {"$match": {"outlet_id": outlet_id, "date": today}},
        {"$group": {"_id": None, "sales": {"$sum": "$net_sales"},
                     "covers": {"$sum": "$covers"}}},
    ]))
    today_sales = float(rev_agg[0]["sales"] if rev_agg else 0)
    today_covers = int(rev_agg[0]["covers"] if rev_agg else 0)

    # Open POs (ordered, not received)
    open_pos = db["procurement_orders"].count_documents({
        "outlet_id": outlet_id, "status": "ordered"
    })
    # Flagged invoices (unresolved)
    flagged_count = db["invoice_flags"].count_documents({"resolved_at": None})
    # Today deliveries
    deliveries_today = db["vendor_deliveries"].count_documents({
        "outlet_id": outlet_id, "delivered_at": {"$gte": today_start}
    })
    # Open requisitions
    open_reqs = db["procurement_requisitions"].count_documents({
        "outlet_id": outlet_id, "status": "pending_approval"
    })

    # Resolve outlet name
    outlet = db["outlets_catalog"].find_one({"id": outlet_id}, {"_id": 0}) or {"name": "Main Kitchen"}

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "today": today,
        "kpis": {
            "today_sales": round(today_sales, 2),
            "today_covers": today_covers,
            "avg_check": round(today_sales / today_covers, 2) if today_covers else 0,
            "open_pos": open_pos,
            "open_requisitions": open_reqs,
            "deliveries_today": deliveries_today,
            "flagged_invoices": flagged_count,
        },
        "generated_at": utcnow_iso(),
    }


# ══════════════════════════════════════════════════════════════════════
# 4. Invoice drill-down + flag to accounting
# ══════════════════════════════════════════════════════════════════════

@router.get("/invoices")
def list_invoices(outlet_id: str = "outlet-main", limit: int = 25,
                  flagged_only: bool = False):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if flagged_only:
        q["has_flag"] = True
    rows = list(db["invoices"].find(q, {"_id": 0})
                .sort("date", -1).limit(min(limit, 200)))
    # Seed a demo invoice if none exist so UI has content. Each line item has
    # its OWN gl_code — paper/disposables separated from food per William's
    # iter230 correction.
    if not rows:
        demo = [{
            "id": f"inv-demo-{i}",
            "outlet_id": outlet_id,
            "vendor_id": f"vnd-demo-{i}",
            "vendor_name": ["Halperns", "Sysco", "US Foods"][i - 1],
            "amount": [1847.52, 3210.40, 892.15][i - 1],
            "date": utcnow_iso()[:10],
            "category": ["food", "food", "supplies"][i - 1],
            "gl_code": ["5001", "5001", "8200"][i - 1],
            "status": "received",
            "line_items": [
                {"sku": f"SKU-{i}-1", "name": "Beef tender 8oz", "qty": 10,
                  "price": 45.20, "gl_code": "5001"},
                {"sku": f"SKU-{i}-2", "name": "Salmon fillet 6oz", "qty": 5,
                  "price": 89.30, "gl_code": "5001"},
            ],
            "has_flag": False,
        } for i in range(1, 4)]
        return {"ok": True, "count": 3, "rows": demo, "demo_seed": True}
    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str):
    inv = db["invoices"].find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        # Demo fallback — each line item has its own correct GL code.
        # Food items → 5001 (Cost of Food Sales)
        # Paper/disposables → 8210 (Supplies · Paper & Plastics)
        # Operating supplies → 8200
        return {"ok": True, "invoice": {
            "id": invoice_id, "vendor_name": "Halperns",
            "amount": 1847.52, "date": utcnow_iso()[:10],
            "category": "food", "gl_code": "5001",
            "line_items": [
                {"sku": "HAL-001", "name": "8oz Beef Tender",  "qty": 12, "price": 34.50, "gl_code": "5001"},
                {"sku": "HAL-002", "name": "Salmon Fillet 6oz", "qty": 20, "price": 18.75, "gl_code": "5001"},
                {"sku": "HAL-003", "name": "Branzino Whole",    "qty": 15, "price": 22.40, "gl_code": "5001"},
                {"sku": "HAL-901", "name": "Parchment paper 12x16", "qty": 4,  "price": 32.00, "gl_code": "8210"},
                {"sku": "HAL-902", "name": "To-go containers 16oz", "qty": 10, "price": 18.00, "gl_code": "8210"},
            ],
            "has_flag": False,
            "demo": True,
        }}
    # Attach flags
    flags = list(db["invoice_flags"].find({"invoice_id": invoice_id}, {"_id": 0}))
    inv["flags"] = flags
    return {"ok": True, "invoice": inv}


class InvoiceFlag(BaseModel):
    reason: str = "coding_error"   # coding_error | price | quantity | other
    comment: str = Field(..., min_length=1, max_length=500)
    notify_accounting: bool = True
    notify_outlet_managers: bool = True


@router.post("/invoices/{invoice_id}/flag")
def flag_invoice(invoice_id: str, body: InvoiceFlag,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Chef flags an invoice as mis-coded. Notifies accounting + all
    outlet managers (per William). Also writes to ecw_activity_events so
    the flag shows up in everyone's Activity rail."""
    flagger = x_user_id or "chef-william"
    notifies: List[str] = []
    if body.notify_accounting:
        notifies.append("accounting@luccca.com")
    if body.notify_outlet_managers:
        mgrs = list(db["chef_outlet_access"].find(
            {"role": {"$in": ["executive_chef", "outlet_manager"]}}, {"_id": 0, "chef_id": 1}))
        notifies.extend([m["chef_id"] for m in mgrs if m.get("chef_id") != flagger])

    flag_doc = {
        "id": f"flag-{uuid.uuid4().hex[:10]}",
        "invoice_id": invoice_id,
        "flagged_by": flagger,
        "reason": body.reason,
        "comment": body.comment,
        "notifies": notifies,
        "created_at": utcnow_iso(),
        "resolved_at": None,
    }
    db["invoice_flags"].insert_one(dict(flag_doc))
    db["invoices"].update_one({"id": invoice_id}, {"$set": {"has_flag": True}})

    # Write to activity feed so everyone sees it
    inv = db["invoices"].find_one({"id": invoice_id}, {"_id": 0}) or {"vendor_name": "?", "amount": 0}
    db["ecw_activity_events"].insert_one({
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": inv.get("outlet_id", "outlet-main"),
        "kind": "invoice_flagged",
        "title": f"🚩 Invoice flagged — {inv.get('vendor_name')}",
        "detail": f"${inv.get('amount', 0):.2f} — {body.comment[:80]}",
        "actor": flagger,
        "meta": {"invoice_id": invoice_id, "flag_id": flag_doc["id"]},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "flag": flag_doc, "notified_count": len(notifies)}


@router.post("/invoices/{invoice_id}/resolve-flag")
def resolve_flag(invoice_id: str, flag_id: str,
                  x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    db["invoice_flags"].update_one(
        {"id": flag_id, "invoice_id": invoice_id},
        {"$set": {"resolved_at": utcnow_iso(),
                   "resolved_by": x_user_id or "accounting"}})
    # If no more open flags on invoice, clear has_flag
    open_flags = db["invoice_flags"].count_documents(
        {"invoice_id": invoice_id, "resolved_at": None})
    if open_flags == 0:
        db["invoices"].update_one({"id": invoice_id}, {"$set": {"has_flag": False}})
    return {"ok": True, "resolved": True}


# ══════════════════════════════════════════════════════════════════════
# 5. Vendor delivery notifications — "Halperns just delivered"
# ══════════════════════════════════════════════════════════════════════

class DeliveryNotify(BaseModel):
    outlet_id: str = "outlet-main"
    vendor_id: Optional[str] = None
    vendor_name: str = Field(..., min_length=1, max_length=120)
    po_id: Optional[str] = None
    driver: Optional[str] = None
    note: Optional[str] = None


@router.post("/deliveries/notify")
def notify_delivery(body: DeliveryNotify,
                     x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Logs a vendor delivery and pushes it to the activity feed so chefs
    see "Halperns just delivered" on their mobile."""
    doc = {
        "id": f"del-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "vendor_id": body.vendor_id,
        "vendor_name": body.vendor_name,
        "po_id": body.po_id,
        "driver": body.driver,
        "note": body.note,
        "delivered_at": utcnow_iso(),
        "notified_by": x_user_id or "receiving",
    }
    db["vendor_deliveries"].insert_one(dict(doc))
    # Push to activity feed
    db["ecw_activity_events"].insert_one({
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "kind": "delivery",
        "title": f"📦 {body.vendor_name} just delivered",
        "detail": body.note or (f"Driver: {body.driver}" if body.driver else "Ready to receive"),
        "actor": x_user_id or "receiving",
        "meta": {"delivery_id": doc["id"], "po_id": body.po_id},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "delivery": doc}


# ══════════════════════════════════════════════════════════════════════
# 6. Commissary outlets (Production · Pastry · Storeroom) as internal
#    "vendors" for cross-outlet ordering
# ══════════════════════════════════════════════════════════════════════

def _ensure_commissary_seed():
    """Seeds the 3 default commissary outlets if the collection is empty."""
    if db["commissary_outlets"].count_documents({}) > 0:
        return
    seeds = [
        {"id": "com-production", "name": "Production Kitchen",
          "kind": "production", "active": True,
          "description": "Cook-chill central production — proteins, stocks, sauces",
          "created_at": utcnow_iso()},
        {"id": "com-pastry", "name": "Pastry Shop",
          "kind": "pastry", "active": True,
          "description": "Breads, desserts, viennoiserie, showpieces",
          "created_at": utcnow_iso()},
        {"id": "com-storeroom", "name": "Central Storeroom",
          "kind": "storeroom", "active": True,
          "description": "Dry goods · canned · paper · chemicals",
          "created_at": utcnow_iso()},
    ]
    db["commissary_outlets"].insert_many([dict(s) for s in seeds])


@router.get("/commissary/outlets")
def list_commissary_outlets(active_only: bool = True):
    _ensure_commissary_seed()
    q: Dict[str, Any] = {}
    if active_only: q["active"] = True
    rows = list(db["commissary_outlets"].find(q, {"_id": 0}).sort("kind", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/commissary/catalog")
def list_commissary_catalog(commissary_id: str, q: Optional[str] = None, limit: int = 100):
    """Items that a given commissary produces / stocks. Returns from
    commissary_catalog_items; seeds a few per commissary if empty."""
    if db["commissary_catalog_items"].count_documents({"commissary_id": commissary_id}) == 0:
        _seed_commissary_catalog(commissary_id)
    qry: Dict[str, Any] = {"commissary_id": commissary_id}
    if q: qry["name"] = {"$regex": q, "$options": "i"}
    rows = list(db["commissary_catalog_items"].find(qry, {"_id": 0})
                .sort("name", 1).limit(min(limit, 500)))
    return {"ok": True, "count": len(rows), "rows": rows}


def _seed_commissary_catalog(commissary_id: str):
    seeds_by_kind = {
        "com-production": [
            {"name": "Demi-glace, 1qt", "pack_size": "1 qt", "unit_cost": 8.50, "category": "sauce"},
            {"name": "Chicken stock, 1gal", "pack_size": "1 gal", "unit_cost": 4.25, "category": "stock"},
            {"name": "Veal stock, 1gal", "pack_size": "1 gal", "unit_cost": 12.00, "category": "stock"},
            {"name": "Sous-vide beef tender, 8oz", "pack_size": "1 portion", "unit_cost": 11.20, "category": "protein"},
            {"name": "Confit duck leg", "pack_size": "1 leg", "unit_cost": 5.80, "category": "protein"},
            {"name": "Braised short rib", "pack_size": "1 portion", "unit_cost": 9.40, "category": "protein"},
        ],
        "com-pastry": [
            {"name": "Brioche loaf, sliced", "pack_size": "1 loaf", "unit_cost": 4.20, "category": "bread"},
            {"name": "Dinner rolls", "pack_size": "12 count", "unit_cost": 3.60, "category": "bread"},
            {"name": "Croissant, baked", "pack_size": "1 each", "unit_cost": 1.15, "category": "viennoiserie"},
            {"name": "Chocolate ganache tart", "pack_size": "1 each", "unit_cost": 3.40, "category": "dessert"},
            {"name": "Crème brûlée, 4oz", "pack_size": "1 each", "unit_cost": 2.80, "category": "dessert"},
            {"name": "Pâte sucrée shell, 3in", "pack_size": "1 each", "unit_cost": 0.65, "category": "base"},
        ],
        "com-storeroom": [
            {"name": "Olive oil, EVOO 3L", "pack_size": "3 L", "unit_cost": 28.00, "category": "oil"},
            {"name": "Kosher salt, 3lb box", "pack_size": "3 lb", "unit_cost": 3.40, "category": "seasoning"},
            {"name": "Flour, AP 50lb", "pack_size": "50 lb", "unit_cost": 22.50, "category": "dry"},
            {"name": "Sugar, granulated 50lb", "pack_size": "50 lb", "unit_cost": 26.00, "category": "dry"},
            {"name": "Paper, parchment sheets 12x16", "pack_size": "1000 ct", "unit_cost": 32.00, "category": "paper"},
            {"name": "Sanitizer, quat 1gal", "pack_size": "1 gal", "unit_cost": 14.50, "category": "chemical"},
        ],
    }
    items = seeds_by_kind.get(commissary_id, [])
    if not items: return
    docs = [{
        "id": f"cci-{uuid.uuid4().hex[:10]}",
        "commissary_id": commissary_id,
        "sku": f"{commissary_id}-{i:03d}",
        "created_at": utcnow_iso(),
        **it,
    } for i, it in enumerate(items, 1)]
    db["commissary_catalog_items"].insert_many([dict(d) for d in docs])


class CommissaryTransfer(BaseModel):
    source_commissary_id: str
    dest_outlet_id: str = "outlet-main"
    items: List[Dict[str, Any]] = Field(..., min_length=1)
    needed_by: Optional[str] = None   # ISO
    note: Optional[str] = None


@router.post("/commissary/transfer-request")
def commissary_transfer_request(body: CommissaryTransfer,
                                  x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Internal transfer request (not a PO). Flows into the procurement
    queue with source='commissary' so approval logic treats it like any
    requisition but there is no external vendor."""
    doc = {
        "id": f"cxr-{uuid.uuid4().hex[:10]}",
        "source_commissary_id": body.source_commissary_id,
        "dest_outlet_id": body.dest_outlet_id,
        "requested_by": x_user_id or "chef-william",
        "items": body.items,
        "item_count": len(body.items),
        "needed_by": body.needed_by,
        "note": body.note,
        "status": "pending",
        "created_at": utcnow_iso(),
    }
    db["commissary_transfer_requests"].insert_one(dict(doc))
    commissary = db["commissary_outlets"].find_one(
        {"id": body.source_commissary_id}, {"_id": 0}) or {}
    db["ecw_activity_events"].insert_one({
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.dest_outlet_id,
        "kind": "commissary_request",
        "title": f"🏭 Commissary request · {commissary.get('name', 'Commissary')}",
        "detail": f"{len(body.items)} items requested",
        "actor": x_user_id or "chef",
        "meta": {"transfer_id": doc["id"]},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "transfer": doc}


@router.get("/commissary/transfer-requests")
def list_commissary_transfers(dest_outlet_id: Optional[str] = None,
                                source_commissary_id: Optional[str] = None,
                                status: Optional[str] = None, limit: int = 30):
    q: Dict[str, Any] = {}
    if dest_outlet_id: q["dest_outlet_id"] = dest_outlet_id
    if source_commissary_id: q["source_commissary_id"] = source_commissary_id
    if status: q["status"] = status
    rows = list(db["commissary_transfer_requests"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(min(limit, 200)))
    return {"ok": True, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# 7. Echo Chef — flavor-preserving recipe generation
#    "Maryland crab cakes but keep my flavor metrics"
# ══════════════════════════════════════════════════════════════════════

# Re-uses the 10 flavor dimensions from echoai3_masterchef (keeps one source
# of truth). Map is inline here to avoid cross-module import drift.
FLAVOR_DIMENSIONS = {
    "sweet": ["sugar", "honey", "maple", "caramel", "fruit", "chocolate", "vanilla", "mirin"],
    "salty": ["salt", "soy sauce", "fish sauce", "miso", "anchovy", "capers", "olives", "cured meat", "old bay"],
    "sour": ["lemon", "lime", "vinegar", "wine", "tomato", "yogurt", "tamarind", "pickled"],
    "bitter": ["arugula", "radicchio", "dark chocolate", "coffee", "turmeric", "grapefruit", "charred"],
    "umami": ["parmesan", "mushroom", "dashi", "tomato paste", "aged cheese", "bone broth", "miso", "soy", "crab", "shrimp", "lobster"],
    "spicy": ["chili", "pepper", "wasabi", "horseradish", "ginger", "mustard", "szechuan", "harissa", "cayenne"],
    "herbaceous": ["basil", "cilantro", "parsley", "thyme", "rosemary", "mint", "dill", "tarragon", "chives"],
    "earthy": ["truffle", "beetroot", "mushroom", "root vegetable", "lentil", "walnut", "cumin"],
    "floral": ["lavender", "rose", "elderflower", "chamomile", "jasmine", "saffron", "hibiscus"],
    "smoky": ["smoked salt", "chipotle", "paprika", "charcoal", "wood-fired", "bacon", "lapsang"],
}


def _analyze_ingredients(ingredients: List[str]) -> Dict[str, int]:
    """Count occurrences per dimension. Normalized so sum = 1.0."""
    counts = {dim: 0 for dim in FLAVOR_DIMENSIONS}
    for ing in ingredients:
        ing_l = (ing or "").lower()
        for dim, markers in FLAVOR_DIMENSIONS.items():
            if any(m in ing_l for m in markers):
                counts[dim] += 1
    return counts


def _signature_from_recipes(recipes: List[Dict[str, Any]]) -> Dict[str, float]:
    """Aggregate chef signature across multiple recipes. Returns normalized
    weights per dimension (0..1)."""
    totals: Dict[str, float] = {dim: 0.0 for dim in FLAVOR_DIMENSIONS}
    for r in recipes:
        ings = []
        for it in (r.get("ingredients") or []):
            if isinstance(it, dict):
                ings.append(it.get("name") or "")
            else:
                ings.append(str(it))
        counts = _analyze_ingredients(ings)
        tot = sum(counts.values()) or 1
        for dim, c in counts.items():
            totals[dim] += c / tot
    s = sum(totals.values()) or 1
    return {dim: round(v / s, 3) for dim, v in totals.items()}


class StyleMimicRequest(BaseModel):
    menu_item_name: str = Field(..., min_length=1)
    chef_id: str = "chef-william"
    reference_recipe_name: Optional[str] = None      # e.g., "Maryland crab cake"
    instructions: Optional[str] = None               # free-form chef tweaks
    target_cost_pct: float = 28.0
    servings: int = 4
    dietary_tags: List[str] = []


@router.post("/echo-chef/mimic-style")
async def echo_chef_mimic_style(body: StyleMimicRequest):
    """William's killer flow: analyses the chef's prior recipes of the
    same item name (e.g., all 'crab cake' recipes), extracts the flavor
    signature across 10 dimensions, and asks Claude to build a new recipe
    that **preserves the flavor signature** while honoring the chef's
    free-form instructions (e.g., 'Maryland style, Old Bay, jumbo lump,
    pan-seared never fried')."""
    # Pull prior recipes by this chef matching the reference name
    name_regex = body.reference_recipe_name or body.menu_item_name
    words = [w for w in name_regex.lower().split() if len(w) > 2]
    prior = list(db["recipes"].find({
        "chef_id": body.chef_id,
        "name": {"$regex": "|".join(words) if words else name_regex, "$options": "i"},
    }, {"_id": 0}).limit(15))
    # Also include any menu_recipes
    for mr in db["menu_recipes"].find({}, {"_id": 0}).limit(30):
        item = db["menu_items"].find_one({"id": mr.get("item_id")}, {"_id": 0}) or {}
        iname = (item.get("name") or "").lower()
        if any(w in iname for w in words):
            comps = list(db["menu_components"].find(
                {"item_id": mr["item_id"]}, {"_id": 0}))
            prior.append({
                "name": item.get("name"),
                "ingredients": [{"name": c.get("ingredient")} for c in comps],
            })

    signature = _signature_from_recipes(prior) if prior else {}
    dominant = sorted(signature.items(), key=lambda x: x[1], reverse=True)[:4]
    signature_str = ", ".join(f"{d} ({v*100:.0f}%)" for d, v in dominant if v > 0)

    # Try Claude via Emergent LLM key
    LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
    recipe_json: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None

    if LLM_KEY:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            session_id = f"mimic-{uuid.uuid4().hex[:10]}"
            system_msg = (
                "You are EchoAi³ Master Chef — a Michelin-trained culinary AI. "
                "Generate a production-ready recipe as valid JSON only. No markdown.\n\n"
                f"CHEF FLAVOR SIGNATURE (preserve these proportions): {signature_str or 'balanced'}\n"
                f"The chef has made {len(prior)} prior versions of this dish — "
                "keep the flavor balance intact while honoring the new instructions."
            )
            chat = LlmChat(api_key=LLM_KEY, session_id=session_id,
                           system_message=system_msg)
            chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
            prompt = (
                f"Generate a new recipe for: {body.menu_item_name}\n"
                f"Servings: {body.servings}\n"
                f"Target food cost %: {body.target_cost_pct}\n"
                f"Chef instructions: {body.instructions or 'no specific instructions'}\n"
                f"Dietary: {', '.join(body.dietary_tags) or 'none'}\n\n"
                "Return JSON only:\n"
                "{\n"
                '  "name": "...",\n'
                '  "description": "...",\n'
                '  "yield_qty": 4, "yield_unit": "portions",\n'
                '  "ingredients": [{"name":"...","quantity":0.0,"unit":"...","est_cost":0.0}],\n'
                '  "instructions": [{"step":1,"instruction":"..."}],\n'
                '  "plating": "...",\n'
                '  "allergens": ["..."],\n'
                '  "calories_per_serving": 0,\n'
                '  "flavor_notes": "how this recipe preserves the chef signature",\n'
                '  "estimated_total_cost": 0.0,\n'
                '  "suggested_menu_price": 0.0\n'
                "}"
            )
            resp = await chat.send_message(UserMessage(text=prompt))
            raw_output = resp if isinstance(resp, str) else str(resp)
            text = raw_output.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"): text = text[:-3].strip()
            import json as _json
            recipe_json = _json.loads(text)
        except Exception as e:
            recipe_json = {"error": f"AI generation failed: {str(e)[:200]}",
                           "raw": (raw_output or "")[:500]}
    else:
        recipe_json = {"error": "EMERGENT_LLM_KEY not configured"}

    # Persist as a draft
    draft_id = f"draft-{uuid.uuid4().hex[:10]}"
    draft = {
        "id": draft_id,
        "chef_id": body.chef_id,
        "menu_item_name": body.menu_item_name,
        "reference": body.reference_recipe_name,
        "instructions": body.instructions,
        "signature": signature,
        "recipe": recipe_json,
        "status": "draft",
        "prior_count": len(prior),
        "created_at": utcnow_iso(),
    }
    db["echo_chef_drafts"].insert_one(dict(draft))
    return {"ok": True, "draft_id": draft_id, "signature": signature,
            "dominant": dominant, "prior_recipe_count": len(prior),
            "recipe": recipe_json}


@router.get("/echo-chef/drafts")
def list_echo_chef_drafts(chef_id: str = "chef-william", limit: int = 20):
    rows = list(db["echo_chef_drafts"].find({"chef_id": chef_id}, {"_id": 0})
                .sort("created_at", -1).limit(min(limit, 100)))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/echo-chef/drafts/{draft_id}/approve")
def approve_echo_chef_draft(draft_id: str):
    draft = db["echo_chef_drafts"].find_one({"id": draft_id}, {"_id": 0})
    if not draft: raise HTTPException(404, "draft not found")
    db["echo_chef_drafts"].update_one({"id": draft_id},
                                       {"$set": {"status": "approved", "approved_at": utcnow_iso()}})
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════
# 8. Recipe URL import bridge — exposes the existing /api/recipe-import
#    under /api/ecw-ops/recipes/import-url so the mobile client doesn't
#    have to know the other module's path.
# ══════════════════════════════════════════════════════════════════════

class RecipeUrlIn(BaseModel):
    url: str
    outlet_id: str = "outlet-main"


@router.post("/recipes/import-url")
async def import_recipe_from_url_bridge(body: RecipeUrlIn,
                                          x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Bridges to the existing recipe-import scraper. Returns the parsed
    recipe so the mobile app can show a preview → chef confirms → we save."""
    try:
        from routes.recipe_import import import_recipe_from_url, RecipeUrlInput
        parsed = await import_recipe_from_url(RecipeUrlInput(url=body.url))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Recipe import failed: {str(e)[:200]}")

    # Save as a draft in echo_chef_drafts so chef can edit before publishing
    draft_id = f"import-{uuid.uuid4().hex[:10]}"
    draft = {
        "id": draft_id,
        "chef_id": x_user_id or "chef-william",
        "source_url": body.url,
        "status": "imported",
        "recipe": parsed if isinstance(parsed, dict) else parsed,
        "created_at": utcnow_iso(),
    }
    db["echo_chef_drafts"].insert_one(dict(draft))
    return {"ok": True, "draft_id": draft_id, "recipe": parsed}


# iter234 · Save edited imported recipe directly into the shared recipes
# collection (visible on desktop Menu Builder with "mobile-authored" badge).
class SaveImportedIn(BaseModel):
    title: str
    ingredients: List[str] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)
    image: Optional[str] = None
    source_url: Optional[str] = None
    outlet_id: str = "outlet-rooftop"
    draft_id: Optional[str] = None


@router.post("/recipes/save-imported")
def save_imported_recipe(body: SaveImportedIn,
                           x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Persists the edited imported recipe into the shared `recipes`
    collection (same place desktop Menu Builder reads from), tagged with
    published_from='mobile' so desktop can render the 'mobile-authored' badge."""
    if not body.title.strip():
        raise HTTPException(400, "title is required")
    rid = f"rec-{uuid.uuid4().hex[:10]}"
    # Parse string ingredients into structured form  {name, quantity, unit}
    structured_ings = []
    for s in body.ingredients:
        s = (s or "").strip()
        if not s: continue
        # Try to split "25g/1oz butter" or "2 tsp cinnamon"
        import re
        m = re.match(r"^([\d½¼¾⅓⅔⅛⅜⅝⅞./\s-]+)?\s*([a-zA-Z/]+)?\s+(.+)$", s)
        if m and m.group(1):
            structured_ings.append({
                "quantity": (m.group(1) or "").strip() or None,
                "unit": (m.group(2) or "").strip() or None,
                "name": (m.group(3) or s).strip(),
            })
        else:
            structured_ings.append({"quantity": None, "unit": None, "name": s})
    structured_steps = [{"instruction": s.strip()} for s in body.instructions if s.strip()]
    doc = {
        "id": rid,
        "item_name": body.title.strip(),
        "name": body.title.strip(),
        "title": body.title.strip(),
        "outlet_id": body.outlet_id,
        "image": body.image,
        "photo_url": body.image,
        "source_url": body.source_url,
        "ingredients": structured_ings,
        "instructions": structured_steps,
        "prep_steps": structured_steps,
        "yield_qty": 4,
        "yield_unit": "servings",
        "cost": 0.0,
        "calories_per_serving": None,
        "allergens": [],
        "published_from": "mobile",      # iter234: desktop badge trigger
        "authored_by": x_user_id or "chef-william",
        "status": "published",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    db["recipes"].insert_one(dict(doc))
    # Mark originating draft as published, if any
    if body.draft_id:
        db["echo_chef_drafts"].update_one(
            {"id": body.draft_id},
            {"$set": {"status": "published", "published_recipe_id": rid,
                       "published_at": utcnow_iso()}},
        )
    # Emit activity
    db["ecw_activity_events"].insert_one({
        "id": f"evt-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "kind": "recipe.published_from_mobile",
        "title": f"Recipe imported from mobile: {body.title}",
        "detail": f"Authored by {x_user_id or 'chef-william'}",
        "actor": x_user_id or "chef-william",
        "meta": {"recipe_id": rid, "source_url": body.source_url},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "recipe_id": rid, "published_from": "mobile"}
