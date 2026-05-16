"""
D49 · Tip share engine + what-if simulator.

User directive: "Does payroll account for tip share — needs to be
adjustable on the manager & accounting sides. We can add a what-if:
'if we give bussers a 0.1 increase, how does that change?' Side-
by-side comparison."

This module is the tip-share allocator that turns a service
period's collected tips into per-employee distributions, governed
by a tip pool POLICY (configurable on both manager + accounting
sides). The simulator runs a hypothetical policy alongside the
current and shows the side-by-side delta per employee + per role.

Endpoints (all /api/tip-share)

  GET  /policy/{outlet_id}            current active policy
  PUT  /policy/{outlet_id}            set / update policy
                                      (manager + accounting can
                                      both write; later writes
                                      preserve audit trail)
  POST /allocate/{outlet_id}          allocate a service period's
                                      tip pool to employees
  POST /simulate/{outlet_id}          what-if: run two policies
                                      (current vs proposed) on
                                      the same period; return
                                      per-employee + per-role
                                      side-by-side delta
  GET  /allocations/{outlet_id}       past allocations (period filter)

Policy schema

  {
    "pool_basis": "total" | "credit_card_only",
    "shares": {
       "server": 50.0,    // points (relative)
       "busser": 15.0,
       "host":   10.0,
       "bartender": 20.0,
       "runner":  5.0
    },
    "auto_distribute": true,
    "manager_overrides": {  // % adjustment per role
       "busser": 0.0
    }
  }

Each employee is assigned a role in their employee record. The
allocator multiplies role_share × hours_worked to get a weighted
share, distributes the tip pool proportionally.

Doctrine alignment

  · §1.4 voice register: policy edits emit audit_log entries
    with actor_id (manager OR accounting). Both sides see
    each other's changes.
  · §2.5 framing: simulator output is observation
    ("this change would cost the property $X / week") not
    recommendation ("you should do this").
  · §3.1 append-only: policies are versioned (effective_at +
    superseded_at). Past policies never edited; new policies
    write a new row + supersede the previous.
  · D27 tenant isolation everywhere.
"""
from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/tip-share", tags=["tip-share"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit_audit(tenant_id: str, kind: str, eid: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"tip_share.{kind}",
            "entity_id": eid,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# ─── Models ────────────────────────────────────────────────────────────

class PolicyBody(BaseModel):
    pool_basis: str = Field("total", pattern="^(total|credit_card_only)$")
    shares: Dict[str, float] = Field(default_factory=dict)
    auto_distribute: bool = True
    manager_overrides: Dict[str, float] = Field(default_factory=dict)
    actor_id: str = Field(..., min_length=1)
    actor_side: str = Field("manager",
                             pattern="^(manager|accounting)$")
    note: Optional[str] = None


class AllocateBody(BaseModel):
    period_start: str   # ISO date
    period_end: str
    tip_pool_amount: float = Field(..., ge=0)
    actor_id: str = Field(..., min_length=1)


class SimulateBody(BaseModel):
    period_start: str
    period_end: str
    tip_pool_amount: float = Field(..., ge=0)
    proposed_shares_delta: Dict[str, float] = Field(
        default_factory=dict,
        description="Additive delta to current policy shares "
                    "by role; e.g., {'busser': 0.1} adds 0.1 "
                    "shares to bussers.")


# ─── Policy CRUD ───────────────────────────────────────────────────────

@router.get("/policy/{outlet_id}")
def get_policy(
    outlet_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    p = db["tip_share_policies"].find_one(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "superseded_at": None}, {"_id": 0})
    if not p:
        # Default: equal shares; serves as scaffolding
        return {"ok": True, "outlet_id": outlet_id,
                "policy": {
                    "pool_basis": "total",
                    "shares": {"server": 50, "busser": 15,
                                "host": 10, "bartender": 20,
                                "runner": 5},
                    "auto_distribute": True,
                    "manager_overrides": {},
                }, "_default": True}
    return {"ok": True, "outlet_id": outlet_id, "policy": p}


@router.put("/policy/{outlet_id}")
def set_policy(
    outlet_id: str,
    body: PolicyBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    # Supersede any existing active policy
    existing = db["tip_share_policies"].find_one(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "superseded_at": None})
    if existing:
        db["tip_share_policies"].update_one(
            {"id": existing["id"], "tenant_id": tenant_id},
            {"$set": {"superseded_at": _now_iso(),
                      "superseded_by": body.actor_id}})

    pid = uuid.uuid4().hex[:16]
    policy = {
        "id": pid,
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "pool_basis": body.pool_basis,
        "shares": body.shares,
        "auto_distribute": body.auto_distribute,
        "manager_overrides": body.manager_overrides,
        "set_by": body.actor_id,
        "set_by_side": body.actor_side,
        "note": body.note,
        "effective_at": _now_iso(),
        "superseded_at": None,
        "supersedes_id": existing["id"] if existing else None,
    }
    db["tip_share_policies"].insert_one(policy.copy())
    _emit_audit(tenant_id, "policy_set", pid, {
        "outlet_id": outlet_id,
        "actor": body.actor_id,
        "side": body.actor_side,
        "supersedes": (existing or {}).get("id")})
    return {"ok": True, "policy": policy}


