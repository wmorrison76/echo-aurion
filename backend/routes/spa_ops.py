"""
Spa Operations KPI Engine
=========================
The "operating brain" above scheduling: turns spa_services, spa_bookings,
and pos_outbound into live operational intelligence.

Endpoints:
  GET /api/spa-ops/kpis/today        — today's revenue / bookings / utilization / ATR
  GET /api/spa-ops/kpis/trends       — time-series (default 14 days)
  GET /api/spa-ops/utilization       — room + therapist utilization with daypart buckets
  GET /api/spa-ops/guest-intel       — VIPs, in-house guests, preferences, cross-sell
  GET /api/spa-ops/staff             — therapist productivity + labor
  GET /api/spa-ops/retail            — attachment rate + low stock
  GET /api/spa-ops/memberships       — active members, renewals, redemption pace, liability
  GET /api/spa-ops/reputation        — NPS, recovery queue, no-show reasons
  GET /api/spa-ops/actions           — action feed (alerts + recommendations)
  POST /api/spa-ops/seed-demo        — seed demo data (therapists, rooms, membership, inventory, feedback)
"""
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import random

from database import db

router = APIRouter(prefix="/api/spa-ops", tags=["spa-ops"])
_now = lambda: datetime.now(timezone.utc)


# ─────────────────────────────────────────────
# Seed: therapists, rooms, memberships, retail, feedback
# ─────────────────────────────────────────────
THERAPISTS_COLL = "spa_therapists"
ROOMS_COLL = "spa_rooms"
MEMBERS_COLL = "spa_members"
RETAIL_COLL = "spa_retail_items"
FEEDBACK_COLL = "spa_feedback"


