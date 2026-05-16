"""iter194 · FM-Upgrade 1 — TimelineEvent emitter + query + recall engine.

Every state change in the system writes a TimelineEvent via `emit()`. This
collapses six capabilities into one primitive:
  1. Audit log  (who did what when to what, reversible via payload.before/after)
  2. FSMA 204 traceability graph  (CTEs + KDEs + <2 s forward/backward recall)
  3. Live activity feed  (for Echo + operators)
  4. Anomaly-detection training corpus (Echo learns from the stream)
  5. Cycle-time metrics  (time from type A → type B for an entity)
  6. SLA enforcement (hold times, expiry gates, etc.)

Emitter design goals:
  • Fail-soft — emission must never break the calling route. Any exception is
    swallowed and logged. Losing one event is better than dropping an order.
  • Idempotent — an optional `idempotency_key` prevents duplicates.
  • KDE-enforced — CTE events get KDE validation at write time.
"""
from __future__ import annotations
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Iterable, List, Optional

from lib.timeline_types import ALL_TYPES, CTE_TYPES, CTE_REQUIRED_KDES

log = logging.getLogger("timeline")


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()


def _db():
    from database import db as _d
    return _d


def _ensure_indexes_once():
    """Create indexes on first use. Idempotent — Mongo ignores existing."""
    global _IDX_DONE
    try:
        if _IDX_DONE: return
    except NameError:
        pass
    try:
        col = _db().timeline_events
        col.create_index([("type", 1), ("timestamp", -1)])
        col.create_index([("entity_refs.id", 1), ("timestamp", -1)])
        col.create_index([("actor.id", 1), ("timestamp", -1)])
        col.create_index([("idempotency_key", 1)], unique=True, sparse=True)
        # FSMA 204 fast-path — recall by TLC must be <2 s
        col.create_index([("payload.tlc", 1)])
        col.create_index([("payload.lot_id", 1)])
        globals()["_IDX_DONE"] = True
    except Exception as e:
        log.warning("timeline indexes: %s", e)


def emit(
    event_type: str,
    *,
    actor: Dict[str, Any] | None = None,
    entity_refs: Iterable[Dict[str, Any]] | None = None,
    payload: Dict[str, Any] | None = None,
    location: Dict[str, Any] | None = None,
    idempotency_key: str | None = None,
    tenant_id: str = "luccca",
) -> Optional[str]:
    """Write a TimelineEvent. Returns the event id, or None on failure.

    Any exception is swallowed — emission MUST NOT break the calling flow.
    """
    try:
        _ensure_indexes_once()
        if event_type not in ALL_TYPES:
            log.warning("timeline: unknown event type '%s' — emitting anyway", event_type)
        payload = dict(payload or {})
        # CTE enforcement: KDEs required
        if event_type in CTE_TYPES:
            missing = CTE_REQUIRED_KDES - set(payload.keys())
            if missing:
                # Log but still emit — better partial KDE than no audit
                log.warning("timeline: CTE '%s' missing KDEs %s — emitting anyway", event_type, sorted(missing))
                payload.setdefault("_kde_warning", sorted(missing))
        refs = [_normalize_ref(r) for r in (entity_refs or [])]
        # Drop refs without an id
        refs = [r for r in refs if r.get("id")]
        act = dict(actor or {"type": "system", "id": "system", "name": "system"})
        act.setdefault("type", "system")
        act.setdefault("id", "system")
        act.setdefault("name", str(act.get("id") or "system"))

        doc = {
            "type": event_type,
            "timestamp": _iso(),
            "actor": act,
            "entity_refs": refs,
            "payload": payload,
            "location": location,
            "tenant_id": tenant_id,
        }
        if idempotency_key:
            doc["idempotency_key"] = idempotency_key
            # Hash prefix to keep key-size sane
            doc["_idem_hash"] = hashlib.sha1(idempotency_key.encode()).hexdigest()[:16]

        try:
            result = _db().timeline_events.insert_one(doc.copy())
            return str(result.inserted_id)
        except Exception as e:
            # Likely idempotency dupe — silently skip
            msg = str(e).lower()
            if "duplicate key" in msg or "e11000" in msg:
                return None
            log.warning("timeline emit failed: %s", e)
            return None
    except Exception as e:
        log.warning("timeline emit crashed: %s", e)
        return None


