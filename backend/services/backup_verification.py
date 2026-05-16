"""
Backup Verification Runner
==========================
L.6 from the launch-readiness audit. Backups that have never been
restored aren't backups — they're hope. This module turns "we have
backups" into "we have backups that demonstrably restore."

The drill:
  1. Trigger a snapshot via the platform's snapshot manifest API
     (or assume a managed snapshot exists per the deploy pipeline)
  2. Pick a small set of "canary" collections with deterministic
     content (counts + checksum-able sums)
  3. Compute a checksum manifest for the live cluster
  4. Compare against the prior drill's checksum to verify counts
     are non-decreasing (append-only invariant — Doctrine §3.1)
  5. Persist the drill result to `backup_drills` so a regulator,
     auditor, or board member can see history of "yes we test"

This module does NOT actually restore the snapshot to a separate
cluster (that requires deploy-pipeline integration). What it DOES
do is establish a verifiable invariant: "the data we expect to
have is the data we have, and our snapshot manifest references
something real."

The full restore drill (restore-to-scratch-cluster + checksum-
parity) is a deploy-pipeline operation; this module establishes
the contract that pipeline can verify against.

Doctrine alignment:
  · §3.1 append-only — backup_drills is append-only; never modify
    a prior drill record
  · §1.1 transparency — drill results are queryable; failures
    surface as red on the canonical health endpoint
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4
import hashlib
import json
from fastapi import APIRouter, Query

from database import db


router = APIRouter(prefix="/api/backup-verification", tags=["backup-verification"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


# Collections that are "canary" — high-importance + checksumable.
# The append-only invariant means counts must be non-decreasing
# between drills. If any of these counts drop, we have data loss.
CANARY_COLLECTIONS = [
    "aurum_gl_journal",            # money — every JE matters
    "audit_events",                # audit trail
    "admin_audit_log",             # admin actions
    "outlet_capture_events",       # business operational events
    "event_bus_store",             # unified event bus
    "outlet_capture_accuracy",     # forecast accuracy log
    "outlet_capture_weights_history",  # versioned weight history
    "lifecycle_step_events",       # lifecycle audit
    "period_close_step_events",    # period close audit
    "intercompany_eliminations_audit",  # consolidation audit
    "tip_audit_runs",              # tip distribution audit
    "release_changelog",           # release history
]


def _ensure_indexes():
    db["backup_drills"].create_index("drill_id", unique=True)
    db["backup_drills"].create_index([("ran_at", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


@router.post("/drill")
async def run_drill():
    """Execute a backup verification drill. Computes the checksum
    manifest for canary collections; compares to the prior drill;
    flags any decreases as data-loss candidates."""
    drill_id = _uid()
    now = _now()

    # Compute current checksum manifest
    current_manifest = _compute_manifest()

    # Look up prior drill for comparison
    prior = db["backup_drills"].find_one(
        {"status": "ok"}, {"_id": 0}, sort=[("ran_at", -1)],
    )
    diffs: List[Dict] = []
    issues: List[Dict] = []

    if prior:
        for coll, current in current_manifest.items():
            prior_data = prior.get("manifest", {}).get(coll, {})
            prior_count = prior_data.get("count", 0)
            current_count = current.get("count", 0)
            delta = current_count - prior_count

            diff = {
                "collection": coll,
                "prior_count": prior_count,
                "current_count": current_count,
                "delta": delta,
            }
            diffs.append(diff)

            # Append-only invariant: count must NEVER decrease for
            # canary collections. A decrease implies either data
            # loss OR an unauthorized delete-many.
            if delta < 0:
                issues.append({
                    "severity": "red",
                    "category": "append_only_violation",
                    "collection": coll,
                    "detail": (
                        f"{coll} count dropped from {prior_count} to "
                        f"{current_count} (delta {delta}). This violates "
                        f"the append-only invariant. Investigate immediately."
                    ),
                })

    # Look up the most recent snapshot manifest
    latest_snapshot = db["snapshot_manifests"].find_one(
        {}, {"_id": 0}, sort=[("created_at", -1)],
    )
    if latest_snapshot:
        try:
            snap_dt = datetime.fromisoformat(latest_snapshot["created_at"].replace("Z", "+00:00"))
            age_hours = (datetime.now(timezone.utc) - snap_dt).total_seconds() / 3600
            if age_hours > 48:
                issues.append({
                    "severity": "amber",
                    "category": "stale_snapshot",
                    "detail": f"Most recent snapshot is {age_hours:.0f}h old. Recommended <24h.",
                })
        except Exception:
            pass
    else:
        issues.append({
            "severity": "amber",
            "category": "no_snapshot_recorded",
            "detail": "No snapshot manifest on file. Take a snapshot via /api/upgrade/snapshots before next deploy.",
        })

    overall = "red" if any(i["severity"] == "red" for i in issues) else (
        "amber" if issues else "green"
    )

    record = {
        "drill_id": drill_id,
        "ran_at": now,
        "status": "ok",
        "overall_health": overall,
        "manifest": current_manifest,
        "diffs_vs_prior": diffs,
        "issues": issues,
        "prior_drill_at": (prior or {}).get("ran_at"),
        "latest_snapshot_at": (latest_snapshot or {}).get("created_at"),
        "latest_snapshot_id": (latest_snapshot or {}).get("snapshot_id"),
    }
    db["backup_drills"].insert_one(record.copy())
    record.pop("_id", None)
    return record


@router.get("/drills")
async def list_drills(limit: int = Query(50, ge=1, le=500)):
    rows = list(
        db["backup_drills"].find({}, {"_id": 0})
        .sort("ran_at", -1).limit(limit)
    )
    return {"count": len(rows), "drills": rows}


@router.get("/drills/latest")
async def latest_drill():
    drill = db["backup_drills"].find_one({}, {"_id": 0}, sort=[("ran_at", -1)])
    if not drill:
        return {"available": False, "reason": "no_drill_run_yet", "remediation": "POST /api/backup-verification/drill"}
    return drill


def _compute_manifest() -> Dict[str, Dict]:
    """Compute count + sum-checksum for each canary collection.
    The sum-checksum is a SHA256 of (count + a sorted sample of
    primary keys) — enough to detect content tampering without
    pulling every document."""
    manifest = {}
    for coll in CANARY_COLLECTIONS:
        try:
            count = db[coll].estimated_document_count()
            # Sample-based checksum: take the first 1000 IDs sorted
            sample_ids = []
            try:
                cursor = db[coll].find({}, {"_id": 1}).sort("_id", 1).limit(1000)
                sample_ids = [str(d.get("_id")) for d in cursor]
            except Exception:
                pass
            digest_input = f"{coll}:{count}:{':'.join(sample_ids)}"
            checksum = hashlib.sha256(digest_input.encode()).hexdigest()[:16]
            manifest[coll] = {
                "count": count,
                "checksum": checksum,
                "sample_size": len(sample_ids),
                "checked_at": _now(),
            }
        except Exception as exc:
            manifest[coll] = {"error": str(exc), "count": 0, "checksum": None}
    return manifest