def _seed_demo():
    state_now = {
        "therapists": db[THERAPISTS_COLL].count_documents({}),
        "rooms": db[ROOMS_COLL].count_documents({}),
        "members": db[MEMBERS_COLL].count_documents({}),
        "retail_items": db[RETAIL_COLL].count_documents({}),
        "feedback": db[FEEDBACK_COLL].count_documents({}),
    }
    if all(v > 0 for v in state_now.values()):
        return False
    therapists = [
        {"id": "ther-1", "name": "Marisol Reyes", "specialties": ["massage", "facial"], "hourly_cost": 42, "request_ratio": 0.72, "certifications": ["LMT", "Esthetician"]},
        {"id": "ther-2", "name": "Jamal Chen",    "specialties": ["massage", "body"],   "hourly_cost": 38, "request_ratio": 0.68, "certifications": ["LMT"]},
        {"id": "ther-3", "name": "Anya Volkov",   "specialties": ["facial", "nails"],   "hourly_cost": 35, "request_ratio": 0.55, "certifications": ["Esthetician"]},
        {"id": "ther-4", "name": "David Kim",     "specialties": ["massage"],           "hourly_cost": 40, "request_ratio": 0.61, "certifications": ["LMT", "Sports therapy"]},
        {"id": "ther-5", "name": "Priya Desai",   "specialties": ["body", "facial", "package"], "hourly_cost": 46, "request_ratio": 0.81, "certifications": ["LMT", "Ayurvedic"]},
    ]
    rooms = [
        {"id": "rm-1",  "name": "Zen Suite 1",   "type": "couples", "capacity": 2, "features": ["couples", "soaking tub"]},
        {"id": "rm-2",  "name": "Zen Suite 2",   "type": "couples", "capacity": 2, "features": ["couples"]},
        {"id": "rm-3",  "name": "Treatment 1",   "type": "single",  "capacity": 1, "features": []},
        {"id": "rm-4",  "name": "Treatment 2",   "type": "single",  "capacity": 1, "features": []},
        {"id": "rm-5",  "name": "Treatment 3",   "type": "single",  "capacity": 1, "features": []},
        {"id": "rm-6",  "name": "Facial Bar A",  "type": "facial",  "capacity": 1, "features": ["led"]},
        {"id": "rm-7",  "name": "Facial Bar B",  "type": "facial",  "capacity": 1, "features": ["led"]},
        {"id": "rm-8",  "name": "Hydrotherapy",  "type": "hydro",   "capacity": 1, "features": ["vichy shower"]},
    ]
    members = [
        {"id": f"mem-{i}", "name": name, "tier": tier, "joined_at": (_now() - timedelta(days=random.randint(30, 730))).isoformat(),
         "renews_at": (_now() + timedelta(days=random.randint(-12, 90))).isoformat(),
         "monthly_fee": fee, "credits_remaining": creds, "credits_total": creds + random.randint(0, 4),
         "auto_renew": bool(random.getrandbits(1))}
        for i, (name, tier, fee, creds) in enumerate([
            ("Jane Morrison", "Platinum", 225, 2),
            ("Carlos Reyes", "Gold", 165, 1),
            ("Ava Stone", "Platinum", 225, 3),
            ("Marcus Greene", "Silver", 95, 0),
            ("Leila Park", "Gold", 165, 4),
            ("Noah Patel", "Silver", 95, 2),
            ("Sofia Vargas", "Platinum", 225, 1),
            ("Ethan Wu", "Gold", 165, 0),
            ("Maya Lin", "Silver", 95, 3),
            ("Owen Briggs", "Gold", 165, 2),
        ])
    ]
    retail = [
        {"id": "ri-1", "name": "Signature Body Oil 200ml", "brand": "LUCCCA", "stock": 18, "reorder_at": 8,  "price": 68, "cost": 22, "sold_30d": 14},
        {"id": "ri-2", "name": "Gold Renewal Serum 30ml",  "brand": "LUCCCA", "stock": 5,  "reorder_at": 10, "price": 145,"cost": 52, "sold_30d": 22},
        {"id": "ri-3", "name": "Bath Salt Sampler",         "brand": "LUCCCA", "stock": 42, "reorder_at": 15, "price": 35, "cost": 12, "sold_30d": 9},
        {"id": "ri-4", "name": "Silk Eye Mask",             "brand": "LUCCCA", "stock": 12, "reorder_at": 10, "price": 48, "cost": 18, "sold_30d": 7},
        {"id": "ri-5", "name": "Hair Treatment Mask",       "brand": "LUCCCA", "stock": 3,  "reorder_at": 12, "price": 62, "cost": 20, "sold_30d": 18},
    ]
    # Feedback
    today = _now()
    feedback = []
    reasons_no_show = ["forgot", "travel delay", "feeling unwell", "confused about time", "overbooked self"]
    for i in range(30):
        d = today - timedelta(days=random.randint(0, 28))
        nps = random.choice([10, 10, 9, 10, 9, 8, 10, 7, 9, 10, 6, 9, 3, 8])
        feedback.append({
            "id": f"fb-{i}", "created_at": d.isoformat(),
            "nps": nps,
            "guest_name": random.choice(["Jane M.", "Carlos R.", "Ava S.", "Marcus G.", "Leila P.", "Noah P.", "Sofia V."]),
            "service_name": random.choice(["Swedish Massage", "Gold Luminosity Facial", "Deep Tissue Massage", "Hydrating Facial", "Hot Stone"]),
            "comment": random.choice([
                "Amazing experience, Marisol is a magician.",
                "Loved it — will rebook.",
                "Room was too cold.",
                "A bit rushed at checkout.",
                "Best facial I've had in years.",
                "Therapist didn't feel as strong as I asked for.",
                "Perfect, see you next visit.",
                "",
            ]),
            "needs_recovery": nps <= 6,
            "resolved": False,
        })
    db[THERAPISTS_COLL].insert_many(therapists) if state_now["therapists"] == 0 else None
    db[ROOMS_COLL].insert_many(rooms) if state_now["rooms"] == 0 else None
    db[MEMBERS_COLL].insert_many(members) if state_now["members"] == 0 else None
    db[RETAIL_COLL].insert_many(retail) if state_now["retail_items"] == 0 else None
    db[FEEDBACK_COLL].insert_many(feedback) if state_now["feedback"] == 0 else None
    return True


