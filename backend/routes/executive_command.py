"""
Executive Command Center — Multi-Outlet Health Dashboard
==========================================================
For Exec Chefs and Directors overseeing multiple outlets:
- Health dial per outlet (0-100 composite score)
- Click outlet → detailed P&L drill-down
- Customizable alert thresholds per user
- Cross-outlet comparison metrics
- Daily morning briefing auto-generation
- Notification engine (OT risk, purchase alerts, budget warnings)
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, Dict, List

from database import db

router = APIRouter(prefix="/api/executive", tags=["executive-command"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

OUTLETS = {
    "main-dining": {"name": "The Grand Dining Room", "type": "restaurant", "icon": "utensils"},
    "banquet-hall": {"name": "Crystal Ballroom", "type": "banquet", "icon": "crown"},
    "sky-bar": {"name": "SkyBar Lounge", "type": "bar", "icon": "wine"},
    "pool-cafe": {"name": "Aqua Cafe", "type": "cafe", "icon": "coffee"},
    "main-kitchen": {"name": "Central Kitchen", "type": "kitchen", "icon": "flame"},
}

DEFAULT_THRESHOLDS = {
    "food_cost_pct": {"green": 22, "amber": 26, "red": 30},
    "bev_cost_pct": {"green": 18, "amber": 22, "red": 26},
    "labor_pct": {"green": 25, "amber": 30, "red": 35},
    "waste_pct": {"green": 1.0, "amber": 1.5, "red": 2.5},
    "avg_check": {"green": 80, "amber": 60, "red": 40},  # reverse - higher is better
    "covers_vs_budget": {"green": 95, "amber": 85, "red": 70},  # % of budget
}


class ThresholdUpdate(BaseModel):
    user_id: str
    thresholds: Dict[str, Dict[str, float]]


def _get_user(uid: str):
    return db["rbac_users"].find_one({"user_id": uid}, {"_id": 0})


def _get_thresholds(uid: str):
    """Get user-specific thresholds or defaults."""
    custom = db["alert_thresholds"].find_one({"user_id": uid}, {"_id": 0})
    if custom:
        return custom.get("thresholds", DEFAULT_THRESHOLDS)
    return DEFAULT_THRESHOLDS


def _health_score(value, threshold, reverse=False):
    """Calculate 0-100 health score. Green=100, Red=0."""
    g, a, r = threshold["green"], threshold["amber"], threshold["red"]
    if reverse:  # higher value = better (avg check, covers)
        if value >= g:
            return 100
        elif value >= a:
            return 60 + 40 * (value - a) / max(g - a, 1)
        elif value >= r:
            return 20 + 40 * (value - r) / max(a - r, 1)
        return max(0, 20 * value / max(r, 1))
    else:  # lower value = better (food cost%, labor%)
        if value <= g:
            return 100
        elif value <= a:
            return 60 + 40 * (a - value) / max(a - g, 1)
        elif value <= r:
            return 20 + 40 * (r - value) / max(r - a, 1)
        return max(0, 20 * (1 - (value - r) / max(r, 1)))


def _compute_outlet_metrics(outlet_id):
    """Compute financial metrics for a single outlet."""
    pos_txns = list(db["pos_transactions"].find({"outlet_id": outlet_id}, {"_id": 0}).limit(5000))
    if not pos_txns:
        # Some outlets may not have direct POS data (e.g., kitchen)
        return None

    revenue = sum(t.get("subtotal", 0) for t in pos_txns)
    food_cost = sum(t.get("food_cost_total", 0) for t in pos_txns)
    covers = sum(t.get("guest_count", 0) for t in pos_txns)
    txn_count = len(pos_txns)
    avg_check = round(revenue / max(txn_count, 1), 2)
    food_cost_pct = round(food_cost / max(revenue, 1) * 100, 1)

    # Beverage breakdown
    bev_rev = sum(sum(i.get("revenue", 0) for i in t.get("items", []) if i.get("category") == "beverage") for t in pos_txns)
    bev_cost = sum(sum(i.get("food_cost", 0) for i in t.get("items", []) if i.get("category") == "beverage") for t in pos_txns)
    bev_cost_pct = round(bev_cost / max(bev_rev, 1) * 100, 1) if bev_rev > 0 else 0

    # Waste for this outlet's departments
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))
    total_waste = sum(w.get("cost", 0) for w in waste)
    outlet_waste_share = total_waste * 0.2  # approximate per outlet
    waste_pct = round(outlet_waste_share / max(revenue, 1) * 100, 2)

    # Daily breakdown (last 7 days)
    daily = {}
    for t in pos_txns:
        d = t.get("closed_at", "")[:10]
        if d not in daily:
            daily[d] = {"revenue": 0, "covers": 0, "food_cost": 0, "txns": 0}
        daily[d]["revenue"] += t.get("subtotal", 0)
        daily[d]["covers"] += t.get("guest_count", 0)
        daily[d]["food_cost"] += t.get("food_cost_total", 0)
        daily[d]["txns"] += 1

    sorted_days = sorted(daily.keys(), reverse=True)[:7]
    trend = [{"date": d, **{k: round(v, 2) for k, v in daily[d].items()}} for d in sorted_days]

    # Meal period breakdown
    meals = {}
    for t in pos_txns:
        mp = t.get("meal_period", "other")
        if mp not in meals:
            meals[mp] = {"revenue": 0, "covers": 0, "txns": 0}
        meals[mp]["revenue"] += t.get("subtotal", 0)
        meals[mp]["covers"] += t.get("guest_count", 0)
        meals[mp]["txns"] += 1
    for mp in meals:
        meals[mp]["revenue"] = round(meals[mp]["revenue"], 2)
        meals[mp]["avg_check"] = round(meals[mp]["revenue"] / max(meals[mp]["txns"], 1), 2)

    # Top items for this outlet
    item_sales = {}
    for t in pos_txns:
        for item in t.get("items", []):
            name = item.get("name", "Unknown")
            if name not in item_sales:
                item_sales[name] = {"name": name, "qty": 0, "revenue": 0, "food_cost": 0}
            item_sales[name]["qty"] += item.get("quantity", 0)
            item_sales[name]["revenue"] += item.get("revenue", 0)
            item_sales[name]["food_cost"] += item.get("food_cost", 0)
    top_items = sorted(item_sales.values(), key=lambda x: x["revenue"], reverse=True)[:8]
    for it in top_items:
        it["margin"] = round(it["revenue"] - it["food_cost"], 2)
        it["food_cost_pct"] = round(it["food_cost"] / max(it["revenue"], 1) * 100, 1)
        it["revenue"] = round(it["revenue"], 2)
        it["food_cost"] = round(it["food_cost"], 2)

    return {
        "revenue": round(revenue, 2),
        "food_cost": round(food_cost, 2),
        "food_cost_pct": food_cost_pct,
        "bev_revenue": round(bev_rev, 2),
        "bev_cost_pct": bev_cost_pct,
        "covers": covers,
        "transactions": txn_count,
        "avg_check": avg_check,
        "waste_pct": waste_pct,
        "trend": trend,
        "meal_periods": meals,
        "top_items": top_items,
    }


# ── Multi-Outlet Health Dashboard ──

@router.get("/health-overview")
async def health_overview(user_id: str = Query("usr-chef-001")):
    """Multi-outlet health dashboard with composite scores."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found"}

    thresholds = _get_thresholds(user_id)
    role = user.get("role", "staff")
    depts = user.get("departments", [])

    # Determine which outlets this user oversees
    user_outlets = []
    if "all" in depts or role in ("owner", "gm", "controller"):
        user_outlets = list(OUTLETS.keys())
    else:
        dept_outlet_map = {
            "dining": ["main-dining"], "culinary": ["main-dining", "main-kitchen"],
            "banquet": ["banquet-hall"], "bar": ["sky-bar"], "cafe": ["pool-cafe"],
            "pastry": ["main-kitchen"],
        }
        for d in depts:
            user_outlets.extend(dept_outlet_map.get(d, []))
        user_outlets = list(set(user_outlets)) or list(OUTLETS.keys())

    outlet_health = []
    for oid in user_outlets:
        info = OUTLETS.get(oid, {})
        metrics = _compute_outlet_metrics(oid)

        if not metrics:
            outlet_health.append({
                "outlet_id": oid, "name": info.get("name", oid),
                "type": info.get("type", ""), "icon": info.get("icon", ""),
                "health_score": None, "status": "no_data",
                "metrics": None, "scores": {},
            })
            continue

        # Compute individual health scores
        fc_thresh = thresholds.get("food_cost_pct", DEFAULT_THRESHOLDS["food_cost_pct"])
        bc_thresh = thresholds.get("bev_cost_pct", DEFAULT_THRESHOLDS["bev_cost_pct"])
        lb_thresh = thresholds.get("labor_pct", DEFAULT_THRESHOLDS["labor_pct"])
        ws_thresh = thresholds.get("waste_pct", DEFAULT_THRESHOLDS["waste_pct"])
        ac_thresh = thresholds.get("avg_check", DEFAULT_THRESHOLDS["avg_check"])

        scores = {
            "food_cost": round(_health_score(metrics["food_cost_pct"], fc_thresh), 0),
            "bev_cost": round(_health_score(metrics["bev_cost_pct"], bc_thresh), 0),
            "waste": round(_health_score(metrics["waste_pct"], ws_thresh), 0),
            "avg_check": round(_health_score(metrics["avg_check"], ac_thresh, reverse=True), 0),
        }
        composite = round(sum(scores.values()) / len(scores), 0)

        status = "healthy" if composite >= 75 else "warning" if composite >= 50 else "critical"

        # Generate alerts for this outlet
        alerts = []
        if metrics["food_cost_pct"] > fc_thresh["amber"]:
            alerts.append({"metric": "Food Cost", "value": f"{metrics['food_cost_pct']}%", "severity": "critical" if metrics["food_cost_pct"] > fc_thresh["red"] else "warning"})
        if metrics["waste_pct"] > ws_thresh["amber"]:
            alerts.append({"metric": "Waste", "value": f"{metrics['waste_pct']}%", "severity": "warning"})

        outlet_health.append({
            "outlet_id": oid, "name": info.get("name", oid),
            "type": info.get("type", ""), "icon": info.get("icon", ""),
            "health_score": int(composite), "status": status,
            "scores": scores, "alerts": alerts,
            "metrics": {
                "revenue": metrics["revenue"],
                "food_cost_pct": metrics["food_cost_pct"],
                "bev_cost_pct": metrics["bev_cost_pct"],
                "covers": metrics["covers"],
                "avg_check": metrics["avg_check"],
                "waste_pct": metrics["waste_pct"],
                "transactions": metrics["transactions"],
            },
        })

    # Sort by health score (worst first for attention)
    outlet_health.sort(key=lambda o: o.get("health_score") or 999)

    # Overall resort health
    scored = [o for o in outlet_health if o["health_score"] is not None]
    resort_score = round(sum(o["health_score"] for o in scored) / max(len(scored), 1)) if scored else 0

    return {
        "user": {"id": user["user_id"], "name": user["name"], "role": role, "departments": depts},
        "resort_health": resort_score,
        "resort_status": "healthy" if resort_score >= 75 else "warning" if resort_score >= 50 else "critical",
        "outlets": outlet_health,
        "outlet_count": len(outlet_health),
        "critical_count": len([o for o in outlet_health if o["status"] == "critical"]),
        "warning_count": len([o for o in outlet_health if o["status"] == "warning"]),
        "thresholds": thresholds,
        "generated_at": _now(),
    }


