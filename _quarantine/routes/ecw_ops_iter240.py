"""iter240 · Live reservations, floating banner payload, capacity alerts.

William's spec:
  - When reservations made/changed, daily standup updates in real time
  - Active banner floats from right ("RESV 67") → click → hour-by-hour with
    color-coded covers
  - Enrich each reservation with VIP / returning / previously-had-glitch flags
  - Resort guests can route through a property-wide concierge alert
  - When a restaurant hits committed capacity, broadcast
    "xyz restaurant fully committed"

Collections read:
  - concierge_reservations (dining reservations)
  - concierge_guests (VIP tier + prior-stay flag)
  - guest_issues (prior service glitches — iter238)
  - pms_reservations (resort guest match)
  - outlets (capacity + name)

Collections written:
  - concierge_alerts (property-wide broadcast log)
  - resv_change_events (drives banner pulse)
"""
from __future__ import annotations
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["ecw-ops-iter240"])


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _outlet_map() -> Dict[str, Dict[str, Any]]:
    """Resolve outlet id ↔ venue_slug (we accept either as inputs)."""
    out: Dict[str, Dict[str, Any]] = {}
    for o in db["outlets"].find({}, {"_id": 0}):
        out[o.get("id") or o.get("slug") or ""] = o
        slug = o.get("slug")
        if slug and slug != o.get("id"):
            out[slug] = o
    return out


def _covers_color(covers: int, capacity: int) -> str:
    """Heat-map color for an hour row based on committed covers vs capacity."""
    if capacity <= 0:
        pct = 0.0
    else:
        pct = covers / capacity
    if pct >= 0.95: return "#ef4444"          # red-500 (fully committed)
    if pct >= 0.75: return "#f97316"          # orange-500 (near full)
    if pct >= 0.50: return "#eab308"          # yellow-500 (busy)
    if pct >= 0.25: return "#10b981"          # emerald-500 (filling)
    if covers > 0:  return "#38bdf8"          # sky-400 (light)
    return "#475569"                           # slate-600 (empty)


def _enrich_reservation(r: Dict[str, Any]) -> Dict[str, Any]:
    """Add VIP / returning / had-glitch / resort-guest flags to a row."""
    flags: List[str] = []
    guest_id = r.get("guest_id")
    guest_name = (r.get("guest_name") or "").strip()
    room = r.get("room")

    guest_doc = None
    if guest_id:
        guest_doc = db["concierge_guests"].find_one({"id": guest_id}, {"_id": 0})
    if not guest_doc and guest_name:
        guest_doc = db["concierge_guests"].find_one(
            {"display_name": {"$regex": f"^{guest_name}$", "$options": "i"}},
            {"_id": 0},
        )

    tier = (guest_doc or {}).get("tier", "").lower()
    if tier in ("diamond", "platinum", "vip", "ambassador"):
        flags.append("vip")
    celebration = (guest_doc or {}).get("celebration")
    if celebration:
        flags.append(f"celebration:{celebration}")

    # Returning: prior-stay count ≥ 1 on guest profile OR matched pms_reservations
    prior_visits = (guest_doc or {}).get("prior_visits", 0)
    if prior_visits and prior_visits >= 1:
        flags.append("returning")
    elif guest_name:
        prior_pms = db["pms_reservations"].count_documents({
            "guest_name": {"$regex": f"^{guest_name}$", "$options": "i"},
            "departure_date": {"$lt": _today()},
        })
        if prior_pms >= 1:
            flags.append("returning")

    # Previous glitch → guest_issues hits by room OR guest_name
    glitch_q: List[Dict[str, Any]] = []
    if room:        glitch_q.append({"room": str(room)})
    if guest_name:  glitch_q.append({"guest_name": {"$regex": f"^{guest_name}$", "$options": "i"}})
    if guest_id:    glitch_q.append({"guest_id": guest_id})
    if glitch_q:
        prior_issue = db["guest_issues"].count_documents({"$or": glitch_q})
        if prior_issue >= 1:
            flags.append("had-glitch")

    # Resort guest → currently has active pms_reservation overlapping today
    if room:
        is_resort = db["pms_reservations"].count_documents({
            "room": str(room),
            "arrival_date": {"$lte": _today()},
            "departure_date": {"$gte": _today()},
        }) > 0
        if is_resort:
            flags.append("resort-guest")

    # Seed-data fallback: honour demo_flags when real enrichment found nothing
    demo_flags = r.get("demo_flags") or []
    for f in demo_flags:
        if f not in flags:
            flags.append(f)
    # Derive tier from demo_flags too
    if not tier and "vip" in flags:
        tier = "vip"
    return {**r, "flags": flags, "tier": tier or None}


