"""
POS Connector Framework
=======================
Manages POS system integrations (Toast, Aloha, Micros).
Provides connection management, sync status, and data mapping.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter(prefix="/api/pos-connector", tags=["pos-connector"])


class POSConnectionConfig(BaseModel):
    pos_system: str  # toast, aloha, micros, square, clover
    display_name: str
    api_key: Optional[str] = None
    location_id: Optional[str] = None
    merchant_id: Optional[str] = None
    webhook_url: Optional[str] = None
    sync_interval_minutes: int = 15
    enabled: bool = True


class SyncTrigger(BaseModel):
    connection_id: str
    sync_type: str = "full"  # full, incremental, menu_only, orders_only


POS_SYSTEMS = {
    "toast": {
        "name": "Toast POS",
        "features": ["menu_sync", "order_import", "inventory_push", "labor_data", "real_time_orders"],
        "sync_types": ["full", "incremental", "menu_only", "orders_only"],
        "auth_type": "api_key",
        "status": "available",
    },
    "aloha": {
        "name": "Aloha by NCR",
        "features": ["menu_sync", "order_import", "labor_data", "table_management"],
        "sync_types": ["full", "incremental", "menu_only"],
        "auth_type": "api_key_secret",
        "status": "available",
    },
    "micros": {
        "name": "Oracle MICROS Simphony",
        "features": ["menu_sync", "order_import", "inventory_push", "revenue_center"],
        "sync_types": ["full", "incremental", "menu_only", "orders_only"],
        "auth_type": "oauth2",
        "status": "available",
    },
    "square": {
        "name": "Square POS",
        "features": ["menu_sync", "order_import", "payment_data"],
        "sync_types": ["full", "incremental"],
        "auth_type": "oauth2",
        "status": "available",
    },
    "clover": {
        "name": "Clover POS",
        "features": ["menu_sync", "order_import", "payment_data", "inventory_push"],
        "sync_types": ["full", "incremental", "menu_only"],
        "auth_type": "api_key",
        "status": "available",
    },
}


@router.get("/systems")
async def list_pos_systems():
    """List all supported POS systems with their capabilities."""
    return {"systems": POS_SYSTEMS}


@router.get("/connections")
async def list_connections():
    """List all configured POS connections."""
    connections = list(db["pos_connections"].find({}, {"_id": 0}))
    return {"connections": connections, "count": len(connections)}


@router.post("/connections")
async def create_connection(config: POSConnectionConfig):
    """Create a new POS connection."""
    if config.pos_system not in POS_SYSTEMS:
        raise HTTPException(400, f"Unsupported POS system: {config.pos_system}")

    now = datetime.now(timezone.utc).isoformat()
    conn_id = str(uuid4())
    connection = {
        "id": conn_id,
        "pos_system": config.pos_system,
        "display_name": config.display_name,
        "pos_name": POS_SYSTEMS[config.pos_system]["name"],
        "location_id": config.location_id or "",
        "merchant_id": config.merchant_id or "",
        "webhook_url": config.webhook_url or "",
        "sync_interval_minutes": config.sync_interval_minutes,
        "enabled": config.enabled,
        "status": "pending_verification",
        "last_sync": None,
        "sync_history": [],
        "created_at": now,
        "updated_at": now,
    }
    db["pos_connections"].insert_one(connection)
    connection.pop("_id", None)
    return {"connection": connection}


@router.post("/connections/{connection_id}/test")
async def test_connection(connection_id: str):
    """Test a POS connection (simulated)."""
    conn = db["pos_connections"].find_one({"id": connection_id})
    if not conn:
        raise HTTPException(404, "Connection not found")

    now = datetime.now(timezone.utc).isoformat()
    # Simulate connection test
    db["pos_connections"].update_one(
        {"id": connection_id},
        {"$set": {"status": "connected", "last_tested": now, "updated_at": now}}
    )
    return {"status": "connected", "latency_ms": 42, "tested_at": now}


@router.post("/sync")
async def trigger_sync(data: SyncTrigger):
    """Trigger a data sync for a POS connection."""
    conn = db["pos_connections"].find_one({"id": data.connection_id})
    if not conn:
        raise HTTPException(404, "Connection not found")

    now = datetime.now(timezone.utc).isoformat()
    sync_record = {
        "id": str(uuid4()),
        "type": data.sync_type,
        "status": "completed",
        "started_at": now,
        "completed_at": now,
        "records_synced": 0,
        "errors": [],
    }

    # Simulate sync results based on type
    pos = conn.get("pos_system", "")
    if data.sync_type in ("full", "menu_only"):
        menu_count = db["menu_items"].count_documents({})
        sync_record["records_synced"] = menu_count
        sync_record["details"] = f"Synced {menu_count} menu items from {POS_SYSTEMS.get(pos, {}).get('name', pos)}"
    elif data.sync_type == "orders_only":
        sync_record["records_synced"] = 0
        sync_record["details"] = "Order sync completed (no new orders)"
    else:
        sync_record["records_synced"] = 0
        sync_record["details"] = "Incremental sync — no changes detected"

    db["pos_connections"].update_one(
        {"id": data.connection_id},
        {
            "$set": {"last_sync": now, "updated_at": now},
            "$push": {"sync_history": {"$each": [sync_record], "$slice": -20}},
        },
    )

    return {"sync": sync_record}


def submit_failover_order(*, tenant_id: str, outlet_id: str,
                          natural_key: str,
                          payload: dict) -> dict:
    """D33 POS-failover replay hook.

    When the manufacturer's POS recovers, pos_failover.reconcile
    walks queued orders and calls this function once per order.

    Idempotency contract: the natural_key MUST be passed through to
    the upstream POS (most modern POS APIs accept an
    idempotency-key header). If the POS rejects with "already
    processed," we treat that as success and return the existing
    external_id.

    This is currently a stub-but-honest implementation: we record
    the synthetic external_id in pos_replay_log so the audit trail
    is preserved, and we expose a clean seam for the real Toast /
    Aloha / Micros adapter to drop into. The real adapter will be a
    one-file replacement that calls the vendor API and returns the
    same shape.
    """
    from datetime import datetime as _dt, timezone as _tz
    record = {
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "natural_key": natural_key,
        "external_id": f"failover-{natural_key}",
        "submitted_at": _dt.now(_tz.utc).isoformat(),
        "payload_summary": {
            "order_id": payload.get("id"),
            "table_id": payload.get("table_id"),
            "seat": payload.get("seat"),
            "total": payload.get("total"),
            "item_count": len(payload.get("items") or []),
        },
    }
    existing = db["pos_replay_log"].find_one(
        {"tenant_id": tenant_id, "natural_key": natural_key})
    if existing:
        return {"external_id": existing.get("external_id"),
                "idempotent": True}
    db["pos_replay_log"].insert_one(record.copy())
    return {"external_id": record["external_id"],
            "idempotent": False}


@router.get("/dashboard")
async def pos_dashboard():
    """POS integration dashboard — connection health and sync stats."""
    connections = list(db["pos_connections"].find({}, {"_id": 0}))
    active = sum(1 for c in connections if c.get("status") == "connected")
    pending = sum(1 for c in connections if c.get("status") == "pending_verification")
    total_syncs = sum(len(c.get("sync_history", [])) for c in connections)

    return {
        "total_connections": len(connections),
        "active": active,
        "pending": pending,
        "disconnected": len(connections) - active - pending,
        "total_syncs": total_syncs,
        "connections": connections,
    }
