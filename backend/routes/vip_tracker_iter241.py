"""iter241 · VIP Tracker — leadership-only anticipatory-service layer.

William's spec:
  - Back office pre-enriches every VIP with: photo, title, company, reason
    for stay, likes/dislikes, allergens, food prefs, birthday, anniversary,
    dates, itinerary.
  - Leadership-only (salary/manager/owner roles) tab shows a grid of VIP
    photos (3 across) with check-in/out dates underneath.
  - Tap a VIP → full profile + itinerary + 1-button "Create group chat".
  - Creating the chat: auto-adds every manager, auto-posts a system message
    summarising the VIP + itinerary, and the VIP card's button flips to
    "Open chat" pointing at that room.
  - LOCATION PING: when a VIP is spotted at an outlet (reservation made /
    check-in / amenity dispatch), a leadership-only push goes out. Does NOT
    feed into guest concierge app.
  - Housekeeping managers included in notifications (5-star wow).
  - Desktop ↔ mobile sync: writes flow into the shared `vip_guests` collection
    so desktop VIP admin picks them up.

Collections:
  - vip_guests   (the master profile)
  - vip_pings    (leadership-only notification stream)
  - chat_rooms, chat_messages (reused)
  - employees    (role gate)
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["vip-tracker-iter241"])

LEADERSHIP_ROLES = {"salary", "manager", "owner", "director", "exec_chef",
                     "executive_chef", "gm", "general_manager", "bar_manager",
                     "outlet_manager", "executive_housekeeper"}


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _is_leader(user_id: Optional[str]) -> bool:
    """Any employee whose role is in LEADERSHIP_ROLES is a 'leader'.

    Defaults to True for the dev/demo user `chef-william` so previews work
    without needing to seed an employees row first.

    iter266.15 · also allow concierge-desk (front-desk concierge needs the
    same VIP feed as leaders for VIP recognition / pre-arrival prep).
    """
    if not user_id: return False
    if user_id == "chef-william": return True
    if user_id.startswith("concierge-") or user_id == "concierge": return True
    emp = db["employees"].find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
    if not emp: return False
    role = (emp.get("role") or "").lower().replace(" ", "_")
    return role in LEADERSHIP_ROLES


# ── Models ───────────────────────────────────────────────────────────────
class VipIn(BaseModel):
    id: Optional[str] = None
    display_name: str
    photo_url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    reason_for_stay: Optional[str] = None
    likes: List[str] = Field(default_factory=list)
    dislikes: List[str] = Field(default_factory=list)
    allergens: List[str] = Field(default_factory=list)
    food_preferences: List[str] = Field(default_factory=list)
    birthday: Optional[str] = None      # MM-DD
    anniversary: Optional[str] = None   # MM-DD
    tier: str = "diamond"                # diamond|platinum|vip|ambassador
    room: Optional[str] = None
    checkin_date: Optional[str] = None   # YYYY-MM-DD
    checkout_date: Optional[str] = None  # YYYY-MM-DD
    notes: List[str] = Field(default_factory=list)
    assistant_contact: Optional[str] = None


# ── List + filter ────────────────────────────────────────────────────────
@router.get("/api/vip-tracker/list")
def list_vips(status: str = "in-house",
                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """status: in-house (default) | arriving | departing | all"""
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    today = _today()
    q: Dict[str, Any] = {}
    if status == "in-house":
        q = {"checkin_date": {"$lte": today}, "checkout_date": {"$gte": today}}
    elif status == "arriving":
        q = {"checkin_date": {"$gt": today}}
    elif status == "departing":
        q = {"checkout_date": today}
    rows = list(db["vip_guests"].find(q, {"_id": 0}).sort("checkin_date", 1))
    for r in rows:
        r["chat_active"] = bool(r.get("chat_room_id"))
        # Nights remaining
        try:
            ci = datetime.fromisoformat(r.get("checkin_date"))
            co = datetime.fromisoformat(r.get("checkout_date"))
            r["nights_total"] = max(1, (co - ci).days)
        except Exception:
            r["nights_total"] = None
    return {"ok": True, "count": len(rows), "rows": rows}


# ── Full profile + stitched itinerary ────────────────────────────────────
@router.get("/api/vip-tracker/{vip_id}")
def get_vip(vip_id: str,
              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")

    # Stitch together: reservations + amenities + concierge events
    name = v.get("display_name")
    resvs = list(db["concierge_reservations"].find(
        {"$or": [{"guest_name": {"$regex": f"^{name}$", "$options": "i"}},
                   {"guest_id": v.get("guest_id")},
                   {"room": v.get("room")}]},
        {"_id": 0},
    ).sort([("date", 1), ("time", 1)]))

    amenities = list(db["amenity_dispatches"].find(
        {"$or": [{"guest_name": {"$regex": f"^{name}$", "$options": "i"}},
                   {"room": v.get("room")}]},
        {"_id": 0},
    ).sort("created_at", -1).limit(10))

    prior_issues = list(db["guest_issues"].find(
        {"$or": [{"guest_name": {"$regex": f"^{name}$", "$options": "i"}},
                   {"room": v.get("room")}]},
        {"_id": 0},
    ).sort("created_at", -1).limit(10))

    pings = list(db["vip_pings"].find({"vip_id": vip_id}, {"_id": 0})
                   .sort("created_at", -1).limit(20))

    return {
        "ok": True,
        "vip": v,
        "itinerary": {
            "reservations": resvs,
            "amenities": amenities,
            "prior_issues": prior_issues,
            "pings": pings,
        },
    }


# ── Upsert (back-office writes) ──────────────────────────────────────────
@router.post("/api/vip-tracker/upsert")
def upsert_vip(body: VipIn,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    vip_id = body.id or f"vip-{uuid.uuid4().hex[:10]}"
    doc = body.model_dump()
    doc["id"] = vip_id
    doc["updated_by"] = x_user_id or "chef-william"
    doc["updated_at"] = utcnow_iso()
    db["vip_guests"].update_one(
        {"id": vip_id},
        {"$set": doc, "$setOnInsert": {"created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "id": vip_id, "vip": doc}


# ── Add note (managers add intel → flows into guest profile) ─────────────
class NoteIn(BaseModel):
    text: str


@router.post("/api/vip-tracker/{vip_id}/note")
def add_note(vip_id: str, body: NoteIn,
               x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")
    note = {"text": body.text.strip()[:1000],
             "authored_by": x_user_id or "chef-william",
             "created_at": utcnow_iso()}
    db["vip_guests"].update_one({"id": vip_id},
                                    {"$push": {"notes_log": note},
                                      "$set": {"updated_at": utcnow_iso()}})
    return {"ok": True, "note": note}


# ── Create group chat (auto-adds managers, posts summary) ────────────────
@router.post("/api/vip-tracker/{vip_id}/create-chat")
def create_vip_chat(vip_id: str,
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")

    # If one already exists, return it
    existing_id = v.get("chat_room_id")
    if existing_id:
        room = db["chat_rooms"].find_one({"id": existing_id}, {"_id": 0})
        if room:
            return {"ok": True, "room_id": existing_id, "room": room, "reused": True}

    # All managers + the creator
    leaders = list(db["employees"].find(
        {"role": {"$in": list(LEADERSHIP_ROLES)}, "active": True},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "role": 1},
    ))
    members = [x_user_id or "chef-william"] + [l["id"] for l in leaders if l.get("id")]
    members = list(dict.fromkeys(members))  # dedupe, preserve order

    room_id = f"room-vip-{uuid.uuid4().hex[:8]}"
    room = {
        "id": room_id,
        "name": f"🌟 VIP — {v.get('display_name')}",
        "kind": "vip-tracker",
        "vip_id": vip_id,
        "members": members,
        "created_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    }
    db["chat_rooms"].insert_one(dict(room))

    # Auto-post system message with profile summary
    summary_lines = [
        f"🌟 VIP tracking opened for **{v.get('display_name')}**",
    ]
    if v.get("title") or v.get("company"):
        summary_lines.append(f"• {v.get('title') or ''} {('— ' + v.get('company')) if v.get('company') else ''}".strip())
    if v.get("reason_for_stay"):
        summary_lines.append(f"• Stay: {v.get('reason_for_stay')}")
    if v.get("checkin_date"):
        summary_lines.append(f"• {v.get('checkin_date')} → {v.get('checkout_date') or 'tbd'} · rm {v.get('room') or 'tba'}")
    if v.get("allergens"):
        summary_lines.append(f"• ⚠ ALLERGENS: {', '.join(v.get('allergens'))}")
    if v.get("likes"):
        summary_lines.append(f"• Likes: {', '.join(v.get('likes'))}")
    if v.get("dislikes"):
        summary_lines.append(f"• Dislikes: {', '.join(v.get('dislikes'))}")
    if v.get("birthday"):
        summary_lines.append(f"• 🎂 birthday {v.get('birthday')}")
    if v.get("anniversary"):
        summary_lines.append(f"• 💍 anniversary {v.get('anniversary')}")
    summary_lines.append("")
    summary_lines.append("Drop intel here — it persists to the guest profile.")

    msg = {
        "id": uuid.uuid4().hex[:12],
        "room_id": room_id,
        "text": "\n".join(summary_lines),
        "author_id": "echo-system",
        "author_name": "Echo",
        "kind": "system",
        "created_at": utcnow_iso(),
    }
    db["chat_messages"].insert_one(dict(msg))
    db["chat_rooms"].update_one(
        {"id": room_id},
        {"$set": {"last_message": (msg["text"][:140])}},
    )

    # Mark on VIP
    db["vip_guests"].update_one({"id": vip_id},
                                    {"$set": {"chat_room_id": room_id,
                                                "chat_created_at": utcnow_iso(),
                                                "updated_at": utcnow_iso()}})

    # Fan-out a leadership ping so every manager sees the toast
    _emit_ping(vip_id, v, kind="chat-created",
                 detail=f"{x_user_id or 'Leadership'} opened VIP chat for {v.get('display_name')}")

    return {"ok": True, "room_id": room_id, "room": room, "members_count": len(members)}


# ── VIP location pings (leadership-only feed) ────────────────────────────
def _emit_ping(vip_id: str, vip: Dict[str, Any], kind: str, detail: str,
                 venue_slug: Optional[str] = None) -> str:
    pid = uuid.uuid4().hex[:12]
    db["vip_pings"].insert_one({
        "id": pid,
        "vip_id": vip_id,
        "vip_name": vip.get("display_name"),
        "tier": vip.get("tier"),
        "room": vip.get("room"),
        "kind": kind,             # arrived | reservation-made | amenity-dispatched | chat-created | location-spotted | departure-near
        "detail": detail,
        "venue_slug": venue_slug,
        "photo_url": vip.get("photo_url"),
        "acknowledged_by": [],
        "created_at": utcnow_iso(),
    })
    return pid


@router.get("/api/vip-tracker/pings/feed")
def pings_feed(limit: int = 25,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Leadership-only notification feed — surfaces as a bell in the app."""
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    rows = list(db["vip_pings"].find({}, {"_id": 0})
                  .sort("created_at", -1).limit(limit))
    me = x_user_id or "chef-william"
    unread = sum(1 for r in rows if me not in (r.get("acknowledged_by") or []))
    return {"ok": True, "rows": rows, "unread": unread}


