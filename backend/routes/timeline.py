"""iter194 · FM-Upgrade 1 — TimelineEvent HTTP surface.

  POST /api/timeline/query                 flexible search
  GET  /api/timeline/recent?limit=&kind=   live tail (activity feed)
  GET  /api/timeline/recall                FSMA 204 forward+backward trace
  GET  /api/timeline/cycle-time            duration between two event types
  POST /api/timeline/emit                  admin emit (for tests + manual CTEs)

All endpoints are read-mostly. Emit is admin-gated.
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from lib.timeline import emit as tl_emit, query as tl_query, recall as tl_recall, cycle_time as tl_cycle

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


class QueryBody(BaseModel):
    entity_id: Optional[str] = None
    entity_kind: Optional[str] = None
    event_types: Optional[List[str]] = None
    actor_id: Optional[str] = None
    from_ts: Optional[str] = None
    to_ts: Optional[str] = None
    limit: int = 200


@router.post("/query")
async def http_query(body: QueryBody):
    events = tl_query(
        entity_id=body.entity_id, entity_kind=body.entity_kind,
        event_types=body.event_types, actor_id=body.actor_id,
        from_ts=body.from_ts, to_ts=body.to_ts, limit=body.limit,
    )
    return {"ok": True, "total": len(events), "events": events}


@router.get("/recent")
async def http_recent(limit: int = 100, kind: Optional[str] = None):
    """Compact live tail for the activity feed."""
    events = tl_query(entity_kind=kind, limit=limit)
    return {"ok": True, "total": len(events), "events": events}


@router.get("/recall")
async def http_recall(
    lot_id: Optional[str] = None,
    tlc: Optional[str] = None,
    pack_id: Optional[str] = None,
    batch_id: Optional[str] = None,
):
    """FSMA 204 mock-recall: forward + backward trace in one call."""
    if not any([lot_id, tlc, pack_id, batch_id]):
        raise HTTPException(400, "at least one of lot_id|tlc|pack_id|batch_id required")
    t0 = __import__("time").time()
    bundle = tl_recall(lot_id=lot_id, tlc=tlc, pack_id=pack_id, batch_id=batch_id)
    bundle["elapsed_ms"] = int((__import__("time").time() - t0) * 1000)
    return {"ok": True, "recall": bundle}


@router.get("/cycle-time")
async def http_cycle(entity_id: str, from_type: str, to_type: str):
    return {"ok": True, "result": tl_cycle(entity_id=entity_id, from_type=from_type, to_type=to_type)}


class EmitBody(BaseModel):
    type: str
    actor: Optional[Dict[str, Any]] = None
    entity_refs: Optional[List[Dict[str, Any]]] = None
    payload: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None


@router.post("/emit")
async def http_emit(body: EmitBody, x_admin_token: Optional[str] = Header(None)):
    """Admin / test emission. Most timeline writes come from in-process emit()
    calls embedded in domain routes — this endpoint is for synthetic CTEs,
    backfills, or external systems that want to contribute events."""
    _require_admin(x_admin_token)
    event_id = tl_emit(
        body.type,
        actor=body.actor, entity_refs=body.entity_refs,
        payload=body.payload, idempotency_key=body.idempotency_key,
    )
    return {"ok": True, "event_id": event_id}
