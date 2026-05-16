"""
Echo AURION · PurchRec Sprint 1 (iter263)

Two flagship capabilities the casino/resort audit flagged as gaps:

  1. THREE-WAY MATCH  (PO ↔ Goods-Received-Note ↔ Invoice)
     /api/purchrec/match/exceptions  → live exceptions worklist
     /api/purchrec/match/{po_id}      → detailed match for one PO
     /api/purchrec/match/resolve      → mark exception resolved

  2. PAR-DRIVEN AUTO-PO
     /api/purchrec/par/levels                → list par levels per outlet × SKU
     /api/purchrec/par/levels                → POST upsert
     /api/purchrec/par/scan                  → scan stock vs par, emit suggested POs
     /api/purchrec/par/auto-po               → cut suggested POs into draft purchasing-approvals

All endpoints follow the platform's connection-check fallback pattern: read
live mongo first, fall back to deterministic seeded mocks if collections are
empty so the UI lights up out of the box.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import db

try:
    import event_bus
except Exception:
    event_bus = None  # type: ignore


def _emit(event_type: str, payload: dict, source: str = "purchrec") -> None:
    try:
        if event_bus is not None:
            event_bus.publish(event_type, payload, source=source)
    except Exception:
        pass

router = APIRouter(prefix="/api/purchrec", tags=["purchrec-sprint1"])


# ════════════════════ THREE-WAY MATCH ════════════════════

class MatchLine(BaseModel):
    sku: str
    description: str
    po_qty: float
    po_unit_price: float
    received_qty: float
    invoice_qty: float
    invoice_unit_price: float


class MatchResult(BaseModel):
    po_id: str
    vendor: str
    outlet: str
    status: str                      # ok | exception
    exceptions: List[str]
    lines: List[MatchLine]
    created_at: str


def _toy_match(po_id: str, vendor: str, outlet: str, lines: List[MatchLine]) -> MatchResult:
    excs: List[str] = []
    for ln in lines:
        if abs(ln.po_qty - ln.received_qty) > 0.001:
            excs.append(f"{ln.sku}: qty mismatch · PO {ln.po_qty} vs received {ln.received_qty}")
        if abs(ln.received_qty - ln.invoice_qty) > 0.001:
            excs.append(f"{ln.sku}: invoice qty {ln.invoice_qty} ≠ received {ln.received_qty}")
        if abs(ln.po_unit_price - ln.invoice_unit_price) > 0.001:
            pct = (ln.invoice_unit_price - ln.po_unit_price) / ln.po_unit_price * 100
            excs.append(
                f"{ln.sku}: price drift · PO ${ln.po_unit_price:.2f} → invoice "
                f"${ln.invoice_unit_price:.2f} ({pct:+.1f}%)"
            )
    return MatchResult(
        po_id=po_id, vendor=vendor, outlet=outlet,
        status="exception" if excs else "ok",
        exceptions=excs, lines=lines,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


_SEED_MATCHES: List[MatchResult] = [
    _toy_match("PO-1042", "Sysco SY1100", "Bistro 21", [
        MatchLine(sku="BEEF-FILET-8OZ", description="Beef Filet 8 oz",
                  po_qty=24, po_unit_price=18.50,
                  received_qty=24, invoice_qty=24, invoice_unit_price=18.50),
        MatchLine(sku="LOBSTER-1.5LB", description="Lobster 1.5 lb",
                  po_qty=12, po_unit_price=22.00,
                  received_qty=10, invoice_qty=12, invoice_unit_price=22.00),
        MatchLine(sku="OYSTER-DZ", description="Oysters · East Coast",
                  po_qty=20, po_unit_price=14.00,
                  received_qty=20, invoice_qty=20, invoice_unit_price=15.40),
    ]),
    _toy_match("PO-1044", "US Foods", "Pool Cabana", [
        MatchLine(sku="AHI-TUNA-LB", description="Ahi Tuna · sashimi grade",
                  po_qty=8, po_unit_price=28.00,
                  received_qty=8, invoice_qty=8, invoice_unit_price=28.00),
        MatchLine(sku="LIME-CASE", description="Limes · Persian · case",
                  po_qty=4, po_unit_price=32.00,
                  received_qty=4, invoice_qty=4, invoice_unit_price=32.00),
    ]),
    _toy_match("PO-1051", "Restaurant Depot", "Banquet Hall", [
        MatchLine(sku="CHIX-BREAST-CASE", description="Chicken breast · case",
                  po_qty=6, po_unit_price=85.00,
                  received_qty=6, invoice_qty=8, invoice_unit_price=85.00),
        MatchLine(sku="ROMAINE-CASE", description="Romaine hearts · case",
                  po_qty=4, po_unit_price=24.00,
                  received_qty=4, invoice_qty=4, invoice_unit_price=24.00),
    ]),
]


def _list_matches() -> List[MatchResult]:
    """Return matches from MongoDB, falling back to seed data for missing POs."""
    db_docs = {d["po_id"]: d for d in db["purchrec_match"].find({}, {"_id": 0})}
    
    # Start with seed data
    result: List[MatchResult] = []
    for seed in _SEED_MATCHES:
        if seed.po_id in db_docs:
            # Use DB version (may have resolution info)
            result.append(MatchResult(**db_docs[seed.po_id]))
        else:
            # Use seed version
            result.append(seed)
    
    return result


@router.get("/match/exceptions")
def list_exceptions():
    matches = _list_matches()
    excs = [m for m in matches if m.status == "exception"]
    total = len(matches)
    ok_count = total - len(excs)
    total_value_at_risk = 0.0
    for m in excs:
        for ln in m.lines:
            total_value_at_risk += abs(ln.invoice_qty - ln.received_qty) * ln.invoice_unit_price
            total_value_at_risk += abs(ln.invoice_unit_price - ln.po_unit_price) * ln.invoice_qty
    return {
        "summary": {
            "total_pos": total,
            "ok": ok_count,
            "exception": len(excs),
            "value_at_risk_usd": round(total_value_at_risk, 2),
        },
        "exceptions": [m.dict() for m in excs],
    }


@router.get("/match/{po_id}")
def get_match(po_id: str):
    for m in _list_matches():
        if m.po_id == po_id:
            return m.dict()
    raise HTTPException(404, f"PO {po_id} not found")


class ResolveReq(BaseModel):
    po_id: str
    note: str
    actor: str = "admin"


@router.post("/match/resolve")
def resolve_exception(req: ResolveReq):
    # First, get the full match data (from DB or seed)
    match_data = None
    for m in _list_matches():
        if m.po_id == req.po_id:
            match_data = m.dict()
            break
    
    if not match_data:
        raise HTTPException(404, f"PO {req.po_id} not found")
    
    # Update the match with resolution info
    match_data["status"] = "ok"
    match_data["resolution_note"] = req.note
    match_data["resolved_by"] = req.actor
    match_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    # Upsert the full document
    db["purchrec_match"].update_one(
        {"po_id": req.po_id},
        {"$set": match_data},
        upsert=True,
    )
    _emit("purchrec.match_resolved", {"po_id": req.po_id, "actor": req.actor})
    return {"ok": True, "po_id": req.po_id}


# ════════════════════ PAR-DRIVEN AUTO-PO ════════════════════

class ParLevel(BaseModel):
    outlet: str
    sku: str
    description: str
    par_qty: float
    reorder_point: float
    on_hand: float = 0
    vendor: str
    unit_price: float
    pack_size: float = 1


_SEED_PAR: List[ParLevel] = [
    ParLevel(outlet="Bistro 21", sku="BEEF-FILET-8OZ", description="Beef Filet 8 oz",
             par_qty=48, reorder_point=18, on_hand=12, vendor="Sysco SY1100",
             unit_price=18.50, pack_size=12),
    ParLevel(outlet="Bistro 21", sku="LOBSTER-1.5LB", description="Lobster 1.5 lb",
             par_qty=24, reorder_point=10, on_hand=6, vendor="Sysco SY1100",
             unit_price=22.00, pack_size=6),
    ParLevel(outlet="Bistro 21", sku="OYSTER-DZ", description="Oysters · East Coast",
             par_qty=40, reorder_point=15, on_hand=22, vendor="Sysco SY1100",
             unit_price=14.00, pack_size=20),
    ParLevel(outlet="Pool Cabana", sku="AHI-TUNA-LB", description="Ahi Tuna · sashimi grade",
             par_qty=20, reorder_point=8, on_hand=3, vendor="US Foods",
             unit_price=28.00, pack_size=4),
    ParLevel(outlet="Pool Cabana", sku="LIME-CASE", description="Limes · Persian · case",
             par_qty=8, reorder_point=3, on_hand=4, vendor="US Foods",
             unit_price=32.00, pack_size=1),
    ParLevel(outlet="Banquet Hall", sku="CHIX-BREAST-CASE", description="Chicken breast · case",
             par_qty=24, reorder_point=10, on_hand=11, vendor="Restaurant Depot",
             unit_price=85.00, pack_size=2),
    ParLevel(outlet="Banquet Hall", sku="ROMAINE-CASE", description="Romaine hearts · case",
             par_qty=12, reorder_point=5, on_hand=2, vendor="Restaurant Depot",
             unit_price=24.00, pack_size=4),
]


def _list_par() -> List[ParLevel]:
    docs = list(db["purchrec_par"].find({}, {"_id": 0}))
    if docs:
        return [ParLevel(**d) for d in docs]
    return _SEED_PAR


@router.get("/par/levels")
def list_par_levels(outlet: Optional[str] = None):
    rows = _list_par()
    if outlet:
        rows = [r for r in rows if r.outlet == outlet]
    return {"rows": [r.dict() for r in rows], "count": len(rows)}


class ParUpsertReq(BaseModel):
    rows: List[ParLevel]


@router.post("/par/levels")
def upsert_par_levels(req: ParUpsertReq):
    n = 0
    for r in req.rows:
        db["purchrec_par"].update_one(
            {"outlet": r.outlet, "sku": r.sku},
            {"$set": r.dict()},
            upsert=True,
        )
        n += 1
    return {"ok": True, "upserted": n}


class SuggestedLine(BaseModel):
    sku: str
    description: str
    qty_to_order: float
    pack_size: float
    packs: int
    unit_price: float
    extended: float


class SuggestedPO(BaseModel):
    suggested_po_id: str
    outlet: str
    vendor: str
    lines: List[SuggestedLine]
    total: float
    reason: str


def _ceil_to_pack(qty: float, pack: float) -> int:
    if pack <= 0:
        return int(qty)
    return int(-(-qty // pack))  # ceil division


def _scan() -> List[SuggestedPO]:
    rows = _list_par()
    by_outlet_vendor: dict = {}
    for r in rows:
        if r.on_hand >= r.reorder_point:
            continue
        gap = max(r.par_qty - r.on_hand, 0)
        if gap <= 0:
            continue
        packs = _ceil_to_pack(gap, r.pack_size)
        qty = packs * r.pack_size
        line = SuggestedLine(
            sku=r.sku, description=r.description,
            qty_to_order=qty, pack_size=r.pack_size, packs=packs,
            unit_price=r.unit_price, extended=round(qty * r.unit_price, 2),
        )
        key = (r.outlet, r.vendor)
        by_outlet_vendor.setdefault(key, []).append(line)

    out: List[SuggestedPO] = []
    for (outlet, vendor), lines in by_outlet_vendor.items():
        total = round(sum(l.extended for l in lines), 2)
        sig = hashlib.sha1(f"{outlet}:{vendor}:{datetime.now(timezone.utc).date()}".encode()).hexdigest()[:8]
        out.append(SuggestedPO(
            suggested_po_id=f"SPO-{sig}",
            outlet=outlet, vendor=vendor,
            lines=lines, total=total,
            reason=f"{len(lines)} SKU(s) below reorder point",
        ))
    return out


@router.get("/par/scan")
def par_scan():
    suggested = _scan()
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "suggested_po_count": len(suggested),
            "estimated_spend": round(sum(s.total for s in suggested), 2),
        },
        "suggestions": [s.dict() for s in suggested],
    }


class AutoPOReq(BaseModel):
    suggested_po_ids: Optional[List[str]] = None  # None = all
    actor: str = "admin"
    auto_submit: bool = True


@router.post("/par/auto-po")
def auto_po(req: AutoPOReq):
    """Convert suggested POs into draft purchasing-approval records."""
    suggested = _scan()
    chosen = [s for s in suggested if not req.suggested_po_ids or s.suggested_po_id in req.suggested_po_ids]
    created = []
    for s in chosen:
        po_id = s.suggested_po_id.replace("SPO-", "PO-")
        doc = {
            "po_id": po_id, "outlet": s.outlet, "vendor": s.vendor,
            "lines": [l.dict() for l in s.lines],
            "total_amount": s.total,
            "status": "submitted" if req.auto_submit else "draft",
            "created_by": "system:par-auto-po",
            "actor": req.actor,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "par-driven-auto-po",
        }
        db["purchasing_pos"].update_one({"po_id": po_id}, {"$set": doc}, upsert=True)
        created.append(doc)
    if created:
        _emit("purchrec.auto_po_created", {
            "count": len(created),
            "total_amount": round(sum(p.get("total_amount", 0) for p in created), 2),
            "actor": req.actor,
        })
    return {
        "ok": True,
        "created": len(created),
        "pos": created,
        "next_step": "Review in Purchasing Approvals → submit for sign-off chain",
    }
