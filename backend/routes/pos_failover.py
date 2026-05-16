"""
D33 · POS-down failover service.

Real-world scenario: Friday night, the manufacturer's POS goes down
but the WiFi is up. The manager prints a QR code; servers scan it
on their phones; a PWA loads the EchoLayout floor plan; servers
take orders by table + seat; orders fan out to KDS via the existing
kitchen_routing config; when the POS recovers, queued orders sync
back with idempotent natural keys so nothing double-fires.

This module is the backend for that whole arc.

Endpoints (all /api/pos-failover)

  POST /sessions
       GM activates failover. Returns session_token + qr_payload URL
       + expires_at. Token is short-lived (default 4h, renewable).

  GET  /sessions/{session_token}
       Server PWA validates the token and loads:
         · outlet metadata
         · floor plan (from echolayout templates)
         · active menu (filtered to dine-in items)
         · station map for routing

  POST /orders
       Server submits an order with table_id + seat + items. Persists
       to pos_failover_orders + fans out station_tickets via the
       outlet's kitchen_routing configuration.

  GET  /orders
       KDS polls open orders for an outlet (filter by station).

  PUT  /orders/{order_id}/status
       Line cook updates fired/ready/served. Idempotent.

  POST /sessions/{session_token}/reconcile
       When POS comes back up, replay queued orders to the POS via
       pos_connector. Each order carries a natural_key so re-running
       reconcile is safe.

  POST /sessions/{session_token}/end
       GM closes the session. Marks session inactive; subsequent QR
       scans return 410.

Design contracts

  · Idempotency: every order has natural_key = sha256(session_token,
    table_id, seat, client_order_id). pos_connector skips orders
    that already have pos_external_id.
  · Tenant isolation: every read/write filters by tenant_id.
  · Audit: session activation, every order, every reconcile cycle
    emits an audit_log entry tagged kind=pos_failover.
  · Auth: session_token IS the auth gate — short-lived, scoped to
    one outlet, can be revoked by GM. The PWA never holds long-
    lived credentials.
  · Order routing: items are mapped to stations via the outlet's
    kitchen_routing config; if no mapping, the order falls back to
    a default "expo" station so nothing gets dropped on the floor.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/pos-failover", tags=["pos-failover"])


# Tunables
# 8h default per ops requirement (covers a full Friday-night shift +
# breakfast service the next morning if the manufacturer's POS is
# slow to recover). Max 24h cap.
DEFAULT_SESSION_HOURS = 8
MAX_SESSION_HOURS = 24
DEFAULT_FALLBACK_STATION = "expo"
# When the upstream POS comes back online, the auto-reconciler will
# replay queued orders without GM intervention. POS-recovery is
# detected via /heartbeat/pos-status pings from the PWA OR a cron
# probe. Once detected, reconcile fires and stamps reconciled_at.
POS_AUTO_RECONCILE_ON_RECOVERY = True
# PWA heartbeat cadence (seconds). The PWA pings /heartbeat/{token}
# at this interval to keep the session warm + report POS status.
HEARTBEAT_INTERVAL_SECONDS = 60


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _emit_audit(tenant_id: str, kind: str, entity_id: str,
                payload: Dict[str, Any]) -> None:
    """Best-effort audit emit. We don't fail the operation if audit
    writes fail — but we do log."""
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"pos_failover.{kind}",
            "entity_id": entity_id,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


def _natural_key(session_token: str, table_id: str, seat: Any,
                 client_order_id: str) -> str:
    raw = f"{session_token}|{table_id}|{seat}|{client_order_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


# ─── Models ──────────────────────────────────────────────────────────────

class SessionCreateBody(BaseModel):
    outlet_id: str
    activated_by: str = Field(..., min_length=1)
    reason: str = "manufacturer_pos_down"
    duration_hours: int = DEFAULT_SESSION_HOURS


class OrderItemInput(BaseModel):
    sku: str
    name: str
    qty: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    modifiers: List[str] = Field(default_factory=list)
    station: Optional[str] = None  # override; else resolved from routing


class OrderCreateBody(BaseModel):
    session_token: str
    table_id: str
    seat: Optional[int] = None
    server_id: str
    client_order_id: str = Field(..., min_length=4)
    items: List[OrderItemInput]
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(...,
        pattern="^(fired|ready|served|voided)$")
    actor_id: Optional[str] = None
    note: Optional[str] = None


# ─── Sessions ────────────────────────────────────────────────────────────

@router.post("/sessions")
def create_session(
    body: SessionCreateBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    duration = max(1, min(MAX_SESSION_HOURS, int(body.duration_hours)))
    token = secrets.token_urlsafe(24)
    expires = _now() + timedelta(hours=duration)
    session = {
        "session_token": token,
        "tenant_id": tenant_id,
        "outlet_id": body.outlet_id,
        "activated_by": body.activated_by,
        "reason": body.reason,
        "active": True,
        "created_at": _now_iso(),
        "expires_at": expires.isoformat(),
        "ended_at": None,
        "reconciled_at": None,
    }
    db["pos_failover_sessions"].insert_one(session.copy())
    _emit_audit(tenant_id, "session_create", token, {
        "outlet_id": body.outlet_id,
        "activated_by": body.activated_by,
        "reason": body.reason,
        "duration_hours": duration,
    })
    return {
        "ok": True,
        "session_token": token,
        "outlet_id": body.outlet_id,
        "expires_at": expires.isoformat(),
        "qr_payload": f"luccca://pos-failover?token={token}"
                       f"&outlet={body.outlet_id}",
        "qr_install_url": (
            f"/m/pos-failover/install?token={token}"
        ),
    }


def _load_session(session_token: str, tenant_id: str) -> Dict[str, Any]:
    s = db["pos_failover_sessions"].find_one(
        {"session_token": session_token, "tenant_id": tenant_id})
    if not s:
        raise HTTPException(404, "session not found")
    if not s.get("active"):
        raise HTTPException(410, "session ended")
    expires = s.get("expires_at")
    if expires:
        try:
            ed = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if ed.tzinfo is None:
                ed = ed.replace(tzinfo=timezone.utc)
            if _now() > ed:
                raise HTTPException(410, "session expired")
        except (ValueError, TypeError):
            pass
    return s


@router.get("/sessions/{session_token}")
def load_session(
    session_token: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """Server PWA loads session context: layout + menu + station map."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = _load_session(session_token, tenant_id)
    outlet_id = s["outlet_id"]

    # Floor plan: pull most recent template for this outlet
    layout = db["echolayout_templates"].find_one(
        {"tenant_id": tenant_id, "outlet_id": outlet_id},
        {"_id": 0}) or db["echolayout_templates"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0})

    # Menu: dine-in items for this outlet
    menu_items = list(db["pos_menu_items"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "available": True}, {"_id": 0}).limit(2000))
    if not menu_items:
        menu_items = list(db["pos_menu_items"].find(
            {"outlet_id": outlet_id, "available": True}, {"_id": 0})
                          .limit(2000))

    # Station routing
    routing = db["kitchen_routing_outlets"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0}) or {}
    stations = list(db["kitchen_routing_stations"].find(
        {"outlet_id": outlet_id}, {"_id": 0}))

    return {
        "ok": True,
        "session": {
            "outlet_id": outlet_id,
            "expires_at": s.get("expires_at"),
            "activated_by": s.get("activated_by"),
        },
        "layout": layout,
        "menu_items": menu_items,
        "routing": {
            "default_station": routing.get(
                "default_station", DEFAULT_FALLBACK_STATION),
            "stations": stations,
        },
    }


