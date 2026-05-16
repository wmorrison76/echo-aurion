"""
D53.10 · Structured logging.

Replace plain text logging with single-line JSON so the SRE can
grep + filter + ship to ELK / Datadog / Splunk.

Usage at module top:

    from lib.structured_logging import get_logger
    logger = get_logger(__name__)

    logger.info("order_created", extra={
        "order_id": oid, "outlet_id": "o-1", "tenant_id": "t1"
    })

Output (one line per record):

    {"ts":"2026-05-07T12:00:00Z","level":"INFO",
     "logger":"echo.commissary","msg":"order_created",
     "order_id":"abc","outlet_id":"o-1","tenant_id":"t1"}

Doctrine alignment

  · §1.4 voice register: this logger never auto-includes user PII.
    Caller chooses what to put in extra={}.
  · Tenet 8 forbidden never persists: callers must NOT pass PII
    fields to the logger; the formatter does NOT redact.
  · Sentry init still runs; this is the local stdout structured
    formatter.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict


# Reserved attrs we never include in the JSON payload
_RESERVED = {
    "name", "msg", "args", "levelname", "levelno", "pathname",
    "filename", "module", "exc_info", "exc_text", "stack_info",
    "lineno", "funcName", "created", "msecs", "relativeCreated",
    "thread", "threadName", "processName", "process", "message",
    "taskName",
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        out: Dict[str, Any] = {
            "ts": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Pull caller-supplied extras
        for k, v in record.__dict__.items():
            if k in _RESERVED:
                continue
            if k.startswith("_"):
                continue
            try:
                json.dumps(v)
                out[k] = v
            except (TypeError, ValueError):
                out[k] = str(v)
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        return json.dumps(out, default=str, ensure_ascii=False)


_configured = False


def configure() -> None:
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    # Don't double-format if pytest or sentry pre-installed handlers
    has_json = any(
        isinstance(h.formatter, JsonFormatter)
        for h in root.handlers if h.formatter)
    if not has_json:
        root.addHandler(handler)
    level = os.getenv("ECHO_LOG_LEVEL", "INFO").upper()
    root.setLevel(getattr(logging, level, logging.INFO))
    _configured = True


def get_logger(name: str) -> logging.Logger:
    if not _configured:
        configure()
    return logging.getLogger(name)
