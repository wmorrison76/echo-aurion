"""
iter173 · Phase 2 — Lifestyle Command Dashboard

Resort-wide experience orchestration. Drives revenue activations, guest
engagement, membership value, outlet cross-traffic, and brand identity.

Owned by Director of Lifestyle. Replaces fragmented tools (Outlook calendars,
Tripleseat fragments, marketing spreadsheets) with a single Experience
Operating Layer.

Routes under `/api/lifestyle/*`.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/lifestyle", tags=["lifestyle-dashboard"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


ACTIVATION_CATEGORIES = [
    "wellness", "culinary", "mixology", "family", "member-exclusive",
    "holiday", "pool", "marina", "spa-crossover", "sunset-ritual",
    "fitness", "brand-partnership", "employee-culture", "seasonal",
    "cultural", "sommelier", "kids", "teen", "couples", "other",
]

AUDIENCE_TAGS = [
    "all-guests", "vip", "members", "residents", "transient", "families",
    "couples", "kids", "teens", "adults-only", "wellness-seekers",
    "foodies", "employees", "brand-partners",
]

REVENUE_MODELS = [
    "paid",              # ticketed/chargeable
    "complimentary",     # free guest experience
    "member-included",   # bundled w/ membership
    "upsell-driven",     # free event → revenue conversion
    "sponsored",         # vendor-paid
]


class Activation(BaseModel):
    id: Optional[str] = None
    title: str
    category: str = "other"
    description: Optional[str] = None
    date: str              # YYYY-MM-DD
    start_time: str = "18:00"   # HH:MM
    end_time: str = "19:00"
    location: str = "Main pool deck"
    rain_backup_location: Optional[str] = None
    weather_sensitive: bool = False

    audience: List[str] = Field(default_factory=lambda: ["all-guests"])
    capacity: int = 50
    expected_attendance: Optional[int] = None

    revenue_model: str = "complimentary"
    ticket_price: float = 0.0
    revenue_target: float = 0.0
    engagement_target: Optional[str] = None

    # Cross-department requirements (feeds the Activation Builder)
    requires_departments: List[str] = Field(default_factory=list)
    setup_minutes: int = 30
    staffing_notes: Optional[str] = None
    equipment_needs: List[str] = Field(default_factory=list)
    vendor_needs: List[str] = Field(default_factory=list)

    owner_employee_id: Optional[str] = None  # Director of Lifestyle or coordinator
    status: str = "planned"  # planned | confirmed | in-progress | completed | cancelled

    # Outcome (filled post-event)
    actual_attendance: Optional[int] = None
    actual_revenue: Optional[float] = None
    conversion_notes: Optional[str] = None  # "+14 covers at Sotogrande that night"
    social_engagement: Optional[int] = None  # proxy count

    property: Optional[str] = "main"


# ─── Upsert ────────────────────────────────────────────────────────────────
@router.post("/activations/upsert")
async def upsert_activation(a: Activation, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if a.category not in ACTIVATION_CATEGORIES:
        raise HTTPException(400, f"unknown category '{a.category}'")
    if a.revenue_model not in REVENUE_MODELS:
        raise HTTPException(400, f"unknown revenue_model '{a.revenue_model}'")
    try: datetime.strptime(a.date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date must be YYYY-MM-DD")

    from database import db as _db
    doc = a.model_dump()
    doc["updated_at"] = _now_iso()
    if not doc.get("id"):
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.lifestyle_activations.insert_one(doc.copy())
    else:
        _db.lifestyle_activations.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "activation": _db.lifestyle_activations.find_one({"id": doc["id"]}, {"_id": 0})}


# ─── Calendar view ─────────────────────────────────────────────────────────
@router.get("/calendar")
async def calendar(start: Optional[str] = None, days: int = 14, category: Optional[str] = None):
    """Master Activation Calendar — heartbeat of the dashboard."""
    if not start:
        start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try: start_dt = datetime.strptime(start, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "start must be YYYY-MM-DD")
    end_dt = start_dt + timedelta(days=days)
    from database import db as _db
    q: Dict[str, Any] = {"date": {"$gte": start, "$lt": end_dt.strftime("%Y-%m-%d")}}
    if category: q["category"] = category
    items = list(_db.lifestyle_activations.find(q, {"_id": 0}).sort([("date", 1), ("start_time", 1)]))
    # Group by date
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for it in items:
        by_date.setdefault(it["date"], []).append(it)
    return {"ok": True, "start": start, "days": days, "total": len(items), "by_date": by_date, "activations": items,
            "categories": ACTIVATION_CATEGORIES, "revenue_models": REVENUE_MODELS}


@router.get("/activations/{activation_id}")
async def get_activation(activation_id: str):
    from database import db as _db
    a = _db.lifestyle_activations.find_one({"id": activation_id}, {"_id": 0})
    if not a: raise HTTPException(404, "activation not found")
    return {"ok": True, "activation": a}


@router.post("/activations/{activation_id}/delete")
async def delete_activation(activation_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.lifestyle_activations.delete_one({"id": activation_id})
    if r.deleted_count == 0: raise HTTPException(404, "activation not found")
    return {"ok": True, "deleted": activation_id}


# ─── Revenue vs Engagement panel ───────────────────────────────────────────
@router.get("/revenue-engagement")
async def revenue_engagement(days: int = 30):
    """Aggregate revenue + engagement by revenue model, category, and audience tag."""
    from database import db as _db
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    items = list(_db.lifestyle_activations.find({"date": {"$gte": start}}, {"_id": 0}))

    by_model: Dict[str, Dict[str, float]] = {}
    by_category: Dict[str, Dict[str, float]] = {}
    for it in items:
        m = it.get("revenue_model", "complimentary")
        c = it.get("category", "other")
        att = it.get("actual_attendance") or it.get("expected_attendance") or 0
        rev = it.get("actual_revenue") or it.get("revenue_target") or 0.0
        for bucket, key in [(by_model, m), (by_category, c)]:
            b = bucket.setdefault(key, {"count": 0, "attendance": 0, "revenue": 0.0})
            b["count"] += 1
            b["attendance"] += att
            b["revenue"] += rev

    total_rev = sum(b["revenue"] for b in by_model.values())
    total_att = sum(b["attendance"] for b in by_model.values())
    paid_att = by_model.get("paid", {}).get("attendance", 0)
    engagement_ratio = round((total_att - paid_att) / total_att, 3) if total_att else 0
    return {"ok": True, "days": days, "total_activations": len(items),
            "total_revenue": round(total_rev, 2), "total_attendance": total_att,
            "engagement_ratio_nonpaid": engagement_ratio,
            "by_revenue_model": by_model, "by_category": by_category}


# ─── Attendance Forecast (simple but useful) ───────────────────────────────
@router.get("/attendance-forecast")
async def attendance_forecast(date_iso: Optional[str] = None):
    """Very simple heuristic: base occupancy × weather/weekday modifier × capacity."""
    if not date_iso:
        date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try: d = datetime.strptime(date_iso, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date_iso must be YYYY-MM-DD")
    from database import db as _db
    items = list(_db.lifestyle_activations.find({"date": date_iso}, {"_id": 0}).sort("start_time", 1))
    # Peek at occupancy forecast if available
    occ_pct = 70
    try:
        bd = _db.standup_boards.find_one({"date": date_iso}, {"_id": 0})
        if bd and bd.get("sections", {}).get("ops_numbers", {}).get("content", {}).get("occ_pct"):
            occ_pct = bd["sections"]["ops_numbers"]["content"]["occ_pct"]
    except Exception: pass
    # Weekday/weekend bump
    weekend_bump = 1.2 if d.weekday() >= 5 else 1.0
    forecasts: List[Dict[str, Any]] = []
    for a in items:
        cap = a.get("capacity", 50)
        base_rate = 0.55  # 55% of capacity for average activation
        if "pool" in (a.get("location") or "").lower() and a.get("weather_sensitive"):
            base_rate *= 0.8
        if "member" in a.get("revenue_model", ""):
            base_rate *= 1.1
        forecast = int(min(cap, cap * base_rate * (occ_pct / 70.0) * weekend_bump))
        forecasts.append({
            "activation_id": a["id"], "title": a["title"], "start_time": a["start_time"],
            "location": a["location"], "category": a["category"],
            "capacity": cap, "forecast_attendance": forecast,
            "fill_rate_pct": round(forecast / cap * 100, 1) if cap else 0,
            "weather_sensitive": a.get("weather_sensitive", False),
            "rain_backup_location": a.get("rain_backup_location"),
        })
    return {"ok": True, "date": date_iso, "occ_pct_used": occ_pct, "weekend_bump": weekend_bump,
            "total_activations": len(items), "forecasts": forecasts}


# ─── Cross-Department Activation Builder ───────────────────────────────────
@router.get("/cross-dept-plan/{activation_id}")
async def cross_dept_plan(activation_id: str):
    """Expand an activation into a cross-department coordination plan."""
    from database import db as _db
    a = _db.lifestyle_activations.find_one({"id": activation_id}, {"_id": 0})
    if not a: raise HTTPException(404, "activation not found")

    # Build tasks based on category + requires_departments
    tasks: List[Dict[str, Any]] = []
    deps = set(a.get("requires_departments") or [])
    cat = a.get("category")
    # Category-driven defaults
    if cat in ("pool", "sunset-ritual"): deps.update(["engineering", "housekeeping", "fb"])
    if cat in ("wellness", "fitness", "spa-crossover"): deps.update(["spa", "housekeeping"])
    if cat in ("culinary",): deps.update(["culinary", "fb"])
    if cat in ("mixology",): deps.update(["fb"])
    if cat in ("family", "kids"): deps.update(["activities", "housekeeping"])
    if cat in ("employee-culture",): deps.update(["people-services"])

    for d in sorted(deps):
        task = {"department": d, "activation_id": a["id"], "activation_title": a["title"],
                "location": a["location"], "start_time": a["start_time"],
                "setup_lead_minutes": a.get("setup_minutes", 30)}
        if d == "engineering":
            task["task"] = f"AV, projector, power, lighting check — {a['location']}"
        elif d == "housekeeping":
            task["task"] = f"Towels, seating setup, cleanup protocol post-event"
        elif d == "fb":
            task["task"] = f"Beverage/menu service — {', '.join(a.get('equipment_needs', [])) or 'standard'}"
        elif d == "culinary":
            task["task"] = f"Culinary station/tasting prep for {a.get('expected_attendance') or a.get('capacity')} guests"
        elif d == "spa":
            task["task"] = f"Spa staffing + conversion tracking for attendees"
        elif d == "activities":
            task["task"] = f"Recreation lead, kids program supervision"
        elif d == "people-services":
            task["task"] = f"Employee RSVP + recognition setup"
        else:
            task["task"] = f"Support {a['title']} at {a['location']}"
        tasks.append(task)

    return {"ok": True, "activation": a, "departments": sorted(deps), "tasks": tasks,
            "total_tasks": len(tasks)}


# ─── Weather-based relocation alert ────────────────────────────────────────@router.get("/weather-alerts")
async def weather_alerts(date_iso: Optional[str] = None):
    """Flags weather-sensitive activations on a date + suggests rain backup."""
    if not date_iso:
        date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from database import db as _db
    items = list(_db.lifestyle_activations.find({"date": date_iso, "weather_sensitive": True}, {"_id": 0}))
    # In real deployment this would hit weather_live; for now we just surface the list
    alerts = [{
        "activation_id": a["id"], "title": a["title"], "location": a["location"],
        "rain_backup_location": a.get("rain_backup_location"),
        "suggested_action": "Monitor forecast 4 hours before" if not a.get("rain_backup_location") else "Relocate if precipitation > 40%",
    } for a in items]
    return {"ok": True, "date": date_iso, "weather_sensitive_count": len(items), "alerts": alerts}


# ─── Today's activities (for Standup auto-feed) ────────────────────────────
@router.get("/today")
async def today(date_iso: Optional[str] = None):
    if not date_iso:
        date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from database import db as _db
    items = list(_db.lifestyle_activations.find({"date": date_iso, "status": {"$ne": "cancelled"}}, {"_id": 0}).sort("start_time", 1))
    summarized = [{"time": a["start_time"], "name": a["title"], "outlet": a["location"],
                   "category": a["category"], "capacity": a.get("capacity")} for a in items]
    return {"ok": True, "date": date_iso, "total": len(items), "activities": summarized}


# ─── Prep-Cascade Visualizer + Occupancy-Driven Suggestions (iter175) ──────
@router.get("/prep-cascade/{date_iso}")
async def prep_cascade(date_iso: str):
    """All activations on a date × their cross-dept task expansion. Powers the
    Prep-Cascade visualizer: one screen of every department's prep duties for
    every activation, grouped by department."""
    try: datetime.strptime(date_iso, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date_iso must be YYYY-MM-DD")
    from database import db as _db
    acts = list(_db.lifestyle_activations.find({"date": date_iso, "status": {"$ne": "cancelled"}}, {"_id": 0}).sort("start_time", 1))
    by_dept: Dict[str, List[Dict[str, Any]]] = {}
    for a in acts:
        plan = await cross_dept_plan(a["id"])
        for t in plan["tasks"]:
            by_dept.setdefault(t["department"], []).append(t)
    # Also include recovery cases open today (if any) as "support tasks"
    total_tasks = sum(len(v) for v in by_dept.values())
    return {"ok": True, "date": date_iso, "total_activations": len(acts),
            "total_tasks": total_tasks, "by_department": by_dept,
            "activations": [{"id": a["id"], "title": a["title"], "start_time": a["start_time"],
                              "category": a["category"], "location": a["location"]} for a in acts]}


@router.post("/suggest")
async def suggest_activations(body: Dict[str, Any]):
    """Ask Claude for 3 activation suggestions given occupancy + weather + recent attendance.
    Body: {date: YYYY-MM-DD, occupancy_pct?: int, weather?: str, audience_focus?: str}.
    Claude returns structured JSON that can be used to pre-fill the Create Activation form."""
    date_iso = body.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    occ = body.get("occupancy_pct") or 70
    weather = body.get("weather") or "clear"
    audience = body.get("audience_focus") or "all-guests"
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
        if not key: raise RuntimeError("EMERGENT_LLM_KEY missing")
        # Pull past popularity for context
        from database import db as _db
        past = list(_db.lifestyle_activations.find({}, {"_id": 0, "category": 1, "actual_attendance": 1, "capacity": 1, "title": 1}).limit(30))
        prompt = f"""You are programming activations for a luxury resort (Pier SIXTY-SIX, no golf/tennis anchor).
