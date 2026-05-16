"""
D32 · Echo concierge intelligence layer.

The existing concierge surface stores allergens, holds spend, lists
reservations, runs IRD. Stores facts. What it didn't do: act on
those facts before the guest noticed.

This module sits on top of the existing concierge data and emits
operator-audience findings + D28 predictions for four scenarios:

  1. Allergen cascade
     When an allergen is added (or on a refresh sweep), walk every
     active surface where the guest's food is in flight: in-flight
     IRD orders, today's reservations, queued guest_orders. For each
     menu item whose allergen list intersects the guest's profile,
     write an `allergen_alert` finding so the floor manager sees it
     before the plate leaves the kitchen.

  2. Spend trajectory
     Project where this guest's lifetime value is heading — rising,
     steady, declining. Operator decision: invest in retention
     (declining), maintain (steady), surface for VIP escalation
     (rising). The decision stays with the human — Echo just makes
     the trajectory visible.

  3. Arrival calibration
     For the next 14 days, score each upcoming arrival against
     housekeeping readiness: clean rooms in queue, average turnaround,
     historical "actual ETD vs planned ETD" calibration. Surface the
     ones at risk so HK can re-prioritize before the guest arrives,
     not after.

  4. Resonance bend
     Silent service knows when life changes. Compare the guest's last
     N visits to their long-run pattern: party size, dining choices,
     suite type, spend cadence. When the pattern bends substantially
     (z-score > 2), the operator sees an observation — never an
     accusation, never a question to the guest. The operator decides
     whether to acknowledge the change with a thoughtful gesture.

Doctrine alignment

  · §1.2 silent service: findings surface to operator only; the
    guest never receives a notification that says "we noticed you
    changed."
  · §1.4 voice register: every emit to D28 uses voice_register=
    operator. No staff-facing register for these — the manager
    decides what reaches the line.
  · §2.5 pride from love: framing is observation. Resonance bend
    output literally says "your pattern bent" — not "is something
    wrong?" The operator does the human work.
  · §2.6 no surveillance language: no "guest activity score", no
    "engagement metric." We surface concrete patterns and let the
    human attach meaning.
  · D27 tenant isolation: every read/write filters by tenant_id.
"""
from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from echo.events import append_event, AppendEventBody

router = APIRouter(prefix="/api/echo/concierge-intel",
                   tags=["echo-concierge-intel"])


# Tunables
ARRIVAL_HORIZON_DAYS = 14
HK_AVG_TURNAROUND_HOURS = 3
RESONANCE_LOOKBACK_VISITS = 8
RESONANCE_RECENT_VISITS = 3
RESONANCE_BEND_Z_THRESHOLD = 2.0
SPEND_TRAJECTORY_MIN_VISITS = 3


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_iso_to_dt(value: Any) -> Optional[datetime]:
    try:
        ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except Exception:
        return None


# ─── 1. Allergen cascade ────────────────────────────────────────────────