@router.post("/seed-demo")
async def seed_demo():
    created = _seed_demo()
    return {"seeded": created, "state": {
        "therapists": db[THERAPISTS_COLL].count_documents({}),
        "rooms": db[ROOMS_COLL].count_documents({}),
        "members": db[MEMBERS_COLL].count_documents({}),
        "retail_items": db[RETAIL_COLL].count_documents({}),
        "feedback": db[FEEDBACK_COLL].count_documents({}),
    }}


def _ensure_seed():
    _seed_demo()


# ─────────────────────────────────────────────
# Utility — synthesize realistic bookings if sparse
# (keeps the dashboard meaningful without depending on live traffic)
# ─────────────────────────────────────────────
def _synth_bookings_if_needed():
    """Create 30 days of randomized bookings across existing services/therapists/rooms if empty."""
    if db["spa_bookings"].count_documents({}) >= 50:
        return
    services = list(db["spa_services"].find({}, {"_id": 0}))
    if not services:
        return
    therapists = list(db[THERAPISTS_COLL].find({}, {"_id": 0})) or [{"id": "ther-x", "name": "Staff"}]
    rooms = list(db[ROOMS_COLL].find({}, {"_id": 0})) or [{"id": "rm-x", "name": "Room"}]
    now = _now()
    bookings = []
    statuses = ["completed"] * 60 + ["no_show"] * 6 + ["cancelled"] * 6 + ["confirmed"] * 10 + ["requested"] * 8
    for d_off in range(-28, 8):
        day = now + timedelta(days=d_off)
        day_count = random.randint(8, 22)
        for _ in range(day_count):
            svc = random.choice(services)
            th = random.choice([t for t in therapists if svc["category"] in t.get("specialties", []) or "massage" in t.get("specialties", [])] or therapists)
            rm = random.choice(rooms)
            hr = random.choices(range(8, 20), weights=[1, 2, 3, 5, 6, 7, 6, 5, 4, 4, 3, 2])[0]
            status = random.choice(statuses) if d_off < 0 else random.choice(["requested", "confirmed", "confirmed"])
            retail_add = random.random() < 0.35 and status == "completed"
            bookings.append({
                "id": f"bk-synth-{uuid4().hex[:8]}",
                "hotel_slug": "sunset-resort",
                "service_id": svc["id"],
                "service_name": svc["name"],
                "service_category": svc["category"],
                "service_duration_min": svc["duration_min"],
                "service_price": svc["price"],
                "therapist_id": th["id"], "therapist_name": th["name"],
                "room_id": rm["id"], "room_name": rm["name"],
                "guest": {"name": random.choice(["Jane M.", "Carlos R.", "Ava S.", "Priya D.", "Ethan W.", "Sofia V.", "Owen B.", "Leila P.", "Noah P."]),
                          "email": "guest@example.com",
                          "is_in_house": random.random() < 0.55,
                          "is_vip": random.random() < 0.12,
                          "room_number": str(random.randint(200, 720))},
                "preferred_date": day.strftime("%Y-%m-%d"),
                "preferred_time": f"{hr:02d}:{random.choice(['00','15','30','45'])}",
                "scheduled_at": day.replace(hour=hr, minute=random.choice([0, 15, 30, 45])).isoformat(),
                "status": status,
                "retail_attached": retail_add,
                "retail_amount": round(random.uniform(32, 180), 2) if retail_add else 0,
                "tip": round(svc["price"] * random.uniform(0.1, 0.25), 2) if status == "completed" else 0,
                "created_at": (day - timedelta(days=random.randint(0, 5))).isoformat(),
                "confirmation_code": f"SPA-{uuid4().hex[:6].upper()}",
            })
    if bookings:
        db["spa_bookings"].insert_many(bookings)