Context for {date_iso}:
  occupancy: {occ}% · weather: {weather} · audience focus: {audience}
  recent popular activations: {[p['title'] for p in past[:8]]}

Return STRICT JSON with exactly 3 activation suggestions. Each must include:
  title (str), category (one of: wellness, culinary, mixology, family, sunset-ritual, sommelier, fitness, spa-crossover),
  start_time (HH:MM), end_time (HH:MM), location (str), capacity (int), revenue_model (paid|complimentary|member-included|upsell-driven),
  weather_sensitive (bool), rain_backup_location (str or empty), rationale (short sentence).

Respond with ONLY the JSON array of 3 objects, no preamble."""
        chat = LlmChat(api_key=key, session_id=f"lifestyle-suggest-{date_iso}",
                       system_message="You return strict JSON only when asked. No preamble, no code fences.").with_model("anthropic", "claude-sonnet-4-5-20250929")
        raw = await chat.send_message(UserMessage(text=prompt))
        text = (raw or "").strip()
        # strip code fences if any
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
            text = text.strip().rstrip("`").strip()
        import json as _json
        suggestions = _json.loads(text)
        return {"ok": True, "date": date_iso, "count": len(suggestions), "suggestions": suggestions}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200], "suggestions": []}


# ─── Seeder ────────────────────────────────────────────────────────────────
def seed_lifestyle():
    from database import db as _db
    if _db.lifestyle_activations.count_documents({}) > 0:
        return 0
    today = datetime.now(timezone.utc).date()
    samples = [
        {"title": "Sunset Champagne Sabering", "category": "sunset-ritual", "date": today.strftime("%Y-%m-%d"),
         "start_time": "18:30", "end_time": "19:30", "location": "Harbor Terrace",
         "weather_sensitive": True, "rain_backup_location": "Atrium Lounge",
         "audience": ["all-guests", "couples"], "capacity": 60, "revenue_model": "complimentary",
         "engagement_target": "Social posts, bar revisit lift",
         "requires_departments": ["fb", "engineering"], "owner_employee_id": None},
        {"title": "Sunrise Pilates on the Lawn", "category": "wellness", "date": today.strftime("%Y-%m-%d"),
         "start_time": "07:00", "end_time": "08:00", "location": "Garden Lawn",
         "weather_sensitive": True, "rain_backup_location": "Fitness Center Studio A",
         "audience": ["wellness-seekers", "members"], "capacity": 25, "revenue_model": "member-included",
         "engagement_target": "Spa booking conversion",
         "requires_departments": ["spa", "housekeeping"]},
        {"title": "Pool Movie Night · Top Gun Maverick", "category": "family", "date": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
         "start_time": "20:30", "end_time": "22:45", "location": "Main Pool Deck",
         "weather_sensitive": True, "rain_backup_location": "Grand Ballroom",
         "audience": ["families", "all-guests"], "capacity": 120, "revenue_model": "complimentary",
         "equipment_needs": ["projector", "popcorn station", "bar satellite", "family towels"],
         "requires_departments": ["engineering", "housekeeping", "culinary", "fb"]},
        {"title": "Sommelier Champagne Masterclass", "category": "sommelier", "date": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
         "start_time": "17:00", "end_time": "18:30", "location": "Sotogrande Wine Room",
         "audience": ["foodies", "adults-only"], "capacity": 16, "revenue_model": "paid",
         "ticket_price": 95.0, "revenue_target": 1520.0,
         "engagement_target": "Wine-by-the-glass upsell next visit",
         "requires_departments": ["fb", "culinary"]},
        {"title": "Kids Junior Chef · Pizza Lab", "category": "kids", "date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
         "start_time": "11:00", "end_time": "12:30", "location": "Culinary Studio",
         "audience": ["kids", "families"], "capacity": 20, "revenue_model": "paid",
         "ticket_price": 45.0, "revenue_target": 900.0,
         "requires_departments": ["culinary", "activities"]},
        {"title": "Sound Bath + Breathwork", "category": "wellness", "date": (today + timedelta(days=4)).strftime("%Y-%m-%d"),
         "start_time": "19:00", "end_time": "20:15", "location": "Serenity Spa · Studio B",
         "audience": ["wellness-seekers", "adults-only"], "capacity": 18, "revenue_model": "upsell-driven",
         "engagement_target": "Spa service conversion 30%+",
         "requires_departments": ["spa"]},
        {"title": "Mixology Lab · Seasonal Botanical Cocktails", "category": "mixology",
         "date": (today + timedelta(days=5)).strftime("%Y-%m-%d"),
         "start_time": "18:00", "end_time": "19:30", "location": "Atrium Lounge",
         "audience": ["adults-only", "foodies", "couples"], "capacity": 24, "revenue_model": "paid",
         "ticket_price": 75.0, "revenue_target": 1800.0,
         "engagement_target": "Bar revisit lift within 48h",
         "requires_departments": ["fb"]},
    ]
    for s in samples:
        s["id"] = uuid.uuid4().hex[:12]
        s["status"] = "planned"
        s["property"] = "main"
        s["created_at"] = _now_iso()
        s["updated_at"] = _now_iso()
        _db.lifestyle_activations.insert_one(s)
    return len(samples)