@router.post("/api/vip-tracker/pings/{ping_id}/ack")
def ack_ping(ping_id: str,
               x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    db["vip_pings"].update_one(
        {"id": ping_id},
        {"$addToSet": {"acknowledged_by": x_user_id or "chef-william"}},
    )
    return {"ok": True}


class LocationSpotIn(BaseModel):
    vip_id: str
    venue_slug: str
    detail: Optional[str] = None


@router.post("/api/vip-tracker/location-spot")
def location_spot(body: LocationSpotIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """FOH host scans the VIP → emit a leadership-only ping
    ('Novak just arrived at Rooftop Lounge')."""
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": body.vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")
    outlet = db["outlets"].find_one({"id": body.venue_slug}, {"_id": 0}) or {}
    detail = body.detail or f"{v.get('display_name')} just arrived at {outlet.get('name') or body.venue_slug}"
    pid = _emit_ping(body.vip_id, v, "location-spotted", detail, body.venue_slug)
    return {"ok": True, "ping_id": pid}


# Hook: any call to /reservations/upsert matches VIPs by name, fires a ping
@router.post("/api/vip-tracker/check-resv")
def check_resv_for_vip(payload: Dict[str, Any],
                        x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Internal helper — called post-reservation-upsert by clients/hooks.

    Accepts {guest_name, room, venue_slug, time}. If the guest matches a
    VIP profile, emits a 'reservation-made' ping.
    """
    name = (payload.get("guest_name") or "").strip()
    if not name: return {"ok": True, "matched": False}
    vip = db["vip_guests"].find_one(
        {"display_name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0},
    )
    if not vip: return {"ok": True, "matched": False}
    detail = f"{name} made a reservation at {payload.get('venue_slug')} for {payload.get('time')}"
    pid = _emit_ping(vip["id"], vip, "reservation-made", detail, payload.get("venue_slug"))
    return {"ok": True, "matched": True, "ping_id": pid, "vip_id": vip["id"]}


# ── Seed demo VIPs ───────────────────────────────────────────────────────
@router.post("/api/vip-tracker/seed-demo")
def seed_demo():
    if db["vip_guests"].count_documents({"source": "iter241-seed"}) >= 4:
        return {"ok": True, "skipped": True}
    today = datetime.now(timezone.utc).date()
    from datetime import timedelta
    d = lambda n: (today + timedelta(days=n)).isoformat()
    rows = [
        {
            "id": "vip-novak",
            "display_name": "Sofia Novak",
            "photo_url": "https://randomuser.me/api/portraits/women/47.jpg",
            "title": "Chief Executive Officer",
            "company": "Luminaire Capital",
            "reason_for_stay": "Board retreat + anniversary",
            "likes": ["sparkling water room temp", "oat milk cappuccino at 7am", "turndown with lavender"],
            "dislikes": ["strong florals in room", "mint"],
            "allergens": ["sesame", "shellfish"],
            "food_preferences": ["pescatarian", "no added sugar before dinner"],
            "birthday": "07-14", "anniversary": "04-24",
            "tier": "diamond", "room": "2104",
            "checkin_date": d(-1), "checkout_date": d(3),
            "notes_log": [
                {"text": "Husband (Anton) prefers rye with single ice cube.",
                  "authored_by": "concierge", "created_at": utcnow_iso()},
            ],
        },
        {
            "id": "vip-reyes",
            "display_name": "Marcus Reyes",
            "photo_url": "https://randomuser.me/api/portraits/men/32.jpg",
            "title": "Founder & Chairman",
            "company": "Reyes Maritime Holdings",
            "reason_for_stay": "25th wedding anniversary",
            "likes": ["blue-label scotch in room", "morning sun deck table"],
            "dislikes": ["crowded poolside"],
            "allergens": ["tree nuts"],
            "food_preferences": ["dry-aged steak rare"],
            "anniversary": "04-26",
            "tier": "platinum", "room": "3001",
            "checkin_date": d(0), "checkout_date": d(4),
            "notes_log": [],
        },
        {
            "id": "vip-okafor",
            "display_name": "Chidi Okafor",
            "photo_url": "https://randomuser.me/api/portraits/men/44.jpg",
            "title": "Head of Product",
            "company": "Helix Biotech",
            "reason_for_stay": "Quarterly strategy offsite (group of 12)",
            "likes": ["Tesla charger ready", "sparkling Evian", "cold-brew on arrival"],
            "dislikes": ["overhead lighting in room"],
            "allergens": [],
            "food_preferences": ["gluten-free", "vegan dinners"],
            "birthday": "11-02",
            "tier": "platinum", "room": "902",
            "checkin_date": d(-2), "checkout_date": d(4),
            "notes_log": [
                {"text": "Previously had cold dinner at Rooftop — watch closely this stay.",
                  "authored_by": "gm", "created_at": utcnow_iso()},
            ],
        },
        {
            "id": "vip-hartfield",
            "display_name": "Eleanor Hartfield",
            "photo_url": "https://randomuser.me/api/portraits/women/68.jpg",
            "title": "Managing Partner",
            "company": "Hartfield & Rowe",
            "reason_for_stay": "Legacy client, quarterly suite",
            "likes": ["fresh peonies weekly", "The Times at 6am", "chilled white burgundy"],
            "dislikes": ["room service calls before 9am"],
            "allergens": ["dairy (lactose intolerant)"],
            "food_preferences": ["small portions", "early dinner 5:30pm"],
            "birthday": "02-19",
            "tier": "ambassador", "room": "1811",
            "checkin_date": d(0), "checkout_date": d(2),
            "notes_log": [],
        },
    ]
    for r in rows:
        r["source"] = "iter241-seed"
        r["created_at"] = utcnow_iso()
        r["updated_at"] = utcnow_iso()
        db["vip_guests"].update_one({"id": r["id"]}, {"$set": r}, upsert=True)
    return {"ok": True, "inserted": len(rows)}
