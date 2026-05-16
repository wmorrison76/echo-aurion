"""
D57.23 · Security headers / CSP middleware.

Industry-standard HTTP response headers that prevent common
attack classes (XSS, clickjacking, MIME sniffing, mixed content).
The salvaged docs/ops-runbooks/SECURITY_BASELINE.md called these
out as nginx-level config; this is the application-layer
fallback that works regardless of reverse-proxy choice.

Headers added on every response:

  Strict-Transport-Security    Force HTTPS for 1 year + subdomains
  Content-Security-Policy      Restrict resource origins
  X-Frame-Options              Block iframe embedding
  X-Content-Type-Options       Prevent MIME sniffing
  Referrer-Policy              Limit referrer leakage
  Permissions-Policy           Disable unused browser APIs
  Cross-Origin-Opener-Policy   Isolate from cross-origin windows

Doctrine alignment

  · §1.2 silent service: headers don't leak operator info to
    untrusted browsers
  · Tenet 8 forbidden persists, never surfaces: CSP blocks
    inline scripts that could exfiltrate data
"""
from __future__ import annotations

import os
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware


# Default CSP — moderately strict. Override per-deployment via
# ECHO_CSP env var if a vendor SDK needs additional sources.
DEFAULT_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://cdn.jsdelivr.net https://unpkg.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "img-src 'self' data: blob: https://api.qrserver.com; "
    "connect-src 'self' https://api.openai.com "
        "https://api.anthropic.com wss: https:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply security headers on every response. Skips /healthz +
    /readyz (they're internal-only and kubernetes / Fly readers
    can be confused by aggressive CSP)."""

    def __init__(self, app, csp: Optional[str] = None):
        super().__init__(app)
        self.csp = csp or os.getenv("ECHO_CSP") or DEFAULT_CSP

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Skip health endpoints — they're consumed by infra
        if request.url.path in ("/healthz", "/readyz", "/version"):
            return response
        # HSTS: 1 year, include subdomains, preload-eligible
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload")
        response.headers.setdefault(
            "Content-Security-Policy", self.csp)
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(self), microphone=(self), camera=(self), "
            "payment=(), usb=(), interest-cohort=()")
        response.headers.setdefault(
            "Cross-Origin-Opener-Policy", "same-origin")
        return response


def install(app):
    """Wire the middleware into a FastAPI / Starlette app."""
    app.add_middleware(SecurityHeadersMiddleware)
