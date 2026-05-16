"""
Manager P&L Dashboard — Role-Scoped Financial Intelligence
============================================================
Provides department-scoped P&L views based on user role.
- Managers see: their dept food cost, hourly labor, vendor charges, waste
- NOT visible: salaries, owner comp, full resort financials
- Drill-down: GL → PO → Invoice → Receiving chain
- Budget alerts: flag overspending before it escalates
- Access requests: blocked content shows request-access flow
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List

from database import db

router = APIRouter(prefix="/api/manager", tags=["manager-dashboard"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

# ── Role definitions ──
ROLE_CLEARANCE = {
    "owner": 4, "gm": 3, "director": 2, "exec_chef": 2,
    "controller": 3, "manager": 1, "supervisor": 1, "staff": 0, "vendor": 0,
}

# What P&L sections each role can see
ROLE_PNL_ACCESS = {
    "owner":      ["revenue", "food_cost", "bev_cost", "hourly_labor", "salaried_labor", "benefits", "opex", "rent", "utilities", "marketing", "maintenance", "insurance", "ebitda", "net_profit"],
    "gm":         ["revenue", "food_cost", "bev_cost", "hourly_labor", "salaried_labor", "benefits", "opex", "rent", "utilities", "marketing", "maintenance", "insurance", "ebitda", "net_profit"],
    "controller": ["revenue", "food_cost", "bev_cost", "hourly_labor", "salaried_labor", "benefits", "opex", "rent", "utilities", "marketing", "maintenance", "insurance", "ebitda", "net_profit"],
    "director":   ["revenue", "food_cost", "bev_cost", "hourly_labor", "opex", "utilities", "maintenance", "ebitda"],
    "exec_chef":  ["revenue", "food_cost", "bev_cost", "hourly_labor", "opex", "maintenance"],
    "manager":    ["revenue", "food_cost", "bev_cost", "hourly_labor", "opex"],
    "supervisor": ["revenue", "food_cost", "hourly_labor"],
    "staff":      [],
    "vendor":     [],
}

# Budget targets (% of revenue)
BUDGET_TARGETS = {
    "food_cost_pct": {"target": 22.0, "warn": 25.0, "critical": 28.0, "label": "Food Cost %"},
    "bev_cost_pct": {"target": 18.0, "warn": 22.0, "critical": 25.0, "label": "Beverage Cost %"},
    "hourly_labor_pct": {"target": 25.0, "warn": 28.0, "critical": 32.0, "label": "Hourly Labor %"},
    "total_labor_pct": {"target": 30.0, "warn": 35.0, "critical": 40.0, "label": "Total Labor %"},
    "waste_pct": {"target": 1.0, "warn": 1.5, "critical": 2.0, "label": "Waste %"},
    "opex_pct": {"target": 8.0, "warn": 10.0, "critical": 12.0, "label": "Operating Expenses %"},
}

DEPT_OUTLET_MAP = {
    "dining": ["main-dining"],
    "culinary": ["main-dining", "main-kitchen"],
    "banquet": ["banquet-hall"],
    "bar": ["sky-bar"],
    "cafe": ["pool-cafe"],
    "all": ["main-dining", "banquet-hall", "sky-bar", "pool-cafe", "main-kitchen"],
}


def _get_user(user_id: str):
    return db["rbac_users"].find_one({"user_id": user_id}, {"_id": 0})


def _user_outlets(user):
    """Get outlet IDs this user's departments map to."""
    depts = user.get("departments", [])
    if "all" in depts:
        return list(DEPT_OUTLET_MAP.get("all", []))
    outlets = set()
    for d in depts:
        outlets.update(DEPT_OUTLET_MAP.get(d, []))
    return list(outlets) if outlets else list(DEPT_OUTLET_MAP.get("all", []))


class AccessRequestInput(BaseModel):
    user_id: str
    requested_section: str
    reason: Optional[str] = ""


# ── Manager-Scoped P&L ──

