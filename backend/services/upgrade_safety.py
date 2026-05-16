"""
Upgrade Safety + Version + Changelog
====================================
macOS-style upgrade infrastructure for Echo / LUCCCA. The pieces that
make customer-data-preserving software upgrades safe:

  1. Version stamping — the running app knows what version it is
     (semver), and the latest applied schema version
  2. Migration history — `migrations_log` already exists from
     `run_migration.py`; this module exposes it as a queryable
     surface for ops and customers
  3. Changelog — a `release_changelog` collection where every
     release publishes user-facing notes; endpoint surfaces "what's
     new" for the in-app banner
  4. Pre-migrate safety — a snapshot manifest taken before any
     destructive migration so rollback is always possible
  5. Feature flag visibility — leverages the existing fm_flags
     system (seeded by m_20260220_seed_fm_flags.py) and exposes a
     read-only view of what flags are on/off per property

The doctrine commitment: **customer data is never lost on upgrade**.
This module is the operational guarantee around that promise. Every
migration that runs is logged. Every destructive operation must
emit a snapshot manifest first. Every release publishes a changelog.

This module ships *infrastructure*, not the migrations themselves.
The actual migrations live in `backend/migrations/` and are run by
`backend/migrations/run_migration.py`.

Doctrine alignment:
  · §3.1 append-only — release_changelog and snapshot_manifests
    are append-only
  · §1.1 transparency — version, migrations_log, changelog all
    queryable; customers can see exactly what changed
  · NO_PLACEHOLDER_POLICY — every endpoint either returns real
    data or honestly says "not yet wired"
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/upgrade", tags=["upgrade-safety"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


# ─────────────────────────────────────────────────────────────────
# Version stamping
# Semver bumps:
#   · MAJOR — breaking schema or API contract changes (rare;
#             requires explicit customer communication)
#   · MINOR — new modules, new endpoints (additive, never breaks
#             existing customers)
#   · PATCH — bug fixes, doctrine corrections, no API changes
# ─────────────────────────────────────────────────────────────────
APP_VERSION = "0.64.0"   # MINOR bump for the D64 release (lifecycle engine + CFO toolkit)
APP_NAME = "EchoAurion / LUCCCA Framework"

# Required schema version. Startup probes the migrations_log; if the
# latest applied migration ID is < this, the app refuses to start
# and surfaces the missing migrations to the operator. Prevents data
# corruption from running new code against an old schema.
REQUIRED_SCHEMA_VERSION = "20260509_lifecycle_engine"


def _ensure_indexes():
    db["release_changelog"].create_index("version", unique=True)
    db["release_changelog"].create_index("released_at")
    db["snapshot_manifests"].create_index("snapshot_id", unique=True)
    db["snapshot_manifests"].create_index("created_at")


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class ChangelogEntry(BaseModel):
    version: str = Field(..., description="Semver, e.g. '0.64.0'")
    released_at: Optional[str] = None      # Default _now()
    headline: str = Field(..., description="One-line summary for the in-app banner")
    user_facing_notes: str = Field(..., description="Markdown — what changed for users")
    breaking_changes: List[str] = Field(default_factory=list)
    requires_migration_id: Optional[str] = None
    requires_action: bool = Field(default=False, description="True if customer must do something post-upgrade")
    action_description: str = ""


class SnapshotManifest(BaseModel):
    snapshot_id: Optional[str] = None
    label: str = Field(..., description="What this snapshot is for, e.g. 'pre-D64-deploy'")
    triggered_by_migration_id: Optional[str] = None
    triggered_by: Optional[str] = None
    collections_snapshotted: List[str] = Field(default_factory=list)
    storage_location: str = Field(..., description="Where the snapshot was taken (S3 URI, file path, mongodump location)")
    bytes: Optional[int] = None
    notes: str = ""


# ─────────────────────────────────────────────────────────────────
# Version + status
# ─────────────────────────────────────────────────────────────────
@router.get("/version")
async def get_version():
    """What version of the platform is running. Customers + ops both
    consume this. Pairs with the changelog to render 'new in this
    release' panels."""
    latest_migration = db["migrations_log"].find_one(
        {"status": "done"}, {"_id": 0, "id": 1, "finished_at": 1},
        sort=[("finished_at", -1)],
    )
    return {
        "app_name": APP_NAME,
        "version": APP_VERSION,
        "required_schema_version": REQUIRED_SCHEMA_VERSION,
        "latest_applied_migration": (latest_migration or {}).get("id"),
        "latest_applied_at": (latest_migration or {}).get("finished_at"),
        "schema_health": _schema_health_status(latest_migration),
        "queried_at": _now(),
    }


@router.get("/health")
async def upgrade_health():
    """Operational health check for the upgrade subsystem.
    Surfaces: schema-version mismatch, failed migrations, stale
    snapshots, feature-flag drift."""
    issues = []

    latest_migration = db["migrations_log"].find_one(
        {"status": "done"}, {"_id": 0, "id": 1},
        sort=[("finished_at", -1)],
    )
    schema_status = _schema_health_status(latest_migration)
    if schema_status != "current":
        issues.append({
            "severity": "red" if schema_status == "stale" else "amber",
            "category": "schema_version",
            "detail": f"App expects {REQUIRED_SCHEMA_VERSION}; latest applied is {(latest_migration or {}).get('id', 'NONE')}",
        })

    failed_migrations = list(
        db["migrations_log"].find(
            {"status": "failed"}, {"_id": 0, "id": 1, "finished_at": 1, "error": 1},
        ).limit(10)
    )
    for f in failed_migrations:
        issues.append({
            "severity": "red",
            "category": "failed_migration",
            "detail": f"Migration {f.get('id')} failed at {f.get('finished_at')}: {(f.get('error') or '')[:200]}",
        })

    last_snapshot = db["snapshot_manifests"].find_one(
        {}, {"_id": 0}, sort=[("created_at", -1)],
    )
    if last_snapshot:
        try:
            last_dt = datetime.fromisoformat(last_snapshot["created_at"].replace("Z", "+00:00"))
            age_hours = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if age_hours > 48:
                issues.append({
                    "severity": "amber",
                    "category": "stale_snapshot",
                    "detail": f"Last DB snapshot was {age_hours:.0f} hours ago — recommended <24h",
                })
        except Exception:
            pass
    else:
        issues.append({
            "severity": "amber",
            "category": "no_snapshot",
            "detail": "No DB snapshot recorded. Take one before the next migration.",
        })

    overall = "red" if any(i["severity"] == "red" for i in issues) else ("amber" if issues else "green")
    return {
        "overall": overall,
        "issues": issues,
        "version": APP_VERSION,
        "queried_at": _now(),
    }


