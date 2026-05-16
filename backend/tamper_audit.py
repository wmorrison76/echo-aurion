"""
LUCCCA Tamper-Evident Audit System
====================================
Hash-chained audit log with:
- SHA-256 chain (each entry's hash includes previous hash)
- Entity-level timeline view
- Actor tracking
- Change diffing
- Compliance reporting
- Chain verification

Addresses MF-010 from the enterprise evaluation.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
import hashlib
import json
from database import db

tamper_audit_col = db["tamper_evident_audit"]
tamper_audit_col.create_index([("timestamp", -1)])
tamper_audit_col.create_index("entity_type")
tamper_audit_col.create_index([("entity_type", 1), ("entity_id", 1)])
tamper_audit_col.create_index("actor_id")
tamper_audit_col.create_index("chain_position")


def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()


def _compute_hash(data: dict, previous_hash: str) -> str:
    raw = json.dumps(data, sort_keys=True, default=str) + previous_hash
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# WRITE AUDIT ENTRY (hash-chained)
# ---------------------------------------------------------------------------
def log_entry(event_type: str, entity_type: str, entity_id: str,
              actor_id: str, changes: dict = None, previous_state: dict = None,
              new_state: dict = None, metadata: dict = None) -> dict:
    # Get the last entry's hash for chaining
    last = tamper_audit_col.find_one({}, {"current_hash": 1}, sort=[("chain_position", -1)])
    prev_hash = last["current_hash"] if last else "GENESIS"

    chain_pos = (last.get("chain_position", 0) if last else 0) + 1

    entry_data = {
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "actor_id": actor_id,
        "timestamp": _now(),
        "chain_position": chain_pos,
    }
    current_hash = _compute_hash(entry_data, prev_hash)

    doc = {
        "id": _uid(),
        **entry_data,
        "changes": changes or {},
        "previous_state": previous_state,
        "new_state": new_state,
        "metadata": metadata or {},
        "previous_hash": prev_hash,
        "current_hash": current_hash,
    }
    tamper_audit_col.insert_one(doc)
    del doc["_id"]
    return doc


# ---------------------------------------------------------------------------
# QUERY
# ---------------------------------------------------------------------------
def get_entity_timeline(entity_type: str, entity_id: str, limit: int = 100) -> list:
    return list(tamper_audit_col.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit))


def get_actor_history(actor_id: str, limit: int = 100) -> list:
    return list(tamper_audit_col.find(
        {"actor_id": actor_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit))


def get_recent(limit: int = 50, event_type: str = None) -> list:
    q = {}
    if event_type:
        q["event_type"] = event_type
    return list(tamper_audit_col.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))


# ---------------------------------------------------------------------------
# CHAIN VERIFICATION
# ---------------------------------------------------------------------------
def verify_chain(limit: int = 1000) -> dict:
    """Verify the hash chain integrity. Returns any broken links."""
    entries = list(tamper_audit_col.find(
        {}, {"_id": 0}
    ).sort("chain_position", 1).limit(limit))

    if not entries:
        return {"status": "empty", "verified": 0, "broken": []}

    broken = []
    verified = 0
    prev_hash = "GENESIS"

    for entry in entries:
        entry_data = {
            "event_type": entry["event_type"],
            "entity_type": entry["entity_type"],
            "entity_id": entry["entity_id"],
            "actor_id": entry["actor_id"],
            "timestamp": entry["timestamp"],
            "chain_position": entry["chain_position"],
        }
        expected = _compute_hash(entry_data, prev_hash)

        if entry.get("previous_hash") != prev_hash:
            broken.append({
                "chain_position": entry["chain_position"],
                "issue": "previous_hash_mismatch",
                "expected": prev_hash,
                "found": entry.get("previous_hash"),
            })
        elif entry.get("current_hash") != expected:
            broken.append({
                "chain_position": entry["chain_position"],
                "issue": "current_hash_invalid",
                "expected": expected,
                "found": entry.get("current_hash"),
            })
        else:
            verified += 1

        prev_hash = entry.get("current_hash", "")

    return {
        "status": "intact" if not broken else "TAMPERED",
        "verified": verified,
        "total_checked": len(entries),
        "broken_links": broken,
        "chain_head": entries[-1].get("current_hash") if entries else None,
    }


# ---------------------------------------------------------------------------
# COMPLIANCE REPORT
# ---------------------------------------------------------------------------
def compliance_report(days: int = 30) -> dict:
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    total = tamper_audit_col.count_documents({"timestamp": {"$gte": cutoff}})

    # By event type
    pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_type = {r["_id"]: r["count"] for r in tamper_audit_col.aggregate(pipeline)}

    # By entity type
    pipeline2 = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$entity_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_entity = {r["_id"]: r["count"] for r in tamper_audit_col.aggregate(pipeline2)}

    # Unique actors
    actors = tamper_audit_col.distinct("actor_id", {"timestamp": {"$gte": cutoff}})

    chain = verify_chain()

    return {
        "period_days": days,
        "total_entries": total,
        "by_event_type": by_type,
        "by_entity_type": by_entity,
        "unique_actors": len(actors),
        "chain_integrity": chain["status"],
        "chain_verified": chain["verified"],
        "generated_at": _now(),
    }


def get_audit_stats() -> dict:
    total = tamper_audit_col.count_documents({})
    chain = verify_chain(100)
    return {
        "total_entries": total,
        "chain_status": chain["status"],
        "chain_verified": chain["verified"],
        "engine": "tamper_audit",
        "status": "healthy",
        "timestamp": _now(),
    }
