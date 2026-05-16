"""
Echo AURION · Vendor Scorecard + Contract-Rate Compliance (PurchRec Sprint 2)

Closes two casino-grade gaps from PURCHREC_DEEP_DIVE_AUDIT_iter257:
  - Vendor performance scorecard: on-time %, fill-rate, quality complaints
  - Contract-rate compliance: detect when invoiced unit price drifts from
    the contract rate, surface the violations and rebate recovery

Endpoints:
  GET  /api/vendor-scorecard/scorecards
  GET  /api/vendor-scorecard/scorecards/{vendor_id}
  GET  /api/vendor-scorecard/contracts
  POST /api/vendor-scorecard/contracts          (upsert contract rate)
  GET  /api/vendor-scorecard/violations         (live invoice rate-violation list)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

try:
    import event_bus
except Exception:
    event_bus = None  # type: ignore


def _emit(event_type: str, payload: dict, source: str = "vendor-scorecard") -> None:
    try:
        if event_bus is not None:
            event_bus.publish(event_type, payload, source=source)
    except Exception:
        pass

router = APIRouter(prefix="/api/vendor-scorecard", tags=["vendor-scorecard"])


# ════════════════════ DATA MODELS ════════════════════

class Scorecard(BaseModel):
    vendor_id: str
    vendor_name: str
    period: str                          # "30d" | "90d" | "ytd"
    on_time_pct: float                   # 0..100
    fill_rate_pct: float                 # 0..100
    quality_complaints: int
    short_ships: int
    avg_lead_time_hrs: float
    avg_invoice_accuracy_pct: float
    rebate_eligible_usd: float
    overall_grade: str                   # A | B | C | D
    spend_period_usd: float
    risk: str                            # ok | watch | critical


class ContractRate(BaseModel):
    vendor_id: str
    sku: str
    description: str
    contract_unit_price: float
    valid_from: str
    valid_to: Optional[str] = None
    tolerance_pct: float = 1.0           # invoice price allowed to drift by this %


class Violation(BaseModel):
    vendor_id: str
    vendor_name: str
    sku: str
    description: str
    contract_unit_price: float
    invoiced_unit_price: float
    invoice_id: str
    invoice_date: str
    drift_pct: float
    severity: str                        # warn | critical
    extra_cost_usd: float


# ════════════════════ SEEDS (deterministic) ════════════════════

_SEED_SCORECARDS: List[Scorecard] = [
    Scorecard(
        vendor_id="sysco-sy1100", vendor_name="Sysco SY1100", period="90d",
        on_time_pct=94.2, fill_rate_pct=97.1, quality_complaints=2, short_ships=4,
        avg_lead_time_hrs=22.5, avg_invoice_accuracy_pct=96.8,
        rebate_eligible_usd=18420.00, overall_grade="A",
        spend_period_usd=486_220.00, risk="ok",
    ),
    Scorecard(
        vendor_id="us-foods", vendor_name="US Foods", period="90d",
        on_time_pct=88.4, fill_rate_pct=92.5, quality_complaints=5, short_ships=8,
        avg_lead_time_hrs=28.1, avg_invoice_accuracy_pct=91.2,
        rebate_eligible_usd=11200.00, overall_grade="B",
        spend_period_usd=312_855.00, risk="watch",
    ),
    Scorecard(
        vendor_id="restaurant-depot", vendor_name="Restaurant Depot", period="90d",
        on_time_pct=72.1, fill_rate_pct=86.3, quality_complaints=11, short_ships=14,
        avg_lead_time_hrs=14.2, avg_invoice_accuracy_pct=83.0,
        rebate_eligible_usd=0.00, overall_grade="D",
        spend_period_usd=98_402.00, risk="critical",
    ),
]

_SEED_CONTRACTS: List[ContractRate] = [
    ContractRate(vendor_id="sysco-sy1100", sku="BEEF-FILET-8OZ",
                 description="Beef Filet 8 oz", contract_unit_price=18.25,
                 valid_from="2026-01-01", valid_to="2026-12-31", tolerance_pct=1.5),
    ContractRate(vendor_id="sysco-sy1100", sku="OYSTER-DZ",
                 description="Oysters · East Coast", contract_unit_price=14.00,
                 valid_from="2026-01-01", valid_to="2026-12-31", tolerance_pct=2.0),
    ContractRate(vendor_id="sysco-sy1100", sku="LOBSTER-1.5LB",
                 description="Lobster 1.5 lb", contract_unit_price=22.00,
                 valid_from="2026-01-01", valid_to="2026-12-31", tolerance_pct=3.0),
    ContractRate(vendor_id="us-foods", sku="AHI-TUNA-LB",
                 description="Ahi Tuna · sashimi grade", contract_unit_price=27.50,
                 valid_from="2026-02-01", valid_to="2026-12-31", tolerance_pct=2.0),
]

_SEED_INVOICED: List[Dict] = [
    # (vendor, sku, invoiced_price, invoice_id, date)
    {"vendor_id":"sysco-sy1100","sku":"BEEF-FILET-8OZ","invoiced_unit_price":18.50,
     "invoice_id":"INV-2026-04-22-A","invoice_date":"2026-04-22"},
    {"vendor_id":"sysco-sy1100","sku":"OYSTER-DZ","invoiced_unit_price":15.40,
     "invoice_id":"INV-2026-04-22-A","invoice_date":"2026-04-22"},
    {"vendor_id":"sysco-sy1100","sku":"LOBSTER-1.5LB","invoiced_unit_price":22.00,
     "invoice_id":"INV-2026-04-22-A","invoice_date":"2026-04-22"},
    {"vendor_id":"us-foods","sku":"AHI-TUNA-LB","invoiced_unit_price":28.00,
     "invoice_id":"INV-2026-04-25-B","invoice_date":"2026-04-25"},
]


# ════════════════════ HELPERS ════════════════════

def _list_scorecards(period: str = "90d") -> List[Scorecard]:
    docs = list(db["vendor_scorecards"].find({"period": period}, {"_id": 0}))
    if docs:
        return [Scorecard(**d) for d in docs]
    return [s for s in _SEED_SCORECARDS if s.period == period] or _SEED_SCORECARDS


def _list_contracts() -> List[ContractRate]:
    docs = list(db["vendor_contracts"].find({}, {"_id": 0}))
    if docs:
        return [ContractRate(**d) for d in docs]
    return _SEED_CONTRACTS


def _list_invoiced() -> List[Dict]:
    docs = list(db["vendor_invoiced_lines"].find({}, {"_id": 0}))
    return docs or _SEED_INVOICED


# ════════════════════ ENDPOINTS ════════════════════

@router.get("/scorecards")
def list_scorecards(period: str = "90d"):
    cards = _list_scorecards(period)
    by_grade: Dict[str, int] = {}
    spend = 0.0
    rebates = 0.0
    for c in cards:
        by_grade[c.overall_grade] = by_grade.get(c.overall_grade, 0) + 1
        spend += c.spend_period_usd
        rebates += c.rebate_eligible_usd
    return {
        "period": period,
        "summary": {
            "vendors": len(cards),
            "by_grade": by_grade,
            "total_spend_usd": round(spend, 2),
            "rebate_recovery_pipeline_usd": round(rebates, 2),
        },
        "scorecards": [c.dict() for c in cards],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/scorecards/{vendor_id}")
def get_scorecard(vendor_id: str, period: str = "90d"):
    for c in _list_scorecards(period):
        if c.vendor_id == vendor_id:
            return c.dict()
    raise HTTPException(404, f"Vendor {vendor_id} not found")


@router.get("/contracts")
def list_contracts(vendor_id: Optional[str] = None):
    rows = _list_contracts()
    if vendor_id:
        rows = [r for r in rows if r.vendor_id == vendor_id]
    return {"rows": [r.dict() for r in rows], "count": len(rows)}


class ContractUpsert(BaseModel):
    rows: List[ContractRate]


@router.post("/contracts")
def upsert_contracts(req: ContractUpsert):
    n = 0
    for r in req.rows:
        db["vendor_contracts"].update_one(
            {"vendor_id": r.vendor_id, "sku": r.sku},
            {"$set": r.dict()},
            upsert=True,
        )
        n += 1
    return {"ok": True, "upserted": n}


@router.get("/violations")
def list_violations():
    """Compute live contract-rate violations from invoiced_lines vs contracts."""
    contracts = {(c.vendor_id, c.sku): c for c in _list_contracts()}
    vendor_names = {s.vendor_id: s.vendor_name for s in _list_scorecards("90d")}
    out: List[Violation] = []
    total_extra = 0.0
    for inv in _list_invoiced():
        c = contracts.get((inv["vendor_id"], inv["sku"]))
        if not c:
            continue
        drift_abs = inv["invoiced_unit_price"] - c.contract_unit_price
        drift_pct = (drift_abs / c.contract_unit_price * 100) if c.contract_unit_price else 0
        if abs(drift_pct) <= c.tolerance_pct:
            continue
        severity = "critical" if abs(drift_pct) >= 5 else "warn"
        # Assume avg qty 50 to estimate $ impact (real impl would join with qty)
        extra = round(drift_abs * 50, 2)
        total_extra += extra
        out.append(Violation(
            vendor_id=inv["vendor_id"],
            vendor_name=vendor_names.get(inv["vendor_id"], inv["vendor_id"]),
            sku=inv["sku"],
            description=c.description,
            contract_unit_price=c.contract_unit_price,
            invoiced_unit_price=inv["invoiced_unit_price"],
            invoice_id=inv["invoice_id"],
            invoice_date=inv["invoice_date"],
            drift_pct=round(drift_pct, 2),
            severity=severity,
            extra_cost_usd=extra,
        ))
    out.sort(key=lambda v: -abs(v.drift_pct))
    if out:
        _emit("vendor.contract_violation", {
            "violations": len(out),
            "estimated_overcharge_usd": round(total_extra, 2),
            "critical": sum(1 for v in out if v.severity == "critical"),
        })
    return {
        "summary": {
            "violations": len(out),
            "estimated_overcharge_usd": round(total_extra, 2),
            "critical": sum(1 for v in out if v.severity == "critical"),
            "warn": sum(1 for v in out if v.severity == "warn"),
        },
        "violations": [v.dict() for v in out],
    }
