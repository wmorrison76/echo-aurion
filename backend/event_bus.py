"""
LUCCCA Unified Event Bus
=========================
MongoDB-backed event bus connecting all engines with:
- Pub/sub pattern across all 5 engines
- Persistent event storage with replay
- Dead letter queue for failed handlers
- Idempotency keys (prevent duplicate processing)
- Event correlation chains
- WebSocket broadcast on every event

Replaces the fragmented 4+ bus system from the original TypeScript codebase.
"""
import uuid
import hashlib
import asyncio
import json
from datetime import datetime, timezone
from typing import Callable, Optional
from database import db

event_store_col = db["event_bus_store"]
dead_letter_col = db["event_bus_dead_letter"]
subscriptions_col = db["event_bus_subscriptions"]

# Indexes
event_store_col.create_index("event_type")
event_store_col.create_index([("timestamp", -1)])
event_store_col.create_index("idempotency_key", unique=True,
                             partialFilterExpression={"idempotency_key": {"$type": "string"}})
event_store_col.create_index("correlation_id")

# In-memory subscriber registry (per-process)
_subscribers: dict[str, list[dict]] = {}
_ws_clients: set = set()

def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()

def _hash_event(event_type: str, payload: dict, source: str) -> str:
    raw = f"{event_type}:{json.dumps(payload, sort_keys=True, default=str)}:{source}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# PUBLISH
# ---------------------------------------------------------------------------
def publish(event_type: str, payload: dict, source: str = "system",
            correlation_id: str = None, idempotency_key: str = None,
            tenant_id: str = "default") -> dict:
    """
    Publish an event to the unified bus.
    All engines call this to broadcast state changes.
    """
    event_id = _uid()

    # Idempotency check
    if idempotency_key:
        existing = event_store_col.find_one({"idempotency_key": idempotency_key})
        if existing:
            return {"status": "duplicate", "event_id": str(existing.get("id", "")),
                    "message": "Event already processed (idempotency)"}

    event = {
        "id": event_id,
        "event_type": event_type,
        "payload": payload,
        "source": source,
        "tenant_id": tenant_id,
        "correlation_id": correlation_id or event_id,
        "idempotency_key": idempotency_key,
        "hash": _hash_event(event_type, payload, source),
        "status": "published",
        "subscriber_results": [],
        "timestamp": _now(),
    }
    event_store_col.insert_one(event)

    # Dispatch to in-memory subscribers
    results = _dispatch(event)
    event_store_col.update_one({"id": event_id}, {"$set": {
        "subscriber_results": results,
        "status": "dispatched",
    }})

    # Return clean event (no _id)
    return {
        "event_id": event_id,
        "event_type": event_type,
        "source": source,
        "correlation_id": event.get("correlation_id"),
        "subscribers_notified": len(results),
        "status": "dispatched",
        "timestamp": event["timestamp"],
    }


def _dispatch(event: dict) -> list:
    """Dispatch event to all matching subscribers"""
    results = []
    event_type = event["event_type"]

    # Match exact type + wildcard subscribers
    handlers = _subscribers.get(event_type, []) + _subscribers.get("*", [])

    for sub in handlers:
        try:
            handler = sub["handler"]
            handler(event)
            results.append({
                "subscriber_id": sub["id"],
                "name": sub.get("name", "unknown"),
                "status": "success",
            })
        except Exception as e:
            results.append({
                "subscriber_id": sub["id"],
                "name": sub.get("name", "unknown"),
                "status": "failed",
                "error": str(e),
            })
            # Dead letter on failure
            if sub.get("dead_letter_on_failure", True):
                dead_letter_col.insert_one({
                    "id": _uid(),
                    "event_id": event["id"],
                    "event_type": event_type,
                    "subscriber_id": sub["id"],
                    "error": str(e),
                    "event_payload": event.get("payload"),
                    "timestamp": _now(),
                })
    return results


# ---------------------------------------------------------------------------
# SUBSCRIBE (in-memory per-process)
# ---------------------------------------------------------------------------
def subscribe(event_type: str, handler: Callable, name: str = "",
              dead_letter_on_failure: bool = True) -> str:
    sub_id = _uid()
    sub = {
        "id": sub_id,
        "name": name or f"sub_{event_type}",
        "handler": handler,
        "dead_letter_on_failure": dead_letter_on_failure,
    }
    if event_type not in _subscribers:
        _subscribers[event_type] = []
    _subscribers[event_type].append(sub)
    return sub_id


def unsubscribe(event_type: str, sub_id: str):
    if event_type in _subscribers:
        _subscribers[event_type] = [s for s in _subscribers[event_type] if s["id"] != sub_id]


