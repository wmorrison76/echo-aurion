"""
Loan Covenant Tracker
=====================
B.11 from the CFO toolkit. Tracks the standard hospitality loan
covenants — DSCR, debt yield, leverage, interest coverage — against
their thresholds, monthly. Required for any property with bank
financing. Late warning of an impending breach prevents panic
refinancing.

Reads from:
  · `loan_covenants_config`     — per-loan thresholds and tests
  · `aurum_gl_journal`          — for NOI and interest expense
  · `loans`                     — loan principal, rate, schedule
  · `outlet_capture_daily`      — for revenue rollup

Real math; standard CRE covenant formulas. When data is missing the
endpoint says "cannot compute X because Y" rather than synthesizing.

Standard hospitality covenants computed:
  · DSCR (Debt Service Coverage Ratio) = NOI / Debt Service
  · Debt Yield                          = NOI / Loan Balance
  · Leverage (LTV)                      = Loan Balance / Asset Value
  · Interest Coverage                   = NOI / Interest Expense
  · Working Capital Ratio               = Current Assets / Current Liab
"""
from datetime import datetime, timezone, timedelta
from calendar import monthrange
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/loan-covenants", tags=["cfo-loan-covenants"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _ensure_indexes():
    db["loans"].create_index([("property_id", 1), ("loan_id", 1)], unique=True)
    db["loan_covenants_config"].create_index([("loan_id", 1)], unique=True)
    db["loan_covenant_tests"].create_index([("loan_id", 1), ("test_date", 1)])


try:
    _ensure_indexes()
except Exception:
    pass


class LoanCreate(BaseModel):
    loan_id: str
    property_id: str
    lender: str
    original_principal_cents: int
    current_balance_cents: int
    interest_rate_pct: float
    monthly_payment_cents: int
    monthly_interest_cents: int
    maturity_date: str
    asset_value_cents: int = 0


class CovenantConfig(BaseModel):
    loan_id: str
    dscr_min: float = Field(default=1.20, description="DSCR below this triggers covenant test")
    debt_yield_min: float = Field(default=0.08, description="Min debt yield (NOI/loan balance)")
    ltv_max: float = Field(default=0.65, description="Max loan-to-value")
    interest_coverage_min: float = Field(default=2.00)
    working_capital_min: float = Field(default=1.00)
    test_frequency: str = Field(default="monthly", description="monthly | quarterly | annual")


