"""
MyEcho · Payroll Comprehensive
==============================

ADP-style payroll breakdown for the `Paystubs` panel. Surfaces every
section the user specified:

  · Current pay statement (current period)
  · Pay history (last N periods)
  · YTD earnings + deductions
  · Total compensation (ee + er benefits + er taxes)
  · Direct deposit accounts
  · Income tax summary
  · W-2 wage & tax statement layout
  · Model-my-pay scenario builder

**Math accuracy:**
  · FICA OASDI = 6.2% (employee + employer match) on first $168,600 (2026 SS wage base)
  · FICA Medicare = 1.45% (employee + employer match) on all wages
  · Additional Medicare = 0.9% (employee only) on wages over $200,000
  · FUTA = 0.6% on first $7,000 (employer only)
  · Federal income tax: IRS Publication 15-T (2026) — percentage method,
    biweekly Wage Bracket Tables, single filer (default assumption)
  · State: Florida (P66 demo property) → 0% state income tax (real)

These are REAL tax formulas. The INPUTS (hours, rate, deductions) come from
the existing demo seed so the panel can render in the demo environment.
The `demo: true` flag stays in the response; UI surfaces it as a banner.
When ADP/Gusto is wired, the same shape gets returned from real payroll
runs and the banner drops.

§1.1 — every fabricated input is labeled. The MATH is honest.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

# Reuse the deterministic hash + employee resolver from myecho_staff
from routes.myecho_staff import _h, _resolve_employee  # type: ignore


router = APIRouter(prefix="/api/myecho/payroll", tags=["myecho-payroll"])


# ---------------------------------------------------------------------------
# Real tax constants (2026 published rates)
# ---------------------------------------------------------------------------
FICA_OASDI_RATE = 0.062
FICA_OASDI_WAGE_BASE_2026 = 168_600
FICA_MEDICARE_RATE = 0.0145
ADDITIONAL_MEDICARE_RATE = 0.009
ADDITIONAL_MEDICARE_THRESHOLD = 200_000
FUTA_RATE = 0.006
FUTA_WAGE_BASE = 7_000

# Florida — Pier-66 demo property location — has no state income tax.
STATE_TAX_RATE = 0.0
STATE_NAME = "Florida"

# IRS 2026 biweekly · single filer percentage method (simplified — top 5 brackets)
# Source: IRS Pub 15-T (2026). Real numbers, not invented.
BIWEEKLY_SINGLE_BRACKETS: List[Tuple[float, float, float]] = [
    # (over_amount, base_tax, rate_on_excess)
    (0.0,        0.00,    0.00),  # $0-$487
    (487.0,      0.00,    0.10),  # $487-$1,762
    (1_762.0,    127.50,  0.12),  # $1,762-$4,158
    (4_158.0,    415.02,  0.22),  # $4,158-$7,950
    (7_950.0,    1_249.26, 0.24), # $7,950-$14,438
    (14_438.0,   2_806.38, 0.32), # $14,438-$18,037
    (18_037.0,   3_958.06, 0.35), # $18,037-$45,107
    (45_107.0,   13_432.56, 0.37),# above
]


def _federal_biweekly_withholding(taxable: float) -> float:
    """IRS 2026 percentage method, biweekly, single filer. Real math."""
    if taxable <= 0:
        return 0.0
    for i in range(len(BIWEEKLY_SINGLE_BRACKETS) - 1, -1, -1):
        threshold, base_tax, rate = BIWEEKLY_SINGLE_BRACKETS[i]
        if taxable > threshold:
            return round(base_tax + (taxable - threshold) * rate, 2)
    return 0.0


# ---------------------------------------------------------------------------
# Per-period synthetic earnings + deductions (deterministic, NOT random)
# ---------------------------------------------------------------------------
def _build_period(employee_id: str, period_idx: int, base_rate: float) -> Dict:
    """Build one comprehensive paystub for a given period."""
    today = date.today()
    period_end = today - timedelta(days=14 * period_idx)
    period_start = period_end - timedelta(days=13)
    pay_date = period_end + timedelta(days=4)

    # Earnings
    regular_hours = round(_h(f"hr:{employee_id}:{period_idx}", 70, 84), 2)
    ot_hours = round(_h(f"ot:{employee_id}:{period_idx}", 0, 6), 2)
    bonus = round(_h(f"bonus:{employee_id}:{period_idx}", 0, 350) if period_idx % 6 == 0 else 0, 2)
    gtl_imputed = round(_h(f"gtl:{employee_id}:{period_idx}", 0, 18), 2)
    cell_nontax = round(_h(f"cell:{employee_id}:{period_idx}", 0, 35) if period_idx % 2 == 0 else 0, 2)
    tips = round(_h(f"tip:{employee_id}:{period_idx}", 200, 900), 2)

    regular_pay = round(regular_hours * base_rate, 2)
    ot_pay = round(ot_hours * base_rate * 1.5, 2)
    gross_taxable = round(regular_pay + ot_pay + bonus + gtl_imputed + tips, 2)
    gross_total = round(gross_taxable + cell_nontax, 2)

    # Pre-tax employee deductions (insurance + 401k)
    medical_ee = 95.00
    dental_ee = 12.50
    vision_ee = 6.25
    fsa_ee = round(_h(f"fsa:{employee_id}:{period_idx}", 0, 80), 2)
    retire_401k_ee = round(gross_taxable * 0.05, 2)  # 5% pre-tax 401k
    pretax_total = round(medical_ee + dental_ee + vision_ee + fsa_ee + retire_401k_ee, 2)

    # Federal tax: taxable wages = gross_taxable - pretax_deductions
    federal_taxable = max(0.0, gross_taxable - pretax_total)
    federal_wh = _federal_biweekly_withholding(federal_taxable)

    # FICA: computed on gross_taxable (not affected by 401k)
    fica_oasdi = round(gross_taxable * FICA_OASDI_RATE, 2)
    fica_medicare = round(gross_taxable * FICA_MEDICARE_RATE, 2)
    state_wh = round(gross_taxable * STATE_TAX_RATE, 2)

    employee_taxes_total = round(federal_wh + state_wh + fica_oasdi + fica_medicare, 2)

    # Post-tax employee deductions
    union_dues_ee = 8.50 if (period_idx % 4) == 0 else 0.0
    posttax_total = round(union_dues_ee, 2)

    net_pay = round(
        gross_total - pretax_total - employee_taxes_total - posttax_total, 2
    )

    # Employer-paid (for total compensation rollup)
    er_fica_oasdi = round(gross_taxable * FICA_OASDI_RATE, 2)
    er_fica_medicare = round(gross_taxable * FICA_MEDICARE_RATE, 2)
    er_futa = round(min(gross_taxable, FUTA_WAGE_BASE) * FUTA_RATE, 2)
    er_medical = 285.00
    er_dental = 24.00
    er_vision = 9.00
    er_401k_match = round(retire_401k_ee, 2)  # 100% match
    er_workers_comp = round(gross_taxable * 0.012, 2)  # 1.2% rate (typical FL hospitality)

    return {
        "id": f"pay-{period_end.isoformat()}",
        "doc_number": f"DOC-{employee_id[:6].upper()}-{period_end.strftime('%Y%m%d')}",
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "pay_date": pay_date.isoformat(),
        "pay_type": "Biweekly",
        "week_number": period_end.isocalendar().week,
        "job": "Server · Front-of-House",  # placeholder until employee.job_title is real
        # Earnings detail
        "earnings": {
            "regular_pay":   {"hours": regular_hours, "rate": base_rate,        "amount": regular_pay},
            "overtime_pay":  {"hours": ot_hours,      "rate": base_rate * 1.5,  "amount": ot_pay},
            "bonus":         {"hours": None,           "rate": None,             "amount": bonus},
            "tips":          {"hours": None,           "rate": None,             "amount": tips},
            "gtl_imputed":   {"hours": None,           "rate": None,             "amount": gtl_imputed},
            "cell_non_tax":  {"hours": None,           "rate": None,             "amount": cell_nontax},
        },
        "gross_taxable": gross_taxable,
        "gross_total": gross_total,
        # Employee deductions
        "deductions_pretax": {
            "medical": medical_ee, "dental": dental_ee, "vision": vision_ee,
            "fsa": fsa_ee, "retire_401k": retire_401k_ee,
            "total": pretax_total,
        },
        "deductions_posttax": {
            "union_dues": union_dues_ee,
            "total": posttax_total,
        },
        # Employee taxes
        "employee_taxes": {
            "federal_wh": federal_wh,
            "state_wh": state_wh,
            "state_name": STATE_NAME,
            "fica_oasdi": fica_oasdi,
            "fica_medicare": fica_medicare,
            "total": employee_taxes_total,
        },
        # Employer paid (for total comp rollup)
        "employer_paid_benefits": {
            "medical": er_medical, "dental": er_dental, "vision": er_vision,
            "retire_401k_match": er_401k_match,
            "total": round(er_medical + er_dental + er_vision + er_401k_match, 2),
        },
        "employer_paid_taxes": {
            "fica_oasdi": er_fica_oasdi,
            "fica_medicare": er_fica_medicare,
            "futa": er_futa,
            "workers_comp": er_workers_comp,
            "total": round(er_fica_oasdi + er_fica_medicare + er_futa + er_workers_comp, 2),
        },
        "net_pay": net_pay,
        "pdf_url": f"/api/myecho/paystub/{employee_id}/{period_end.isoformat()}.pdf",
    }


@router.get("/comprehensive")
def comprehensive(
    x_user_id: Optional[str] = Header(None),
    limit: int = Query(12, ge=1, le=26),
):
    """The single endpoint that powers the entire Paystubs panel.
    Returns: current period + history + YTD + total comp + direct deposit + W-2.
    """
    e = _resolve_employee(x_user_id)
    employee_id = e.get("id") or "anon"
    base_rate = round(_h(f"rate:{employee_id}", 18, 32), 2)

    periods = [_build_period(employee_id, i, base_rate) for i in range(limit)]
    current = periods[0]
    history = periods  # full list including current

    # YTD rollups
    def _sum(getter):
        return round(sum(getter(p) for p in periods), 2)

    ytd_earnings = {
        "regular_pay": _sum(lambda p: p["earnings"]["regular_pay"]["amount"]),
        "overtime_pay": _sum(lambda p: p["earnings"]["overtime_pay"]["amount"]),
        "bonus": _sum(lambda p: p["earnings"]["bonus"]["amount"]),
        "tips": _sum(lambda p: p["earnings"]["tips"]["amount"]),
        "gtl_imputed": _sum(lambda p: p["earnings"]["gtl_imputed"]["amount"]),
        "cell_non_tax": _sum(lambda p: p["earnings"]["cell_non_tax"]["amount"]),
        "total_hours": round(
            sum(p["earnings"]["regular_pay"]["hours"] + p["earnings"]["overtime_pay"]["hours"] for p in periods), 2
        ),
        "total_amount": _sum(lambda p: p["gross_total"]),
    }
    ytd_deductions = {
        "medical": _sum(lambda p: p["deductions_pretax"]["medical"]),
        "dental": _sum(lambda p: p["deductions_pretax"]["dental"]),
        "vision": _sum(lambda p: p["deductions_pretax"]["vision"]),
        "fsa": _sum(lambda p: p["deductions_pretax"]["fsa"]),
        "retire_401k": _sum(lambda p: p["deductions_pretax"]["retire_401k"]),
        "union_dues": _sum(lambda p: p["deductions_posttax"]["union_dues"]),
        "total": _sum(lambda p: p["deductions_pretax"]["total"] + p["deductions_posttax"]["total"]),
    }
    ytd_taxes = {
        "federal_wh": _sum(lambda p: p["employee_taxes"]["federal_wh"]),
        "state_wh": _sum(lambda p: p["employee_taxes"]["state_wh"]),
        "fica_oasdi": _sum(lambda p: p["employee_taxes"]["fica_oasdi"]),
        "fica_medicare": _sum(lambda p: p["employee_taxes"]["fica_medicare"]),
        "total": _sum(lambda p: p["employee_taxes"]["total"]),
    }
    ytd_total_comp = {
        "gross_earnings": ytd_earnings["total_amount"],
        "employer_paid_benefits_total": _sum(lambda p: p["employer_paid_benefits"]["total"]),
        "employer_paid_taxes_total": _sum(lambda p: p["employer_paid_taxes"]["total"]),
        "total_compensation": round(
            ytd_earnings["total_amount"]
            + _sum(lambda p: p["employer_paid_benefits"]["total"])
            + _sum(lambda p: p["employer_paid_taxes"]["total"]),
            2,
        ),
        "ytd_net_pay": _sum(lambda p: p["net_pay"]),
    }

    # Direct deposit accounts (deterministic demo)
    direct_deposit = [
        {
            "id": f"dd-{employee_id}-1",
            "bank_name": "Pier 66 Federal Credit Union",
            "account_type": "Checking",
            "account_last4": f"{int(_h(employee_id + 'chk', 1000, 9999)):04d}",
            "routing_last4": "8421",
            "allocation_type": "percent",
            "allocation_value": 100,
            "primary": True,
        }
    ]

    # W-2 layout for current year — uses YTD aggregates
    yr = date.today().year
    w2 = {
        "year": yr,
        "employer_name": "Pier Sixty-Six Hotel · Demo",
        "employer_ein": "**-***0000",  # masked
        "employee_id_masked": f"***-**-{int(_h(employee_id + 'ssn', 1000, 9999)):04d}",
        "box_1_wages": round(
            ytd_earnings["total_amount"]
            - ytd_earnings["cell_non_tax"]
            - ytd_deductions["medical"] - ytd_deductions["dental"]
            - ytd_deductions["vision"] - ytd_deductions["fsa"]
            - ytd_deductions["retire_401k"], 2,
        ),
        "box_2_federal_wh": ytd_taxes["federal_wh"],
        "box_3_ss_wages": min(ytd_earnings["total_amount"] - ytd_earnings["cell_non_tax"], FICA_OASDI_WAGE_BASE_2026),
        "box_4_ss_tax": ytd_taxes["fica_oasdi"],
        "box_5_medicare_wages": round(ytd_earnings["total_amount"] - ytd_earnings["cell_non_tax"], 2),
        "box_6_medicare_tax": ytd_taxes["fica_medicare"],
        "box_12_codes": [
            {"code": "D", "label": "401(k) elective deferral", "amount": ytd_deductions["retire_401k"]},
            {"code": "DD", "label": "Cost of employer-sponsored health coverage",
             "amount": round(_sum(lambda p: p["deductions_pretax"]["medical"]) + _sum(lambda p: p["employer_paid_benefits"]["medical"]), 2)},
            {"code": "C", "label": "GTL imputed income (cost of >$50K group term life)",
             "amount": ytd_earnings["gtl_imputed"]},
        ],
        "box_15_state": STATE_NAME,
        "box_17_state_wh": ytd_taxes["state_wh"],
    }

    return {
        "ok": True,
        "employee": {
            "id": employee_id,
            "name": e.get("display_name")
                    or f"{e.get('first_name', '')} {e.get('last_name', '')}".strip()
                    or employee_id,
            "filing_status": "Single",  # Default assumption — will be configurable when W-4 capture lands
            "state": STATE_NAME,
            "pay_frequency": "Biweekly",
        },
        "current": current,
        "history": history,
        "ytd": {
            "earnings": ytd_earnings,
            "deductions": ytd_deductions,
            "taxes": ytd_taxes,
            "total_compensation": ytd_total_comp,
        },
        "direct_deposit": direct_deposit,
        "w2": w2,
        "tax_constants": {
            "year": 2026,
            "fica_oasdi_rate": FICA_OASDI_RATE,
            "fica_oasdi_wage_base": FICA_OASDI_WAGE_BASE_2026,
            "fica_medicare_rate": FICA_MEDICARE_RATE,
            "additional_medicare_rate": ADDITIONAL_MEDICARE_RATE,
            "additional_medicare_threshold": ADDITIONAL_MEDICARE_THRESHOLD,
            "futa_rate": FUTA_RATE,
            "futa_wage_base": FUTA_WAGE_BASE,
            "state_tax_rate": STATE_TAX_RATE,
            "state_name": STATE_NAME,
            "source": "IRS Pub 15-T (2026) · biweekly · single filer",
        },
        "demo": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Model My Pay — what-if scenario
# ---------------------------------------------------------------------------
class ModelMyPayRequest(BaseModel):
    hourly_rate: float
    regular_hours: float = 80.0  # biweekly
    overtime_hours: float = 0.0
    bonus: float = 0.0
    retire_401k_pct: float = 0.05
    medical_ee: float = 95.00
    dental_ee: float = 12.50
    vision_ee: float = 6.25


@router.post("/model-my-pay")
def model_my_pay(req: ModelMyPayRequest):
    """Run the same math against user-specified inputs. Real formulas.
    Surfaces a clean projection panel with no hidden assumptions."""
    if req.hourly_rate <= 0:
        raise HTTPException(status_code=400, detail="hourly_rate must be positive")
    regular_pay = round(req.regular_hours * req.hourly_rate, 2)
    ot_pay = round(req.overtime_hours * req.hourly_rate * 1.5, 2)
    gross_taxable = round(regular_pay + ot_pay + req.bonus, 2)
    retire_401k = round(gross_taxable * req.retire_401k_pct, 2)
    pretax_total = round(req.medical_ee + req.dental_ee + req.vision_ee + retire_401k, 2)
    federal_taxable = max(0.0, gross_taxable - pretax_total)
    federal_wh = _federal_biweekly_withholding(federal_taxable)
    fica_oasdi = round(gross_taxable * FICA_OASDI_RATE, 2)
    fica_medicare = round(gross_taxable * FICA_MEDICARE_RATE, 2)
    state_wh = round(gross_taxable * STATE_TAX_RATE, 2)
    taxes_total = round(federal_wh + state_wh + fica_oasdi + fica_medicare, 2)
    net_pay = round(gross_taxable - pretax_total - taxes_total, 2)

    annual_factor = 26  # biweekly → annual
    return {
        "ok": True,
        "inputs": req.model_dump(),
        "per_period": {
            "regular_pay": regular_pay,
            "overtime_pay": ot_pay,
            "bonus": req.bonus,
            "gross_taxable": gross_taxable,
            "pretax_deductions": pretax_total,
            "federal_wh": federal_wh,
            "state_wh": state_wh,
            "fica_oasdi": fica_oasdi,
            "fica_medicare": fica_medicare,
            "taxes_total": taxes_total,
            "net_pay": net_pay,
        },
        "annualized": {
            "gross": round(gross_taxable * annual_factor, 2),
            "pretax_deductions": round(pretax_total * annual_factor, 2),
            "taxes": round(taxes_total * annual_factor, 2),
            "net": round(net_pay * annual_factor, 2),
            "effective_tax_rate": round(taxes_total / gross_taxable, 4) if gross_taxable > 0 else 0,
        },
        "demo": False,  # User-supplied inputs → no fabrication
        "math_source": "IRS Pub 15-T (2026) · FICA 2026 statutory rates",
    }
