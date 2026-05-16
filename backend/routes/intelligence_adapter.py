"""
Intelligence Adapter
====================
Cross-module intelligence layer providing a unified API for every
command dashboard (Spa · Engineering · Housekeeping · FOH · Concierge ·
Guest 360 · IRD) to tap into:

  - **EchoAi³**   — synthesizes actionable insights from cross-module KPIs
                    (e.g. "pastry delay → Garni, Calusso, Windows at risk")
  - **EchoAurium** — GM-grade executive summary roll-up across property
  - **EchoStratus** — director-grade forecasting (revenue, labor, covers,
                    walk-in surge, CapEx, linen demand)

These endpoints are deterministic (rule-based) by default. They can be
promoted to LLM-backed synthesis when the Emergent LLM key is configured
(set env `ECHOAI3_USE_LLM=1`).

Endpoints (prefix /api/intelligence):
  GET /ai3/{module}              — per-module cross-insights
  GET /ai3/summary               — all modules combined
  GET /aurium/gm                 — GM-grade executive roll-up
  GET /stratus/forecast          — director forecasting (6-week horizon)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import os
from uuid import uuid4
from fastapi import APIRouter, HTTPException

from database import db

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()


# ─────────────────────────────────────────────
# EchoAi³ — cross-module insight synthesizer
# ─────────────────────────────────────────────
def _ai3_spa() -> List[Dict[str, Any]]:
    insights = []
    today = _now()
    # bookings in next 4h
    try:
        bookings_next4 = list(db["spa_bookings"].find(
            {"eta": {"$gte": today.isoformat(), "$lte": (today + timedelta(hours=4)).isoformat()}},
            {"_id": 0}
        ).limit(60))
        if len(bookings_next4) >= 10:
            insights.append({
                "severity": "info",
                "category": "spa_capacity",
                "headline": f"Spa has {len(bookings_next4)} bookings in next 4h — linen forecast spike likely",
                "action": "Notify laundry via Housekeeping for an early linen cycle",
                "cross_module": ["housekeeping"],
            })
    except Exception:
        pass
    return insights


def _ai3_engineering() -> List[Dict[str, Any]]:
    insights = []
    now = _now()
    wos = list(db["eng_work_orders"].find(
        {"status": {"$in": ["open", "in_progress"]}, "severity": {"$in": ["high", "critical"]}},
        {"_id": 0}
    ).limit(50))
    # VIP rooms affected?
    vip_wos = [w for w in wos if w.get("vip_room")]
    if vip_wos:
        insights.append({
            "severity": "high",
            "category": "engineering_vip_risk",
            "headline": f"{len(vip_wos)} high/critical work order(s) affecting VIP rooms",
            "action": "Expedite technician dispatch; Guest Services pre-briefed",
            "cross_module": ["housekeeping", "foh", "guest360"],
            "items": [{"ticket_no": w.get("ticket_no"), "room": w.get("room_number"), "title": w.get("title")} for w in vip_wos[:5]],
        })
    # Kitchen equipment issues block food outlets
    kitchen_issues = [w for w in wos if w.get("category") == "kitchen_equipment"]
    if kitchen_issues:
        insights.append({
            "severity": "medium",
            "category": "engineering_kitchen_bottleneck",
            "headline": f"Kitchen equipment issue — potential pacing impact across outlets",
            "action": "Notify FOH dining managers, adjust menu 86 list",
            "cross_module": ["foh", "culinary"],
        })
    # PM overdue
    try:
        pm_overdue = db["eng_pm_schedule"].count_documents({"status": "overdue"})
        if pm_overdue > 2:
            insights.append({
                "severity": "medium",
                "category": "engineering_pm_compliance",
                "headline": f"{pm_overdue} PM tasks overdue — compliance risk",
                "action": "Director to review & reprioritize",
                "cross_module": ["compliance"],
            })
    except Exception:
        pass
    return insights


def _ai3_housekeeping() -> List[Dict[str, Any]]:
    insights = []
    now = _now()
    # revenue at risk from not-ready arrival rooms
    arrivals = list(db["hskp_arrivals"].find({}, {"_id": 0}).limit(200))
    rooms = {r["room_no"]: r for r in list(db["hskp_rooms"].find({}, {"_id": 0}).limit(500))}
    not_ready = 0
    risk = 0.0
    for a in arrivals:
        r = rooms.get(a["room_no"])
        if r and r["status"] not in ("ready", "inspected"):
            not_ready += 1
            risk += a.get("adr", 0)
    if not_ready >= 3:
        insights.append({
            "severity": "high" if risk > 1000 else "medium",
            "category": "housekeeping_arrival_risk",
            "headline": f"{not_ready} arrival rooms not ready — ${risk:,.0f} revenue at risk",
            "action": "Re-cluster attendants to arrival floors, prioritize VIPs",
            "cross_module": ["foh", "guest360"],
        })
    # Linen shortage
    linen = list(db["hskp_linen"].find({}, {"_id": 0}).limit(20))
    short = [l for l in linen if l.get("on_hand", 0) < l.get("par_level", 1) * 0.4]
    if short:
        insights.append({
            "severity": "medium",
            "category": "housekeeping_linen",
            "headline": f"Linen shortage on {len(short)} item(s)",
            "action": "Trigger laundry cycle adjustment; alert spa if pool/bath towels affected",
            "cross_module": ["spa"],
            "items": [{"item": l["item"], "on_hand": l["on_hand"], "par": l["par_level"]} for l in short],
        })
    return insights


def _ai3_foh() -> List[Dict[str, Any]]:
    insights = []
    now = _now()
    try:
        # VIP reservations in next 2h
        upcoming = list(db["foh_reservations"].find(
            {"vip": True, "status": {"$in": ["pending", "confirmed"]}, "eta": {"$gte": now.isoformat(), "$lte": (now + timedelta(hours=2)).isoformat()}},
            {"_id": 0}
        ).limit(30))
        if upcoming:
            insights.append({
                "severity": "info",
                "category": "foh_vip_arrivals",
                "headline": f"{len(upcoming)} VIP reservation(s) in next 2h",
                "action": "Notify outlet GMs + verify table preparation + wine pairings ready",
                "cross_module": ["guest360", "concierge"],
                "items": [{"name": r["guest_name"], "outlet": r["outlet_slug"], "party": r["party_size"], "eta": r["eta"]} for r in upcoming[:6]],
            })
        # Allergy alerts for confirmed/seated tables
        allergies = list(db["foh_reservations"].find(
            {"allergy_flags": {"$ne": []}, "status": {"$in": ["confirmed", "seated", "pending"]}},
            {"_id": 0}
        ).limit(30))
        if len(allergies) >= 3:
            insights.append({
                "severity": "medium",
                "category": "foh_allergy_compliance",
                "headline": f"{len(allergies)} reservation(s) with allergy flags today",
                "action": "Chef to pre-brief, servers to confirm on seating",
                "cross_module": ["culinary", "concierge"],
            })
    except Exception:
        pass
    return insights


def _ai3_concierge() -> List[Dict[str, Any]]:
    insights = []
    now = _now()
    try:
        last24 = (now - timedelta(hours=24)).isoformat()
        open_vip = db["concierge_tickets"].count_documents({"vip": True, "status": {"$in": ["open", "routed", "in_progress"]}})
        if open_vip >= 2:
            insights.append({
                "severity": "high",
                "category": "concierge_vip_queue",
                "headline": f"{open_vip} VIP concierge tickets open",
                "action": "Escalate to front office manager",
                "cross_module": ["foh", "guest360"],
            })
        critical = db["concierge_tickets"].count_documents({"severity": "critical", "created_at": {"$gte": last24}})
        if critical > 0:
            insights.append({
                "severity": "high",
                "category": "concierge_critical",
                "headline": f"{critical} critical severity concierge ticket(s) last 24h",
                "action": "GM review + EchoConcierge sanitization audit",
                "cross_module": ["engineering", "hskp"],
            })
    except Exception:
        pass
    return insights


MODULE_SYNTHS = {
    "spa": _ai3_spa,
    "engineering": _ai3_engineering,
    "housekeeping": _ai3_housekeeping,
    "foh": _ai3_foh,
    "concierge": _ai3_concierge,
}


@router.get("/ai3/summary")
async def ai3_summary(use_llm: bool = False):
    all_insights = []
    for mod, fn in MODULE_SYNTHS.items():
        for i in fn():
            all_insights.append({"module": mod, **i})
    all_insights.sort(key=lambda x: {"high": 0, "medium": 1, "info": 2, "low": 3}.get(x.get("severity", "info"), 9))

    # Optional LLM-powered narrative synthesis layered on top
    narrative = None
    if use_llm or os.environ.get("ECHOAI3_USE_LLM") == "1":
        narrative = await _llm_narrative(all_insights)

    return {"insights": all_insights, "count": len(all_insights), "narrative": narrative, "ts": _iso()}


async def _llm_narrative(insights: list) -> Optional[str]:
    """Use Emergent LLM key + Claude Sonnet 4.5 to produce an executive narrative
    summarizing the deterministic insights. Falls back silently on error."""
    key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not key or not insights:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        bullets = "\n".join(f"- [{i.get('module')}/{i.get('severity')}] {i.get('headline')} — action: {i.get('action')}" for i in insights[:20])
        chat = LlmChat(
            api_key=key,
            session_id=f"ai3-narrative-{uuid4().hex[:6]}",
            system_message=(
                "You are EchoAi³, the cross-module intelligence brain of a "
                "luxury resort operating system. Given a list of deterministic "
                "insights across Spa / Engineering / Housekeeping / FOH / "
                "Concierge, produce a crisp 3-sentence executive narrative that "
                "identifies the most important cross-module risks and suggests a "
                "single top priority action. Use concrete numbers from the "
                "insights. No corporate fluff. No emojis."
            ),
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=f"Insights:\n{bullets}"))
        return str(resp).strip() if resp else None
    except Exception as e:
        return None


@router.get("/ai3/{module}")
async def ai3_module(module: str):
    if module not in MODULE_SYNTHS:
        raise HTTPException(404, f"module must be one of {list(MODULE_SYNTHS.keys())}")
    insights = MODULE_SYNTHS[module]()
    return {"module": module, "insights": insights, "count": len(insights), "ts": _iso()}


# ─────────────────────────────────────────────
# EchoAurium — GM-grade executive roll-up
# ─────────────────────────────────────────────
@router.get("/aurium/gm")
async def aurium_gm(use_llm: bool = False):
    """Single executive roll-up across every command center."""
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()

    def safe_count(coll, q):
        try:
            return db[coll].count_documents(q)
        except Exception:
            return 0

    def safe_sum(coll, q, field):
        try:
            total = 0.0
            for d in db[coll].find(q, {"_id": 0, field: 1}).limit(2000):
                total += d.get(field, 0) or 0
            return total
        except Exception:
            return 0.0

    # Housekeeping readiness
    hskp_rooms = list(db["hskp_rooms"].find({}, {"_id": 0}).limit(500))
    ready = sum(1 for r in hskp_rooms if r.get("status") in ("ready", "inspected"))
    ooo = sum(1 for r in hskp_rooms if r.get("status") == "ooo")

    # Engineering
    eng_open = safe_count("eng_work_orders", {"status": {"$in": ["open", "assigned", "in_progress"]}})
    eng_critical = safe_count("eng_work_orders", {"severity": "critical", "status": {"$ne": "resolved"}})

    # FOH
    foh_rev_24h = safe_sum("foh_ticket_timings", {"created_at": {"$gte": last24}}, "check_total")
    foh_covers_24h = safe_sum("foh_ticket_timings", {"created_at": {"$gte": last24}}, "cover_count")

    # IRD
    ird_rev_24h = safe_sum("ird_orders", {"created_at": {"$gte": last24}}, "subtotal")

    # Spa revenue (approximate from bookings × avg price)
    try:
        spa_bookings_24h = safe_count("spa_bookings", {"created_at": {"$gte": last24}})
    except Exception:
        spa_bookings_24h = 0

    # Concierge
    concierge_24h = safe_count("concierge_tickets", {"created_at": {"$gte": last24}})
    concierge_open = safe_count("concierge_tickets", {"status": {"$in": ["open", "routed", "in_progress"]}})

    # Composite score
    readiness = round(100 * ready / max(1, len(hskp_rooms)), 1)

    # GAP FIX (audit iter146): pattern pressure is now a first-class
    # input to composite health. Higher pattern risk drags composite
    # down so GMs see a single number that reflects recurring cross-
    # module issues — not just point-in-time ops.
    pattern_risk = 0
    try:
        from routes.patterns import _recurring as _recur_helper, asset_clusters as _asset_helper
        _rec = [b for b in _recur_helper(days=30) if b["count"] >= 2]
        _assets = await _asset_helper(days=60)
        pattern_risk = min(
            100,
            int(
                sum(r["count"] for r in _rec[:10]) * 2
                + sum(a["count"] for a in _assets["items"][:5] if a["count"] >= 3)
            ),
        )
    except Exception:
        pattern_risk = 0

    composite = round(
        0.25 * readiness +
        0.25 * max(0, 100 - eng_critical * 20) +
        0.15 * min(100, foh_covers_24h / 3) +
        0.15 * max(0, 100 - concierge_open * 2) +
        0.20 * max(0, 100 - pattern_risk),
        1,
    )

    # iter148: revenue-at-risk single-number (CFO-grade signal)
    revenue_at_risk_usd = 0.0
    try:
        from routes.patterns import revenue_at_risk as _rar
        _r = await _rar(days=30, horizon_days=14)
        revenue_at_risk_usd = _r.get("total_at_risk_usd", 0.0)
    except Exception:
        pass

    ai3 = [s for mod, fn in MODULE_SYNTHS.items() for s in fn()]
    high_severity = [s for s in ai3 if s.get("severity") == "high"]

    narrative = None
    if use_llm or os.environ.get("ECHOAI3_USE_LLM") == "1":
        narrative = await _llm_narrative(ai3)

    return {
        "ts": _iso(),
        "composite_health_score": composite,
        "readiness_pct": readiness,
        "rooms_ready": ready,
        "rooms_ooo": ooo,
        "engineering_open": eng_open,
        "engineering_critical": eng_critical,
        "foh_revenue_24h": round(foh_rev_24h, 2),
        "foh_covers_24h": int(foh_covers_24h),
        "ird_revenue_24h": round(ird_rev_24h, 2),
        "spa_bookings_24h": spa_bookings_24h,
        "concierge_24h": concierge_24h,
        "concierge_open": concierge_open,
        "pattern_risk_score": pattern_risk,
        "revenue_at_risk_usd": round(revenue_at_risk_usd, 2),
        "high_severity_alerts": high_severity,
        "narrative": narrative,
    }


# ─────────────────────────────────────────────
# EchoStratus — director forecasting (6 weeks)
# ─────────────────────────────────────────────
@router.get("/stratus/forecast")
async def stratus_forecast(weeks: int = 6):
    """Simple deterministic forecasting across revenue, labor, covers,
    capex, linen demand. Seeds deterministic curves so directors get a
    stable 6-week outlook for planning. A future Emergent-LLM-backed
    version can refine with actual historical + weather+events inputs."""
    now = _now()
    weeks = max(1, min(12, weeks))

    # Base rates (resort demo)
    base_rev = 142_000
    base_covers = 2150
    base_labor = 52_400
    base_capex_exposure = 18_000
    base_linen_units = 6300

    rows = []
    for w in range(weeks):
        week_start = (now + timedelta(days=7 * w)).date().isoformat()
        # Simple seasonal wave
        season = 1.0 + 0.08 * (1 if w % 3 == 0 else -0.03 * (w % 3))
        event_lift = 1.0 + (0.12 if w in (1, 4) else 0.0)
        rows.append({
            "week_start": week_start,
            "forecast_revenue": round(base_rev * season * event_lift, 0),
            "forecast_covers": int(base_covers * season * event_lift),
            "forecast_labor_cost": round(base_labor * season, 0),
            "forecast_labor_ratio_pct": round(base_labor * season / (base_rev * season * event_lift) * 100, 1),
            "forecast_capex_risk": round(base_capex_exposure * (1 + 0.04 * w), 0),
            "forecast_linen_demand_units": int(base_linen_units * season * event_lift),
            "forecast_walk_in_surge_events": 1 if event_lift > 1 else 0,
        })

    # Aggregate
    totals = {
        "revenue": round(sum(r["forecast_revenue"] for r in rows), 0),
        "covers": sum(r["forecast_covers"] for r in rows),
        "labor_cost": round(sum(r["forecast_labor_cost"] for r in rows), 0),
        "capex_risk": round(sum(r["forecast_capex_risk"] for r in rows), 0),
        "linen_demand": sum(r["forecast_linen_demand_units"] for r in rows),
    }
    return {"ts": _iso(), "weeks": rows, "totals_6w": totals}
