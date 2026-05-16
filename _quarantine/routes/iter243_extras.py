"""iter243 · VIP at-the-door widget endpoint + auto BEO chat + NFC scan + voice→BEO.

Spec:
  - GET /api/vip-tracker/in-house-now   small payload for the home-widget
                                            (returns up to 6 VIPs currently
                                             in-house, sorted by latest activity)
  - POST /api/maestro/beo/{id}/chat     creates/returns a per-BEO chat room
                                          (idempotent), members = captain +
                                          kitchen_lead + creator + any tagged
                                          managers
  - POST /api/vip-tracker/scan          NFC/QR scan token → auto-resolves the
                                          VIP and emits a checkin + ping
  - POST /api/maestro/beo/draft         freeform text (likely from voice)
                                          → uses Claude to draft a BEO JSON
                                          and store as `status='draft'`
"""
from __future__ import annotations
import os
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["iter243"])


def _is_leader(user_id: Optional[str]) -> bool:
    if not user_id: return False
    if user_id == "chef-william": return True
    emp = db["employees"].find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
    if not emp: return False
    role = (emp.get("role") or "").lower().replace(" ", "_")
    return role in {"salary", "manager", "owner", "director", "exec_chef",
                     "executive_chef", "gm", "general_manager", "bar_manager",
                     "outlet_manager", "executive_housekeeper"}


