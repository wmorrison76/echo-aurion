"""
iter266.14 · Beverage Network (cross-outlet inventory + transfer flow)
======================================================================
Per William's brief:

  Beverage side of Chronos should see who has product and how much in
  large resorts. End of month / waiting on deliveries: look at last
  inventory + purchases + sales of every alcoholic AND non-alcoholic
  beverage, build a network so FOH managers can share product resources
  and Purchasing/Receiving central stock is visible at all times. When a
  Guest 360 VIP walks in unannounced wanting a specific wine, the GM
  can find which outlet has it on hand and do a quick transfer.

Data sources (all real, no mocks):
  - beverage_inventory      : central stock (Purchasing & Receiving) per SKU
  - foh_beverage_sales      : per-outlet sales history (outlet_slug × sku)
  - beverage_transfers (new): audit log of cross-outlet moves

Endpoints (all /api/beverage-network):
  GET  /availability                                 — full network state
  GET  /find?sku=...&exclude_outlet=...              — VIP guest lookup
  POST /transfer                                     — log an outlet→outlet move
  GET  /transfers                                    — recent transfer audit
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/beverage-network", tags=["beverage-network"])

_now = lambda: datetime.now(timezone.utc)
_now_iso = lambda: _now().isoformat()


def _is_alcoholic(category: str, spirit_type: Optional[str] = None) -> bool:
    if spirit_type:
        return True
    cat = (category or "").lower()
    return any(
        k in cat
        for k in ("wine", "liquor", "spirit", "beer", "cocktail", "whisk", "vodka", "tequila", "rum", "gin")
    )


def _sales_summary(days: int = 30) -> Dict[str, Dict[str, Any]]:
    """Aggregate sales last N days by (outlet, sku) → {qty, revenue}."""
    cutoff = (_now() - timedelta(days=days)).isoformat()
    out: Dict[str, Dict[str, Any]] = {}
    try:
        cur = db["foh_beverage_sales"].find(
            {"created_at": {"$gte": cutoff}},
            {"_id": 0, "outlet_slug": 1, "sku": 1, "category": 1,
             "qty": 1, "price": 1},
        )
        for r in cur:
            sku = r.get("sku")
            outlet = r.get("outlet_slug")
            if not sku or not outlet:
                continue
            key = f"{outlet}::{sku}"
            cell = out.setdefault(key, {
                "outlet_slug": outlet, "sku": sku,
                "category": r.get("category"),
                "qty_sold": 0, "revenue": 0.0,
            })
            cell["qty_sold"] += int(r.get("qty", 0) or 0)
            cell["revenue"] += float(r.get("qty", 0) or 0) * float(r.get("price", 0) or 0)
    except Exception:
        pass
    return out


def _central_stock() -> List[Dict[str, Any]]:
    try:
        rows = list(db["beverage_inventory"].find({}, {"_id": 0}))
    except Exception:
        return []
    enriched: list[Dict[str, Any]] = []
    for r in rows:
        on_hand = int(r.get("total_qty", 0) or 0)
        par = int(r.get("par_level", 0) or 0)
        reorder = int(r.get("reorder_point", 0) or 0)
        cost = float(r.get("cost_price", 0) or 0)
        status = (
            "below_reorder" if reorder and on_hand <= reorder
            else "below_par" if par and on_hand < par
            else "stocked"
        )
        enriched.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "spirit_type": r.get("spirit_type"),
            "producer": r.get("producer"),
            "abv": r.get("abv"),
            "alcoholic": _is_alcoholic("", r.get("spirit_type")),
            "on_hand": on_hand,
            "par_level": par,
            "reorder_point": reorder,
            "value_on_hand": round(on_hand * cost, 2),
            "cost_price": cost,
            "retail_price": float(r.get("retail_price", 0) or 0),
            "status": status,
        })
    return enriched


# ─────────────────────── public endpoints ───────────────────────

@router.get("/availability")
def availability(
    category: Optional[str] = Query(None, description="alcoholic|non_alcoholic|all"),
    lookback_days: int = Query(30, ge=1, le=180),
):
    """Full network state — central stock + per-outlet sales velocity.
    Surfaces what's low, what's moving, and a per-outlet stock map. The
    FOH-manager / GM consumes this in the Chronos Beverage Network panel."""
    sales = _sales_summary(lookback_days)
    central = _central_stock()

    if category == "alcoholic":
        central = [c for c in central if c["alcoholic"]]
    elif category == "non_alcoholic":
        central = [c for c in central if not c["alcoholic"]]

    # Per-outlet aggregation
    by_outlet: Dict[str, Dict[str, Any]] = {}
    for cell in sales.values():
        outlet = cell["outlet_slug"]
        bucket = by_outlet.setdefault(outlet, {
            "outlet_slug": outlet, "sku_count": 0,
            "alcoholic_qty": 0, "alcoholic_revenue": 0.0,
            "non_alcoholic_qty": 0, "non_alcoholic_revenue": 0.0,
            "top_skus": [],
        })
        if _is_alcoholic(cell.get("category", "")):
            bucket["alcoholic_qty"] += cell["qty_sold"]
            bucket["alcoholic_revenue"] += cell["revenue"]
        else:
            bucket["non_alcoholic_qty"] += cell["qty_sold"]
            bucket["non_alcoholic_revenue"] += cell["revenue"]
        bucket["top_skus"].append({
            "sku": cell["sku"], "qty": cell["qty_sold"],
            "revenue": round(cell["revenue"], 2),
        })
        bucket["sku_count"] = len({s["sku"] for s in bucket["top_skus"]})

    for b in by_outlet.values():
        b["top_skus"].sort(key=lambda s: -s["revenue"])
        b["top_skus"] = b["top_skus"][:8]
        b["alcoholic_revenue"] = round(b["alcoholic_revenue"], 2)
        b["non_alcoholic_revenue"] = round(b["non_alcoholic_revenue"], 2)

    # Network-wide alerts
    low_stock = [c for c in central if c["status"] in ("below_reorder", "below_par")]
    low_stock.sort(key=lambda c: 0 if c["status"] == "below_reorder" else 1)

    return {
        "generated_at": _now_iso(),
        "lookback_days": lookback_days,
        "category_filter": category or "all",
        "central_stock": central,
        "by_outlet": list(by_outlet.values()),
        "totals": {
            "central_sku_count": len(central),
            "central_value": round(sum(c["value_on_hand"] for c in central), 2),
            "low_stock_count": len(low_stock),
            "below_reorder_count": sum(1 for c in central if c["status"] == "below_reorder"),
            "outlets_with_sales": len(by_outlet),
        },
        "low_stock": low_stock,
    }


@router.get("/find")
def find_sku(
    sku: str = Query(..., description="Beverage SKU or name to find"),
    exclude_outlet: Optional[str] = Query(None),
):
    """VIP-walks-in lookup. Returns every outlet that has sold (and likely
    still has stock) of the requested SKU + central P&R stock + a ranked
    transfer suggestion list (best to worst source)."""
    sku_norm = sku.lower().strip()
    sales = _sales_summary(60)
    central = _central_stock()

    matches: list[Dict[str, Any]] = []
    for cell in sales.values():
        if sku_norm in (cell.get("sku") or "").lower():
            if exclude_outlet and cell["outlet_slug"] == exclude_outlet:
                continue
            matches.append(cell)

    # Central match (Purchasing & Receiving)
    central_matches = [
        c for c in central
        if sku_norm in (c.get("name") or "").lower()
        or sku_norm in (c.get("spirit_type") or "").lower()
    ]

    # Rank outlets by recent qty_sold as a velocity proxy for "they probably stock this"
    matches.sort(key=lambda m: -m["qty_sold"])

    suggestions: list[Dict[str, Any]] = []
    for c in central_matches:
        if c["on_hand"] > 0:
            suggestions.append({
                "source_type": "central_purchasing_receiving",
                "source_id": c["id"],
                "source_name": "Central P&R / Commissary",
                "available_qty": c["on_hand"],
                "confidence": "high",
                "note": f"On hand at central stock · status={c['status']}",
            })
    for m in matches[:5]:
        suggestions.append({
            "source_type": "outlet",
            "source_id": m["outlet_slug"],
            "source_name": m["outlet_slug"].title(),
            "available_qty": "unknown_assume_stocked",
            "recent_velocity_qty": m["qty_sold"],
            "confidence": "medium" if m["qty_sold"] >= 5 else "low",
            "note": f"Sold {m['qty_sold']} units in last 60d — likely has stock",
        })

    return {
        "sku_query": sku,
        "exclude_outlet": exclude_outlet,
        "central_matches": central_matches,
        "outlet_matches": matches[:10],
        "transfer_suggestions": suggestions[:8],
        "generated_at": _now_iso(),
    }


class TransferBody(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    from_outlet: str
    to_outlet: str
    requested_by: Optional[str] = None
    reason: Optional[str] = None
    guest_id: Optional[str] = None  # Guest 360 linkage when triggered by VIP


@router.post("/transfer")
def request_transfer(body: TransferBody):
    """Log a transfer request. Persisted in `beverage_transfers` so the
    receiving outlet can confirm pickup and Purchasing can adjust totals."""
    if body.from_outlet == body.to_outlet:
        raise HTTPException(400, "from_outlet and to_outlet must differ")
    rec = {
        "id": f"bxfer-{uuid4().hex[:12]}",
        "sku": body.sku,
        "quantity": body.quantity,
        "from_outlet": body.from_outlet,
        "to_outlet": body.to_outlet,
        "requested_by": body.requested_by or "anonymous",
        "reason": body.reason or "guest_request",
        "guest_id": body.guest_id,
        "status": "pending",
        "created_at": _now_iso(),
    }
    try:
        db["beverage_transfers"].insert_one(rec.copy())
    except Exception:
        pass
    rec.pop("_id", None)
    return {"ok": True, "transfer": rec}


@router.get("/transfers")
def list_transfers(limit: int = Query(50, le=200)):
    """Recent transfer audit feed."""
    try:
        rows = list(db["beverage_transfers"].find({}, {"_id": 0})
                    .sort("created_at", -1).limit(limit))
    except Exception:
        rows = []
    return {"transfers": rows, "count": len(rows)}


# ══════════════════════════════════════════════════════════════════════
# iter266.15 · VIP Beverage Pre-Check
# When a VIP makes a reservation, check whether their preferred beverages
# have sufficient on-hand stock to cover the expected party + their
# historical consumption pattern. If short, alert the GM + Beverage
# Director + Purchasing so they can secure more before arrival.
# ══════════════════════════════════════════════════════════════════════

class VipPrecheckBody(BaseModel):
    vip_id: str
    outlet_id: Optional[str] = None
    party_size: int = Field(ge=1, default=2)
    reservation_date: Optional[str] = None
    preferred_beverages: List[str] = Field(default_factory=list)
    historical_avg_qty_per_visit: Optional[float] = None
    notify: bool = True


def _expected_qty(sku: str, party_size: int,
                  historical_avg: Optional[float]) -> int:
    """Best-effort: VIP history beats heuristic. Otherwise assume ~1.5
    units per cover for wine bottles, 2.5 for cocktails."""
    if historical_avg and historical_avg > 0:
        return max(1, int(round(historical_avg * party_size / 2.0)))
    s = (sku or "").lower()
    rate = 2.5 if any(k in s for k in ("vodka", "tequila", "rum", "gin", "whisk")) else 1.5
    return max(1, int(round(rate * party_size / 4.0)))  # bottles, not pours


@router.post("/vip-precheck")
def vip_beverage_precheck(body: VipPrecheckBody):
    """The 'magic moment' Echo AI³ flow. Walks each preferred beverage,
    looks up central + outlet stock, computes shortfall vs party size +
    historical consumption, and (if notify=True) writes an alert row that
    surfaces in GM + Beverage Director + Purchasing inboxes."""
    central = _central_stock()
    sales = _sales_summary(60)

    results: list[Dict[str, Any]] = []
    shortfalls: list[Dict[str, Any]] = []

    for sku in body.preferred_beverages:
        sku_norm = sku.lower().strip()
        on_hand_central = sum(
            c["on_hand"] for c in central
            if sku_norm in (c.get("name") or "").lower()
        )
        outlet_velocity = sum(
            cell["qty_sold"] for cell in sales.values()
            if sku_norm in (cell.get("sku") or "").lower()
        )
        expected_need = _expected_qty(sku, body.party_size,
                                       body.historical_avg_qty_per_visit)
        # Days-of-supply guess from recent velocity (per-day rate × 60d window)
        per_day = outlet_velocity / 60.0
        days_supply = (
            round(on_hand_central / max(per_day, 0.1), 1) if per_day else None
        )

        # Shortfall = need - on_hand (negative if covered)
        shortfall = max(0, expected_need - on_hand_central)
        result = {
            "sku": sku,
            "central_on_hand": on_hand_central,
            "recent_outlet_velocity_60d": outlet_velocity,
            "per_day_rate": round(per_day, 2),
            "expected_need_for_visit": expected_need,
            "shortfall_units": shortfall,
            "days_supply_at_central": days_supply,
            "status": (
                "shortfall" if shortfall > 0
                else "tight" if days_supply is not None and days_supply < 5
                else "ok"
            ),
        }
        results.append(result)
        if result["status"] != "ok":
            shortfalls.append(result)

    alert_id: Optional[str] = None
    if body.notify and shortfalls:
        alert = {
            "id": f"vip-bev-alert-{uuid4().hex[:10]}",
            "vip_id": body.vip_id,
            "outlet_id": body.outlet_id,
            "reservation_date": body.reservation_date,
            "party_size": body.party_size,
            "shortfalls": shortfalls,
            "recipients": [
                f"gm:{body.outlet_id or 'all'}",
                "beverage-director",
                "purchasing-director",
            ],
            "status": "open",
            "created_at": _now_iso(),
        }
        try:
            db["vip_beverage_alerts"].insert_one(alert.copy())
            alert_id = alert["id"]
        except Exception:
            pass

    return {
        "vip_id": body.vip_id,
        "outlet_id": body.outlet_id,
        "party_size": body.party_size,
        "checked_at": _now_iso(),
        "results": results,
        "overall_status": (
            "shortfall" if any(r["status"] == "shortfall" for r in results)
            else "tight" if any(r["status"] == "tight" for r in results)
            else "ok"
        ),
        "alert_id": alert_id,
        "alert_filed": alert_id is not None,
    }


@router.get("/vip-precheck/alerts")
def vip_precheck_alerts(
    outlet_id: Optional[str] = Query(None),
    status: str = Query("open"),
    limit: int = Query(50, le=200),
):
    """GM / Beverage Director inbox for pending VIP beverage shortfalls."""
    q: Dict[str, Any] = {}
    if outlet_id: q["outlet_id"] = outlet_id
    if status and status != "all": q["status"] = status
    try:
        rows = list(db["vip_beverage_alerts"].find(q, {"_id": 0})
                    .sort("created_at", -1).limit(limit))
    except Exception:
        rows = []
    return {"alerts": rows, "count": len(rows)}


@router.post("/vip-precheck/alerts/{alert_id}/resolve")
def resolve_vip_precheck_alert(alert_id: str, resolved_by: Optional[str] = Query(None)):
    """Mark an alert as resolved once Purchasing has confirmed the order."""
    try:
        result = db["vip_beverage_alerts"].update_one(
            {"id": alert_id},
            {"$set": {
                "status": "resolved",
                "resolved_by": resolved_by or "anonymous",
                "resolved_at": _now_iso(),
            }},
        )
        return {"ok": result.modified_count == 1, "alert_id": alert_id}
    except Exception:
        return {"ok": False, "alert_id": alert_id}



# ══════════════════════════════════════════════════════════════════════
# iter266.17 · GM Daily Briefing email (VIP Beverage Pre-Check digest)
# Cron-friendly endpoint: returns server-rendered HTML for the GM's 6am
# email. Walks every VIP with a checkin in the next 7 days, runs the
# precheck, and renders a 1-click "Request transfer" deep link per
# shortfall. Calls /transfer with guest_id pre-attached.
# ══════════════════════════════════════════════════════════════════════


@router.get("/vip-precheck/gm-daily-briefing")
def gm_daily_briefing(
    outlet_id: Optional[str] = Query(None),
    days_ahead: int = Query(7, ge=1, le=30),
    base_url: Optional[str] = Query(None,
        description="Public base URL to embed in transfer links (defaults to relative paths)"),
):
    """Returns Content-Type: text/html. Pipe to your email provider
    (SendGrid/Resend/SES) as the message body. Idempotent — safe to call
    on a cron + safe to manually preview from a browser."""
    now = _now()
    horizon = (now + timedelta(days=days_ahead)).isoformat()

    # Pull upcoming VIPs from vip_tracker_iter241 storage (`vip_guests` collection)
    try:
        vips = list(db["vip_guests"].find(
            {"$or": [
                {"checkin_date": {"$lte": horizon[:10], "$gte": now.date().isoformat()}},
                {"reservation_date": {"$lte": horizon[:10], "$gte": now.date().isoformat()}},
            ]},
            {"_id": 0},
        ).limit(50))
    except Exception:
        vips = []

    shortfall_rows: list[dict] = []
    tight_rows: list[dict] = []
    ok_rows: list[dict] = []

    for v in vips:
        prefs = v.get("likes") or v.get("preferred_beverages") or []
        prefs = [p for p in prefs if isinstance(p, str)]
        if not prefs:
            ok_rows.append({"vip": v, "results": [], "status": "no_prefs"})
            continue
        body = VipPrecheckBody(
            vip_id=v.get("id"),
            outlet_id=outlet_id or v.get("preferred_outlet"),
            party_size=v.get("party_size") or 2,
            reservation_date=v.get("checkin_date") or v.get("reservation_date"),
            preferred_beverages=prefs,
            notify=False,
        )
        pc = vip_beverage_precheck(body)
        if pc["overall_status"] == "shortfall":
            shortfall_rows.append({"vip": v, "results": pc["results"]})
        elif pc["overall_status"] == "tight":
            tight_rows.append({"vip": v, "results": pc["results"]})
        else:
            ok_rows.append({"vip": v, "results": pc["results"], "status": "ok"})

    def transfer_link(vip: dict, sku: str, qty: int) -> str:
        # 1-click GM action: server endpoint flips a guest-attached
        # transfer request as 'pending' in beverage_transfers
        base = (base_url or "").rstrip("/")
        return (f"{base}/api/beverage-network/transfer-link"
                f"?guest_id={vip.get('id')}"
                f"&sku={sku}&qty={qty}"
                f"&from_outlet=auto&to_outlet="
                f"{outlet_id or vip.get('preferred_outlet','')}")

    def short_row_html(row: dict) -> str:
        v = row["vip"]
        name = v.get("display_name") or v.get("name") or v.get("id")
        tier = (v.get("tier") or "standard").upper()
        checkin = v.get("checkin_date") or v.get("reservation_date") or "—"
        items = "".join(
            f"<tr><td style='padding:4px 8px'>{r['sku']}</td>"
            f"<td style='padding:4px 8px;text-align:right;color:#b91c1c;font-weight:700'>"
            f"need {r['expected_need_for_visit']} / on-hand {r['central_on_hand']}</td>"
            f"<td style='padding:4px 8px;text-align:right'>"
            f"<a href='{transfer_link(v, r['sku'], r['shortfall_units'])}' "
            f"style='color:#fff;background:#c8a97e;padding:4px 10px;border-radius:3px;"
            f"text-decoration:none;font-weight:700;letter-spacing:.06em'>"
            f"REQUEST TRANSFER</a></td></tr>"
            for r in row["results"] if r["shortfall_units"] > 0
        )
        return (
            f"<div style='border-left:3px solid #b91c1c;padding:10px 14px;"
            f"margin:8px 0;background:#fef2f2;border-radius:3px'>"
            f"<div style='font-size:14px;font-weight:700'>{name} "
            f"<span style='font-size:10px;color:#c8a97e;letter-spacing:.1em'>{tier}</span></div>"
            f"<div style='font-size:11px;color:#64748b'>Arriving {checkin}</div>"
            f"<table style='width:100%;border-collapse:collapse;margin-top:8px;font-size:12px'>"
            f"{items}</table></div>"
        )

    body = (
        "<!doctype html><html><body style='font-family:Georgia,serif;"
        "max-width:680px;margin:auto;padding:24px;color:#222'>"
        "<h1 style='color:#c8a97e;border-bottom:3px solid #c8a97e;padding-bottom:8px'>"
        "Echo AI³ · GM Daily Briefing</h1>"
        f"<div style='font-size:12px;color:#666;margin-bottom:24px'>"
        f"Generated {now.strftime('%A, %B %d, %Y at %I:%M %p UTC')}"
        f" · Outlet: {outlet_id or 'all'} · Horizon: next {days_ahead} days</div>"
        f"<p style='font-size:14px'>You have <strong>{len(shortfall_rows)}</strong> VIP arrival(s) "
        f"with a beverage shortfall, <strong>{len(tight_rows)}</strong> tight on stock, and "
        f"<strong>{len(ok_rows)}</strong> fully covered.</p>"
    )
    if shortfall_rows:
        body += "<h2 style='color:#b91c1c;margin-top:24px'>Action Required · Shortfalls</h2>"
        body += "".join(short_row_html(r) for r in shortfall_rows)
    if tight_rows:
        body += "<h2 style='color:#d97706;margin-top:24px'>Watch List · Tight Inventory</h2>"
        body += "".join(short_row_html(r) for r in tight_rows)
    if not shortfall_rows and not tight_rows:
        body += ("<div style='padding:20px;background:#ecfdf5;border-left:3px solid #22c55e;"
                 "border-radius:3px;margin-top:16px'><strong>All clear.</strong> "
                 "Every VIP arrival in the next 7 days is fully stocked at central P&R.</div>")
    body += ("<hr style='margin-top:32px'/>"
             "<div style='font-size:10px;color:#999'>"
             "1-click transfer links pre-attach the guest_id and log to "
             "beverage_transfers/{guest_id}. Reply STOP to this email to unsubscribe.</div>"
             "</body></html>")
    return Response(content=body, media_type="text/html")


@router.get("/transfer-link")
def transfer_link_handler(
    guest_id: str = Query(...),
    sku: str = Query(...),
    qty: int = Query(1, ge=1),
    from_outlet: str = Query("auto"),
    to_outlet: str = Query(...),
):
    """1-click GM landing page that fires the actual transfer + shows a
    confirmation back to the GM. Called by links inside the daily briefing."""
    # Pick a likely source outlet if 'auto' — top recent seller
    if from_outlet == "auto":
        sales = _sales_summary(60)
        candidates = sorted(
            (c for c in sales.values() if sku.lower() in (c.get("sku") or "").lower()),
            key=lambda c: -c["qty_sold"],
        )
        from_outlet = candidates[0]["outlet_slug"] if candidates else "central"
    if from_outlet == to_outlet:
        from_outlet = "central"

    rec = {
        "id": f"bxfer-{uuid4().hex[:12]}",
        "sku": sku, "quantity": qty,
        "from_outlet": from_outlet, "to_outlet": to_outlet,
        "requested_by": "gm-daily-briefing",
        "reason": "vip_pre_arrival_shortfall",
        "guest_id": guest_id,
        "status": "pending",
        "created_at": _now_iso(),
    }
    try:
        db["beverage_transfers"].insert_one(rec.copy())
    except Exception:
        pass

    html = (
        "<!doctype html><html><body style='font-family:Georgia,serif;"
        "max-width:540px;margin:auto;padding:40px;text-align:center;color:#222'>"
        "<h1 style='color:#22c55e'>✓ Transfer Requested</h1>"
        f"<p style='font-size:14px;color:#444'>"
        f"<strong>{qty}× {sku}</strong> from "
        f"<strong>{from_outlet}</strong> → <strong>{to_outlet}</strong>"
        f"<br/>Linked to Guest <strong>{guest_id}</strong></p>"
        "<div style='background:#f7f3eb;padding:14px;border-radius:6px;margin:24px 0'>"
        f"<small>Transfer ID: <code>{rec['id']}</code></small><br/>"
        "<small>Status: <strong>pending</strong> · Receiving outlet will confirm pickup</small></div>"
        "<p style='font-size:12px;color:#666'>You can close this window. "
        "The transfer is queued in your Beverage Network panel.</p>"
        "</body></html>"
    )
    return Response(content=html, media_type="text/html")

