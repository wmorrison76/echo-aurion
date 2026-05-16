"""
D18 · Central audit log + chef approval inbox.

Two related capabilities, one module:

  1. Audit log (audit_events collection)
     Every D16 module writes its own audit_log[] inside its document.
     Useful per-record but useless for "show me everything Maria did
     yesterday across every module." This module gives every module
     a one-line emit() helper to ALSO append to a central event-
     sourced log keyed by user, by entity, by timestamp.

     audit_events row shape:
       { id, tenant_id, occurred_at, user_id, user_name, role,
         module ("commissary" | "chronos" | "carissa" | "gio" | …),
         action ("submit" | "approve" | "amend" | "calibrate" | …),
         entity_type, entity_id, summary, metadata{} }

  2. Approval inbox (pending_approvals collection)
     The system now generates a lot of human-in-the-loop work:
       · BEO production plans waiting for chef approval (D16c)
       · Auto-order recommendations waiting (D16h-followup)
       · Flex-labor recommendations waiting (D16h-flex)
       · Carissa / Gio knowledge entries pending review
       · Commissary order amendments
     Each module today surfaces its own pending list. The chef
     would need to check 5 places. This collection aggregates them
     so the chef sees ONE list of "stuff waiting on me."

     pending_approvals row shape:
       { id, tenant_id, kind ("beo_plan" | "auto_order" | …),
         entity_id, outlet_id, summary, urgency, created_at,
         expires_at, source_module, payload{} }

The emit + create helpers are intentionally light so other modules
can call them without coupling to this module's internals.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Emit helpers (used by every other module) ──────────────────────────

def emit_audit(
    *,
    module: str,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    role: Optional[str] = None,
    tenant_id: str = "default",
    summary: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Append one event to audit_events. Designed to be cheap (single
    insert, no read-modify-write) so other modules can call this in
    their hot paths without slowing them down.

    No-op safe: if the DB write fails, we log and move on rather
    than blocking the parent call. The calling module already wrote
    its own audit_log[] — this central log is a SECOND copy used
    for cross-module reporting; losing one event here doesn't break
    operational correctness."""
    doc = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "occurred_at": _now_iso(),
        "user_id": user_id,
        "user_name": user_name,
        "role": role,
        "module": module,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "summary": summary,
        "metadata": metadata or {},
    }
    try:
        db["audit_events"].insert_one(doc.copy())
    except Exception:
        # Don't let audit-log failures break a real workflow.
        pass
    return doc


import logging as _logging
_log = _logging.getLogger("luccca.audit_inbox.notify")


def _maybe_notify_on_pending(doc: Dict[str, Any]) -> None:
    """D26 · Push high/critical pending approvals to the existing
    notification service so the chef gets a phone push, not just a
    poll-based banner. Wrapped in try/except — notification failures
    must never block inbox creation. Low/normal urgency stays in the
    inbox without a push (otherwise we'd drown the chef).

    D27 · failures now LOG with module + entity context. Previously
    a broken notification subsystem swallowed errors silently; that
    let real bugs hide for days."""
    urgency = doc.get("urgency") or "normal"
    if urgency not in ("high", "critical"):
        return
    ns = None
    import_errors: List[str] = []
    for path in ("backend.notification_service", "notification_service"):
        try:
            ns = __import__(path, fromlist=["*"])
            break
        except Exception as e:
            import_errors.append(f"{path}: {type(e).__name__}: {e}")
    if ns is None:
        _log.warning(
            "D26 notify import failed for %s/%s; tried: %s",
            doc.get("kind"), doc.get("entity_id"), " | ".join(import_errors))
        return
    notification_type = ("approval_critical" if urgency == "critical"
                          else "approval_high")
    outlet_role = (f"manager:{doc.get('outlet_id')}" if doc.get("outlet_id")
                   else "manager:any")
    try:
        ns.send_to_role(
            role=outlet_role,
            notification_type=notification_type,
            message=doc.get("summary") or f"{doc['kind']} needs review",
            entity_type=doc.get("kind") or "approval",
            entity_id=doc.get("entity_id") or "")
    except Exception as e:
        _log.warning(
            "D26 notify send failed for %s/%s (urgency=%s): %s: %s",
            doc.get("kind"), doc.get("entity_id"), urgency,
            type(e).__name__, e)