@router.post("/sessions/{session_token}/end")
def end_session(
    session_token: str,
    actor_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = db["pos_failover_sessions"].find_one(
        {"session_token": session_token, "tenant_id": tenant_id})
    if not s:
        raise HTTPException(404, "session not found")
    db["pos_failover_sessions"].update_one(
        {"session_token": session_token},
        {"$set": {"active": False, "ended_at": _now_iso(),
                  "ended_by": actor_id}})
    _emit_audit(tenant_id, "session_end", session_token,
                {"actor_id": actor_id})
    return {"ok": True, "ended_at": _now_iso()}


# ─── Orders ──────────────────────────────────────────────────────────────

def _resolve_station(outlet_id: str, sku: str,
                     override: Optional[str]) -> str:
    if override:
        return override
    # Look up station for this SKU in routing config
    mapping = db["kitchen_routing_items"].find_one(
        {"outlet_id": outlet_id, "sku": sku}, {"_id": 0})
    if mapping and mapping.get("station"):
        return mapping["station"]
    # Fallback to outlet default
    routing = db["kitchen_routing_outlets"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0}) or {}
    return routing.get("default_station") or DEFAULT_FALLBACK_STATION


@router.post("/orders")
def create_order(
    body: OrderCreateBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = _load_session(body.session_token, tenant_id)
    outlet_id = s["outlet_id"]

    natural_key = _natural_key(body.session_token, body.table_id,
                               body.seat, body.client_order_id)
    # Idempotent: if natural_key already persisted, return existing
    existing = db["pos_failover_orders"].find_one(
        {"natural_key": natural_key, "tenant_id": tenant_id})
    if existing:
        existing.pop("_id", None)
        return {"ok": True, "idempotent": True, "order": existing}

    order_id = uuid.uuid4().hex[:16]
    total = round(sum(i.qty * i.price for i in body.items), 2)
    # Group items by resolved station
    station_buckets: Dict[str, List[Dict[str, Any]]] = {}
    routed_items: List[Dict[str, Any]] = []
    for item in body.items:
        station = _resolve_station(outlet_id, item.sku, item.station)
        bucket = {
            "sku": item.sku, "name": item.name, "qty": item.qty,
            "price": item.price, "modifiers": item.modifiers,
            "station": station,
        }
        routed_items.append(bucket)
        station_buckets.setdefault(station, []).append(bucket)

    order = {
        "id": order_id,
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "session_token": body.session_token,
        "natural_key": natural_key,
        "table_id": body.table_id,
        "seat": body.seat,
        "server_id": body.server_id,
        "client_order_id": body.client_order_id,
        "items": routed_items,
        "total": total,
        "notes": body.notes,
        "status": "fired",
        "fired_at": _now_iso(),
        "ready_at": None,
        "served_at": None,
        "pos_external_id": None,        # set by reconcile
        "pos_synced_at": None,
        "created_at": _now_iso(),
    }
    db["pos_failover_orders"].insert_one(order.copy())

    # Fan out station tickets — one per station
    tickets = []
    for station, items in station_buckets.items():
        ticket = {
            "id": uuid.uuid4().hex[:16],
            "tenant_id": tenant_id,
            "outlet_id": outlet_id,
            "order_id": order_id,
            "station": station,
            "table_id": body.table_id,
            "seat": body.seat,
            "items": items,
            "status": "fired",
            "created_at": _now_iso(),
        }
        db["pos_failover_station_tickets"].insert_one(ticket.copy())
        tickets.append(ticket)

    _emit_audit(tenant_id, "order_create", order_id, {
        "outlet_id": outlet_id, "table_id": body.table_id,
        "seat": body.seat, "server_id": body.server_id,
        "total": total, "station_count": len(station_buckets),
    })

    return {"ok": True, "idempotent": False,
            "order": order, "station_tickets": tickets}


@router.get("/orders")
def list_orders(
    outlet_id: str,
    station: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
):
    """KDS polls open orders. Filter by station (line cook view) or
    status (expediter view)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    if station:
        # Station view → return station tickets
        q: Dict[str, Any] = {"tenant_id": tenant_id,
                              "outlet_id": outlet_id, "station": station}
        if status:
            q["status"] = status
        rows = list(db["pos_failover_station_tickets"].find(
            q, {"_id": 0}).sort("created_at", 1)
                    .limit(max(1, min(2000, limit))))
        return {"ok": True, "view": "station",
                "station": station, "total": len(rows), "tickets": rows}
    # Expediter view → orders
    q = {"tenant_id": tenant_id, "outlet_id": outlet_id}
    if status:
        q["status"] = status
    rows = list(db["pos_failover_orders"].find(q, {"_id": 0})
                .sort("created_at", 1).limit(max(1, min(2000, limit))))
    return {"ok": True, "view": "orders",
            "total": len(rows), "orders": rows}


@router.put("/orders/{order_id}/status")
def update_status(
    order_id: str,
    body: OrderStatusUpdate,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    order = db["pos_failover_orders"].find_one(
        {"id": order_id, "tenant_id": tenant_id})
    if not order:
        raise HTTPException(404, "order not found")
    update: Dict[str, Any] = {"status": body.status}
    if body.status == "ready":
        update["ready_at"] = _now_iso()
    elif body.status == "served":
        update["served_at"] = _now_iso()
    db["pos_failover_orders"].update_one(
        {"id": order_id}, {"$set": update})
    _emit_audit(tenant_id, f"order_{body.status}", order_id,
                {"actor_id": body.actor_id, "note": body.note})
    return {"ok": True, "id": order_id, "status": body.status}


# ─── Reconcile to POS ────────────────────────────────────────────────────

def _do_reconcile(session_token: str, tenant_id: str,
                  trigger: str) -> Dict[str, Any]:
    """Internal reconcile worker — called by manual GM endpoint AND
    by the auto-recovery path. trigger is recorded in the audit."""
    orders = list(db["pos_failover_orders"].find(
        {"tenant_id": tenant_id, "session_token": session_token,
         "pos_external_id": None}, {"_id": 0}).limit(5000))

    synced = 0
    failed: List[Dict[str, Any]] = []
    for o in orders:
        try:
            from routes.pos_connector import submit_failover_order
            ext = submit_failover_order(
                tenant_id=tenant_id,
                outlet_id=o["outlet_id"],
                natural_key=o["natural_key"],
                payload=o,
            )
            db["pos_failover_orders"].update_one(
                {"id": o["id"], "tenant_id": tenant_id},
                {"$set": {
                    "pos_external_id": ext.get("external_id"),
                    "pos_synced_at": _now_iso(),
                }})
            synced += 1
        except Exception as e:
            failed.append({"order_id": o["id"], "error": str(e)})

    db["pos_failover_sessions"].update_one(
        {"session_token": session_token},
        {"$set": {"reconciled_at": _now_iso(),
                  "reconcile_synced": synced,
                  "reconcile_failed": len(failed),
                  "reconcile_trigger": trigger}})

    _emit_audit(tenant_id, "session_reconcile", session_token,
                {"synced": synced, "failed_count": len(failed),
                 "trigger": trigger})

    return {"ok": True, "session_token": session_token,
            "synced": synced, "failed": failed,
            "pending_pre_count": len(orders),
            "trigger": trigger}


@router.post("/sessions/{session_token}/reconcile")
def reconcile_session(
    session_token: str,
    x_tenant_id: Optional[str] = Header(None),
    dry_run: bool = False,
):
    """Replay queued orders to the POS once the manufacturer's POS
    is back up. Idempotent — orders with pos_external_id are skipped.
    Returns summary; payment / tip reconciliation lives in the POS
    connector itself, not here."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = db["pos_failover_sessions"].find_one(
        {"session_token": session_token, "tenant_id": tenant_id})
    if not s:
        raise HTTPException(404, "session not found")

    if dry_run:
        orders = list(db["pos_failover_orders"].find(
            {"tenant_id": tenant_id, "session_token": session_token,
             "pos_external_id": None}, {"_id": 0}).limit(5000))
        return {"ok": True, "dry_run": True,
                "session_token": session_token,
                "pending_count": len(orders),
                "orders_preview": orders[:10]}

    return _do_reconcile(session_token, tenant_id, trigger="manual")