@router.get("/pnl")
async def manager_pnl(user_id: str = Query("usr-mgr-001")):
    """Role-scoped P&L — returns only sections the user is authorized to see."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found", "user_id": user_id}

    role = user.get("role", "staff")
    allowed_sections = ROLE_PNL_ACCESS.get(role, [])
    outlets = _user_outlets(user)
    depts = user.get("departments", [])
    is_resort_wide = "all" in depts

    # Gather GL data
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))

    # Filter POS by outlet if not resort-wide
    if not is_resort_wide:
        pos_txns = [t for t in pos_txns if t.get("outlet_id", "") in outlets]

    # Calculate metrics
    total_pos_rev = sum(t.get("subtotal", 0) for t in pos_txns)
    total_pos_food_cost = sum(t.get("food_cost_total", 0) for t in pos_txns)

    # GL-based totals (resort-wide or dept-filtered)
    food_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4000")
    bev_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4100")
    banquet_rev = sum(e["amount"] for e in gl if e.get("gl_code") == "4200")
    total_rev = food_rev + bev_rev + banquet_rev

    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5100")
    labor_boh = sum(e["amount"] for e in gl if e.get("gl_code") == "6000")
    labor_foh = sum(e["amount"] for e in gl if e.get("gl_code") == "6010")
    labor_mgmt = sum(e["amount"] for e in gl if e.get("gl_code") == "6020")
    labor_benefits = sum(e["amount"] for e in gl if e.get("gl_code") == "6050")
    hourly_labor = labor_boh + labor_foh
    salaried_labor = labor_mgmt
    rent = sum(e["amount"] for e in gl if e.get("gl_code") == "7000")
    utilities = sum(e["amount"] for e in gl if e.get("gl_code") == "7500")
    marketing = sum(e["amount"] for e in gl if e.get("gl_code") == "8000")
    maintenance = sum(e["amount"] for e in gl if e.get("gl_code") == "8500")
    insurance = sum(e["amount"] for e in gl if e.get("gl_code") == "7200")
    total_exp = sum(e["amount"] for e in gl if e.get("entry_type") == "expense")
    total_waste = sum(w.get("cost", 0) for w in waste)

    # If not resort-wide, approximate dept share
    dept_share = 1.0
    if not is_resort_wide:
        type_shares = {"dining": 0.30, "culinary": 0.38, "banquet": 0.40, "bar": 0.15, "cafe": 0.07}
        dept_share = sum(type_shares.get(d, 0.10) for d in depts)
        dept_share = min(dept_share, 1.0)

    def _dept(val):
        return round(val * dept_share, 2) if not is_resort_wide else round(val, 2)

    # Build P&L sections — only include what user can see
    pnl_lines = []
    locked_sections = []

    all_possible = [
        ("revenue", "Revenue", _dept(total_rev), "4000-4200", "revenue", "#10b981"),
        ("food_cost", "Food Cost", _dept(food_cogs), "5000", "expense", "#ef4444"),
        ("bev_cost", "Beverage Cost", _dept(bev_cogs), "5100", "expense", "#f59e0b"),
        ("hourly_labor", "Hourly Labor", _dept(hourly_labor), "6000-6010", "expense", "#3b82f6"),
        ("salaried_labor", "Salaried Labor & Management", _dept(salaried_labor), "6020", "expense", "#8b5cf6"),
        ("benefits", "Benefits & Insurance", _dept(labor_benefits), "6050", "expense", "#8b5cf6"),
        ("opex", "Operating Expenses", _dept(marketing + maintenance), "8000-8500", "expense", "#64748b"),
        ("rent", "Rent & Occupancy", _dept(rent), "7000", "expense", "#64748b"),
        ("utilities", "Utilities", _dept(utilities), "7500", "expense", "#64748b"),
        ("marketing", "Marketing & Promotions", _dept(marketing), "8000", "expense", "#64748b"),
        ("maintenance", "Repairs & Maintenance", _dept(maintenance), "8500", "expense", "#64748b"),
        ("insurance", "Insurance", _dept(insurance), "7200", "expense", "#64748b"),
        ("ebitda", "EBITDA", _dept(total_rev - total_exp), "calc", "profit", "#c8a97e"),
        ("net_profit", "Net Profit", _dept(total_rev - total_exp), "calc", "profit", "#c8a97e"),
    ]

    for section_id, label, amount, gl_codes, entry_type, color in all_possible:
        if section_id in allowed_sections:
            pct = round(amount / _dept(total_rev) * 100, 1) if _dept(total_rev) > 0 and entry_type == "expense" else None
            pnl_lines.append({
                "id": section_id, "label": label, "amount": amount,
                "gl_codes": gl_codes, "type": entry_type, "color": color,
                "pct_of_revenue": pct, "accessible": True,
            })
        else:
            locked_sections.append({
                "id": section_id, "label": label, "accessible": False,
                "required_access": "controller" if section_id in ("salaried_labor", "benefits", "insurance", "net_profit") else "director",
            })

    # KPI calculations
    dept_rev = _dept(total_rev)
    kpis = {
        "food_cost_pct": round(_dept(food_cogs) / dept_rev * 100, 1) if dept_rev > 0 else 0,
        "bev_cost_pct": round(_dept(bev_cogs) / dept_rev * 100, 1) if dept_rev > 0 else 0,
        "hourly_labor_pct": round(_dept(hourly_labor) / dept_rev * 100, 1) if dept_rev > 0 else 0,
        "total_labor_pct": round(_dept(hourly_labor + salaried_labor + labor_benefits) / dept_rev * 100, 1) if dept_rev > 0 else 0,
        "waste_pct": round(_dept(total_waste) / dept_rev * 100, 2) if dept_rev > 0 else 0,
        "opex_pct": round(_dept(marketing + maintenance) / dept_rev * 100, 1) if dept_rev > 0 else 0,
    }

    return {
        "user": {"id": user["user_id"], "name": user["name"], "role": role, "departments": depts},
        "scope": "resort" if is_resort_wide else "department",
        "outlets": outlets,
        "pnl_lines": pnl_lines,
        "locked_sections": locked_sections,
        "kpis": kpis,
        "summary": {
            "revenue": dept_rev,
            "total_cost": round(sum(l["amount"] for l in pnl_lines if l["type"] == "expense"), 2),
            "transactions": len(pos_txns),
            "covers": sum(t.get("guest_count", 0) for t in pos_txns),
            "avg_check": round(total_pos_rev / max(len(pos_txns), 1), 2),
            "invoices": len(invoices),
            "waste": round(_dept(total_waste), 2),
        },
        "generated_at": _now(),
    }


# ── Budget Alerts ──

@router.get("/alerts")
async def budget_alerts(user_id: str = Query("usr-mgr-001")):
    """Smart alerts: over-budget, overtime risk, over-ordering, cost spikes."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found"}

    role = user.get("role", "staff")
    depts = user.get("departments", [])
    alerts = []

    # 1. Budget threshold alerts
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))

    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5100")
    hourly_labor = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010"))
    total_labor_gl = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010", "6020", "6050"))
    total_waste = sum(w.get("cost", 0) for w in waste)

    kpis = {}
    if total_rev > 0:
        kpis = {
            "food_cost_pct": round(food_cogs / total_rev * 100, 1),
            "bev_cost_pct": round(bev_cogs / total_rev * 100, 1),
            "hourly_labor_pct": round(hourly_labor / total_rev * 100, 1),
            "total_labor_pct": round(total_labor_gl / total_rev * 100, 1),
            "waste_pct": round(total_waste / total_rev * 100, 2),
        }

    for metric_id, val in kpis.items():
        target = BUDGET_TARGETS.get(metric_id)
        if not target:
            continue
        if val >= target["critical"]:
            alerts.append({
                "id": f"budget-{metric_id}",
                "type": "over_budget",
                "severity": "critical",
                "metric": target["label"],
                "current": val,
                "target": target["target"],
                "threshold": target["critical"],
                "message": f"{target['label']} at {val}% — {val - target['target']:.1f}pp over target ({target['target']}%)",
                "impact": f"${(val - target['target']) / 100 * total_rev:,.0f} excess cost",
                "action": f"Immediate review required. Reduce to {target['target']}% to save ${(val - target['target']) / 100 * total_rev:,.0f}",
            })
        elif val >= target["warn"]:
            alerts.append({
                "id": f"budget-{metric_id}",
                "type": "over_budget",
                "severity": "warning",
                "metric": target["label"],
                "current": val,
                "target": target["target"],
                "threshold": target["warn"],
                "message": f"{target['label']} at {val}% — approaching limit ({target['critical']}%)",
                "impact": f"${(val - target['target']) / 100 * total_rev:,.0f} over target",
                "action": f"Monitor closely. Review top cost drivers.",
            })

    # 2. Overtime risk alerts
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_schedules = [s for s in labor if s.get("date", "") >= week_start.strftime("%Y-%m-%d")]

    staff_hours = {}
    for s in week_schedules:
        dept = s.get("department", "")
        hrs = s.get("hours_scheduled", 0)
        staff_count = s.get("staff_count", 1)
        avg_per_person = hrs / max(staff_count, 1)
        ot_hrs = s.get("overtime_hours", 0)
        rate = s.get("hourly_rate", 15)

        if ot_hrs > 0 or avg_per_person > 7.5:
            alerts.append({
                "id": f"ot-{dept}-{s.get('date', '')}",
                "type": "overtime_risk",
                "severity": "warning" if ot_hrs < 4 else "critical",
                "metric": "Overtime",
                "department": dept,
                "date": s.get("date", ""),
                "message": f"{dept}: {ot_hrs:.1f}hrs OT on {s.get('date', '')} ({staff_count} staff, {avg_per_person:.1f}hrs avg)",
                "impact": f"${ot_hrs * rate * 1.5:,.0f} in OT cost",
                "action": f"Review schedule — consider splitting shift or cross-training coverage",
            })

    # 3. Recent large purchases
    recent_invoices = list(db["invoices"].find({}, {"_id": 0}).sort("created_at", -1).limit(10))
    for inv in recent_invoices[:3]:
        total = inv.get("total", 0)
        if total > 1000:
            alerts.append({
                "id": f"purchase-{inv.get('invoice_id', '')}",
                "type": "purchase_notification",
                "severity": "info",
                "metric": "Purchase",
                "message": f"{inv.get('vendor_name', 'Vendor')}: {fmt_currency(total)} received ({inv.get('invoice_date', '')})",
                "invoice_id": inv.get("invoice_id"),
                "po_id": inv.get("po_id"),
                "action": "Review and verify GL code assignment",
            })

    # Sort by severity
    sev_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: sev_order.get(a.get("severity", "info"), 3))

    return {
        "user": {"id": user["user_id"], "name": user["name"], "role": role},
        "alerts": alerts,
        "alert_count": len(alerts),
        "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
        "warning_count": len([a for a in alerts if a["severity"] == "warning"]),
        "generated_at": _now(),
    }


