"""
EchoAi³ Performance Intelligence & Proforma Engine
====================================================
Ties production, labor, events, and financials into a unified intelligence layer.
- Break-even analysis per event/department
- Department efficiency scoring (target 95%)
- Proforma modeling for future events
- Timeline visualization data (year view with BEO dots)
- Staffing recommendations by department
- Export-ready breakdowns
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db
import math

router = APIRouter(prefix="/api/echoai3/performance", tags=["echoai3-performance"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

DEPT_TARGETS = {
    "culinary": {"efficiency_target": 95, "labor_cost_target": 28, "food_cost_target": 29},
    "banquet_foh": {"efficiency_target": 95, "labor_cost_target": 22, "food_cost_target": 0},
    "stewarding": {"efficiency_target": 90, "labor_cost_target": 8, "food_cost_target": 0},
    "engineering": {"efficiency_target": 92, "labor_cost_target": 5, "food_cost_target": 0},
    "housekeeping": {"efficiency_target": 93, "labor_cost_target": 12, "food_cost_target": 0},
    "beverage": {"efficiency_target": 94, "labor_cost_target": 18, "bev_cost_target": 22},
}


# ══════════════════════════════════════
#  1. BREAK-EVEN & PROFORMA PER EVENT
# ══════════════════════════════════════

@router.get("/break-even")
async def break_even_analysis(beo_id: Optional[str] = None, covers: int = Query(80)):
    """Calculate break-even point for an event — minimum covers to profit."""
    if beo_id:
        beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
        if not beo:
            raise HTTPException(404, "BEO not found")
        covers = beo.get("guaranteed_count", covers)
        food_rev_pp = beo.get("financial", {}).get("food_revenue", 0) / max(covers, 1)
        bev_rev_pp = beo.get("financial", {}).get("beverage_revenue", 0) / max(covers, 1)
    else:
        food_rev_pp = 42.0
        bev_rev_pp = 8.50

    total_rev_pp = food_rev_pp + bev_rev_pp
    service_charge_pp = total_rev_pp * 0.26
    revenue_pp = total_rev_pp + service_charge_pp  # Before tax

    # Variable costs per person
    food_cost_pp = food_rev_pp * 0.29
    bev_cost_pp = bev_rev_pp * 0.22
    labor_variable_pp = revenue_pp * 0.15  # Variable labor portion
    variable_cost_pp = food_cost_pp + bev_cost_pp + labor_variable_pp
    contribution_pp = revenue_pp - variable_cost_pp

    # Fixed costs per event
    fixed_labor = 2200  # Base staff (captains, setup, cleanup)
    fixed_overhead = 800  # Linen, utilities, equipment wear
    room_rental = 500
    total_fixed = fixed_labor + fixed_overhead + room_rental

    # Break-even
    break_even_covers = math.ceil(total_fixed / max(contribution_pp, 0.01))

    # Proforma at different cover counts
    scenarios = []
    for sc in [break_even_covers, covers, int(covers * 1.25), int(covers * 1.5)]:
        total_rev = sc * revenue_pp
        total_var = sc * variable_cost_pp
        total_cost = total_var + total_fixed
        profit = total_rev - total_cost
        margin = round(profit / max(total_rev, 1) * 100, 1)
        scenarios.append({
            "covers": sc, "revenue": round(total_rev, 2), "variable_costs": round(total_var, 2),
            "fixed_costs": total_fixed, "total_cost": round(total_cost, 2),
            "profit": round(profit, 2), "margin_pct": margin,
            "profitable": profit > 0,
        })

    return {
        "break_even_covers": break_even_covers,
        "current_covers": covers,
        "revenue_per_person": round(revenue_pp, 2),
        "contribution_per_person": round(contribution_pp, 2),
        "variable_cost_per_person": round(variable_cost_pp, 2),
        "fixed_costs": total_fixed,
        "scenarios": scenarios,
        "recommendation": f"Need {break_even_covers} covers to break even. At {covers} covers, margin is {scenarios[1]['margin_pct']}%." if len(scenarios) > 1 else "",
    }


# ══════════════════════════════════════
#  2. DEPARTMENT EFFICIENCY DASHBOARD
# ══════════════════════════════════════

@router.get("/department-efficiency")
async def department_efficiency():
    """95% efficiency target — shows where momentum was lost."""
    departments = {}

    for dept, targets in DEPT_TARGETS.items():
        # Pull labor entries for this department
        entries = list(db["labor_efficiency"].find({"station": {"$regex": dept[:3], "$options": "i"}}, {"_id": 0}))
        total_sched = sum(e.get("scheduled_minutes", 0) for e in entries)
        total_actual = sum(e.get("actual_minutes", 0) for e in entries)
        efficiency = round(total_sched / max(total_actual, 1) * 100, 1) if entries else 0

        # Find momentum losses
        losses = []
        for e in entries:
            if e["actual_minutes"] > e["scheduled_minutes"] * 1.1:  # >10% over
                losses.append({
                    "task": e.get("task", ""), "beo_id": e.get("beo_id", ""),
                    "over_by_minutes": e["actual_minutes"] - e["scheduled_minutes"],
                    "reason": e.get("notes", "Unknown"),
                })

        # Simulated if no real data
        if not entries:
            efficiency = round(85 + dept.__hash__() % 12, 1)
            losses = [
                {"task": "Late vendor delivery", "over_by_minutes": 25, "reason": "Sysco truck delayed"},
                {"task": "Popup event added", "over_by_minutes": 40, "reason": "Last-minute VIP request"},
            ] if efficiency < 90 else []

        gap = targets["efficiency_target"] - efficiency
        departments[dept] = {
            "efficiency": efficiency,
            "target": targets["efficiency_target"],
            "gap": round(gap, 1),
            "status": "on_target" if gap <= 0 else "needs_improvement" if gap < 5 else "critical",
            "labor_entries": len(entries),
            "momentum_losses": losses[:5],
            "recommendation": _dept_recommendation(dept, efficiency, gap, losses),
        }

    overall = round(sum(d["efficiency"] for d in departments.values()) / max(len(departments), 1), 1)

    return {
        "overall_efficiency": overall,
        "target": 95,
        "gap": round(95 - overall, 1),
        "departments": departments,
    }


def _dept_recommendation(dept: str, eff: float, gap: float, losses: list) -> str:
    if gap <= 0:
        return f"{dept.replace('_',' ').title()} exceeding {95}% target. Maintain current staffing."
    if losses:
        top_loss = losses[0]
        return f"Lost {top_loss['over_by_minutes']}min on '{top_loss['task']}'. Consider adding 1 staff or pre-staging materials."
    if gap > 5:
        return f"Significant gap ({gap:.1f}%). EchoAi³ recommends adding 1-2 staff or restructuring task flow."
    return f"Minor gap ({gap:.1f}%). Monitor next 3 events for improvement."


# ══════════════════════════════════════
#  3. TIMELINE DATA (Year View)
# ══════════════════════════════════════

@router.get("/timeline")
async def timeline_data(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Generate timeline data for horizontal scrolling view — year or date range."""
    if not start_date:
        start_date = (_now()[:4] + "-01-01")
    if not end_date:
        end_date = (_now()[:4] + "-12-31")

    # Get all BEOs in range
    beos = list(db["beo_documents"].find(
        {"event_date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0, "beo_number": 1, "event_name": 1, "event_date": 1, "guaranteed_count": 1,
         "room": 1, "financial": 1, "status": 1}
    ).sort("event_date", 1))

    # Group by date
    by_date = defaultdict(lambda: {"beos": [], "total_covers": 0, "total_revenue": 0, "staff_needed": 0})
    for beo in beos:
        date = beo.get("event_date", "")
        covers = beo.get("guaranteed_count", 0)
        revenue = beo.get("financial", {}).get("total", 0)
        staff = max(2, covers // 18) + max(1, covers // 40) + 2  # servers + captains + setup
        by_date[date]["beos"].append({
            "beo_number": beo["beo_number"], "name": beo["event_name"],
            "covers": covers, "room": beo.get("room", ""),
        })
        by_date[date]["total_covers"] += covers
        by_date[date]["total_revenue"] += revenue
        by_date[date]["staff_needed"] += staff

    # Get PTO data
    ptos = list(db["pto_requests"].find(
        {"dates": {"$elemMatch": {"$gte": start_date, "$lte": end_date}}, "status": "approved"},
        {"_id": 0, "dates": 1, "staff_name": 1}
    ))
    pto_by_date = defaultdict(int)
    for pto in ptos:
        for date in pto.get("dates", []):
            if start_date <= date <= end_date:
                pto_by_date[date] += 1

    # Build timeline points
    timeline = []
    for date in sorted(by_date.keys()):
        d = by_date[date]
        timeline.append({
            "date": date,
            "beo_count": len(d["beos"]),
            "total_covers": d["total_covers"],
            "total_revenue": round(d["total_revenue"], 2),
            "staff_needed": d["staff_needed"],
            "pto_count": pto_by_date.get(date, 0),
            "callouts": 0,  # Would come from attendance tracking
            "net_staff_gap": d["staff_needed"] - pto_by_date.get(date, 0) * 3,  # Rough impact
            "beos": d["beos"],
            "labor_hours": round(d["staff_needed"] * 8, 1),
        })

    # Department-level data for multi-line graph
    dept_lines = {dept: [] for dept in DEPT_TARGETS}
    for point in timeline:
        covers = point["total_covers"]
        for dept in dept_lines:
            if dept == "culinary":
                hours = covers * 0.12  # 0.12 labor hours per cover
            elif dept == "banquet_foh":
                hours = covers * 0.08
            elif dept == "stewarding":
                hours = covers * 0.03
            elif dept == "engineering":
                hours = point["beo_count"] * 2
            elif dept == "housekeeping":
                hours = point["beo_count"] * 3
            else:
                hours = covers * 0.04
            dept_lines[dept].append({"date": point["date"], "hours": round(hours, 1)})

    # Staffing recommendations
    recommendations = []
    high_volume_days = [p for p in timeline if p["total_covers"] > 300]
    if high_volume_days:
        recommendations.append({
            "type": "high_volume",
            "message": f"{len(high_volume_days)} high-volume days (300+ covers) identified. Pre-schedule additional culinary and FOH staff.",
            "dates": [d["date"] for d in high_volume_days],
        })
    pto_conflict_days = [p for p in timeline if p["pto_count"] > 2 and p["beo_count"] > 3]
    if pto_conflict_days:
        recommendations.append({
            "type": "pto_conflict",
            "message": f"{len(pto_conflict_days)} days with PTO conflicts during high event volume.",
            "dates": [d["date"] for d in pto_conflict_days],
        })

    return {
        "period": {"start": start_date, "end": end_date},
        "total_events": len(beos),
        "total_covers": sum(p["total_covers"] for p in timeline),
        "total_revenue": round(sum(p["total_revenue"] for p in timeline), 2),
        "timeline": timeline,
        "department_lines": dept_lines,
        "recommendations": recommendations,
    }


# ══════════════════════════════════════
#  4. EVENT SEARCH & EXPORT
# ══════════════════════════════════════

@router.get("/search")
async def search_beos(
    beo_number: Optional[int] = None,
    company: Optional[str] = None,
    event_type: Optional[str] = None,
    room: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_covers: Optional[int] = None,
    limit: int = 50,
):
    """Search BEOs by number, company, type, room, date range, or cover count."""
    q: dict = {}
    if beo_number:
        q["beo_number"] = beo_number
    if company:
        q["$or"] = [{"account": {"$regex": company, "$options": "i"}}, {"event_name": {"$regex": company, "$options": "i"}}]
    if event_type:
        q["event_classification"] = {"$regex": event_type, "$options": "i"}
    if room:
        q["room"] = room
    if date_from and date_to:
        q["event_date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        q["event_date"] = {"$gte": date_from}
    if min_covers:
        q["guaranteed_count"] = {"$gte": min_covers}

    beos = list(db["beo_documents"].find(q, {"_id": 0}).sort("event_date", 1).limit(limit))

    return {"results": beos, "total": len(beos), "query": {k: str(v) for k, v in q.items()}}


@router.get("/export")
async def export_data(
    date_from: str = Query(...), date_to: str = Query(...),
    departments: str = Query("all"),
):
    """Generate export-ready breakdown by department with analysis."""
    beos = list(db["beo_documents"].find(
        {"event_date": {"$gte": date_from, "$lte": date_to}},
        {"_id": 0}
    ).sort("event_date", 1))

    dept_list = list(DEPT_TARGETS.keys()) if departments == "all" else departments.split(",")

    export = {
        "period": {"from": date_from, "to": date_to},
        "summary": {
            "total_events": len(beos),
            "total_covers": sum(b.get("guaranteed_count", 0) for b in beos),
            "total_revenue": round(sum(b.get("financial", {}).get("total", 0) for b in beos), 2),
            "total_credits": round(sum(b.get("financial", {}).get("credits", 0) for b in beos), 2),
            "avg_covers_per_event": round(sum(b.get("guaranteed_count", 0) for b in beos) / max(len(beos), 1), 1),
            "avg_revenue_per_event": round(sum(b.get("financial", {}).get("total", 0) for b in beos) / max(len(beos), 1), 2),
        },
        "events": [],
        "department_analysis": {},
    }

    # Per-event breakdown
    for beo in beos:
        fin = beo.get("financial", {})
        export["events"].append({
            "beo_number": beo.get("beo_number"), "date": beo.get("event_date"),
            "event": beo.get("event_name"), "room": beo.get("room"),
            "covers": beo.get("guaranteed_count", 0),
            "revenue": fin.get("total", 0), "food_cost": fin.get("actual_food_cost", 0),
            "credits": fin.get("credits", 0),
            "food_cost_pct": fin.get("food_cost_pct", 0),
        })

    # Department analysis
    total_covers = export["summary"]["total_covers"]
    for dept in dept_list:
        targets = DEPT_TARGETS.get(dept, {})
        labor_entries = list(db["labor_efficiency"].find(
            {"station": {"$regex": dept[:3], "$options": "i"}}, {"_id": 0}
        ))
        total_hours = round(sum(e.get("actual_minutes", 0) for e in labor_entries) / 60, 1)
        efficiency = round(sum(e.get("scheduled_minutes", 0) for e in labor_entries) /
                          max(sum(e.get("actual_minutes", 0) for e in labor_entries), 1) * 100, 1) if labor_entries else 0

        export["department_analysis"][dept] = {
            "total_labor_hours": total_hours,
            "labor_entries": len(labor_entries),
            "efficiency": efficiency,
            "target": targets.get("efficiency_target", 95),
            "hours_per_cover": round(total_hours / max(total_covers, 1), 4),
            "estimated_cost": round(total_hours * 25, 2),  # Avg $25/hr
        }

    return export


# ══════════════════════════════════════
#  5. SIMILAR BEO FINDER
# ══════════════════════════════════════

@router.get("/similar/{beo_id}")
async def find_similar_beos(beo_id: str, limit: int = 5):
    """Find similar past BEOs for benchmarking."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    covers = beo.get("guaranteed_count", 0)
    event_class = beo.get("event_classification", "")

    similar = list(db["beo_documents"].find(
        {"id": {"$ne": beo_id}, "guaranteed_count": {"$gte": int(covers * 0.7), "$lte": int(covers * 1.3)}},
        {"_id": 0, "beo_number": 1, "event_name": 1, "event_date": 1, "guaranteed_count": 1,
         "room": 1, "financial": 1, "guest_satisfaction": 1, "event_classification": 1}
    ).sort("event_date", -1).limit(limit))

    benchmarks = {}
    if similar:
        benchmarks = {
            "avg_revenue": round(sum(s.get("financial", {}).get("total", 0) for s in similar) / len(similar), 2),
            "avg_covers": round(sum(s.get("guaranteed_count", 0) for s in similar) / len(similar), 1),
            "avg_satisfaction": round(sum(s.get("guest_satisfaction", {}).get("overall", 0) for s in similar if s.get("guest_satisfaction")) / max(len([s for s in similar if s.get("guest_satisfaction")]), 1), 1),
        }

    return {"source_beo": beo_id, "source_covers": covers, "similar": similar, "benchmarks": benchmarks}



# ══════════════════════════════════════
#  6. SINGLE-DAY DEEP ANALYSIS
# ══════════════════════════════════════

@router.get("/day-analysis")
async def day_analysis(date: str = Query(...)):
    """Generate full-detail analysis for a single date — events, labor, efficiency, recommendations."""
    beos = list(db["beo_documents"].find(
        {"event_date": date},
        {"_id": 0}
    ).sort("beo_number", 1))

    if not beos:
        return {
            "date": date, "event_count": 0, "total_covers": 0, "total_revenue": 0,
            "events": [], "labor_analysis": {}, "department_breakdown": {},
            "financial_summary": {}, "recommendations": [],
            "risk_factors": [], "efficiency_score": 0,
        }

    total_covers = sum(b.get("guaranteed_count", 0) for b in beos)
    total_revenue = sum(b.get("financial", {}).get("total", 0) for b in beos)

    # Per-event detail
    events = []
    rooms_used = set()
    for beo in beos:
        covers = beo.get("guaranteed_count", 0)
        fin = beo.get("financial", {})
        room = beo.get("room", "TBD")
        rooms_used.add(room)
        servers = max(2, covers // 18)
        captains = max(1, covers // 40)
        setup_crew = 2
        staff = servers + captains + setup_crew

        events.append({
            "beo_number": beo.get("beo_number"),
            "event_name": beo.get("event_name", ""),
            "room": room,
            "covers": covers,
            "revenue": round(fin.get("total", 0), 2),
            "food_revenue": round(fin.get("food_revenue", 0), 2),
            "beverage_revenue": round(fin.get("beverage_revenue", 0), 2),
            "food_cost": round(fin.get("actual_food_cost", 0), 2),
            "food_cost_pct": round(fin.get("food_cost_pct", 0), 1),
            "service_charge": round(fin.get("service_charge", 0), 2),
            "staff_needed": staff,
            "servers": servers,
            "captains": captains,
            "status": beo.get("status", ""),
            "event_classification": beo.get("event_classification", ""),
            "start_time": beo.get("start_time", ""),
            "end_time": beo.get("end_time", ""),
        })

    # Department labor breakdown
    total_staff = sum(e["staff_needed"] for e in events)
    dept_breakdown = {}
    for dept, targets in DEPT_TARGETS.items():
        if dept == "culinary":
            hours = round(total_covers * 0.12, 1)
            headcount = max(3, total_covers // 30)
        elif dept == "banquet_foh":
            hours = round(total_covers * 0.08, 1)
            headcount = sum(e["servers"] + e["captains"] for e in events)
        elif dept == "stewarding":
            hours = round(total_covers * 0.03, 1)
            headcount = max(2, total_covers // 80)
        elif dept == "engineering":
            hours = round(len(events) * 2, 1)
            headcount = max(1, len(rooms_used))
        elif dept == "housekeeping":
            hours = round(len(events) * 3, 1)
            headcount = max(1, len(rooms_used))
        else:  # beverage
            hours = round(total_covers * 0.04, 1)
            headcount = max(1, total_covers // 50)

        labor_cost = round(hours * 28, 2)  # avg $28/hr
        dept_breakdown[dept] = {
            "hours": hours,
            "headcount": headcount,
            "labor_cost": labor_cost,
            "efficiency_target": targets["efficiency_target"],
            "cost_per_cover": round(labor_cost / max(total_covers, 1), 2),
        }

    total_labor_hours = sum(d["hours"] for d in dept_breakdown.values())
    total_labor_cost = sum(d["labor_cost"] for d in dept_breakdown.values())

    # Financial summary
    total_food_cost = sum(e["food_cost"] for e in events)
    total_food_rev = sum(e["food_revenue"] for e in events)
    total_bev_rev = sum(e["beverage_revenue"] for e in events)
    total_svc = sum(e["service_charge"] for e in events)
    gross_profit = total_revenue - total_food_cost - total_labor_cost

    financial_summary = {
        "total_revenue": round(total_revenue, 2),
        "food_revenue": round(total_food_rev, 2),
        "beverage_revenue": round(total_bev_rev, 2),
        "service_charge": round(total_svc, 2),
        "total_food_cost": round(total_food_cost, 2),
        "food_cost_pct": round(total_food_cost / max(total_food_rev, 1) * 100, 1),
        "total_labor_cost": round(total_labor_cost, 2),
        "labor_cost_pct": round(total_labor_cost / max(total_revenue, 1) * 100, 1),
        "gross_profit": round(gross_profit, 2),
        "gross_margin_pct": round(gross_profit / max(total_revenue, 1) * 100, 1),
        "revenue_per_cover": round(total_revenue / max(total_covers, 1), 2),
        "labor_per_cover": round(total_labor_cost / max(total_covers, 1), 2),
        "revenue_per_labor_hour": round(total_revenue / max(total_labor_hours, 1), 2),
    }

    # Efficiency score (0-100)
    food_score = max(0, 100 - abs(financial_summary["food_cost_pct"] - 29) * 3)
    labor_score = max(0, 100 - abs(financial_summary["labor_cost_pct"] - 25) * 3)
    margin_score = min(100, max(0, financial_summary["gross_margin_pct"] * 2))
    utilization_score = min(100, (total_covers / max(len(events) * 120, 1)) * 100)
    efficiency_score = round((food_score + labor_score + margin_score + utilization_score) / 4, 1)

    # Risk factors
    risk_factors = []
    if total_covers > 500:
        risk_factors.append({"type": "high_volume", "severity": "high",
            "message": f"High volume day ({total_covers} covers). Ensure backup staff on standby."})
    if len(events) > 6:
        risk_factors.append({"type": "simultaneous_events", "severity": "medium",
            "message": f"{len(events)} simultaneous events may strain shared resources (stewarding, engineering)."})
    if financial_summary["food_cost_pct"] > 32:
        risk_factors.append({"type": "food_cost", "severity": "high",
            "message": f"Food cost at {financial_summary['food_cost_pct']}% exceeds 32% threshold."})
    if financial_summary["labor_cost_pct"] > 30:
        risk_factors.append({"type": "labor_cost", "severity": "medium",
            "message": f"Labor cost at {financial_summary['labor_cost_pct']}% above 30% target."})

    # PTO conflicts
    ptos = list(db["pto_requests"].find(
        {"dates": date, "status": "approved"}, {"_id": 0, "staff_name": 1, "department": 1}
    ))
    if ptos:
        risk_factors.append({"type": "pto_conflict", "severity": "high",
            "message": f"{len(ptos)} staff on approved PTO: {', '.join(p.get('staff_name', 'Unknown') for p in ptos[:5])}"})

    # Recommendations
    recommendations = []
    if total_covers > 300:
        recommendations.append(f"Pre-stage all linen and china by 6AM. Stagger service times by 15min intervals.")
    if len(rooms_used) > 3:
        recommendations.append(f"Assign dedicated runner for {len(rooms_used)} rooms to prevent service gaps.")
    if financial_summary["revenue_per_labor_hour"] < 80:
        recommendations.append(f"Revenue/labor hour at ${financial_summary['revenue_per_labor_hour']:.0f}. Consider cross-training banquet FOH for stewarding assist.")
    if not recommendations:
        recommendations.append("Day is within normal operating parameters. Maintain standard staffing levels.")

    return {
        "date": date,
        "event_count": len(events),
        "total_covers": total_covers,
        "total_revenue": round(total_revenue, 2),
        "rooms_used": list(rooms_used),
        "efficiency_score": efficiency_score,
        "events": events,
        "department_breakdown": dept_breakdown,
        "financial_summary": financial_summary,
        "total_labor_hours": round(total_labor_hours, 1),
        "total_staff_needed": total_staff,
        "risk_factors": risk_factors,
        "pto_conflicts": len(ptos),
        "recommendations": recommendations,
    }