# ─────────────────────────────────────────────
# KPIs
# ─────────────────────────────────────────────
def _daypart(hour: int) -> str:
    if hour < 11: return "morning"
    if hour < 15: return "midday"
    if hour < 19: return "afternoon"
    return "evening"


@router.get("/kpis/today")
async def kpis_today():
    _ensure_seed(); _synth_bookings_if_needed()
    today = _now().strftime("%Y-%m-%d")
    all_today = list(db["spa_bookings"].find({"preferred_date": today}, {"_id": 0}))
    completed = [b for b in all_today if b["status"] == "completed"]
    no_show = [b for b in all_today if b["status"] == "no_show"]
    cancelled = [b for b in all_today if b["status"] == "cancelled"]

    revenue_today = sum(b.get("service_price", 0) for b in completed) + sum(b.get("retail_amount", 0) for b in completed) + sum(b.get("tip", 0) for b in completed)
    service_revenue = sum(b.get("service_price", 0) for b in completed)
    retail_revenue = sum(b.get("retail_amount", 0) for b in completed)
    tips = sum(b.get("tip", 0) for b in completed)
    atr = (service_revenue / len(completed)) if completed else 0

    # Treatment-room utilization
    rooms = list(db[ROOMS_COLL].find({}, {"_id": 0}))
    room_minutes_available = len(rooms) * 12 * 60  # 8am-8pm
    room_minutes_used = sum(b.get("service_duration_min", 60) for b in completed + all_today if b["status"] in ("completed", "confirmed"))
    room_util = min(1.0, room_minutes_used / max(room_minutes_available, 1))

    # Therapist util
    therapists = list(db[THERAPISTS_COLL].find({}, {"_id": 0}))
    th_minutes_available = len(therapists) * 10 * 60
    th_minutes_used = sum(b.get("service_duration_min", 60) for b in completed + all_today if b["status"] in ("completed", "confirmed"))
    therapist_util = min(1.0, th_minutes_used / max(th_minutes_available, 1))

    # Retail attachment rate
    retail_rate = (sum(1 for b in completed if b.get("retail_attached")) / len(completed)) if completed else 0

    # Guest count
    unique_guests = len({b.get("guest", {}).get("name") for b in completed if b.get("guest", {}).get("name")})
    rev_per_guest = (revenue_today / unique_guests) if unique_guests else 0

    # VIP + in-house counts
    vip_today = sum(1 for b in all_today if b.get("guest", {}).get("is_vip"))
    inhouse_today = sum(1 for b in all_today if b.get("guest", {}).get("is_in_house"))

    return {
        "date": today,
        "bookings": {
            "total": len(all_today),
            "completed": len(completed),
            "no_show": len(no_show),
            "cancelled": len(cancelled),
            "upcoming_today": sum(1 for b in all_today if b["status"] in ("confirmed", "requested")),
            "vip_today": vip_today,
            "in_house_today": inhouse_today,
        },
        "revenue": {
            "total": round(revenue_today, 2),
            "services": round(service_revenue, 2),
            "retail": round(retail_revenue, 2),
            "tips": round(tips, 2),
            "avg_treatment_rate": round(atr, 2),
            "revenue_per_guest": round(rev_per_guest, 2),
        },
        "utilization": {
            "treatment_room": round(room_util, 3),
            "therapist": round(therapist_util, 3),
            "rooms_total": len(rooms),
            "therapists_total": len(therapists),
        },
        "rates": {
            "retail_attachment": round(retail_rate, 3),
            "no_show_rate": round(len(no_show) / max(len(all_today), 1), 3),
            "cancellation_rate": round(len(cancelled) / max(len(all_today), 1), 3),
        },
    }


