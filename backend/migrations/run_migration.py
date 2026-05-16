"""iter193 · FM-Upgrade 0 — Idempotent, resumable migration runner.

Usage:
    python backend/migrations/run_migration.py --list
    python backend/migrations/run_migration.py <migration_id> [--dry-run] [--batch-size=500] [--resume]

Each migration is a file `backend/migrations/m_<id>.py` exposing:
    ID         : str               # e.g. "20260220_recipe_graph_backfill"
    DESCRIPTION: str
    def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print) -> dict
    def rollback(db, *, dry_run=False, logger=print) -> dict   # optional

State is tracked in the `migrations_log` collection:
    { id, status: running|done|failed, started_at, finished_at,
      checkpoint: {...}, counts: {...}, error?: str }

Resumability: migrations must read `checkpoint` from the latest log row
and continue from there, updating the log row every `batch_size` docs.
"""
from __future__ import annotations
import argparse
import importlib
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Make `backend` importable whether run from /app or /app/backend
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load backend/.env BEFORE any database import so MONGO_URL is populated
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:
    pass


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()


def _discover() -> list[tuple[str, object]]:
    here = Path(__file__).parent
    mods = []
    for f in sorted(here.glob("m_*.py")):
        name = f.stem
        mod = importlib.import_module(f"migrations.{name}")
        mid = getattr(mod, "ID", name)
        mods.append((mid, mod))
    return mods


def _load(mid: str) -> object | None:
    for found_id, mod in _discover():
        if found_id == mid: return mod
    return None


def _log(db, rec: dict):
    db.migrations_log.insert_one(rec)


def _update_log(db, log_id: str, **patch):
    db.migrations_log.update_one({"_log_id": log_id}, {"$set": patch})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("migration_id", nargs="?", help="migration id (omit with --list)")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--batch-size", type=int, default=500)
    ap.add_argument("--resume", action="store_true", default=True)
    ap.add_argument("--rollback", action="store_true")
    args = ap.parse_args()

    if args.list:
        mods = _discover()
        if not mods:
            print("No migrations found in backend/migrations/")
            return 0
        print(f"{len(mods)} migrations:")
        for mid, mod in mods:
            print(f"  • {mid}  —  {getattr(mod, 'DESCRIPTION', '(no description)')}")
        return 0

    if not args.migration_id:
        ap.print_help(); return 1

    mod = _load(args.migration_id)
    if not mod:
        print(f"ERROR: migration '{args.migration_id}' not found. Use --list.")
        return 2

    from database import db as _db

    log_id = f"{args.migration_id}:{_now_iso()}"
    rec = {
        "_log_id": log_id,
        "migration_id": args.migration_id,
        "status": "running",
        "mode": "rollback" if args.rollback else "forward",
        "dry_run": bool(args.dry_run),
        "batch_size": int(args.batch_size),
        "started_at": _now_iso(),
        "checkpoint": {},
        "counts": {},
    }
    _log(_db, rec)

    try:
        func = getattr(mod, "rollback", None) if args.rollback else getattr(mod, "forward", None)
        if not func:
            print(f"ERROR: migration has no {'rollback' if args.rollback else 'forward'} function")
            return 3
        result = func(
            _db,
            dry_run=args.dry_run,
            batch_size=args.batch_size,
            resume=args.resume,
            logger=lambda msg: (print(msg), _update_log(_db, log_id, last_log=str(msg)[:500])),
        ) or {}
        _update_log(_db, log_id, status="done", finished_at=_now_iso(),
                    counts=result.get("counts", {}), checkpoint=result.get("checkpoint", {}))
        print(f"✓ {args.migration_id} {'(dry-run)' if args.dry_run else ''} done: {result.get('counts', {})}")
        return 0
    except Exception as e:
        _update_log(_db, log_id, status="failed", finished_at=_now_iso(),
                    error=f"{e.__class__.__name__}: {e}", traceback=traceback.format_exc()[-2000:])
        print(f"✗ {args.migration_id} FAILED: {e}")
        traceback.print_exc()
        return 4


if __name__ == "__main__":
    sys.exit(main())
