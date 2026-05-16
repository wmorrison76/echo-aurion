"""iter196 · FM-Upgrade 7 — Floor (kitchen tablet) + Route (driver mobile) surfaces.

Floor surface (`/floor/:token`):
  • Station dashboard — my queue, my timers, my batches
  • CCP logging (tap temp → timestamp captured)
  • Pack-line execution — spec image, portion target, label trigger
  • Voice input friendly (hands busy)
  • Offline-capable (the UI layer caches; these endpoints are fast + idempotent)

Route surface (`/route/:token`):
  • Next-stop card dominant
  • 2-tap POD
  • Temperature confirmation at drop
  • End-of-shift summary
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel


def _db():
    from database import db as _d
    return _d


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()
def _uid(prefix: str) -> str:
    import uuid as _u
    return f"{prefix}-{_u.uuid4().hex[:8]}"


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


# ═══════════════════════════════════════════════════════════════════════
# Token auth — reuses the briefing_mobile_tokens collection pattern
# but with dedicated surface="floor"|"route" so tokens are scoped.
# ═══════════════════════════════════════════════════════════════════════
def _auth_token(token: str, surface: str) -> Dict[str, Any]:
    if not token:
        raise HTTPException(401, "token required")
    sess = _db().surface_tokens.find_one({"token": token, "surface": surface, "active": True}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "invalid or revoked token")
    return sess


# ═══════════════════════════════════════════════════════════════════════
# FLOOR SURFACE — /api/floor/*
# ═══════════════════════════════════════════════════════════════════════
floor_router = APIRouter(prefix="/api/floor", tags=["floor-surface"])


class MintFloorBody(BaseModel):
    station_name: str
    station_id: Optional[str] = None
    ttl_days: Optional[int] = 30


@floor_router.post("/admin/mint-token")
async def floor_mint_token(body: MintFloorBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    tok = secrets.token_urlsafe(18)
    station_id = body.station_id or _uid("stn")
    exp = (_now() + timedelta(days=int(body.ttl_days or 30))).isoformat()
    doc = {
        "token": tok, "surface": "floor",
        "station_id": station_id, "station_name": body.station_name,
        "active": True, "expires_at": exp, "created_at": _iso(),
    }
    _db().surface_tokens.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "token": tok, "url": f"/floor/{tok}", **doc}


@floor_router.get("/me")
async def floor_me(x_floor_token: Optional[str] = Header(None)):
    sess = _auth_token(x_floor_token or "", "floor")
    return {"ok": True, "station_id": sess.get("station_id"), "station_name": sess.get("station_name")}


@floor_router.get("/queue")
async def floor_queue(x_floor_token: Optional[str] = Header(None)):
    """Production runs assigned to this station, plus any pending packs."""
    sess = _auth_token(x_floor_token or "", "floor")
    d = _db()
    runs = list(d.fresh_meal_production_runs.find(
        {"status": {"$in": ["scheduled", "in_progress", "paused"]}},
        {"_id": 0},
    ).sort("date", 1).limit(20))
    packs = list(d.fresh_meal_packs.find(
        {"status": {"$in": ["planned", "in_production"]}}, {"_id": 0}
    ).limit(50))
    return {"ok": True, "station": sess.get("station_name"), "runs": runs, "packs_in_queue": packs}


class FloorCCPBody(BaseModel):
    pack_id: Optional[str] = None
    batch_id: Optional[str] = None
    ccp_type: str                # cook_temp | cool_time | ph | visual
    measurement: float
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None


@floor_router.post("/ccp")
async def floor_ccp(body: FloorCCPBody, x_floor_token: Optional[str] = Header(None)):
    """One-tap CCP log from the station tablet. Mirrors /api/fresh-meals/safety/check
    but scoped to the station's identity (actor name comes from the token)."""
    sess = _auth_token(x_floor_token or "", "floor")
    d = _db()
    min_ok = body.threshold_min is None or body.measurement >= body.threshold_min
    max_ok = body.threshold_max is None or body.measurement <= body.threshold_max
    passing = min_ok and max_ok
    rec = {
        "id": _uid("ccp"),
        "pack_id": body.pack_id, "batch_id": body.batch_id,
        "ccp_type": body.ccp_type, "measurement": body.measurement,
        "threshold_min": body.threshold_min, "threshold_max": body.threshold_max,
        "passing": passing,
        "actor_id": sess.get("station_id"),
        "station_name": sess.get("station_name"),
        "at": _iso(),
    }
    d.fresh_meal_safety_records.insert_one(rec.copy()); rec.pop("_id", None)
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import CCP_LOGGED
        refs = [{"kind": "station", "id": sess.get("station_id"), "name": sess.get("station_name")}]
        if body.pack_id: refs.append({"kind": "pack", "id": body.pack_id})
        if body.batch_id: refs.append({"kind": "batch", "id": body.batch_id})
        _tl(CCP_LOGGED,
            actor={"type": "user", "id": sess.get("station_id"), "name": sess.get("station_name")},
            entity_refs=refs,
            payload={"ccp_type": body.ccp_type, "measurement": body.measurement,
                     "passing": passing, "commodity": "ccp", "quantity": 1, "unit": "check"})
    except Exception: pass
    return {"ok": True, "passing": passing, "record": rec}