@router.get("/kpis/trends")
async def kpis_trends(days: int = Query(14, ge=1, le=90)):
    _ensure_seed(); _synth_bookings_if_needed()
    end = _now(); start = end - timedelta(days=days - 1)
    out: List[dict] = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        items = list(db["spa_bookings"].find({"preferred_date": d}, {"_id": 0}))
        completed = [b for b in items if b["status"] == "completed"]
        rev = sum(b.get("service_price", 0) + b.get("retail_amount", 0) + b.get("tip", 0) for b in completed)
        out.append({
            "date": d,
            "bookings": len(items),
            "completed": len(completed),
            "revenue": round(rev, 2),
            "atr": round((sum(b.get("service_price", 0) for b in completed) / max(len(completed), 1)), 2),
            "no_shows": sum(1 for b in items if b["status"] == "no_show"),
        })
    return {"days": days, "points": out}


@router.get("/utilization")
async def utilization():
    _ensure_seed(); _synth_bookings_if_needed()
    today = _now().strftime("%Y-%m-%d")
    items = list(db["spa_bookings"].find({"preferred_date": today, "status": {"$in": ["completed", "confirmed", "requested"]}}, {"_id": 0}))
    rooms = {r["id"]: {"id": r["id"], "name": r.get("name", "Room"), "type": r.get("type", "single"), "minutes_used": 0, "bookings": 0}
             for r in db[ROOMS_COLL].find({}, {"_id": 0}) if r.get("id")}
    therapists = {t["id"]: {"id": t["id"], "name": t.get("name", "Staff"), "minutes_used": 0, "bookings": 0, "revenue": 0,
                            "request_ratio": t.get("request_ratio", 0.5)}
                  for t in db[THERAPISTS_COLL].find({}, {"_id": 0}) if t.get("id")}
    daypart_counts = {"morning": 0, "midday": 0, "afternoon": 0, "evening": 0}
    for b in items:
        rid = b.get("room_id"); tid = b.get("therapist_id")
        dur = b.get("service_duration_min", 60)
        try: hr = int(b.get("preferred_time", "10:00").split(":")[0])
        except: hr = 10
        daypart_counts[_daypart(hr)] += 1
        if rid in rooms:
            rooms[rid]["minutes_used"] += dur; rooms[rid]["bookings"] += 1
        if tid in therapists:
            therapists[tid]["minutes_used"] += dur; therapists[tid]["bookings"] += 1
            therapists[tid]["revenue"] += b.get("service_price", 0)
    for r in rooms.values():
        r["utilization"] = round(min(1.0, r["minutes_used"] / (12 * 60)), 3)
    for t in therapists.values():
        t["utilization"] = round(min(1.0, t["minutes_used"] / (10 * 60)), 3)
        t["revenue"] = round(t["revenue"], 2)
    return {
        "rooms": list(rooms.values()),
        "therapists": list(therapists.values()),
        "daypart_mix": daypart_counts,
    }


@router.get("/guest-intel")
async def guest_intel():
    _ensure_seed(); _synth_bookings_if_needed()
    today = _now().strftime("%Y-%m-%d")
    items = list(db["spa_bookings"].find({"preferred_date": today}, {"_id": 0}))
    vip = [b for b in items if b.get("guest", {}).get("is_vip")]
    in_house = [b for b in items if b.get("guest", {}).get("is_in_house")]
    # rebooking prompts — last completed guests who haven't returned in 45d
    cutoff = (_now() - timedelta(days=45)).isoformat()
    past = list(db["spa_bookings"].find({"status": "completed", "created_at": {"$lte": cutoff}}, {"_id": 0}).limit(200))
    rebook_prompts = []
    seen = set()
    for b in past[-40:]:
        g = b.get("guest", {}).get("name")
        if g and g not in seen:
            seen.add(g)
            rebook_prompts.append({"guest": g, "last_service": b.get("service_name"), "last_at": b.get("scheduled_at"), "suggest": b.get("service_name")})
    return {
        "vip_today": [{"guest": b.get("guest", {}).get("name"), "service": b.get("service_name"),
                       "time": b.get("preferred_time"), "room": b.get("room_number") or b.get("guest", {}).get("room_number")} for b in vip],
        "in_house_today": [{"guest": b.get("guest", {}).get("name"), "service": b.get("service_name"),
                            "room": b.get("guest", {}).get("room_number")} for b in in_house[:20]],
        "rebook_prompts": rebook_prompts[:8],
        "counts": {"vip": len(vip), "in_house": len(in_house), "rebook_candidates": len(rebook_prompts)},
    }