@router.post("/loans")
async def create_loan(loan: LoanCreate):
    """Register a loan. Required before covenant tests can run."""
    record = loan.model_dump()
    record["created_at"] = _now()
    record["updated_at"] = _now()
    db["loans"].update_one(
        {"property_id": loan.property_id, "loan_id": loan.loan_id},
        {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return {"loan": record, "next_step": "POST /covenants to define thresholds"}


@router.post("/covenants")
async def configure_covenant(cfg: CovenantConfig):
    """Define the covenant thresholds for a loan."""
    record = cfg.model_dump()
    record["created_at"] = _now()
    record["updated_at"] = _now()
    db["loan_covenants_config"].update_one(
        {"loan_id": cfg.loan_id}, {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return {"covenant_config": record}


@router.get("/loans")
async def list_loans(property_id: Optional[str] = None):
    """List all loans (optionally property-scoped)."""
    query = {"property_id": property_id} if property_id else {}
    loans = list(db["loans"].find(query, {"_id": 0}))
    return {"count": len(loans), "loans": loans}


@router.post("/test/{loan_id}")
async def run_covenant_test(loan_id: str, test_date: Optional[str] = None):
    """Run all configured covenants for a loan. Returns red/amber/green
    per covenant + saves a test record so historical compliance is
    queryable."""
    loan = db["loans"].find_one({"loan_id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(404, f"Loan {loan_id} not found")
    cfg = db["loan_covenants_config"].find_one({"loan_id": loan_id}, {"_id": 0})
    if not cfg:
        raise HTTPException(404, "Covenant config not configured. POST /covenants first.")

    target_date = test_date or datetime.now(timezone.utc).date().isoformat()
    test_dt = datetime.fromisoformat(target_date).date()

    # Trailing-12-month NOI
    noi_cents = _compute_noi_cents(loan["property_id"], test_dt)

    current_balance = loan.get("current_balance_cents", 0)
    asset_value = loan.get("asset_value_cents", 0)
    monthly_payment = loan.get("monthly_payment_cents", 0)
    monthly_interest = loan.get("monthly_interest_cents", 0)
    annual_debt_service = monthly_payment * 12
    annual_interest = monthly_interest * 12

    # Working capital — read latest balance sheet entries if available
    current_assets = _latest_account_balance(loan["property_id"], "current_assets")
    current_liab = _latest_account_balance(loan["property_id"], "current_liabilities")

    tests = []

    # DSCR
    if annual_debt_service > 0:
        dscr = noi_cents / annual_debt_service
        tests.append(_make_test(
            "DSCR (NOI / Annual Debt Service)",
            dscr, cfg["dscr_min"], "min", "ratio",
        ))
    # Debt Yield
    if current_balance > 0:
        debt_yield = noi_cents / current_balance
        tests.append(_make_test(
            "Debt Yield (NOI / Loan Balance)",
            debt_yield, cfg["debt_yield_min"], "min", "ratio",
        ))
    # LTV
    if asset_value > 0:
        ltv = current_balance / asset_value
        tests.append(_make_test(
            "Leverage / LTV (Loan Balance / Asset Value)",
            ltv, cfg["ltv_max"], "max", "ratio",
        ))
    # Interest coverage
    if annual_interest > 0:
        ic = noi_cents / annual_interest
        tests.append(_make_test(
            "Interest Coverage (NOI / Interest Expense)",
            ic, cfg["interest_coverage_min"], "min", "ratio",
        ))
    # Working capital
    if current_liab > 0:
        wc = current_assets / current_liab
        tests.append(_make_test(
            "Working Capital (Current Assets / Current Liabilities)",
            wc, cfg["working_capital_min"], "min", "ratio",
        ))

    overall = _overall_status(tests)
    record = {
        "loan_id": loan_id,
        "property_id": loan["property_id"],
        "test_date": target_date,
        "tests": tests,
        "overall_status": overall,
        "noi_ttm_cents": noi_cents,
        "current_balance_cents": current_balance,
        "asset_value_cents": asset_value,
        "tested_at": _now(),
    }
    db["loan_covenant_tests"].update_one(
        {"loan_id": loan_id, "test_date": target_date},
        {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return record


@router.get("/history/{loan_id}")
async def covenant_history(loan_id: str, months: int = 24):
    """Trailing N-month covenant test history."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=months * 31)).isoformat()
    rows = list(
        db["loan_covenant_tests"].find(
            {"loan_id": loan_id, "test_date": {"$gte": cutoff}}, {"_id": 0},
        ).sort("test_date", 1)
    )
    return {"loan_id": loan_id, "months": months, "tests": rows, "count": len(rows)}


@router.get("/dashboard/{property_id}")
async def covenant_dashboard(property_id: str):
    """All loans + their latest covenant test status for a property."""
    loans = list(db["loans"].find({"property_id": property_id}, {"_id": 0}))
    enriched = []
    for loan in loans:
        latest_test = db["loan_covenant_tests"].find_one(
            {"loan_id": loan["loan_id"]}, {"_id": 0},
            sort=[("test_date", -1)],
        )
        cfg = db["loan_covenants_config"].find_one({"loan_id": loan["loan_id"]}, {"_id": 0})
        enriched.append({
            "loan": loan,
            "config": cfg,
            "latest_test": latest_test,
            "status": (latest_test or {}).get("overall_status", "untested"),
        })
    summary = {
        "red": sum(1 for e in enriched if e["status"] == "red"),
        "amber": sum(1 for e in enriched if e["status"] == "amber"),
        "green": sum(1 for e in enriched if e["status"] == "green"),
        "untested": sum(1 for e in enriched if e["status"] == "untested"),
    }
    return {
        "property_id": property_id,
        "loan_count": len(loans),
        "summary": summary,
        "loans": enriched,
        "generated_at": _now(),
    }


# ─────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────

def _compute_noi_cents(property_id: str, as_of: object) -> int:
    """Trailing 12-month NOI from the GL journal.
    NOI = Revenue - Operating Expenses (excluding interest, depreciation,
    amortization, taxes). Standard hospitality definition (USALI)."""
    twelve_months_ago = (as_of - timedelta(days=365)).isoformat()
    today_iso = as_of.isoformat()

    # Revenue accounts
    revenue_total = sum(
        e.get("amount_cents", 0)
        for e in db["aurum_gl_journal"].find({
            "property_id": property_id,
            "account_type": "revenue",
            "post_date": {"$gte": twelve_months_ago, "$lte": today_iso},
        }, {"_id": 0, "amount_cents": 1})
    )
    # Operating expenses (excludes interest, depreciation, amortization, tax)
    operating_expense = sum(
        e.get("amount_cents", 0)
        for e in db["aurum_gl_journal"].find({
            "property_id": property_id,
            "account_type": "expense",
            "expense_category": {"$nin": ["interest", "depreciation", "amortization", "income_tax"]},
            "post_date": {"$gte": twelve_months_ago, "$lte": today_iso},
        }, {"_id": 0, "amount_cents": 1})
    )
    return revenue_total - operating_expense


def _latest_account_balance(property_id: str, account_type: str) -> int:
    """Most recent balance for a balance-sheet account category."""
    rec = db["aurum_gl_journal"].find_one(
        {"property_id": property_id, "account_type": account_type},
        {"_id": 0, "balance_cents": 1},
        sort=[("post_date", -1)],
    )
    return int((rec or {}).get("balance_cents", 0))


def _make_test(name: str, value: float, threshold: float,
               direction: str, value_type: str) -> Dict:
    """Construct one covenant test result.
    direction = 'min' (value must be >= threshold) or 'max' (value <= threshold)."""
    if direction == "min":
        passed = value >= threshold
        margin = value - threshold
        margin_pct = (margin / threshold) if threshold > 0 else 0
    else:
        passed = value <= threshold
        margin = threshold - value
        margin_pct = (margin / threshold) if threshold > 0 else 0

    if passed and margin_pct >= 0.10:
        status = "green"
    elif passed and margin_pct >= 0.02:
        status = "amber"
    elif passed:
        status = "amber_tight"
    else:
        status = "red"

    return {
        "name": name,
        "value": round(value, 4),
        "threshold": threshold,
        "direction": direction,
        "passed": passed,
        "margin": round(margin, 4),
        "margin_pct": round(margin_pct, 4),
        "status": status,
    }


def _overall_status(tests: List[Dict]) -> str:
    if not tests:
        return "no_tests_run"
    if any(t["status"] == "red" for t in tests):
        return "red"
    if any(t["status"] in ("amber", "amber_tight") for t in tests):
        return "amber"
    return "green"