# ── Single Outlet Detail ──

@router.get("/outlet/{outlet_id}")
async def outlet_detail(outlet_id: str, user_id: str = Query("usr-chef-001")):
    """Full detail view for a single outlet."""
    info = OUTLETS.get(outlet_id)
    if not info:
        return {"error": f"Outlet '{outlet_id}' not found"}

    metrics = _compute_outlet_metrics(outlet_id)
    if not metrics:
        return {"outlet_id": outlet_id, "name": info["name"], "status": "no_data"}

    thresholds = _get_thresholds(user_id)

    # Linked invoices for this outlet
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(20))

    # Labor for relevant departments
    dept_map = {"main-dining": ["FOH Service", "Kitchen/BOH"], "banquet-hall": ["FOH Service"],
                "sky-bar": ["Bar"], "pool-cafe": ["FOH Service"], "main-kitchen": ["Kitchen/BOH", "Stewarding"]}
    relevant_depts = dept_map.get(outlet_id, [])
    labor = list(db["labor_schedules"].find({"department": {"$in": relevant_depts}}, {"_id": 0}).sort("date", -1).limit(60))

    labor_summary = {}
    for s in labor:
        dept = s.get("department", "")
        if dept not in labor_summary:
            labor_summary[dept] = {"department": dept, "total_cost": 0, "total_hours": 0, "ot_hours": 0, "days": 0}
        labor_summary[dept]["total_cost"] += s.get("total_cost", 0)
        labor_summary[dept]["total_hours"] += s.get("hours_scheduled", 0)
        labor_summary[dept]["ot_hours"] += s.get("overtime_hours", 0)
        labor_summary[dept]["days"] += 1
    for d in labor_summary.values():
        d["total_cost"] = round(d["total_cost"], 2)
        d["total_hours"] = round(d["total_hours"], 1)
        d["ot_hours"] = round(d["ot_hours"], 1)
        d["ot_pct"] = round(d["ot_hours"] / max(d["total_hours"], 1) * 100, 1)

    return {
        "outlet_id": outlet_id,
        "name": info["name"],
        "type": info["type"],
        "metrics": metrics,
        "labor": list(labor_summary.values()),
        "recent_invoices": invoices[:10],
        "thresholds": thresholds,
        "generated_at": _now(),
    }


