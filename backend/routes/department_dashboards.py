"""
Department-Specific Dashboard APIs
====================================
Each role gets customized data views:
- Culinary: menu mix, food cost trending, prep lists, waste, vendor deliveries
- Pastry: production schedule, commissary transfers, wedding cakes, par levels
- F&B Director: all-outlet P&L rollup, bev program, banquet forecast, labor
- Events: BEO pipeline, calendar stats, revenue forecast, room setup
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from database import db

router = APIRouter(prefix="/api/dept-dash", tags=["department-dashboards"])
_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("/culinary")
async def culinary_dashboard():
    """Executive Chef / Culinary dashboard."""
    pos = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))
    invoices = list(db["invoices"].find({"category": "food"}, {"_id": 0}).sort("invoice_date", -1).limit(20))
    labor = list(db["labor_schedules"].find({"department": {"$in": ["Kitchen/BOH", "Stewarding"]}}, {"_id": 0}).limit(60))

    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    total_waste = sum(w.get("cost", 0) for w in waste)

    # Menu mix analysis
    item_sales = {}
    for t in pos:
        for item in t.get("items", []):
            n = item.get("name", "")
            if n not in item_sales:
                item_sales[n] = {"name": n, "qty": 0, "revenue": 0, "food_cost": 0, "category": item.get("category", "")}
            item_sales[n]["qty"] += item.get("quantity", 0)
            item_sales[n]["revenue"] += item.get("revenue", 0)
            item_sales[n]["food_cost"] += item.get("food_cost", 0)
    menu_mix = sorted(item_sales.values(), key=lambda x: x["revenue"], reverse=True)[:20]
    for m in menu_mix:
        m["margin"] = round(m["revenue"] - m["food_cost"], 2)
        m["fc_pct"] = round(m["food_cost"] / max(m["revenue"], 1) * 100, 1)
        m["revenue"] = round(m["revenue"], 2)
        m["food_cost"] = round(m["food_cost"], 2)

    # Food cost trending (daily)
    daily_fc = {}
    for t in pos:
        d = t.get("closed_at", "")[:10]
        if not d: continue
        if d not in daily_fc:
            daily_fc[d] = {"rev": 0, "fc": 0}
        daily_fc[d]["rev"] += t.get("subtotal", 0)
        daily_fc[d]["fc"] += t.get("food_cost_total", 0)
    fc_trend = [{"date": d, "food_cost_pct": round(v["fc"] / max(v["rev"], 1) * 100, 1), "revenue": round(v["rev"], 2)} for d, v in sorted(daily_fc.items())[-14:]]

    # Waste breakdown
    waste_by_reason = {}
    for w in waste:
        r = w.get("reason", "other")
        waste_by_reason[r] = round(waste_by_reason.get(r, 0) + w.get("cost", 0), 2)

    # Labor summary
    labor_total = round(sum(s.get("total_cost", 0) for s in labor), 2)
    ot_total = round(sum(s.get("overtime_hours", 0) for s in labor), 1)

    return {
        "dashboard": "culinary",
        "kpis": {
            "total_revenue": round(total_rev, 2),
            "food_cost": round(food_cogs, 2),
            "food_cost_pct": round(food_cogs / max(total_rev, 1) * 100, 1),
            "waste": round(total_waste, 2),
            "waste_pct": round(total_waste / max(total_rev, 1) * 100, 2),
            "kitchen_labor": labor_total,
            "overtime_hours": ot_total,
            "menu_items_active": len(item_sales),
        },
        "menu_mix": menu_mix,
        "food_cost_trend": fc_trend,
        "waste_breakdown": waste_by_reason,
        "recent_deliveries": [{"vendor": i.get("vendor_name"), "total": i.get("total"), "date": i.get("invoice_date")} for i in invoices[:8]],
        "generated_at": _now(),
    }


@router.get("/pastry")
async def pastry_dashboard():
    """Pastry Chef dashboard — commissary transfers, wedding cakes, production."""
    configs = list(db["commissary_configs"].find({}, {"_id": 0}))
    transfers = list(db["transfer_orders"].find({}, {"_id": 0}).sort("delivery_date", -1).limit(20))
    events = list(db["events"].find({}, {"_id": 0}).limit(200))
    pos = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))

    # Dessert/pastry items from POS
    pastry_items = {}
    for t in pos:
        for item in t.get("items", []):
            if item.get("category") in ("dessert",) or "cake" in item.get("name", "").lower() or "pastry" in item.get("name", "").lower():
                n = item.get("name", "")
                if n not in pastry_items:
                    pastry_items[n] = {"name": n, "qty": 0, "revenue": 0}
                pastry_items[n]["qty"] += item.get("quantity", 0)
                pastry_items[n]["revenue"] += item.get("revenue", 0)
    top_pastry = sorted(pastry_items.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for p in top_pastry:
        p["revenue"] = round(p["revenue"], 2)

    # Wedding/event cake pipeline
    cake_events = [e for e in events if "wedding" in e.get("name", "").lower() or "reception" in e.get("name", "").lower()]

    # Commissary stats
    outlets_served = len(configs)
    products = set()
    for c in configs:
        products.update(c.get("products", []))

    return {
        "dashboard": "pastry",
        "kpis": {
            "outlets_served": outlets_served,
            "product_types": list(products),
            "active_transfers": len([t for t in transfers if t.get("status") != "received"]),
            "wedding_events": len(cake_events),
            "dessert_items_sold": sum(p["qty"] for p in top_pastry),
            "dessert_revenue": round(sum(p["revenue"] for p in top_pastry), 2),
        },
        "top_items": top_pastry,
        "commissary_configs": [{"producing": c.get("producing_outlet_id"), "receiving": c.get("receiving_outlet_id"), "products": c.get("products", [])} for c in configs],
        "recent_transfers": transfers[:10],
        "wedding_pipeline": [{"name": e.get("name"), "date": e.get("event_date"), "guests": e.get("guest_count")} for e in cake_events[:10]],
        "generated_at": _now(),
    }


@router.get("/fb-director")
async def fb_director_dashboard():
    """F&B Director dashboard — all outlets, beverage program, banquet forecast."""
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    pos = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    events = list(db["events"].find({}, {"_id": 0}).limit(200))
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))

    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4000")
    bev_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4100")
    banquet_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4200")
    total_exp = sum(e["amount"] for e in gl if e.get("entry_type") == "expense")
    total_labor = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010", "6020", "6050"))

    # Per-outlet breakdown
    outlet_data = {}
    for t in pos:
        oid = t.get("outlet_id", "other")
        if oid not in outlet_data:
            outlet_data[oid] = {"revenue": 0, "covers": 0, "txns": 0, "food_cost": 0}
        outlet_data[oid]["revenue"] += t.get("subtotal", 0)
        outlet_data[oid]["covers"] += t.get("guest_count", 0)
        outlet_data[oid]["txns"] += 1
        outlet_data[oid]["food_cost"] += t.get("food_cost_total", 0)

    outlet_summary = []
    for oid, data in outlet_data.items():
        outlet_summary.append({
            "outlet_id": oid,
            "revenue": round(data["revenue"], 2),
            "covers": data["covers"],
            "avg_check": round(data["revenue"] / max(data["txns"], 1), 2),
            "food_cost_pct": round(data["food_cost"] / max(data["revenue"], 1) * 100, 1),
        })
    outlet_summary.sort(key=lambda x: x["revenue"], reverse=True)

    # Beverage program
    bev_items = {}
    for t in pos:
        for item in t.get("items", []):
            if item.get("category") == "beverage":
                n = item.get("name", "")
                if n not in bev_items:
                    bev_items[n] = {"name": n, "qty": 0, "revenue": 0, "cost": 0}
                bev_items[n]["qty"] += item.get("quantity", 0)
                bev_items[n]["revenue"] += item.get("revenue", 0)
                bev_items[n]["cost"] += item.get("food_cost", 0)
    top_bev = sorted(bev_items.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for b in top_bev:
        b["margin"] = round(b["revenue"] - b["cost"], 2)
        b["revenue"] = round(b["revenue"], 2)
        b["cost"] = round(b["cost"], 2)

    return {
        "dashboard": "fb_director",
        "kpis": {
            "total_revenue": round(total_rev, 2),
            "food_revenue": round(food_rev, 2),
            "bev_revenue": round(bev_rev, 2),
            "banquet_revenue": round(banquet_rev, 2),
            "ebitda": round(total_rev - total_exp, 2),
            "ebitda_margin_pct": round((total_rev - total_exp) / max(total_rev, 1) * 100, 1),
            "total_labor": round(total_labor, 2),
            "labor_pct": round(total_labor / max(total_rev, 1) * 100, 1),
            "total_covers": sum(t.get("guest_count", 0) for t in pos),
            "avg_check": round(sum(t.get("total", 0) for t in pos) / max(len(pos), 1), 2),
            "banquet_events": len(events),
            "total_invoices": len(invoices),
        },
        "outlet_summary": outlet_summary,
        "beverage_program": top_bev,
        "generated_at": _now(),
    }


@router.get("/events")
async def events_dashboard():
    """Events/Catering dashboard — BEO pipeline, revenue forecast."""
    events = list(db["events"].find({}, {"_id": 0}).sort("event_date", 1).limit(200))
    cal_events = list(db["calendar_events"].find({"event_type": {"$in": ["event", "banquet"]}}, {"_id": 0}).limit(100))

    # BEO pipeline stats
    stages = {}
    for e in events:
        s = e.get("stage", "unknown")
        stages[s] = stages.get(s, 0) + 1

    total_event_rev = sum(e.get("revenue", {}).get("total", 0) if isinstance(e.get("revenue"), dict) else 0 for e in events)
    total_guests = sum(e.get("guest_count", 0) for e in events)

    # Upcoming events
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming = [e for e in events if e.get("event_date", "") >= today][:10]

    # Revenue by month
    monthly_rev = {}
    for e in events:
        m = e.get("event_date", "")[:7]
        if m:
            rev = e.get("revenue", {}).get("total", 0) if isinstance(e.get("revenue"), dict) else 0
            monthly_rev[m] = monthly_rev.get(m, 0) + rev

    # Event type breakdown
    type_counts = {}
    for e in events:
        name = e.get("name", "Other")
        base = name.split(" —")[0].strip() if " —" in name else name
        type_counts[base] = type_counts.get(base, 0) + 1

    return {
        "dashboard": "events",
        "kpis": {
            "total_events": len(events),
            "total_revenue": round(total_event_rev, 2),
            "total_guests": total_guests,
            "avg_guest_count": round(total_guests / max(len(events), 1)),
            "upcoming": len(upcoming),
            "calendar_events": len(cal_events),
        },
        "pipeline": stages,
        "upcoming_events": [{"name": e.get("name"), "date": e.get("event_date"), "guests": e.get("guest_count"), "venue": e.get("venue"), "status": e.get("status")} for e in upcoming],
        "monthly_revenue": [{"month": k, "revenue": round(v, 2)} for k, v in sorted(monthly_rev.items())],
        "event_types": type_counts,
        "generated_at": _now(),
    }
