"""iter242 · VIP order intelligence + host-stand check-ins.

Extends the iter241 VIP tracker with:
  - what they ordered (food/drinks per visit)
  - assigned server name
  - ticket times from KDS (avg + last)
  - host-stand check-ins (when they walked into an outlet)
  - ordering history for anticipatory service
    ("Marcus loves the dry-aged ribeye — last visit ordered it medium-rare")

Collections:
  - vip_orders          (one row per ticket item)
  - vip_checkins        (one row per host-stand scan)
  - kds_tickets         (existing — read-only, joined for ticket time)
  - vip_guests          (extended)
"""
from __future__ import annotations
import uuid
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["vip-tracker-iter242"])


def _is_leader(user_id: Optional[str]) -> bool:
    if not user_id: return False
    if user_id == "chef-william": return True
    emp = db["employees"].find_one({"$or": [{"id": user_id}, {"email": user_id}]}, {"_id": 0})
    if not emp: return False
    role = (emp.get("role") or "").lower().replace(" ", "_")
    return role in {"salary", "manager", "owner", "director", "exec_chef",
                     "executive_chef", "gm", "general_manager", "bar_manager",
                     "outlet_manager", "executive_housekeeper"}


# ── Models ───────────────────────────────────────────────────────────────
class OrderIn(BaseModel):
    vip_id: str
    venue_slug: str
    server_name: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    # each item: {name, kind: food|drink, qty, modifiers, price?, kds_ticket_id?}
    ticket_id: Optional[str] = None
    course: Optional[str] = None        # apps | mains | dessert | drinks
    notes: Optional[str] = None


class CheckinIn(BaseModel):
    vip_id: str
    venue_slug: str
    method: str = "host-stand"           # host-stand | nfc | qr | manual | facial
    detail: Optional[str] = None


# ── POST a new order (called from KDS hook OR manual entry) ──────────────
@router.post("/api/vip-tracker/order")
def log_order(body: OrderIn,
                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": body.vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")

    rec = body.model_dump()
    rec["id"] = uuid.uuid4().hex[:12]
    rec["created_at"] = utcnow_iso()
    rec["created_by"] = x_user_id or "chef-william"
    db["vip_orders"].insert_one(dict(rec))

    # Fire a leadership ping so managers can react ("they ordered the ribeye")
    title = ", ".join((it.get("name") or "?") for it in body.items[:3]) or "items"
    db["vip_pings"].insert_one({
        "id": uuid.uuid4().hex[:12],
        "vip_id": body.vip_id,
        "vip_name": v.get("display_name"),
        "tier": v.get("tier"),
        "room": v.get("room"),
        "kind": "order-placed",
        "detail": f"{v.get('display_name')} just ordered: {title} at {body.venue_slug}",
        "venue_slug": body.venue_slug,
        "photo_url": v.get("photo_url"),
        "acknowledged_by": [],
        "created_at": utcnow_iso(),
    })

    # If a chat room exists for this VIP, drop a system message so the team
    # can react in-chat (e.g. "fire the ribeye 1B medium-rare")
    room_id = v.get("chat_room_id")
    if room_id:
        msg_text = f"🍽 {v.get('display_name')} ordered: {title}"
        if body.server_name: msg_text += f" · server: {body.server_name}"
        db["chat_messages"].insert_one({
            "id": uuid.uuid4().hex[:12],
            "room_id": room_id, "text": msg_text,
            "author_id": "echo-system", "author_name": "Echo",
            "kind": "system", "created_at": utcnow_iso(),
        })
        db["chat_rooms"].update_one(
            {"id": room_id},
            {"$set": {"last_message": msg_text[:140], "updated_at": utcnow_iso()}},
        )
    return {"ok": True, "id": rec["id"]}