# ── Custom Thresholds ──

@router.post("/thresholds")
async def update_thresholds(req: ThresholdUpdate):
    """Update alert thresholds for a user."""
    db["alert_thresholds"].update_one(
        {"user_id": req.user_id},
        {"$set": {"user_id": req.user_id, "thresholds": req.thresholds, "updated_at": _now()}},
        upsert=True,
    )
    return {"status": "updated", "user_id": req.user_id, "thresholds": req.thresholds}


@router.get("/thresholds")
async def get_thresholds(user_id: str = Query("usr-chef-001")):
    """Get current thresholds for a user."""
    return {"user_id": user_id, "thresholds": _get_thresholds(user_id)}


# ── Cross-Outlet Comparison ──

@router.get("/compare")
async def compare_outlets(user_id: str = Query("usr-chef-001")):
    """Side-by-side comparison of all outlets the user oversees."""
    overview = await health_overview(user_id)
    if "error" in overview:
        return overview

    comparison = []
    for o in overview["outlets"]:
        if not o.get("metrics"):
            continue
        m = o["metrics"]
        comparison.append({
            "outlet_id": o["outlet_id"],
            "name": o["name"],
            "type": o["type"],
            "health": o["health_score"],
            "revenue": m.get("revenue", 0),
            "food_cost_pct": m.get("food_cost_pct", 0),
            "bev_cost_pct": m.get("bev_cost_pct", 0),
            "covers": m.get("covers", 0),
            "avg_check": m.get("avg_check", 0),
            "waste_pct": m.get("waste_pct", 0),
        })

    comparison.sort(key=lambda c: c["revenue"], reverse=True)

    return {
        "comparison": comparison,
        "best_performer": comparison[0]["name"] if comparison else None,
        "needs_attention": [c["name"] for c in comparison if c.get("health", 100) < 60],
        "generated_at": _now(),
    }