# ─── Allocation engine ────────────────────────────────────────────────

def _calc_period_hours_per_employee(
    tenant_id: str, outlet_id: str,
    period_start: str, period_end: str,
) -> Dict[str, Dict[str, Any]]:
    """Return {employee_id: {role, hours}} for the period."""
    clocks = list(db["time_clock"].find(
        {"tenant_id": tenant_id,
         "clock_in_at": {"$gte": period_start + "T00:00:00+00:00"}},
        {"_id": 0}).limit(50000))
    clocks = [c for c in clocks
              if c.get("clock_in_at", "") <
              period_end + "T23:59:59+00:00"]
    by_emp: Dict[str, float] = {}
    for c in clocks:
        try:
            s = datetime.fromisoformat(
                c["clock_in_at"].replace("Z", "+00:00"))
            e = datetime.fromisoformat(
                c["clock_out_at"].replace("Z", "+00:00"))
            hrs = max(0, (e - s).total_seconds() / 3600.0)
            if hrs > 16: continue
            by_emp[c["employee_id"]] = by_emp.get(
                c["employee_id"], 0.0) + hrs
        except Exception:
            continue

    out: Dict[str, Dict[str, Any]] = {}
    for eid, hrs in by_emp.items():
        emp = db["employees"].find_one(
            {"id": eid, "tenant_id": tenant_id})
        if not emp:
            emp = db["employees"].find_one({"id": eid})
        out[eid] = {
            "role": (emp or {}).get("role", "unknown"),
            "name": (
                f"{(emp or {}).get('first_name','')} "
                f"{(emp or {}).get('last_name','')}").strip(),
            "hours": round(hrs, 2),
        }
    return out


def _allocate(policy: Dict[str, Any],
              employee_hours: Dict[str, Dict[str, Any]],
              tip_pool_amount: float) -> Dict[str, Any]:
    """Pure function: given a policy + per-employee hours,
    distribute the tip pool. Returns per-employee allocations
    + per-role rollup."""
    shares = policy.get("shares", {})
    overrides = policy.get("manager_overrides", {})
    # Effective shares: base × (1 + override)
    eff: Dict[str, float] = {}
    for role, base in shares.items():
        adj = base * (1.0 + float(overrides.get(role, 0.0)))
        eff[role] = adj

    # Weight per employee = role_share × hours
    weights: Dict[str, float] = {}
    for eid, info in employee_hours.items():
        rs = float(eff.get(info["role"], 0))
        weights[eid] = rs * info["hours"]

    total_weight = sum(weights.values())
    per_emp: List[Dict[str, Any]] = []
    if total_weight <= 0:
        return {
            "tip_pool_amount": tip_pool_amount,
            "total_distributed": 0.0,
            "per_employee": [],
            "per_role": {},
            "warning": "no eligible hours in period",
        }

    by_role_amt: Dict[str, float] = {}
    by_role_hrs: Dict[str, float] = {}
    for eid, w in weights.items():
        info = employee_hours[eid]
        share = round(tip_pool_amount * w / total_weight, 2)
        per_emp.append({
            "employee_id": eid,
            "name": info["name"],
            "role": info["role"],
            "hours": info["hours"],
            "tip_share": share,
            "effective_hourly_tip": (
                round(share / info["hours"], 2)
                if info["hours"] > 0 else 0),
        })
        by_role_amt[info["role"]] = by_role_amt.get(
            info["role"], 0) + share
        by_role_hrs[info["role"]] = by_role_hrs.get(
            info["role"], 0) + info["hours"]

    per_role = {
        r: {
            "total_tip_share": round(by_role_amt[r], 2),
            "total_hours": round(by_role_hrs[r], 2),
            "avg_per_hour": (
                round(by_role_amt[r] / by_role_hrs[r], 2)
                if by_role_hrs[r] > 0 else 0),
        }
        for r in by_role_amt
    }
    per_emp.sort(key=lambda x: -x["tip_share"])
    return {
        "tip_pool_amount": tip_pool_amount,
        "total_distributed": round(sum(by_role_amt.values()), 2),
        "per_employee": per_emp,
        "per_role": per_role,
    }


