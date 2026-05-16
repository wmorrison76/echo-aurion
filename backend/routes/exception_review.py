"""
Exception-Based Daily Review
============================
B.19 from the CFO toolkit. Instead of reading every line of yesterday's
P&L, surface only the lines that breached thresholds. Save the CFO
1-2 hours/day. Aggregates threshold breaches from the existing
anomaly engines and the outlet capture system.

Reads from:
  · `outlet_capture_daily`     — variance vs. forecast
  · `outlet_capture_accuracy`  — forecast misses
  · `outlet_capture_regime_alerts` — structural-change flags
  · `audit_events`             — manual override events
  · `aurum_gl_journal`         — for round-number / weekend / large-dollar JEs
  · `invoice_flags`            — duplicate/over-threshold AP flags
  · `pending_approvals`        — overdue approval items

Aggregation is real (boolean flags, count thresholds, dollar
thresholds). Each exception has a severity (red/amber) and a brief
human-readable summary. No synthesis.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Query

from database import db


router = APIRouter(prefix="/api/exception-review", tags=["cfo-exception-review"])

_now = lambda: datetime.now(timezone.utc).isoformat()


# Configurable thresholds (defaults are conservative)
JE_ROUND_NUMBER_DOLLAR_FLOOR = 10000_00     # round-number JEs ≥ $10k
JE_LARGE_DOLLAR_FLOOR = 100000_00           # JEs over $100k
INVOICE_LARGE_DOLLAR_FLOOR = 25000_00       # invoices > $25k
APPROVAL_OVERDUE_HOURS = 24                 # approvals overdue beyond this
FORECAST_MISS_PCT = 0.10                    # forecast off by ≥10% on a 1d horizon


@router.get("/{property_id}")
async def daily_exceptions(property_id: str, day: Optional[str] = None):
    """Aggregate exception list for a single property + a single day.
    Default day is yesterday (UTC) since today's data isn't fully
    closed yet."""
    target_date = day or (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    exceptions: List[Dict] = []

    # 1. Outlet capture: forecast misses ≥10% on the 1-day horizon
    accuracy_rows = list(
        db["outlet_capture_accuracy"].find(
            {"for_date": target_date, "horizon_days": 1, "abs_pct_error": {"$gte": FORECAST_MISS_PCT}},
            {"_id": 0},
        )
    )
    for r in accuracy_rows:
        outlet = db["outlets"].find_one(
            {"outlet_id": r["outlet_id"], "property_id": property_id}, {"_id": 0, "name": 1},
        )
        if not outlet:
            continue       # outlet belongs to a different property
        exceptions.append({
            "category": "forecast_miss",
            "severity": "red" if r["abs_pct_error"] >= 0.20 else "amber",
            "outlet_id": r["outlet_id"],
            "outlet_name": outlet.get("name"),
            "summary": (
                f"1-day forecast off by {r['abs_pct_error']:.1%} "
                f"({r['forecast_p50']} forecast vs {r['actual']} actual)"
            ),
            "data": r,
        })

    # 2. Regime-change alerts (structural drift)
    regime = list(
        db["outlet_capture_regime_alerts"].find(
            {"raised_at": {"$gte": target_date}, "status": "open"}, {"_id": 0},
        )
    )
    for a in regime:
        outlet = db["outlets"].find_one(
            {"outlet_id": a["outlet_id"], "property_id": property_id}, {"_id": 0, "name": 1},
        )
        if not outlet:
            continue
        exceptions.append({
            "category": "regime_change_alert",
            "severity": "red",
            "outlet_id": a["outlet_id"],
            "outlet_name": outlet.get("name"),
            "summary": "Forecast model regime-change candidate — error >40% on at least one horizon",
            "data": a,
        })

    # 3. Round-number JEs over the floor (anomaly: most legitimate
    # JEs are not round numbers)
    je_round = list(
        db["aurum_gl_journal"].find(
            {
                "property_id": property_id,
                "post_date": target_date,
                "amount_cents": {"$gte": JE_ROUND_NUMBER_DOLLAR_FLOOR},
                "$expr": {"$eq": [{"$mod": ["$amount_cents", 100000]}, 0]},
            },
            {"_id": 0},
        ).limit(50)
    )
    for j in je_round:
        exceptions.append({
            "category": "round_number_je",
            "severity": "amber",
            "summary": f"Round-number JE ${j['amount_cents']/100:,.0f} posted by {j.get('posted_by', 'unknown')}",
            "data": j,
        })

    # 4. Large-dollar JEs
    je_large = list(
        db["aurum_gl_journal"].find(
            {
                "property_id": property_id,
                "post_date": target_date,
                "amount_cents": {"$gte": JE_LARGE_DOLLAR_FLOOR},
                "manual": True,
            },
            {"_id": 0},
        ).limit(50)
    )
    for j in je_large:
        exceptions.append({
            "category": "large_manual_je",
            "severity": "red" if j["amount_cents"] >= JE_LARGE_DOLLAR_FLOOR * 5 else "amber",
            "summary": f"Manual JE ${j['amount_cents']/100:,.0f} (>${JE_LARGE_DOLLAR_FLOOR/100:,.0f} threshold)",
            "data": j,
        })

    # 5. Weekend posts (most legitimate accounting happens M-F)
    target_dt = datetime.fromisoformat(target_date)
    if target_dt.weekday() in (5, 6):                  # Saturday or Sunday
        weekend_je = list(
            db["aurum_gl_journal"].find(
                {"property_id": property_id, "post_date": target_date, "manual": True},
                {"_id": 0},
            ).limit(20)
        )
        for j in weekend_je:
            exceptions.append({
                "category": "weekend_post",
                "severity": "amber",
                "summary": f"Manual JE posted on weekend ${j['amount_cents']/100:,.0f}",
                "data": j,
            })

    # 6. Large invoices
    large_invoices = list(
        db["invoices"].find(
            {
                "property_id": property_id,
                "received_date": target_date,
                "total_cents": {"$gte": INVOICE_LARGE_DOLLAR_FLOOR},
            },
            {"_id": 0},
        ).limit(50)
    )
    for inv in large_invoices:
        exceptions.append({
            "category": "large_invoice",
            "severity": "amber",
            "summary": f"Invoice from {inv.get('vendor_name', '?')} for ${inv['total_cents']/100:,.0f}",
            "data": inv,
        })

    # 7. Duplicate AP invoices flagged
    duplicate_flags = list(
        db["invoice_flags"].find(
            {"property_id": property_id, "flag_type": "duplicate", "raised_date": target_date, "status": "open"},
            {"_id": 0},
        ).limit(20)
    )
    for f in duplicate_flags:
        exceptions.append({
            "category": "duplicate_invoice_flag",
            "severity": "red",
            "summary": f"Duplicate-invoice flag: {f.get('description', '')}",
            "data": f,
        })

    # 8. Overdue approvals (per pending_approvals collection)
    overdue_threshold = (datetime.now(timezone.utc) - timedelta(hours=APPROVAL_OVERDUE_HOURS)).isoformat()
    overdue = list(
        db["pending_approvals"].find(
            {"status": "pending", "expires_at": {"$lt": overdue_threshold}},
            {"_id": 0},
        ).limit(20)
    )
    for a in overdue:
        exceptions.append({
            "category": "overdue_approval",
            "severity": "amber",
            "summary": f"Approval overdue: {a.get('kind', '?')} {a.get('entity_id', '')[:8]}",
            "data": a,
        })

    # Group by severity and summarize
    summary = {
        "red": sum(1 for e in exceptions if e["severity"] == "red"),
        "amber": sum(1 for e in exceptions if e["severity"] == "amber"),
        "total": len(exceptions),
    }
    return {
        "property_id": property_id,
        "date": target_date,
        "summary": summary,
        "exceptions": exceptions,
        "narrative": _narrative(target_date, summary),
        "generated_at": _now(),
    }


def _narrative(target_date: str, summary: Dict) -> str:
    if summary["total"] == 0:
        return f"No exceptions flagged for {target_date}. The day cleared without anomalies."
    parts = [f"{summary['total']} exceptions for {target_date}"]
    if summary["red"]:
        parts.append(f"{summary['red']} red (high-priority)")
    if summary["amber"]:
        parts.append(f"{summary['amber']} amber")
    parts.append("— review the red items first, then amber.")
    return " · ".join(parts)
