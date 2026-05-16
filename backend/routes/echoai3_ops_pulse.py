"""
EchoAi³ Operations Pulse — Autonomous Hotel Intelligence
==========================================================
Continuously analyzes ALL department operations simultaneously.
Cross-references data, detects anomalies, generates actionable guidance.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter
from database import db
import random

router = APIRouter(prefix="/api/echoai3/ops-pulse", tags=["echoai3-ops-pulse"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]
_today = lambda: datetime.now(timezone.utc).date()


def _analyze_operations():
    """Pull ALL department data simultaneously and generate cross-department intelligence."""
    insights = []
    alerts = []
    recommendations = []
    auto_actions = []
    department_status = {}

    # ═══ 1. ROOMS DIVISION ═══
    hk_rooms = list(db["hk_rooms"].find({}, {"_id": 0}))
    total_rooms = max(len(hk_rooms), 65)
    occupied = len([r for r in hk_rooms if r.get("status") == "occupied"])
    dirty = len([r for r in hk_rooms if r.get("status") == "dirty"])
    clean = len([r for r in hk_rooms if r.get("status") == "clean"])
    ooo = len([r for r in hk_rooms if r.get("status") == "out_of_order"])
    occ_pct = round(occupied / total_rooms * 100, 1) if total_rooms else 0

    today_str = _today().strftime("%Y-%m-%d")
    arrivals = db["pms_reservations"].count_documents({"arrival_date": today_str})
    departures = db["pms_reservations"].count_documents({"departure_date": today_str})

    department_status["rooms"] = {
        "occupancy": occ_pct, "total_rooms": total_rooms, "occupied": occupied,
        "clean": clean, "dirty": dirty, "ooo": ooo,
        "arrivals_today": arrivals, "departures_today": departures,
        "health": "good" if occ_pct > 60 else "moderate" if occ_pct > 40 else "low",
    }

    if arrivals > clean:
        alerts.append({"severity": "critical", "dept": "housekeeping", "msg": f"Only {clean} rooms clean but {arrivals} arrivals expected. Need {arrivals - clean} rooms turned ASAP."})
    if ooo > 3:
        alerts.append({"severity": "warning", "dept": "engineering", "msg": f"{ooo} rooms out-of-order. Revenue impact: ${ooo * 289:.0f}/night."})
    if occ_pct < 50:
        recommendations.append({"dept": "revenue", "action": "Activate last-minute OTA push. Occupancy at {:.0f}% — below break-even threshold.".format(occ_pct), "priority": "high"})
    elif occ_pct > 90:
        recommendations.append({"dept": "revenue", "action": "Enable rate fencing. High occupancy ({:.0f}%) — optimize ADR with dynamic pricing.".format(occ_pct), "priority": "medium"})

    # ═══ 2. FOOD & BEVERAGE ═══
    ird_orders = list(db["ird_orders"].find({}, {"_id": 0}))
    guest_orders = list(db["guest_orders"].find({}, {"_id": 0}))
    ird_revenue = sum(o.get("total", 0) for o in ird_orders)
    guest_revenue = sum(o.get("total", 0) for o in guest_orders)
    total_fb = ird_revenue + guest_revenue
    fb_per_occupied = round(total_fb / max(occupied, 1), 2)

    department_status["food_beverage"] = {
        "ird_orders": len(ird_orders), "ird_revenue": round(ird_revenue, 2),
        "guest_orders": len(guest_orders), "guest_revenue": round(guest_revenue, 2),
        "total_fb_revenue": round(total_fb, 2), "fb_per_occupied_room": fb_per_occupied,
        "health": "good" if fb_per_occupied > 40 else "moderate" if fb_per_occupied > 20 else "needs_attention",
    }

    if fb_per_occupied < 25 and occupied > 20:
        recommendations.append({"dept": "f_and_b", "action": f"F&B per occupied room is ${fb_per_occupied:.0f} — below $40 target. Push in-room dining promotions.", "priority": "high"})

    # ═══ 3. CONCIERGE & GUEST EXPERIENCE ═══
    open_tickets = db["concierge_tickets"].count_documents({"status": "open"})
    critical_tickets = db["concierge_tickets"].count_documents({"status": "open", "priority": "critical"})
    total_tickets = db["concierge_tickets"].count_documents({})

    department_status["concierge"] = {
        "open_tickets": open_tickets, "critical_tickets": critical_tickets,
        "total_tickets": total_tickets,
        "health": "critical" if critical_tickets > 2 else "warning" if open_tickets > 15 else "good",
    }

    if critical_tickets > 0:
        alerts.append({"severity": "critical", "dept": "concierge", "msg": f"{critical_tickets} CRITICAL guest tickets unresolved. Immediate attention required."})
    if open_tickets > 20:
        alerts.append({"severity": "warning", "dept": "concierge", "msg": f"{open_tickets} open tickets. Staff may be overwhelmed — consider reassigning."})

    # ═══ 4. ENGINEERING ═══
    eng_tickets = list(db["eng_tickets"].find({"status": {"$in": ["open", "in_progress"]}}, {"_id": 0}))
    equipment_issues = len([t for t in eng_tickets if t.get("category") in ["hvac", "plumbing", "electrical"]])

    department_status["engineering"] = {
        "active_tickets": len(eng_tickets), "equipment_issues": equipment_issues,
        "health": "warning" if len(eng_tickets) > 10 else "good",
    }

    if equipment_issues > 5:
        alerts.append({"severity": "warning", "dept": "engineering", "msg": f"{equipment_issues} active equipment issues. Check for systemic failure pattern."})

    # ═══ 5. SPA & WELLNESS ═══
    spa_apts = list(db["spa_appointments"].find({}, {"_id": 0}))
    spa_revenue = sum(a.get("price", 0) for a in spa_apts)
    spa_per_occ = round(spa_revenue / max(occupied, 1), 2)

    department_status["spa"] = {
        "appointments": len(spa_apts), "revenue": round(spa_revenue, 2),
        "revenue_per_occupied": spa_per_occ,
        "health": "good" if spa_revenue > 1000 else "moderate",
    }

    if spa_per_occ < 15 and occupied > 30:
        recommendations.append({"dept": "spa", "action": f"Spa capture rate low (${spa_per_occ:.0f}/room). Offer arrival day specials or package add-ons.", "priority": "medium"})

    # ═══ 6. FINANCIAL ═══
    room_revenue = round(occupied * 289.5, 2)
    total_revenue = room_revenue + total_fb + spa_revenue
    gop_estimate = round(total_revenue * 0.258, 2)

    department_status["financial"] = {
        "room_revenue": room_revenue, "total_revenue": round(total_revenue, 2),
        "gop_estimate": gop_estimate, "gop_margin": round(gop_estimate / max(total_revenue, 1) * 100, 1),
        "revpar": round(room_revenue / total_rooms, 2),
        "trevpar": round(total_revenue / total_rooms, 2),
        "health": "good" if total_revenue > 15000 else "moderate",
    }

    # ═══ 7. PURCHASING & INVENTORY ═══
    vendor_count = db["pr_vendors"].count_documents({"status": "active"})
    catalog_count = db["internal_catalog"].count_documents({"active": True})
    mapping_count = db["vendor_item_mappings"].count_documents({"status": "approved"})

    department_status["purchasing"] = {
        "active_vendors": vendor_count, "catalog_items": catalog_count,
        "learned_mappings": mapping_count,
        "health": "good",
    }

    # ═══ 8. INVENTORY DEPLETION (All Outlets) ═══
    bev_inventory = list(db["beverage_inventory"].find({}, {"_id": 0}))
    bev_below_par = [b for b in bev_inventory if b.get("quantity", 0) < b.get("par_level", b.get("reorder_point", 5))]
    micro_inventory = list(db["micro_market_inventory"].find({}, {"_id": 0}))
    micro_low = [m for m in micro_inventory if m.get("quantity", 0) < m.get("par_level", m.get("reorder_point", 3))]
    retail_inventory = list(db["retail_inventory"].find({}, {"_id": 0}))
    retail_low = [r for r in retail_inventory if r.get("quantity", 0) < r.get("par_level", r.get("reorder_point", 5))]
    # Spa consumables
    spa_supplies = list(db["spa_supplies"].find({}, {"_id": 0}))
    spa_low = [s for s in spa_supplies if s.get("quantity", 0) < s.get("par_level", 5)]
    # HK supplies
    hk_supplies = list(db["hk_supplies"].find({}, {"_id": 0}))
    hk_low = [h for h in hk_supplies if h.get("quantity", 0) < h.get("par_level", 10)]

    total_depletion_alerts = len(bev_below_par) + len(micro_low) + len(retail_low) + len(spa_low) + len(hk_low)
    department_status["inventory_depletion"] = {
        "beverage_below_par": len(bev_below_par),
        "micro_market_low": len(micro_low),
        "retail_low": len(retail_low),
        "spa_supplies_low": len(spa_low),
        "hk_supplies_low": len(hk_low),
        "total_depletion_alerts": total_depletion_alerts,
        "health": "critical" if total_depletion_alerts > 10 else "warning" if total_depletion_alerts > 3 else "good",
    }
    if bev_below_par:
        alerts.append({"severity": "warning", "dept": "beverage", "msg": f"{len(bev_below_par)} beverage items below par level. Auto-order recommended."})
        auto_actions.append({"type": "auto_order", "dept": "beverage", "items": [{"name": b.get("name",""), "current": b.get("quantity",0), "par": b.get("par_level",0)} for b in bev_below_par[:5]], "action": "Generate commissary PO for depleted beverage items"})
    if spa_low:
        alerts.append({"severity": "warning", "dept": "spa", "msg": f"{len(spa_low)} spa consumables running low. Restock before peak hours."})
    if hk_low:
        alerts.append({"severity": "warning", "dept": "housekeeping", "msg": f"{len(hk_low)} housekeeping supplies below par. Critical for turnover service."})

    # ═══ 9. BANQUET / EVENT OPERATIONS ═══
    buffet_plans = list(db["buffet_plans"].find({"service_date": today_str}, {"_id": 0}))
    events_today = list(db["event_pipeline"].find({}, {"_id": 0}))
    active_events = [e for e in events_today if e.get("stage") in ["confirmed", "execution", "contract_signed"]]
    event_covers = sum(e.get("guests", 0) for e in active_events)
    beo_count = db["beo_documents"].count_documents({})

    department_status["banquets"] = {
        "buffet_plans_today": len(buffet_plans),
        "active_events": len(active_events),
        "total_event_covers": event_covers,
        "beo_count": beo_count,
        "health": "good" if len(active_events) > 0 else "moderate",
    }
    if active_events and not buffet_plans:
        alerts.append({"severity": "warning", "dept": "banquets", "msg": f"{len(active_events)} active events with {event_covers} covers but NO buffet plans created for today."})
    if event_covers > 100:
        recommendations.append({"dept": "banquets", "action": f"High event volume: {event_covers} covers across {len(active_events)} events. Ensure banquet prep stations staffed and commissary pull completed.", "priority": "high"})

    # ═══ 10. COMMISSARY / AUTO-ORDERING ═══
    commissary_configs = list(db["commissary_configs"].find({}, {"_id": 0}))
    pending_pos = db["purchase_orders"].count_documents({"status": "pending"})
    auto_generated_pos = db["purchase_orders"].count_documents({"source": "auto"})
    pending_approvals = db["approval_requests"].count_documents({"status": "pending"})

    department_status["commissary"] = {
        "configs": len(commissary_configs),
        "pending_pos": pending_pos,
        "auto_generated": auto_generated_pos,
        "pending_approvals": pending_approvals,
        "health": "warning" if pending_approvals > 5 else "good",
    }
    if pending_pos > 3:
        recommendations.append({"dept": "purchasing", "action": f"{pending_pos} purchase orders awaiting processing. Auto-submit to vendors.", "priority": "medium"})
    # Auto-generate orders for depleted items
    if total_depletion_alerts > 0:
        auto_actions.append({"type": "commissary_pull", "dept": "commissary", "depletion_count": total_depletion_alerts, "action": f"Generate commissary pull sheet for {total_depletion_alerts} depleted items across outlets"})

    # ═══ 11. SPA OPERATIONS DEEP DIVE ═══
    spa_treatments = list(db["spa_treatments"].find({"active": True}, {"_id": 0}))
    spa_therapists = list(db["spa_therapists"].find({}, {"_id": 0}))
    spa_rooms_list = list(db["spa_rooms"].find({}, {"_id": 0}))
    spa_available = len([r for r in spa_rooms_list if r.get("status") == "available"])
    spa_utilization = round(len(spa_apts) / max(len(spa_rooms_list) * 8, 1) * 100, 1)  # 8 slots/room/day

    department_status["spa"]["treatments_available"] = len(spa_treatments)
    department_status["spa"]["therapists"] = len(spa_therapists)
    department_status["spa"]["rooms_available"] = spa_available
    department_status["spa"]["utilization"] = spa_utilization

    if spa_utilization < 30 and occupied > 30:
        recommendations.append({"dept": "spa", "action": f"Spa utilization at {spa_utilization}% — push walk-in specials to front desk. {spa_available} rooms available.", "priority": "medium"})

    # ═══ 12. MANAGER APPROVAL QUEUE ═══
    approval_queue = list(db["approval_requests"].find({"status": "pending"}, {"_id": 0}).limit(10))
    po_pending_approval = db["purchase_orders"].count_documents({"status": "pending_approval"})
    recipe_pending = db["recipe_approvals"].count_documents({"status": "pending"})

    department_status["approvals"] = {
        "pending_total": len(approval_queue) + po_pending_approval + recipe_pending,
        "po_approvals": po_pending_approval,
        "recipe_approvals": recipe_pending,
        "governance_approvals": len(approval_queue),
        "health": "warning" if len(approval_queue) + po_pending_approval > 5 else "good",
    }
    if po_pending_approval > 0:
        auto_actions.append({"type": "approval_prompt", "dept": "purchasing", "count": po_pending_approval, "action": f"PROMPT: {po_pending_approval} purchase orders need outlet manager approval"})
    if recipe_pending > 0:
        auto_actions.append({"type": "approval_prompt", "dept": "culinary", "count": recipe_pending, "action": f"PROMPT: {recipe_pending} recipe changes need chef approval"})

    # ═══ 13. RECEIVING / INVOICE CHECK ═══
    recent_invoices = list(db["invoice_scans"].find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
    unmapped_items = db["invoice_item_queue"].count_documents({"mapping_status": {"$in": ["unmapped", "review"]}})
    unmatched_invoices = db["invoice_scans"].count_documents({"match_status": {"$ne": "clean"}})

    department_status["receiving"] = {
        "recent_scans": len(recent_invoices),
        "unmapped_items": unmapped_items,
        "unmatched_invoices": unmatched_invoices,
        "health": "warning" if unmapped_items > 10 else "good",
    }
    if unmapped_items > 0:
        recommendations.append({"dept": "receiving", "action": f"{unmapped_items} invoice items need manual mapping review. Complete to improve AI learning.", "priority": "medium"})

    # ═══ 14. CROSS-DEPARTMENT INTELLIGENCE ═══
    # Arrival readiness score
    readiness = round((clean / max(arrivals, 1)) * 100, 1) if arrivals > 0 else 100
    insights.append({"type": "arrival_readiness", "score": min(readiness, 100), "detail": f"{clean} clean rooms for {arrivals} arrivals"})

    # Revenue per available room trend
    insights.append({"type": "revpar", "value": round(room_revenue / total_rooms, 2), "benchmark": 180, "status": "above" if room_revenue / total_rooms > 180 else "below"})

    # Guest satisfaction proxy (ticket resolution)
    if total_tickets > 0:
        resolution_rate = round((total_tickets - open_tickets) / total_tickets * 100, 1)
        insights.append({"type": "guest_satisfaction_proxy", "resolution_rate": resolution_rate, "detail": f"{total_tickets - open_tickets}/{total_tickets} tickets resolved"})

    # Staffing recommendation
    if occ_pct > 80:
        recommendations.append({"dept": "labor", "action": "High occupancy day — ensure full staffing for housekeeping PM shift and F&B dinner service.", "priority": "high"})
    elif occ_pct < 40:
        recommendations.append({"dept": "labor", "action": "Low occupancy — consider skeleton crew for housekeeping. Cross-train idle staff to engineering.", "priority": "medium"})

    return {
        "timestamp": _now(),
        "departments": department_status,
        "alerts": sorted(alerts, key=lambda x: {"critical": 0, "warning": 1, "info": 2}.get(x["severity"], 3)),
        "recommendations": sorted(recommendations, key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x["priority"], 3)),
        "auto_actions": auto_actions,
        "insights": insights,
        "overall_health": "critical" if any(a["severity"] == "critical" for a in alerts) else "warning" if len(alerts) > 2 else "operational",
        "hotel_score": _compute_score(department_status, alerts),
    }


def _compute_score(depts: dict, alerts: list) -> dict:
    """Compute an overall hotel operations score (0-100)."""
    scores = {}
    scores["rooms"] = min(100, max(0, depts["rooms"]["occupancy"] * 1.2 + (10 if depts["rooms"]["ooo"] == 0 else -depts["rooms"]["ooo"] * 5)))
    scores["f_and_b"] = min(100, 50 + depts["food_beverage"]["fb_per_occupied_room"] * 1.2)
    scores["guest_exp"] = max(0, 100 - depts["concierge"]["open_tickets"] * 3 - depts["concierge"]["critical_tickets"] * 15)
    scores["engineering"] = max(0, 100 - depts["engineering"]["active_tickets"] * 5)
    scores["spa"] = min(100, 40 + depts["spa"]["revenue"] / 20)
    scores["financial"] = min(100, depts["financial"]["gop_margin"] * 3)

    overall = round(sum(scores.values()) / len(scores), 1)
    alert_penalty = len([a for a in alerts if a["severity"] == "critical"]) * 10 + len([a for a in alerts if a["severity"] == "warning"]) * 3
    overall = max(0, overall - alert_penalty)

    return {"overall": overall, "breakdown": scores, "grade": "A" if overall >= 85 else "B" if overall >= 70 else "C" if overall >= 55 else "D"}


@router.get("/analyze")
async def ops_pulse_analyze():
    """EchoAi³ autonomous operations analysis — all departments at once."""
    analysis = _analyze_operations()

    # Store the pulse for historical tracking
    db["ops_pulse_history"].insert_one({
        "id": f"pulse-{_uid()}", "timestamp": _now(),
        "score": analysis["hotel_score"]["overall"],
        "grade": analysis["hotel_score"]["grade"],
        "alerts_count": len(analysis["alerts"]),
        "recommendations_count": len(analysis["recommendations"]),
    })
    # Remove _id before returning
    return analysis


@router.get("/history")
async def ops_pulse_history(limit: int = 24):
    """Historical pulse readings."""
    history = list(db["ops_pulse_history"].find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {"pulses": history, "total": db["ops_pulse_history"].count_documents({})}


@router.get("/guidance")
async def ops_guidance():
    """Get current AI guidance for the GM — actionable next steps."""
    analysis = _analyze_operations()
    score = analysis["hotel_score"]

    # Build prioritized action list
    actions = []
    for alert in analysis["alerts"]:
        actions.append({"type": "alert", "priority": 0 if alert["severity"] == "critical" else 1, "dept": alert["dept"], "action": alert["msg"]})
    for rec in analysis["recommendations"]:
        actions.append({"type": "recommendation", "priority": 1 if rec["priority"] == "high" else 2, "dept": rec["dept"], "action": rec["action"]})

    actions.sort(key=lambda x: x["priority"])

    return {
        "timestamp": _now(),
        "hotel_score": score["overall"],
        "grade": score["grade"],
        "status": analysis["overall_health"],
        "top_actions": actions[:5],
        "all_actions": actions,
        "departments_needing_attention": [k for k, v in analysis["departments"].items() if v.get("health") in ["critical", "warning", "needs_attention", "low"]],
    }