# ── GET live reservations grouped by hour ────────────────────────────────
@router.get("/api/ecw-ops/reservations/live")
def reservations_live(outlet_id: Optional[str] = None,
                       date: Optional[str] = None,
                       since_ts: Optional[str] = None):
    """Return today's reservations, hour-by-hour, with enrichment.

    Params:
      outlet_id  — filter by outlet id OR venue_slug (optional: all outlets)
      date       — defaults to today (YYYY-MM-DD)
      since_ts   — if provided, also returns `changed=True` when rows have
                    updated_at ≥ since_ts (drives the banner pulse).

    Response:
      {
        outlet_id, date,
        total_covers, total_reservations,
        capacity, pct_committed, is_full,
        hours: [{hour:"18:00", covers, reservations_count, color}],
        reservations: [{...enriched}],
        changed_since: bool, new_count: int,
      }
    """
    date = date or _today()
    q: Dict[str, Any] = {"date": date}
    om = _outlet_map()
    outlet = None
    if outlet_id:
        outlet = om.get(outlet_id)
        # Accept either canonical id OR venue_slug on the reservation row
        accept = [outlet_id]
        if outlet:
            if outlet.get("slug"):       accept.append(outlet["slug"])
            if outlet.get("id"):         accept.append(outlet["id"])
        q["venue_slug"] = {"$in": list(set(accept))}

    rows = list(db["concierge_reservations"].find(q, {"_id": 0}).sort("time", 1))
    enriched = [_enrich_reservation(r) for r in rows]

    # Group by hour (HH:00)
    by_hour: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"covers": 0, "count": 0, "rows": []})
    for r in enriched:
        t = (r.get("time") or "")[:5]
        hh = (t[:2] + ":00") if len(t) >= 2 else "00:00"
        by_hour[hh]["covers"] += int(r.get("party_size") or 0)
        by_hour[hh]["count"]  += 1
        by_hour[hh]["rows"].append(r["id"])

    capacity = int((outlet or {}).get("seating_capacity", 0)) or 120
    total_covers = sum(int(r.get("party_size") or 0) for r in enriched)
    hours = []
    # Cover the service window 11:00 – 23:00 so empty hours still render
    for h in range(11, 24):
        hh = f"{h:02d}:00"
        data = by_hour.get(hh, {"covers": 0, "count": 0, "rows": []})
        hours.append({
            "hour": hh,
            "covers": data["covers"],
            "reservations_count": data["count"],
            "color": _covers_color(data["covers"], capacity // 6 or 20),
            "reservation_ids": data["rows"],
        })

    pct = (total_covers / capacity) if capacity else 0
    is_full = pct >= 0.95

    new_count = 0
    if since_ts:
        new_count = db["concierge_reservations"].count_documents({
            "date": date,
            "created_at": {"$gt": since_ts},
            **({"venue_slug": q["venue_slug"]} if "venue_slug" in q else {}),
        })

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "outlet_name": (outlet or {}).get("name"),
        "date": date,
        "total_covers": total_covers,
        "total_reservations": len(enriched),
        "capacity": capacity,
        "pct_committed": round(pct, 3),
        "is_full": is_full,
        "hours": hours,
        "reservations": enriched,
        "new_count": new_count,
        "fetched_at": utcnow_iso(),
    }


# ── POST a reservation (triggers banner + updates standup live section) ──
class ResvIn(BaseModel):
    venue_slug: str
    date: Optional[str] = None
    time: str
    party_size: int = 2
    guest_name: Optional[str] = None
    room: Optional[str] = None
    guest_id: Optional[str] = None
    notes: Optional[str] = None
    source: str = "ecw-mobile"


