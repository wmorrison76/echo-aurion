"""
Tip Distribution Audit
======================
B.9 from the CFO toolkit. Every tip-share computation traceable per
shift, per server, per pool. Tip-pooling lawsuits (FLSA violations)
are common — this is the legal defense and the fairness signal.

Reads from:
  · `tip_pools`            — per-shift pool aggregations
  · `foh_tip_configs`      — pool-share rules (server / busser / runner)
  · `pos_checks`           — checks that contributed tips
  · `foh_servers`          — server registry
  · `labor_actuals`        — hours worked per server per shift

Real math: walks every check tip → pool aggregation → distribution
formula → per-server allocation. Generates an audit row that captures
the entire chain so any future tip-share computation can be replayed.

Doctrine alignment:
  · §3.1 append-only — every audit row is persisted; never modified
  · §1.1 transparency — formula and inputs both surfaced; the math
    is publicly inspectable
  · Privacy Tenet 4 — server identifiers are persistent but the
    operator UI uses display-name only; no PII leaves the audit
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from database import db


router = APIRouter(prefix="/api/tip-audit", tags=["cfo-tip-audit"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _ensure_indexes():
    db["tip_audit_runs"].create_index([("property_id", 1), ("shift_date", 1), ("shift_id", 1)], unique=True)
    db["tip_audit_runs"].create_index("computed_at")


try:
    _ensure_indexes()
except Exception:
    pass


@router.post("/compute/{shift_id}")
async def compute_shift_audit(shift_id: str):
    """Run the tip-share audit for a single shift. Idempotent — recomputing
    overwrites the prior row for the same shift_id, but the prior row is
    archived to `tip_audit_history` first so the chain remains replayable."""
    pool = db["tip_pools"].find_one({"shift_id": shift_id}, {"_id": 0})
    if not pool:
        raise HTTPException(404, f"No tip pool found for shift {shift_id}")

    config = db["foh_tip_configs"].find_one(
        {"property_id": pool.get("property_id"), "active": True}, {"_id": 0},
    )
    if not config:
        raise HTTPException(404, f"No active tip config for property {pool.get('property_id')}")

    # Pull contributing checks
    checks = list(
        db["pos_checks"].find(
            {"shift_id": shift_id, "property_id": pool.get("property_id")},
            {"_id": 0, "check_id": 1, "tip_cents": 1, "server_id": 1, "subtotal_cents": 1, "closed_at": 1},
        )
    )
    total_tips_cents = sum(c.get("tip_cents", 0) for c in checks)
    total_sales_cents = sum(c.get("subtotal_cents", 0) for c in checks)

    # Pull the shift's labor actuals (server hours)
    labor_rows = list(
        db["labor_actuals"].find(
            {"shift_id": shift_id, "property_id": pool.get("property_id")},
            {"_id": 0, "employee_id": 1, "role": 1, "hours_worked": 1, "name": 1},
        )
    )

    # Compute pool shares per role per the config
    role_pools = config.get("role_shares", {})
    if not role_pools:
        raise HTTPException(400, "Tip config has no role_shares defined")

    # Validate that role_shares sum to 1.0 (with floating-point tolerance)
    share_sum = sum(role_pools.values())
    if abs(share_sum - 1.0) > 0.001:
        raise HTTPException(400, f"role_shares sum to {share_sum}; must sum to 1.0")

    # Compute role-pool dollars
    role_pool_cents: Dict[str, int] = {}
    for role, share in role_pools.items():
        role_pool_cents[role] = int(round(total_tips_cents * share))

    # Re-balance any rounding remainder to the largest pool
    remainder = total_tips_cents - sum(role_pool_cents.values())
    if remainder != 0 and role_pool_cents:
        largest = max(role_pool_cents.keys(), key=lambda k: role_pool_cents[k])
        role_pool_cents[largest] += remainder

    # Per-employee allocation: hours-weighted within their role
    allocations: List[Dict] = []
    by_role: Dict[str, List[Dict]] = {}
    for lr in labor_rows:
        by_role.setdefault(lr["role"], []).append(lr)

    for role, role_pool in role_pool_cents.items():
        employees_in_role = by_role.get(role, [])
        if not employees_in_role:
            # Pool exists but no one worked the role — flag for audit
            allocations.append({
                "role": role,
                "warning": "pool_unallocated_no_workers_in_role",
                "pool_cents": role_pool,
            })
            continue
        total_hours = sum(e.get("hours_worked", 0) for e in employees_in_role)
        if total_hours <= 0:
            allocations.append({
                "role": role,
                "warning": "pool_unallocated_zero_hours",
                "pool_cents": role_pool,
            })
            continue
        for emp in employees_in_role:
            share = emp.get("hours_worked", 0) / total_hours
            cents = int(round(role_pool * share))
            allocations.append({
                "employee_id": emp["employee_id"],
                "name": emp.get("name"),
                "role": role,
                "hours_worked": emp.get("hours_worked"),
                "hours_share_of_role": round(share, 4),
                "role_pool_cents": role_pool,
                "allocated_cents": cents,
            })

    # Verify allocations sum to total tips (with rounding tolerance)
    allocated_total = sum(a.get("allocated_cents", 0) for a in allocations)
    rounding_remainder = total_tips_cents - allocated_total
    integrity_pass = abs(rounding_remainder) <= len(allocations) + 1   # 1 cent slack per allocation

    audit_record = {
        "shift_id": shift_id,
        "property_id": pool.get("property_id"),
        "shift_date": pool.get("shift_date"),
        "computed_at": _now(),
        "config_id": config.get("config_id"),
        "config_role_shares": role_pools,
        "checks_contributing": len(checks),
        "total_tips_cents": total_tips_cents,
        "total_sales_cents": total_sales_cents,
        "tip_rate_of_sales": round(total_tips_cents / total_sales_cents, 4) if total_sales_cents else 0,
        "role_pool_cents": role_pool_cents,
        "allocations": allocations,
        "allocated_total_cents": allocated_total,
        "rounding_remainder_cents": rounding_remainder,
        "integrity_pass": integrity_pass,
    }

    # Archive prior run before overwriting
    prior = db["tip_audit_runs"].find_one({"shift_id": shift_id}, {"_id": 0})
    if prior:
        db["tip_audit_history"].insert_one({**prior, "archived_at": _now()})

    db["tip_audit_runs"].update_one(
        {"shift_id": shift_id}, {"$set": audit_record}, upsert=True,
    )
    return audit_record


@router.get("/{property_id}")
async def list_audits(property_id: str, days_back: int = Query(7, ge=1, le=90)):
    """List recent tip audits for a property."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days_back)).isoformat()
    audits = list(
        db["tip_audit_runs"].find(
            {"property_id": property_id, "shift_date": {"$gte": cutoff}}, {"_id": 0},
        ).sort("shift_date", -1)
    )
    return {
        "property_id": property_id,
        "days_back": days_back,
        "count": len(audits),
        "audits": audits,
        "integrity_failures": [a for a in audits if not a.get("integrity_pass")],
    }