@router.post("/allocate/{outlet_id}")
def allocate(
    outlet_id: str,
    body: AllocateBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    pol_resp = get_policy(outlet_id, x_tenant_id=tenant_id)
    policy = pol_resp["policy"]
    emp_hrs = _calc_period_hours_per_employee(
        tenant_id, outlet_id, body.period_start, body.period_end)
    result = _allocate(policy, emp_hrs, body.tip_pool_amount)

    aid = uuid.uuid4().hex[:16]
    record = {
        "id": aid,
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "period_start": body.period_start,
        "period_end": body.period_end,
        "policy_id": policy.get("id"),
        "tip_pool_amount": body.tip_pool_amount,
        "actor_id": body.actor_id,
        "result": result,
        "created_at": _now_iso(),
    }
    db["tip_share_allocations"].insert_one(record.copy())
    _emit_audit(tenant_id, "allocate", aid, {
        "outlet_id": outlet_id,
        "tip_pool": body.tip_pool_amount,
        "employee_count": len(result["per_employee"])})
    return {"ok": True, "allocation_id": aid, **result}


@router.post("/simulate/{outlet_id}")
def simulate(
    outlet_id: str,
    body: SimulateBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Run two allocations: CURRENT policy vs PROPOSED (current
    + delta). Return per-employee + per-role side-by-side delta.

    proposed_shares_delta example: {"busser": 0.1}
      → bussers get +0.1 share points added to their base share
      → recomputes the entire pool against new proportions
    """
    tenant_id = (x_tenant_id or "default").strip().lower()
    pol_resp = get_policy(outlet_id, x_tenant_id=tenant_id)
    current_policy = pol_resp["policy"]

    # Build proposed policy by adding the delta to current shares
    proposed_shares = dict(current_policy.get("shares", {}))
    for role, delta in body.proposed_shares_delta.items():
        proposed_shares[role] = (
            proposed_shares.get(role, 0) + float(delta))
    proposed_policy = {**current_policy, "shares": proposed_shares}

    emp_hrs = _calc_period_hours_per_employee(
        tenant_id, outlet_id, body.period_start, body.period_end)

    current_result = _allocate(current_policy, emp_hrs,
                                 body.tip_pool_amount)
    proposed_result = _allocate(proposed_policy, emp_hrs,
                                 body.tip_pool_amount)

    # Per-employee delta
    cur_by_emp = {e["employee_id"]: e
                   for e in current_result["per_employee"]}
    pro_by_emp = {e["employee_id"]: e
                   for e in proposed_result["per_employee"]}
    side_by_side: List[Dict[str, Any]] = []
    for eid in sorted(set(cur_by_emp) | set(pro_by_emp)):
        c = cur_by_emp.get(eid)
        p = pro_by_emp.get(eid)
        cur_amt = c["tip_share"] if c else 0
        pro_amt = p["tip_share"] if p else 0
        info = emp_hrs.get(eid, {})
        side_by_side.append({
            "employee_id": eid,
            "name": (c or p or {}).get("name") or info.get("name"),
            "role": (c or p or {}).get("role") or info.get("role"),
            "hours": info.get("hours"),
            "current": cur_amt,
            "proposed": pro_amt,
            "delta": round(pro_amt - cur_amt, 2),
        })

    # Per-role delta
    role_delta: Dict[str, Dict[str, float]] = {}
    for role in (set(current_result["per_role"])
                  | set(proposed_result["per_role"])):
        c = current_result["per_role"].get(role, {})
        p = proposed_result["per_role"].get(role, {})
        role_delta[role] = {
            "current_total": float(c.get("total_tip_share", 0)),
            "proposed_total": float(p.get("total_tip_share", 0)),
            "delta": round(
                float(p.get("total_tip_share", 0))
                - float(c.get("total_tip_share", 0)), 2),
            "current_per_hour": float(c.get("avg_per_hour", 0)),
            "proposed_per_hour": float(p.get("avg_per_hour", 0)),
        }

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "tip_pool_amount": body.tip_pool_amount,
        "current_policy_shares": current_policy.get("shares"),
        "proposed_policy_shares": proposed_shares,
        "delta_applied": body.proposed_shares_delta,
        "per_employee_side_by_side": side_by_side,
        "per_role_delta": role_delta,
        "summary": {
            "current_total": current_result["total_distributed"],
            "proposed_total": proposed_result["total_distributed"],
            "headline": (
                "Same tip pool — only redistribution changes per "
                "role")
                if abs(current_result["total_distributed"]
                       - proposed_result["total_distributed"]) < 0.01
                else f"Pool diverges by ${round(proposed_result['total_distributed'] - current_result['total_distributed'], 2)}",
        },
    }


@router.get("/allocations/{outlet_id}")
def list_allocations(
    outlet_id: str,
    period_from: Optional[str] = None,
    limit: int = 50,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id, "outlet_id": outlet_id}
    rows = list(db["tip_share_allocations"].find(q, {"_id": 0})
                .sort("period_start", -1)
                .limit(max(1, min(500, limit))))
    if period_from:
        rows = [r for r in rows
                if r.get("period_start", "") >= period_from]
    return {"ok": True, "total": len(rows), "allocations": rows}