@router.post("/api/ecw-ops/reservations/upsert")
def upsert_reservation(body: ResvIn):
    rec = body.model_dump()
    rec["date"] = rec.get("date") or _today()
    rec["id"] = uuid.uuid4().hex[:12]
    rec["status"] = "confirmed"
    rec["created_at"] = utcnow_iso()
    rec["updated_at"] = utcnow_iso()
    db["concierge_reservations"].insert_one(dict(rec))

    # Emit change event (consumed by banner pulse + optional SSE later)
    db["resv_change_events"].insert_one({
        "id": uuid.uuid4().hex[:12],
        "reservation_id": rec["id"],
        "venue_slug": rec["venue_slug"],
        "action": "created",
        "party_size": rec["party_size"],
        "created_at": utcnow_iso(),
    })

    # Check capacity after insert — broadcast if committed
    _maybe_broadcast_capacity(rec["venue_slug"], rec["date"])

    # iter241 · VIP auto-ping: if guest_name matches a VIP, fire a leadership ping
    if rec.get("guest_name"):
        _vip = db["vip_guests"].find_one(
            {"display_name": {"$regex": f"^{rec['guest_name']}$", "$options": "i"}},
            {"_id": 0},
        )
        if _vip:
            outlet = db["outlets"].find_one({"id": rec["venue_slug"]}, {"_id": 0}) or {}
            db["vip_pings"].insert_one({
                "id": uuid.uuid4().hex[:12],
                "vip_id": _vip["id"],
                "vip_name": _vip.get("display_name"),
                "tier": _vip.get("tier"),
                "room": _vip.get("room"),
                "kind": "reservation-made",
                "detail": f"{_vip.get('display_name')} booked {outlet.get('name') or rec['venue_slug']} for {rec['time']} (party {rec['party_size']})",
                "venue_slug": rec["venue_slug"],
                "photo_url": _vip.get("photo_url"),
                "acknowledged_by": [],
                "created_at": utcnow_iso(),
            })
    return {"ok": True, "reservation": {k: v for k, v in rec.items() if k != "_id"}}


