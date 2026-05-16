"""iter210 · Shared UTC time helpers (audit recommendation BE-4).

Before: `datetime.now(timezone.utc).isoformat()` was copy-pasted 400+ times
across routes. Many files additionally redeclared `_now = lambda: ...`.

After: `from lib.time import utcnow_iso, utcnow`.
"""
from __future__ import annotations
from datetime import datetime, timezone

__all__ = ["utcnow", "utcnow_iso"]


def utcnow() -> datetime:
    """Aware UTC datetime — prefer over `datetime.utcnow()` (which is naive)."""
    return datetime.now(timezone.utc)


def utcnow_iso() -> str:
    """ISO-8601 UTC timestamp string, e.g. '2026-04-22T17:30:00.123456+00:00'."""
    return utcnow().isoformat()
