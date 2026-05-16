"""
iter253 · Save-the-Ticket Auto-Remediation + Tonight's Playbook
================================================================
Two adjacent service-recovery / proactive-comms endpoints:

1. Save-the-Ticket — when a severe issue occurs (POS void, guest complaint,
   dish refire) Claude drafts a comp + amenity recommendation that the GM
   can one-click approve. The draft is stored as a `save_the_ticket` doc
   AND fired as a notification with link to a dedicated Approvals row.

2. Tonight's Playbook — daily 4pm push to all salaried managers with a
   Claude-generated "what to watch for tonight" briefing (covers, VIP,
   weather, staffing gaps). Stored in `tonights_playbooks` and fan-out via
   the notification system using each manager's prefs.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/service-recovery", tags=["service-recovery"])
playbook_router = APIRouter(prefix="/api/playbook", tags=["playbook"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda pref: f"{pref}-{uuid4().hex[:10]}"


def _claude_draft(prompt: str, fallback: str) -> str:
    """Try Claude via emergentintegrations (Emergent LLM Key); fallback if
    unavailable so dev environments keep working without keys."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            return fallback
        chat = LlmChat(
            api_key=key,
            session_id=f"recovery-{uuid4().hex[:8]}",
            system_message=("You are an expert hospitality service-recovery "
                            "concierge. Reply in 80–140 words. No preamble."),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        import asyncio
        return asyncio.run(chat.send_message(UserMessage(text=prompt))) or fallback
    except Exception:
        return fallback


# ─────────────── Save-the-Ticket ───────────────
class TicketReport(BaseModel):
    incident_type: str        # "void", "complaint", "refire", "delay", "wrong_room"
    severity: str = "medium"  # low|medium|high|severe
    outlet: str
    table_or_room: Optional[str] = None
    guest_name: Optional[str] = None
    server_name: Optional[str] = None
    description: str
    check_amount: Optional[float] = 0
    reported_by_id: Optional[str] = "ops"


@router.post("/save-the-ticket")
def save_the_ticket(body: TicketReport):
    """Create a save-the-ticket draft; Claude proposes comp + amenity."""
    sid = _uid("stk")
    prompt = (f"A {body.severity}-severity {body.incident_type} just occurred at "
              f"{body.outlet} ({body.table_or_room or 'no table'}). "
              f"Guest: {body.guest_name or 'unknown'}. "
              f"Check total: ${body.check_amount or 0:.2f}. "
              f"Server: {body.server_name or 'unknown'}. "
              f"Details: {body.description}\n\n"
              "Draft a concise recovery plan with: (1) immediate actions for "
              "the floor team, (2) suggested check comp $/% with reasoning, "
              "(3) an amenity to send to the room/table, and (4) a 1-sentence "
              "GM apology line. Format as plain bullet list under "
              "headings.")
    fallback = (f"• IMMEDIATE: Server visits table within 60 sec; remove the "
                f"item, log re-fire timer, alert {body.outlet} manager.\n"
                "• COMP: Suggest 25–50% check comp depending on guest reaction "
                "(higher if regular/VIP).\n"
                "• AMENITY: Comp dessert + sparkling cocktail for the table; "
                "if room guest, send fruit/cheese plate to room.\n"
                "• APOLOGY (GM): \"My sincere apologies — we missed the mark "
                "tonight, and I wanted to make it right personally.\"")
    draft = _claude_draft(prompt, fallback)

    rec = {
        "id": sid, "_id": sid,
        "incident_type": body.incident_type, "severity": body.severity,
        "outlet": body.outlet, "table_or_room": body.table_or_room,
        "guest_name": body.guest_name, "server_name": body.server_name,
        "description": body.description,
        "check_amount": body.check_amount or 0,
        "reported_by_id": body.reported_by_id,
        "ai_draft": draft,
        "status": "pending_gm_approval",
        "created_at": _now(),
    }
    db["save_the_tickets"].insert_one(rec)

    # Fire notification to GM(s) via prefs
    try:
        from routes.notif_prefs import fire_event
        fire_event({
            "event_key": "save_the_ticket",
            "target_role": "general-manager",
            "payload": {"ticket_id": sid, "outlet": body.outlet,
                        "severity": body.severity},
        })
    except Exception:
        pass
    return rec


@router.get("/save-the-ticket")
def list_tickets(status: Optional[str] = None, limit: int = 50):
    q = {"status": status} if status else {}
    rows = list(db["save_the_tickets"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    return {"rows": rows, "count": len(rows)}


@router.post("/save-the-ticket/{tid}/approve")
def approve_ticket(tid: str, body: dict = {}):
    res = db["save_the_tickets"].update_one(
        {"id": tid},
        {"$set": {"status": "approved", "approved_by_id": body.get("by", ""),
                  "approved_at": _now(),
                  "final_comp": body.get("final_comp"),
                  "final_amenity": body.get("final_amenity")}})
    if res.matched_count == 0:
        raise HTTPException(404, "ticket not found")
    return {"ok": True, "id": tid}


# ─────────────── Tonight's Playbook ───────────────
class PlaybookRunBody(BaseModel):
    date_iso: Optional[str] = None
    dispatch: bool = True       # actually fan out via notif_prefs


@playbook_router.post("/run")
def run_playbook(body: PlaybookRunBody):
    """Generate the 4pm Tonight's Playbook and queue notifications to all
    salaried managers (per their notification prefs)."""
    iso = body.date_iso or _now()[:10]
    # Snapshot data from existing collections for context
    try:
        covers = db["pos_rings"].count_documents({}) or 0
    except Exception:
        covers = 0
    vip_count = db["echo_vip_profiles"].count_documents({}) if "echo_vip_profiles" in db.list_collection_names() else 0
    callouts = (db["callout_requests"].count_documents({"status": "pending"})
                if "callout_requests" in db.list_collection_names() else 0)

    prompt = (
        f"It's 4pm on {iso}. Draft a 90-second Tonight's Playbook for the "
        f"resort's salaried managers. Highlights: ~{covers or 'normal'} POS "
        f"transactions tracked; {vip_count} VIPs in-house; {callouts} pending "
        "call-outs; weather is warm. Cover the 3 outlets (Signature Italian, "
        "Rooftop Lounge, Pool Bar). End with a single 'tonight's win' and a "
        "single 'tonight's risk'. Plain markdown, no preamble.")
    fallback = (
        f"## Tonight ({iso})\n"
        "**Top covers:** Signature Italian @ 7:30 PM peak. Pace 18 min "
        "table-turn; aim for two seatings on 2-tops by 9 PM.\n\n"
        "**Rooftop Lounge:** sunset push 6:30–8 PM. Pre-batch 80 Noir Martinis "
        "and 120 Citrus Veils. Watch glassware rotation.\n\n"
        "**Pool Bar:** taco station — 24 Latin Burgers prepped, pace beef.\n\n"
        f"**VIPs in-house:** {vip_count} — verify amenities sent.\n"
        f"**Call-outs pending:** {callouts}.\n\n"
        "**Tonight's win →** turn the rooftop bar twice on cocktail covers.\n"
        "**Tonight's risk →** a no-show line cook at SI (have CDC ready).")
    narrative = _claude_draft(prompt, fallback)

    pid = _uid("pb")
    doc = {"id": pid, "_id": pid, "date": iso, "narrative": narrative,
           "context": {"covers": covers, "vips": vip_count, "callouts": callouts},
           "created_at": _now(), "delivered_to": []}
    db["tonights_playbooks"].insert_one(doc)

    delivered = []
    if body.dispatch:
        salaried_roles = ["general-manager", "executive-chef", "fb-director",
                          "controller", "events-manager", "spa-manager",
                          "dir-engineering", "purchasing-manager", "director",
                          "pastry-chef", "sous-chef", "dining-room-manager"]
        try:
            from routes.notif_prefs import fire_event
            for r in salaried_roles:
                res = fire_event({
                    "event_key": "tonights_playbook",
                    "target_role": r,
                    "payload": {"playbook_id": pid, "date": iso,
                                "preview": narrative[:140] + "…"},
                })
                delivered.append({"role": r, "fanout": res.get("fanout_count", 0)})
        except Exception as e:
            doc["dispatch_error"] = str(e)
        db["tonights_playbooks"].update_one({"id": pid},
            {"$set": {"delivered_to": delivered}})

    return {**doc, "delivered_to": delivered}


@playbook_router.get("/today")
def get_today_playbook():
    iso = _now()[:10]
    doc = db["tonights_playbooks"].find_one({"date": iso}, {"_id": 0})
    if not doc:
        return {"date": iso, "narrative": None}
    return doc


@playbook_router.get("/history")
def list_playbooks(limit: int = 20):
    rows = list(db["tonights_playbooks"].find({}, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    return {"rows": rows, "count": len(rows)}
