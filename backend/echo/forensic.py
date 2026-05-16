"""
D30 · Echo AI³ forensic accounting layer (Phase 1).

Per the audit + doctrine: the existing invoice ingest writes vendor
invoices to MongoDB but does ZERO anomaly detection. The CFO sees a
month-end variance with no explanation. This module is the start of
the forensic accountant Echo always should have been.

Phase 1 ships three capabilities:

  1. Three-way match exception triage
     PO ↔ Receiver ↔ Invoice mismatches, with the WHY:
       - quantity gap   (ordered 50, received 48, billed 50)
       - price gap      (PO $4.50, invoice $4.80)
       - item gap       (PO "Fuji", invoice "Gala")
       - date gap       (delivered N days late)

  2. Vendor fingerprint
     Per-vendor pattern across last N invoices:
       - avg price drift vs PO
       - % invoices with qty mismatches
       - on-time delivery rate
       - drift trend (worsening / steady / improving)
     The CFO sees "Sysco — drift up 6% / 2% / 1% over last 3 months,
     consider re-bid" rather than reviewing 200 invoices manually.

  3. Sub-recipe drift detection
     "Mousse cake cost moved +12% but no top-level ingredient moved."
     Walks the BOM tree, identifies which sub-recipe leaf is the
     actual driver. Output: attributable percentage points per
     contributing ingredient, sorted by impact.

Doctrine alignment

  · Findings are surfaceable to OPERATOR (controller / GM see them
    and act). Internal investigation steps (the raw weight nudges,
    the retrospective replay) stay in pass_dev per §2.4.
  · Every finding emits a `prediction` event to the D28 log with
    `voice_register=operator` so the chain is auditable end-to-end
    (controller's action ↔ Echo's finding ↔ source data).
  · Tenet 8 contract: no PII in findings. We surface vendor names
    and recipe names — both ordinary class. No staff names tied to
    individual mistakes (per §2.6 "hold the manager accountable
    never throw the pan").
  · Pride from love (§2.5): findings are framed as observations
    ("invoice is $0.30 over the PO line") not accusations ("Sysco
    is overcharging you"). The controller decides what to do.

What's NOT in Phase 1 (queued):
  · Suspense / clearing-account triage
  · Cash variance forensics (POS ↔ deposits ↔ bank)
  · Period-end audit pack
  · Margin attribution
  These ship in D30-followup once Phase 1 proves itself.
"""
from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from echo.events import append_event, AppendEventBody

router = APIRouter(prefix="/api/echo/forensic", tags=["echo-forensic"])


# ─── Tunables ────────────────────────────────────────────────────────────

# How much price drift triggers a finding. 2% by default; chefs run
# tighter for high-value items, wider for commodity. Caller can override.
DEFAULT_PRICE_DRIFT_TOLERANCE = 0.02

# Quantity tolerance — matches typical receiver-pad practice.
DEFAULT_QTY_TOLERANCE = 0.01    # 1%

# Late-delivery threshold (hours past expected_delivery_at).
DEFAULT_LATE_HOURS = 24

# How far back the vendor-fingerprint considers when scoring.
VENDOR_LOOKBACK_DAYS = 90

# Sub-recipe drift threshold — recipes whose cost moved by < this
# don't get analyzed (noise). 3% default.
SUBRECIPE_DRIFT_FLOOR = 0.03


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_pct(n: float, d: float) -> float:
    if d == 0:
        return 0.0
    return float(n) / float(d)


# ─── 1. Three-way match ──────────────────────────────────────────────────

