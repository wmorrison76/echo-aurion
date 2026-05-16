"""
Event Cost Tracker
==================
Real-time P&L dashboard for banquet directors.
Aggregates food, labor, OpEx costs and revenue for events.
Provides margin alerts when costs breach BQT targets.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import event_lifecycle
import database

db = database.db
router = APIRouter(prefix="/api/event-cost-tracker", tags=["event-cost-tracker"])

beo_col = db["beos"]
labor_col = db["labor_schedules"]
gl_col = db["gl_entries"]
po_col = db["purchase_orders"]
inv_col = db["event_invoices"]
changelog_col = db["event_changelog"]


@router.get("/events")
async def list_tracked_events():
    """List all events with cost summary for the tracker dashboard."""
    events = list(db["events"].find({}, {"_id": 0}).sort("event_date", -1).limit(50))
    result = []
    for ev in events:
        eid = ev.get("id", "")
        beo = beo_col.find_one({"event_id": eid}, {"_id": 0})
        labor = list(labor_col.find({"event_id": eid}, {"_id": 0}))
        gl_entries = list(gl_col.find({"event_id": eid}, {"_id": 0}))

        guests = ev.get("guaranteed_count", ev.get("guest_count", 0))
        food_cost = beo.get("total_food_cost", 0) if beo else 0
        labor_cost = sum(s.get("total_cost", 0) for s in labor)
        total_revenue = sum(e.get("amount", 0) for e in gl_entries if e.get("entry_type") == "revenue")
        total_expense = sum(e.get("amount", 0) for e in gl_entries if e.get("entry_type") == "expense")

        result.append({
            "id": eid,
            "name": ev.get("name", ""),
            "event_date": ev.get("event_date", ""),
            "event_type": ev.get("event_type", ""),
            "guest_count": guests,
            "stage": ev.get("stage", ""),
            "room": ev.get("room", ""),
            "has_beo": beo is not None,
            "has_schedules": len(labor) > 0,
            "has_financials": len(gl_entries) > 0,
            "food_cost": round(food_cost, 2),
            "labor_cost": round(labor_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "total_expense": round(total_expense, 2),
            "net_margin_pct": round(((total_revenue - total_expense) / total_revenue * 100) if total_revenue > 0 else 0, 1),
        })
    return {"events": result, "total": len(result)}


@router.get("/event/{event_id}")
async def get_event_cost_detail(event_id: str):
    """Detailed real-time cost breakdown for a single event."""
    event = event_lifecycle.get_event(event_id)
    if not event:
        raise HTTPException(404, "Event not found")

    beo = beo_col.find_one({"event_id": event_id}, {"_id": 0})
    labor_schedules = list(labor_col.find({"event_id": event_id}, {"_id": 0}))
    gl_entries = list(gl_col.find({"event_id": event_id}, {"_id": 0}))
    purchase_orders = list(po_col.find({"event_id": event_id}, {"_id": 0}))
    invoices = list(inv_col.find({"event_id": event_id}, {"_id": 0}))

    guests = event.get("guaranteed_count", event.get("guest_count", 0))

    # Food costs from BEO
    food_cost = beo.get("total_food_cost", 0) if beo else 0
    menu_items = beo.get("menu_items", []) if beo else []

    # Labor costs
    labor_by_dept = {}
    total_labor = 0
    total_staff = 0
    for s in labor_schedules:
        dept = s.get("schedule_type", "other")
        cost = s.get("total_cost", 0)
        labor_by_dept[dept] = {
            "cost": round(cost, 2),
            "staff": s.get("staff_count", 0),
            "hours": s.get("total_hours", 0),
            "rate": s.get("hourly_rate", 0),
            "gl_code": s.get("gl_code", ""),
        }
        total_labor += cost
        total_staff += s.get("staff_count", 0)

    # Revenue & expense from GL
    revenue_items = []
    expense_items = []
    total_revenue = 0
    total_expense = 0
    for e in gl_entries:
        item = {
            "gl_code": e.get("gl_code", ""),
            "gl_name": e.get("gl_name", ""),
            "amount": round(e.get("amount", 0), 2),
            "memo": e.get("memo", ""),
        }
        if e.get("entry_type") == "revenue":
            revenue_items.append(item)
            total_revenue += e.get("amount", 0)
        else:
            expense_items.append(item)
            total_expense += e.get("amount", 0)

    # Purchasing
    po_total = sum(po.get("subtotal", 0) for po in purchase_orders)
    inv_total = sum(inv.get("total", 0) for inv in invoices)

    # OpEx estimates
    linen_cost = round(guests * 3.50, 2)
    misc_opex = round(guests * 2.00, 2)

    # Margin calculations
    gross_profit = total_revenue - food_cost - (total_revenue * 0.25 * 0.01 if total_revenue > 0 else 0)  # approx bev cogs
    net_profit = total_revenue - total_expense
    gross_margin = round((gross_profit / total_revenue * 100) if total_revenue > 0 else 0, 1)
    net_margin = round((net_profit / total_revenue * 100) if total_revenue > 0 else 0, 1)
    food_cost_pct = round((food_cost / (total_revenue * 0.68) * 100) if total_revenue > 0 else 0, 1)  # food rev ~68% of total

    # Margin alerts
    alerts = []
    if food_cost_pct > 18:
        alerts.append({"type": "critical", "category": "food_cost", "message": f"Food cost at {food_cost_pct}% exceeds 18% BQT target"})
    elif food_cost_pct < 14 and food_cost_pct > 0:
        alerts.append({"type": "warning", "category": "food_cost", "message": f"Food cost at {food_cost_pct}% below 14% BQT minimum — quality risk"})

    labor_pct = round((total_labor / total_revenue * 100) if total_revenue > 0 else 0, 1)
    if labor_pct > 35:
        alerts.append({"type": "critical", "category": "labor", "message": f"Labor cost at {labor_pct}% exceeds 35% threshold"})
    elif labor_pct > 30:
        alerts.append({"type": "warning", "category": "labor", "message": f"Labor cost at {labor_pct}% approaching 35% threshold"})

    if net_margin < 15 and total_revenue > 0:
        alerts.append({"type": "warning", "category": "margin", "message": f"Net margin at {net_margin}% below 15% profitability target"})

    cost_per_guest = round((total_expense / guests) if guests > 0 else 0, 2)
    revenue_per_guest = round((total_revenue / guests) if guests > 0 else 0, 2)

    return {
        "event": {
            "id": event_id,
            "name": event.get("name", ""),
            "event_date": event.get("event_date", ""),
            "event_type": event.get("event_type", ""),
            "guest_count": guests,
            "stage": event.get("stage", ""),
            "room": event.get("room", ""),
        },
        "food": {
            "total_cost": round(food_cost, 2),
            "items_count": len(menu_items),
            "cost_per_guest": round((food_cost / guests) if guests > 0 else 0, 2),
            "food_cost_pct": food_cost_pct,
            "target_range": {"min": 14.0, "max": 18.0},
        },
        "labor": {
            "total_cost": round(total_labor, 2),
            "total_staff": total_staff,
            "labor_pct": labor_pct,
            "by_department": labor_by_dept,
        },
        "operating_expenses": {
            "linen": linen_cost,
            "misc": misc_opex,
            "total": round(linen_cost + misc_opex, 2),
        },
        "purchasing": {
            "po_count": len(purchase_orders),
            "po_total": round(po_total, 2),
            "invoice_count": len(invoices),
            "invoice_total": round(inv_total, 2),
        },
        "revenue": {
            "total": round(total_revenue, 2),
            "items": revenue_items,
            "per_guest": revenue_per_guest,
        },
        "expenses": {
            "total": round(total_expense, 2),
            "items": expense_items,
        },
        "pnl": {
            "gross_profit": round(gross_profit, 2),
            "gross_margin_pct": gross_margin,
            "net_profit": round(net_profit, 2),
            "net_margin_pct": net_margin,
            "cost_per_guest": cost_per_guest,
            "revenue_per_guest": revenue_per_guest,
        },
        "alerts": alerts,
        "completeness": {
            "has_beo": beo is not None,
            "has_menu": len(menu_items) > 0,
            "has_schedules": len(labor_schedules) > 0,
            "has_financials": len(gl_entries) > 0,
            "has_purchase_orders": len(purchase_orders) > 0,
            "has_invoices": len(invoices) > 0,
        },
    }


@router.get("/aggregate")
async def get_aggregate_costs():
    """Aggregate cost metrics across all events for executive dashboard."""
    events = list(db["events"].find({}, {"_id": 0}))
    total_events = len(events)
    total_guests = sum(e.get("guaranteed_count", e.get("guest_count", 0)) for e in events)

    # Aggregate GL entries
    gl_entries = list(gl_col.find({}, {"_id": 0}))
    total_revenue = sum(e.get("amount", 0) for e in gl_entries if e.get("entry_type") == "revenue")
    total_expense = sum(e.get("amount", 0) for e in gl_entries if e.get("entry_type") == "expense")

    # Aggregate labor
    all_labor = list(labor_col.find({}, {"_id": 0}))
    total_labor = sum(s.get("total_cost", 0) for s in all_labor)

    # Aggregate purchasing
    all_pos = list(po_col.find({}, {"_id": 0}))
    all_invs = list(inv_col.find({}, {"_id": 0}))
    total_po = sum(po.get("subtotal", 0) for po in all_pos)
    total_inv = sum(inv.get("total", 0) for inv in all_invs)

    net_margin = round(((total_revenue - total_expense) / total_revenue * 100) if total_revenue > 0 else 0, 1)

    # Events by type
    by_type = {}
    for e in events:
        t = e.get("event_type", "other")
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "total_events": total_events,
        "total_guests": total_guests,
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expense, 2),
        "total_labor": round(total_labor, 2),
        "total_po_value": round(total_po, 2),
        "total_invoice_value": round(total_inv, 2),
        "net_profit": round(total_revenue - total_expense, 2),
        "net_margin_pct": net_margin,
        "avg_revenue_per_event": round((total_revenue / total_events) if total_events > 0 else 0, 2),
        "avg_revenue_per_guest": round((total_revenue / total_guests) if total_guests > 0 else 0, 2),
        "events_by_type": by_type,
    }