@router.get("/employee/{employee_id}")
async def employee_history(employee_id: str, days_back: int = Query(30, ge=1, le=180)):
    """Per-employee tip history. Lets a server (or a Director) see
    every shift's allocation transparently — Privacy Tenet 6:
    transparency runs both ways."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days_back)).isoformat()
    runs = list(
        db["tip_audit_runs"].find(
            {"shift_date": {"$gte": cutoff}, "allocations.employee_id": employee_id},
            {"_id": 0},
        ).sort("shift_date", -1)
    )
    employee_history: List[Dict] = []
    total_received_cents = 0
    total_hours = 0.0
    for r in runs:
        for a in r.get("allocations", []):
            if a.get("employee_id") == employee_id:
                employee_history.append({
                    "shift_date": r.get("shift_date"),
                    "shift_id": r.get("shift_id"),
                    "role": a.get("role"),
                    "hours_worked": a.get("hours_worked"),
                    "hours_share_of_role": a.get("hours_share_of_role"),
                    "allocated_cents": a.get("allocated_cents"),
                })
                total_received_cents += a.get("allocated_cents", 0)
                total_hours += a.get("hours_worked", 0)
    avg_per_hour = (total_received_cents / total_hours) if total_hours else 0
    return {
        "employee_id": employee_id,
        "days_back": days_back,
        "shifts": len(employee_history),
        "total_received_cents": total_received_cents,
        "total_hours": round(total_hours, 2),
        "avg_per_hour_cents": round(avg_per_hour, 2),
        "history": employee_history,
    }
