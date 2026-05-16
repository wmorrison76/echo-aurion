"""
Pastry Module — Standalone Stripe Checkout & Subscription tracking (iter156).

Flow (MVP):
  • New bakery lands on /pastry, clicks "Activate".
  • Backend creates a Stripe Checkout Session for a fixed $299 combined onboarding fee
    ($250 setup + $49 first month). We use emergentintegrations.StripeCheckout.
  • On success redirect, frontend polls /api/pastry/checkout/status/{session_id}.
  • When paid → insert into `pastry_subscribers` collection with next_billing_at +30d.
  • `/api/pastry/admin/subscribers` exposes the paying-bakeries dashboard.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

from database import db as _db
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
)
from auth_admin import require_admin
from observability.rate_limit import limiter

load_dotenv()

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

router = APIRouter(prefix="/api/pastry", tags=["pastry-stripe"])
webhook_router = APIRouter(tags=["pastry-stripe-webhook"])  # mounted separately

# ─── Server-side fixed packages (NEVER accept amount from frontend) ───
PASTRY_PACKAGES: Dict[str, Dict] = {
    "standalone_monthly": {
        "label": "EchoAi³ Pastry Standalone — Bakery Plan",
        "amount": 299.00,  # $250 setup + $49 first month (combined)
        "currency": "usd",
        "setup_usd": 250.00,
        "monthly_usd": 49.00,
        "features": [
            "Premier 3D Cake Designer (10 signature presets)",
            "AI Photoreal Render Studio (fal.ai Flux Pro)",
            "Client Intake → Automated BEO PDF",
            "Scan-to-Inventory (invoice OCR)",
            "EchoAi-lite assistant (allergens, pricing, timeline)",
            "Structural feasibility checks + cut-guide generator",
        ],
    },
}


# ─── Pydantic models ───
class CheckoutRequest(BaseModel):
    package_id: str = "standalone_monthly"
    origin_url: str  # e.g., window.location.origin
    email: Optional[EmailStr] = None
    bakery_name: Optional[str] = None


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


class SubscriberRow(BaseModel):
    email: str
    bakery_name: Optional[str] = None
    status: str
    mrr_usd: float
    signup_at: str
    next_billing_at: Optional[str] = None
    lifetime_paid_usd: float


class AdminSummary(BaseModel):
    subscribers: List[SubscriberRow]
    total_subscribers: int
    active_subscribers: int
    mrr_usd: float
    lifetime_revenue_usd: float


# ─── helpers ───
def _get_checkout_client(origin_url: str) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured — set STRIPE_API_KEY in backend/.env")
    # Build webhook URL relative to backend (not origin)
    # origin_url is frontend origin; webhook must be backend-reachable via public proxy
    webhook_url = f"{origin_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── POST /api/pastry/checkout/session ───
@router.post("/checkout/session", response_model=CheckoutResponse)
@limiter.limit("20/hour")
async def create_checkout(request: Request, req: CheckoutRequest):
    pkg = PASTRY_PACKAGES.get(req.package_id)
    if not pkg:
        raise HTTPException(400, f"Unknown package: {req.package_id}")

    if not req.origin_url.startswith(("http://", "https://")):
        raise HTTPException(400, "Invalid origin_url")

    client = _get_checkout_client(req.origin_url)

    success_url = f"{req.origin_url}/pastry/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/pastry"

    metadata = {
        "package_id": req.package_id,
        "product": "echoai3_pastry_standalone",
    }
    if req.email:
        metadata["email"] = str(req.email)
    if req.bakery_name:
        metadata["bakery_name"] = req.bakery_name

    checkout_request = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency=pkg["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    try:
        session: CheckoutSessionResponse = await client.create_checkout_session(checkout_request)
    except Exception as e:
        raise HTTPException(502, f"Stripe checkout session creation failed: {e}")

    # Persist pending transaction BEFORE redirect
    tx_id = uuid.uuid4().hex[:16]
    _db.payment_transactions.insert_one({
        "id": tx_id,
        "session_id": session.session_id,
        "package_id": req.package_id,
        "amount_usd": float(pkg["amount"]),
        "currency": pkg["currency"],
        "email": str(req.email) if req.email else None,
        "bakery_name": req.bakery_name,
        "status": "pending",
        "payment_status": "unpaid",
        "metadata": metadata,
        "created_at": _now(),
        "updated_at": _now(),
    })

    return CheckoutResponse(url=session.url, session_id=session.session_id)


# ─── GET /api/pastry/checkout/status/{session_id} ───
@router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    tx = _db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Unknown checkout session")

    # If we've already processed success, return cached status (idempotency)
    if tx.get("payment_status") == "paid":
        return {
            "session_id": session_id,
            "status": tx.get("status"),
            "payment_status": "paid",
            "amount_total": int(float(tx.get("amount_usd", 0)) * 100),
            "currency": tx.get("currency", "usd"),
            "metadata": tx.get("metadata", {}),
            "activated": True,
        }

    origin_url = str(request.base_url).rstrip("/")
    # Use frontend origin from header if present (for webhook URL consistency)
    origin_header = request.headers.get("origin") or origin_url

    client = _get_checkout_client(origin_header)
    try:
        status: CheckoutStatusResponse = await client.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(502, f"Stripe status poll failed: {e}")

    # Update transaction idempotently
    updates = {
        "status": status.status,
        "payment_status": status.payment_status,
        "updated_at": _now(),
    }
    _db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})

    activated = False
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        _activate_subscriber(tx, status)
        activated = True

    return {
        "session_id": session_id,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
        "activated": activated,
    }


def _activate_subscriber(tx: dict, status: CheckoutStatusResponse):
    """Idempotently upsert a subscriber record when payment is confirmed."""
    email = tx.get("email") or status.metadata.get("email") or f"anon-{tx.get('id')}@pastry.local"
    bakery = tx.get("bakery_name") or status.metadata.get("bakery_name") or email.split("@")[0]
    amount = float(tx.get("amount_usd", 0))
    now = _now()

    existing = _db.pastry_subscribers.find_one({"email": email}, {"_id": 0})
    if existing:
        _db.pastry_subscribers.update_one(
            {"email": email},
            {"$inc": {"lifetime_paid_usd": amount},
             "$set": {"status": "active", "updated_at": now,
                      "next_billing_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}},
        )
    else:
        _db.pastry_subscribers.insert_one({
            "id": uuid.uuid4().hex[:12],
            "email": email,
            "bakery_name": bakery,
            "status": "active",
            "mrr_usd": 49.00,  # post-setup monthly
            "signup_at": now,
            "next_billing_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "lifetime_paid_usd": amount,
            "activation_session_id": tx.get("session_id"),
            "updated_at": now,
        })


# ─── GET /api/pastry/admin/subscribers (dashboard) ───
@router.get("/admin/subscribers", response_model=AdminSummary, dependencies=[Depends(require_admin)])
async def admin_subscribers():
    rows = list(_db.pastry_subscribers.find({}, {"_id": 0}).sort("signup_at", -1))
    subs = [
        SubscriberRow(
            email=r.get("email", ""),
            bakery_name=r.get("bakery_name"),
            status=r.get("status", "unknown"),
            mrr_usd=float(r.get("mrr_usd", 49.0)),
            signup_at=r.get("signup_at", ""),
            next_billing_at=r.get("next_billing_at"),
            lifetime_paid_usd=float(r.get("lifetime_paid_usd", 0.0)),
        )
        for r in rows
    ]
    active = [s for s in subs if s.status == "active"]
    return AdminSummary(
        subscribers=subs,
        total_subscribers=len(subs),
        active_subscribers=len(active),
        mrr_usd=sum(s.mrr_usd for s in active),
        lifetime_revenue_usd=sum(s.lifetime_paid_usd for s in subs),
    )


# ─── GET /api/pastry/packages ───
@router.get("/packages")
async def list_packages():
    return {"packages": PASTRY_PACKAGES, "stripe_enabled": bool(STRIPE_API_KEY)}


# ─── POST /api/pastry/billing/run-monthly — process due subscriptions ───
class MonthlyBillingResult(BaseModel):
    processed: int
    charged: List[Dict]
    skipped: List[Dict]
    errors: List[Dict]


@router.post("/billing/run-monthly", response_model=MonthlyBillingResult, dependencies=[Depends(require_admin)])
async def run_monthly_billing(request: Request, dry_run: bool = False):
    """Scan pastry_subscribers for rows where next_billing_at ≤ now, create a new
    Stripe checkout session per bakery for $49, email the link (TODO), and roll next_billing_at forward 30 days.

    This is a lightweight MVP — in production this would be triggered by a cron job.
    """
    now = datetime.now(timezone.utc)
    due = list(_db.pastry_subscribers.find({
        "status": "active",
        "next_billing_at": {"$lte": now.isoformat()},
    }, {"_id": 0}))

    origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
    monthly_amount = 49.00
    charged, skipped, errors = [], [], []

    for sub in due:
        email = sub.get("email")
        if not email:
            skipped.append({"reason": "no_email", "sub_id": sub.get("id")})
            continue

        if dry_run:
            charged.append({"email": email, "bakery_name": sub.get("bakery_name"),
                             "amount_usd": monthly_amount, "dry_run": True})
            continue

        try:
            client = _get_checkout_client(origin)
            checkout_request = CheckoutSessionRequest(
                amount=monthly_amount,
                currency="usd",
                success_url=f"{origin}/pastry/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{origin}/pastry",
                metadata={
                    "package_id": "standalone_monthly_recurring",
                    "product": "echoai3_pastry_monthly_charge",
                    "email": email,
                    "bakery_name": sub.get("bakery_name") or "",
                    "subscriber_id": sub.get("id") or "",
                },
            )
            session = await client.create_checkout_session(checkout_request)
        except Exception as e:
            errors.append({"email": email, "error": str(e)[:200]})
            continue

        tx_id = uuid.uuid4().hex[:16]
        _db.payment_transactions.insert_one({
            "id": tx_id,
            "session_id": session.session_id,
            "package_id": "standalone_monthly_recurring",
            "amount_usd": monthly_amount,
            "currency": "usd",
            "email": email,
            "bakery_name": sub.get("bakery_name"),
            "status": "pending",
            "payment_status": "unpaid",
            "metadata": {"recurring": True, "subscriber_id": sub.get("id")},
            "created_at": _now(),
            "updated_at": _now(),
            "kind": "monthly_recurring",
        })

        # Roll next_billing_at forward by 30 days (so we don't re-charge on the same run)
        _db.pastry_subscribers.update_one(
            {"email": email},
            {"$set": {"next_billing_at": (now + timedelta(days=30)).isoformat(), "last_billing_run_at": _now()}},
        )

        charged.append({
            "email": email,
            "bakery_name": sub.get("bakery_name"),
            "amount_usd": monthly_amount,
            "checkout_url": session.url,
            "session_id": session.session_id,
        })

    # Audit log
    _db.billing_runs.insert_one({
        "id": uuid.uuid4().hex[:12],
        "run_at": _now(),
        "dry_run": dry_run,
        "processed": len(due),
        "charged_count": len(charged),
        "skipped_count": len(skipped),
        "error_count": len(errors),
    })

    return MonthlyBillingResult(
        processed=len(due),
        charged=charged,
        skipped=skipped,
        errors=errors,
    )


# ─── GET /api/pastry/billing/runs — audit history of billing runs ───
@router.get("/billing/runs", dependencies=[Depends(require_admin)])
async def list_billing_runs(limit: int = 20):
    rows = list(_db.billing_runs.find({}, {"_id": 0}).sort("run_at", -1).limit(max(1, min(100, limit))))
    return {"runs": rows, "total": len(rows)}


# ─── GET /api/pastry/gallery — saved photoreal renders (photo gallery) ───
@router.get("/gallery")
async def gallery_list(
    limit: int = 48,
    email: Optional[str] = None,
    favorited_only: bool = False,
):
    """List saved photoreal cake renders, most recent first.

    Pulls from `cake_renders` collection (populated by /api/cake-ai/photoreal/render).
    Optional filters: email (tenant scope), favorited_only.
    """
    q: Dict = {"kind": "photoreal_render", "image_url": {"$ne": None}}
    if email:
        q["owner_email"] = email
    if favorited_only:
        q["favorited"] = True
    docs = list(
        _db.cake_renders.find(q, {"_id": 0})
        .sort("created_at", -1)
        .limit(max(1, min(200, limit)))
    )
    return {
        "items": docs,
        "total": len(docs),
    }


class GalleryUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    favorited: Optional[bool] = None
    owner_email: Optional[EmailStr] = None


@router.patch("/gallery/{render_id}")
async def gallery_update(render_id: str, body: GalleryUpdate):
    """Annotate a gallery item: title, tags, favorite flag, owner email."""
    existing = _db.cake_renders.find_one({"render_id": render_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "render not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True, "updated": 0}
    updates["updated_at"] = _now()
    if "owner_email" in updates:
        updates["owner_email"] = str(updates["owner_email"])
    _db.cake_renders.update_one({"render_id": render_id}, {"$set": updates})
    return {"ok": True, "updated": len(updates)}


@router.delete("/gallery/{render_id}")
async def gallery_delete(render_id: str):
    """Remove a render from the gallery."""
    res = _db.cake_renders.delete_one({"render_id": render_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "render not found")
    return {"ok": True, "deleted": 1}


# ─── POST /api/webhook/stripe (mounted on separate router so prefix /api/pastry isn't applied) ───
@webhook_router.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    # Build StripeCheckout using our webhook_url (required by SDK init)
    origin = str(request.base_url).rstrip("/")
    try:
        client = _get_checkout_client(origin)
        event = await client.handle_webhook(body, sig)
    except Exception as e:
        raise HTTPException(400, f"Webhook verification failed: {e}")

    # Persist webhook event
    _db.stripe_webhook_events.insert_one({
        "id": uuid.uuid4().hex[:16],
        "event_id": event.event_id,
        "event_type": event.event_type,
        "session_id": event.session_id,
        "payment_status": event.payment_status,
        "metadata": event.metadata or {},
        "received_at": _now(),
    })

    # Idempotent activation on successful payment
    if event.payment_status == "paid" and event.session_id:
        tx = _db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            # fake a CheckoutStatusResponse for _activate_subscriber compatibility
            class _S:
                metadata = event.metadata or {}
            _activate_subscriber(tx, _S())
            _db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "status": "complete", "updated_at": _now()}},
            )

    return {"ok": True, "event_id": event.event_id}