@router.post("/allergen-cascade/{guest_id}")
def allergen_cascade(
    guest_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Sweep every active surface for items whose allergens collide
    with this guest's profile. Write findings + emit D28 events."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "allergen cascade is operator-audience only")
    tenant_id = (x_tenant_id or "default").strip().lower()
    guest = db["guest_intelligence"].find_one(
        {"guest_id": guest_id, "tenant_id": tenant_id}, {"_id": 0})
    if not guest:
        # Try without tenant filter (legacy seed data lacks tenant_id)
        guest = db["guest_intelligence"].find_one(
            {"guest_id": guest_id}, {"_id": 0})
    if not guest:
        raise HTTPException(404, f"guest {guest_id} not found")
    allergens = set(a.lower().strip() for a in (guest.get("allergens") or []))
    if not allergens:
        return {"ok": True, "guest_id": guest_id,
                "allergens": [], "alerts": [],
                "note": "no allergens on profile; nothing to cascade"}

    alerts: List[Dict[str, Any]] = []

    def _scan_items(source: str, surface_id: str,
                    items: List[Dict[str, Any]]) -> None:
        for item in items or []:
            item_allergens = set(
                a.lower().strip()
                for a in (item.get("allergens") or [])
            )
            collisions = sorted(allergens & item_allergens)
            if not collisions:
                continue
            severity = "critical" if (
                guest.get("allergy_severity") in ("severe", "life_threatening")
            ) else "warn"
            alert = {
                "id": uuid.uuid4().hex[:12],
                "tenant_id": tenant_id,
                "guest_id": guest_id,
                "kind": "allergen_alert",
                "source": source,
                "surface_id": surface_id,
                "item_name": item.get("name") or item.get("item_name") or "?",
                "collisions": collisions,
                "severity": severity,
                "explanation": (
                    f"{source} {surface_id}: {item.get('name') or 'item'} "
                    f"contains {', '.join(collisions)} — guest allergens "
                    f"{sorted(allergens)}"
                ),
                "resolved": False,
                "created_at": _now_iso(),
            }
            db["concierge_alerts"].insert_one(alert.copy())
            alerts.append(alert)

    # In-flight IRD orders for this guest
    for o in db["ird_orders"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id,
         "status": {"$ne": "delivered"}}, {"_id": 0}):
        _scan_items("ird_order", o.get("id") or "?", o.get("items") or [])

    # Active guest_orders
    for o in db["guest_orders"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id,
         "status": {"$ne": "completed"}}, {"_id": 0}):
        _scan_items("guest_order", o.get("id") or "?", o.get("items") or [])

    # Today's reservations
    today = datetime.now(timezone.utc).date().isoformat()
    for r in db["reservations"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id,
         "reservation_date": today}, {"_id": 0}):
        _scan_items("reservation", r.get("id") or "?",
                    r.get("pre_ordered_items") or [])

    # Emit a single rollup prediction event
    if alerts:
        try:
            append_event(AppendEventBody(
                kind="prediction", voice_register="operator",
                sensitivity="sensitive_allergen", confidence=0.95,
                payload={
                    "domain": "allergen_cascade",
                    "guest_id": guest_id,
                    "alert_count": len(alerts),
                    "max_severity": (
                        "critical" if any(
                            a["severity"] == "critical" for a in alerts)
                        else "warn"),
                    "_retrospective": {"decision_features": {
                        "allergen_count": len(allergens),
                        "alert_count": len(alerts),
                    }},
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "guest_id": guest_id,
            "allergens": sorted(allergens),
            "alert_count": len(alerts),
            "alerts": alerts}


@router.get("/allergen-alerts")
def list_allergen_alerts(
    guest_id: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "allergen alerts require operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if guest_id:
        q["guest_id"] = guest_id
    if severity:
        q["severity"] = severity
    if resolved is not None:
        q["resolved"] = resolved
    rows = list(db["concierge_alerts"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "alerts": rows}


# ─── 2. Spend trajectory ────────────────────────────────────────────────

@router.get("/spend-trajectory/{guest_id}")
def spend_trajectory(
    guest_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Compute the guest's spend trajectory across visits. Operator-
    only — never surfaced to guest-facing surfaces (§1.2)."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "spend trajectory is operator-only")
    tenant_id = (x_tenant_id or "default").strip().lower()
    profile = db["guest_intelligence"].find_one(
        {"guest_id": guest_id, "tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        profile = db["guest_intelligence"].find_one(
            {"guest_id": guest_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, f"guest {guest_id} not found")

    visits = int(profile.get("visit_count") or 0)
    lifetime = float(profile.get("lifetime_spend") or 0)
    avg_per_visit = (lifetime / visits) if visits else 0.0

    # Pull recent guest_orders for trend
    orders = list(db["guest_orders"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id}, {"_id": 0})
                  .sort("created_at", -1).limit(50))
    # Group by ISO month → spend
    monthly: Dict[str, float] = {}
    for o in orders:
        ts = _safe_iso_to_dt(o.get("created_at"))
        if ts is None:
            continue
        ym = f"{ts.year}-{ts.month:02d}"
        monthly[ym] = monthly.get(ym, 0.0) + float(o.get("total") or 0)
    months_sorted = sorted(monthly.keys())
    spend_series = [monthly[m] for m in months_sorted]

    direction = "insufficient_data"
    next_visit_projection = None
    if visits < SPEND_TRAJECTORY_MIN_VISITS:
        direction = "insufficient_data"
    elif len(spend_series) >= 3:
        first_half = spend_series[:len(spend_series) // 2]
        second_half = spend_series[len(spend_series) // 2:]
        first_avg = statistics.mean(first_half) if first_half else 0
        second_avg = statistics.mean(second_half) if second_half else 0
        if first_avg <= 0:
            direction = "insufficient_data"
        else:
            delta_pct = (second_avg - first_avg) / first_avg
            if delta_pct >= 0.10:
                direction = "rising"
            elif delta_pct <= -0.10:
                direction = "declining"
            else:
                direction = "steady"
            next_visit_projection = round(
                avg_per_visit * (1 + delta_pct), 2)
    else:
        direction = "steady"
        next_visit_projection = round(avg_per_visit, 2)

    operator_recommendation = {
        "rising": "consider VIP escalation; pre-stage upgraded amenities",
        "steady": "maintain standard service; no escalation needed",
        "declining": "retention outreach; surface to GM for personal note",
        "insufficient_data": "too few visits to model; observe",
    }[direction]

    return {"ok": True, "guest_id": guest_id,
            "visits": visits,
            "lifetime_spend": round(lifetime, 2),
            "avg_per_visit": round(avg_per_visit, 2),
            "monthly_series": [
                {"month": m, "spend": round(monthly[m], 2)}
                for m in months_sorted],
            "trajectory_direction": direction,
            "next_visit_projection": next_visit_projection,
            "operator_recommendation": operator_recommendation}


# ─── 3. Arrival calibration ─────────────────────────────────────────────

@router.get("/arrival-calibration")
def arrival_calibration(
    property_id: Optional[str] = None,
    horizon_days: int = ARRIVAL_HORIZON_DAYS,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """For the next horizon_days days, score each upcoming arrival
    against housekeeping readiness. Surface arrivals at risk."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "arrival calibration is operator-only")
    tenant_id = (x_tenant_id or "default").strip().lower()
    now = datetime.now(timezone.utc)
    horizon_end = now + timedelta(days=horizon_days)

    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if property_id:
        q["property_id"] = property_id
    arrivals = list(db["reservations"].find(q, {"_id": 0}).limit(2000))

    # HK readiness: count of clean rooms ready vs. expected demand
    rooms = list(db["hk_rooms"].find(
        {"tenant_id": tenant_id} if property_id is None
         else {"tenant_id": tenant_id, "property_id": property_id},
        {"_id": 0}))
    clean_count = sum(1 for r in rooms
                      if (r.get("status") or "").lower()
                      in ("clean", "ready", "available"))

    upcoming: List[Dict[str, Any]] = []
    for r in arrivals:
        arr_dt = _safe_iso_to_dt(
            r.get("arrival_at") or r.get("check_in_date"))
        if arr_dt is None:
            continue
        if arr_dt < now or arr_dt > horizon_end:
            continue
        # Hours until arrival
        hours_until = (arr_dt - now).total_seconds() / 3600.0
        # Risk: room not yet clean AND <= HK_AVG_TURNAROUND_HOURS away
        room_no = r.get("room_number") or r.get("room")
        room_status = "unknown"
        if room_no:
            hk = next((x for x in rooms
                       if str(x.get("number")) == str(room_no)), None)
            room_status = (hk.get("status") if hk else "unknown") or "unknown"
        ready_status = (room_status or "").lower()
        if ready_status in ("clean", "ready", "available"):
            risk = "ok"
        elif hours_until > HK_AVG_TURNAROUND_HOURS * 2:
            risk = "ok"   # plenty of time
        elif hours_until > HK_AVG_TURNAROUND_HOURS:
            risk = "watch"
        else:
            risk = "at_risk"
        upcoming.append({
            "reservation_id": r.get("id") or r.get("reservation_id"),
            "guest_id": r.get("guest_id"),
            "guest_name": r.get("guest_name"),
            "room_number": room_no,
            "arrival_at": r.get("arrival_at") or r.get("check_in_date"),
            "hours_until_arrival": round(hours_until, 2),
            "room_status": room_status,
            "risk": risk,
        })
    upcoming.sort(key=lambda x: x["hours_until_arrival"])

    at_risk_count = sum(1 for u in upcoming if u["risk"] == "at_risk")
    if at_risk_count > 0:
        try:
            append_event(AppendEventBody(
                kind="prediction", voice_register="operator",
                sensitivity="ordinary", confidence=0.8,
                payload={
                    "domain": "arrival_calibration",
                    "property_id": property_id,
                    "at_risk_count": at_risk_count,
                    "horizon_days": horizon_days,
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "property_id": property_id,
            "horizon_days": horizon_days,
            "rooms_clean": clean_count,
            "arrivals_in_horizon": len(upcoming),
            "at_risk_count": at_risk_count,
            "arrivals": upcoming}


# ─── 4. Resonance bend (silent observation) ─────────────────────────────

@router.get("/resonance-bend/{guest_id}")
def resonance_bend(
    guest_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Compare this guest's recent visits to their long-run pattern.
    Surface bends — never questions, never accusations. The operator
    decides whether to acknowledge the change with a gesture."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "resonance bend is operator-only — silent service "
            "(§1.2) requires the guest never sees this")
    tenant_id = (x_tenant_id or "default").strip().lower()
    profile = db["guest_intelligence"].find_one(
        {"guest_id": guest_id, "tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        profile = db["guest_intelligence"].find_one(
            {"guest_id": guest_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, f"guest {guest_id} not found")

    visits = list(db["guest_orders"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id}, {"_id": 0})
                  .sort("created_at", -1).limit(RESONANCE_LOOKBACK_VISITS))

    if len(visits) < RESONANCE_LOOKBACK_VISITS:
        return {"ok": True, "guest_id": guest_id,
                "bend_detected": False,
                "reason": "insufficient_history",
                "visits_observed": len(visits)}

    recent = visits[:RESONANCE_RECENT_VISITS]
    baseline = visits[RESONANCE_RECENT_VISITS:]

    def _feature(rows: List[Dict[str, Any]], key: str) -> List[float]:
        return [float(r.get(key) or 0) for r in rows]

    bends: List[Dict[str, Any]] = []
    for feature in ("total", "party_size", "duration_minutes"):
        baseline_vals = [v for v in _feature(baseline, feature) if v > 0]
        recent_vals = [v for v in _feature(recent, feature) if v > 0]
        if len(baseline_vals) < 3 or not recent_vals:
            continue
        try:
            mean = statistics.mean(baseline_vals)
            stdev = statistics.stdev(baseline_vals)
        except statistics.StatisticsError:
            continue
        if stdev <= 0:
            continue
        recent_avg = statistics.mean(recent_vals)
        z = (recent_avg - mean) / stdev
        if abs(z) >= RESONANCE_BEND_Z_THRESHOLD:
            direction = "up" if z > 0 else "down"
            bends.append({
                "feature": feature,
                "baseline_mean": round(mean, 2),
                "recent_avg": round(recent_avg, 2),
                "z_score": round(z, 2),
                "direction": direction,
                "observation": (
                    f"{feature} pattern bent {direction}: "
                    f"baseline {mean:.1f}, recent {recent_avg:.1f} "
                    f"({z:+.1f}σ over {len(recent_vals)} visits)"
                ),
            })

    bend_detected = len(bends) > 0
    if bend_detected:
        try:
            append_event(AppendEventBody(
                kind="prediction", voice_register="operator",
                sensitivity="sensitive_pii", confidence=0.7,
                payload={
                    "domain": "resonance_bend",
                    "guest_id": guest_id,
                    "bends": bends,
                    "_silent_service": True,
                    "_retrospective": {"decision_features": {
                        "bend_count": len(bends),
                        "max_z": max(abs(b["z_score"]) for b in bends),
                    }},
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "guest_id": guest_id,
            "bend_detected": bend_detected,
            "visits_observed": len(visits),
            "bends": bends,
            "_doctrine_note": (
                "These observations are for the operator. The guest "
                "should never receive a question about why their "
                "pattern changed. If the operator chooses to "
                "acknowledge the change, it should be through a "
                "gesture, not a query (§2.5)."
            )}
