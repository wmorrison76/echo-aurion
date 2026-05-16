"""
Outlet Ramp-Up Tracker
======================
T.11 from the CFO toolkit additions. When an outlet opens or reopens
after renovation / new chef / new menu, capture ratio takes time to
converge. Track the ramp-up curve and compare to peer-outlet ramp-up
curves. Flag if ramp-up is slower than peer median (early warning
that something is wrong with the launch).

Reads from:
  · `outlet_capture_daily`  — actuals from day 1
  · `outlets`               — first_actual_at + outlet_type for peer matching

Real math: peer ramp-up curves are constructed from any historical
outlet of the same type that has at least 60 days of data. The target
outlet's curve is overlaid on the peer median curve.
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/outlet-rampup", tags=["cfo-outlet-rampup"])

_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("/{outlet_id}")
async def rampup(outlet_id: str, days_to_track: int = Query(90, ge=14, le=365)):
    """Per-outlet ramp-up curve vs peer median. Returns: ordered list
    of days-since-launch with target outlet's eligible_capture +
    peer median capture at the same days-since-launch + delta band."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"Outlet {outlet_id} not registered")
    if not outlet.get("first_actual_at"):
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "outlet_has_no_actuals_yet",
            "generated_at": _now(),
        }

    first_actual_dt = datetime.fromisoformat(outlet["first_actual_at"].replace("Z", "+00:00"))
    days_since_launch = (datetime.now(timezone.utc) - first_actual_dt).days

    # Target outlet curve, indexed by days_since_launch
    target_rows = list(
        db["outlet_capture_daily"].find(
            {"outlet_id": outlet_id}, {"_id": 0, "date": 1, "eligible_capture": 1, "available_capture": 1, "covers": 1, "revenue_cents": 1},
        ).sort("date", 1)
    )
    target_curve = []
    for r in target_rows:
        d = datetime.fromisoformat(r["date"]).date()
        offset = (d - first_actual_dt.date()).days
        if 0 <= offset <= days_to_track:
            target_curve.append({
                "day_since_launch": offset,
                "date": r["date"],
                "eligible_capture": r.get("eligible_capture", 0),
                "available_capture": r.get("available_capture", 0),
                "covers": r.get("covers", 0),
                "revenue_cents": r.get("revenue_cents", 0),
            })

    # Build peer median curve from outlets of same type with >=60d history
    peers = list(db["outlets"].find(
        {
            "outlet_type": outlet.get("outlet_type"),
            "outlet_id": {"$ne": outlet_id},
            "active": True,
            "first_actual_at": {"$ne": None},
        },
        {"_id": 0, "outlet_id": 1, "first_actual_at": 1},
    ))
    peer_curves_by_day: Dict[int, List[float]] = {}
    qualifying_peers = 0
    for peer in peers:
        peer_first = datetime.fromisoformat(peer["first_actual_at"].replace("Z", "+00:00"))
        peer_age = (datetime.now(timezone.utc) - peer_first).days
        if peer_age < 60:
            continue                                # peer too young to have a stable curve
        qualifying_peers += 1
        peer_rows = list(
            db["outlet_capture_daily"].find(
                {"outlet_id": peer["outlet_id"]},
                {"_id": 0, "date": 1, "eligible_capture": 1},
            ).sort("date", 1).limit(days_to_track)
        )
        for r in peer_rows:
            d = datetime.fromisoformat(r["date"]).date()
            offset = (d - peer_first.date()).days
            if 0 <= offset <= days_to_track:
                peer_curves_by_day.setdefault(offset, []).append(r.get("eligible_capture", 0))

    peer_median_curve = []
    for offset in sorted(peer_curves_by_day.keys()):
        values = peer_curves_by_day[offset]
        if len(values) >= 2:                          # need at least 2 peers per day
            peer_median_curve.append({
                "day_since_launch": offset,
                "peer_median_eligible_capture": round(median(values), 4),
                "peer_count": len(values),
            })

    # Variance assessment: is the target ahead, behind, or on pace?
    if target_curve and peer_median_curve:
        target_avg_recent = mean([
            r["eligible_capture"] for r in target_curve[-7:] if r["eligible_capture"] >= 0
        ]) if target_curve else 0
        peer_at_same_age = next(
            (p for p in peer_median_curve if p["day_since_launch"] == days_since_launch),
            None,
        )
        if peer_at_same_age:
            delta_vs_peer = target_avg_recent - peer_at_same_age["peer_median_eligible_capture"]
            delta_pct = (delta_vs_peer / peer_at_same_age["peer_median_eligible_capture"]) if peer_at_same_age["peer_median_eligible_capture"] > 0 else 0
            if delta_pct < -0.15:
                pace_signal = "behind_peer_median"
            elif delta_pct > 0.15:
                pace_signal = "ahead_of_peer_median"
            else:
                pace_signal = "on_pace_with_peer_median"
        else:
            delta_pct = None
            pace_signal = "no_peer_at_same_age"
    else:
        delta_pct = None
        pace_signal = "insufficient_data"

    return {
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "outlet_type": outlet.get("outlet_type"),
        "first_actual_at": outlet.get("first_actual_at"),
        "days_since_launch": days_since_launch,
        "qualifying_peers": qualifying_peers,
        "target_curve": target_curve,
        "peer_median_curve": peer_median_curve,
        "pace_signal": pace_signal,
        "delta_vs_peer_pct": round(delta_pct, 4) if delta_pct is not None else None,
        "narrative": _rampup_narrative(outlet, days_since_launch, pace_signal, delta_pct, qualifying_peers),
        "generated_at": _now(),
    }


def _rampup_narrative(outlet: Dict, days: int, signal: str, delta_pct: Optional[float], peers: int) -> str:
    name = outlet.get("name", outlet["outlet_id"])
    if signal == "insufficient_data":
        return f"{name} ramp-up cannot be assessed yet — too few qualifying peer outlets ({peers}) of type {outlet.get('outlet_type')}."
    if signal == "behind_peer_median":
        return (
            f"{name} is {days} days post-launch and is running "
            f"{abs(delta_pct):.0%} below the peer-outlet median for {outlet.get('outlet_type')} "
            f"at this same age. Worth investigating: marketing, awareness, "
            f"menu/concept fit, training. Don't wait for the curve to compound."
        )
    if signal == "ahead_of_peer_median":
        return (
            f"{name} at {days} days post-launch is running {delta_pct:+.0%} "
            f"above peer median. Good launch. Capture this in the playbook."
        )
    return f"{name} at {days} days post-launch is tracking peer-median ramp-up curve."
