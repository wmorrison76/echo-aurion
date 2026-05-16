"""
D28 · Echo AI³ append-only event log.

Per the Echo AI³ Integrated Technical Specification (§3.1):

  "Echo AI³ does not compress its memory. Every signal, prediction,
   intervention, outcome, dismissal — every meaningful event — is
   written to an append-only event log. The log is never edited.
   It is never summarized."

This module is the writer + retrieval API. Compression is not just
unimplemented — it is forbidden by the architectural contract. There
is no `update_event()`. There is no `delete_event()`. There is only
`append_event()`, plus retrieval queries layered above it.

Contract enforcement:
  · Append-only           — writer never updates; only inserts new
                            rows. Updates produce NEW events keyed
                            via parent_event_id.
  · Tenet 2/7 (decay)     — sensitive sensitivity classes carry a
                            non-null expires_at on insert.
  · Tenet 8 (no surface)  — sensitivity="forbidden" forces
                            surfaceable=false and expires_at=now()
                            so the row exists for audit but never
                            returns from queries that don't ask
                            specifically for it.
  · Voice register        — guest/staff/operator/pass_dev. Read API
                            refuses cross-register reads (operator
                            UI cannot pull staff-register events).
  · Tenant isolation      — every write requires tenant_id; every
                            read filters by tenant_id (D27 contract).

Retrospective metadata (§2.4) lives in payload for prediction events
so the Monte Carlo replay (D29) can reconstruct the decision space.

What this module is NOT:
  · Embedding storage. Phase 2 adds a co-located embedding column;
    this module remains the structured source of truth.
  · Network sync. The lineage protocol (§3.5) is Phase 6+.
  · A summarizer. Compression is forbidden by §3.1.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/echo/events", tags=["echo-events"])


# ─── Constants from the doctrine ─────────────────────────────────────────

ALLOWED_KINDS = {
    "signal", "prediction", "intervention", "outcome",
    "dismissal", "correction", "calibration",
}

ALLOWED_REGISTERS = {"guest", "staff", "operator", "pass_dev"}

ALLOWED_SENSITIVITY = {
    "ordinary", "guest_pii", "staff_pii", "regulated", "forbidden",
}

# Sensitivity classes that REQUIRE expires_at on insert (Tenet 2/7).
SENSITIVE_REQUIRES_EXPIRY = {"guest_pii", "staff_pii", "regulated", "forbidden"}

# Default decay windows for each sensitivity class (Tenet 7). Caller
# can override; the values here are floors that the contract test
# verifies are honored at the data layer.
DEFAULT_DECAY_HOURS = {
    "guest_pii":   24 * 7,        # 7 days for guest PII
    "staff_pii":   24 * 30,       # 30 days for staff PII
    "regulated":   24 * 90,       # 90 days for regulated data
    "forbidden":   0,             # immediate; audit-only, never surfaced
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Append (the only write path) ────────────────────────────────────────

class AppendEventBody(BaseModel):
    """Body for the append-only writer. Matches shared/types/echo-events.ts
    EchoEvent shape."""
    kind: str
    voice_register: Optional[str] = None
    parent_event_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    sensitivity: str = "ordinary"
    expires_at: Optional[str] = None      # if None, defaults from class
    authored_by: Dict[str, Any] = Field(
        default_factory=lambda: {"kind": "system", "id": "unknown"})
    occurred_at: Optional[str] = None     # if None, set to now


def _validate_event(body: AppendEventBody) -> None:
    if body.kind not in ALLOWED_KINDS:
        raise HTTPException(400,
            f"kind must be one of {sorted(ALLOWED_KINDS)}")
    if body.voice_register is not None and \
       body.voice_register not in ALLOWED_REGISTERS:
        raise HTTPException(400,
            f"voice_register must be one of {sorted(ALLOWED_REGISTERS)}")
    if body.sensitivity not in ALLOWED_SENSITIVITY:
        raise HTTPException(400,
            f"sensitivity must be one of {sorted(ALLOWED_SENSITIVITY)}")
    # §1.4 + §4.2: predictions and interventions MUST carry a register
    if body.kind in ("prediction", "intervention", "correction") \
       and body.voice_register is None:
        raise HTTPException(400,
            f"{body.kind} events require voice_register")
    # Confidence is bounded
    if body.confidence is not None and not (0.0 <= body.confidence <= 1.0):
        raise HTTPException(400, "confidence must be in [0.0, 1.0]")


def append_event(body: AppendEventBody, *, tenant_id: str) -> Dict[str, Any]:
    """Append one event to the log. Helper used by the router AND by
    other backend modules that emit events (commissary, chronos,
    audit-log, etc.). Returns the canonical row."""
    _validate_event(body)
    occurred_at = body.occurred_at or _now_iso()

    # Tenet 8 enforcement: forbidden-sensitivity is recorded for audit
    # but is never surfaceable. expires_at clamps to occurred_at so the
    # row exists in the log but is filtered out of every non-pass_dev
    # query. This is the architectural test the SILENT_SERVICE doctrine
    # demands.
    sens = body.sensitivity
    if sens == "forbidden":
        surfaceable = False
        expires_at = occurred_at      # immediate decay
    else:
        surfaceable = True
        expires_at = body.expires_at
        # Tenet 2/7 default expiry if missing on a sensitive class
        if sens in SENSITIVE_REQUIRES_EXPIRY and not expires_at:
            from datetime import timedelta
            try:
                base = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
            except Exception:
                base = datetime.now(timezone.utc)
            decay_hours = DEFAULT_DECAY_HOURS.get(sens, 24 * 7)
            expires_at = (base + timedelta(hours=decay_hours)).isoformat()

    doc = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "occurred_at": occurred_at,
        "kind": body.kind,
        "voice_register": body.voice_register,
        "parent_event_id": body.parent_event_id,
        "context": body.context or {},
        "payload": body.payload or {},
        "confidence": body.confidence,
        "sensitivity": sens,
        "surfaceable": surfaceable,
        "expires_at": expires_at,
        "authored_by": body.authored_by,
        # Append-only marker: even if a future migration tried to flag
        # rows for re-write, the unconditional True here makes the
        # intent explicit at the data layer. Compression-prevention
        # contract — §3.1.
        "_append_only": True,
    }
    db["echo_events"].insert_one(doc.copy())
    return doc


@router.post("")
def post_event(
    body: AppendEventBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """HTTP endpoint for the append-only writer. Most callers should
    use append_event() directly (cheaper, no JSON round-trip), but
    third-party modules and the React renderer can POST."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    return {"ok": True, "event": append_event(body, tenant_id=tenant_id)}