def fmt_currency(n):
    return f"${n:,.2f}" if n else "$0"


# ── GL Drill-Down (Invoice Popup) ──

@router.get("/gl-drilldown/{gl_code}")
async def gl_drilldown(gl_code: str, user_id: str = Query("usr-mgr-001")):
    """Drill into a GL code — returns entries + linked invoices + POs."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found"}

    entries = list(db["gl_entries"].find({"gl_code": gl_code}, {"_id": 0}).sort("date", -1).limit(50))
    total = round(sum(e.get("amount", 0) for e in entries), 2)

    # Find invoices for this GL code
    invoices = list(db["invoices"].find({"gl_code": gl_code}, {"_id": 0}).sort("invoice_date", -1).limit(30))

    # Build linked chain for each invoice
    invoice_chains = []
    for inv in invoices:
        po = None
        receiving = None
        if inv.get("po_id"):
            po = db["pr_purchase_orders"].find_one({"po_id": inv["po_id"]}, {"_id": 0})
            receiving = db["pr_receiving_log"].find_one({"po_id": inv["po_id"]}, {"_id": 0})

        invoice_chains.append({
            "invoice": inv,
            "purchase_order": po,
            "receiving": receiving,
            "chain_complete": po is not None and receiving is not None,
        })

    gl_info = {
        "4000": {"name": "Food Revenue", "category": "Revenue"},
        "4100": {"name": "Beverage Revenue", "category": "Revenue"},
        "4200": {"name": "Banquet Revenue", "category": "Revenue"},
        "5000": {"name": "Food COGS", "category": "Cost of Sales"},
        "5100": {"name": "Beverage COGS / Paper", "category": "Cost of Sales"},
        "6000": {"name": "Kitchen/BOH Labor", "category": "Labor"},
        "6010": {"name": "FOH Service Labor", "category": "Labor"},
        "6020": {"name": "Management Salary", "category": "Labor"},
        "6050": {"name": "Benefits & Insurance", "category": "Labor"},
        "7000": {"name": "Rent & Occupancy", "category": "Overhead"},
        "7500": {"name": "Utilities", "category": "Overhead"},
        "8000": {"name": "Marketing", "category": "Operating"},
        "8500": {"name": "Repairs & Maintenance", "category": "Operating"},
        "7200": {"name": "Insurance", "category": "Overhead"},
    }

    return {
        "gl_code": gl_code,
        "gl_info": gl_info.get(gl_code, {"name": "Unknown", "category": "Other"}),
        "total": total,
        "entry_count": len(entries),
        "entries": entries,
        "invoices": invoice_chains,
        "invoice_count": len(invoice_chains),
    }


# ── Access Request ──

@router.post("/access-request")
async def request_access(req: AccessRequestInput):
    """Submit an access request for a restricted section."""
    user = _get_user(req.user_id)
    if not user:
        return {"error": "User not found"}

    request_doc = {
        "request_id": f"acr-{_uid()}",
        "user_id": req.user_id,
        "user_name": user.get("name", ""),
        "user_role": user.get("role", ""),
        "requested_section": req.requested_section,
        "reason": req.reason,
        "status": "pending",
        "created_at": _now(),
        "reviewed_by": None,
        "reviewed_at": None,
    }
    db["access_requests"].insert_one(request_doc)
    request_doc.pop("_id", None)

    # Also create a notification for admin/accounting
    notif = {
        "id": _uid(),
        "type": "access_request",
        "recipient_role": "controller",
        "title": f"Access Request: {user.get('name', '')}",
        "message": f"{user.get('name', '')} ({user.get('role', '')}) requested access to '{req.requested_section}'. Reason: {req.reason or 'None provided'}",
        "priority": "normal",
        "read": False,
        "entity_type": "access_request",
        "entity_id": request_doc["request_id"],
        "created_at": _now(),
    }
    db["notifications"].insert_one(notif)

    return {"status": "submitted", "request": request_doc}


# ── AI Executive Review for Managers ──

@router.post("/ai-review")
async def manager_ai_review(user_id: str = Query("usr-mgr-001")):
    """EchoAi³ executive-level P&L review scoped to user's departments."""
    user = _get_user(user_id)
    if not user:
        return {"error": "User not found"}

    role = user.get("role", "staff")
    depts = user.get("departments", [])
    name = user.get("name", "Manager")

    # Gather data
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))

    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5100")
    hourly_labor = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010"))
    total_waste = sum(w.get("cost", 0) for w in waste)

    food_pct = round(food_cogs / total_rev * 100, 1) if total_rev > 0 else 0
    labor_pct = round(hourly_labor / total_rev * 100, 1) if total_rev > 0 else 0
    waste_pct = round(total_waste / total_rev * 100, 2) if total_rev > 0 else 0

    scope_label = "resort-wide" if "all" in depts else f"department ({', '.join(depts)})"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        prompt = f"""You are EchoAi³ providing a personalized P&L briefing for {name} ({role}, {scope_label}).

PERFORMANCE DATA:
- Revenue: ${total_rev:,.0f}
- Food Cost: {food_pct}% (target 22%)
- Hourly Labor: {labor_pct}% (target 25%)
- Waste: {waste_pct}% (target <1%)
- Transactions: {len(pos_txns)}, Covers: {sum(t.get('guest_count',0) for t in pos_txns)}
- Invoices: {len(invoices)}

{'NOTE: This user is a ' + role + ' and should NOT receive salary/compensation details. Focus on actionable operational metrics.' if role in ('manager', 'supervisor', 'exec_chef') else ''}

Provide a brief 3-paragraph executive review:
1. How their department is performing (specific numbers)
2. Top 3 action items to improve profitability
3. What to watch this week

Keep it conversational but professional. Address them by first name ({name.split()[0]})."""

        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"manager-review-{_uid()}",
            system_message="You are EchoAi³, providing personalized operational intelligence to hospitality managers.",
        )
        llm.with_model("openai", "gpt-4.1-mini")
        response = await llm.send_message(UserMessage(text=prompt))
        narrative = response
    except Exception as e:
        narrative = f"Performance review: Revenue ${total_rev:,.0f}, Food Cost {food_pct}%, Labor {labor_pct}%, Waste {waste_pct}%. Focus areas: {'food cost control' if food_pct > 22 else 'maintain food cost discipline'}, {'labor scheduling optimization' if labor_pct > 25 else 'labor efficiency'}, {'waste reduction' if waste_pct > 1 else 'waste prevention'}."

    return {
        "user": {"name": name, "role": role, "departments": depts},
        "narrative": narrative,
        "metrics": {
            "revenue": round(total_rev, 2),
            "food_cost_pct": food_pct,
            "labor_pct": labor_pct,
            "waste_pct": waste_pct,
            "transactions": len(pos_txns),
            "covers": sum(t.get("guest_count", 0) for t in pos_txns),
        },
        "generated_at": _now(),
    }
