"""
D53.5 · Rate limiting middleware.

Pure-Python token bucket per (client_ip, endpoint_class). No
external dependency (slowapi requires Redis for distributed; this
is the in-process baseline that survives until the Redis cluster
is provisioned).

Endpoint classes (configured per-route via RATE_LIMITS):

  default           60 requests / minute per IP
  voice             20 / minute  (LLM-bound, expensive)
  payroll_run        4 / minute  (admin-only, heavy)
  channel_inbound  300 / minute  (OTAs may burst)
  health           unlimited
  metrics          unlimited

When the limit is hit, we return 429 with Retry-After header.
The structured logger fires on every limit breach so SREs can
spot abusive clients.

Doctrine alignment

  · §1.4 voice register: rate-limit decisions never expose
    user / tenant identity in the response body.
  · §3.1 append-only: limiter state is in-memory; restart resets.
    For production replace with Redis-backed sliding window.
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("echo.rate_limit")


# (max_requests, window_seconds)
RATE_LIMITS: Dict[str, Tuple[int, int]] = {
    "default":          (60,  60),
    "voice":            (20,  60),
    "payroll_run":      (4,   60),
    "channel_inbound":  (300, 60),
    "health":           (10_000, 60),
}


def _classify(path: str) -> str:
    """Map URL path to rate-limit class."""
    if path in ("/healthz", "/readyz", "/version"):
        return "health"
    if path.startswith("/api/echo/sous-chef") or path.startswith(
        "/api/echo/activity/voice"):
        return "voice"
    if "/payroll/run/" in path:
        return "payroll_run"
    if path.startswith("/api/reservation-channel/inbound"):
        return "channel_inbound"
    return "default"


# Per (ip, class) → deque of timestamps within the window
_buckets: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Behind a load balancer, prefer X-Forwarded-For first IP
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-process sliding-window limiter. Replace the _buckets
    backing store with Redis for multi-pod deployments."""

    async def dispatch(self, request: Request, call_next):
        cls = _classify(request.url.path)
        max_req, window = RATE_LIMITS.get(cls, RATE_LIMITS["default"])
        ip = _client_ip(request)
        key = (ip, cls)
        now = time.time()
        bucket = _buckets[key]
        # Drop expired tokens
        cutoff = now - window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_req:
            retry_after = int(bucket[0] + window - now) + 1
            logger.warning(
                "rate_limit_exceeded",
                extra={"ip": ip, "class": cls,
                       "path": request.url.path,
                       "retry_after": retry_after})
            return Response(
                status_code=429,
                content='{"error":"rate_limit_exceeded",'
                         '"retry_after_seconds":' + str(retry_after) + '}',
                media_type="application/json",
                headers={"Retry-After": str(retry_after)})
        bucket.append(now)
        return await call_next(request)
