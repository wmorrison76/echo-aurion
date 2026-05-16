"""iter251 · Daily AI Briefing — role-aware narrative summary.

Pulls REAL data from MongoDB (no mocks) and asks Claude to write a 60-second
briefing tailored to the user's role:
  - Director: resort-wide net sales, all outlets, top alerts
  - GM: their property — covers, BEOs, VIPs, pending PTO, voids
  - Exec Chef: kitchen — 86s, BEOs, top items, par alerts
  - Sous Chef / Pastry Chef: their station's prep + production needs
  - Dining Room Manager: covers + reservations + VIPs
  - F&B Director: outlets summary + revenue mix
  - Controller: tender mix + voids + comps + tax breakdown
  - Events Manager: today's BEOs + tomorrow's setup
  - Staff (hourly): personal — schedule, PTO balance, MoD chat unread

Endpoint:
  GET /api/briefing/today?role=<role>  (defaults to caller role)
  GET /api/briefing/standup-feed       (mobile standup — same data, condensed)
"""
from __future__ import annotations
import os
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/briefing", tags=["briefing"])

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")


# ── role → data slice ───────────────────────────────────────────────────
def _today_iso() -> str:
    return date.today().isoformat()


def _gather_director() -> Dict[str, Any]:
    today = _today_iso()
    rings = list(db["pos_rings"].aggregate([
        {"$match": {"date": today, "void": {"$ne": True}}},
        {"$group": {"_id": "$outlet_id", "net": {"$sum": "$price"},
                       "rings": {"$sum": 1}}},
    ]))
    outlet_names = {o["outlet_id"]: o["name"] for o in
                          db["outlets"].find({}, {"_id": 0, "outlet_id": 1, "name": 1})}
    outlets = [{"id": r["_id"], "name": outlet_names.get(r["_id"], r["_id"]),
                  "net": round(r["net"] or 0, 2),
                  "rings": r["rings"]} for r in rings]
    outlets.sort(key=lambda r: r["net"], reverse=True)
    total_net = sum(r["net"] for r in outlets)
    vips = list(db["echo_vip_profiles"].find(
        {"in_house": True}, {"_id": 0, "display_name": 1, "tier": 1}).limit(8))
    pending_pto = db["pto_requests"].count_documents({"status": "pending"})
    pending_swaps = db["shift_swaps"].count_documents({"status": "manager-pending"})
    pending_callouts = db["callout_requests"].count_documents({"status": "pending"})
    return {
        "scope": "resort-wide", "date": today,
        "total_net_today": round(total_net, 2),
        "outlets": outlets[:8],
        "vips_in_house": vips,
        "pending_approvals": {
            "pto": pending_pto, "swaps": pending_swaps, "callouts": pending_callouts
        },
    }


def _gather_gm(property_id: Optional[str] = None) -> Dict[str, Any]:
    d = _gather_director()
    d["scope"] = "property"
    return d


def _gather_exec_chef() -> Dict[str, Any]:
    today = _today_iso()
    rings = list(db["pos_rings"].aggregate([
        {"$match": {"date": today, "void": {"$ne": True}}},
        {"$group": {"_id": "$item_name", "qty": {"$sum": "$qty"},
                       "rev": {"$sum": "$price"}}},
        {"$sort": {"rev": -1}}, {"$limit": 8},
    ]))
    eight_six = list(db["eighty_six_log"].find(
        {"date": today, "active": True}, {"_id": 0, "item_name": 1, "outlet": 1}).limit(20))
    beos = list(db["beos"].find(
        {"event_date": today, "status": {"$in": ["confirmed", "in-service"]}},
        {"_id": 0, "event_name": 1, "guest_count": 1, "service_time": 1}).limit(8))
    par_alerts = list(db["inventory_par_alerts"].find(
        {"resolved": False}, {"_id": 0, "item_name": 1, "current_qty": 1, "par": 1}).limit(8))
    return {
        "scope": "kitchen", "date": today,
        "top_items": [{"name": r["_id"], "qty": r["qty"], "revenue": round(r["rev"] or 0, 2)}
                            for r in rings],
        "eight_six": eight_six,
        "beos_today": beos,
        "par_alerts": par_alerts,
    }