class FloorPackActionBody(BaseModel):
    pack_id: str
    action: str                  # start | seal | label | issue
    temp_c: Optional[float] = None
    note: Optional[str] = None


FLOOR_ACTION_TO_STATUS = {
    "start": "in_production",
    "seal":  "packed",
    "label": "staged",
    "issue": "issue",
}


@floor_router.post("/pack-action")
async def floor_pack_action(body: FloorPackActionBody, x_floor_token: Optional[str] = Header(None)):
    sess = _auth_token(x_floor_token or "", "floor")
    status = FLOOR_ACTION_TO_STATUS.get(body.action)
    if not status:
        raise HTTPException(400, f"action must be one of {list(FLOOR_ACTION_TO_STATUS)}")
    d = _db()
    pack = d.fresh_meal_packs.find_one({"id": body.pack_id}, {"_id": 0})
    if not pack: raise HTTPException(404, "pack not found")
    patch: Dict[str, Any] = {"status": status, "updated_at": _iso(), "last_station": sess.get("station_name")}
    push: Dict[str, Any] = {}
    if body.temp_c is not None:
        push["temp_history"] = {"temp_c": float(body.temp_c), "at": _iso(),
                                "status": status, "station": sess.get("station_name")}
    update = {"$set": patch}
    if push: update["$push"] = push
    d.fresh_meal_packs.update_one({"id": body.pack_id}, update)

    try:
        from lib.timeline import emit as _tl
        ev_map = {"in_production": "pack.weighed", "packed": "pack.sealed",
                  "staged": "pack.labeled", "issue": "pack.issue_raised"}
        ev = ev_map.get(status)
        if ev:
            refs = [{"kind": "pack", "id": body.pack_id},
                    {"kind": "station", "id": sess.get("station_id"), "name": sess.get("station_name")},
                    {"kind": "order", "id": pack.get("order_id")}]
            for l in (pack.get("lot_composition") or []):
                if l.get("lot_id"): refs.append({"kind": "lot", "id": l["lot_id"]})
            payload = {"commodity": pack.get("product_id"), "quantity": 1, "unit": "pack",
                       "status": status, "station": sess.get("station_name")}
            tlcs = [l.get("tlc") for l in (pack.get("lot_composition") or []) if l.get("tlc")]
            if tlcs: payload["tlcs"] = tlcs; payload["tlc"] = tlcs[0]
            if body.temp_c is not None: payload["temp_c"] = body.temp_c
            _tl(ev,
                actor={"type": "user", "id": sess.get("station_id"), "name": sess.get("station_name")},
                entity_refs=refs, payload=payload,
                idempotency_key=f"floor:{ev}:{body.pack_id}:{_iso()[:16]}")
    except Exception: pass
    return {"ok": True, "pack_id": body.pack_id, "status": status}


@floor_router.get("/my-activity")
async def floor_my_activity(limit: int = 20, x_floor_token: Optional[str] = Header(None)):
    sess = _auth_token(x_floor_token or "", "floor")
    from lib.timeline import query as tl_query
    events = tl_query(actor_id=sess.get("station_id"), limit=max(1, min(100, limit)))
    return {"ok": True, "station": sess.get("station_name"), "events": events}


# ═══════════════════════════════════════════════════════════════════════
# ROUTE SURFACE — /api/route/*
# ═══════════════════════════════════════════════════════════════════════
route_router = APIRouter(prefix="/api/route", tags=["route-surface"])


class MintRouteBody(BaseModel):
    driver_name: str
    driver_id: Optional[str] = None
    ttl_days: Optional[int] = 30