# ── POST host-stand check-in ─────────────────────────────────────────────
@router.post("/api/vip-tracker/checkin")
def host_checkin(body: CheckinIn,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": body.vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")

    rec = {
        "id": uuid.uuid4().hex[:12],
        "vip_id": body.vip_id,
        "vip_name": v.get("display_name"),
        "venue_slug": body.venue_slug,
        "method": body.method,
        "detail": body.detail,
        "created_at": utcnow_iso(),
        "created_by": x_user_id or "chef-william",
    }
    db["vip_checkins"].insert_one(dict(rec))

    outlet = db["outlets"].find_one({"id": body.venue_slug}, {"_id": 0}) or {}
    detail = (body.detail
                 or f"{v.get('display_name')} just walked into {outlet.get('name') or body.venue_slug} ({body.method})")

    db["vip_pings"].insert_one({
        "id": uuid.uuid4().hex[:12],
        "vip_id": body.vip_id,
        "vip_name": v.get("display_name"),
        "tier": v.get("tier"),
        "room": v.get("room"),
        "kind": "checked-in",
        "detail": detail,
        "venue_slug": body.venue_slug,
        "photo_url": v.get("photo_url"),
        "acknowledged_by": [],
        "created_at": utcnow_iso(),
    })

    # If chat exists, post in chat too
    if v.get("chat_room_id"):
        db["chat_messages"].insert_one({
            "id": uuid.uuid4().hex[:12],
            "room_id": v["chat_room_id"],
            "text": f"🚪 {detail}",
            "author_id": "echo-system", "author_name": "Echo",
            "kind": "system", "created_at": utcnow_iso(),
        })
        db["chat_rooms"].update_one(
            {"id": v["chat_room_id"]},
            {"$set": {"last_message": detail[:140], "updated_at": utcnow_iso()}},
        )
    return {"ok": True, "id": rec["id"]}