@router.post("/api/ecw-ops/reservations/{resv_id}/cancel")
def cancel_reservation(resv_id: str):
    r = db["concierge_reservations"].find_one({"id": resv_id}, {"_id": 0})
    if not r: raise HTTPException(404, "reservation not found")
    db["concierge_reservations"].update_one(
        {"id": resv_id},
        {"$set": {"status": "cancelled", "updated_at": utcnow_iso()}},
    )
    db["resv_change_events"].insert_one({
        "id": uuid.uuid4().hex[:12],
        "reservation_id": resv_id,
        "venue_slug": r.get("venue_slug"),
        "action": "cancelled",
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "id": resv_id}


# ── Capacity broadcast ───────────────────────────────────────────────────
def _maybe_broadcast_capacity(venue_slug: str, date: str) -> None:
    """If the outlet is now ≥95% committed for `date`, insert a
    property-wide concierge alert row. Idempotent per (outlet, date, 'fully')."""
    om = _outlet_map()
    outlet = om.get(venue_slug) or {}
    capacity = int(outlet.get("seating_capacity", 0)) or 120
    total = sum(int(r.get("party_size") or 0) for r in
                  db["concierge_reservations"].find({"venue_slug": venue_slug, "date": date},
                                                      {"_id": 0, "party_size": 1}))
    if capacity and (total / capacity) >= 0.95:
        key = f"fully-committed:{venue_slug}:{date}"
        if db["concierge_alerts"].count_documents({"id_key": key}) == 0:
            db["concierge_alerts"].insert_one({
                "id": uuid.uuid4().hex[:12],
                "id_key": key,
                "kind": "fully-committed",
                "headline": f"{outlet.get('name') or venue_slug} — fully committed for {date}",
                "detail": f"{total} covers committed against {capacity}-cover capacity. Redirect overflow to sister outlets.",
                "venue_slug": venue_slug,
                "date": date,
                "severity": "high",
                "acknowledged": False,
                "created_at": utcnow_iso(),
            })


@router.get("/api/ecw-ops/concierge/alerts")
def list_concierge_alerts(active_only: bool = True, limit: int = 20):
    q: Dict[str, Any] = {}
    if active_only:
        q["acknowledged"] = False
    rows = list(db["concierge_alerts"].find(q, {"_id": 0})
                  .sort("created_at", -1).limit(limit))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/api/ecw-ops/concierge/alerts/{alert_id}/ack")
def ack_concierge_alert(alert_id: str,
                         x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    r = db["concierge_alerts"].update_one(
        {"id": alert_id},
        {"$set": {"acknowledged": True,
                    "acknowledged_by": x_user_id or "chef-william",
                    "acknowledged_at": utcnow_iso()}},
    )
    if r.matched_count == 0: raise HTTPException(404, "alert not found")
    return {"ok": True}


class ConciergeWireIn(BaseModel):
    headline: str
    detail: Optional[str] = None
    venue_slug: Optional[str] = None
    severity: str = "medium"
    audience: str = "property"     # property | foh | culinary | management


@router.post("/api/ecw-ops/concierge/wire")
def wire_concierge_alert(body: ConciergeWireIn,
                           x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Manually fire a property-wide concierge alert (e.g., for a resort
    guest who needs special handling). Also writes into `concierge_alerts`
    collection so every logged-in mobile shell sees the banner."""
    doc = {
        "id": uuid.uuid4().hex[:12],
        "id_key": uuid.uuid4().hex[:12],
        "kind": "property-wire",
        "headline": body.headline,
        "detail": body.detail,
        "venue_slug": body.venue_slug,
        "severity": body.severity,
        "audience": body.audience,
        "acknowledged": False,
        "fired_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["concierge_alerts"].insert_one(dict(doc))
    return {"ok": True, "alert": {k: v for k, v in doc.items() if k != "_id"}}


# ── Seed demo reservations (idempotent) ──────────────────────────────────
@router.post("/api/ecw-ops/reservations/seed-demo")
def seed_demo():
    today = _today()
    if db["concierge_reservations"].count_documents({"date": today, "source": "ecw-seed"}) >= 10:
        return {"ok": True, "skipped": True}

    demo_rows = [
        # Rooftop — 67 covers spread across 18-22
        ("outlet-rooftop", "18:00", 4, "Novak",     "2104", ["vip"]),
        ("outlet-rooftop", "18:15", 2, "Chen",      "1208", []),
        ("outlet-rooftop", "18:30", 6, "Hartfield", "1811", ["returning"]),
        ("outlet-rooftop", "19:00", 8, "Reyes",     "3001", ["vip", "celebration:anniversary"]),
        ("outlet-rooftop", "19:00", 2, "Okonkwo",   None,   []),
        ("outlet-rooftop", "19:15", 4, "Patel",     "2211", ["had-glitch"]),
        ("outlet-rooftop", "19:30", 10, "ACME Corp", None,   ["vip"]),
        ("outlet-rooftop", "19:45", 2, "Lindqvist", "1015", ["returning"]),
        ("outlet-rooftop", "20:00", 4, "Mahoney",   None,   []),
        ("outlet-rooftop", "20:00", 6, "Sato",      "3205", ["resort-guest"]),
        ("outlet-rooftop", "20:30", 4, "Alvarez",   "2602", []),
        ("outlet-rooftop", "20:45", 2, "Bhattacharya", None, []),
        ("outlet-rooftop", "21:00", 8, "Greystone", None,   []),
        ("outlet-rooftop", "21:30", 5, "Okafor",    "902",  ["vip", "had-glitch"]),
        # Garden Room — lighter
        ("outlet-garden",  "18:30", 2, "Reed",      "1208", ["returning", "vip"]),
        ("outlet-garden",  "19:00", 4, "Martin",    None,   []),
        ("outlet-garden",  "19:30", 2, "Toma",      None,   []),
        # Coastal Kitchen — 40-top private at 19:30
        ("outlet-coastal", "19:30", 40, "Silvertech Partners", None, ["vip"]),
        ("outlet-coastal", "20:00", 4, "Dumas",     None, []),
    ]
    inserted = 0
    for (slug, t, pax, name, room, flags) in demo_rows:
        doc = {
            "id": uuid.uuid4().hex[:12],
            "venue_slug": slug,
            "date": today, "time": t, "party_size": pax,
            "guest_name": name, "room": room,
            "status": "confirmed",
            "source": "ecw-seed",
            "demo_flags": flags,
            "created_at": utcnow_iso(), "updated_at": utcnow_iso(),
        }
        db["concierge_reservations"].insert_one(dict(doc))
        inserted += 1
    return {"ok": True, "inserted": inserted, "date": today}
