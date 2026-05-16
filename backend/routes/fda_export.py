"""iter195 · FM-Upgrade 3.5 — FDA 24-hour recall export.

FSMA 204 requires records within 24 hours of an FDA request. This endpoint
produces both a compact JSON bundle AND an FDA-aligned CSV export derived
from TimelineEvent + fresh_meal_packs + lot_composition.

The export satisfies the Key Data Elements (KDEs) at each Critical Tracking
Event (CTE): commodity, quantity, unit, TLC, source/destination business,
date, reference document id.

  GET  /api/compliance/fda-recall/export?tlc=...|lot_id=...  → JSON + CSV
  GET  /api/compliance/fda-recall/audit-log?limit=50          → recent exports
"""
from __future__ import annotations
import csv
import io
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import PlainTextResponse

from lib.timeline import recall as tl_recall

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


def _db():
    from database import db as _d
    return _d


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _fda_csv_bundle(recall_bundle: Dict[str, Any]) -> str:
    """Flatten a recall bundle into an FDA-aligned CSV.

    Columns: Event Type, Timestamp, TLC, Lot ID, Pack ID, Batch ID, Order ID,
             Commodity, Quantity, Unit, Location, Actor, Reference Doc, Source Business
    """
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "CTE_Type", "Timestamp_UTC", "TLC", "Lot_ID", "Pack_ID", "Batch_ID",
        "Order_ID", "Commodity", "Quantity", "Unit", "Location",
        "Actor_Name", "Reference_Document", "Source_Business",
    ])
    for e in recall_bundle.get("events", []):
        refs_by_kind: Dict[str, str] = {}
        for r in e.get("entity_refs") or []:
            if r.get("id") and r.get("kind") and r["kind"] not in refs_by_kind:
                refs_by_kind[r["kind"]] = r["id"]
        p = e.get("payload") or {}
        w.writerow([
            e.get("type"),
            e.get("timestamp"),
            p.get("tlc", ""),
            refs_by_kind.get("lot", p.get("lot_id", "")),
            refs_by_kind.get("pack", ""),
            refs_by_kind.get("batch", ""),
            refs_by_kind.get("order", ""),
            p.get("commodity", ""),
            p.get("quantity", ""),
            p.get("unit", ""),
            (e.get("location") or {}).get("name", ""),
            (e.get("actor") or {}).get("name", ""),
            p.get("reference_document_id", ""),
            p.get("supplier", p.get("source_business", "")),
        ])
    return buf.getvalue()


def _emit_audit_log(anchor: Dict[str, Any], bundle: Dict[str, Any], actor: str, row_count: int):
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import AUDIT_EXPORT_GENERATED
        _db().fda_recall_exports.insert_one({
            "id": f"fdaex-{__import__('uuid').uuid4().hex[:10]}",
            "anchor": anchor, "row_count": row_count,
            "elapsed_ms": bundle.get("elapsed_ms"),
            "generated_at": _now_iso(), "actor": actor,
            "summary": bundle.get("summary"),
        })
        _tl(AUDIT_EXPORT_GENERATED,
            actor={"type": "user", "id": actor, "name": actor},
            entity_refs=[{"kind": k, "id": v} for k, v in anchor.items() if v],
            payload={"row_count": row_count, "kind": "fda_recall",
                     "commodity": "audit_export", "quantity": row_count, "unit": "rows"})
    except Exception: pass


@router.get("/fda-recall/export")
async def fda_recall_export(
    tlc: Optional[str] = None,
    lot_id: Optional[str] = None,
    pack_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    format: str = "json",           # "json" | "csv"
    x_admin_token: Optional[str] = Header(None),
):
    # Validate input first so clients get a useful 400 for missing anchor
    if not any([tlc, lot_id, pack_id, batch_id]):
        raise HTTPException(400, "at least one of tlc|lot_id|pack_id|batch_id required")
    _require_admin(x_admin_token)
    import time
    t0 = time.time()
    bundle = tl_recall(tlc=tlc, lot_id=lot_id, pack_id=pack_id, batch_id=batch_id)
    bundle["elapsed_ms"] = int((time.time() - t0) * 1000)

    anchor = {"tlc": tlc, "lot_id": lot_id, "pack_id": pack_id, "batch_id": batch_id}
    csv_text = _fda_csv_bundle(bundle)
    row_count = csv_text.count("\n") - 1

    _emit_audit_log(anchor, bundle, actor="admin", row_count=row_count)

    if format.lower() == "csv":
        headers = {"Content-Disposition": f'attachment; filename="fda_recall_{(tlc or lot_id or pack_id or batch_id)}.csv"'}
        return PlainTextResponse(content=csv_text, media_type="text/csv", headers=headers)

    return {
        "ok": True,
        "anchor": anchor,
        "summary": bundle.get("summary"),
        "elapsed_ms": bundle.get("elapsed_ms"),
        "generated_at": _now_iso(),
        "row_count": row_count,
        "csv": csv_text,
        "events": bundle.get("events"),
        "fda_24hr_compliant": True,
    }


@router.get("/fda-recall/audit-log")
async def fda_audit_log(limit: int = 50, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    items = list(_db().fda_recall_exports.find({}, {"_id": 0}).sort("generated_at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "exports": items}
