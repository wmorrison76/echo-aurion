"""
Public share links for cake renders + referral tracking for Pastry Standalone.
- GET /api/pastry/look/{render_id} — public read-only render view (no auth)
- POST /api/pastry/look/{render_id}/publish — bakery owner enables public sharing
- POST /api/pastry/look/{render_id}/unpublish
- GET /api/pastry/referrals/{subscriber_id}/link — unique referral URL
- POST /api/pastry/referrals/record — record an inbound referral click / signup
- GET /api/pastry/referrals/leaderboard — top referring bakeries
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel

from database import db as _db
from auth_admin import require_admin
from observability.rate_limit import limiter

router = APIRouter(prefix="/api/pastry", tags=["pastry-share-referrals"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Share links ───
class PublishRequest(BaseModel):
    owner_email: Optional[str] = None
    client_name: Optional[str] = None
    public_title: Optional[str] = None


@router.post("/look/{render_id}/publish")
async def publish_look(render_id: str, body: PublishRequest):
    existing = _db.cake_renders.find_one({"render_id": render_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "render not found")
    share_token = uuid.uuid4().hex[:10]
    updates = {
        "public": True,
        "share_token": existing.get("share_token") or share_token,
        "public_title": body.public_title,
        "client_name": body.client_name,
        "published_at": _now(),
    }
    if body.owner_email:
        updates["owner_email"] = body.owner_email
    _db.cake_renders.update_one({"render_id": render_id}, {"$set": updates})
    doc = _db.cake_renders.find_one({"render_id": render_id}, {"_id": 0}) or {}
    return {
        "render_id": render_id,
        "share_token": doc.get("share_token"),
        "share_url": f"/pastry/look/{doc.get('share_token')}",
    }


@router.post("/look/{render_id}/unpublish")
async def unpublish_look(render_id: str):
    res = _db.cake_renders.update_one(
        {"render_id": render_id},
        {"$set": {"public": False, "unpublished_at": _now()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "render not found")
    return {"ok": True}


@router.get("/look/{share_token}")
async def view_public_look(share_token: str):
    """Public, unauthenticated render view. Accessed via short share_token in URL."""
    doc = _db.cake_renders.find_one(
        {"share_token": share_token, "public": True},
        {"_id": 0, "prompt": 0},  # don't leak the full prompt (proprietary) to end-clients
    )
    if not doc:
        raise HTTPException(404, "share link not found or unpublished")
    _db.cake_render_views.insert_one({
        "share_token": share_token,
        "viewed_at": _now(),
    })
    return {
        "render_id": doc.get("render_id"),
        "image_url": doc.get("image_url"),
        "title": doc.get("public_title") or doc.get("title") or "Cake preview",
        "client_name": doc.get("client_name"),
        "bakery_name": doc.get("owner_email") or "Your bakery",
        "style": doc.get("style"),
        "created_at": doc.get("created_at"),
    }


# ─── Client approval inbox ───
class ClientApproval(BaseModel):
    share_token: str
    decision: str  # "approved" | "changes_requested"
    note: Optional[str] = None


@router.post("/look/approve")
@limiter.limit("30/hour")
async def record_approval(request: Request, body: ClientApproval):
    """Client clicks Approve/Request-change on the public /pastry/look page.
    Stored in `client_approvals` — shows up as a badge on the bakery admin dashboard.
    """
    render = _db.cake_renders.find_one({"share_token": body.share_token, "public": True}, {"_id": 0})
    if not render:
        raise HTTPException(404, "share link not found")
    entry = {
        "id": uuid.uuid4().hex[:12],
        "share_token": body.share_token,
        "render_id": render.get("render_id"),
        "owner_email": render.get("owner_email"),
        "bakery_name": render.get("owner_email"),
        "client_name": render.get("client_name"),
        "public_title": render.get("public_title"),
        "image_url": render.get("image_url"),
        "decision": body.decision if body.decision in ("approved", "changes_requested") else "approved",
        "note": body.note,
        "seen_by_bakery": False,
        "created_at": _now(),
    }
    _db.client_approvals.insert_one(entry.copy())
    return {"ok": True, "id": entry["id"]}


@router.get("/approvals", dependencies=[Depends(require_admin)])
async def list_approvals(owner_email: Optional[str] = None, unseen_only: bool = False, limit: int = 50):
    q: Dict = {}
    if owner_email:
        q["owner_email"] = owner_email
    if unseen_only:
        q["seen_by_bakery"] = False
    rows = list(_db.client_approvals.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    unseen = sum(1 for r in rows if not r.get("seen_by_bakery"))
    return {"items": rows, "total": len(rows), "unseen": unseen}


@router.post("/approvals/{approval_id}/seen")
async def mark_approval_seen(approval_id: str):
    res = _db.client_approvals.update_one({"id": approval_id}, {"$set": {"seen_by_bakery": True, "seen_at": _now()}})
    if res.matched_count == 0:
        raise HTTPException(404, "approval not found")
    return {"ok": True}


# ─── Referral tracking ───
@router.get("/referrals/{subscriber_id}/link")
async def get_referral_link(subscriber_id: str, origin: Optional[str] = None):
    sub = _db.pastry_subscribers.find_one({"id": subscriber_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "subscriber not found")
    code = sub.get("referral_code")
    if not code:
        code = f"REF-{subscriber_id[:6].upper()}-{uuid.uuid4().hex[:4].upper()}"
        _db.pastry_subscribers.update_one(
            {"id": subscriber_id},
            {"$set": {"referral_code": code, "referral_count": sub.get("referral_count", 0)}},
        )
    base = origin or os.environ.get("PASTRY_PUBLIC_URL", "")
    return {
        "referral_code": code,
        "referral_url": f"{base}/pastry?ref={code}" if base else f"/pastry?ref={code}",
    }


class ReferralRecord(BaseModel):
    referral_code: str
    event: str  # "click" | "signup" | "paid"
    new_subscriber_email: Optional[str] = None


@router.post("/referrals/record")
async def record_referral(body: ReferralRecord):
    ref_sub = _db.pastry_subscribers.find_one({"referral_code": body.referral_code}, {"_id": 0})
    event_doc = {
        "id": uuid.uuid4().hex[:12],
        "referral_code": body.referral_code,
        "event": body.event,
        "referrer_email": ref_sub.get("email") if ref_sub else None,
        "new_subscriber_email": body.new_subscriber_email,
        "created_at": _now(),
    }
    _db.referral_events.insert_one(event_doc)
    # On a paid conversion, credit the referrer with a free month (+30 days)
    if body.event == "paid" and ref_sub:
        from datetime import timedelta
        current = ref_sub.get("next_billing_at")
        try:
            base_dt = datetime.fromisoformat(current) if current else datetime.now(timezone.utc)
        except Exception:
            base_dt = datetime.now(timezone.utc)
        new_dt = base_dt + timedelta(days=30)
        _db.pastry_subscribers.update_one(
            {"id": ref_sub.get("id")},
            {
                "$inc": {"referral_count": 1, "referral_free_months": 1},
                "$set": {"next_billing_at": new_dt.isoformat(), "updated_at": _now()},
            },
        )
    return {"ok": True, "credited": bool(ref_sub and body.event == "paid")}


@router.get("/referrals/leaderboard")
async def referral_leaderboard(limit: int = 10):
    pipeline = [
        {"$match": {"referral_count": {"$gt": 0}}},
        {"$project": {"_id": 0, "bakery_name": 1, "email": 1, "referral_code": 1,
                      "referral_count": 1, "referral_free_months": 1}},
        {"$sort": {"referral_count": -1}},
        {"$limit": max(1, min(50, limit))},
    ]
    rows = list(_db.pastry_subscribers.aggregate(pipeline))
    return {"leaderboard": rows, "total": len(rows)}


# ─── Click/signup tracking for /pastry?ref=CODE (called from frontend on landing) ───
@router.get("/referrals/ping")
async def ping_referral(ref: str):
    """Lightweight click-tracker: /pastry?ref=CODE landing page calls this once."""
    await record_referral(ReferralRecord(referral_code=ref, event="click"))
    return {"ok": True}
