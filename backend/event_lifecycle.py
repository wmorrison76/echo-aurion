"""
LUCCCA Event Lifecycle Engine
==============================
Complete prospect-to-payment lifecycle for hospitality events.

25-Stage Pipeline:
  Phase 1: Sales & Planning (Prospect -> Deposit)
  Phase 2: Event Design (Menu -> Layout -> Labor)
  Phase 3: Pre-Event (Order -> Receive -> Production)
  Phase 4: Event Execution (Setup -> Service -> Breakdown)
  Phase 5: Post-Event (Review -> Invoice -> Payment -> P&L)

Integration Points:
  EchoEvents (CRM) -> BEO/REO -> Menu -> EchoLayout ->
  Maestro (Production) -> Culinary (Recipes) -> Operations (Costing) ->
  EchoAurum (P&L) -> Payment
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
from database import (
    events_col, event_audit_col, gl_entries_col, audit_log_col,
    ingredients_col, recipes_col,
)
import operations_core

# All 25 lifecycle stages in order
LIFECYCLE_STAGES = [
    # Phase 1: Sales & Planning
    "prospect", "qualified", "proposal_sent", "negotiation",
    "contract_sent", "contract_signed", "deposit_received",
    # Phase 2: Event Design
    "menu_selected", "beo_created", "beo_approved",
    "layout_designed", "labor_scheduled",
    # Phase 3: Pre-Event
    "inventory_ordered", "inventory_received",
    "production_scheduled", "prep_started",
    # Phase 4: Event Execution
    "setup_started", "event_in_progress", "event_completed",
    # Phase 5: Post-Event & Financial
    "final_count", "post_event_review",
    "final_invoice_sent", "payment_received", "closed",
    # Special
    "cancelled",
]

PHASE_MAP = {
    "prospect": 1, "qualified": 1, "proposal_sent": 1, "negotiation": 1,
    "contract_sent": 1, "contract_signed": 1, "deposit_received": 1,
    "menu_selected": 2, "beo_created": 2, "beo_approved": 2,
    "layout_designed": 2, "labor_scheduled": 2,
    "inventory_ordered": 3, "inventory_received": 3,
    "production_scheduled": 3, "prep_started": 3,
    "setup_started": 4, "event_in_progress": 4, "event_completed": 4,
    "final_count": 5, "post_event_review": 5,
    "final_invoice_sent": 5, "payment_received": 5, "closed": 5,
    "cancelled": 0,
}

EVENT_TYPES = [
    "wedding", "corporate", "social", "banquet", "conference",
    "gala", "holiday_party", "birthday", "fundraiser", "other",
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


def _event_audit(event_id: str, action: str, data: dict):
    event_audit_col.insert_one({
        "id": _uid(), "event_id": event_id,
        "action": action, "data": data, "timestamp": _now(),
    })


# ---------------------------------------------------------------------------
# EVENT CRUD
# ---------------------------------------------------------------------------
def create_event(data: dict) -> dict:
    eid = _uid()
    doc = {
        "id": eid,
        "org_id": data.get("org_id", "default"),
        "name": data["name"],
        "event_type": data.get("event_type", "other"),
        "stage": "prospect",
        "phase": 1,

        # Client info
        "client_name": data.get("client_name", ""),
        "client_email": data.get("client_email", ""),
        "client_phone": data.get("client_phone", ""),
        "client_company": data.get("client_company", ""),

        # Event details
        "event_date": data.get("event_date", ""),
        "start_time": data.get("start_time", ""),
        "end_time": data.get("end_time", ""),
        "guest_count": data.get("guest_count", 0),
        "guaranteed_count": data.get("guaranteed_count", 0),
        "venue": data.get("venue", ""),
        "room": data.get("room", ""),

        # Financial
        "revenue": {"food": 0, "beverage": 0, "rental": 0, "av": 0, "other": 0, "service_charge": 0, "total": 0},
        "costs": {"food": 0, "beverage": 0, "labor": 0, "rental": 0, "overhead": 0, "total": 0},
        "deposits": [],
        "payments": [],

        # Menu
        "menu_items": data.get("menu_items", []),
        "beo_notes": data.get("beo_notes", ""),
        "dietary_requirements": data.get("dietary_requirements", []),

        # Layout
        "layout_id": None,
        "setup_style": data.get("setup_style", ""),
        "table_count": data.get("table_count", 0),

        # Labor
        "labor_plan_id": None,
        "staff_count": 0,
        "labor_hours": 0,

        # Tracking
        "stage_history": [{"stage": "prospect", "entered_at": _now(), "by": data.get("created_by", "system")}],
        "notes": data.get("notes", []),
        "tags": data.get("tags", []),
        "assigned_to": data.get("assigned_to", ""),

        "created_at": _now(),
        "updated_at": _now(),
    }
    events_col.insert_one(doc)
    del doc["_id"]
    _event_audit(eid, "created", {"name": doc["name"], "type": doc["event_type"]})
    return doc


def get_event(event_id: str) -> Optional[dict]:
    return events_col.find_one({"id": event_id}, {"_id": 0})


def list_events(stage: Optional[str] = None, phase: Optional[int] = None,
                event_type: Optional[str] = None, limit: int = 50) -> list:
    query = {}
    if stage:
        query["stage"] = stage
    if phase:
        query["phase"] = phase
    if event_type:
        query["event_type"] = event_type
    return list(events_col.find(query, {"_id": 0}).sort("updated_at", -1).limit(limit))


# ---------------------------------------------------------------------------
# STAGE TRANSITIONS
# ---------------------------------------------------------------------------
def advance_stage(event_id: str, target_stage: str, by: str = "system",
                  notes: str = "", data: dict = None) -> dict:
    event = events_col.find_one({"id": event_id})
    if not event:
        raise ValueError(f"Event {event_id} not found")

    current = event["stage"]
    if target_stage not in LIFECYCLE_STAGES:
        raise ValueError(f"Invalid stage: {target_stage}")

    # Validate transition (allow skipping forward or cancelling)
    cur_idx = LIFECYCLE_STAGES.index(current) if current in LIFECYCLE_STAGES else -1
    tgt_idx = LIFECYCLE_STAGES.index(target_stage)
    if target_stage != "cancelled" and tgt_idx <= cur_idx:
        raise ValueError(f"Cannot move backward from {current} to {target_stage}")

    # Execute stage-specific hooks
    hook_result = _execute_stage_hooks(event, target_stage, data or {})

    # Update event
    update = {
        "stage": target_stage,
        "phase": PHASE_MAP.get(target_stage, 0),
        "updated_at": _now(),
    }
    if hook_result:
        update.update(hook_result)

    events_col.update_one({"id": event_id}, {
        "$set": update,
        "$push": {"stage_history": {"stage": target_stage, "entered_at": _now(), "by": by, "notes": notes}},
    })

    _event_audit(event_id, "stage_advanced", {
        "from": current, "to": target_stage, "by": by,
    })

    return events_col.find_one({"id": event_id}, {"_id": 0})


def _execute_stage_hooks(event: dict, target_stage: str, data: dict) -> dict:
    """Execute automation hooks when entering specific stages"""
    updates = {}

    if target_stage == "deposit_received":
        amount = data.get("amount", 0)
        if amount > 0:
            updates["$push_deposits"] = {
                "id": _uid(), "amount": amount,
                "method": data.get("method", "check"),
                "received_at": _now(),
            }
            # Post GL entry for deposit
            _post_gl_entry(event["id"], "1200", "Deposits Received",
                           debit=amount, credit=0, memo=f"Event deposit: {event['name']}")
            _post_gl_entry(event["id"], "2100", "Unearned Revenue",
                           debit=0, credit=amount, memo=f"Event deposit liability: {event['name']}")

    elif target_stage == "menu_selected":
        menu_items = data.get("menu_items", [])
        if menu_items:
            # Calculate food costs from recipes
            food_cost = 0
            for mi in menu_items:
                if mi.get("recipe_id"):
                    try:
                        cost = operations_core.calculate_recipe_cost(mi["recipe_id"])
                        food_cost += cost["cost_per_portion"] * event.get("guest_count", 0) * mi.get("quantity", 1)
                    except Exception:
                        pass
            updates["menu_items"] = menu_items
            updates["costs.food"] = round(food_cost, 2)

    elif target_stage == "beo_created":
        updates["beo_notes"] = data.get("beo_notes", event.get("beo_notes", ""))

    elif target_stage == "production_scheduled":
        # Auto-create production schedules for event recipes
        for mi in event.get("menu_items", []):
            if mi.get("recipe_id"):
                try:
                    portions = event.get("guest_count", 0) * mi.get("quantity", 1)
                    operations_core.schedule_production(
                        mi["recipe_id"], portions,
                        scheduled_for=event.get("event_date", ""),
                        event_id=event["id"]
                    )
                except Exception:
                    pass

    elif target_stage == "event_completed":
        actual_guests = data.get("actual_guest_count", event.get("guest_count", 0))
        updates["actual_guest_count"] = actual_guests

    elif target_stage == "final_invoice_sent":
        # Calculate final P&L
        pnl = _calculate_event_pnl(event)
        updates["pnl"] = pnl
        # Post revenue GL entries
        revenue = pnl.get("total_revenue", 0)
        cogs = pnl.get("total_cogs", 0)
        if revenue > 0:
            _post_gl_entry(event["id"], "4000", "Event Revenue",
                           debit=0, credit=revenue, memo=f"Revenue: {event['name']}")
            _post_gl_entry(event["id"], "1100", "Accounts Receivable",
                           debit=revenue, credit=0, memo=f"AR: {event['name']}")
        if cogs > 0:
            _post_gl_entry(event["id"], "5000", "Cost of Goods Sold",
                           debit=cogs, credit=0, memo=f"COGS: {event['name']}")

    elif target_stage == "payment_received":
        amount = data.get("amount", 0)
        if amount > 0:
            _post_gl_entry(event["id"], "1000", "Cash",
                           debit=amount, credit=0, memo=f"Payment: {event['name']}")
            _post_gl_entry(event["id"], "1100", "Accounts Receivable",
                           debit=0, credit=amount, memo=f"AR payment: {event['name']}")

    # Handle $push_deposits separately
    deposit = updates.pop("$push_deposits", None)
    if deposit:
        events_col.update_one({"id": event["id"]}, {"$push": {"deposits": deposit}})

    return updates


# ---------------------------------------------------------------------------
# P&L CALCULATION
# ---------------------------------------------------------------------------
def _calculate_event_pnl(event: dict) -> dict:
    food_rev = event.get("revenue", {}).get("food", 0)
    bev_rev = event.get("revenue", {}).get("beverage", 0)
    rental_rev = event.get("revenue", {}).get("rental", 0)
    av_rev = event.get("revenue", {}).get("av", 0)
    svc_charge = event.get("revenue", {}).get("service_charge", 0)
    other_rev = event.get("revenue", {}).get("other", 0)
    total_revenue = food_rev + bev_rev + rental_rev + av_rev + svc_charge + other_rev

    food_cost = event.get("costs", {}).get("food", 0)
    bev_cost = event.get("costs", {}).get("beverage", 0)
    labor_cost = event.get("costs", {}).get("labor", 0)
    rental_cost = event.get("costs", {}).get("rental", 0)
    overhead = event.get("costs", {}).get("overhead", 0)
    total_costs = food_cost + bev_cost + labor_cost + rental_cost + overhead

    gross_profit = total_revenue - (food_cost + bev_cost)
    net_profit = total_revenue - total_costs

    return {
        "total_revenue": round(total_revenue, 2),
        "revenue_breakdown": {
            "food": food_rev, "beverage": bev_rev,
            "rental": rental_rev, "av": av_rev,
            "service_charge": svc_charge, "other": other_rev,
        },
        "total_cogs": round(food_cost + bev_cost, 2),
        "cogs_breakdown": {"food": food_cost, "beverage": bev_cost},
        "gross_profit": round(gross_profit, 2),
        "gross_margin_pct": round(gross_profit / max(total_revenue, 0.01) * 100, 2),
        "labor_cost": round(labor_cost, 2),
        "labor_pct": round(labor_cost / max(total_revenue, 0.01) * 100, 2),
        "overhead": round(overhead, 2),
        "total_costs": round(total_costs, 2),
        "net_profit": round(net_profit, 2),
        "net_margin_pct": round(net_profit / max(total_revenue, 0.01) * 100, 2),
        "per_guest": {
            "revenue": round(total_revenue / max(event.get("guest_count", 1), 1), 2),
            "food_cost": round(food_cost / max(event.get("guest_count", 1), 1), 2),
            "net_profit": round(net_profit / max(event.get("guest_count", 1), 1), 2),
        },
        "calculated_at": _now(),
    }


def get_event_pnl(event_id: str) -> dict:
    event = events_col.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise ValueError(f"Event {event_id} not found")
    return _calculate_event_pnl(event)


# ---------------------------------------------------------------------------
# GL JOURNAL ENTRIES (EchoAurum Integration)
# ---------------------------------------------------------------------------
def _post_gl_entry(event_id: str, account_code: str, account_name: str,
                   debit: float = 0, credit: float = 0, memo: str = ""):
    gl_entries_col.insert_one({
        "id": _uid(),
        "event_id": event_id,
        "account_code": account_code,
        "account_name": account_name,
        "debit": round(debit, 2),
        "credit": round(credit, 2),
        "memo": memo,
        "posted_at": _now(),
    })


def get_gl_entries(event_id: Optional[str] = None, account_code: Optional[str] = None,
                   limit: int = 100) -> list:
    query = {}
    if event_id:
        query["event_id"] = event_id
    if account_code:
        query["account_code"] = account_code
    return list(gl_entries_col.find(query, {"_id": 0}).sort("posted_at", -1).limit(limit))


# ---------------------------------------------------------------------------
# UPDATE EVENT FINANCIALS
# ---------------------------------------------------------------------------
def update_event_revenue(event_id: str, revenue: dict) -> dict:
    event = events_col.find_one({"id": event_id})
    if not event:
        raise ValueError(f"Event {event_id} not found")

    rev = event.get("revenue", {})
    for key in ["food", "beverage", "rental", "av", "service_charge", "other"]:
        if key in revenue:
            rev[key] = revenue[key]
    rev["total"] = sum(rev.get(k, 0) for k in ["food", "beverage", "rental", "av", "service_charge", "other"])

    events_col.update_one({"id": event_id}, {"$set": {"revenue": rev, "updated_at": _now()}})
    _event_audit(event_id, "revenue_updated", rev)
    return events_col.find_one({"id": event_id}, {"_id": 0})


def update_event_costs(event_id: str, costs: dict) -> dict:
    event = events_col.find_one({"id": event_id})
    if not event:
        raise ValueError(f"Event {event_id} not found")

    c = event.get("costs", {})
    for key in ["food", "beverage", "labor", "rental", "overhead"]:
        if key in costs:
            c[key] = costs[key]
    c["total"] = sum(c.get(k, 0) for k in ["food", "beverage", "labor", "rental", "overhead"])

    events_col.update_one({"id": event_id}, {"$set": {"costs": c, "updated_at": _now()}})
    _event_audit(event_id, "costs_updated", c)
    return events_col.find_one({"id": event_id}, {"_id": 0})


# ---------------------------------------------------------------------------
# PIPELINE VIEW (Kanban-style)
# ---------------------------------------------------------------------------
def get_pipeline() -> dict:
    pipeline = {}
    for stage in LIFECYCLE_STAGES:
        if stage == "cancelled":
            continue
        count = events_col.count_documents({"stage": stage})
        pipeline[stage] = {
            "stage": stage,
            "phase": PHASE_MAP.get(stage, 0),
            "count": count,
        }

    # Value by phase
    phase_totals = {}
    for p in range(1, 6):
        evts = list(events_col.find({"phase": p}, {"_id": 0, "revenue": 1}))
        total = sum(e.get("revenue", {}).get("total", 0) for e in evts)
        phase_totals[p] = {"phase": p, "events": len(evts), "total_revenue": round(total, 2)}

    return {
        "stages": pipeline,
        "phase_totals": phase_totals,
        "total_events": events_col.count_documents({"stage": {"$ne": "cancelled"}}),
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# AGGREGATE P&L (EchoAurum)
# ---------------------------------------------------------------------------
def get_aggregate_pnl(date_from: Optional[str] = None, date_to: Optional[str] = None) -> dict:
    query = {"stage": {"$in": ["closed", "payment_received", "final_invoice_sent"]}}
    if date_from:
        query["event_date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("event_date", {})["$lte"] = date_to

    events = list(events_col.find(query, {"_id": 0}))

    totals = {"revenue": 0, "food_cost": 0, "bev_cost": 0, "labor": 0, "overhead": 0}
    event_pnls = []
    for e in events:
        pnl = _calculate_event_pnl(e)
        totals["revenue"] += pnl["total_revenue"]
        totals["food_cost"] += pnl["cogs_breakdown"]["food"]
        totals["bev_cost"] += pnl["cogs_breakdown"]["beverage"]
        totals["labor"] += pnl["labor_cost"]
        totals["overhead"] += pnl["overhead"]
        event_pnls.append({
            "event_id": e["id"], "event_name": e["name"],
            "date": e.get("event_date", ""), "pnl": pnl,
        })

    total_costs = totals["food_cost"] + totals["bev_cost"] + totals["labor"] + totals["overhead"]
    net = totals["revenue"] - total_costs

    return {
        "period": {"from": date_from, "to": date_to},
        "events_count": len(events),
        "total_revenue": round(totals["revenue"], 2),
        "total_cogs": round(totals["food_cost"] + totals["bev_cost"], 2),
        "total_labor": round(totals["labor"], 2),
        "total_overhead": round(totals["overhead"], 2),
        "total_costs": round(total_costs, 2),
        "net_profit": round(net, 2),
        "net_margin_pct": round(net / max(totals["revenue"], 0.01) * 100, 2),
        "food_cost_pct": round(totals["food_cost"] / max(totals["revenue"], 0.01) * 100, 2),
        "labor_pct": round(totals["labor"] / max(totals["revenue"], 0.01) * 100, 2),
        "event_details": event_pnls,
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# STATS
# ---------------------------------------------------------------------------
def get_lifecycle_stats() -> dict:
    total = events_col.count_documents({})
    by_stage = {}
    for stage in LIFECYCLE_STAGES:
        by_stage[stage] = events_col.count_documents({"stage": stage})

    by_type = {}
    for t in EVENT_TYPES:
        by_type[t] = events_col.count_documents({"event_type": t})

    return {
        "total_events": total,
        "by_stage": by_stage,
        "by_type": by_type,
        "engine": "event_lifecycle",
        "status": "healthy",
        "timestamp": _now(),
    }
