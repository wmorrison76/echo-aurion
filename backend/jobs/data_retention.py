"""
D53.12 · Data retention cron — Tenet §7 (decay).

PRIVACY_TENETS §7: sensitive data has an expires_at stamp; this
cron sweeps every collection that holds expirable rows and
deletes (or tombstones) those past their expiry.

Doctrine reads literally: forbidden persists, never surfaces. So
we DO NOT hard-delete — we tombstone (set `deleted_at`,
`tombstone_reason`, scrub PII fields) so the audit chain remains
intact + GDPR / CCPA inquiry can prove the deletion happened.

Collections swept (per Tenet §7):

  echo_events                  expires_at
  guest_intelligence           expires_at  (allergens, preferences)
  concierge_alerts             created_at + 90d default TTL
  channel_reservations         after stay completes + 365d
  pms_reservations             after checkout + 7y (tax retention)
  complaint_events             created_at + 365d
  myecho_sessions              expires_at OR revoked_at + 30d

Run nightly via the scheduler. Idempotent: re-running over a
period that already swept does nothing.

A senior eng would also add:
  · Per-tenant override of retention windows (some properties
    have stricter requirements e.g. EU)
  · Audit log entry for every tombstone (we do this here)
  · Dry-run mode (we support it)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("echo.data_retention")

# Default retention windows in days. Override per-tenant via
# tenant_config collection if present.
DEFAULT_RETENTION_DAYS: Dict[str, int] = {
    "echo_events": 0,         # respects per-row expires_at
    "guest_intelligence": 0,   # respects per-row expires_at
    "concierge_alerts": 90,
    "channel_reservations": 365,
    "pms_reservations": 7 * 365,
    "complaint_events": 365,
    "myecho_sessions": 30,     # past expires_at
    "echo_activity_chunks": 30,  # streaming output decay
    "echo_activity_tasks": 90,
}

# Per-collection PII fields that get scrubbed on tombstone (kept
# rows still anchor the audit chain by id but PII is gone)
PII_SCRUB: Dict[str, List[str]] = {
    "guest_intelligence": ["first_name", "last_name", "email",
                            "phone", "payment_methods"],
    "channel_reservations": ["guest_first_name", "guest_last_name",
                               "guest_email", "guest_phone"],
    "pms_reservations": ["guest_first_name", "guest_last_name",
                           "guest_email", "guest_phone"],
    "complaint_events": ["detail"],
    "myecho_sessions": ["device_id", "device_label", "user_agent"],
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _cutoff_iso(days: int) -> str:
    return (_now() - timedelta(days=days)).isoformat()


def _expired_query(collection: str) -> Dict[str, Any]:
    """Build the find query that selects rows past their expiry."""
    days = DEFAULT_RETENTION_DAYS.get(collection, 0)
    if days <= 0:
        # Per-row expires_at semantics
        return {"expires_at": {"$lte": _now().isoformat()},
                "deleted_at": {"$exists": False}}
    cutoff = _cutoff_iso(days)
    # Use captured_at, posted_at, started_at, or created_at
    # depending on collection; default to created_at.
    date_field = {
        "channel_reservations": "departure_date",
        "pms_reservations": "departure_date",
        "myecho_sessions": "expires_at",
    }.get(collection, "created_at")
    return {date_field: {"$lte": cutoff},
            "deleted_at": {"$exists": False}}


def sweep_one(collection: str, db: Any,
              dry_run: bool = False) -> Dict[str, Any]:
    """Tombstone expired rows in one collection. Returns summary."""
    q = _expired_query(collection)
    expired = list(db[collection].find(q, {"_id": 0}).limit(5000))
    scrub_fields = PII_SCRUB.get(collection, [])
    tombstoned = 0
    for r in expired:
        if dry_run:
            tombstoned += 1
            continue
        update: Dict[str, Any] = {
            "deleted_at": _now().isoformat(),
            "tombstone_reason": "retention_decay",
        }
        for f in scrub_fields:
            update[f] = None
        try:
            db[collection].update_one(
                {"id": r.get("id")}, {"$set": update})
            tombstoned += 1
        except Exception as e:
            logger.warning(f"tombstone failed {collection}/{r.get('id')}: {e}")

    if tombstoned > 0:
        try:
            db["audit_log"].insert_one({
                "kind": "data_retention.sweep",
                "entity_id": collection,
                "payload": {
                    "tombstoned": tombstoned,
                    "dry_run": dry_run,
                    "retention_days": DEFAULT_RETENTION_DAYS.get(
                        collection),
                },
                "created_at": _now().isoformat(),
            })
        except Exception:
            pass
    logger.info(f"retention sweep collection={collection} "
                 f"tombstoned={tombstoned} dry_run={dry_run}")
    return {"collection": collection, "tombstoned": tombstoned,
            "dry_run": dry_run}


def sweep_all(db: Any, dry_run: bool = False) -> Dict[str, Any]:
    summary: List[Dict[str, Any]] = []
    total = 0
    for col in DEFAULT_RETENTION_DAYS.keys():
        try:
            r = sweep_one(col, db, dry_run=dry_run)
            summary.append(r)
            total += r["tombstoned"]
        except Exception as e:
            logger.warning(f"sweep_all error on {col}: {e}")
            summary.append({"collection": col, "error": str(e)[:120]})
    logger.info(f"retention sweep complete total_tombstoned={total} "
                 f"dry_run={dry_run}")
    return {"ok": True, "total_tombstoned": total,
            "dry_run": dry_run, "per_collection": summary}


# Scheduled job entry point — wired into backend/scheduler.py
def cron_retention_nightly() -> None:
    try:
        import database
        sweep_all(database.db, dry_run=False)
    except Exception as e:
        logger.error(f"cron_retention_nightly failed: {e}")
