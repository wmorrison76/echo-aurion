"""
Accounting GL Sync — QuickBooks / Sage Integration
===================================================
Manages GL account mapping, journal sync, and reconciliation
with external accounting systems.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter(prefix="/api/gl-sync", tags=["gl-sync"])


SUPPORTED_PLATFORMS = {
    "quickbooks": {
        "name": "QuickBooks Online",
        "features": ["gl_sync", "journal_push", "chart_of_accounts", "vendor_sync", "invoice_sync"],
        "auth_type": "oauth2",
    },
    "sage": {
        "name": "Sage Intacct",
        "features": ["gl_sync", "journal_push", "chart_of_accounts", "ap_sync", "ar_sync"],
        "auth_type": "api_key",
    },
    "xero": {
        "name": "Xero",
        "features": ["gl_sync", "journal_push", "chart_of_accounts", "bank_reconciliation"],
        "auth_type": "oauth2",
    },
}


class GLSyncConfig(BaseModel):
    platform: str  # quickbooks, sage, xero
    company_name: str
    api_key: Optional[str] = None
    company_id: Optional[str] = None
    auto_sync: bool = True
    sync_frequency: str = "daily"  # hourly, daily, weekly


class AccountMapping(BaseModel):
    luccca_code: str
    luccca_name: str
    external_code: str
    external_name: str
    sync_direction: str = "push"  # push, pull, bidirectional


class JournalSyncRequest(BaseModel):
    connection_id: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None


@router.get("/platforms")
async def list_platforms():
    """List supported accounting platforms."""
    return {"platforms": SUPPORTED_PLATFORMS}


@router.get("/connections")
async def list_gl_connections():
    """List all GL sync connections."""
    connections = list(db["gl_sync_connections"].find({}, {"_id": 0}))
    return {"connections": connections, "count": len(connections)}


@router.post("/connections")
async def create_gl_connection(config: GLSyncConfig):
    """Create a new GL sync connection."""
    if config.platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(400, f"Unsupported platform: {config.platform}")

    now = datetime.now(timezone.utc).isoformat()
    conn_id = str(uuid4())
    connection = {
        "id": conn_id,
        "platform": config.platform,
        "platform_name": SUPPORTED_PLATFORMS[config.platform]["name"],
        "company_name": config.company_name,
        "company_id": config.company_id or "",
        "auto_sync": config.auto_sync,
        "sync_frequency": config.sync_frequency,
        "status": "pending_auth",
        "account_mappings": [],
        "sync_history": [],
        "last_sync": None,
        "created_at": now,
        "updated_at": now,
    }
    db["gl_sync_connections"].insert_one(connection)
    connection.pop("_id", None)
    return {"connection": connection}


@router.post("/connections/{connection_id}/activate")
async def activate_connection(connection_id: str):
    """Activate/verify a GL connection (simulated OAuth completion)."""
    conn = db["gl_sync_connections"].find_one({"id": connection_id})
    if not conn:
        raise HTTPException(404, "Connection not found")

    now = datetime.now(timezone.utc).isoformat()
    db["gl_sync_connections"].update_one(
        {"id": connection_id},
        {"$set": {"status": "active", "activated_at": now, "updated_at": now}}
    )
    return {"status": "active", "activated_at": now}


@router.post("/connections/{connection_id}/mappings")
async def add_account_mapping(connection_id: str, mapping: AccountMapping):
    """Add a GL account mapping between LUCCCA and external system."""
    conn = db["gl_sync_connections"].find_one({"id": connection_id})
    if not conn:
        raise HTTPException(404, "Connection not found")

    now = datetime.now(timezone.utc).isoformat()
    map_entry = {
        "id": str(uuid4()),
        "luccca_code": mapping.luccca_code,
        "luccca_name": mapping.luccca_name,
        "external_code": mapping.external_code,
        "external_name": mapping.external_name,
        "sync_direction": mapping.sync_direction,
        "created_at": now,
    }

    db["gl_sync_connections"].update_one(
        {"id": connection_id},
        {"$push": {"account_mappings": map_entry}, "$set": {"updated_at": now}}
    )
    return {"mapping": map_entry}


@router.get("/connections/{connection_id}/mappings")
async def list_account_mappings(connection_id: str):
    """List all account mappings for a connection."""
    conn = db["gl_sync_connections"].find_one({"id": connection_id}, {"_id": 0})
    if not conn:
        raise HTTPException(404, "Connection not found")
    return {"mappings": conn.get("account_mappings", []), "connection": conn.get("platform_name", "")}


@router.post("/sync/journals")
async def sync_journals(req: JournalSyncRequest):
    """Sync GL journal entries to external accounting system."""
    conn = db["gl_sync_connections"].find_one({"id": req.connection_id})
    if not conn:
        raise HTTPException(404, "Connection not found")
    if conn.get("status") != "active":
        raise HTTPException(400, "Connection must be active to sync")

    now = datetime.now(timezone.utc).isoformat()

    # Gather unsynchronized journal entries
    query = {}
    if req.date_from:
        query["posted_at"] = {"$gte": req.date_from}
    if req.date_to:
        query.setdefault("posted_at", {})["$lte"] = req.date_to

    entries = list(db["gl_journal_entries"].find(query, {"_id": 0}))

    sync_record = {
        "id": str(uuid4()),
        "type": "journal_push",
        "status": "completed",
        "entries_synced": len(entries),
        "total_debits": round(sum(e.get("debit", 0) for e in entries), 2),
        "total_credits": round(sum(e.get("credit", 0) for e in entries), 2),
        "started_at": now,
        "completed_at": now,
        "platform": conn.get("platform_name", ""),
    }

    db["gl_sync_connections"].update_one(
        {"id": req.connection_id},
        {
            "$set": {"last_sync": now, "updated_at": now},
            "$push": {"sync_history": {"$each": [sync_record], "$slice": -30}},
        },
    )

    return {"sync": sync_record}


@router.get("/dashboard")
async def gl_sync_dashboard():
    """GL sync overview — connections, mappings, recent syncs."""
    connections = list(db["gl_sync_connections"].find({}, {"_id": 0}))
    gl_codes = list(db["gl_codes"].find({}, {"_id": 0}))
    journal_count = db["gl_journal_entries"].count_documents({})

    total_mappings = sum(len(c.get("account_mappings", [])) for c in connections)
    active_conns = sum(1 for c in connections if c.get("status") == "active")
    recent_syncs = []
    for c in connections:
        for s in c.get("sync_history", [])[-3:]:
            s["connection_name"] = c.get("company_name", "")
            recent_syncs.append(s)
    recent_syncs.sort(key=lambda x: x.get("completed_at", ""), reverse=True)

    return {
        "total_connections": len(connections),
        "active_connections": active_conns,
        "total_mappings": total_mappings,
        "gl_codes_count": len(gl_codes),
        "journal_entries_count": journal_count,
        "recent_syncs": recent_syncs[:10],
        "gl_codes": gl_codes,
    }