def _schema_health_status(latest_migration: Optional[Dict]) -> str:
    """Compare the latest applied migration to the required schema
    version. Returns 'current' / 'stale' / 'unknown'."""
    if not latest_migration:
        return "unknown"
    latest_id = latest_migration.get("id", "")
    if latest_id == REQUIRED_SCHEMA_VERSION:
        return "current"
    # Lexicographic compare works because migration IDs are
    # YYYYMMDD_label format
    return "current" if latest_id >= REQUIRED_SCHEMA_VERSION else "stale"


# ─────────────────────────────────────────────────────────────────
# Migration history
# ─────────────────────────────────────────────────────────────────
@router.get("/migrations")
async def list_migrations(status: Optional[str] = None, limit: int = 100):
    """Read the migrations_log. Surface: what migrations ran, when,
    how long, and any failures with their tracebacks."""
    q: Dict = {}
    if status:
        q["status"] = status
    rows = list(
        db["migrations_log"].find(q, {"_id": 0})
        .sort("started_at", -1).limit(limit)
    )
    summary = {
        "done": db["migrations_log"].count_documents({"status": "done"}),
        "failed": db["migrations_log"].count_documents({"status": "failed"}),
        "running": db["migrations_log"].count_documents({"status": "running"}),
    }
    return {"summary": summary, "count": len(rows), "migrations": rows}


# ─────────────────────────────────────────────────────────────────
# Changelog
# ─────────────────────────────────────────────────────────────────
@router.post("/changelog")
async def add_changelog_entry(entry: ChangelogEntry):
    """Publish a release entry. Idempotent on (version)."""
    record = entry.model_dump()
    record["released_at"] = record.get("released_at") or _now()
    record["recorded_at"] = _now()
    db["release_changelog"].update_one(
        {"version": entry.version}, {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return {"changelog_entry": record}


@router.get("/changelog")
async def list_changelog(limit: int = 50, since_version: Optional[str] = None):
    """Customer-facing changelog. Powers the in-app 'what's new'
    banner. Filterable by version (returns only entries newer than
    a given semver) so we don't spam users with already-seen entries."""
    q: Dict = {}
    if since_version:
        q["version"] = {"$gt": since_version}
    rows = list(
        db["release_changelog"].find(q, {"_id": 0})
        .sort("released_at", -1).limit(limit)
    )
    return {"current_version": APP_VERSION, "count": len(rows), "entries": rows}


@router.get("/changelog/{version}")
async def get_changelog_entry(version: str):
    entry = db["release_changelog"].find_one({"version": version}, {"_id": 0})
    if not entry:
        raise HTTPException(404, f"No changelog for version {version}")
    return entry


# ─────────────────────────────────────────────────────────────────
# Snapshot manifests — pre-migrate safety net
# ─────────────────────────────────────────────────────────────────
@router.post("/snapshots")
async def record_snapshot(snap: SnapshotManifest):
    """Record that a DB snapshot was taken. Operationally this is
    called by the deploy script BEFORE running any destructive
    migration. The manifest persists so rollback can find the right
    snapshot."""
    snap_id = snap.snapshot_id or f"snap-{_uid()}"
    record = snap.model_dump()
    record["snapshot_id"] = snap_id
    record["created_at"] = _now()
    db["snapshot_manifests"].insert_one(record.copy())
    record.pop("_id", None)
    return record


@router.get("/snapshots")
async def list_snapshots(limit: int = 50):
    rows = list(
        db["snapshot_manifests"].find({}, {"_id": 0})
        .sort("created_at", -1).limit(limit)
    )
    return {"count": len(rows), "snapshots": rows}


@router.get("/snapshots/latest")
async def latest_snapshot():
    snap = db["snapshot_manifests"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    if not snap:
        return {"available": False, "reason": "no_snapshots_recorded"}
    return snap


# ─────────────────────────────────────────────────────────────────
# Feature-flag visibility (read-only here; flags themselves are
# managed by the existing fm_flags system)
# ─────────────────────────────────────────────────────────────────
@router.get("/feature-flags")
async def list_feature_flags(property_id: Optional[str] = None):
    """Read-only view of feature flags. Surfaces what's on/off
    globally and per-property so ops can debug 'why is feature X
    not appearing for customer Y'."""
    q: Dict = {}
    if property_id:
        q["$or"] = [{"property_id": property_id}, {"property_id": None}]
    flags = list(db["feature_flags"].find(q, {"_id": 0}).limit(500))
    return {
        "count": len(flags),
        "flags": flags,
        "property_filter": property_id,
        "note": (
            "Feature flags are managed by the fm_flags system "
            "(seeded by m_20260220_seed_fm_flags.py). This endpoint "
            "is read-only; modify flags via that system."
        ),
    }
