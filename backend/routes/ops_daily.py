"""
Echo AURION · Operations Daily Ops Hub (iter263.5)

Two related backends in one router file:

  1. ADMIN DAILY OPS DASHBOARD   /api/ops-daily/*
     What an admin / IT / GM actually needs at 7am every day:
       - today's BEOs + collisions + 24h-prep deadlines firing today
       - integrations health one-glance
       - users active in last 60m
       - LLM key budget remaining (best-effort)
       - last 24h: orders placed, ird tickets printed, spa bookings, support tickets
       - any pending platform updates / rollouts in flight
       - quick links to the panels that need attention

  2. BEO ↔ VENDOR CATALOGUE RESOLVER   /api/sku-resolver/*
     PurchRec Sprint 3: when the BEO Auto-Planner suggests an order line like
     `Sysco / BEEF-FILET-8OZ`, this resolver matches it against the real
     vendor_skus collection and returns the canonical SKU + price + uom.
     Includes fuzzy matching by SKU name + a suggest endpoint for unknowns.
"""
from __future__ import annotations
import os
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

router_ops = APIRouter(prefix="/api/ops-daily", tags=["ops-daily-dashboard"])
router_sku = APIRouter(prefix="/api/sku-resolver", tags=["sku-resolver"])


# ════════════════════ ADMIN DAILY OPS ════════════════════

@router_ops.get("/snapshot")
def daily_snapshot():
    """One-call dashboard payload — everything an admin needs at 7am."""
    today_iso = datetime.now(timezone.utc).date().isoformat()
    yest = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    cutoff_60m = (datetime.now(timezone.utc) - timedelta(minutes=60)).isoformat()

    # 1) Today's BEOs (from beos collection)
    beos_today = list(db["beos"].find({"event_date": today_iso}, {"_id": 0,
        "id": 1, "event_name": 1, "guest_count": 1, "start_time": 1, "client_name": 1}))

    # 2) Today's plan-day audit (if any)
    plan_today = db["beo_plan_days"].find_one({"date": today_iso}, {"_id": 0}) or {}

    # 3) Orders + bookings in last 24h
    ird_orders_24h = db["ird_orders_v2"].count_documents({"created_at": {"$gte": yest}})
    ird_orders_test_24h = db["ird_orders_v2"].count_documents({"created_at": {"$gte": yest}, "test_mode": True})
    spa_bookings_24h = db["spa_bookings"].count_documents({"created_at": {"$gte": yest}})

    # 4) Active users (jwt_sessions)
    active_users = 0
    try:
        active_users = db["jwt_sessions"].count_documents({"last_seen": {"$gte": cutoff_60m}})
    except Exception:
        pass

    # 5) Recent platform-wide events (audit + rollout)
    audit_24h = db["admin_audit"].count_documents({"ts": {"$gte": yest}})
    open_tickets = db["admin_support_tickets"].count_documents({"status": "open"})
    rollout = db["admin_release"].find_one({"_id": "rollout"}, {"_id": 0}) or {}

    # 6) Integration quick-pulse (calls admin_console internal helper)
    try:
        from routes.admin_console import integrations as _int
        integ = _int()
    except Exception:
        integ = {"items": [], "healthy": 0, "total": 0}

    # 7) PurchRec exceptions value-at-risk
    try:
        from routes.purchrec_sprint1 import _list_matches
        matches = _list_matches()
        excs = [m for m in matches if m.status == "exception"]
        var_usd = 0.0
        for m in excs:
            for ln in m.lines:
                var_usd += abs(ln.invoice_qty - ln.received_qty) * ln.invoice_unit_price
                var_usd += abs(ln.invoice_unit_price - ln.po_unit_price) * ln.invoice_qty
    except Exception:
        excs, var_usd = [], 0.0

    # 8) Vendor contract violations
    try:
        from routes.vendor_scorecard import list_violations as _viol
        vresp = _viol()
        violations_summary = vresp.get("summary", {})
    except Exception:
        violations_summary = {}

    # 9) Today's prep + order deadlines that fire TODAY (from cached BEO plans)
    prep_due_today: List[Dict[str, Any]] = []
    order_due_today: List[Dict[str, Any]] = []
    today_str = datetime.now(timezone.utc).date().isoformat()
    cached_plans = list(db["beo_plans"].find({}, {"_id": 0}))
    for p in cached_plans:
        plan = p.get("plan", {})
        timing = plan.get("timing", {}) if isinstance(plan, dict) else {}
        prep = (timing.get("prep_complete_by") or "")
        order = (timing.get("order_deadline") or "")
        if prep.startswith(today_str):
            prep_due_today.append({"beo_id": p.get("beo_id"), "due": prep})
        if order.startswith(today_str):
            order_due_today.append({"beo_id": p.get("beo_id"), "due": order})

    # 10) Highlights — actions to take TODAY
    highlights: List[Dict[str, Any]] = []
    if len(prep_due_today) > 0:
        highlights.append({"severity": "high",
                            "label": f"{len(prep_due_today)} BEO prep deadline(s) fire today",
                            "panel": "beo-planner"})
    if len(order_due_today) > 0:
        highlights.append({"severity": "high",
                            "label": f"{len(order_due_today)} vendor order deadline(s) fire today",
                            "panel": "purchrec-sprint1"})
    if integ.get("total", 0) - integ.get("healthy", 0) > 0:
        highlights.append({"severity": "warn",
                            "label": f"{integ['total'] - integ['healthy']} integration(s) need keys",
                            "panel": "admin-console"})
    if open_tickets > 0:
        highlights.append({"severity": "warn",
                            "label": f"{open_tickets} support ticket(s) open",
                            "panel": "admin-console"})
    if (rollout or {}).get("status") == "rolling":
        highlights.append({"severity": "info",
                            "label": f"Rollout {rollout.get('target_version')} at {rollout.get('percent_rolled_out')}%",
                            "panel": "admin-console"})
    if violations_summary.get("violations", 0) > 0:
        highlights.append({"severity": "warn",
                            "label": f"{violations_summary['violations']} contract violation(s) "
                                     f"(${violations_summary.get('estimated_overcharge_usd', 0)})",
                            "panel": "vendor-scorecard"})
    if len(excs) > 0:
        highlights.append({"severity": "warn",
                            "label": f"{len(excs)} 3-way match exception(s) — ${round(var_usd, 2)} value at risk",
                            "panel": "purchrec-sprint1"})

    return {
        "date": today_iso,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "highlights": highlights,
        "today": {
            "beos": beos_today,
            "beo_plan": plan_today,
            "prep_due_today": prep_due_today,
            "order_due_today": order_due_today,
        },
        "last_24h": {
            "ird_orders": ird_orders_24h,
            "ird_orders_test": ird_orders_test_24h,
            "spa_bookings": spa_bookings_24h,
            "audit_events": audit_24h,
        },
        "active_users_60m": active_users,
        "support": {"open_tickets": open_tickets},
        "rollout": rollout,
        "integrations": integ,
        "purchrec": {
            "match_exceptions": len(excs),
            "value_at_risk_usd": round(var_usd, 2),
            "contract_violations": violations_summary.get("violations", 0),
            "contract_overcharge_usd": violations_summary.get("estimated_overcharge_usd", 0.0),
        },
    }


