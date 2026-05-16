"""
Admin Audit Log
================
L.5 from the launch-readiness audit. Append-only log of every
administrative action — separate from the event_bus_store (which is
business events) — focused on:

  · Who logged in
  · Who accessed what
  · Who changed what configuration
  · Who deactivated/reactivated what
  · Who escalated their own privileges
  · Who exported data
  · Who deleted data (subject to right-to-deletion)

This is the SOC 2 access-log evidence + insider-threat protection
+ "who changed the budget on May 9?" forensic answer.

The collection is `admin_audit_log` and is append-only by contract.
Querying is gated to admin roles. Writing is automatic for any
endpoint decorated with @admin_audited.

Doctrine alignment:
  · §3.1 append-only — log is immutable
  · §1.1 transparency — admin actions are logged and queryable
  · Privacy Tenet 4 — masks sensitive payload fields by default
  · Privacy Tenet 6 — staff transparency runs both ways: staff
    can see what was logged about their own actions
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Callable
from uuid import uuid4
from functools import wraps
from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel

from database import db


router = APIRouter(prefix="/api/admin-audit", tags=["admin-audit"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())


SENSITIVE_PAYLOAD_FIELDS = {
    "password", "api_key", "secret", "token", "credit_card",
    "ssn", "tax_id", "bank_account", "routing_number",
}


def _ensure_indexes():
    db["admin_audit_log"].create_index([("ts", -1)])
    db["admin_audit_log"].create_index([("actor_id", 1), ("ts", -1)])
    db["admin_audit_log"].create_index([("action", 1), ("ts", -1)])
    db["admin_audit_log"].create_index([("entity_type", 1), ("entity_id", 1), ("ts", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class AdminAuditEntry(BaseModel):
    actor_id: str
    actor_role: Optional[str] = None
    action: str                        # login | logout | view | create | update | delete | export | escalate
    entity_type: Optional[str] = None  # outlet | budget | user | config | etc.
    entity_id: Optional[str] = None
    summary: str
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    payload_redacted: Optional[Dict] = None
    success: bool = True
    failure_reason: Optional[str] = None
    metadata: Optional[Dict] = None


# ─────────────────────────────────────────────────────────────────
# Recording
# ─────────────────────────────────────────────────────────────────
def record(entry: AdminAuditEntry) -> str:
    """Persist an admin action to the audit log. Idempotent on
    (actor_id + action + entity_id + ts) is not enforced — duplicate
    writes are accepted and counted (each one is real evidence)."""
    record = entry.model_dump()
    record["audit_id"] = _uid()
    record["ts"] = _now()
    record["payload_redacted"] = _redact(record.get("payload_redacted") or {})
    db["admin_audit_log"].insert_one(record.copy())
    return record["audit_id"]


def admin_audited(action: str, entity_type: Optional[str] = None) -> Callable:
    """Decorator for FastAPI handlers. Wraps the handler so every call
    is recorded to the admin_audit_log. The handler must accept a
    `request: Request` parameter for IP + UA capture.

    Usage:
        @router.post("/budget")
        @admin_audited(action="update", entity_type="budget")
        async def update_budget(...): ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if request is None:
                for a in args:
                    if isinstance(a, Request):
                        request = a
                        break

            from services.structured_logging import actor_id_var, tenant_id_var
            actor = actor_id_var.get() or "anonymous"

            success = True
            failure = None
            entity_id = None
            try:
                result = await fn(*args, **kwargs) if _is_coro(fn) else fn(*args, **kwargs)
                if isinstance(result, dict):
                    entity_id = (
                        result.get("id") or result.get(f"{entity_type}_id") if entity_type else None
                    )
                return result
            except Exception as exc:
                success = False
                failure = f"{exc.__class__.__name__}: {str(exc)[:200]}"
                raise
            finally:
                try:
                    record(AdminAuditEntry(
                        actor_id=actor,
                        action=action,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        summary=f"{action} on {entity_type or 'unknown'}",
                        request_path=str(request.url.path) if request else None,
                        request_method=request.method if request else None,
                        ip_address=request.client.host if request and request.client else None,
                        user_agent=request.headers.get("user-agent") if request else None,
                        success=success,
                        failure_reason=failure,
                    ))
                except Exception:
                    # Never let audit failures break the actual request
                    pass
        return wrapper
    return decorator


def _is_coro(fn: Callable) -> bool:
    import inspect
    return inspect.iscoroutinefunction(fn)


def _redact(payload: Dict) -> Dict:
    """Redact sensitive keys from a payload dict before logging."""
    if not isinstance(payload, dict):
        return {}
    out = {}
    for k, v in payload.items():
        if k.lower() in SENSITIVE_PAYLOAD_FIELDS:
            out[k] = "REDACTED"
        elif isinstance(v, dict):
            out[k] = _redact(v)
        else:
            out[k] = v
    return out


# ─────────────────────────────────────────────────────────────────
# Read API — admin only at deploy time (auth gating left to platform middleware)
# ─────────────────────────────────────────────────────────────────
@router.post("/log")
async def log_action(entry: AdminAuditEntry):
    """Manually record an admin action. Most code paths use the
    @admin_audited decorator instead, but this endpoint exists for
    out-of-band events (e.g., a CLI tool action)."""
    audit_id = record(entry)
    return {"audit_id": audit_id, "ts": _now()}


@router.get("")
async def query_audit(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    since: Optional[str] = None,
    until: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
):
    """Query the audit log with filters. Returns most-recent-first."""
    q: Dict = {}
    if actor_id:
        q["actor_id"] = actor_id
    if action:
        q["action"] = action
    if entity_type:
        q["entity_type"] = entity_type
    if entity_id:
        q["entity_id"] = entity_id
    if since or until:
        q["ts"] = {}
        if since:
            q["ts"]["$gte"] = since
        if until:
            q["ts"]["$lte"] = until
    rows = list(db["admin_audit_log"].find(q, {"_id": 0}).sort("ts", -1).limit(limit))
    return {"count": len(rows), "entries": rows}


@router.get("/by-actor/{actor_id}")
async def actor_history(actor_id: str, limit: int = 100):
    """Per-actor history. Privacy Tenet 6: an employee can use this
    endpoint to see what was logged about their own actions."""
    rows = list(db["admin_audit_log"].find({"actor_id": actor_id}, {"_id": 0}).sort("ts", -1).limit(limit))
    return {"actor_id": actor_id, "count": len(rows), "entries": rows}


@router.get("/by-entity/{entity_type}/{entity_id}")
async def entity_history(entity_type: str, entity_id: str, limit: int = 100):
    """Per-entity history. Forensic answer to 'who changed this and when?'"""
    rows = list(
        db["admin_audit_log"].find(
            {"entity_type": entity_type, "entity_id": entity_id}, {"_id": 0}
        ).sort("ts", -1).limit(limit)
    )
    return {"entity_type": entity_type, "entity_id": entity_id, "count": len(rows), "entries": rows}


@router.get("/summary")
async def daily_summary(days: int = Query(7, ge=1, le=90)):
    """Top actors / actions over the last N days. Surface for the
    nightly admin digest."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline_actor = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$actor_id", "count": {"$sum": 1}, "last_action": {"$max": "$ts"}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    pipeline_action = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    failed_actions = db["admin_audit_log"].count_documents({"ts": {"$gte": cutoff}, "success": False})
    return {
        "window_days": days,
        "since": cutoff,
        "top_actors": list(db["admin_audit_log"].aggregate(pipeline_actor)),
        "actions_breakdown": list(db["admin_audit_log"].aggregate(pipeline_action)),
        "failed_actions": failed_actions,
    }