# ── Morning Briefing ──

@router.post("/morning-briefing")
async def morning_briefing(user_id: str = Query("usr-chef-001")):
    """AI-powered morning briefing — yesterday's performance + today's outlook."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found"}

    overview = await health_overview(user_id)
    alerts_data = []
    for o in overview.get("outlets", []):
        for a in o.get("alerts", []):
            alerts_data.append(f"{o['name']}: {a['metric']} at {a['value']}")

    # Get flash data
    from routes.budget_engine import router as _  # just to verify import
    flash_resp = None
    try:
        pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
        dates = sorted(set(t.get("closed_at", "")[:10] for t in pos_txns if t.get("closed_at")), reverse=True)
        latest = dates[0] if dates else ""
        y_txns = [t for t in pos_txns if t.get("closed_at", "").startswith(latest)]
        y_rev = sum(t.get("subtotal", 0) for t in y_txns)
        y_covers = sum(t.get("guest_count", 0) for t in y_txns)
        y_fc = sum(t.get("food_cost_total", 0) for t in y_txns)
        flash_resp = {"date": latest, "revenue": round(y_rev, 2), "covers": y_covers, "food_cost_pct": round(y_fc / max(y_rev, 1) * 100, 1)}
    except Exception:
        flash_resp = {}

    # Labor alerts
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).sort("date", -1).limit(50))
    ot_alerts = []
    for s in labor[:10]:
        if s.get("overtime_hours", 0) > 2:
            ot_alerts.append(f"{s.get('department')}: {s.get('overtime_hours')}hrs OT on {s.get('date')}")

    # AI narrative
    narrative = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        name = user.get("name", "Chef").split()[0]
        role = user.get("role", "exec_chef")
        resort_score = overview.get("resort_health", 0)

        outlet_text = "\n".join([
            f"- {o['name']}: Health {o.get('health_score', 'N/A')}/100, Rev ${o.get('metrics', {}).get('revenue', 0):,.0f}, FC {o.get('metrics', {}).get('food_cost_pct', 0)}%, Covers {o.get('metrics', {}).get('covers', 0)}"
            for o in overview.get("outlets", []) if o.get("metrics")
        ])

        prompt = f"""You are EchoAi³ generating a morning briefing for {name} ({role}).

