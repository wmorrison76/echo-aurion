"""iter196 · 90-day legacy-order backfill migration.

Reads existing domain data (IRD orders, purchase requisitions, receiving logs,
production runs, packs) and synthesises TimelineEvents to populate the stream
with historical context. This seeds:
  • Echo anomaly-detection baselines
  • Forecasting warm-up
  • FSMA 204 recall continuity (older lots are now traceable)

Idempotent — re-runnable. Uses idempotency_key `backfill:<entity>:<id>` so
duplicate events are silently dropped on second run.
"""
from __future__ import annotations

ID = "20260220_backfill_90day_legacy"
DESCRIPTION = "Backfill 90 days of legacy orders, POs, receiving, and packs into TimelineEvent"


def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print):
    from datetime import datetime, timezone, timedelta
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    counts = {"ird_orders": 0, "requisitions": 0, "receipts": 0, "runs": 0, "packs": 0}

    from lib.timeline import emit as _tl
    from lib.timeline_types import (
        ORDER_PLACED, PO_DRAFTED, PO_RECEIVED_FULL, LOT_RECEIVED,
        BATCH_PLANNED, PACK_PLANNED,
    )

    def _emit(**kw):
        if dry_run: return True
        return _tl(**kw) is not None

    # 1) IRD orders
    for o in db.in_room_dining_orders.find({"placed_at": {"$gte": cutoff_iso}}, {"_id": 0}):
        if _emit(
            event_type=ORDER_PLACED,
            actor={"type": "user", "id": o.get("guest_id") or "guest", "name": o.get("guest_name") or "Guest"},
            entity_refs=[{"kind": "order", "id": o.get("id")},
                         {"kind": "customer", "id": o.get("guest_id")}],
            payload={"channel": "ird", "total": o.get("total"), "currency": "USD",
                     "commodity": "in_room_dining", "quantity": len(o.get("lines") or []), "unit": "items"},
            idempotency_key=f"backfill:order:{o.get('id')}",
        ): counts["ird_orders"] += 1

    # 2) Purchase requisitions
    for pr in db.purchase_requisitions.find({"created_at": {"$gte": cutoff_iso}}, {"_id": 0}):
        if _emit(
            event_type=PO_DRAFTED,
            actor={"type": "user", "id": pr.get("requested_by") or "ops", "name": pr.get("requested_by") or "Ops"},
            entity_refs=[{"kind": "purchase_requisition", "id": pr.get("requisition_id")}],
            payload={"outlet": pr.get("outlet"), "line_count": len(pr.get("items") or []),
                     "total_cost": pr.get("total_cost"), "commodity": "mixed",
                     "quantity": len(pr.get("items") or []), "unit": "lines"},
            idempotency_key=f"backfill:pr:{pr.get('requisition_id')}",
        ): counts["requisitions"] += 1

    # 3) Receiving log — lot.received per line + po.received_full rollup
    for r in db.receiving_log.find({"received_at": {"$gte": cutoff_iso}}, {"_id": 0}):
        receipt_id = r.get("receipt_id") or r.get("id") or "rcpt-unknown"
        for li in (r.get("items") or r.get("line_items") or []):
            lot_id = li.get("lot_id") or f"backfill-lot-{receipt_id}-{li.get('ingredient')}"
            tlc = li.get("tlc") or f"TLC-BF-{receipt_id[:4].upper()}"
            if _emit(
                event_type=LOT_RECEIVED,
                actor={"type": "user", "id": r.get("received_by") or "receiving",
                       "name": r.get("received_by") or "Receiving"},
                entity_refs=[{"kind": "lot", "id": lot_id, "name": li.get("ingredient")},
                             {"kind": "receipt", "id": receipt_id}],
                payload={"commodity": li.get("ingredient"),
                         "quantity": li.get("qty_received") or li.get("quantity"),
                         "unit": li.get("unit"), "supplier": r.get("supplier"),
                         "tlc": tlc, "lot_id": lot_id,
                         "reference_document_id": receipt_id},
                idempotency_key=f"backfill:lot:{receipt_id}:{li.get('ingredient')}",
            ): counts["receipts"] += 1
        if r.get("pr_id") or r.get("requisition_id"):
            pr_id = r.get("pr_id") or r.get("requisition_id")
            if _emit(
                event_type=PO_RECEIVED_FULL,
                actor={"type": "user", "id": r.get("received_by") or "receiving",
                       "name": r.get("received_by") or "Receiving"},
                entity_refs=[{"kind": "purchase_requisition", "id": pr_id},
                             {"kind": "receipt", "id": receipt_id}],
                payload={"supplier": r.get("supplier"),
                         "line_count": len(r.get("items") or r.get("line_items") or []),
                         "commodity": "mixed", "quantity": len(r.get("items") or []), "unit": "lines"},
                idempotency_key=f"backfill:porcv:{receipt_id}",
            ): pass

    # 4) Production runs → batch.planned
    if hasattr(db, "fresh_meal_production_runs"):
        for run in db.fresh_meal_production_runs.find({"created_at": {"$gte": cutoff_iso}}, {"_id": 0}):
            if _emit(
                event_type=BATCH_PLANNED,
                actor={"type": "user", "id": "admin", "name": "Admin"},
                entity_refs=[{"kind": "batch", "id": run.get("id")},
                             {"kind": "product", "id": run.get("product_id")}],
                payload={"planned_qty": run.get("planned_qty"),
                         "commodity": run.get("product_id"), "quantity": run.get("planned_qty") or 0,
                         "unit": "packs"},
                idempotency_key=f"backfill:batch:{run.get('id')}",
            ): counts["runs"] += 1

    # 5) Existing packs → pack.planned
    if hasattr(db, "fresh_meal_packs"):
        for p in db.fresh_meal_packs.find({"created_at": {"$gte": cutoff_iso}}, {"_id": 0}):
            if _emit(
                event_type=PACK_PLANNED,
                actor={"type": "system", "id": "backfill", "name": "backfill"},
                entity_refs=[{"kind": "pack", "id": p.get("id")},
                             {"kind": "order", "id": p.get("order_id")}],
                payload={"commodity": p.get("product_id"), "quantity": 1, "unit": "pack",
                         "lot_count": len(p.get("lot_composition") or [])},
                idempotency_key=f"backfill:pack:{p.get('id')}",
            ): counts["packs"] += 1

    logger(f"90-day backfill complete: {counts}")
    return {"counts": counts, "checkpoint": {"cutoff_iso": cutoff_iso}}


def rollback(db, *, dry_run=False, logger=print):
    r = db.timeline_events.delete_many({"idempotency_key": {"$regex": "^backfill:"}})
    return {"counts": {"deleted": r.deleted_count if not dry_run else 0}}
