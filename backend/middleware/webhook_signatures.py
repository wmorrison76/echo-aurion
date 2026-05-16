"""
D53.6 · Webhook signature verification.

Anyone who guesses /api/reservation-channel/inbound can post a
fake Booking.com / OpenTable / Resy reservation today. Real OTAs
sign payloads with HMAC-SHA256 over the raw body. We verify.

Per-channel signing keys live in the D17 fuse-box (services/
clients.py reads from secrets manager). This module is the
verification layer that sits in front of the inbound endpoint.

Usage in a route:

    from middleware.webhook_signatures import verify_signature

    @router.post("/inbound")
    async def inbound(req: Request, ...):
        await verify_signature(req, channel="opentable")
        # ... rest of handler

Signing-key resolution

  1. ENV var per channel: ECHO_WEBHOOK_KEY_<CHANNEL_UPPER>
  2. Database: reservation_channel_connections.webhook_secret
  3. Reject (no key configured = no inbound)

Each channel may use a different signature header convention; we
support the common ones (X-Signature, X-Hub-Signature-256,
X-Webhook-Signature). Verification is constant-time.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Optional

from fastapi import HTTPException, Request

logger = logging.getLogger("echo.webhook_signatures")


# Header name per channel (configurable; defaults to common patterns)
SIGNATURE_HEADERS = {
    "opentable":   "X-OpenTable-Signature",
    "resy":        "X-Resy-Signature-256",
    "tock":        "X-Tock-Signature",
    "sevenrooms":  "X-7R-Signature",
    "booking_com": "X-BCM-Signature",
    "expedia":     "X-Expedia-Signature",
    "marriott_crs":"X-Marriott-Signature",
    "mindbody":    "X-MB-Signature",
    "viator":      "X-Viator-Signature",
}
DEFAULT_HEADER = "X-Webhook-Signature"


def _resolve_secret(channel: str, db) -> Optional[str]:
    """ENV first, DB second."""
    env_key = f"ECHO_WEBHOOK_KEY_{channel.upper()}"
    val = os.getenv(env_key)
    if val:
        return val
    try:
        row = db["reservation_channel_connections"].find_one(
            {"channel": channel}) if db else None
        if row and row.get("webhook_secret"):
            return row["webhook_secret"]
    except Exception:
        pass
    return None


def _constant_time_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


async def verify_signature(request: Request, channel: str,
                            db=None) -> None:
    """Read raw body, verify HMAC-SHA256 with channel's secret.
    Raises 401 on missing/bad signature.

    Note: this CONSUMES the request body. The caller should
    re-parse via request.body() (which is now cached) or use
    request._json (FastAPI caches the parsed JSON)."""
    if db is None:
        try:
            import database
            db = database.db
        except Exception:
            pass

    secret = _resolve_secret(channel, db)
    if not secret:
        # If no secret is configured we MUST refuse — accepting
        # unsigned inbound is the bug we're closing.
        logger.error(f"webhook secret missing for channel '{channel}'")
        raise HTTPException(401,
            f"webhook signing key not configured for {channel}")

    header_name = SIGNATURE_HEADERS.get(channel, DEFAULT_HEADER)
    provided = request.headers.get(header_name)
    if not provided:
        logger.warning(f"webhook missing {header_name} header "
                        f"for channel {channel}")
        raise HTTPException(401, "missing signature header")

    body = await request.body()
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    # Some providers prefix with "sha256="
    cleaned = provided.split("=")[-1].strip().lower()
    if not _constant_time_eq(cleaned, expected):
        logger.warning(f"webhook signature mismatch "
                        f"channel={channel} ip={request.client.host if request.client else '?'}")
        raise HTTPException(401, "invalid signature")
    logger.info(f"webhook signature ok channel={channel}")