@route_router.post("/admin/mint-token")
async def route_mint_token(body: MintRouteBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    tok = secrets.token_urlsafe(18)
    driver_id = body.driver_id or _uid("drv")
    exp = (_now() + timedelta(days=int(body.ttl_days or 30))).isoformat()
    doc = {
        "token": tok, "surface": "route",
        "driver_id": driver_id, "driver_name": body.driver_name,
        "active": True, "expires_at": exp, "created_at": _iso(),
    }
    _db().surface_tokens.insert_one(doc.copy()); doc.pop("_id", None)
    return {"ok": True, "token": tok, "url": f"/route/{tok}", **doc}


@route_router.get("/me")
async def route_me(x_route_token: Optional[str] = Header(None)):
    sess = _auth_token(x_route_token or "", "route")
    return {"ok": True, "driver_id": sess.get("driver_id"), "driver_name": sess.get("driver_name")}


@route_router.get("/stops")
async def route_stops(x_route_token: Optional[str] = Header(None)):
    """All packs scheduled for this driver today, as ordered stops."""
    sess = _auth_token(x_route_token or "", "route")
    d = _db()
    today = _iso()[:10]
    packs = list(d.fresh_meal_packs.find(
        {"status": {"$in": ["staged", "out_for_delivery"]},
         "pack_date": {"$gte": today}},
        {"_id": 0},
    ).sort("created_at", 1).limit(100))
    # Group packs by customer_id as a simple stop grouping
    stops: List[Dict[str, Any]] = []
    by_customer: Dict[str, List[Dict[str, Any]]] = {}
    for p in packs:
        cid = p.get("customer_id") or "unknown"
        by_customer.setdefault(cid, []).append(p)
    for cid, plist in by_customer.items():
        stops.append({
            "stop_id": f"stop-{cid[:8]}",
            "customer_id": cid, "pack_count": len(plist),
            "pack_ids": [p["id"] for p in plist],
            "products": list({p.get("product_id") for p in plist}),
            "first_pack_status": plist[0].get("status"),
        })
    return {"ok": True, "driver": sess.get("driver_name"), "total_stops": len(stops), "stops": stops}


class RouteDeliveryBody(BaseModel):
    pack_ids: List[str]
    temp_c: Optional[float] = None
    photo_url: Optional[str] = None
    note: Optional[str] = None
    outcome: str = "delivered"          # delivered | missed | partial


@route_router.post("/pod")
async def route_pod(body: RouteDeliveryBody, x_route_token: Optional[str] = Header(None)):
    """Proof of Delivery — marks packs delivered (or missed), captures temp & photo."""
    sess = _auth_token(x_route_token or "", "route")
    if body.outcome not in ("delivered", "missed", "partial"):
        raise HTTPException(400, "outcome must be delivered|missed|partial")
    d = _db()
    status_map = {"delivered": "delivered", "missed": "issue", "partial": "delivered"}
    target_status = status_map[body.outcome]
    updated: List[str] = []
    for pid in body.pack_ids:
        pack = d.fresh_meal_packs.find_one({"id": pid}, {"_id": 0})
        if not pack: continue
        patch = {"status": target_status, "delivered_at": _iso(), "driver_id": sess.get("driver_id"),
                 "driver_name": sess.get("driver_name"), "pod_note": body.note, "pod_photo": body.photo_url}
        push: Dict[str, Any] = {}
        if body.temp_c is not None:
            push["temp_history"] = {"temp_c": float(body.temp_c), "at": _iso(), "status": target_status, "by": "driver"}
        update = {"$set": patch}
        if push: update["$push"] = push
        d.fresh_meal_packs.update_one({"id": pid}, update)
        updated.append(pid)
        # Emit pack.delivered timeline event
        try:
            from lib.timeline import emit as _tl
            ev = "pack.delivered" if body.outcome == "delivered" else "pack.issue_raised"
            refs = [{"kind": "pack", "id": pid},
                    {"kind": "driver", "id": sess.get("driver_id"), "name": sess.get("driver_name")},
                    {"kind": "order", "id": pack.get("order_id")}]
            payload = {"commodity": pack.get("product_id"), "quantity": 1, "unit": "pack",
                       "outcome": body.outcome, "has_photo": bool(body.photo_url)}
            tlcs = [l.get("tlc") for l in (pack.get("lot_composition") or []) if l.get("tlc")]
            if tlcs: payload["tlcs"] = tlcs; payload["tlc"] = tlcs[0]
            if body.temp_c is not None: payload["temp_c"] = body.temp_c
            _tl(ev,
                actor={"type": "user", "id": sess.get("driver_id"), "name": sess.get("driver_name")},
                entity_refs=refs, payload=payload,
                idempotency_key=f"pod:{pid}:{_iso()[:16]}")
        except Exception: pass
    return {"ok": True, "updated_pack_ids": updated, "total": len(updated), "outcome": body.outcome}


@route_router.get("/shift-summary")
async def route_shift_summary(x_route_token: Optional[str] = Header(None)):
    sess = _auth_token(x_route_token or "", "route")
    d = _db()
    today = _iso()[:10]
    today_packs = list(d.fresh_meal_packs.find(
        {"driver_id": sess.get("driver_id"), "delivered_at": {"$gte": today}}, {"_id": 0}
    ).limit(500))
    delivered = [p for p in today_packs if p.get("status") == "delivered"]
    issues = [p for p in today_packs if p.get("status") == "issue"]
    temps = [r["temp_c"] for p in today_packs for r in (p.get("temp_history") or []) if r.get("by") == "driver"]
    return {
        "ok": True, "driver": sess.get("driver_name"),
        "delivered": len(delivered), "issues": len(issues), "total_stops": len(today_packs),
        "avg_drop_temp_c": round(sum(temps) / len(temps), 1) if temps else None,
        "shift_started_at": today_packs[-1].get("created_at") if today_packs else None,
    }
