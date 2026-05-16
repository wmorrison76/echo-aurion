"""
D15 · Mobile Sync Endpoint — drains the offline queue when the network
returns. The client (`shared/mobile/offline-data-queue.ts`) has been
shipped for a while but POSTs to `/api/mobile/sync` which until now
returned 404 — every offline write was lost on reconnect.

Contract (from offline-data-queue.ts:229–272):

  Request:  { operations: QueuedOperation[] }
    where each op is { id, type, entity_type, entity_id, data,
                       timestamp, status, retry_count }

  Response: { synced_ids: string[],
              failures:   [{ id, error }],
              conflicts:  [{ entity_id, resolution, server_value? }] }

Conflict policy (last-write-wins, with telemetry):
  - If `update` and the server doc has a newer `updated_at` than the
    client's `timestamp`, we still apply the write (LWW the user will
    notice and re-edit) but record a conflict entry so the UI can
    show a soft-warning toast on reconnect.
  - If `delete` of a non-existent doc, succeed silently (idempotent).
  - If `create` of an id that already exists, treat as `update`.

Entity allowlist: only collections the mobile clients are allowed to
write to. Adding a new collection requires a code change here — this
prevents a compromised client from poking at admin/audit tables.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from database import db

router = APIRouter(prefix="/api/mobile", tags=["mobile-sync"])


# Whitelist of (entity_type → collection_name) the mobile queue can sync.
# Anything not in this map returns a per-op failure rather than 4xx the
# whole batch — one bad op shouldn't poison the queue.
ALLOWED_ENTITIES: Dict[str, str] = {
    # MyEcho hourly write-paths
    "pto_request":              "pto_requests",
    "callout_request":          "callout_requests",
    "shift_swap":               "shift_swaps",
    "mod_chat_message":         "mod_chat_messages",
    "clock_punch":              "clock_punches",
    # Concierge guest + staff write-paths
    "concierge_service_request": "concierge_service_requests",
    "concierge_amenity_order":   "concierge_amenity_orders",
    "concierge_ticket":          "concierge_tickets",
    "concierge_guest_location":  "concierge_guest_locations",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class QueuedOperation(BaseModel):
    id: str
    type: str                 # "create" | "update" | "delete" | "sync"
    entity_type: str
    entity_id: str
    data: Dict[str, Any] = {}
    timestamp: int = 0        # client's wall-clock at enqueue
    status: Optional[str] = None
    retry_count: int = 0


class SyncBatch(BaseModel):
    operations: List[QueuedOperation]


def _is_server_newer(existing: Dict[str, Any], client_ts_ms: int) -> bool:
    """True if the server's record was last updated after the client's
    enqueue timestamp — used to flag conflicts on update/delete."""
    srv = existing.get("updated_at") or existing.get("created_at")
    if not srv:
        return False
    try:
        srv_dt = datetime.fromisoformat(str(srv).replace("Z", "+00:00"))
        if srv_dt.tzinfo is None:
            srv_dt = srv_dt.replace(tzinfo=timezone.utc)
        srv_ms = int(srv_dt.timestamp() * 1000)
    except Exception:
        return False
    return srv_ms > client_ts_ms


def _apply_op(op: QueuedOperation, x_user_id: Optional[str]) -> Dict[str, Any]:
    """Apply one op, return one of:
       {"synced": op.id}
       {"failed": {"id": op.id, "error": "..."}}
       {"synced": op.id, "conflict": {"entity_id": ..., "resolution": ...}}
    """
    coll_name = ALLOWED_ENTITIES.get(op.entity_type)
    if not coll_name:
        return {"failed": {"id": op.id, "error": f"entity_type not allowed: {op.entity_type}"}}

    coll = db[coll_name]
    payload = dict(op.data or {})
    payload["id"] = op.entity_id
    payload["updated_at"] = _now_iso()
    if x_user_id:
        payload.setdefault("synced_by_user_id", x_user_id)

    existing = coll.find_one({"id": op.entity_id}, {"_id": 0})

    out: Dict[str, Any] = {}
    if op.type == "delete":
        if existing:
            try:
                coll.delete_one({"id": op.entity_id})
            except Exception as e:
                return {"failed": {"id": op.id, "error": f"delete: {e}"}}
        # idempotent — missing-record delete is success
        return {"synced": op.id}

    if op.type in ("create", "update", "sync"):
        try:
            if existing:
                conflict = None
                if _is_server_newer(existing, op.timestamp):
                    conflict = {
                        "entity_id": op.entity_id,
                        "resolution": "client-overwrote-newer-server-value",
                    }
                coll.update_one({"id": op.entity_id}, {"$set": payload})
                out["synced"] = op.id
                if conflict:
                    out["conflict"] = conflict
                return out
            payload.setdefault("created_at", _now_iso())
            coll.insert_one(payload)
            return {"synced": op.id}
        except Exception as e:
            return {"failed": {"id": op.id, "error": f"{op.type}: {e}"}}

    return {"failed": {"id": op.id, "error": f"unknown op type: {op.type}"}}


@router.post("/sync")
def sync(batch: SyncBatch, x_user_id: Optional[str] = Header(None)):
    """Drain the client's offline queue. Idempotent at the op level —
    re-sending the same batch after a partial failure will re-apply
    only the un-synced ops (the client tracks per-op `status`)."""
    synced_ids: List[str] = []
    failures: List[Dict[str, Any]] = []
    conflicts: List[Dict[str, Any]] = []

    for op in batch.operations:
        result = _apply_op(op, x_user_id)
        if "synced" in result:
            synced_ids.append(result["synced"])
        if "conflict" in result:
            conflicts.append(result["conflict"])
        if "failed" in result:
            failures.append(result["failed"])

    return {
        "ok": True,
        "total": len(batch.operations),
        "synced_ids": synced_ids,
        "failures": failures,
        "conflicts": conflicts,
        "synced_at": _now_iso(),
    }


@router.get("/sync/health")
def sync_health():
    """Diagnostic endpoint — the desktop/mobile shell pings this on
    startup and after reconnect to confirm the server is reachable
    before draining the queue."""
    return {
        "ok": True,
        "now": _now_iso(),
        "allowed_entities": sorted(ALLOWED_ENTITIES.keys()),
    }