@router.get("/staff")
async def staff():
    _ensure_seed(); _synth_bookings_if_needed()
    therapists = list(db[THERAPISTS_COLL].find({}, {"_id": 0}))
    today = _now().strftime("%Y-%m-%d")
    items = list(db["spa_bookings"].find({"preferred_date": today}, {"_id": 0}))
    by_th: dict = {}
    for b in items:
        tid = b.get("therapist_id")
        if not tid: continue
        t = by_th.setdefault(tid, {"id": tid, "name": b.get("therapist_name", ""), "bookings_today": 0, "minutes": 0, "revenue_today": 0, "tip_today": 0, "no_shows": 0})
        t["bookings_today"] += 1
        t["minutes"] += b.get("service_duration_min", 60)
        if b["status"] == "completed":
            t["revenue_today"] += b.get("service_price", 0)
            t["tip_today"] += b.get("tip", 0)
        if b["status"] == "no_show":
            t["no_shows"] += 1
    # Merge request_ratio + hourly_cost
    for t in therapists:
        x = by_th.get(t["id"], {"id": t["id"], "name": t["name"], "bookings_today": 0, "minutes": 0, "revenue_today": 0, "tip_today": 0, "no_shows": 0})
        x["name"] = t["name"]
        x["utilization"] = round(min(1.0, x["minutes"] / (10 * 60)), 3)
        x["hourly_cost"] = t.get("hourly_cost", 38)
        x["request_ratio"] = t.get("request_ratio", 0.5)
        x["labor_cost_today"] = round(x["minutes"] / 60 * x["hourly_cost"], 2)
        x["specialties"] = t.get("specialties", [])
        by_th[t["id"]] = x
    rows = list(by_th.values())
    total_rev = sum(r["revenue_today"] for r in rows)
    total_labor = sum(r["labor_cost_today"] for r in rows)
    return {
        "rows": rows,
        "totals": {
            "revenue_today": round(total_rev, 2),
            "labor_cost_today": round(total_labor, 2),
            "labor_to_revenue_ratio": round(total_labor / total_rev, 3) if total_rev else 0,
        },
    }


@router.get("/retail")
async def retail():
    _ensure_seed()
    items = list(db[RETAIL_COLL].find({}, {"_id": 0}))
    for it in items:
        it["low_stock"] = it["stock"] <= it["reorder_at"]
        it["margin_pct"] = round((it["price"] - it["cost"]) / it["price"], 3)
        it["revenue_30d"] = round(it["price"] * it["sold_30d"], 2)
    low = [i for i in items if i["low_stock"]]
    today = _now().strftime("%Y-%m-%d")
    completed = list(db["spa_bookings"].find({"preferred_date": today, "status": "completed"}, {"_id": 0}))
    attached = sum(1 for b in completed if b.get("retail_attached"))
    attachment_rate = attached / len(completed) if completed else 0
    return {
        "items": items,
        "low_stock": low,
        "attachment_rate_today": round(attachment_rate, 3),
        "retail_revenue_today": round(sum(b.get("retail_amount", 0) for b in completed if b.get("retail_attached")), 2),
    }


