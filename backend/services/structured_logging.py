"""
Structured Logging Middleware
==============================
L.2 from the launch-readiness audit. Tags every request with:
  · request_id     — unique per HTTP request (UUID)
  · trace_id       — propagated from upstream if present, else generated
  · tenant_id      — extracted from auth context when available
  · actor_id       — the principal making the request
  · path / method  — for grouping
  · duration_ms    — measured by the middleware

All structured-log lines are JSON, single-line, with the canonical
field set above. Goes to stdout where the platform's log aggregator
(Datadog, Loki, CloudWatch) picks it up.

Doctrine alignment:
  · §1.1 transparency — every log line is correlatable; no hidden
    request paths
  · Privacy Tenet 4 — never logs trust_scores or tone signals
  · §3.1 append-only — log-line history is immutable by definition
"""
from __future__ import annotations
import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional, Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


# Context vars propagated through the request-handling code
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="default")
actor_id_var: ContextVar[str] = ContextVar("actor_id", default="anonymous")


REDACT_HEADERS = {"authorization", "cookie", "x-api-key", "x-anthropic-api-key"}
REDACT_QUERY_KEYS = {"token", "key", "secret", "password", "code"}


class JSONLogFormatter(logging.Formatter):
    """Emits every log record as a single-line JSON document. Enriches
    the record with request_id, trace_id, tenant_id, actor_id pulled
    from context vars so anywhere the app calls logger.info() the
    line is correlatable."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get() or None,
            "trace_id": trace_id_var.get() or None,
            "tenant_id": tenant_id_var.get(),
            "actor_id": actor_id_var.get(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        if hasattr(record, "extra_fields"):
            payload.update(record.extra_fields)
        return json.dumps(payload, default=str, separators=(",", ":"))


def configure_structured_logging(level: str = "INFO") -> None:
    """Replace the root logger's handler with a JSON formatter.
    Idempotent — calling twice is harmless."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONLogFormatter())
    handler.setLevel(level)

    root = logging.getLogger()
    # Remove prior handlers that don't emit JSON
    for h in list(root.handlers):
        if not isinstance(h.formatter, JSONLogFormatter):
            root.removeHandler(h)
    if not any(isinstance(h.formatter, JSONLogFormatter) for h in root.handlers):
        root.addHandler(handler)
    root.setLevel(level)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Per-request logging + ID propagation. Add to FastAPI via:

        app.add_middleware(RequestLoggingMiddleware)

    Emits two log lines per request: 'request.start' and 'request.end'.
    The end line includes duration_ms + status_code so SLO and latency
    dashboards have the data."""

    def __init__(self, app, *, logger_name: str = "echo.http"):
        super().__init__(app)
        self.logger = logging.getLogger(logger_name)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        trace_id = request.headers.get("x-trace-id") or request_id
        request_id_var.set(request_id)
        trace_id_var.set(trace_id)

        # Best-effort tenant + actor extraction; auth middleware is
        # source of truth, but we capture what we can
        tenant_id = request.headers.get("x-tenant-id", "default")
        tenant_id_var.set(tenant_id)
        actor_id = request.headers.get("x-actor-id", "anonymous")
        actor_id_var.set(actor_id)

        start_ns = time.monotonic_ns()
        self.logger.info("request.start", extra={"extra_fields": {
            "method": request.method,
            "path": request.url.path,
            "query": _scrub_query(dict(request.query_params)),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }})

        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["x-request-id"] = request_id
            response.headers["x-trace-id"] = trace_id
            return response
        except Exception as exc:
            self.logger.exception("request.exception", extra={"extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "exception_type": exc.__class__.__name__,
            }})
            raise
        finally:
            duration_ms = (time.monotonic_ns() - start_ns) / 1_000_000
            self.logger.info("request.end", extra={"extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
            }})


def _scrub_query(params: dict) -> dict:
    """Replace any sensitive query-param values with REDACTED."""
    return {
        k: ("REDACTED" if k.lower() in REDACT_QUERY_KEYS else v)
        for k, v in params.items()
    }