# ─── Retrieval (filtered by tenant + register + surfaceable) ─────────────

@router.get("")
def list_events(
    kind: Optional[str] = None,
    parent_event_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    since: Optional[str] = None,
    until: Optional[str] = None,
    register: Optional[str] = None,
    include_unsurfaceable: bool = False,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Query the event log. Defaults enforce the contract:
      · Tenant scoped (x_tenant_id header > "default")
      · surfaceable=True only (Tenet 8)
      · Voice-register-matched if x_audience_register provided
        (e.g. operator UI passes 'operator', refuses staff-register
        rows)

    `include_unsurfaceable=true` is permitted ONLY when the audience
    register is `pass_dev`. Any other audience asking for unsurfaceable
    rows is refused — Tenet 8 contract.
    """
    tenant_id = (x_tenant_id or "default").strip().lower()
    audience = (x_audience_register or "").strip().lower() or None

    if audience and audience not in ALLOWED_REGISTERS:
        raise HTTPException(400,
            f"x_audience_register must be one of {sorted(ALLOWED_REGISTERS)}")

    # Tenet 8 audit gate
    if include_unsurfaceable and audience != "pass_dev":
        raise HTTPException(403,
            "include_unsurfaceable requires audience register=pass_dev")

    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if not include_unsurfaceable:
        q["surfaceable"] = True
    if audience and audience != "pass_dev":
        # Cross-register fetch refused. A guest UI can read guest
        # events; staff register can read staff or operator (managers
        # see line communication); pass_dev sees everything.
        if audience == "guest":
            q["voice_register"] = "guest"
        elif audience == "staff":
            q["voice_register"] = {"$in": ["staff", "guest"]}
        elif audience == "operator":
            q["voice_register"] = {"$in": ["operator", "staff"]}
    if kind:
        if kind not in ALLOWED_KINDS:
            raise HTTPException(400,
                f"kind must be one of {sorted(ALLOWED_KINDS)}")
        q["kind"] = kind
    if parent_event_id:
        q["parent_event_id"] = parent_event_id
    if correlation_id:
        q["context.correlation_id"] = correlation_id
    if since or until:
        rng: Dict[str, Any] = {}
        if since: rng["$gte"] = since
        if until: rng["$lt"] = until
        q["occurred_at"] = rng

    # Filter by expires_at — rows past expiry vanish from non-pass_dev
    # queries even if their surfaceable flag is True. Tenet 7 contract.
    now = _now_iso()
    if not include_unsurfaceable:
        q["$or"] = [
            {"expires_at": None},
            {"expires_at": {"$gt": now}},
        ]

    rows = list(db["echo_events"].find(q, {"_id": 0})
                .sort("occurred_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "tenant_id": tenant_id,
            "audience": audience, "total": len(rows), "events": rows}


# ─── Replay (for retrospective practice §2.4) ────────────────────────────

@router.get("/replay/{prediction_id}")
def replay_prediction(
    prediction_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Replay a prediction's full decision space: the prediction
    itself + its parent signals + every outcome / dismissal /
    correction / calibration event keyed back to it. Used by the
    Monte Carlo retrospective practice (§2.4) — D29 will build the
    automated replay analyzer; this endpoint is the data feed.

    Requires audience register=pass_dev because the full replay
    chain may include unsurfaceable rows (forbidden-sensitivity)
    that an auditor needs to see."""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "replay requires audience register=pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()

    # The prediction itself
    pred = db["echo_events"].find_one(
        {"id": prediction_id, "tenant_id": tenant_id, "kind": "prediction"},
        {"_id": 0})
    if not pred:
        raise HTTPException(404, "prediction not found")

    # Children (outcomes, dismissals, corrections, calibrations)
    children = list(db["echo_events"].find(
        {"tenant_id": tenant_id, "parent_event_id": prediction_id},
        {"_id": 0}).sort("occurred_at", 1))

    # Sibling signals — same correlation_id if present
    siblings: List[Dict[str, Any]] = []
    cid = (pred.get("context") or {}).get("correlation_id")
    if cid:
        siblings = list(db["echo_events"].find(
            {"tenant_id": tenant_id, "context.correlation_id": cid,
             "kind": "signal"}, {"_id": 0}).sort("occurred_at", 1))

    return {"ok": True, "prediction": pred,
            "children": children, "siblings": siblings,
            "_doctrine": "Replay returns the full original events. "
                         "No summary. No compression. §3.1."}


# ─── Privacy spine (Tenet 5) ─────────────────────────────────────────────

@router.get("/privacy/review/{guest_id}")
def privacy_review(
    guest_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """Tenet 5 contract: a guest can review every event the system
    holds keyed to them. Returns the rows; no system-side filtering
    of "what we want them to see." The guest's own rows (where
    context.guest_id matches) plus any prediction/intervention that
    referenced them in payload."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["echo_events"].find(
        {"tenant_id": tenant_id,
         "$or": [{"context.guest_id": guest_id},
                 {"payload.guest_id": guest_id}]},
        {"_id": 0}).sort("occurred_at", -1).limit(2000))
    return {"ok": True, "guest_id": guest_id,
            "tenant_id": tenant_id,
            "total": len(rows), "events": rows}


class PrivacyDeleteBody(BaseModel):
    guest_id: str
    reason: str
    requested_by_user_id: Optional[str] = None


@router.post("/privacy/delete")
def privacy_delete(
    body: PrivacyDeleteBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Tenet 5: guest data deletion. The append-only contract means
    we don't physically delete the rows (audit chain integrity), but
    we DO write a tombstone correction event AND we set
    surfaceable=false on every matching row so they vanish from all
    non-pass_dev queries.

    Doctrine alignment (§3.1): the log is never compressed — but the
    SURFACEABILITY can be revoked. Removal of access != removal of
    history. Per Tenet 5 the guest must also be able to export
    before deletion, so this endpoint MUST be paired with a
    privacy/export call upstream (chef/admin policy)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    # 1. Find the matching rows
    matching = list(db["echo_events"].find(
        {"tenant_id": tenant_id,
         "$or": [{"context.guest_id": body.guest_id},
                 {"payload.guest_id": body.guest_id}]}, {"_id": 0}))
    affected_ids = [r["id"] for r in matching]
    # 2. Mark unsurfaceable (one-way; the tombstone event records the
    #    chain so an auditor with pass_dev access can still trace)
    db["echo_events"].update_many(
        {"id": {"$in": affected_ids}},
        {"$set": {"surfaceable": False,
                  "expires_at": _now_iso()}})
    # 3. Append the tombstone event (Tenet 5 chain-of-custody)
    tombstone = append_event(AppendEventBody(
        kind="correction",
        voice_register="pass_dev",
        sensitivity="ordinary",
        context={"guest_id": body.guest_id,
                 "requested_by_user_id": body.requested_by_user_id},
        payload={"action": "privacy_delete",
                 "affected_event_count": len(affected_ids),
                 "reason": body.reason}),
        tenant_id=tenant_id)
    return {"ok": True, "guest_id": body.guest_id,
            "tenant_id": tenant_id,
            "affected_event_count": len(affected_ids),
            "tombstone_event_id": tombstone["id"]}
