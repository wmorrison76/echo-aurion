"""
D16h-flex · Flex-flow labor recommendation.

Sister to D16h-followup auto-order. Both run off the same Monte Carlo
forecast. This one sizes the labor envelope.

Owner's framing: "flex flow calculation needs to be close to 50%."
That's PRIME COST — labor + COGS combined as % of revenue. The classic
luxury-resort target. Some properties run prime at 55% (full-service
banquets) and some at 45% (high-margin steakhouse) — target_prime_pct
is per-call so the chef tunes by outlet.

Math (the simple, transparent version — sophisticated demand-driven
scheduling is downstream):

  forecasted_revenue   = Σ (item.forecast_p50 × item.selling_price)
  forecasted_cogs      = Σ (item.forecast_p50 × item.cost_per_unit)
  forecasted_cogs_pct  = forecasted_cogs / forecasted_revenue
  labor_budget_pct     = target_prime_pct - forecasted_cogs_pct
                          (clamped: never less than 0.10 — no kitchen
                           runs on 10% labor either, so this flags an
                           over-prime forecast as a hard problem)
  labor_budget_dollars = forecasted_revenue × labor_budget_pct

  Per-station breakdown using the property's typical labor mix:
    foh         0.45   front-of-house cooks/servers/bartenders
    boh_hot     0.25   hot line + grill
    boh_cold    0.10   pantry / garde-manger
    pastry      0.05   pastry station
    dish        0.10   dishwasher
    support     0.05   prep + cleaning
  (caller can override the mix per-outlet)

  recommended_hours_per_station = station_dollars / station_avg_wage
  station status = ok | warn | over depending on whether the
  recommended hours fit within the existing schedule's hours
  the chef has already published.

The chef sees the gap as a hard number — "you're scheduled for 280
hours tomorrow; the forecast says you should run 240 to land prime
at 50%; cut 40 hours." The cut decision (which shifts to drop /
shorten) is a human-in-the-loop call.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/chronos/flex-labor", tags=["chronos-flex-labor"])


# Same tolerance band as auto-order — 5% over the prime target before
# we flag "over" so a 51% prime hit on a 50% target shows "warn."
WARN_TOLERANCE = 0.05

# Floor under labor as % of revenue. If forecasted COGS already eats
# the prime budget, we still recommend at least 10% labor so the
# kitchen functions. That recommendation will be "over" — the GM
# sees a prime-budget violation; the recommender doesn't pretend.
LABOR_FLOOR_PCT = 0.10

# Property-default labor mix per station. Sums to 1.0. The caller
# can override on the request to match their own org chart.
DEFAULT_STATION_MIX = {
    "foh":      0.45,
    "boh_hot":  0.25,
    "boh_cold": 0.10,
    "pastry":   0.05,
    "dish":     0.10,
    "support":  0.05,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Schemas ────────────────────────────────────────────────────────────

class StationConfig(BaseModel):
    """Per-station tuning the chef supplies. avg_wage is straight-time
    blended hourly cost (wage + payroll burden) for the station's
    typical mix of staff."""
    station: str
    mix_share: float = Field(..., ge=0, le=1)
    avg_wage_per_hour: float = Field(..., gt=0)
    scheduled_hours: float = Field(0, ge=0)


class ItemEconomics(BaseModel):
    item_id: str
    item_name: str
    forecast_p50: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    cost_per_unit: float = Field(..., ge=0)


class FlexLaborRequest(BaseModel):
    outlet_id: str
    target_date: str
    target_prime_pct: float = Field(..., gt=0, lt=1,
        description="0.50 = 50% prime cost target")
    items: List[ItemEconomics]
    stations: List[StationConfig]
    note: Optional[str] = None


def _validate_mix(stations: List[StationConfig]) -> None:
    if not stations:
        raise HTTPException(400, "at least one station required")
    total_mix = sum(s.mix_share for s in stations)
    # Allow a small float drift; mix should sum to 1.0.
    if total_mix < 0.95 or total_mix > 1.05:
        raise HTTPException(400,
            f"station mix_share must sum to ~1.0; got {total_mix:.3f}")


# ─── Endpoints ──────────────────────────────────────────────────────────

@router.post("/recommend")
def recommend_flex_labor(body: FlexLaborRequest):
    """Compute the labor envelope from the forecast and a target
    prime %. Returns per-station hour recommendations with a
    guardrail status and the gap vs. what the chef has already
    scheduled."""
    if not body.items:
        raise HTTPException(400, "at least one item required")
    _validate_mix(body.stations)

    # Forecast totals
    rev = sum(float(it.forecast_p50) * float(it.selling_price)
              for it in body.items)
    cogs = sum(float(it.forecast_p50) * float(it.cost_per_unit)
               for it in body.items)
    cogs_pct = (cogs / rev) if rev > 0 else 0.0

    # Labor budget = prime target - cogs.  Floored at LABOR_FLOOR_PCT;
    # if cogs already exceeds prime target, the recommendation is the
    # floor and the rollup status flags "over" loudly.
    raw_labor_pct = float(body.target_prime_pct) - cogs_pct
    labor_pct = max(LABOR_FLOOR_PCT, raw_labor_pct)
    labor_budget = round(rev * labor_pct, 2)

    # Per-station split
    station_recs: List[Dict[str, Any]] = []
    total_scheduled_hours = 0.0
    total_recommended_hours = 0.0
    for s in body.stations:
        s_dollars = round(labor_budget * s.mix_share, 2)
        rec_hours = round(s_dollars / s.avg_wage_per_hour, 2)
        sched = float(s.scheduled_hours)
        gap = round(sched - rec_hours, 2)   # +ve = overstaffed; -ve = under
        if abs(gap) <= rec_hours * WARN_TOLERANCE:
            status = "ok"
            note = None
        elif gap > 0:
            status = "over"
            note = f"scheduled {sched}h vs recommended {rec_hours}h — cut {gap}h"
        else:
            status = "under"
            note = (f"scheduled {sched}h vs recommended {rec_hours}h — "
                    f"need {abs(gap)}h more (or expect service strain)")
        station_recs.append({
            "station": s.station,
            "mix_share": float(s.mix_share),
            "labor_dollars_budget": s_dollars,
            "avg_wage_per_hour":   float(s.avg_wage_per_hour),
            "recommended_hours":   rec_hours,
            "scheduled_hours":     sched,
            "gap_hours":           gap,
            "status":              status,
            "note":                note,
        })
        total_scheduled_hours += sched
        total_recommended_hours += rec_hours

    # Rollup status: how does the resulting prime % compare to target?
    forecasted_labor = round(sum(s["labor_dollars_budget"] for s in station_recs), 2)
    prime_pct = (cogs + forecasted_labor) / rev if rev > 0 else 0.0
    if prime_pct <= float(body.target_prime_pct):
        prime_status = "ok"
    elif prime_pct < float(body.target_prime_pct) * (1 + WARN_TOLERANCE):
        prime_status = "warn"
    else:
        prime_status = "over"

    # Was the labor floor hit?
    floored = (raw_labor_pct < LABOR_FLOOR_PCT)

    rec_doc = {
        "id": uuid.uuid4().hex[:12],
        "outlet_id": body.outlet_id,
        "target_date": body.target_date,
        "target_prime_pct": float(body.target_prime_pct),
        "forecasted_revenue":   round(rev, 2),
        "forecasted_cogs":      round(cogs, 2),
        "forecasted_cogs_pct":  round(cogs_pct, 4),
        "labor_budget_pct":     round(labor_pct, 4),
        "labor_budget_dollars": labor_budget,
        "forecasted_prime_pct": round(prime_pct, 4),
        "prime_status":         prime_status,
        "labor_floor_engaged":  floored,
        "stations":             station_recs,
        "rollup": {
            "total_scheduled_hours":    round(total_scheduled_hours, 2),
            "total_recommended_hours":  round(total_recommended_hours, 2),
            "gap_hours":                round(total_scheduled_hours
                                              - total_recommended_hours, 2),
            "stations_under": sum(1 for s in station_recs if s["status"] == "under"),
            "stations_over":  sum(1 for s in station_recs if s["status"] == "over"),
            "stations_ok":    sum(1 for s in station_recs if s["status"] == "ok"),
        },
        "note": body.note or "",
        "generated_at": _now_iso(),
    }

    db["flex_labor_recommendations"].update_one(
        {"outlet_id": body.outlet_id, "target_date": body.target_date},
        {"$set": rec_doc}, upsert=True)

    # D18 · push to chef inbox + audit log when there's something
    # actionable. A station gap of zero across the board doesn't
    # need a chef decision — a 12h overstaff does.
    try:
        from routes.audit_log import emit_audit, create_pending_approval
        emit_audit(
            module="chronos-flex-labor",
            action="recommend",
            entity_type="flex_labor", entity_id=rec_doc["id"],
            summary=(f"{body.outlet_id} {body.target_date}: prime "
                      f"{rec_doc['forecasted_prime_pct']*100:.1f}%, "
                      f"gap {rec_doc['rollup']['gap_hours']}h"),
            metadata={"outlet_id": body.outlet_id,
                      "target_date": body.target_date,
                      "labor_floor_engaged": rec_doc["labor_floor_engaged"]})
        if (rec_doc["rollup"]["stations_over"]
                + rec_doc["rollup"]["stations_under"] > 0):
            create_pending_approval(
                kind="flex_labor",
                entity_id=f"{body.outlet_id}:{body.target_date}",
                outlet_id=body.outlet_id,
                summary=(f"Flex-labor — prime "
                         f"{rec_doc['forecasted_prime_pct']*100:.1f}%, "
                         f"{rec_doc['rollup']['stations_over']} over / "
                         f"{rec_doc['rollup']['stations_under']} under"),
                urgency=("high" if rec_doc["prime_status"] == "over"
                          else "normal"),
                source_module="chronos-flex-labor",
                payload={"target_date": body.target_date,
                         "labor_floor_engaged": rec_doc["labor_floor_engaged"]})
    except Exception:
        pass

    return {"ok": True, **rec_doc}


@router.get("/by-date")
def get_flex_labor(outlet_id: str, target_date: str):
    """Read back a previously-generated recommendation."""
    doc = db["flex_labor_recommendations"].find_one(
        {"outlet_id": outlet_id, "target_date": target_date}, {"_id": 0})
    if not doc:
        raise HTTPException(404,
            f"no flex-labor recommendation for {outlet_id} on {target_date}")
    return {"ok": True, **doc}


class AcceptRequest(BaseModel):
    """Chef confirms the recommendation. Optional per-station
    overrides — same pattern as auto-order. The actual schedule
    edit happens in the Schedule module; this just records the
    decision so the audit trail closes."""
    station_overrides: List[Dict[str, Any]] = []
    accepted_by_user_id: Optional[str] = None
    accepted_by_name: Optional[str] = None
    note: Optional[str] = None


@router.post("/by-date/{outlet_id}/{target_date}/accept")
def accept_flex_labor(
    outlet_id: str,
    target_date: str,
    body: AcceptRequest,
):
    doc = db["flex_labor_recommendations"].find_one(
        {"outlet_id": outlet_id, "target_date": target_date}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "no recommendation to accept")

    overrides_by_station = {o.get("station"): o for o in body.station_overrides}
    final_stations = []
    for s in (doc.get("stations") or []):
        ov = overrides_by_station.get(s["station"])
        if ov:
            s = {
                **s,
                "recommended_hours": float(ov.get("hours",
                                                  s["recommended_hours"])),
                "override_applied": True,
                "override_reason":  ov.get("reason"),
            }
        else:
            s = {**s, "override_applied": False}
        final_stations.append(s)

    audit = list(doc.get("audit_log") or []) + [{
        "at": _now_iso(),
        "user_id": body.accepted_by_user_id,
        "user_name": body.accepted_by_name,
        "action": "accepted",
        "overrides_count": len(body.station_overrides),
        "note": body.note or "",
    }]
    db["flex_labor_recommendations"].update_one(
        {"outlet_id": outlet_id, "target_date": target_date},
        {"$set": {
            "stations": final_stations,
            "accepted": True,
            "accepted_at": _now_iso(),
            "accepted_by_user_id": body.accepted_by_user_id,
            "accepted_by_name":   body.accepted_by_name,
            "audit_log": audit,
        }})
    # D18 · close inbox + audit
    try:
        from routes.audit_log import emit_audit, resolve_pending_approval
        resolve_pending_approval(
            kind="flex_labor", entity_id=f"{outlet_id}:{target_date}",
            decision="approved",
            decided_by_user_id=body.accepted_by_user_id,
            decided_by_name=body.accepted_by_name, note=body.note)
        emit_audit(
            module="chronos-flex-labor", action="accept",
            entity_type="flex_labor",
            entity_id=f"{outlet_id}:{target_date}",
            user_id=body.accepted_by_user_id,
            user_name=body.accepted_by_name,
            summary=f"accepted with {len(body.station_overrides)} override(s)",
            metadata={"outlet_id": outlet_id, "target_date": target_date})
    except Exception:
        pass

    return {"ok": True, "outlet_id": outlet_id,
            "target_date": target_date,
            "stations": final_stations,
            "overrides_applied": len(body.station_overrides)}