def _gather_sous_or_pastry(dept: str) -> Dict[str, Any]:
    today = _today_iso()
    beos = list(db["beos"].find(
        {"event_date": today, "status": {"$in": ["confirmed", "in-service"]}},
        {"_id": 0, "event_name": 1, "guest_count": 1, "service_time": 1}).limit(5))
    return {
        "scope": dept, "date": today,
        "beos_today": beos,
        "department_focus": "Mise en place + production timeline",
    }


def _gather_dining_room() -> Dict[str, Any]:
    today = _today_iso()
    resv = list(db["concierge_reservations"].find(
        {"date": today}, {"_id": 0, "venue_slug": 1, "party_size": 1, "time": 1, "vip": 1}))
    by_outlet: Dict[str, Dict[str, Any]] = {}
    for r in resv:
        slug = r.get("venue_slug") or "unknown"
        a = by_outlet.setdefault(slug, {"venue": slug, "covers": 0, "bookings": 0, "vip_count": 0})
        a["covers"] += int(r.get("party_size") or 0); a["bookings"] += 1
        if r.get("vip"): a["vip_count"] += 1
    vips = list(db["echo_vip_profiles"].find(
        {"in_house": True}, {"_id": 0, "display_name": 1, "tier": 1, "preferences": 1}).limit(6))
    return {
        "scope": "FOH", "date": today,
        "outlets": list(by_outlet.values()),
        "total_covers": sum(o["covers"] for o in by_outlet.values()),
        "vips_in_house": vips,
    }


def _gather_controller() -> Dict[str, Any]:
    today = _today_iso()
    tender = list(db["pos_rings"].aggregate([
        {"$match": {"date": today, "void": {"$ne": True}, "tender": {"$exists": True}}},
        {"$group": {"_id": "$tender", "amt": {"$sum": "$tender_amount"}}},
    ]))
    voids = list(db["pos_rings"].aggregate([
        {"$match": {"date": today, "void": True}},
        {"$group": {"_id": None, "amt": {"$sum": "$price"}, "n": {"$sum": 1}}},
    ]))
    comps = list(db["pos_rings"].aggregate([
        {"$match": {"date": today, "comp": True}},
        {"$group": {"_id": None, "amt": {"$sum": "$price"}, "n": {"$sum": 1}}},
    ]))
    return {
        "scope": "finance", "date": today,
        "tender_top": [{"name": r["_id"], "amount": round(r["amt"] or 0, 2)} for r in tender][:5],
        "voids": voids[0] if voids else {"amt": 0, "n": 0},
        "comps": comps[0] if comps else {"amt": 0, "n": 0},
    }


def _gather_events() -> Dict[str, Any]:
    today = _today_iso()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    today_beos = list(db["beos"].find(
        {"event_date": today}, {"_id": 0, "event_name": 1, "guest_count": 1,
                                          "service_time": 1, "status": 1}).limit(10))
    tomorrow_beos = list(db["beos"].find(
        {"event_date": tomorrow}, {"_id": 0, "event_name": 1, "guest_count": 1,
                                                "service_time": 1}).limit(10))
    return {
        "scope": "events", "date": today,
        "today_beos": today_beos, "tomorrow_beos": tomorrow_beos,
    }


def _gather_staff(user_id: str) -> Dict[str, Any]:
    today = _today_iso()
    next_shifts = list(db["staff_schedule"].find(
        {"employee_id": user_id, "date": {"$gte": today}}, {"_id": 0}
    ).sort("date", 1).limit(3))
    pto_rows = list(db["pto_requests"].find(
        {"employee_id": user_id, "status": "pending"}, {"_id": 0}).limit(5))
    notif_unread = db["myecho_notifications"].count_documents(
        {"employee_id": user_id, "read": False})
    return {
        "scope": "personal", "date": today, "user_id": user_id,
        "next_shifts": next_shifts,
        "pending_pto": pto_rows,
        "unread_notifications": notif_unread,
    }


def _gather_for_role(role: str, user_id: Optional[str]) -> Dict[str, Any]:
    if role in ("director", "owner", "admin"): return _gather_director()
    if role == "general-manager": return _gather_gm()
    if role == "executive-chef": return _gather_exec_chef()
    if role == "sous-chef": return _gather_sous_or_pastry("Culinary · Sous")
    if role == "pastry-chef": return _gather_sous_or_pastry("Pastry")
    if role == "dining-room-manager": return _gather_dining_room()
    if role == "fb-director": return _gather_director()  # f&b sees outlets
    if role == "controller": return _gather_controller()
    if role == "events-manager": return _gather_events()
    if role == "staff": return _gather_staff(user_id or "demo-hourly-001")
    return _gather_director()


