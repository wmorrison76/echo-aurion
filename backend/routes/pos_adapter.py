"""
POS Connector Adapter
=====================
Drains the `pos_outbound` queue to a configured POS endpoint. Supports:

  - Generic webhook   (any HTTPS endpoint)
  - Micros Simphony   (requires URL + OAuth token)
  - Toast              (requires managementGroupGUID + token)
  - Mock / dry-run    (for dev/test — marks everything delivered)

Endpoints:
  GET  /api/pos-adapter/providers          — supported providers
  GET  /api/pos-adapter/config             — current configuration (per tenant)
  PUT  /api/pos-adapter/config             — save configuration
  POST /api/pos-adapter/drain              — drain queue (sync) with retries
  GET  /api/pos-adapter/delivery-log       — recent delivery attempts
  POST /api/pos-adapter/test-connection    — send a ping to configured provider
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import httpx
import asyncio
import logging

from database import db

logger = logging.getLogger("pos_adapter")
router = APIRouter(prefix="/api/pos-adapter", tags=["pos-adapter"])

CFG_COLL = "pos_adapter_config"
LOG_COLL = "pos_delivery_log"
_now = lambda: datetime.now(timezone.utc).isoformat()

PROVIDERS = [
    {"id": "mock", "name": "Mock / Dry-run", "description": "Marks every item delivered without a real call. Safe for dev."},
    {"id": "webhook", "name": "Generic Webhook", "description": "POSTs each item to your endpoint with Bearer token."},
    {"id": "micros", "name": "Oracle Micros Simphony", "description": "OAuth Bearer token auth. One POST per menu-item / booking."},
    {"id": "toast", "name": "Toast POS", "description": "managementGroupGUID + Bearer token, REST."},
]


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class AdapterConfig(BaseModel):
    provider: str = Field(..., description="mock | webhook | micros | toast")
    endpoint: Optional[str] = None
    auth_token: Optional[str] = None
    extra: dict = Field(default_factory=dict)
    active: bool = True


# ─────────────────────────────────────────────
# Config CRUD
# ─────────────────────────────────────────────
@router.get("/providers")
async def providers():
    return {"providers": PROVIDERS}


@router.get("/config")
async def get_config():
    c = db[CFG_COLL].find_one({"_id": "default"}, {"_id": 0}) or {}
    # Never leak the auth token — return a masked version
    if c.get("auth_token"):
        c["auth_token_masked"] = c["auth_token"][:4] + "••••" + c["auth_token"][-3:] if len(c["auth_token"]) > 7 else "•••"
        c.pop("auth_token", None)
    c["configured"] = bool(c.get("provider"))
    return c


@router.put("/config")
async def put_config(body: AdapterConfig):
    data = body.dict()
    data["updated_at"] = _now()
    db[CFG_COLL].update_one({"_id": "default"}, {"$set": data}, upsert=True)
    masked = dict(data)
    if masked.get("auth_token"):
        masked["auth_token_masked"] = masked["auth_token"][:4] + "••••" + masked["auth_token"][-3:] if len(masked["auth_token"]) > 7 else "•••"
        masked.pop("auth_token")
    masked["configured"] = True
    return masked


# ─────────────────────────────────────────────
# Delivery
# ─────────────────────────────────────────────
async def _deliver_one(item: dict, cfg: dict) -> dict:
    """Send a single item to the configured provider. Returns log entry."""
    provider = cfg.get("provider", "mock")
    log = {
        "id": f"dlog-{uuid4().hex[:10]}",
        "outbound_id": item.get("id"),
        "provider": provider,
        "kind": item.get("kind"),
        "action": item.get("action"),
        "attempt_at": _now(),
        "status": "pending",
        "http_status": None,
        "response_snippet": None,
        "error": None,
        "duration_ms": None,
    }
    start = datetime.now(timezone.utc)

    if provider == "mock":
        log["status"] = "delivered"
        log["http_status"] = 200
        log["response_snippet"] = "mock-ok"
    else:
        endpoint = cfg.get("endpoint")
        token = cfg.get("auth_token")
        if not endpoint:
            log["status"] = "failed"; log["error"] = "No endpoint configured"
        else:
            headers = {"Content-Type": "application/json", "Accept": "application/json"}
            if token: headers["Authorization"] = f"Bearer {token}"
            # Provider-specific shape adjustments
            payload = _shape_payload(item, provider, cfg)
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.post(endpoint, json=payload, headers=headers)
                log["http_status"] = r.status_code
                log["response_snippet"] = (r.text or "")[:200]
                if 200 <= r.status_code < 300:
                    log["status"] = "delivered"
                else:
                    log["status"] = "failed"
                    log["error"] = f"HTTP {r.status_code}"
            except Exception as e:
                log["status"] = "failed"
                log["error"] = str(e)[:200]

    log["duration_ms"] = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    return log


def _shape_payload(item: dict, provider: str, cfg: dict) -> dict:
    """Map LUCCCA outbound item to provider-specific shape (best-effort)."""
    base = {
        "luccca_id": item.get("id"),
        "kind": item.get("kind"),
        "action": item.get("action"),
        "name": item.get("name"),
        "price": item.get("price"),
        "sku": item.get("sku"),
        "payload": item.get("payload"),
        "source": "luccca",
    }
    if provider == "micros":
        return {"menuItem": {
            "name": item.get("name"),
            "sku": item.get("sku"),
            "price": item.get("price"),
            "active": item.get("active"),
            "externalReference": item.get("id"),
            "metadata": item.get("payload") or {},
        }}
    if provider == "toast":
        return {"menuItem": {
            "name": item.get("name"),
            "externalId": item.get("id"),
            "price": int((item.get("price") or 0) * 100),
            "active": item.get("active"),
            "managementGroupGUID": (cfg.get("extra") or {}).get("managementGroupGUID"),
        }}
    return base  # webhook / mock


@router.post("/drain")
async def drain_queue(limit: int = 50):
    cfg = db[CFG_COLL].find_one({"_id": "default"}) or {"provider": "mock", "active": True}
    if not cfg.get("active", True):
        return {"drained": 0, "reason": "adapter inactive"}
    pending = list(db["pos_outbound"].find({"status": "pending"}).sort("created_at", 1).limit(limit))
    delivered = 0
    failed = 0
    results = []
    for item in pending:
        item_clean = {k: v for k, v in item.items() if k != "_id"}
        log = await _deliver_one(item_clean, cfg)
        db[LOG_COLL].insert_one({**log})
        results.append({k: v for k, v in log.items() if k != "_id"})
        if log["status"] == "delivered":
            db["pos_outbound"].update_one(
                {"id": item["id"]},
                {"$set": {"status": "delivered", "delivered_at": _now(),
                          "delivery_provider": cfg.get("provider")}}
            )
            delivered += 1
        else:
            attempts = int(item.get("attempts") or 0) + 1
            new_status = "dead" if attempts >= 5 else "pending"
            db["pos_outbound"].update_one(
                {"id": item["id"]},
                {"$set": {"status": new_status, "attempts": attempts, "last_error": log.get("error")}}
            )
            failed += 1
    return {
        "provider": cfg.get("provider"),
        "attempted": len(pending),
        "delivered": delivered,
        "failed": failed,
        "log": [{k: v for k, v in r.items() if k != "_id"} for r in results[-20:]],
    }


@router.get("/delivery-log")
async def delivery_log(limit: int = 100, provider: Optional[str] = None, status: Optional[str] = None):
    q: dict = {}
    if provider: q["provider"] = provider
    if status: q["status"] = status
    items = list(db[LOG_COLL].find(q, {"_id": 0}).sort("attempt_at", -1).limit(limit))
    return {"items": items, "total": len(items)}


@router.get("/summary")
async def summary():
    cfg = db[CFG_COLL].find_one({"_id": "default"}) or {"provider": "mock"}
    pending = db["pos_outbound"].count_documents({"status": "pending"})
    delivered = db["pos_outbound"].count_documents({"status": "delivered"})
    dead = db["pos_outbound"].count_documents({"status": "dead"})
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    last_log = list(db[LOG_COLL].find({}, {"_id": 0}).sort("attempt_at", -1).limit(1))
    return {
        "provider": cfg.get("provider"),
        "active": cfg.get("active", True),
        "queue": {"pending": pending, "delivered": delivered, "dead": dead},
        "last_attempt": last_log[0] if last_log else None,
    }


@router.post("/test-connection")
async def test_connection():
    cfg = db[CFG_COLL].find_one({"_id": "default"}) or {"provider": "mock"}
    ping = {"id": f"ping-{uuid4().hex[:6]}", "kind": "ping", "action": "ping",
            "name": "connection-test", "payload": {"ts": _now()}}
    log = await _deliver_one(ping, cfg)
    db[LOG_COLL].insert_one({**log})
    return {k: v for k, v in log.items() if k != "_id"}