# ════════════════════ BEO ↔ VENDOR SKU RESOLVER ════════════════════

class SkuLine(BaseModel):
    vendor: Optional[str] = None
    sku_or_item: str
    qty: float = 1
    unit: Optional[str] = None


class ResolveReq(BaseModel):
    lines: List[SkuLine]


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


@router_sku.get("/catalogue")
def catalogue(vendor: Optional[str] = None, limit: int = 200):
    q: Dict[str, Any] = {}
    if vendor:
        q["$or"] = [{"vendor_name": vendor}, {"vendor_id": vendor}]
    rows = list(db["vendor_skus"].find(q, {"_id": 0}).limit(max(1, min(2000, limit))))
    return {"rows": rows, "count": len(rows)}


@router_sku.post("/resolve")
def resolve(req: ResolveReq):
    """Match BEO planner lines to real vendor_skus rows. Returns:
       - resolved[] when a confident match found
       - suggestions[] when fuzzy match found (top-3)
       - unresolved[] when no match"""
    skus = list(db["vendor_skus"].find({}, {"_id": 0}))
    by_norm = {_norm(s.get("sku") or s.get("name") or ""): s for s in skus}
    by_name_norm: Dict[str, list] = {}
    for s in skus:
        key = _norm(s.get("name") or "")
        by_name_norm.setdefault(key, []).append(s)

    resolved, suggestions, unresolved = [], [], []
    for ln in req.lines:
        nkey = _norm(ln.sku_or_item)
        # 1) direct SKU match
        if nkey in by_norm:
            s = by_norm[nkey]
            resolved.append({"input": ln.dict(), "match": s,
                             "match_type": "exact_sku",
                             "extended_cost": round(ln.qty * (s.get("unit_price", 0) or 0), 2)})
            continue
        # 2) substring match on name
        candidates = []
        for s in skus:
            name_n = _norm(s.get("name") or "")
            if name_n and (nkey in name_n or name_n in nkey):
                candidates.append(s)
        if len(candidates) == 1:
            s = candidates[0]
            resolved.append({"input": ln.dict(), "match": s, "match_type": "substring_name",
                             "extended_cost": round(ln.qty * (s.get("unit_price", 0) or 0), 2)})
        elif len(candidates) > 1:
            suggestions.append({"input": ln.dict(),
                                "candidates": candidates[:3],
                                "match_type": "fuzzy_name"})
        else:
            unresolved.append({"input": ln.dict(),
                                "reason": "no SKU or name match in vendor_skus collection"})

    total_resolved_cost = round(sum(r["extended_cost"] for r in resolved), 2)
    return {
        "summary": {
            "lines": len(req.lines),
            "resolved": len(resolved),
            "needs_review": len(suggestions),
            "unresolved": len(unresolved),
            "total_resolved_cost_usd": total_resolved_cost,
        },
        "resolved": resolved,
        "suggestions": suggestions,
        "unresolved": unresolved,
    }


@router_sku.post("/resolve-beo-plan/{beo_id}")
def resolve_for_beo_plan(beo_id: str):
    """Convenience: takes the cached BEO plan's `orders` list and runs resolve()
    against the vendor catalogue. Useful from the BEO Planner UI to one-click
    convert AI-suggested orders into vendor-validated lines."""
    plan_doc = db["beo_plans"].find_one({"beo_id": beo_id}, {"_id": 0, "plan": 1})
    if not plan_doc:
        raise HTTPException(404, f"No cached plan for BEO {beo_id}")
    orders = plan_doc.get("plan", {}).get("orders") or []
    lines = [SkuLine(vendor=o.get("vendor"), sku_or_item=o.get("sku_or_item") or "",
                     qty=o.get("qty") or 1, unit=o.get("unit"))
             for o in orders if o.get("sku_or_item")]
    return resolve(ResolveReq(lines=lines))