def _normalize_ref(r: Any) -> Dict[str, Any]:
    """Accept either `(kind, id)` tuple, `{id, kind?, name?}` dict, or plain id str."""
    if isinstance(r, dict):
        return {"id": str(r.get("id")) if r.get("id") else None, "kind": r.get("kind") or "unknown", "name": r.get("name")}
    if isinstance(r, (tuple, list)) and len(r) >= 2:
        return {"kind": str(r[0]), "id": str(r[1])}
    if isinstance(r, str):
        return {"kind": "unknown", "id": r}
    return {}


def query(
    *,
    entity_id: str | None = None,
    entity_kind: str | None = None,
    event_types: List[str] | None = None,
    actor_id: str | None = None,
    from_ts: str | None = None,
    to_ts: str | None = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """Flexible timeline query. Omit filters for broad searches."""
    _ensure_indexes_once()
    q: Dict[str, Any] = {}
    if entity_id:
        q["entity_refs.id"] = entity_id
    if entity_kind and not entity_id:
        q["entity_refs.kind"] = entity_kind
    if event_types:
        q["type"] = {"$in": list(event_types)}
    if actor_id:
        q["actor.id"] = actor_id
    if from_ts or to_ts:
        q["timestamp"] = {}
        if from_ts: q["timestamp"]["$gte"] = from_ts
        if to_ts:   q["timestamp"]["$lte"] = to_ts
    limit = max(1, min(2000, int(limit)))
    return list(_db().timeline_events.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))


