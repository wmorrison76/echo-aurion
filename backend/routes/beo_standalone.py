"""
BEO Standalone — Banquet Event Order SaaS for venues, catering companies, wedding halls.

Stripe pricing: $399 onboarding (setup + first month) · $79/month recurring
Reuses the main app's BEO engine (routes/beo_orchestration.py) but exposes a tenant-scoped
public pricing + admin dashboard mirror of the Pastry module.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

from database import db as _db
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutStatusResponse,
)
from auth_admin import require_admin

load_dotenv()
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

router = APIRouter(prefix="/api/beo-standalone", tags=["beo-standalone"])


BEO_PACKAGES: Dict[str, Dict] = {
    "venue_monthly": {
        "label": "EchoAi³ BEO — Venue & Catering Plan",
        "amount": 478.00,  # $399 onboarding + $79 first month
        "currency": "usd",
        "setup_usd": 399.00,
        "monthly_usd": 79.00,
        "features": [
            "Unlimited Banquet Event Orders with auto-PDF branding",
            "Catering menu builder with allergen + dietary tagging",
            "Floor-plan builder (tables, dance floor, stage, AV)",
            "Vendor coordination + timeline tracker",
            "Guest count reconciliation + portion forecasting",
            "AI photoreal concept renders for venue styling",
            "Digital contract + e-signature flow",
            "Stripe deposit invoicing ($X now, balance 72h before event)",
        ],
    },
    "catering_monthly": {
        "label": "EchoAi³ BEO — Catering-Only Plan",
        "amount": 348.00,  # $299 onboarding + $49 first month
        "currency": "usd",
        "setup_usd": 299.00,
        "monthly_usd": 49.00,
        "features": [
            "Banquet Event Orders + auto-PDF",
            "Menu builder + allergen tagging",
            "Guest count + portion forecasting",
            "Stripe deposit invoicing",
            "Vendor coordination",
        ],
    },
}


def _get_checkout_client(origin_url: str) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured")
    webhook_url = f"{origin_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CheckoutRequest(BaseModel):
    package_id: str = "venue_monthly"
    origin_url: str
    email: Optional[EmailStr] = None
    venue_name: Optional[str] = None


@router.get("/packages")
async def beo_packages():
    return {"packages": BEO_PACKAGES, "stripe_enabled": bool(STRIPE_API_KEY)}


@router.post("/checkout/session")
async def beo_checkout(req: CheckoutRequest):
    pkg = BEO_PACKAGES.get(req.package_id)
    if not pkg:
        raise HTTPException(400, f"Unknown package: {req.package_id}")
    client = _get_checkout_client(req.origin_url)
    success_url = f"{req.origin_url}/beo/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/beo"
    metadata = {
        "package_id": req.package_id,
        "product": "echoai3_beo_standalone",
    }
    if req.email: metadata["email"] = str(req.email)
    if req.venue_name: metadata["venue_name"] = req.venue_name
    checkout_request = CheckoutSessionRequest(
        amount=float(pkg["amount"]), currency=pkg["currency"],
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    try:
        session = await client.create_checkout_session(checkout_request)
    except Exception as e:
        raise HTTPException(502, f"Stripe error: {e}")
    _db.payment_transactions.insert_one({
        "id": uuid.uuid4().hex[:16], "session_id": session.session_id,
        "package_id": req.package_id, "amount_usd": float(pkg["amount"]), "currency": pkg["currency"],
        "email": str(req.email) if req.email else None,
        "venue_name": req.venue_name,
        "product": "echoai3_beo_standalone",
        "status": "pending", "payment_status": "unpaid",
        "metadata": metadata, "created_at": _now(), "updated_at": _now(),
    })
    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout/status/{session_id}")
async def beo_checkout_status(session_id: str, request: Request):
    tx = _db.payment_transactions.find_one({"session_id": session_id, "product": "echoai3_beo_standalone"}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "session not found")
    if tx.get("payment_status") == "paid":
        return {"session_id": session_id, "payment_status": "paid", "activated": True, "metadata": tx.get("metadata", {})}
    origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
    client = _get_checkout_client(origin)
    try:
        status: CheckoutStatusResponse = await client.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(502, f"Stripe poll failed: {e}")
    _db.payment_transactions.update_one(
        {"session_id": session_id}, {"$set": {"status": status.status, "payment_status": status.payment_status, "updated_at": _now()}}
    )
    activated = False
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        _activate_beo_subscriber(tx, status)
        activated = True
    return {
        "session_id": session_id, "status": status.status, "payment_status": status.payment_status,
        "amount_total": status.amount_total, "currency": status.currency,
        "metadata": status.metadata, "activated": activated,
    }


def _activate_beo_subscriber(tx: dict, status: CheckoutStatusResponse):
    email = tx.get("email") or status.metadata.get("email") or f"anon-{tx.get('id')}@beo.local"
    venue = tx.get("venue_name") or status.metadata.get("venue_name") or email.split("@")[0]
    pkg_id = tx.get("package_id", "venue_monthly")
    monthly = BEO_PACKAGES.get(pkg_id, BEO_PACKAGES["venue_monthly"]).get("monthly_usd", 79)
    amount = float(tx.get("amount_usd", 0))
    now = _now()
    existing = _db.beo_subscribers.find_one({"email": email}, {"_id": 0})
    if existing:
        _db.beo_subscribers.update_one(
            {"email": email},
            {"$inc": {"lifetime_paid_usd": amount},
             "$set": {"status": "active", "updated_at": now,
                      "next_billing_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}},
        )
    else:
        _db.beo_subscribers.insert_one({
            "id": uuid.uuid4().hex[:12], "email": email, "venue_name": venue,
            "package_id": pkg_id, "mrr_usd": float(monthly),
            "status": "active", "signup_at": now,
            "next_billing_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "lifetime_paid_usd": amount, "activation_session_id": tx.get("session_id"),
            "updated_at": now,
        })


@router.get("/admin/subscribers", dependencies=[Depends(require_admin)])
async def beo_admin_subscribers():
    rows = list(_db.beo_subscribers.find({}, {"_id": 0}).sort("signup_at", -1))
    active = [r for r in rows if r.get("status") == "active"]
    return {
        "subscribers": rows,
        "total_subscribers": len(rows),
        "active_subscribers": len(active),
        "mrr_usd": sum(float(r.get("mrr_usd", 0)) for r in active),
        "lifetime_revenue_usd": sum(float(r.get("lifetime_paid_usd", 0)) for r in rows),
    }