# ---------------------------------------------------------------------------
# EVENT QUERY / REPLAY
# ---------------------------------------------------------------------------
def get_event(event_id: str) -> Optional[dict]:
    return event_store_col.find_one({"id": event_id}, {"_id": 0})


def query_events(event_type: str = None, source: str = None,
                 correlation_id: str = None, limit: int = 50) -> list:
    query = {}
    if event_type:
        query["event_type"] = event_type
    if source:
        query["source"] = source
    if correlation_id:
        query["correlation_id"] = correlation_id
    return list(event_store_col.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit))


def replay_events(event_type: str = None, since: str = None, limit: int = 100) -> dict:
    """Replay events for re-processing (disaster recovery, new subscriber catch-up)"""
    query = {}
    if event_type:
        query["event_type"] = event_type
    if since:
        query["timestamp"] = {"$gte": since}

    events = list(event_store_col.find(query, {"_id": 0}).sort("timestamp", 1).limit(limit))
    replayed = 0
    for evt in events:
        _dispatch(evt)
        replayed += 1

    return {"replayed": replayed, "total_found": len(events)}


# ---------------------------------------------------------------------------
# DEAD LETTER QUEUE
# ---------------------------------------------------------------------------
def get_dead_letters(limit: int = 50) -> list:
    return list(dead_letter_col.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))


def retry_dead_letter(dead_letter_id: str) -> dict:
    dl = dead_letter_col.find_one({"id": dead_letter_id})
    if not dl:
        raise ValueError("Dead letter not found")

    event = event_store_col.find_one({"id": dl["event_id"]}, {"_id": 0})
    if not event:
        raise ValueError("Original event not found")

    results = _dispatch(event)
    dead_letter_col.delete_one({"id": dead_letter_id})
    return {"retried": True, "subscriber_results": results}


# ---------------------------------------------------------------------------
# STATS
# ---------------------------------------------------------------------------
def get_bus_stats() -> dict:
    total_events = event_store_col.count_documents({})
    dead_letters = dead_letter_col.count_documents({})

    # Events by type (top 10)
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    by_type = {r["_id"]: r["count"] for r in event_store_col.aggregate(pipeline)}

    # Active subscribers
    sub_count = sum(len(subs) for subs in _subscribers.values())

    return {
        "total_events": total_events,
        "dead_letters": dead_letters,
        "active_subscribers": sub_count,
        "subscriber_types": list(_subscribers.keys()),
        "events_by_type": by_type,
        "engine": "unified_event_bus",
        "status": "healthy",
        "timestamp": _now(),
    }


# ---------------------------------------------------------------------------
# ENGINE INTEGRATION HOOKS
# ---------------------------------------------------------------------------
# Pre-built event types for all 5 engines
EVENT_TYPES = {
    # Operations Core
    "ops.ingredient.created": "Ingredient created/updated",
    "ops.ingredient.low_stock": "Ingredient below reorder point",
    "ops.inventory.received": "Inventory received",
    "ops.inventory.consumed": "Inventory consumed",
    "ops.invoice.processed": "Invoice processed",
    "ops.recipe.costed": "Recipe cost calculated",
    "ops.production.scheduled": "Production scheduled",
    "ops.production.executed": "Production executed",
    "ops.po.suggested": "Purchase order suggested",

    # AI Forecasting
    "forecast.generated": "Forecast generated for ingredient",
    "forecast.stockout_predicted": "Stockout predicted",
    "forecast.order_recommended": "Order schedule generated",
    "forecast.alert.critical": "Critical stock alert",
    "forecast.alert.warning": "Warning stock alert",

    # POS Integration
    "pos.transaction.processed": "POS transaction processed",
    "pos.inventory.decremented": "POS auto-decrement inventory",
    "pos.food_cost.calculated": "Food cost calculated for sale",

    # Event Lifecycle
    "event.created": "Event created",
    "event.stage.advanced": "Event stage advanced",
    "event.revenue.updated": "Event revenue updated",
    "event.costs.updated": "Event costs updated",
    "event.gl.posted": "GL journal entry posted",
    "event.pnl.calculated": "Event P&L calculated",

    # Labor Cost
    "labor.plan.created": "Labor plan auto-generated",
    "labor.actual.recorded": "Actual labor recorded",
    "labor.variance.calculated": "Labor variance calculated",

    # Payroll
    "payroll.period.opened": "Payroll period opened",
    "payroll.calculated": "Payroll calculated",
    "payroll.approved": "Payroll approved",
    "payroll.executed": "Payroll executed",

    # Workflow
    "workflow.started": "Workflow started",
    "workflow.step.completed": "Workflow step completed",
    "workflow.completed": "Workflow completed",
    "workflow.rejected": "Workflow rejected",

    # Notifications
    "notification.sent": "Notification sent",
    "notification.delivered": "Notification delivered",
    "notification.failed": "Notification delivery failed",
}
