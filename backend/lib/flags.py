"""iter193 · FM-Upgrade 0 — Feature flag system.

Usage:
    from lib.flags import is_enabled, set_flag
    if is_enabled("fm_upgrade_1"): ...
    set_flag("fm_upgrade_1", enabled=True, rollout_pct=25)

Flags live in MongoDB (`feature_flags` collection) so they can be toggled at
runtime without redeploying. Rollout is bucketed by a stable hash of the
`bucket_key` (usually user_id or tenant_id) so the same user always sees the
same state for a given flag at a given rollout %.
"""
from __future__ import annotations
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db():
    from database import db as _db
    return _db


def get_flag(name: str) -> Optional[Dict[str, Any]]:
    return _db().feature_flags.find_one({"name": name}, {"_id": 0})


def list_flags() -> list:
    return list(_db().feature_flags.find({}, {"_id": 0}).sort("name", 1))


def set_flag(name: str, *, enabled: bool | None = None, rollout_pct: int | None = None,
             description: str | None = None, allow_list: list[str] | None = None,
             deny_list: list[str] | None = None, actor: str = "system") -> Dict[str, Any]:
    """Create or update a flag. Omit fields to leave them unchanged."""
    existing = get_flag(name) or {
        "name": name, "enabled": False, "rollout_pct": 0,
        "description": "", "allow_list": [], "deny_list": [],
        "created_at": _now_iso(),
    }
    if enabled is not None: existing["enabled"] = bool(enabled)
    if rollout_pct is not None: existing["rollout_pct"] = max(0, min(100, int(rollout_pct)))
    if description is not None: existing["description"] = description
    if allow_list is not None: existing["allow_list"] = list(allow_list)
    if deny_list is not None: existing["deny_list"] = list(deny_list)
    existing["updated_at"] = _now_iso()
    existing["updated_by"] = actor
    _db().feature_flags.update_one({"name": name}, {"$set": existing}, upsert=True)
    existing.pop("_id", None)
    return existing


def is_enabled(name: str, bucket_key: str | None = None, default: bool = False) -> bool:
    """Resolve whether the flag is ON for the given bucket.

    Logic order:
      1. If flag doesn't exist → return `default`
      2. If bucket_key in deny_list → False
      3. If bucket_key in allow_list → True
      4. If enabled=False → False
      5. If rollout_pct >= 100 → True
      6. If bucket_key None and rollout_pct < 100 → False (can't bucket anon users)
      7. Otherwise → hash(bucket_key + name) % 100 < rollout_pct
    """
    f = get_flag(name)
    if not f: return default
    if bucket_key and bucket_key in (f.get("deny_list") or []): return False
    if bucket_key and bucket_key in (f.get("allow_list") or []): return True
    if not f.get("enabled"): return False
    pct = int(f.get("rollout_pct") or 0)
    if pct >= 100: return True
    if pct <= 0: return False
    if not bucket_key: return False
    h = int(hashlib.sha1(f"{bucket_key}:{name}".encode()).hexdigest()[:8], 16)
    return (h % 100) < pct