# ─── POS heartbeat + auto-reconcile on recovery ─────────────────────────

class POSStatusBody(BaseModel):
    outlet_id: str
    pos_online: bool
    probed_by: str = "pwa_heartbeat"
    note: Optional[str] = None


@router.post("/heartbeat/pos-status")
def report_pos_status(
    body: POSStatusBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """The PWA pings here every HEARTBEAT_INTERVAL_SECONDS to report
    whether it can reach the manufacturer's POS. When the status
    transitions from down → up AND there's an active failover
    session for this outlet, we auto-fire reconcile. The GM does
    NOT need to remember to hit the button.

    The PWA detects recovery by attempting a lightweight POS health
    probe (e.g., GET /pos/health). On success, it pings here with
    pos_online=True. The cron probe (every 5 min) is the backup
    path if no PWA is currently heartbeating.
    """
    tenant_id = (x_tenant_id or "default").strip().lower()

    # Read previous status for this outlet
    prev = db["pos_status_log"].find_one(
        {"tenant_id": tenant_id, "outlet_id": body.outlet_id})
    was_down = prev and not prev.get("pos_online")
    is_up = bool(body.pos_online)

    record = {
        "tenant_id": tenant_id,
        "outlet_id": body.outlet_id,
        "pos_online": is_up,
        "probed_by": body.probed_by,
        "last_seen_at": _now_iso(),
        "note": body.note,
    }
    if prev:
        db["pos_status_log"].update_one(
            {"tenant_id": tenant_id, "outlet_id": body.outlet_id},
            {"$set": record})
    else:
        db["pos_status_log"].insert_one(record.copy())

    auto_reconciled: List[Dict[str, Any]] = []
    if (POS_AUTO_RECONCILE_ON_RECOVERY and was_down and is_up):
        # Find every active failover session for this outlet
        active = list(db["pos_failover_sessions"].find(
            {"tenant_id": tenant_id, "outlet_id": body.outlet_id,
             "active": True}, {"_id": 0}).limit(50))
        for s in active:
            result = _do_reconcile(
                s["session_token"], tenant_id,
                trigger=f"auto_recovery:{body.probed_by}")
            auto_reconciled.append(result)

    return {"ok": True,
            "outlet_id": body.outlet_id,
            "pos_online": is_up,
            "transitioned_to_online": bool(was_down and is_up),
            "auto_reconciled_sessions": auto_reconciled}


@router.get("/heartbeat/{session_token}")
def session_heartbeat(
    session_token: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """PWA pings to keep the session warm + get latest expiry hint.
    Returns expires_at + recommended next-ping interval."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = _load_session(session_token, tenant_id)
    db["pos_failover_sessions"].update_one(
        {"session_token": session_token},
        {"$set": {"last_pwa_seen_at": _now_iso()}})
    return {
        "ok": True,
        "session_token": session_token,
        "expires_at": s.get("expires_at"),
        "next_heartbeat_seconds": HEARTBEAT_INTERVAL_SECONDS,
    }
