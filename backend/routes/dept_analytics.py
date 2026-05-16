"""
Department-Specific Analytics — Context-Aware BI Dashboards
=============================================================
Each department gets its own analytics that only loads when that profile/module is active:
- Spa Analytics: revenue by treatment, therapist utilization, peak hours, retention
- Engineering Analytics: work ticket metrics, resolution times, trade efficiency
- Purchasing Analytics: vendor spend, PO tracking, cost trends, delivery performance
"""
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from fastapi import APIRouter, Query
from typing import Optional
from database import db

router = APIRouter(prefix="/api/dept-analytics", tags=["dept-analytics"])
_now = lambda: datetime.now(timezone.utc).isoformat()
DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ═══════════════════════════ SPA ANALYTICS ═══════════════════════════

@router.get("/spa")
async def spa_analytics():
    """Spa-specific analytics — revenue, utilization, retention."""
    apts = list(db["spa_appointments"].find({}, {"_id": 0}))
    treatments = list(db["spa_treatments"].find({}, {"_id": 0}))
    therapists = list(db["spa_therapists"].find({}, {"_id": 0}))
    clients = list(db["spa_clients"].find({}, {"_id": 0}))

    # Revenue by treatment
    by_treatment = defaultdict(lambda: {"revenue": 0, "count": 0})
    by_therapist = defaultdict(lambda: {"revenue": 0, "count": 0, "name": ""})
    by_date = defaultdict(lambda: {"revenue": 0, "count": 0})
    by_hour = defaultdict(lambda: {"revenue": 0, "count": 0})
    by_category = defaultdict(lambda: {"revenue": 0, "count": 0})

    trt_map = {t["id"]: t for t in treatments}
    for a in apts:
        rev = a.get("price", 0)
        by_treatment[a.get("treatment_name", "Unknown")]["revenue"] += rev
        by_treatment[a.get("treatment_name", "Unknown")]["count"] += 1
        by_therapist[a.get("therapist_id", "unknown")]["revenue"] += rev
        by_therapist[a.get("therapist_id", "unknown")]["count"] += 1
        by_therapist[a.get("therapist_id", "unknown")]["name"] = a.get("therapist_name", "Unknown")
        by_date[a.get("date", "")]["revenue"] += rev
        by_date[a.get("date", "")]["count"] += 1
        try:
            h = int(a.get("time", "09:00").split(":")[0])
            by_hour[h]["revenue"] += rev
            by_hour[h]["count"] += 1
        except (ValueError, IndexError):
            pass
        trt = trt_map.get(a.get("treatment_id", ""))
        if trt:
            by_category[trt.get("category", "other")]["revenue"] += rev
            by_category[trt.get("category", "other")]["count"] += 1

    total_rev = sum(d["revenue"] for d in by_treatment.values())

    # Therapist utilization (appointments / available hours)
    therapist_util = []
    for th in therapists:
        stats = by_therapist.get(th["id"], {"revenue": 0, "count": 0})
        total_mins = stats["count"] * 60  # approximate
        available_hrs = 8 * 30  # 8 hrs/day * 30 days
        util_pct = round(total_mins / (available_hrs * 60) * 100, 1) if available_hrs else 0
        therapist_util.append({
            "name": th["name"], "id": th["id"], "specialty": th.get("specialty", ""),
            "appointments": stats["count"], "revenue": round(stats["revenue"], 2),
            "utilization_pct": util_pct, "employee_type": th.get("employee_type", "in_house"),
        })
    therapist_util.sort(key=lambda x: x["revenue"], reverse=True)

    # Client retention
    repeat_clients = len([c for c in clients if c.get("total_visits", 0) > 1])
    total_clients = len(clients)

    # Revenue trend (last 14 days)
    dates = sorted(by_date.keys())[-14:]
    rev_trend = [{"date": d, "revenue": round(by_date[d]["revenue"], 2), "appointments": by_date[d]["count"]} for d in dates]

    # Peak hours
    peak_hours = [{"hour": h, "label": f"{h}:00", "revenue": round(by_hour[h]["revenue"], 2), "appointments": by_hour[h]["count"]} for h in range(9, 20)]

    treatment_mix = [{"treatment": name, "revenue": round(d["revenue"], 2), "count": d["count"], "pct": round(d["revenue"] / max(total_rev, 1) * 100, 1)} for name, d in sorted(by_treatment.items(), key=lambda x: x[1]["revenue"], reverse=True)]
    category_mix = [{"category": cat, "revenue": round(d["revenue"], 2), "count": d["count"], "pct": round(d["revenue"] / max(total_rev, 1) * 100, 1)} for cat, d in sorted(by_category.items(), key=lambda x: x[1]["revenue"], reverse=True)]

    return {
        "kpis": {
            "total_revenue": round(total_rev, 2),
            "total_appointments": len(apts),
            "avg_ticket": round(total_rev / max(len(apts), 1), 2),
            "total_clients": total_clients,
            "repeat_clients": repeat_clients,
            "retention_rate": round(repeat_clients / max(total_clients, 1) * 100, 1),
            "avg_daily_revenue": round(total_rev / max(len(by_date), 1), 2),
        },
        "treatment_mix": treatment_mix,
        "category_mix": category_mix,
        "therapist_utilization": therapist_util,
        "revenue_trend": rev_trend,
        "peak_hours": peak_hours,
    }


# ═══════════════════════════ ENGINEERING ANALYTICS ═══════════════════════════