def _three_way_match_one(
    *,
    po: Dict[str, Any],
    receiver: Optional[Dict[str, Any]],
    invoice: Dict[str, Any],
    price_tolerance: float,
    qty_tolerance: float,
    late_hours: int,
) -> List[Dict[str, Any]]:
    """Compare one (PO, receiver, invoice) triplet line-by-line.
    Returns mismatches, each with the WHY field populated. The
    receiver may be None (we billed for something never received —
    that's its own finding kind)."""
    findings: List[Dict[str, Any]] = []
    # Receiver missing entirely = "invoice without proof of receipt"
    if not receiver:
        findings.append({
            "kind": "receiver_missing",
            "po_id": po.get("id"),
            "invoice_id": invoice.get("id"),
            "vendor_id": invoice.get("vendor_id") or po.get("vendor_id"),
            "severity": "critical",
            "explanation": (
                "Invoice has no matching receiver. Either receipt was "
                "never logged, or the goods never arrived. Controller "
                "review required before paying this invoice."
            ),
        })

    # Index lines by item_id for set comparison
    po_lines = {l.get("item_id"): l for l in (po.get("lines") or [])
                  if l.get("item_id")}
    inv_lines = {l.get("item_id"): l for l in (invoice.get("lines") or [])
                   if l.get("item_id")}
    rcv_lines = ({l.get("item_id"): l for l in (receiver.get("lines") or [])
                    if l.get("item_id")} if receiver else {})

    # Items billed but not on the PO
    for iid, inv_l in inv_lines.items():
        if iid not in po_lines:
            findings.append({
                "kind": "item_not_on_po",
                "po_id": po.get("id"),
                "invoice_id": invoice.get("id"),
                "vendor_id": invoice.get("vendor_id"),
                "item_id": iid,
                "item_name": inv_l.get("item_name"),
                "billed_qty": inv_l.get("qty"),
                "billed_price": inv_l.get("unit_price"),
                "severity": "warn",
                "explanation": (
                    f"Invoice line for {inv_l.get('item_name', iid)} "
                    f"has no matching PO line. Either substitute "
                    f"shipment or bookkeeping error."
                ),
            })

    # PO lines: check qty + price
    for iid, po_l in po_lines.items():
        inv_l = inv_lines.get(iid)
        rcv_l = rcv_lines.get(iid)
        if not inv_l:
            continue   # PO line not yet billed; not a finding
        # Quantity
        po_qty = float(po_l.get("qty") or 0)
        inv_qty = float(inv_l.get("qty") or 0)
        rcv_qty = float((rcv_l or {}).get("qty") or 0) if rcv_l else None
        if po_qty > 0 and abs(inv_qty - po_qty) / po_qty > qty_tolerance:
            findings.append({
                "kind": "qty_mismatch",
                "po_id": po.get("id"),
                "invoice_id": invoice.get("id"),
                "vendor_id": invoice.get("vendor_id"),
                "item_id": iid,
                "item_name": po_l.get("item_name"),
                "po_qty": po_qty, "invoice_qty": inv_qty,
                "receiver_qty": rcv_qty,
                "severity": "warn",
                "explanation": (
                    f"{po_l.get('item_name', iid)}: PO qty {po_qty}, "
                    f"invoice qty {inv_qty}"
                    + (f", receiver qty {rcv_qty}" if rcv_qty is not None else "")
                    + ". Tolerance %.0f%% exceeded." % (qty_tolerance * 100)
                ),
            })
        # Receiver vs invoice (we billed more than we received)
        if rcv_qty is not None and rcv_qty > 0 and inv_qty > rcv_qty * (1 + qty_tolerance):
            findings.append({
                "kind": "billed_above_received",
                "po_id": po.get("id"),
                "invoice_id": invoice.get("id"),
                "vendor_id": invoice.get("vendor_id"),
                "item_id": iid,
                "item_name": po_l.get("item_name"),
                "invoice_qty": inv_qty,
                "receiver_qty": rcv_qty,
                "severity": "critical",
                "explanation": (
                    f"{po_l.get('item_name', iid)}: invoice qty {inv_qty} "
                    f"> receiver qty {rcv_qty}. Hold payment until "
                    f"reconciled."
                ),
            })
        # Price
        po_price = float(po_l.get("unit_price") or 0)
        inv_price = float(inv_l.get("unit_price") or 0)
        if po_price > 0:
            drift = (inv_price - po_price) / po_price
            if abs(drift) > price_tolerance:
                findings.append({
                    "kind": "price_drift",
                    "po_id": po.get("id"),
                    "invoice_id": invoice.get("id"),
                    "vendor_id": invoice.get("vendor_id"),
                    "item_id": iid,
                    "item_name": po_l.get("item_name"),
                    "po_price": po_price,
                    "invoice_price": inv_price,
                    "drift_pct": round(drift, 4),
                    "severity": "warn" if abs(drift) < 0.10 else "critical",
                    "explanation": (
                        f"{po_l.get('item_name', iid)}: PO ${po_price}, "
                        f"invoice ${inv_price} ({drift*100:+.1f}%)."
                    ),
                })

    # Late delivery
    expected_at = po.get("expected_delivery_at")
    actual_at = invoice.get("delivery_at") or invoice.get("invoice_date")
    if expected_at and actual_at:
        try:
            exp = datetime.fromisoformat(str(expected_at).replace("Z", "+00:00"))
            act = datetime.fromisoformat(str(actual_at).replace("Z", "+00:00"))
            if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if act.tzinfo is None: act = act.replace(tzinfo=timezone.utc)
            late_h = (act - exp).total_seconds() / 3600.0
            if late_h > late_hours:
                findings.append({
                    "kind": "late_delivery",
                    "po_id": po.get("id"),
                    "invoice_id": invoice.get("id"),
                    "vendor_id": invoice.get("vendor_id"),
                    "expected_delivery_at": expected_at,
                    "actual_delivery_at": actual_at,
                    "hours_late": round(late_h, 1),
                    "severity": "info" if late_h < 48 else "warn",
                    "explanation": (
                        f"Delivery {late_h:.1f}h past expected. "
                        f"Track in vendor fingerprint."
                    ),
                })
        except Exception:
            pass

    return findings