# ── GET enriched VIP profile (orders + checkins + ticket times) ──────────
@router.get("/api/vip-tracker/{vip_id}/enriched")
def vip_enriched(vip_id: str,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    if not _is_leader(x_user_id):
        raise HTTPException(403, "leadership only")
    v = db["vip_guests"].find_one({"id": vip_id}, {"_id": 0})
    if not v: raise HTTPException(404, "vip not found")

    orders = list(db["vip_orders"].find({"vip_id": vip_id}, {"_id": 0})
                    .sort("created_at", -1).limit(40))
    checkins = list(db["vip_checkins"].find({"vip_id": vip_id}, {"_id": 0})
                      .sort("created_at", -1).limit(20))

    # Top 5 most-ordered items across history
    item_counter: Counter = Counter()
    for o in orders:
        for it in (o.get("items") or []):
            n = it.get("name")
            if n: item_counter[n] += int(it.get("qty") or 1)
    favourites = [{"name": n, "count": c} for n, c in item_counter.most_common(5)]

    # Ticket times (read kds_tickets if linked)
    ticket_ids = [o.get("ticket_id") for o in orders if o.get("ticket_id")]
    avg_seconds = None; last_seconds = None
    if ticket_ids:
        rows = list(db["kds_tickets"].find({"id": {"$in": ticket_ids}},
                                                {"_id": 0, "id": 1, "fired_at": 1, "served_at": 1}))
        durs = []
        for r in rows:
            try:
                fa = datetime.fromisoformat(r.get("fired_at", ""))
                sa = datetime.fromisoformat(r.get("served_at", ""))
                durs.append((sa - fa).total_seconds())
            except Exception:
                pass
        if durs:
            avg_seconds = round(sum(durs) / len(durs))
            last_seconds = round(durs[-1])

    # Servers seen
    servers = list({o.get("server_name") for o in orders if o.get("server_name")})

    return {
        "ok": True,
        "vip": v,
        "orders": orders,
        "checkins": checkins,
        "favourites": favourites,
        "ticket_time": {"avg_seconds": avg_seconds, "last_seconds": last_seconds,
                          "ticket_count": len(ticket_ids)},
        "servers_seen": servers,
        "stats": {
            "total_orders": len(orders),
            "total_checkins": len(checkins),
            "total_spend_estimate": round(
                sum(sum((it.get("price") or 0) * (it.get("qty") or 1)
                          for it in (o.get("items") or []))
                      for o in orders), 2),
        },
    }


# ── Seed demo orders + checkins ──────────────────────────────────────────
@router.post("/api/vip-tracker/seed-orders-demo")
def seed_orders_demo():
    if db["vip_orders"].count_documents({"source": "iter242-seed"}) >= 4:
        return {"ok": True, "skipped": True}

    now = datetime.now(timezone.utc)
    rows = [
        # Sofia Novak — pescatarian, allergic to sesame
        {"vip_id": "vip-novak", "venue_slug": "outlet-rooftop",
          "server_name": "Aria K.",
          "items": [
            {"name": "Crudo de mar", "kind": "food", "qty": 1, "price": 28},
            {"name": "Black bass à la plancha", "kind": "food", "qty": 1, "price": 52},
            {"name": "Sancerre 2022 (glass)", "kind": "drink", "qty": 2, "price": 22},
          ],
          "course": "mains", "notes": "Loved the crudo — repeat",
          "created_at": (now - timedelta(hours=20)).isoformat()},
        {"vip_id": "vip-novak", "venue_slug": "outlet-garden",
          "server_name": "Aria K.",
          "items": [
            {"name": "Oat milk cappuccino", "kind": "drink", "qty": 1, "price": 7},
            {"name": "Avocado toast (no sesame)", "kind": "food", "qty": 1, "price": 18},
          ],
          "course": "breakfast", "notes": "Same as last stay",
          "created_at": (now - timedelta(hours=44)).isoformat()},
        # Marcus Reyes — dry-aged steak rare
        {"vip_id": "vip-reyes", "venue_slug": "outlet-rooftop",
          "server_name": "Theo M.",
          "items": [
            {"name": "Dry-aged ribeye 16oz (rare)", "kind": "food", "qty": 1, "price": 95},
            {"name": "Blue Label, neat", "kind": "drink", "qty": 2, "price": 38},
            {"name": "Chocolate soufflé", "kind": "food", "qty": 1, "price": 18},
          ],
          "course": "mains", "notes": "Anniversary dinner — comp dessert",
          "created_at": (now - timedelta(hours=4)).isoformat()},
        # Chidi Okafor — gluten-free / vegan dinners — note prior glitch
        {"vip_id": "vip-okafor", "venue_slug": "outlet-rooftop",
          "server_name": "Mira T.",
          "items": [
            {"name": "Roasted cauliflower steak (vegan)", "kind": "food", "qty": 1, "price": 32},
            {"name": "Quinoa salad", "kind": "food", "qty": 1, "price": 18},
            {"name": "Cold brew", "kind": "drink", "qty": 1, "price": 7},
          ],
          "course": "mains", "notes": "Make sure GF — kitchen confirmed",
          "created_at": (now - timedelta(hours=12)).isoformat()},
    ]
    for r in rows:
        r["id"] = uuid.uuid4().hex[:12]
        r["source"] = "iter242-seed"
        db["vip_orders"].insert_one(dict(r))

    # And a couple of host-stand checkins
    checkins = [
        {"vip_id": "vip-novak", "venue_slug": "outlet-rooftop", "method": "host-stand",
          "detail": "Sofia & Anton walked up at 7:55pm — 19:00 reservation",
          "created_at": (now - timedelta(hours=20, minutes=5)).isoformat()},
        {"vip_id": "vip-reyes", "venue_slug": "outlet-rooftop", "method": "host-stand",
          "detail": "Marcus & wife arrived at 7:30pm — early for 8pm",
          "created_at": (now - timedelta(hours=4, minutes=30)).isoformat()},
        {"vip_id": "vip-okafor", "venue_slug": "outlet-coastal", "method": "qr",
          "detail": "Chidi scanned QR at host stand at 12:48pm",
          "created_at": (now - timedelta(hours=12, minutes=12)).isoformat()},
    ]
    for c in checkins:
        c["id"] = uuid.uuid4().hex[:12]
        c["vip_name"] = (db["vip_guests"].find_one({"id": c["vip_id"]}, {"_id": 0}) or {}).get("display_name")
        c["source"] = "iter242-seed"
        db["vip_checkins"].insert_one(dict(c))
    return {"ok": True, "orders": len(rows), "checkins": len(checkins)}