def create_pending_approval(
    *,
    kind: str,                     # "beo_plan" | "auto_order" | …
    entity_id: str,
    summary: str,
    outlet_id: Optional[str] = None,
    tenant_id: str = "default",
    urgency: str = "normal",       # "low" | "normal" | "high" | "critical"
    expires_in_hours: Optional[int] = None,
    source_module: str = "",
    payload: Optional[Dict[str, Any]] = None,
    requested_by_user_id: Optional[str] = None,
    requested_by_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Add an item to the chef approval inbox. Idempotent on
    (kind, entity_id) — re-calling for the same entity replaces
    the prior pending row rather than duplicating.

    expires_in_hours lets the issuer say "if no one approves this
    by 6h, escalate." The escalation logic is downstream — this
    module just stores the timestamp."""
    expires_at = None
    if expires_in_hours:
        expires_at = (datetime.now(timezone.utc)
                      + timedelta(hours=int(expires_in_hours))).isoformat()

    doc = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "kind": kind,
        "entity_id": entity_id,
        "outlet_id": outlet_id,
        "summary": summary,
        "urgency": urgency,
        "expires_at": expires_at,
        "source_module": source_module,
        "payload": payload or {},
        "requested_by_user_id": requested_by_user_id,
        "requested_by_name": requested_by_name,
        "status": "pending",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db["pending_approvals"].update_one(
        {"kind": kind, "entity_id": entity_id, "tenant_id": tenant_id},
        {"$set": doc}, upsert=True)

    # D26 · push high/critical urgencies to the notification service
    # so on-shift managers see them without polling the inbox.
    _maybe_notify_on_pending(doc)

    return doc


def resolve_pending_approval(
    *,
    kind: str,
    entity_id: str,
    decision: str,                 # "approved" | "rejected" | "expired"
    decided_by_user_id: Optional[str] = None,
    decided_by_name: Optional[str] = None,
    note: Optional[str] = None,
    tenant_id: str = "default",
) -> Optional[Dict[str, Any]]:
    """Mark the pending row resolved. The module that holds the actual
    business logic (approve_plan, accept_recommendation, etc.) calls
    this AFTER its own decision processing succeeds, so an inbox
    item never lingers as 'pending' after the work is done."""
    row = db["pending_approvals"].find_one(
        {"kind": kind, "entity_id": entity_id, "tenant_id": tenant_id},
        {"_id": 0})
    if not row:
        return None
    db["pending_approvals"].update_one(
        {"kind": kind, "entity_id": entity_id, "tenant_id": tenant_id},
        {"$set": {
            "status": decision,
            "decided_by_user_id": decided_by_user_id,
            "decided_by_name": decided_by_name,
            "decided_at": _now_iso(),
            "decision_note": note or "",
            "updated_at": _now_iso(),
        }})
    return row


# ─── Read-side endpoints ─────────────────────────────────────────────────

@router.get("/events")
def list_events(
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    module: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    since: Optional[str] = None,        # ISO timestamp
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
):
    """Cross-module audit log search. Every filter is optional; the
    UI typically either pivots on user (one operator's day) or on
    entity (everything that happened to this BEO)."""
    tenant = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant}
    if user_id:    q["user_id"] = user_id
    if user_name:  q["user_name"] = user_name
    if module:     q["module"] = module
    if entity_type: q["entity_type"] = entity_type
    if entity_id:  q["entity_id"] = entity_id
    if since:      q["occurred_at"] = {"$gte": since}

    rows = list(db["audit_events"].find(q, {"_id": 0})
                .sort("occurred_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "events": rows}


@router.get("/events/by-user-day")
def user_day_view(
    user_name: str,
    date: str,                          # YYYY-MM-DD
    x_tenant_id: Optional[str] = Header(None),
):
    """A common audit pivot: 'show me everything Maria did on 2026-05-08
    across every module.' Returns events sorted by occurred_at +
    a per-module count tile."""
    tenant = (x_tenant_id or "default").strip().lower()
    day_start = f"{date}T00:00:00"
    day_end   = f"{date}T23:59:59"
    rows = list(db["audit_events"].find(
        {"tenant_id": tenant, "user_name": user_name,
         "occurred_at": {"$gte": day_start}}, {"_id": 0})
        .sort("occurred_at", 1).limit(2000))
    rows = [r for r in rows if (r.get("occurred_at") or "") <= day_end]
    by_module: Dict[str, int] = {}
    for r in rows:
        m = r.get("module") or "?"
        by_module[m] = by_module.get(m, 0) + 1
    return {"ok": True, "user_name": user_name, "date": date,
            "total": len(rows), "by_module": by_module,
            "events": rows}


@router.get("/inbox")
def approval_inbox(
    outlet_id: Optional[str] = None,
    kind: Optional[str] = None,
    urgency: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(None),
):
    """The chef's approval inbox. ONE list across BEO plans,
    auto-orders, flex-labor recs, knowledge entries, etc. Sorted
    urgency-first then oldest-first so time-critical items don't
    drown."""
    tenant = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant, "status": "pending"}
    if outlet_id: q["outlet_id"] = outlet_id
    if kind:      q["kind"] = kind
    if urgency:   q["urgency"] = urgency

    rows = list(db["pending_approvals"].find(q, {"_id": 0}))
    urgency_rank = {"critical": 0, "high": 1, "normal": 2, "low": 3}
    rows.sort(key=lambda r: (urgency_rank.get(r.get("urgency"), 4),
                              r.get("created_at") or ""))

    # Roll up by kind so the UI can render a "5 BEOs / 2 auto-orders"
    # tile without re-iterating.
    by_kind: Dict[str, int] = {}
    for r in rows:
        k = r.get("kind") or "?"
        by_kind[k] = by_kind.get(k, 0) + 1

    return {"ok": True, "total": len(rows),
            "by_kind": by_kind, "items": rows}


# ─── Manual-resolve endpoint (for things that don't auto-resolve) ───────

class ResolveBody(BaseModel):
    decision: str = Field(..., pattern=r"^(approved|rejected|expired)$")
    note: Optional[str] = None
    decided_by_user_id: Optional[str] = None
    decided_by_name: Optional[str] = None


@router.post("/inbox/{kind}/{entity_id}/resolve")
def resolve_inbox(
    kind: str,
    entity_id: str,
    body: ResolveBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Manual resolve. Most resolutions come from the source module
    (approve_plan, accept_recommendation) calling
    resolve_pending_approval() directly — but for a knowledge entry
    or a free-form event the chef needs to clear the inbox row from
    the inbox UI itself."""
    tenant = (x_tenant_id or "default").strip().lower()
    row = resolve_pending_approval(
        kind=kind, entity_id=entity_id,
        decision=body.decision,
        decided_by_user_id=body.decided_by_user_id,
        decided_by_name=body.decided_by_name,
        note=body.note,
        tenant_id=tenant)
    if not row:
        raise HTTPException(404, "no pending approval found")
    # Also stamp an audit event for the decision itself
    emit_audit(
        module="audit-inbox",
        action=f"resolve:{body.decision}",
        entity_type=kind, entity_id=entity_id,
        user_id=body.decided_by_user_id,
        user_name=body.decided_by_name,
        tenant_id=tenant,
        summary=body.note or f"manually resolved {kind}/{entity_id}",
    )
    return {"ok": True, "kind": kind, "entity_id": entity_id,
            "decision": body.decision}