def recall(*, lot_id: str | None = None, tlc: str | None = None, pack_id: str | None = None,
           batch_id: str | None = None) -> Dict[str, Any]:
    """FSMA 204 mock-recall: forward + backward trace.

    Given any anchor (lot, TLC, pack, batch), find every:
      • backward: where this anchor came from — POs, vendors, receive CTEs
      • forward:  where this anchor went — batches that consumed it, packs made
                  from those batches, orders containing those packs, deliveries

    Returns a structured bundle suitable for FDA export AND a flat event list
    sorted chronologically for the activity feed.
    """
    _ensure_indexes_once()
    db = _db()
    out: Dict[str, Any] = {
        "anchor": {"lot_id": lot_id, "tlc": tlc, "pack_id": pack_id, "batch_id": batch_id},
        "generated_at": _iso(),
        "backward": {"pos": [], "lots": [], "receive_events": []},
        "forward":  {"batches": [], "packs": [], "orders": [], "deliveries": []},
        "events": [],
    }

    # Resolve anchor → lot_id (if caller gave tlc)
    resolved_lots: List[str] = []
    resolved_packs: List[str] = []
    if lot_id:
        resolved_lots.append(lot_id)
    if pack_id:
        resolved_packs.append(pack_id)
    if tlc:
        # Find any event that mentions this TLC (lot.received, pack.sealed, pack.delivered, etc.)
        tlc_evs = list(db.timeline_events.find(
            {"$or": [{"payload.tlc": tlc}, {"payload.tlcs": tlc}]}, {"_id": 0}
        ).limit(100))
        for e in tlc_evs:
            out["events"].append(e)
            for r in e.get("entity_refs", []):
                if r.get("kind") == "lot" and r.get("id"): resolved_lots.append(r["id"])
                if r.get("kind") == "pack" and r.get("id"): resolved_packs.append(r["id"])
        resolved_lots = list(set(resolved_lots))
        resolved_packs = list(set(resolved_packs))

    # Backward: look at lot_received events + the source PO
    for lid in resolved_lots:
        recv_evs = list(db.timeline_events.find(
            {"type": "lot.received", "entity_refs.id": lid}, {"_id": 0}
        ).limit(5))
        for e in recv_evs:
            out["backward"]["receive_events"].append(e)
            out["events"].append(e)
            po_id = e.get("payload", {}).get("po_id") or next(
                (r["id"] for r in e.get("entity_refs", []) if r.get("kind") == "purchase_order"), None
            )
            if po_id:
                po_doc = db.purchase_orders.find_one({"id": po_id}, {"_id": 0}) if hasattr(db, "purchase_orders") else None
                if po_doc: out["backward"]["pos"].append(po_doc)
        # Also look up the Lot doc itself if present
        lot_doc = db.lots.find_one({"id": lid}, {"_id": 0}) if hasattr(db, "lots") else None
        if lot_doc:
            out["backward"]["lots"].append(lot_doc)

    # Forward: every batch that consumed this lot
    consumed_evs = []
    for lid in resolved_lots:
        consumed_evs.extend(list(db.timeline_events.find(
            {"type": {"$in": ["batch.started", "lot.transformed"]},
             "$or": [{"payload.lot_id": lid}, {"payload.lots_consumed": {"$elemMatch": {"lot_id": lid}}}]},
            {"_id": 0}
        ).limit(200)))
    for e in consumed_evs:
        out["events"].append(e)
        for r in e.get("entity_refs", []):
            if r.get("kind") == "batch" and r.get("id"):
                out["forward"]["batches"].append({"batch_id": r["id"], "event": e["type"], "at": e["timestamp"]})

    batch_ids = list({b["batch_id"] for b in out["forward"]["batches"]})
    if batch_id and batch_id not in batch_ids:
        batch_ids.append(batch_id)
    # Pack events from those batches
    for bid in batch_ids:
        pack_evs = list(db.timeline_events.find(
            {"type": {"$in": ["pack.sealed", "pack.labeled", "pack.delivered"]},
             "entity_refs.id": bid}, {"_id": 0}
        ).limit(500))
        for e in pack_evs:
            out["events"].append(e)
            for r in e.get("entity_refs", []):
                if r.get("kind") == "pack" and r.get("id"):
                    out["forward"]["packs"].append({"pack_id": r["id"], "event": e["type"], "at": e["timestamp"]})

    pack_ids = list({p["pack_id"] for p in out["forward"]["packs"]})
    if pack_id and pack_id not in pack_ids:
        pack_ids.append(pack_id)
    # Also include resolved_packs from the TLC lookup
    for rp in resolved_packs:
        if rp not in pack_ids:
            pack_ids.append(rp)
    # Pull every event for each resolved pack — captures pack.sealed/delivered/etc
    for pid in pack_ids:
        pack_evs = list(db.timeline_events.find(
            {"entity_refs.id": pid}, {"_id": 0}
        ).limit(100))
        for e in pack_evs:
            out["events"].append(e)
            # Also harvest order refs from pack events
            for r in e.get("entity_refs", []):
                if r.get("kind") == "order" and r.get("id"):
                    out["forward"]["orders"].append({"order_id": r["id"], "event": e["type"], "at": e["timestamp"]})
    # Orders containing those packs
    for pid in pack_ids:
        order_evs = list(db.timeline_events.find(
            {"type": {"$in": ["order.placed", "pack.delivered"]},
             "entity_refs.id": pid}, {"_id": 0}
        ).limit(200))
        for e in order_evs:
            out["events"].append(e)
            for r in e.get("entity_refs", []):
                if r.get("kind") == "order" and r.get("id"):
                    out["forward"]["orders"].append({"order_id": r["id"], "event": e["type"], "at": e["timestamp"]})

    # Dedupe + sort events chronologically
    seen = set()
    deduped = []
    for e in sorted(out["events"], key=lambda x: x.get("timestamp") or ""):
        key = (e.get("type"), e.get("timestamp"), tuple(sorted((r.get("kind"), r.get("id")) for r in e.get("entity_refs", [])))[:4])
        if key in seen: continue
        seen.add(key); deduped.append(e)
    out["events"] = deduped
    out["summary"] = {
        "events_total": len(deduped),
        "lots": len(out["backward"]["lots"]),
        "pos": len(out["backward"]["pos"]),
        "batches": len(batch_ids),
        "packs": len(pack_ids),
        "orders": len(out["forward"]["orders"]),
    }
    return out


def cycle_time(*, entity_id: str, from_type: str, to_type: str) -> Dict[str, Any]:
    """Return the duration between two event types for a given entity."""
    _ensure_indexes_once()
    evs = list(_db().timeline_events.find(
        {"entity_refs.id": entity_id, "type": {"$in": [from_type, to_type]}},
        {"_id": 0, "type": 1, "timestamp": 1},
    ).sort("timestamp", 1))
    start = next((e for e in evs if e["type"] == from_type), None)
    end = next((e for e in reversed(evs) if e["type"] == to_type), None)
    if not start or not end: return {"entity_id": entity_id, "cycle_seconds": None, "from": None, "to": None}
    try:
        s = datetime.fromisoformat(start["timestamp"].replace("Z", "+00:00"))
        e = datetime.fromisoformat(end["timestamp"].replace("Z", "+00:00"))
        return {"entity_id": entity_id, "cycle_seconds": (e - s).total_seconds(), "from": start["timestamp"], "to": end["timestamp"]}
    except Exception:
        return {"entity_id": entity_id, "cycle_seconds": None}