@router.get("/memberships")
async def memberships():
    _ensure_seed()
    members = list(db[MEMBERS_COLL].find({}, {"_id": 0}))
    now = _now()
    active = len(members)
    renewing_soon = 0; overdue = 0
    for m in members:
        try:
            rn = datetime.fromisoformat(m["renews_at"].replace("Z", "+00:00"))
            delta = (rn - now).days
            if delta < 0: overdue += 1
            elif delta <= 30: renewing_soon += 1
        except Exception:
            pass
    liability_credits = sum(m.get("credits_remaining", 0) for m in members)
    mrr = sum(m.get("monthly_fee", 0) for m in members)
    redemption_rate = (
        sum(m["credits_total"] - m["credits_remaining"] for m in members) /
        max(sum(m["credits_total"] for m in members), 1)
    )
    return {
        "members": members,
        "totals": {
            "active": active,
            "renewing_soon": renewing_soon,
            "overdue": overdue,
            "liability_credits": liability_credits,
            "monthly_recurring_revenue": round(mrr, 2),
            "redemption_rate": round(redemption_rate, 3),
        },
    }


@router.get("/reputation")
async def reputation():
    _ensure_seed()
    feedback = list(db[FEEDBACK_COLL].find({}, {"_id": 0}).sort("created_at", -1).limit(60))
    if not feedback:
        return {"nps": None, "responses": 0, "feedback": [], "recovery_queue": []}
    promoters = sum(1 for f in feedback if f["nps"] >= 9)
    passives = sum(1 for f in feedback if 7 <= f["nps"] <= 8)
    detractors = sum(1 for f in feedback if f["nps"] <= 6)
    nps = round((promoters / len(feedback) - detractors / len(feedback)) * 100, 1)
    recovery = [f for f in feedback if f["nps"] <= 6 and not f.get("resolved")]
    return {
        "nps": nps,
        "responses": len(feedback),
        "promoters": promoters, "passives": passives, "detractors": detractors,
        "feedback": feedback[:12],
        "recovery_queue": recovery,
    }


@router.get("/actions")
async def actions():
    _ensure_seed(); _synth_bookings_if_needed()
    out = []
    k = await kpis_today()
    if k["utilization"]["treatment_room"] < 0.35:
        out.append({"kind": "alert", "severity": "warn", "msg": f"Treatment-room utilization is {int(k['utilization']['treatment_room']*100)}% — push same-day promo to in-house guests."})
    if k["utilization"]["treatment_room"] > 0.88:
        out.append({"kind": "alert", "severity": "info", "msg": "Rooms >88% booked — protect premium slots, consider yield uplift."})
    if k["rates"]["no_show_rate"] > 0.08:
        out.append({"kind": "alert", "severity": "warn", "msg": f"No-show rate {int(k['rates']['no_show_rate']*100)}% is above 8% — activate 24h reminder flow."})
    if k["rates"]["retail_attachment"] < 0.2:
        out.append({"kind": "recommend", "severity": "info", "msg": "Retail attachment below 20% — prompt therapists to recommend one take-home product."})
    # Memberships near renewal
    mem = await memberships()
    if mem["totals"]["renewing_soon"]:
        out.append({"kind": "recommend", "severity": "info", "msg": f"{mem['totals']['renewing_soon']} members renewing within 30 days — send renewal appreciation offer."})
    if mem["totals"]["overdue"]:
        out.append({"kind": "alert", "severity": "warn", "msg": f"{mem['totals']['overdue']} memberships overdue — trigger win-back workflow."})
    # Low stock
    rt = await retail()
    if rt["low_stock"]:
        out.append({"kind": "alert", "severity": "warn", "msg": f"{len(rt['low_stock'])} retail SKUs at/below reorder point."})
    # Reputation
    rep = await reputation()
    if rep["recovery_queue"]:
        out.append({"kind": "alert", "severity": "high", "msg": f"{len(rep['recovery_queue'])} detractor guests awaiting recovery outreach."})
    if rep["nps"] is not None and rep["nps"] < 50:
        out.append({"kind": "alert", "severity": "warn", "msg": f"NPS trending at {rep['nps']} — audit service consistency."})
    if not out:
        out.append({"kind": "info", "severity": "info", "msg": "All targets green. Good day to push premium-tier upgrades."})
    return {"actions": out, "count": len(out)}
