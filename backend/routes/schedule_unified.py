"""
D11 · Unified schedule view (AutoScheduling + Schedule merge).

Echo's scheduling lives across two surfaces today:
  · Echo Schedule (echo_schedule.py) — the manager's roster: live
    employees, shifts, swaps, callouts, tier assignment.
  · AutoScheduling (in echoai3_orchestrator + chronos_flex_labor)
    — the AI's proposal: forecasted demand × per-station hours.

User direction (from session): merge them. The chef should see
ONE schedule with proposed-vs-actual side by side, not two
screens.

This module is the reconciliation layer. It does NOT remove
either underlying surface — those still exist and are still the
source of truth for their own write paths. What this layer does:

  · GET /api/schedule/unified/{outlet_id}?date=
    Returns a single payload merging the autoscheduler's proposal
    with the actual roster, marked variance per station.

  · POST /api/schedule/unified/{outlet_id}/accept-proposal
    Promotes selected proposal slots into actual shifts via the
    existing echo_schedule write path. Idempotent.

The merge is a READ-side reconciliation: it pulls from
chronos_flex_labor (or labor_proposals collection) AND
echo_schedule_shifts, and surfaces variance so the chef can
either accept the proposal or override.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/schedule/unified",
                   tags=["schedule-unified"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _proposal_for_date(tenant_id: str, outlet_id: str,
                       date_str: str) -> Dict[str, Any]:
    """Pull the autoscheduler proposal for this outlet+date.
    Falls back to an empty proposal so the read path is always
    safe when the autoscheduler hasn't run yet."""
    p = db["labor_proposals"].find_one(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "date": date_str})
    if not p:
        return {"date": date_str, "by_station": {},
                "total_hours": 0, "_source": "no_proposal"}
    return {**p, "_source": "labor_proposals"}


def _actual_for_date(tenant_id: str, outlet_id: str,
                     date_str: str) -> List[Dict[str, Any]]:
    rows = list(db["echo_schedule_shifts"].find(
        {"tenant_id": tenant_id, "date": date_str},
        {"_id": 0}).limit(2000))
    if not rows:
        rows = list(db["echo_schedule_shifts"].find(
            {"date": date_str}, {"_id": 0}).limit(2000))
    # Filter by outlet if shift carries one
    rows = [r for r in rows
            if not r.get("outlet_id")
            or r.get("outlet_id") == outlet_id]
    return rows


@router.get("/{outlet_id}")
def unified_view(
    outlet_id: str,
    date: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Single payload: proposal + actual shifts + per-station
    variance. Operator audience for the read."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "unified schedule requires operator audience")
    tenant_id = (x_tenant_id or "default").strip().lower()

    proposal = _proposal_for_date(tenant_id, outlet_id, date)
    actual = _actual_for_date(tenant_id, outlet_id, date)

    # Per-station rollup
    actual_by_station: Dict[str, Dict[str, Any]] = {}
    for s in actual:
        st = s.get("station") or s.get("position") or "unassigned"
        bucket = actual_by_station.setdefault(st, {
            "station": st, "actual_count": 0,
            "actual_employee_ids": []})
        bucket["actual_count"] += 1
        if s.get("employee_id"):
            bucket["actual_employee_ids"].append(s["employee_id"])

    proposed_by_station = proposal.get("by_station") or {}
    rows: List[Dict[str, Any]] = []
    all_stations = set(proposed_by_station.keys()) | set(
        actual_by_station.keys())
    for st in sorted(all_stations):
        p_cnt = int((proposed_by_station.get(st) or {}).get(
            "headcount", 0))
        a_cnt = int(actual_by_station.get(st, {}).get(
            "actual_count", 0))
        delta = a_cnt - p_cnt
        rows.append({
            "station": st,
            "proposed_headcount": p_cnt,
            "actual_headcount": a_cnt,
            "delta": delta,
            "status": ("match" if delta == 0
                       else "over" if delta > 0
                       else "under"),
        })

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "date": date,
        "proposal_source": proposal.get("_source"),
        "actual_shift_count": len(actual),
        "by_station": rows,
        "actual_shifts": actual,
    }


class AcceptBody(BaseModel):
    stations: List[str] = Field(default_factory=list)
    actor_id: str = Field(..., min_length=1)
    notes: Optional[str] = None


@router.post("/{outlet_id}/accept-proposal")
def accept_proposal(
    outlet_id: str,
    date: str,
    body: AcceptBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Promote selected proposal stations into actual shifts.
    Idempotent: stations already at >= proposed_headcount are
    no-op'd."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    proposal = _proposal_for_date(tenant_id, outlet_id, date)
    proposed = proposal.get("by_station") or {}
    actual = _actual_for_date(tenant_id, outlet_id, date)
    actual_by_station: Dict[str, int] = {}
    for s in actual:
        st = s.get("station") or s.get("position") or "unassigned"
        actual_by_station[st] = actual_by_station.get(st, 0) + 1

    created: List[Dict[str, Any]] = []
    for st in (body.stations or list(proposed.keys())):
        target = int((proposed.get(st) or {}).get("headcount", 0))
        have = actual_by_station.get(st, 0)
        gap = max(0, target - have)
        for i in range(gap):
            sh = {
                "id": uuid.uuid4().hex[:16],
                "tenant_id": tenant_id,
                "outlet_id": outlet_id,
                "date": date,
                "station": st,
                "employee_id": None,   # to be filled by manager assign
                "source": "auto_proposal_accept",
                "accepted_by": body.actor_id,
                "notes": body.notes,
                "created_at": _now_iso(),
            }
            db["echo_schedule_shifts"].insert_one(sh.copy())
            created.append(sh)

    db["audit_log"].insert_one({
        "id": uuid.uuid4().hex,
        "tenant_id": tenant_id,
        "kind": "schedule.accept_proposal",
        "entity_id": f"{outlet_id}|{date}",
        "payload": {"stations": body.stations,
                     "shifts_created": len(created),
                     "actor": body.actor_id},
        "created_at": _now_iso(),
    })

    return {"ok": True, "outlet_id": outlet_id, "date": date,
            "shifts_created": len(created),
            "stations_processed": list(body.stations)
                                   or list(proposed.keys()),
            "created_shifts": created}
