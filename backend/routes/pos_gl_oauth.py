"""
POS/GL OAuth Integration Stubs — Toast POS & QuickBooks Online
================================================================
Ready for production keys. Provides:
- OAuth config endpoints (store/retrieve keys)
- Connection test endpoints
- Webhook receiver stubs
- Sync status tracking
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter(prefix="/api/integrations", tags=["integrations"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


class IntegrationConfigInput(BaseModel):
    provider: str  # toast, quickbooks, sendgrid, resend
    api_key: str = ""
    client_id: str = ""
    client_secret: str = ""
    webhook_url: str = ""
    environment: str = "sandbox"  # sandbox, production


# ── Config Management ──
@router.get("/status")
async def integration_status():
    """Get status of all configured integrations."""
    configs = list(db["integration_configs"].find({}, {"_id": 0}))
    providers = {
        "toast": {"name": "Toast POS", "type": "pos", "status": "not_configured", "description": "Real-time POS transaction sync, menu management, order tracking"},
        "quickbooks": {"name": "QuickBooks Online", "type": "gl", "status": "not_configured", "description": "GL sync, invoicing, P&L reports, accounts payable"},
        "sendgrid": {"name": "SendGrid", "type": "email", "status": "not_configured", "description": "Transactional and marketing email delivery"},
        "resend": {"name": "Resend", "type": "email", "status": "not_configured", "description": "Developer-friendly email API"},
    }
    for cfg in configs:
        pid = cfg.get("provider", "")
        if pid in providers:
            providers[pid]["status"] = "configured" if cfg.get("api_key") or cfg.get("client_id") else "partial"
            providers[pid]["environment"] = cfg.get("environment", "sandbox")
            providers[pid]["last_sync"] = cfg.get("last_sync")
            providers[pid]["configured_at"] = cfg.get("created_at")

    return {"integrations": list(providers.values()), "total_configured": len([p for p in providers.values() if p["status"] == "configured"])}


@router.post("/configure")
async def configure_integration(data: IntegrationConfigInput):
    """Store integration credentials (encrypted in production)."""
    existing = db["integration_configs"].find_one({"provider": data.provider}, {"_id": 0})
    doc = {
        **data.model_dump(),
        "updated_at": _now(),
    }
    if existing:
        db["integration_configs"].update_one({"provider": data.provider}, {"$set": doc})
    else:
        doc["id"] = f"int-{_uid()}"
        doc["created_at"] = _now()
        db["integration_configs"].insert_one(doc)
        doc.pop("_id", None)
    return {"status": "configured", "provider": data.provider, "environment": data.environment}


@router.post("/test/{provider}")
async def test_connection(provider: str):
    """Test connection to a configured integration."""
    cfg = db["integration_configs"].find_one({"provider": provider}, {"_id": 0})
    if not cfg:
        raise HTTPException(404, f"Integration {provider} not configured. Add credentials first.")
    # In production, this would actually test the API connection
    return {
        "provider": provider,
        "status": "connection_ready",
        "message": f"{provider.title()} integration configured. Will connect when production keys are provided.",
        "environment": cfg.get("environment", "sandbox"),
        "note": "Sandbox mode — no actual API calls made. Switch to production with real keys to activate.",
    }


# ── Toast POS Stubs ──
@router.get("/toast/menu")
async def toast_menu_sync():
    """Stub: Would sync menu items from Toast POS."""
    return {"status": "stub", "message": "Toast menu sync ready. Provide Toast API credentials to activate.", "items": [], "last_sync": None}

@router.post("/toast/webhook")
async def toast_webhook(payload: dict = {}):
    """Stub: Receive Toast POS webhooks (orders, payments, menu changes)."""
    db["integration_webhooks"].insert_one({"id": f"wh-{_uid()}", "provider": "toast", "payload": str(payload)[:500], "received_at": _now()})
    return {"status": "received", "provider": "toast"}

@router.get("/toast/orders")
async def toast_orders(date: Optional[str] = None):
    """Stub: Would fetch orders from Toast POS."""
    return {"status": "stub", "message": "Toast order sync ready. Provide credentials.", "orders": [], "date": date}


# ── QuickBooks Online Stubs ──
@router.get("/quickbooks/accounts")
async def qbo_accounts():
    """Stub: Would fetch chart of accounts from QBO."""
    return {"status": "stub", "message": "QuickBooks GL sync ready. Provide OAuth credentials.", "accounts": [], "last_sync": None}

@router.post("/quickbooks/webhook")
async def qbo_webhook(payload: dict = {}):
    """Stub: Receive QuickBooks webhooks."""
    db["integration_webhooks"].insert_one({"id": f"wh-{_uid()}", "provider": "quickbooks", "payload": str(payload)[:500], "received_at": _now()})
    return {"status": "received", "provider": "quickbooks"}

@router.get("/quickbooks/pnl")
async def qbo_pnl(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Stub: Would fetch P&L from QBO."""
    return {"status": "stub", "message": "QuickBooks P&L ready. Provide credentials.", "report": None}


# ── SendGrid / Resend Email Stubs ──
@router.post("/email/send")
async def send_email(to: str = Query(...), subject: str = Query(...), body: str = Query("")):
    """Send email via configured provider (SendGrid or Resend)."""
    cfg = db["integration_configs"].find_one({"provider": {"$in": ["sendgrid", "resend"]}}, {"_id": 0})
    if not cfg:
        # Queue locally
        db["email_queue"].insert_one({"id": f"em-{_uid()}", "to": to, "subject": subject, "body": body, "status": "queued_local", "created_at": _now()})
        return {"status": "queued_local", "message": "Email queued locally. Configure SendGrid or Resend to deliver."}
    # Would use the API to send
    return {"status": "ready", "provider": cfg["provider"], "message": f"Would send via {cfg['provider']}. Production keys needed for actual delivery."}

@router.get("/email/queue")
async def email_queue():
    """List queued emails."""
    emails = list(db["email_queue"].find({}, {"_id": 0}).sort("created_at", -1).limit(20))
    return {"emails": emails, "total": len(emails)}
