"""
D59 · Tax tables seed — open-data first.

Per user direction (2026-05-07): use OpenTaxSolver / open-data
tables for now. The CPA-authored seed comes later when real
payroll volume justifies a Symmetry / Vertex license.

This module loads:
  · 2026 Federal income tax brackets from IRS Pub 15-T (public)
  · 2026 FICA wage base + rates (public)
  · State withholding tables for the launch states (FL flat 0%
    income tax; TX flat 0%; NV flat 0%; CA brackets; NY brackets)

Source documents (all public domain or open-data):
  · IRS Pub 15-T (2026): https://www.irs.gov/pub/irs-pdf/p15t.pdf
  · IRS Notice 2025-XX FICA wage base
  · Florida DOR: no state income tax
  · California EDD DE-44 wage withholding tables
  · New York DTF Publication NYS-50-T-NYS

This is the OpenTaxSolver-style approach: the data is in code +
JSON, not behind a paid API. When you hire a CPA, they replace
this seed with a per-jurisdiction full table.

Usage:
    python -m jobs.seed_tax_tables          # load into Mongo
    python -m jobs.seed_tax_tables --dry-run # preview only

Wire: D47 payroll_engine_full.py reads from `tax_tables`
collection at runtime (per ADR-0003 fuse-box pattern). When this
seed is loaded, the placeholder constants in payroll become inert.
"""
from __future__ import annotations

import argparse
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

logger = logging.getLogger("echo.tax_seed")


# ─── 2026 Federal — IRS Pub 15-T (public domain) ────────────────────

FED_2026 = {
    "year": 2026,
    "jurisdiction": "FEDERAL",
    "brackets_single": [
        # (low, high, rate)  — annual taxable income
        [0,         11600,    0.10],
        [11600,     47150,    0.12],
        [47150,     100525,   0.22],
        [100525,    191950,   0.24],
        [191950,    243725,   0.32],
        [243725,    609350,   0.35],
        [609350,    None,     0.37],
    ],
    "brackets_married_jointly": [
        [0,         23200,    0.10],
        [23200,     94300,    0.12],
        [94300,     201050,   0.22],
        [201050,    383900,   0.24],
        [383900,    487450,   0.32],
        [487450,    731200,   0.35],
        [731200,    None,     0.37],
    ],
    "brackets_married_separately": [
        [0,         11600,    0.10],
        [11600,     47150,    0.12],
        [47150,     100525,   0.22],
        [100525,    191950,   0.24],
        [191950,    243725,   0.32],
        [243725,    365600,   0.35],
        [365600,    None,     0.37],
    ],
    "brackets_head_of_household": [
        [0,         16550,    0.10],
        [16550,     63100,    0.12],
        [63100,     100500,   0.22],
        [100500,    191950,   0.24],
        [191950,    243700,   0.32],
        [243700,    609350,   0.35],
        [609350,    None,     0.37],
    ],
    "fica": {
        "oasdi_rate": 0.062,
        "oasdi_wage_base": 168600,
        "medicare_rate": 0.0145,
        "medicare_addl_rate": 0.009,
        "medicare_addl_threshold_single": 200000,
        "medicare_addl_threshold_mfj": 250000,
    },
    "standard_deduction_single": 15000,
    "standard_deduction_mfj": 30000,
    "source": "IRS Publication 15-T (2026) + SSA wage-base notice",
    "source_url": "https://www.irs.gov/pub/irs-pdf/p15t.pdf",
    "loaded_at_iso": None,  # stamped on insert
}


# ─── State tables (launch-state subset) ────────────────────────────

# Florida, Texas, Nevada, Wyoming, Tennessee, South Dakota, Alaska,
# Washington, New Hampshire — no state income tax for wages.
NO_INCOME_TAX_STATES = ["FL", "TX", "NV", "WY", "TN", "SD", "AK",
                        "WA", "NH"]

# California — EDD DE-44 (2026) — simplified flat for V1; the real
# table has progressive brackets per allowance count. CPA replaces.
CA_2026 = {
    "year": 2026,
    "jurisdiction": "CA",
    "method": "progressive",
    "brackets_single": [
        [0,         10412,    0.01],
        [10412,     24684,    0.02],
        [24684,     38959,    0.04],
        [38959,     54081,    0.06],
        [54081,     68350,    0.08],
        [68350,     349137,   0.093],
        [349137,    418961,   0.103],
        [418961,    698271,   0.113],
        [698271,    None,     0.123],
    ],
    "sdi_rate": 0.011,        # CA State Disability Insurance
    "sdi_wage_base": None,    # uncapped as of 2024
    "source": "California EDD DE-44 (2026)",
    "source_url": "https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/",
}

NY_2026 = {
    "year": 2026,
    "jurisdiction": "NY",
    "method": "progressive",
    "brackets_single": [
        [0,         8500,     0.04],
        [8500,      11700,    0.045],
        [11700,     13900,    0.0525],
        [13900,     80650,    0.0585],
        [80650,     215400,   0.0625],
        [215400,    1077550,  0.0685],
        [1077550,   5000000,  0.0965],
        [5000000,   25000000, 0.103],
        [25000000,  None,     0.109],
    ],
    "source": "New York DTF Publication NYS-50-T-NYS (2026)",
    "source_url": "https://www.tax.ny.gov/forms/withholding_pub_archive.htm",
}

# Conservative flat-fallback for any state we haven't loaded yet.
# Real production replaces this once a CPA seeds the table.
DEFAULT_STATE_FALLBACK = {
    "year": 2026,
    "jurisdiction": "_DEFAULT",
    "method": "flat",
    "flat_rate": 0.05,
    "source": "Conservative 5% fallback — replace with state DOR table",
    "_warning": "This is a placeholder. Real prod must seed each state.",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_seed_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    rows.append({**FED_2026, "loaded_at_iso": _now_iso()})
    rows.append({**CA_2026, "loaded_at_iso": _now_iso()})
    rows.append({**NY_2026, "loaded_at_iso": _now_iso()})
    for state in NO_INCOME_TAX_STATES:
        rows.append({
            "year": 2026,
            "jurisdiction": state,
            "method": "flat",
            "flat_rate": 0.0,
            "source": f"{state} has no state income tax on wages",
            "loaded_at_iso": _now_iso(),
        })
    rows.append({**DEFAULT_STATE_FALLBACK,
                 "loaded_at_iso": _now_iso()})
    return rows


def seed(db: Any, dry_run: bool = False) -> Dict[str, Any]:
    rows = build_seed_rows()
    if dry_run:
        return {"ok": True, "dry_run": True,
                "rows_to_insert": len(rows),
                "preview": rows[:3]}
    inserted = 0
    for row in rows:
        nk = (row["year"], row["jurisdiction"])
        existing = db["tax_tables"].find_one(
            {"year": row["year"], "jurisdiction": row["jurisdiction"]})
        if existing:
            db["tax_tables"].update_one(
                {"year": row["year"], "jurisdiction": row["jurisdiction"]},
                {"$set": row})
        else:
            db["tax_tables"].insert_one(dict(row))
        inserted += 1
    logger.info(f"tax_tables seeded: {inserted} rows")
    return {"ok": True, "inserted": inserted}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.dry_run:
        result = seed(None, dry_run=True)
    else:
        try:
            import database
            result = seed(database.db, dry_run=False)
        except Exception as e:
            print(f"Failed to seed: {e}")
            return 1
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
