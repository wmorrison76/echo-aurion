"""iter245 · Backlog batch — all remaining P1 features in one file.

  - Twilio SMS wire (sender, with trial-mode handling)
  - Auto-create BEO chat at confirmation (background hook)
  - Tonight's Playbook 4pm briefing push (Firebase fan-out)
  - Echo Radio (PTT voice memos per department channel)
  - Pre-shift huddle video upload (chef records, staff sees on standup)
  - Menu engineer "What's selling tonight" stub
  - Save-the-ticket auto-remediation (Claude drafts comp + amenity, GM approves)
"""
from __future__ import annotations
import os
import uuid
import base64
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["iter245-backlog"])


# ── Twilio sender ───────────────────────────────────────────────────────
def _twilio_send(to: str, body: str) -> Dict[str, Any]:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    tok = os.environ.get("TWILIO_AUTH_TOKEN")
    src = os.environ.get("TWILIO_FROM_NUMBER")
    if not (sid and tok):
        return {"ok": False, "error": "twilio-not-configured"}
    if not src:
        # Queue for later — user has SID/token but no FROM number yet
        db["sms_queue"].insert_one({
            "id": uuid.uuid4().hex[:12], "to": to, "body": body,
            "queued_at": utcnow_iso(), "reason": "no-FROM-number",
        })
        return {"ok": True, "queued": True}
    try:
        from twilio.rest import Client
        c = Client(sid, tok)
        msg = c.messages.create(to=to, from_=src, body=body)
        return {"ok": True, "sid": msg.sid, "status": msg.status}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


class SmsTestIn(BaseModel):
    to: str
    body: str = "Test from Echo AURION"


