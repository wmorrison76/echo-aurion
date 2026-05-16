"""
slowapi rate limiter configuration.
Usage:
    from observability.rate_limit import limiter, rate_limit
    @router.get("/heavy")
    @rate_limit("10/minute")
    async def heavy(request: Request): ...
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Global defaults (can be overridden per-endpoint)
_DEFAULT_LIMITS = os.environ.get("RATE_LIMIT_DEFAULTS", "200/minute").split(";")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=_DEFAULT_LIMITS,
    storage_uri=os.environ.get("RATE_LIMIT_STORAGE", "memory://"),
    headers_enabled=False,  # disabled — only compatible with raw Response returns; we use Pydantic models
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """429 handler — JSON body with Retry-After header."""
    response = JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded",
            "limit": str(exc.detail),
            "retry_after_seconds": 60,
        },
    )
    response.headers["Retry-After"] = "60"
    return response


def rate_limit(spec: str):
    """Decorator shorthand: @rate_limit('10/minute')"""
    return limiter.limit(spec)
