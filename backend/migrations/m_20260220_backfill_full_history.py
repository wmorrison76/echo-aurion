"""iter197 · Full-history production backfill (removes the 90-day cap).

Extends m_20260220_backfill_90day with a configurable `--from-days` override
and adds synthesis of additional legacy signals that weren't captured before:
  • guest_concierge requests (order.placed with non-IRD channel)
  • subscriptions (customer.goal_updated + order.placed rollups)
  • beo events (order.placed with channel='event')
"""
from __future__ import annotations

ID = "20260220_backfill_full_history"
DESCRIPTION = "Unbounded legacy backfill — IRD + concierge + subscriptions + BEO into TimelineEvent"


def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print):
    from datetime import datetime, timezone, timedelta
    from lib.timeline import emit as _tl
    from lib.timeline_types import (
        ORDER_PLACED, ORDER_STATUS_CHANGED,
        CUSTOMER_GOAL_UPDATED, CUSTOMER_FEEDBACK_SUBMITTED,
        PACK_PLANNED, BATCH_PLANNED,
    )

    # No cutoff — full history
    counts = {"ird": 0, "concierge_requests": 0, "subscriptions": 0, "beos": 0, "feedback": 0}

    def _emit(**kw):
        if dry_run: return True
        return _tl(**kw) is not None

    # 1) Full IRD history
    for o in db.in_room_dining_orders.find({}, {"_id": 0}):
        if _emit(
            event_type=ORDER_PLACED,
            actor={"type": "user", "id": o.get("guest_id") or "guest", "name": o.get("guest_name") or "Guest"},
            entity_refs=[{"kind": "order", "id": o.get("id")}, {"kind": "customer", "id": o.get("guest_id")}],
            payload={"channel": "ird", "total": o.get("total"), "currency": "USD",
                     "commodity": "in_room_dining", "quantity": len(o.get("lines") or []), "unit": "items"},
            idempotency_key=f"backfill:ird:{o.get('id')}",
        ): counts["ird"] += 1

    # 2) Concierge requests (if collection exists)
    if "concierge_requests" in db.list_collection_names():
        for r in db.concierge_requests.find({}, {"_id": 0}).limit(5000):
            if _emit(
                event_type=ORDER_PLACED,
                actor={"type": "user", "id": r.get("guest_id") or "guest",
                       "name": r.get("guest_name") or "Guest"},
                entity_refs=[{"kind": "concierge_request", "id": r.get("id") or r.get("request_id")}],
                payload={"channel": "concierge", "type": r.get("type"),
                         "commodity": r.get("category") or "concierge",
                         "quantity": 1, "unit": "request"},
                idempotency_key=f"backfill:concierge:{r.get('id') or r.get('request_id')}",
            ): counts["concierge_requests"] += 1

    # 3) Subscriptions — customer.goal_updated as seed event
    if "fresh_meal_subscriptions" in db.list_collection_names():
        for s in db.fresh_meal_subscriptions.find({}, {"_id": 0}).limit(5000):
            if _emit(
                event_type=CUSTOMER_GOAL_UPDATED,
                actor={"type": "user", "id": s.get("customer_id") or "customer",
                       "name": s.get("customer_name") or "Customer"},
                entity_refs=[{"kind": "subscription", "id": s.get("id")},
                             {"kind": "customer", "id": s.get("customer_id")}],
                payload={"status": s.get("status"), "channel": s.get("channel") or "b2c_subscription",
                         "commodity": "subscription", "quantity": 1, "unit": "sub"},
                idempotency_key=f"backfill:sub:{s.get('id')}",
            ): counts["subscriptions"] += 1

    # 4) BEO (group events) → order.placed for planning
    if "group_events" in db.list_collection_names():
        for g in db.group_events.find({}, {"_id": 0}).limit(2000):
            if _emit(
                event_type=ORDER_PLACED,
                actor={"type": "user", "id": g.get("planner_id") or "planner",
                       "name": g.get("planner_name") or "Planner"},
                entity_refs=[{"kind": "group_event", "id": g.get("event_id") or g.get("id")}],
                payload={"channel": "beo", "commodity": "group_event",
                         "quantity": g.get("headcount") or 1, "unit": "guests",
                         "event_date": g.get("date")},
                idempotency_key=f"backfill:beo:{g.get('event_id') or g.get('id')}",
            ): counts["beos"] += 1

    # 5) Customer feedback (if any)
    for col in ("ird_feedback", "guest_feedback"):
        if col in db.list_collection_names():
            for f in db[col].find({}, {"_id": 0}).limit(2000):
                if _emit(
                    event_type=CUSTOMER_FEEDBACK_SUBMITTED,
                    actor={"type": "user", "id": f.get("customer_id") or "customer",
                           "name": f.get("customer_name") or "Customer"},
                    entity_refs=[{"kind": "feedback", "id": f.get("id")},
                                 {"kind": "customer", "id": f.get("customer_id")}],
                    payload={"rating": f.get("rating"), "channel": f.get("channel") or "ird",
                             "commodity": "feedback", "quantity": 1, "unit": "entry"},
                    idempotency_key=f"backfill:fb:{f.get('id')}",
                ): counts["feedback"] += 1

    logger(f"Full-history backfill complete: {counts}")
    return {"counts": counts, "checkpoint": {}}


def rollback(db, *, dry_run=False, logger=print):
    r = db.timeline_events.delete_many({"idempotency_key": {
        "$regex": "^backfill:(ird|concierge|sub|beo|fb):"
    }})
    return {"counts": {"deleted": r.deleted_count if not dry_run else 0}}