# ── 1. VIP at-the-door widget ────────────────────────────────────────────
@router.get("/api/vip-tracker/in-house-now")
def in_house_now(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Tiny payload for the home-widget on every manager device.

    Returns VIPs whose stay window covers today, sorted by most-recent
    activity (last ping). Each row carries the most-recent activity flag
    so the widget can glow on it.
    """
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    today = datetime.now(timezone.utc).date().isoformat()
    rows = list(db["vip_guests"].find(
        {"checkin_date": {"$lte": today}, "checkout_date": {"$gte": today}},
        {"_id": 0, "id": 1, "display_name": 1, "photo_url": 1,
          "tier": 1, "room": 1, "chat_room_id": 1},
    ).limit(6))

    # Pull each VIP's latest ping for activity timestamp
    for r in rows:
        ping = db["vip_pings"].find_one({"vip_id": r["id"]}, {"_id": 0,
                                                                  "kind": 1,
                                                                  "detail": 1,
                                                                  "created_at": 1},
                                            sort=[("created_at", -1)])
        if ping:
            r["last_activity"] = ping
            try:
                created = datetime.fromisoformat(ping["created_at"])
                age = (datetime.now(timezone.utc) - created).total_seconds()
                r["activity_age_seconds"] = int(age)
            except Exception:
                r["activity_age_seconds"] = None
        else:
            r["last_activity"] = None
            r["activity_age_seconds"] = None

    rows.sort(key=lambda r: r.get("activity_age_seconds") or 999_999)
    return {"ok": True, "count": len(rows), "rows": rows, "as_of": utcnow_iso()}


# ── 2. Auto chat per BEO ─────────────────────────────────────────────────
@router.post("/api/maestro/beo/{beo_id}/chat")
def beo_chat(beo_id: str,
              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Create / return a chat room for a BEO. Members = captain + kitchen
    lead + sales rep + the creator. Auto-posts a system summary so the team
    can coordinate on a single thread per event."""
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    beo = db["beos"].find_one({"id": beo_id}, {"_id": 0})
    if not beo: raise HTTPException(404, "beo not found")

    if beo.get("chat_room_id"):
        room = db["chat_rooms"].find_one({"id": beo["chat_room_id"]}, {"_id": 0})
        if room:
            return {"ok": True, "room_id": beo["chat_room_id"], "reused": True, "room": room}

    me = x_user_id or "chef-william"
    members = [me]
    for fld in ("captain", "kitchen_lead", "sales_rep"):
        v = beo.get(fld)
        if v: members.append(v)
    members = list(dict.fromkeys(members))

    room_id = f"room-beo-{uuid.uuid4().hex[:8]}"
    room = {
        "id": room_id,
        "name": f"🎩 BEO — {beo.get('event_name')}",
        "kind": "beo",
        "beo_id": beo_id,
        "members": members,
        "created_by": me,
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    db["chat_rooms"].insert_one(dict(room))

    summary = (
        f"🎩 BEO chat opened for **{beo.get('event_name')}**\n"
        f"• {beo.get('event_date')} · {beo.get('start_time')}–{beo.get('end_time')} · {beo.get('venue')}\n"
        f"• {beo.get('guest_count')} guests · captain: {beo.get('captain') or 'tbd'}\n"
        + (f"• ⚠ {beo.get('service_notes')}\n" if beo.get('service_notes') else "")
        + f"• AI order ${beo.get('ai_order_total')} ready to place"
    )
    msg = {
        "id": uuid.uuid4().hex[:12], "room_id": room_id,
        "text": summary, "author_id": "echo-system", "author_name": "Echo",
        "kind": "system", "created_at": utcnow_iso(),
    }
    db["chat_messages"].insert_one(dict(msg))
    db["chat_rooms"].update_one({"id": room_id},
                                    {"$set": {"last_message": summary[:140]}})
    db["beos"].update_one({"id": beo_id},
                              {"$set": {"chat_room_id": room_id,
                                          "chat_created_at": utcnow_iso()}})
    return {"ok": True, "room_id": room_id, "room": room, "members_count": len(members)}


# ── 3. VIP NFC/QR scan check-in ──────────────────────────────────────────
class ScanIn(BaseModel):
    scan_token: str            # printed-card UUID OR phone-presented JWT
    venue_slug: str
    method: str = "qr"          # qr | nfc | manual


@router.post("/api/vip-tracker/scan")
def vip_scan(body: ScanIn,
              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Resolve a scan token → vip + emit checkin + ping. Tokens are stored
    on the vip_guests doc as `scan_tokens: [token1, token2…]`. Tokens are
    just opaque strings — generate them server-side or print a QR code with
    a stable UUID per VIP."""
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    vip = db["vip_guests"].find_one(
        {"$or": [
            {"scan_tokens": body.scan_token},
            {"id": body.scan_token},        # allow direct id
        ]},
        {"_id": 0},
    )
    if not vip: raise HTTPException(404, "scan token not recognised")

    cid = uuid.uuid4().hex[:12]
    db["vip_checkins"].insert_one({
        "id": cid, "vip_id": vip["id"], "vip_name": vip.get("display_name"),
        "venue_slug": body.venue_slug, "method": body.method,
        "detail": f"{vip.get('display_name')} scanned at {body.venue_slug}",
        "created_at": utcnow_iso(), "created_by": x_user_id or "chef-william",
    })
    outlet = db["outlets"].find_one({"id": body.venue_slug}, {"_id": 0}) or {}
    db["vip_pings"].insert_one({
        "id": uuid.uuid4().hex[:12], "vip_id": vip["id"],
        "vip_name": vip.get("display_name"), "tier": vip.get("tier"),
        "room": vip.get("room"), "kind": "checked-in",
        "detail": f"{vip.get('display_name')} just walked into {outlet.get('name') or body.venue_slug} ({body.method})",
        "venue_slug": body.venue_slug, "photo_url": vip.get("photo_url"),
        "acknowledged_by": [], "created_at": utcnow_iso(),
    })

    if vip.get("chat_room_id"):
        db["chat_messages"].insert_one({
            "id": uuid.uuid4().hex[:12], "room_id": vip["chat_room_id"],
            "text": f"🚪 {vip.get('display_name')} just scanned in at {outlet.get('name') or body.venue_slug}",
            "author_id": "echo-system", "author_name": "Echo",
            "kind": "system", "created_at": utcnow_iso(),
        })

    return {"ok": True, "vip_id": vip["id"], "checkin_id": cid,
             "vip_name": vip.get("display_name"), "tier": vip.get("tier")}


# Helper to seed a token onto an existing VIP for testing
@router.post("/api/vip-tracker/{vip_id}/issue-token")
def issue_scan_token(vip_id: str,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    vip = db["vip_guests"].find_one({"id": vip_id}, {"_id": 0})
    if not vip: raise HTTPException(404, "vip not found")
    token = f"vipscan-{uuid.uuid4().hex[:14]}"
    db["vip_guests"].update_one({"id": vip_id},
                                    {"$addToSet": {"scan_tokens": token},
                                      "$set": {"updated_at": utcnow_iso()}})
    return {"ok": True, "token": token}


# ── 4. Voice → BEO draft via Claude ──────────────────────────────────────
class BeoDraftIn(BaseModel):
    text: str       # spoken transcript or typed
    creator: Optional[str] = None


def _claude_draft_beo(transcript: str) -> Dict[str, Any]:
    """Call Claude to extract BEO fields from a freeform request.
    Returns a dict ready for `beos` collection (status='draft')."""
    api_key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("EMERGENT_LLM_API_KEY")
    if not api_key:
        # Graceful fallback — return a heuristic draft so the UI works
        return _heuristic_draft(transcript)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import asyncio

        sys_prompt = (
            "You are a banquet event coordinator. Extract a BEO (Banquet Event Order) "
            "JSON from the user's request. Reply with VALID JSON only. Schema:\n"
            "{event_name, event_date (YYYY-MM-DD or null), start_time (HH:MM or null), "
            "end_time, guest_count (int), venue, client_contact, "
            "stations:[{name,covers,menu}], service_notes, tags:[]}\n"
            "Use null for unknown fields. Today is "
            + datetime.now(timezone.utc).date().isoformat()
        )

        async def run():
            chat = (LlmChat(api_key=api_key, session_id=f"beo-{uuid.uuid4().hex[:8]}",
                                 system_message=sys_prompt)
                       .with_model("anthropic", "claude-sonnet-4-5-20250929"))
            return await chat.send_message(UserMessage(text=transcript))

        out = asyncio.run(run())
        # Parse JSON from response
        s = out.strip()
        if s.startswith("```"):
            s = s.split("```")[1]
            if s.startswith("json"):
                s = s[4:]
        return json.loads(s)
    except Exception as e:
        return {**_heuristic_draft(transcript), "_claude_error": str(e)[:200]}


def _heuristic_draft(transcript: str) -> Dict[str, Any]:
    """Fallback that scrapes guest count + date hints from text."""
    import re
    t = transcript.lower()
    pax_match = re.search(r"(\d{2,4})\s*(?:guests|pax|people|top)", t)
    guest_count = int(pax_match.group(1)) if pax_match else 50
    return {
        "event_name": (transcript[:60] + ("…" if len(transcript) > 60 else "")).strip(),
        "event_date": None, "start_time": None, "end_time": None,
        "guest_count": guest_count,
        "venue": "TBD", "client_contact": "",
        "stations": [{"name": "Main service", "covers": guest_count, "menu": "TBD"}],
        "service_notes": transcript,
        "tags": ["voice-drafted"],
    }


@router.post("/api/maestro/beo/draft")
def beo_draft(body: BeoDraftIn,
                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    draft = _claude_draft_beo(body.text)
    bid = f"beo-draft-{uuid.uuid4().hex[:8]}"
    doc = {
        "id": bid,
        "status": "draft",
        "source": "voice-draft",
        "raw_transcript": body.text,
        "created_by": x_user_id or body.creator or "chef-william",
        "created_at": utcnow_iso(),
        **draft,
    }
    db["beos"].insert_one(dict(doc))
    return {"ok": True, "id": bid, "draft": {k: v for k, v in doc.items() if k != "_id"}}