RESORT HEALTH: {resort_score}/100
OUTLETS:
{outlet_text}

YESTERDAY: Revenue ${flash_resp.get('revenue', 0):,.0f}, Covers {flash_resp.get('covers', 0)}, Food Cost {flash_resp.get('food_cost_pct', 0)}%

ALERTS: {', '.join(alerts_data[:5]) if alerts_data else 'None'}
OT RISKS: {', '.join(ot_alerts[:3]) if ot_alerts else 'None'}

Write a brief 3-paragraph morning briefing:
1. Yesterday's performance summary (what went well, what needs attention)
2. Today's focus areas (specific actions for each outlet)
3. One quick win they can execute today

Keep it warm, professional, and actionable. Address them as {name}."""

        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"morning-briefing-{_uid()}",
            system_message="You are EchoAi³ generating personalized morning operational briefings for hospitality executives.",
        )
        llm.with_model("openai", "gpt-4.1-mini")
        narrative = await llm.send_message(UserMessage(text=prompt))
    except Exception as e:
        narrative = f"Morning briefing: Resort health {overview.get('resort_health', 0)}/100. Yesterday: Rev ${flash_resp.get('revenue', 0):,.0f}. Focus on outlets with health score below 75."

    return {
        "user": {"name": user.get("name"), "role": user.get("role")},
        "date": flash_resp.get("date", ""),
        "resort_health": overview.get("resort_health", 0),
        "outlet_summary": [
            {"name": o["name"], "health": o.get("health_score"), "status": o.get("status"), "alerts": len(o.get("alerts", []))}
            for o in overview.get("outlets", []) if o.get("health_score") is not None
        ],
        "yesterday": flash_resp,
        "ot_alerts": ot_alerts[:5],
        "narrative": narrative,
        "generated_at": _now(),
    }
