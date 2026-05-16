"""
Idempotency Middleware
=======================
L.10 from the launch-readiness audit. Standard payments-grade
idempotency: a POST/PATCH/PUT request carrying an `Idempotency-Key`
header that the server has seen before returns the cached response
instead of re-executing the handler.

This survives:
  · Network retries (client gets the same response without double-
    creating the entity)
  · Mobile app foreground/background flips that re-fire requests
  · Multi-region deploys where a request might land on two pods

Storage: `idempotency_cache` collection with TTL-based expiry (24h
default). Cached response includes status_code + body. Idempotency
keys are scoped per (method, path, tenant) so the same key on
different endpoints doesn't collide.

Doctrine alignment:
  · §1.1 transparency — replayed responses include
    `X-Idempotent-Replay: true` header so the client knows
  · §3.1 append-only — cache rows are never mutated; expiry is via
    TTL on the document
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import hashlib
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from database import db


IDEMPOTENT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
DEFAULT_TTL_HOURS = 24


def _ensure_indexes():
    db["idempotency_cache"].create_index("idem_key", unique=True)
    # TTL index: expires_at is a datetime; Mongo deletes automatically
    db["idempotency_cache"].create_index("expires_at", expireAfterSeconds=0)


try:
    _ensure_indexes()
except Exception:
    pass


def _hash_request_body(body_bytes: bytes) -> str:
    return hashlib.sha256(body_bytes).hexdigest()[:24]


def _cache_key(idempotency_header: str, method: str, path: str, tenant_id: str) -> str:
    """Compose a globally-unique cache key. Per (header, method,
    path, tenant) so the same idempotency key on different endpoints
    is treated as different."""
    raw = f"{tenant_id}|{method}|{path}|{idempotency_header}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Look up the request's `Idempotency-Key` header. If we've seen
    it before with the same body hash, replay the cached response.
    Otherwise pass through and cache the response on the way out."""

    async def dispatch(self, request: Request, call_next):
        if request.method not in IDEMPOTENT_METHODS:
            return await call_next(request)

        idem_header = request.headers.get("idempotency-key")
        if not idem_header:
            return await call_next(request)

        # Read tenant id (best effort — if no auth middleware ran, defaults to "default")
        from services.structured_logging import tenant_id_var
        tenant_id = tenant_id_var.get() or "default"

        # Buffer the body so we can hash it AND let the handler still read it
        body = await request.body()
        body_hash = _hash_request_body(body)
        cache_key = _cache_key(idem_header, request.method, request.url.path, tenant_id)

        # Look up cache
        try:
            cached = db["idempotency_cache"].find_one({"idem_key": cache_key})
        except Exception:
            cached = None

        if cached:
            # Verify body hash matches — if not, the same idem-key was
            # used with a different body (programming error or attack);
            # we surface that as a 422 rather than serving the wrong
            # cached response
            if cached.get("body_hash") != body_hash:
                return JSONResponse(
                    status_code=422,
                    content={
                        "error": "idempotency_key_reuse_with_different_body",
                        "detail": "Same Idempotency-Key was used with a different request body. Idempotency keys must be unique per logical request.",
                    },
                    headers={"X-Idempotent-Replay": "false"},
                )
            # Replay cached response
            return JSONResponse(
                status_code=cached.get("status_code", 200),
                content=cached.get("response_body"),
                headers={"X-Idempotent-Replay": "true", "X-Idempotent-Original-At": cached.get("cached_at", "")},
            )

        # Recreate the body so the handler can read it (Starlette consumed it via .body())
        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}
        request._receive = receive

        response = await call_next(request)

        # Cache only success-ish responses (2xx). Errors aren't cached
        # so a failed call can be retried.
        if 200 <= response.status_code < 300:
            try:
                response_body_bytes = b""
                async for chunk in response.body_iterator:
                    response_body_bytes += chunk
                # Reconstitute the response since we drained the iterator
                try:
                    response_body_json = json.loads(response_body_bytes.decode("utf-8"))
                except Exception:
                    response_body_json = {"_raw": response_body_bytes.decode("utf-8", errors="replace")}

                expires_at = datetime.now(timezone.utc) + timedelta(hours=DEFAULT_TTL_HOURS)
                try:
                    db["idempotency_cache"].insert_one({
                        "idem_key": cache_key,
                        "tenant_id": tenant_id,
                        "method": request.method,
                        "path": request.url.path,
                        "body_hash": body_hash,
                        "status_code": response.status_code,
                        "response_body": response_body_json,
                        "cached_at": datetime.now(timezone.utc).isoformat(),
                        "expires_at": expires_at,
                    })
                except Exception:
                    # Race condition: another pod cached first. That's fine.
                    pass

                return JSONResponse(
                    status_code=response.status_code,
                    content=response_body_json,
                    headers={**dict(response.headers), "X-Idempotent-Replay": "false"},
                )
            except Exception:
                # If cache write fails, return the response uncached
                return response

        return response