def _persist_finding(*,
                     tenant_id: str,
                     finding: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotent persist on (tenant, kind, evidence). Re-running a
    scan over the same period doesn't duplicate findings."""
    key = {
        "tenant_id": tenant_id,
        "kind": finding["kind"],
        "po_id": finding.get("po_id"),
        "invoice_id": finding.get("invoice_id"),
        "vendor_id": finding.get("vendor_id"),
        "item_id": finding.get("item_id"),
    }
    existing = db["accounting_findings"].find_one(key, {"_id": 0})
    if existing:
        # Refresh the dynamic fields but keep id + status
        db["accounting_findings"].update_one(
            {"id": existing["id"]},
            {"$set": {**finding, "updated_at": _now_iso()}})
        return {**existing, **finding}

    doc = {
        "id": uuid.uuid4().hex[:12],
        **key,
        **finding,
        "status": "open",
        "tenant_id": tenant_id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db["accounting_findings"].insert_one(doc.copy())
    # D28 audit chain: emit a prediction event in operator register
    # so the controller's UI can drill from finding → source events.
    try:
        append_event(AppendEventBody(
            kind="prediction",
            voice_register="operator",
            sensitivity="ordinary",
            confidence=0.85 if finding.get("severity") == "critical"
                       else 0.7,
            payload={
                "domain": "forensic_accounting",
                "finding_id": doc["id"],
                "finding_kind": finding["kind"],
                "explanation": finding.get("explanation"),
                "severity": finding.get("severity"),
                "_retrospective": {
                    "decision_features": {
                        "price_drift": finding.get("drift_pct") or 0.0,
                        "qty_gap": (
                            float(finding.get("invoice_qty") or 0)
                            - float(finding.get("po_qty") or 0)
                        ) if finding.get("po_qty") else 0.0,
                    }
                },
            }), tenant_id=tenant_id)
    except Exception:
        pass
    return doc


class ScanThreeWayBody(BaseModel):
    since: Optional[str] = None       # ISO; defaults 30d ago
    price_tolerance: float = DEFAULT_PRICE_DRIFT_TOLERANCE
    qty_tolerance: float = DEFAULT_QTY_TOLERANCE
    late_hours: int = DEFAULT_LATE_HOURS


@router.post("/three-way-match/scan")
def scan_three_way(
    body: ScanThreeWayBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Sweep recent invoices and three-way-match each against its PO
    and receiver. Idempotent: re-running over the same window updates
    rather than duplicates. Designed to run nightly via the existing
    scheduler.py infrastructure."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = body.since or (datetime.now(timezone.utc)
                            - timedelta(days=30)).isoformat()
    invoices = list(db["invoices"].find(
        {"tenant_id": tenant_id, "invoice_date": {"$gte": since}},
        {"_id": 0}).limit(2000))
    findings_out: List[Dict[str, Any]] = []
    for inv in invoices:
        po_id = inv.get("po_id")
        if not po_id:
            continue
        po = db["purchase_orders"].find_one(
            {"id": po_id, "tenant_id": tenant_id}, {"_id": 0})
        if not po:
            continue
        rcv = db["invoice_receipts"].find_one(
            {"po_id": po_id, "tenant_id": tenant_id}, {"_id": 0})
        for f in _three_way_match_one(
            po=po, receiver=rcv, invoice=inv,
            price_tolerance=body.price_tolerance,
            qty_tolerance=body.qty_tolerance,
            late_hours=body.late_hours,
        ):
            findings_out.append(_persist_finding(
                tenant_id=tenant_id, finding=f))
    return {"ok": True, "tenant_id": tenant_id,
            "invoices_scanned": len(invoices),
            "findings": findings_out,
            "total_findings": len(findings_out)}


# ─── 2. Vendor fingerprint ───────────────────────────────────────────────

def _build_vendor_fingerprint(tenant_id: str, vendor_id: str,
                                lookback_days: int) -> Dict[str, Any]:
    """Aggregate a vendor's pattern across recent invoices. The
    fingerprint is recomputed on demand; the doctrine forbids
    compression, so we keep the source events and recompute when
    the controller asks."""
    since = (datetime.now(timezone.utc)
              - timedelta(days=lookback_days)).isoformat()
    invoices = list(db["invoices"].find(
        {"tenant_id": tenant_id, "vendor_id": vendor_id,
         "invoice_date": {"$gte": since}}, {"_id": 0}).limit(500))
    if not invoices:
        return {"ok": True, "vendor_id": vendor_id,
                "lookback_days": lookback_days,
                "invoice_count": 0,
                "note": "no invoices in lookback window"}

    drifts: List[float] = []
    qty_mismatch_count = 0
    on_time_count = 0
    delivery_count = 0
    by_month: Dict[str, List[float]] = {}
    for inv in invoices:
        po = db["purchase_orders"].find_one(
            {"id": inv.get("po_id"), "tenant_id": tenant_id}, {"_id": 0})
        if not po:
            continue
        po_lines = {l.get("item_id"): l for l in (po.get("lines") or [])
                      if l.get("item_id")}
        inv_lines = {l.get("item_id"): l for l in (inv.get("lines") or [])
                       if l.get("item_id")}
        for iid, inv_l in inv_lines.items():
            po_l = po_lines.get(iid)
            if not po_l:
                continue
            po_price = float(po_l.get("unit_price") or 0)
            inv_price = float(inv_l.get("unit_price") or 0)
            if po_price > 0:
                drift = (inv_price - po_price) / po_price
                drifts.append(drift)
                # bucket by year-month for trend
                ym = (inv.get("invoice_date") or "")[:7]
                by_month.setdefault(ym, []).append(drift)
            po_qty = float(po_l.get("qty") or 0)
            inv_qty = float(inv_l.get("qty") or 0)
            if po_qty > 0 and abs(inv_qty - po_qty) / po_qty > 0.01:
                qty_mismatch_count += 1
        # delivery on-time
        exp = inv.get("expected_delivery_at") or po.get("expected_delivery_at")
        act = inv.get("delivery_at") or inv.get("invoice_date")
        if exp and act:
            delivery_count += 1
            try:
                e = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
                a = datetime.fromisoformat(str(act).replace("Z", "+00:00"))
                if e.tzinfo is None: e = e.replace(tzinfo=timezone.utc)
                if a.tzinfo is None: a = a.replace(tzinfo=timezone.utc)
                if (a - e).total_seconds() / 3600.0 <= DEFAULT_LATE_HOURS:
                    on_time_count += 1
            except Exception:
                pass

    # Trend: compare last-month avg drift vs prior-month
    months_sorted = sorted(by_month.keys())
    trend = "steady"
    if len(months_sorted) >= 2:
        last = statistics.mean(by_month[months_sorted[-1]])
        prior = statistics.mean(by_month[months_sorted[-2]])
        if last > prior + 0.005:
            trend = "worsening"
        elif last < prior - 0.005:
            trend = "improving"

    fp = {
        "ok": True,
        "vendor_id": vendor_id,
        "tenant_id": tenant_id,
        "lookback_days": lookback_days,
        "invoice_count": len(invoices),
        "avg_price_drift": round(statistics.mean(drifts), 4) if drifts else 0.0,
        "median_price_drift": round(statistics.median(drifts), 4) if drifts else 0.0,
        "max_price_drift": round(max(drifts), 4) if drifts else 0.0,
        "qty_mismatch_count": qty_mismatch_count,
        "on_time_rate": round(_safe_pct(on_time_count, delivery_count), 4),
        "trend": trend,
        "monthly_drift": {
            m: round(statistics.mean(by_month[m]), 4)
            for m in months_sorted
        },
        "computed_at": _now_iso(),
    }
    # Idempotent persist for the dashboard tile
    db["vendor_fingerprints"].update_one(
        {"tenant_id": tenant_id, "vendor_id": vendor_id},
        {"$set": fp}, upsert=True)
    return fp


@router.get("/vendor-fingerprint")
def get_vendor_fingerprint(
    vendor_id: str,
    lookback_days: int = VENDOR_LOOKBACK_DAYS,
    refresh: bool = False,
    x_tenant_id: Optional[str] = Header(None),
):
    """Return the fingerprint. ?refresh=true rebuilds from invoices
    rather than serving the cached row."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    if refresh:
        return _build_vendor_fingerprint(tenant_id, vendor_id, lookback_days)
    cached = db["vendor_fingerprints"].find_one(
        {"tenant_id": tenant_id, "vendor_id": vendor_id}, {"_id": 0})
    if cached:
        return cached
    return _build_vendor_fingerprint(tenant_id, vendor_id, lookback_days)


# ─── 3. Sub-recipe drift detection ───────────────────────────────────────

def _resolve_recipe_cost(tenant_id: str,
                          recipe_id: str,
                          *,
                          depth: int = 0) -> Dict[str, Any]:
    """Walk a recipe's BOM, computing total cost from leaf ingredients.
    Sub-recipes are recursively expanded so a cheesecake → chocolate
    glaze → tempered chocolate → cocoa butter trace is fully visible.

    Returns:
      { total_cost,
        contributors: [{ source, name, cost, pct_of_total }],
        depth_max }
    """
    if depth > 8:   # cycle/runaway guard
        return {"total_cost": 0.0, "contributors": [], "depth_max": depth}
    recipe = db["recipes"].find_one(
        {"id": recipe_id, "tenant_id": tenant_id}, {"_id": 0})
    if not recipe:
        return {"total_cost": 0.0, "contributors": [], "depth_max": depth}

    contribs: List[Dict[str, Any]] = []
    total = 0.0
    for line in (recipe.get("ingredients") or []):
        qty = float(line.get("qty") or 0)
        if line.get("sub_recipe_id"):
            sub = _resolve_recipe_cost(
                tenant_id, line["sub_recipe_id"], depth=depth + 1)
            cost = sub["total_cost"] * qty
            contribs.append({
                "source": "sub_recipe",
                "id": line["sub_recipe_id"],
                "name": line.get("name") or line["sub_recipe_id"],
                "cost": cost,
                "qty": qty,
                "leaf_contributors": sub["contributors"],
            })
            total += cost
        elif line.get("ingredient_id"):
            ing = db["ingredients"].find_one(
                {"id": line["ingredient_id"], "tenant_id": tenant_id},
                {"_id": 0})
            if not ing:
                continue
            unit_cost = float(ing.get("current_unit_cost") or 0)
            cost = unit_cost * qty
            contribs.append({
                "source": "ingredient",
                "id": ing["id"],
                "name": ing.get("name") or ing["id"],
                "cost": cost,
                "qty": qty,
                "unit_cost": unit_cost,
            })
            total += cost
    # Decorate with pct
    for c in contribs:
        c["pct_of_total"] = round(_safe_pct(c["cost"], total), 4)
    return {"total_cost": round(total, 4),
            "contributors": contribs,
            "depth_max": depth}


@router.get("/subrecipe-drift")
def subrecipe_drift(
    recipe_id: str,
    baseline_period: str,                 # e.g. "2026-03"
    current_period: Optional[str] = None,  # default: latest
    x_tenant_id: Optional[str] = Header(None),
):
    """Decompose a recipe's cost movement between two periods. Walks
    the BOM tree; attributes percentage points of variance to each
    contributing ingredient. Output drives the controller's decision
    'do we re-bid an ingredient, change the recipe, or accept it'.
    """
    tenant_id = (x_tenant_id or "default").strip().lower()
    cur_period = current_period or datetime.now(timezone.utc).strftime("%Y-%m")

    # Snapshot ingredient costs at each period via cost_history
    def _snap(period: str) -> Dict[str, float]:
        rows = list(db["ingredient_cost_history"].find(
            {"tenant_id": tenant_id, "period": period}, {"_id": 0}))
        return {r["ingredient_id"]: float(r.get("unit_cost") or 0)
                 for r in rows}

    base_costs = _snap(baseline_period)
    cur_costs = _snap(cur_period)
    if not base_costs or not cur_costs:
        raise HTTPException(404,
            f"missing ingredient_cost_history for "
            f"{baseline_period} / {cur_period}")

    # Compute current and baseline recipe cost using the SAME BOM
    # (we attribute drift to ingredient cost moves, not to recipe
    # edits — recipe edits get D20 stage versioning).
    recipe = db["recipes"].find_one(
        {"id": recipe_id, "tenant_id": tenant_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(404, "recipe not found")

    # Flatten BOM to leaf ingredients (qty rolled up through sub-recipes)
    def _flatten(rid: str, qty_factor: float = 1.0,
                  out: Optional[List[Dict[str, Any]]] = None,
                  depth: int = 0) -> List[Dict[str, Any]]:
        if out is None: out = []
        if depth > 8: return out
        r = db["recipes"].find_one(
            {"id": rid, "tenant_id": tenant_id}, {"_id": 0})
        if not r: return out
        for line in (r.get("ingredients") or []):
            q = float(line.get("qty") or 0) * qty_factor
            if line.get("sub_recipe_id"):
                _flatten(line["sub_recipe_id"], qty_factor=q,
                          out=out, depth=depth + 1)
            elif line.get("ingredient_id"):
                out.append({
                    "ingredient_id": line["ingredient_id"],
                    "name": line.get("name") or line["ingredient_id"],
                    "qty": q,
                })
        return out

    leaves = _flatten(recipe_id)
    # Accumulate by ingredient (multiple sub-recipes can each contain
    # the same leaf — e.g. butter)
    rolled: Dict[str, Dict[str, Any]] = {}
    for l in leaves:
        iid = l["ingredient_id"]
        if iid in rolled:
            rolled[iid]["qty"] += l["qty"]
        else:
            rolled[iid] = {**l}

    # Per-ingredient contribution to drift
    contribs: List[Dict[str, Any]] = []
    base_total = 0.0
    cur_total = 0.0
    for iid, leaf in rolled.items():
        base_uc = base_costs.get(iid, 0)
        cur_uc = cur_costs.get(iid, 0)
        base_cost = base_uc * leaf["qty"]
        cur_cost = cur_uc * leaf["qty"]
        base_total += base_cost
        cur_total += cur_cost
        if base_uc > 0:
            ing_drift = (cur_uc - base_uc) / base_uc
        else:
            ing_drift = 0.0
        contribs.append({
            "ingredient_id": iid,
            "name": leaf["name"],
            "qty": leaf["qty"],
            "base_unit_cost": base_uc,
            "current_unit_cost": cur_uc,
            "base_cost": round(base_cost, 4),
            "current_cost": round(cur_cost, 4),
            "ingredient_drift_pct": round(ing_drift, 4),
            "contribution_to_recipe_drift_pct": (
                round(_safe_pct(cur_cost - base_cost, base_total), 4)
                if base_total > 0 else 0.0),
        })

    contribs.sort(key=lambda c: -abs(c["contribution_to_recipe_drift_pct"]))
    recipe_drift = round(_safe_pct(cur_total - base_total, base_total), 4)

    # Persist a finding if the drift exceeds the floor
    finding_doc = None
    if abs(recipe_drift) >= SUBRECIPE_DRIFT_FLOOR:
        finding_doc = _persist_finding(
            tenant_id=tenant_id,
            finding={
                "kind": "subrecipe_drift",
                "recipe_id": recipe_id,
                "recipe_name": recipe.get("name"),
                "baseline_period": baseline_period,
                "current_period": cur_period,
                "drift_pct": recipe_drift,
                "top_contributors": contribs[:5],
                "severity": ("critical" if abs(recipe_drift) > 0.10
                              else "warn"),
                "explanation": (
                    f"{recipe.get('name', recipe_id)} cost moved "
                    f"{recipe_drift*100:+.1f}% between {baseline_period} "
                    f"and {cur_period}. Top driver: "
                    f"{contribs[0]['name']} "
                    f"({contribs[0]['contribution_to_recipe_drift_pct']*100:+.1f}pt)."
                ),
            })

    return {"ok": True, "recipe_id": recipe_id,
            "recipe_name": recipe.get("name"),
            "baseline_period": baseline_period,
            "current_period": cur_period,
            "base_total_cost": round(base_total, 4),
            "current_total_cost": round(cur_total, 4),
            "recipe_drift_pct": recipe_drift,
            "contributors": contribs,
            "finding": finding_doc}


# ─── Unified findings API ────────────────────────────────────────────────

@router.get("/findings")
def list_findings(
    kind: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    vendor_id: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Controller-facing findings list. Audience must be operator or
    pass_dev — the line cook doesn't need to see vendor disputes."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "forensic findings require audience=operator or pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if kind: q["kind"] = kind
    if status: q["status"] = status
    if severity: q["severity"] = severity
    if vendor_id: q["vendor_id"] = vendor_id
    rows = list(db["accounting_findings"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "tenant_id": tenant_id,
            "total": len(rows), "findings": rows}


class ResolveBody(BaseModel):
    status: str = Field(..., pattern=r"^(investigating|resolved|dismissed)$")
    note: Optional[str] = None
    resolved_by_user_id: Optional[str] = None
    resolved_by_name: Optional[str] = None


@router.post("/findings/{finding_id}/resolve")
def resolve_finding(
    finding_id: str,
    body: ResolveBody,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Controller acts on a finding. Logs an outcome event to D28 so
    the chain compounds — D29's retrospective can later analyze
    'which kinds of findings get dismissed vs. resolved.'"""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "resolving findings requires audience=operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    f = db["accounting_findings"].find_one(
        {"id": finding_id, "tenant_id": tenant_id}, {"_id": 0})
    if not f:
        raise HTTPException(404, "finding not found")

    db["accounting_findings"].update_one(
        {"id": finding_id, "tenant_id": tenant_id},
        {"$set": {
            "status": body.status,
            "resolution_note": body.note or "",
            "resolved_by_user_id": body.resolved_by_user_id,
            "resolved_by_name": body.resolved_by_name,
            "resolved_at": _now_iso(),
            "updated_at": _now_iso(),
        }})

    # Outcome event for the audit chain (D29 reads these)
    try:
        # Find the parent prediction event
        pred = db["echo_events"].find_one(
            {"tenant_id": tenant_id, "kind": "prediction",
             "payload.finding_id": finding_id}, {"_id": 0})
        append_event(AppendEventBody(
            kind="outcome",
            sensitivity="ordinary",
            parent_event_id=(pred or {}).get("id"),
            payload={
                "finding_id": finding_id,
                "decision": body.status,
                "note": body.note,
                "resolved_by_name": body.resolved_by_name,
            }), tenant_id=tenant_id)
    except Exception:
        pass

    return {"ok": True, "finding_id": finding_id,
            "status": body.status}