# ── Claude narrative ────────────────────────────────────────────────────
PERSONAS = {
    "director":            "You are briefing the Director of multiple resorts. Emphasize cross-property net sales totals, top-performing outlets, and any cross-cut alerts (pending PTO/swap approvals). Crisp, exec-ready.",
    "general-manager":     "You are briefing a property GM. Emphasize today's covers, VIPs in house, BEOs in service, pending approvals.",
    "executive-chef":      "You are briefing the Executive Chef. Emphasize 86'd items, top sellers, BEO timing, par alerts, and any kitchen risk.",
    "sous-chef":           "You are briefing a Sous Chef. Emphasize prep timeline, BEO mise-en-place, and station coverage.",
    "pastry-chef":         "You are briefing the Executive Pastry Chef. Emphasize pastry production needs, wedding cake or banquet dessert timing.",
    "dining-room-manager": "You are briefing the Dining Room Manager. Emphasize covers per outlet, VIP service notes, and table-flow risks.",
    "fb-director":         "You are briefing the F&B Director. Emphasize outlet revenue mix and any operational standouts.",
    "controller":          "You are briefing the Controller. Emphasize tender mix, voids/comps, and any reconciliation flags.",
    "events-manager":      "You are briefing the Events Manager. Emphasize today's BEOs in service + tomorrow's load-in.",
    "staff":               "You are briefing an hourly staff member. Speak warmly. Cover their next shift, any pending PTO/swap status, and unread MoD notifications.",
}


async def _claude_narrative(role: str, data: Dict[str, Any]) -> str:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        return f"(Briefing service unavailable: {e})"
    if not EMERGENT_KEY:
        return "(EMERGENT_LLM_KEY not configured — narrative generation disabled.)"
    persona = PERSONAS.get(role, PERSONAS["director"])
    prompt = f"""Write a 90-second voice-memo-style briefing using this REAL data from our resort (no mock).
Format:
  - Opening line: today's headline (1 sentence)
  - 3-5 bullets of MUST-KNOW items
  - Closing line: one specific recommendation for the next 4 hours

Persona guidance: {persona}

Data:
```json
{data}
```

Tone: confident, hospitality-luxury, specific. NEVER make up numbers — use only what's in Data.
Do NOT prefix with 'Briefing:' — start directly. Keep total to ~120-180 words."""
    chat = LlmChat(api_key=EMERGENT_KEY, session_id=f"briefing-{role}-{_today_iso()}",
                       system_message=persona)
    chat.with_model("anthropic", "claude-sonnet-4-5-20250929").with_params(max_tokens=600)
    msg = UserMessage(text=prompt)
    out = await chat.send_message(msg)
    return (out or "").strip()


@router.get("/today")
async def briefing_today(request: Request, role: Optional[str] = None):
    # Resolve caller
    user_role = role
    user_id = None
    try:
        from routes.auth import get_current_user
        u = await get_current_user(request)
        user_id = u.get("id")
        if not user_role: user_role = u.get("role", "director")
    except Exception:
        if not user_role: user_role = "director"
    data = _gather_for_role(user_role, user_id)
    narrative = await _claude_narrative(user_role, data)
    return {"ok": True, "role": user_role, "user_id": user_id,
              "data": data, "narrative": narrative,
              "generated_at": utcnow_iso()}


@router.get("/standup-feed")
async def standup_feed(request: Request, role: Optional[str] = None):
    """Condensed feed for the mobile /m/ecw Standup modal — same source,
    just data + 3-bullet headline (no full narrative to keep latency low)."""
    out = await briefing_today(request, role)
    full = out.get("narrative", "")
    bullets = [line.lstrip("-•* ").strip() for line in full.split("\n")
                  if line.strip().startswith(("-", "•", "*"))][:3]
    return {"ok": True, "role": out.get("role"),
              "data": out.get("data"), "bullets": bullets,
              "narrative": full, "generated_at": out.get("generated_at")}
