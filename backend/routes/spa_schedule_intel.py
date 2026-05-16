"""
Spa Schedule Intelligence
=========================
Action-oriented scheduling recommendations for spa leadership. Not a
calendar — a decisioning layer that answers:

  - Which high-value slots are unfilled and at risk?
  - Which therapists/rooms should we reassign to balance the day?
  - Which guests should we prompt to rebook into the gaps?
  - Which premium slots should we protect from discounting?
  - Which bookings can we upsell to a higher-tier service?

Endpoints:
  GET /api/spa-schedule/recommendations   — today's prioritized actions
  GET /api/spa-schedule/gaps              — exposed open slots
  GET /api/spa-schedule/premium-slots     — premium slot protection status
  GET /api/spa-schedule/upsell            — per-booking upsell opportunities
  GET /api/spa-schedule/rebalance         — therapist / room rebalancing moves
"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from database import db

router = APIRouter(prefix="/api/spa-schedule", tags=["spa-schedule"])
_now = lambda: datetime.now(timezone.utc)

# Business hours
OPEN_HOUR = 9
CLOSE_HOUR = 21           # 9am - 9pm
PREMIUM_HOURS = {10, 11, 14, 15, 17, 18}  # guest demand peak windows

def _today_iso() -> str:
    return _now().strftime("%Y-%m-%d")


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────
def _slot_grid(date_iso: str) -> List[Dict[str, Any]]:
    """Build a 30-min slot grid per room for the given date."""
    rooms = list(db["spa_rooms"].find({}, {"_id": 0}))
    bookings = list(db["spa_bookings"].find(
        {"preferred_date": date_iso, "status": {"$in": ["requested", "confirmed", "completed"]}},
        {"_id": 0}
    ))
    # Map minute slots to rooms
    slots = []
    for r in rooms:
        for hr in range(OPEN_HOUR, CLOSE_HOUR):
            for minute in (0, 30):
                start = hr * 60 + minute
                end = start + 30
                # Find booking covering this slot
                active = None
                for b in bookings:
                    if b.get("room_id") != r["id"]:
                        continue
                    try:
                        h, m = map(int, (b.get("preferred_time") or "10:00").split(":")[:2])
                    except Exception:
                        h, m = 10, 0
                    bs = h * 60 + m
                    be = bs + int(b.get("service_duration_min", 60))
                    if bs < end and be > start:
                        active = b; break
                slots.append({
                    "room_id": r["id"], "room_name": r["name"], "room_type": r.get("type", "single"),
                    "start_min": start, "end_min": end,
                    "hour": hr, "is_premium": hr in PREMIUM_HOURS,
                    "booked": active is not None,
                    "booking_id": active.get("id") if active else None,
                })
    return slots


def _therapist_load(date_iso: str) -> Dict[str, dict]:
    bookings = list(db["spa_bookings"].find(
        {"preferred_date": date_iso, "status": {"$in": ["requested", "confirmed", "completed"]}},
        {"_id": 0}
    ))
    out: Dict[str, dict] = {}
    for b in bookings:
        tid = b.get("therapist_id")
        if not tid: continue
        t = out.setdefault(tid, {"id": tid, "name": b.get("therapist_name"), "minutes": 0, "bookings": 0})
        t["minutes"] += int(b.get("service_duration_min", 60))
        t["bookings"] += 1
    therapists = list(db["spa_therapists"].find({}, {"_id": 0}))
    for t in therapists:
        x = out.setdefault(t["id"], {"id": t["id"], "name": t["name"], "minutes": 0, "bookings": 0})
        x["specialties"] = t.get("specialties", [])
        x["request_ratio"] = t.get("request_ratio", 0.5)
        x["utilization"] = round(min(1.0, x["minutes"] / (10 * 60)), 3)
    return out


# ─────────────────────────────────────────────
# /gaps — open slots with exposure score
# ─────────────────────────────────────────────
@router.get("/gaps")
async def gaps(date: str = ""):
    date = date or _today_iso()
    grid = _slot_grid(date)
    open_slots = [s for s in grid if not s["booked"]]
    premium_open = [s for s in open_slots if s["is_premium"]]
    non_premium_open = [s for s in open_slots if not s["is_premium"]]
    # Aggregate by hour
    by_hour: Dict[int, int] = {}
    for s in open_slots:
        by_hour[s["hour"]] = by_hour.get(s["hour"], 0) + 1
    # Exposure score — premium slots weight 3x
    score = len(premium_open) * 3 + len(non_premium_open)
    return {
        "date": date,
        "open_slot_count": len(open_slots),
        "premium_open": len(premium_open),
        "non_premium_open": len(non_premium_open),
        "exposure_score": score,
        "by_hour": [{"hour": h, "open_slots": by_hour.get(h, 0)} for h in range(OPEN_HOUR, CLOSE_HOUR)],
        "premium_hours": sorted(PREMIUM_HOURS),
    }


# ─────────────────────────────────────────────
# /premium-slots — protection status
# ─────────────────────────────────────────────
@router.get("/premium-slots")
async def premium_slots(date: str = ""):
    date = date or _today_iso()
    grid = _slot_grid(date)
    premium = [s for s in grid if s["is_premium"]]
    filled = [s for s in premium if s["booked"]]
    open_premium = [s for s in premium if not s["booked"]]
    fill_rate = (len(filled) / len(premium)) if premium else 0
    return {
        "date": date,
        "total_premium_slots": len(premium),
        "filled": len(filled),
        "open": len(open_premium),
        "fill_rate": round(fill_rate, 3),
        "protection_status": "tight" if fill_rate > 0.8 else "ok" if fill_rate > 0.5 else "exposed",
        "open_slots_sample": [
            {"room": s["room_name"], "hour": s["hour"],
             "time": f"{s['hour']:02d}:{'30' if s['start_min']%60 else '00'}"}
            for s in open_premium[:12]
        ],
    }


# ─────────────────────────────────────────────
# /upsell — bookings that can be upgraded
# ─────────────────────────────────────────────
UPSELL_RULES = [
    # (from_category, from_keyword_substr, to_service_name_substr, rationale)
    ("massage",  "swedish",        "hot stone",      "Upgrade Swedish → Hot Stone for +$80 and higher guest delight."),
    ("massage",  "deep tissue",    "sports",         "Deep Tissue guests often upgrade to Sports therapy add-on."),
    ("facial",   "hydrating",      "gold luminosity", "Upgrade Hydrating → Gold Luminosity for premium guest profile."),
    ("body",     "sea salt",       "hydrotherapy",   "Add 30-min hydrotherapy soak for +$45."),
]


@router.get("/upsell")
async def upsell(date: str = ""):
    date = date or _today_iso()
    bookings = list(db["spa_bookings"].find(
        {"preferred_date": date, "status": {"$in": ["requested", "confirmed"]}},
        {"_id": 0},
    ))
    services = {s["id"]: s for s in db["spa_services"].find({}, {"_id": 0})}
    recs = []
    for b in bookings:
        svc = services.get(b.get("service_id"))
        if not svc: continue
        sname = (svc.get("name") or "").lower()
        cat = svc.get("category", "")
        for from_cat, from_kw, to_kw, rationale in UPSELL_RULES:
            if cat == from_cat and from_kw in sname:
                # find a matching target service
                target = None
                for tsvc in services.values():
                    if to_kw in (tsvc.get("name") or "").lower() and tsvc.get("active", True):
                        target = tsvc; break
                if target and target["id"] != svc["id"]:
                    uplift = (target.get("price", 0) or 0) - (svc.get("price", 0) or 0)
                    if uplift > 0:
                        recs.append({
                            "booking_id": b["id"],
                            "guest": b.get("guest", {}).get("name"),
                            "room_number": b.get("guest", {}).get("room_number"),
                            "current": {"id": svc["id"], "name": svc["name"], "price": svc.get("price")},
                            "suggested": {"id": target["id"], "name": target["name"], "price": target.get("price")},
                            "uplift_usd": round(uplift, 2),
                            "rationale": rationale,
                        })
                break
    recs.sort(key=lambda r: -r["uplift_usd"])
    total = sum(r["uplift_usd"] for r in recs)
    return {"date": date, "recommendations": recs, "count": len(recs), "potential_revenue": round(total, 2)}


# ─────────────────────────────────────────────
# /rebalance — therapist / room rebalancing moves
# ─────────────────────────────────────────────
@router.get("/rebalance")
async def rebalance(date: str = ""):
    date = date or _today_iso()
    load = _therapist_load(date)
    loads_list = list(load.values())
    loads_list.sort(key=lambda t: t.get("utilization", 0))
    if len(loads_list) < 2:
        return {"date": date, "moves": [], "note": "Not enough therapists to rebalance."}
    high = [t for t in loads_list if t.get("utilization", 0) > 0.85]
    low = [t for t in loads_list if t.get("utilization", 0) < 0.35]
    moves = []
    # Suggest shifting from overloaded to underloaded
    for hi in high:
        for lo in low:
            shared = set(hi.get("specialties", [])) & set(lo.get("specialties", []))
            if not shared:
                continue
            moves.append({
                "from_therapist": {"id": hi["id"], "name": hi["name"], "util": hi["utilization"]},
                "to_therapist": {"id": lo["id"], "name": lo["name"], "util": lo["utilization"]},
                "compatible_categories": sorted(shared),
                "suggestion": f"Reassign 1 {list(shared)[0]} booking from {hi['name']} to {lo['name']} — balances load.",
            })
            break
    # Under-requested therapists may need coaching
    coach = [{"id": t["id"], "name": t["name"], "request_ratio": t.get("request_ratio", 0.5)}
             for t in loads_list if t.get("request_ratio", 1) < 0.55]
    return {
        "date": date,
        "moves": moves,
        "under_requested_therapists": coach,
        "over_utilized_count": len(high),
        "under_utilized_count": len(low),
    }


# ─────────────────────────────────────────────
# /recommendations — combined prioritized action feed
# ─────────────────────────────────────────────
@router.get("/recommendations")
async def recommendations(date: str = ""):
    date = date or _today_iso()
    g = await gaps(date); p = await premium_slots(date)
    u = await upsell(date); r = await rebalance(date)
    out: List[dict] = []
    # Gap recommendations
    if g["premium_open"] >= 3:
        out.append({
            "kind": "fill_gap", "severity": "high",
            "title": f"{g['premium_open']} premium slots unfilled",
            "action": "Trigger same-day VIP/in-house push with premium upgrade offer",
            "value": {"premium_open": g["premium_open"]},
        })
    elif g["premium_open"] > 0:
        out.append({
            "kind": "fill_gap", "severity": "warn",
            "title": f"{g['premium_open']} premium slot(s) still open",
            "action": "Reach out to top 5 rebook candidates",
        })
    if g["non_premium_open"] >= 8:
        out.append({
            "kind": "fill_gap", "severity": "warn",
            "title": f"{g['non_premium_open']} off-peak slots open",
            "action": "Drop a 15% weekday discount to in-house guests",
        })
    # Premium protection
    if p["protection_status"] == "exposed":
        out.append({
            "kind": "protect_premium", "severity": "warn",
            "title": f"Premium slot fill-rate {int(p['fill_rate']*100)}% — exposed",
            "action": "Hold remaining premium slots off discount promotions.",
        })
    # Upsell
    if u["count"]:
        out.append({
            "kind": "upsell", "severity": "info",
            "title": f"{u['count']} upsell opportunities · ${int(u['potential_revenue'])} potential",
            "action": "Prompt therapists at check-in to offer upgrade.",
            "value": {"potential_revenue": u["potential_revenue"]},
        })
    # Rebalance
    for m in r["moves"][:3]:
        out.append({
            "kind": "rebalance", "severity": "info",
            "title": f"Rebalance · {m['from_therapist']['name']} → {m['to_therapist']['name']}",
            "action": m["suggestion"],
        })
    if r["under_requested_therapists"]:
        out.append({
            "kind": "coach", "severity": "info",
            "title": f"{len(r['under_requested_therapists'])} therapist(s) below request-ratio target",
            "action": "Schedule coaching / assign easier mix this week.",
        })
    if not out:
        out.append({"kind": "info", "severity": "info", "title": "Schedule optimized", "action": "No scheduling interventions needed."})
    return {
        "date": date,
        "recommendations": out,
        "count": len(out),
        "summary": {
            "open_slots": g["open_slot_count"],
            "premium_open": g["premium_open"],
            "upsell_potential": u["potential_revenue"],
            "rebalance_moves": len(r["moves"]),
        },
    }