@router.get("/engineering")
async def engineering_analytics():
    """Engineering-specific analytics — tickets, resolution, trades."""
    tickets = list(db["eng_work_tickets"].find({}, {"_id": 0}))
    staff = list(db["eng_staff"].find({}, {"_id": 0}))
    guest_reqs = list(db["guest_requests"].find({}, {"_id": 0}))

    by_status = defaultdict(int)
    by_priority = defaultdict(int)
    by_trade = defaultdict(lambda: {"count": 0, "completed": 0, "total_hours": 0})
    by_category = defaultdict(int)

    for t in tickets:
        by_status[t.get("status", "unknown")] += 1
        by_priority[t.get("priority", "medium")] += 1
        trade = t.get("trade", "general")
        by_trade[trade]["count"] += 1
        if t.get("status") == "completed":
            by_trade[trade]["completed"] += 1
        by_trade[trade]["total_hours"] += t.get("actual_hours", 0) or t.get("estimated_hours", 0)
        by_category[t.get("category", "repair")] += 1

    total_tickets = len(tickets)
    completed = by_status.get("completed", 0)
    open_tickets = by_status.get("open", 0) + by_status.get("in_progress", 0)

    # Resolution rate
    resolution_rate = round(completed / max(total_tickets, 1) * 100, 1)

    # Guest request stats
    resolved_reqs = len([r for r in guest_reqs if r.get("status") == "resolved"])
    avg_resolution = 0
    if resolved_reqs:
        total_res_mins = sum(r.get("resolution_time_mins", 0) for r in guest_reqs if r.get("status") == "resolved")
        avg_resolution = round(total_res_mins / resolved_reqs, 1)

    trade_breakdown = [{"trade": trade, "total": d["count"], "completed": d["completed"], "completion_rate": round(d["completed"] / max(d["count"], 1) * 100, 1), "total_hours": round(d["total_hours"], 1)} for trade, d in sorted(by_trade.items(), key=lambda x: x[1]["count"], reverse=True)]
    priority_breakdown = [{"priority": p, "count": c} for p, c in sorted(by_priority.items(), key=lambda x: x[1], reverse=True)]
    category_breakdown = [{"category": c, "count": cnt} for c, cnt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)]
    status_breakdown = [{"status": s, "count": c} for s, c in by_status.items()]

    # Staff workload
    staff_workload = []
    for s in staff:
        assigned = len([t for t in tickets if t.get("assigned_to") == s["id"]])
        completed_by = len([t for t in tickets if t.get("assigned_to") == s["id"] and t.get("status") == "completed"])
        staff_workload.append({"name": s["name"], "trade": s.get("trade", "general"), "shift": s.get("shift", "day"), "assigned": assigned, "completed": completed_by})
    staff_workload.sort(key=lambda x: x["assigned"], reverse=True)

    return {
        "kpis": {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "completed": completed,
            "resolution_rate": resolution_rate,
            "critical_open": by_priority.get("critical", 0),
            "guest_requests": len(guest_reqs),
            "resolved_requests": resolved_reqs,
            "avg_resolution_mins": avg_resolution,
            "total_staff": len(staff),
        },
        "status_breakdown": status_breakdown,
        "priority_breakdown": priority_breakdown,
        "trade_breakdown": trade_breakdown,
        "category_breakdown": category_breakdown,
        "staff_workload": staff_workload,
    }


# ═══════════════════════════ PURCHASING ANALYTICS ═══════════════════════════

@router.get("/purchasing")
async def purchasing_analytics():
    """Purchasing-specific analytics — vendor spend, POs, cost trends."""
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))
    pos = list(db["pos_transactions"].find({}, {"_id": 0}).limit(2000))
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(1000))

    # Vendor spend from invoices
    by_vendor = defaultdict(lambda: {"total": 0, "count": 0, "items": 0})
    for inv in invoices:
        vendor = inv.get("vendor_name", inv.get("vendor_id", "Unknown"))
        by_vendor[vendor]["total"] += inv.get("total", inv.get("amount", 0))
        by_vendor[vendor]["count"] += 1
        by_vendor[vendor]["items"] += len(inv.get("line_items", []))

    total_spend = sum(d["total"] for d in by_vendor.values())
    vendor_spend = [{"vendor": v, "total": round(d["total"], 2), "orders": d["count"], "items": d["items"], "pct": round(d["total"] / max(total_spend, 1) * 100, 1)} for v, d in sorted(by_vendor.items(), key=lambda x: x[1]["total"], reverse=True)]

    # COGS from GL
    food_cogs = sum(e.get("amount", 0) for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e.get("amount", 0) for e in gl if e.get("gl_code") == "5100")
    total_cogs = food_cogs + bev_cogs
    total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")

    # POS item categories
    category_spend = defaultdict(float)
    for t in pos:
        for item in t.get("items", []):
            category_spend[item.get("category", "other")] += item.get("food_cost", 0)
    cat_breakdown = [{"category": c, "cost": round(v, 2)} for c, v in sorted(category_spend.items(), key=lambda x: x[1], reverse=True)]

    # Daily spend trend (from GL date entries)
    daily_cogs = defaultdict(float)
    for e in gl:
        if e.get("gl_code") in ("5000", "5100"):
            d = e.get("date", e.get("period", ""))[:10]
            if d:
                daily_cogs[d] += e.get("amount", 0)
    cost_trend = [{"date": d, "cogs": round(v, 2)} for d, v in sorted(daily_cogs.items())[-14:]]

    return {
        "kpis": {
            "total_spend": round(total_spend, 2),
            "total_invoices": len(invoices),
            "total_vendors": len(by_vendor),
            "food_cogs": round(food_cogs, 2),
            "bev_cogs": round(bev_cogs, 2),
            "total_cogs": round(total_cogs, 2),
            "cogs_pct": round(total_cogs / max(total_rev, 1) * 100, 1),
            "total_revenue": round(total_rev, 2),
        },
        "vendor_spend": vendor_spend[:15],
        "category_breakdown": cat_breakdown,
        "cost_trend": cost_trend,
    }
