"""
Universal "Why Did This Change?" Drill
======================================
B.15 from the CFO toolkit. Click any number on any screen → the chain
of events that built it. The Echo AI³ append-only event log already
records every state-changing operation; this module is the query
surface that exposes it for forensic drill-down.

Reads from:
  · `event_bus_store`           — D28 unified event bus
  · `audit_events`              — module-level audit log
  · `outlet_capture_events`     — outlet-level capture events
  · `outlet_capture_weights_history` — model weight changes
  · `forecast_overrides`        — manual director overrides

Cross-collection query orchestrator: given any (entity_type, entity_id,
optional time window), returns the chronologically-ordered chain of
events that affected that entity. Forensic, replayable, doctrine-aligned.

Doctrine alignment:
  · §3.1 append-only — assumes the underlying logs are immutable
  · §1.1 transparency — every change is traceable to its event
  · Patent §4 — the cryptographic event-doctrine linkage means each
    historical event carries its doctrine-version hash
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/why-changed", tags=["cfo-why-changed"])

_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("/drill")
async def drill(
    entity_type: str = Query(..., description="outlet | forecast | weights | invoice | je | pnl_line"),
    entity_id: str = Query(..., description="The entity's unique identifier"),
    since: Optional[str] = Query(None, description="ISO datetime — earliest event to include"),
    limit: int = Query(50, ge=1, le=500),
):
    """Return the chronologically-ordered event chain for an entity.

    Each event includes: timestamp, source collection, event type,
    actor (who did it), summary, payload, and doctrine-version hash
    (when the entity is doctrine-gated)."""
    cutoff = since or (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()

    chain: List[Dict] = []

    # 1. Unified event bus — anything published with this entity in payload
    bus_events = list(
        db["event_bus_store"].find(
            {
                "$or": [
                    {f"payload.{entity_type}_id": entity_id},
                    {f"payload.outlet_id": entity_id} if entity_type == "outlet" else {},
                    {f"payload.entity_id": entity_id},
                ],
                "timestamp": {"$gte": cutoff},
            },
            {"_id": 0},
        ).sort("timestamp", -1).limit(limit)
    )
    for e in bus_events:
        chain.append({
            "ts": e.get("timestamp"),
            "source": "event_bus_store",
            "event_type": e.get("event_type"),
            "actor": e.get("source"),
            "summary": _summarize_event(e.get("event_type"), e.get("payload", {})),
            "payload": e.get("payload", {}),
            "doctrine_hash": e.get("doctrine_version_hash"),
        })

    # 2. Module-level audit events
    audit_events = list(
        db["audit_events"].find(
            {
                "$or": [{"entity_id": entity_id}, {f"entity_type": entity_type}],
                "ts": {"$gte": cutoff},
            },
            {"_id": 0},
        ).sort("ts", -1).limit(limit)
    )
    for a in audit_events:
        chain.append({
            "ts": a.get("ts"),
            "source": "audit_events",
            "event_type": a.get("action"),
            "actor": a.get("actor"),
            "summary": a.get("summary") or f"{a.get('action')} on {a.get('entity_type')}/{a.get('entity_id')}",
            "payload": a,
            "doctrine_hash": a.get("doctrine_version_hash"),
        })

    # Entity-type-specific lookups for richer chain
    if entity_type == "outlet":
        # Capture events
        capture = list(
            db["outlet_capture_events"].find(
                {"outlet_id": entity_id, "ts": {"$gte": cutoff}}, {"_id": 0},
            ).sort("ts", -1).limit(limit)
        )
        for c in capture:
            chain.append({
                "ts": c.get("ts"),
                "source": "outlet_capture_events",
                "event_type": "capture_event",
                "actor": c.get("source"),
                "summary": (
                    f"{c.get('covers', 0)} covers / "
                    f"${c.get('revenue_cents', 0)/100:,.2f} on {c.get('date')} "
                    f"({c.get('daypart')})"
                ),
                "payload": c,
                "doctrine_hash": c.get("doctrine_version_hash"),
            })

        # Weights history (model belief changes)
        weights_history = list(
            db["outlet_capture_weights_history"].find(
                {"outlet_id": entity_id, "archived_at": {"$gte": cutoff}}, {"_id": 0},
            ).sort("archived_at", -1).limit(limit)
        )
        for w in weights_history:
            chain.append({
                "ts": w.get("archived_at"),
                "source": "outlet_capture_weights_history",
                "event_type": "weights_changed",
                "actor": w.get("trigger", "scheduled_audit"),
                "summary": (
                    f"weights v{w.get('version')} archived — "
                    f"trigger: {w.get('trigger', 'audit')}"
                ),
                "payload": w,
            })

    elif entity_type == "forecast":
        # Forecast overrides
        overrides = list(
            db["forecast_overrides"].find(
                {"forecast_id": entity_id} if entity_id.count("-") >= 4 else {"date": entity_id},
                {"_id": 0},
            ).limit(limit)
        )
        for o in overrides:
            chain.append({
                "ts": o.get("ts") or o.get("created_at"),
                "source": "forecast_overrides",
                "event_type": "manual_override",
                "actor": o.get("user") or "manager",
                "summary": (
                    f"manual override: {o.get('field')} → {o.get('value')} "
                    f"({o.get('reason', 'no reason given')})"
                ),
                "payload": o,
            })

    elif entity_type == "weights":
        weights_history = list(
            db["outlet_capture_weights_history"].find(
                {"$or": [{"outlet_id": entity_id}, {"version": int(entity_id) if entity_id.isdigit() else -1}]},
                {"_id": 0},
            ).limit(limit)
        )
        for w in weights_history:
            chain.append({
                "ts": w.get("archived_at"),
                "source": "outlet_capture_weights_history",
                "event_type": "weights_archived",
                "actor": w.get("trigger"),
                "summary": f"weights v{w.get('version')} archived",
                "payload": w,
            })

    elif entity_type in ("je", "invoice", "pnl_line"):
        gl_events = list(
            db["aurum_gl_journal"].find(
                {"$or": [{"je_id": entity_id}, {"reference_id": entity_id}, {"invoice_id": entity_id}]},
                {"_id": 0},
            ).sort("post_date", -1).limit(limit)
        )
        for j in gl_events:
            chain.append({
                "ts": j.get("post_date") or j.get("created_at"),
                "source": "aurum_gl_journal",
                "event_type": "journal_entry",
                "actor": j.get("posted_by", "system"),
                "summary": (
                    f"{j.get('account_type', 'GL')} ${j.get('amount_cents', 0)/100:,.2f} "
                    f"({j.get('description', '')})"
                ),
                "payload": j,
            })

    # Sort by timestamp descending; cap to limit
    chain.sort(key=lambda e: e.get("ts") or "", reverse=True)
    chain = chain[:limit]

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "since": cutoff,
        "events": chain,
        "count": len(chain),
        "earliest_event_ts": chain[-1]["ts"] if chain else None,
        "latest_event_ts": chain[0]["ts"] if chain else None,
        "narrative": _drill_narrative(entity_type, entity_id, chain),
        "generated_at": _now(),
    }


def _summarize_event(event_type: str, payload: Dict) -> str:
    """Best-effort summary of a generic bus event."""
    if not event_type:
        return "(unknown event)"
    pieces = [event_type]
    for k in ("outlet_id", "property_id", "date", "amount_cents", "actor"):
        if k in payload:
            v = payload[k]
            if k == "amount_cents":
                pieces.append(f"${v/100:,.2f}")
            else:
                pieces.append(str(v))
    return " · ".join(pieces[:5])


def _drill_narrative(entity_type: str, entity_id: str, chain: List[Dict]) -> str:
    if not chain:
        return f"No events found for {entity_type}/{entity_id} in the lookback window."
    first = chain[-1]
    last = chain[0]
    return (
        f"{len(chain)} events for {entity_type}/{entity_id}, spanning "
        f"{first['ts']} to {last['ts']}. Most recent: {last['source']} → "
        f"{last['event_type']}."
    )