@router.post("/api/sms/send")
def sms_send(body: SmsTestIn,
              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    return _twilio_send(body.to, body.body)


@router.get("/api/sms/status")
def sms_status():
    return {
        "ok": True,
        "twilio_sid_set": bool(os.environ.get("TWILIO_ACCOUNT_SID")),
        "twilio_token_set": bool(os.environ.get("TWILIO_AUTH_TOKEN")),
        "twilio_from_set": bool(os.environ.get("TWILIO_FROM_NUMBER")),
        "queue_size": db["sms_queue"].count_documents({}),
    }


# ── Auto-create BEO chat at confirmation ─────────────────────────────────
class ConfirmIn(BaseModel):
    auto_chat: bool = True


@router.post("/api/maestro/beo/{beo_id}/confirm")
def confirm_beo(beo_id: str, body: ConfirmIn,
                  x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    beo = db["beos"].find_one({"id": beo_id}, {"_id": 0})
    if not beo: raise HTTPException(404, "beo not found")
    db["beos"].update_one({"id": beo_id},
                              {"$set": {"status": "confirmed", "updated_at": utcnow_iso()}})
    chat_room_id = beo.get("chat_room_id")
    if body.auto_chat and not chat_room_id:
        # Inline create — same logic as iter243_extras
        members = [x_user_id or "chef-william"]
        for fld in ("captain", "kitchen_lead", "sales_rep"):
            v = beo.get(fld)
            if v: members.append(v)
        chat_room_id = f"room-beo-{uuid.uuid4().hex[:8]}"
        db["chat_rooms"].insert_one({
            "id": chat_room_id, "name": f"🎩 BEO — {beo.get('event_name')}",
            "kind": "beo", "beo_id": beo_id, "members": list(dict.fromkeys(members)),
            "created_by": x_user_id or "chef-william",
            "created_at": utcnow_iso(), "updated_at": utcnow_iso(),
        })
        db["chat_messages"].insert_one({
            "id": uuid.uuid4().hex[:12], "room_id": chat_room_id,
            "text": f"🎩 BEO confirmed: {beo.get('event_name')} ({beo.get('event_date')})",
            "author_id": "echo-system", "author_name": "Echo",
            "kind": "system", "created_at": utcnow_iso(),
        })
        db["beos"].update_one({"id": beo_id},
                                  {"$set": {"chat_room_id": chat_room_id,
                                              "chat_created_at": utcnow_iso()}})
    return {"ok": True, "chat_room_id": chat_room_id, "status": "confirmed"}


# ── Tonight's Playbook briefing ──────────────────────────────────────────
@router.get("/api/playbook/tonight")
def playbook_tonight():
    today = datetime.now(timezone.utc).date().isoformat()
    in_house_vips = list(db["vip_guests"].find(
        {"checkin_date": {"$lte": today}, "checkout_date": {"$gte": today}},
        {"_id": 0, "id": 1, "display_name": 1, "tier": 1, "room": 1},
    ))
    full_outlets = list(db["concierge_alerts"].find(
        {"kind": "fully-committed", "date": today, "acknowledged": False},
        {"_id": 0, "venue_slug": 1, "headline": 1},
    ))
    beos_today = list(db["beos"].find({"event_date": today},
                                            {"_id": 0, "id": 1, "event_name": 1, "guest_count": 1, "captain": 1}))
    eighty_six = list(db["eighty_six_list"].find({"date": today, "active": True},
                                                          {"_id": 0, "name": 1, "reason": 1}).limit(20))

    total_resv_covers = sum(r.get("party_size", 0) for r in
                                db["concierge_reservations"].find({"date": today}, {"_id": 0, "party_size": 1}))

    return {
        "ok": True, "date": today,
        "vips_in_house": in_house_vips,
        "vips_count": len(in_house_vips),
        "outlets_full": full_outlets,
        "beos_today": beos_today,
        "eighty_six": eighty_six,
        "total_covers_committed": total_resv_covers,
        "compiled_at": utcnow_iso(),
    }


@router.post("/api/playbook/push-now")
def playbook_push_now(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Manually trigger the playbook push to all leader devices via Firebase."""
    pb = playbook_tonight()
    headline = (
        f"Tonight: {pb['vips_count']} VIPs · {pb['total_covers_committed']} covers · "
        f"{len(pb['beos_today'])} BEOs · {len(pb['eighty_six'])} 86'd"
    )
    try:
        from routes.push_fcm_iter244 import _leader_tokens, _send_push
        tokens = _leader_tokens()
        out = _send_push(tokens, "📋 Tonight's Playbook", headline,
                            data={"kind": "playbook", "date": pb["date"]})
    except Exception as e:
        out = {"ok": False, "error": str(e)[:200]}
    db["playbook_pushes"].insert_one({
        "id": uuid.uuid4().hex[:12], "date": pb["date"],
        "headline": headline, "result": out,
        "fired_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "headline": headline, **out}


# ── Echo Radio (PTT voice memos per dept) ───────────────────────────────
class RadioMsgIn(BaseModel):
    department: str = "all"            # all | culinary | foh | mixology-rd | pastry
    audio_base64: Optional[str] = None  # short voice clip
    transcript: Optional[str] = None    # client-side transcribe OR text fallback
    duration_seconds: Optional[float] = None


@router.post("/api/radio/post")
def radio_post(body: RadioMsgIn,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    rec = {
        "id": uuid.uuid4().hex[:12],
        "department": body.department,
        "transcript": (body.transcript or "")[:500],
        "audio_base64": body.audio_base64,
        "duration_seconds": body.duration_seconds,
        "author_id": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["radio_messages"].insert_one(dict(rec))
    return {"ok": True, "id": rec["id"]}


@router.get("/api/radio/feed")
def radio_feed(department: str = "all", limit: int = 30):
    q = {} if department == "all" else {"department": {"$in": [department, "all"]}}
    rows = list(db["radio_messages"].find(q, {"_id": 0})
                  .sort("created_at", -1).limit(min(limit, 100)))
    return {"ok": True, "rows": rows, "count": len(rows)}


# ── Pre-shift huddle video (GM records 30s clip) ─────────────────────────
class HuddleIn(BaseModel):
    video_base64: str
    caption: Optional[str] = None


@router.post("/api/standup/huddle-video")
def upload_huddle(body: HuddleIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    today = datetime.now(timezone.utc).date().isoformat()
    rec = {
        "video_base64": body.video_base64,
        "caption": body.caption, "uploaded_at": utcnow_iso(),
        "uploaded_by": x_user_id or "chef-william",
    }
    db["ecw_standups"].update_one({"date": today},
                                       {"$set": {"huddle_video": rec, "updated_at": utcnow_iso()}},
                                       upsert=True)
    return {"ok": True, "date": today}


# ── Menu engineer "What's selling tonight" — POS feed adapter ────────────
@router.get("/api/menu-engineer/heatmap")
def menu_heatmap(outlet_id: Optional[str] = None, hours: int = 4):
    """Aggregate POS rings by item × margin × velocity. Falls back to seeded
    demo when no real POS feed exists yet."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    q: Dict[str, Any] = {"created_at": {"$gte": cutoff}}
    if outlet_id: q["outlet_id"] = outlet_id
    rows = list(db["pos_rings"].find(q, {"_id": 0}))
    if not rows:
        # Fallback demo (so the heatmap renders before POS is wired)
        return {"ok": True, "demo": True, "items": [
            {"name": "Dry-aged ribeye 16oz", "rings": 12, "margin_pct": 71, "score": 8.5, "tag": "star"},
            {"name": "Black bass à la plancha", "rings": 9, "margin_pct": 65, "score": 7.2, "tag": "star"},
            {"name": "Truffle agnolotti", "rings": 7, "margin_pct": 78, "score": 7.0, "tag": "star"},
            {"name": "Wagyu tartare", "rings": 4, "margin_pct": 80, "score": 5.6, "tag": "puzzle"},
            {"name": "Heirloom tomato salad", "rings": 8, "margin_pct": 38, "score": 4.8, "tag": "plowhorse"},
            {"name": "Charred octopus", "rings": 1, "margin_pct": 75, "score": 2.1, "tag": "puzzle"},
            {"name": "Beet salad", "rings": 1, "margin_pct": 30, "score": 0.8, "tag": "dog"},
        ]}
    # Real path: group + score
    agg: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        n = r.get("item_name") or "Unknown"
        a = agg.setdefault(n, {"name": n, "rings": 0, "revenue": 0.0, "cost": 0.0})
        a["rings"] += int(r.get("qty") or 1)
        a["revenue"] += float(r.get("price") or 0)
        a["cost"] += float(r.get("cost") or 0)
    out = []
    for a in agg.values():
        margin_pct = round((a["revenue"] - a["cost"]) / a["revenue"] * 100, 1) if a["revenue"] else 0
        score = round((a["rings"] * margin_pct) / 100, 1)
        tag = ("star" if margin_pct >= 60 and a["rings"] >= 5
                 else "puzzle" if margin_pct >= 60
                 else "plowhorse" if a["rings"] >= 5
                 else "dog")
        out.append({**a, "margin_pct": margin_pct, "score": score, "tag": tag})
    out.sort(key=lambda x: x["score"], reverse=True)
    return {"ok": True, "demo": False, "items": out}


# ── Save-the-ticket auto-remediation ─────────────────────────────────────
class RemediationIn(BaseModel):
    issue_id: str


def _claude_draft_remediation(issue: Dict[str, Any]) -> Dict[str, Any]:
    """Use Claude to draft a comp + amenity + apology message."""
    api_key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("EMERGENT_LLM_API_KEY")
    if not api_key:
        return _fallback_remediation(issue)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        sys_prompt = (
            "You are a 5-star hotel GM with 30 years of experience saving "
            "service recoveries. Reply with VALID JSON only. Schema:\n"
            "{comp_amount_usd (number), comp_items (string[]), amenity (string), "
            "next_visit_perk (string), draft_message_to_guest (string ≤ 60 words), "
            "expected_recovery_score (1-10)}\n"
        )
        user_text = (
            f"Severity: {issue.get('severity')}. "
            f"Guest: {issue.get('guest_name')}. Room: {issue.get('room')}. "
            f"Outlet: {issue.get('venue_slug')}. "
            f"Issue: {issue.get('description')}."
        )

        async def run():
            chat = (LlmChat(api_key=api_key, session_id=f"sav-{uuid.uuid4().hex[:8]}",
                                 system_message=sys_prompt)
                       .with_model("anthropic", "claude-sonnet-4-5-20250929"))
            return await chat.send_message(UserMessage(text=user_text))

        out = asyncio.run(run()).strip()
        if out.startswith("```"):
            out = out.split("```")[1]
            if out.startswith("json"): out = out[4:]
        return json.loads(out)
    except Exception as e:
        return {**_fallback_remediation(issue), "_claude_error": str(e)[:200]}


def _fallback_remediation(issue: Dict[str, Any]) -> Dict[str, Any]:
    sev = issue.get("severity", "medium")
    comp_map = {"high": 150.0, "medium": 75.0, "low": 30.0}
    return {
        "comp_amount_usd": comp_map.get(sev, 50.0),
        "comp_items": ["meal comped", "complimentary dessert"],
        "amenity": "Champagne + handwritten apology card",
        "next_visit_perk": "Suite upgrade on next stay (subject to availability)",
        "draft_message_to_guest": (
            f"Dear {issue.get('guest_name', 'valued guest')}, please accept our deepest "
            "apologies for tonight's misstep. We've taken care of the bill and would love "
            "to make it right with a small token of our regret."
        ),
        "expected_recovery_score": 7,
    }


@router.post("/api/save-the-ticket/draft")
def save_ticket_draft(body: RemediationIn,
                         x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    issue = db["guest_issues"].find_one({"id": body.issue_id}, {"_id": 0})
    if not issue: raise HTTPException(404, "issue not found")
    draft = _claude_draft_remediation(issue)
    rec = {
        "id": uuid.uuid4().hex[:12], "issue_id": body.issue_id,
        "draft": draft, "status": "pending-approval",
        "drafted_by": "echo-claude",
        "drafted_for_review_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["save_ticket_drafts"].insert_one(dict(rec))

    # Notify GM via leadership ping
    db["vip_pings"].insert_one({
        "id": uuid.uuid4().hex[:12], "vip_id": None,
        "vip_name": issue.get("guest_name"),
        "kind": "remediation-draft",
        "detail": f"Echo drafted ${draft.get('comp_amount_usd')} comp for {issue.get('guest_name')} — review on phone",
        "venue_slug": issue.get("venue_slug"),
        "acknowledged_by": [], "created_at": utcnow_iso(),
    })
    return {"ok": True, "draft_id": rec["id"], "draft": draft}


class ApproveIn(BaseModel):
    draft_id: str
    approved: bool = True
    notes: Optional[str] = None


@router.post("/api/save-the-ticket/approve")
def save_ticket_approve(body: ApproveIn,
                          x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    d = db["save_ticket_drafts"].find_one({"id": body.draft_id}, {"_id": 0})
    if not d: raise HTTPException(404, "draft not found")
    db["save_ticket_drafts"].update_one(
        {"id": body.draft_id},
        {"$set": {"status": "approved" if body.approved else "rejected",
                    "approved_by": x_user_id or "chef-william",
                    "approval_notes": body.notes,
                    "approved_at": utcnow_iso()}},
    )
    if body.approved:
        # Mark the original issue as remediated
        db["guest_issues"].update_one(
            {"id": d["issue_id"]},
            {"$set": {"remediated": True, "remediation_draft_id": d["id"],
                        "remediated_at": utcnow_iso()}},
        )
    return {"ok": True, "approved": body.approved}


@router.get("/api/save-the-ticket/pending")
def save_ticket_pending():
    rows = list(db["save_ticket_drafts"].find({"status": "pending-approval"},
                                                    {"_id": 0}).sort("created_at", -1).limit(20))
    return {"ok": True, "rows": rows, "count": len(rows)}
