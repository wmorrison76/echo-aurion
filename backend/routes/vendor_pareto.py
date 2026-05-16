"""
Vendor Spend Pareto + Price Tracker
====================================
B.7 from the CFO toolkit. Top 80% of spend comes from top 20% of
vendors. Track unit prices over time per SKU per vendor. Alert on
price increases > 5% week-over-week. **Negotiation leverage** — when
the produce rep walks in, the Director shows the exact price trend.

Reads from:
  · `invoices`         — invoice header
  · `invoice_lines`    — line items with unit_price + qty
  · `vendor_directory` — vendor metadata

Real math: Pareto cumulation, per-SKU price-point tracking, week-over-
week deltas, alerts on threshold breaches. No synthesis.
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/vendor-pareto", tags=["cfo-vendor-pareto"])

_now = lambda: datetime.now(timezone.utc).isoformat()

PRICE_HIKE_ALERT_PCT = 0.05            # alert when WoW SKU price rises ≥5%
PRICE_HIKE_RED_PCT = 0.10              # red alert at ≥10%


@router.get("/spend/{property_id}")
async def vendor_spend(property_id: str, lookback_days: int = Query(90, ge=14, le=365)):
    """Pareto distribution of vendor spend over the lookback window.
    Returns: top vendors by cumulative spend, plus the Pareto cutoff
    (the small set of vendors that account for 80% of spend)."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    invoices = list(
        db["invoices"].find(
            {"property_id": property_id, "received_date": {"$gte": cutoff}},
            {"_id": 0, "vendor_id": 1, "vendor_name": 1, "total_cents": 1},
        )
    )
    if not invoices:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "no_invoices_in_lookback_window",
            "lookback_days": lookback_days,
            "generated_at": _now(),
        }

    by_vendor: Dict[str, Dict] = {}
    for inv in invoices:
        vid = inv.get("vendor_id") or inv.get("vendor_name") or "unknown"
        entry = by_vendor.setdefault(vid, {
            "vendor_id": vid,
            "vendor_name": inv.get("vendor_name") or vid,
            "total_spend_cents": 0,
            "invoice_count": 0,
        })
        entry["total_spend_cents"] += inv.get("total_cents", 0)
        entry["invoice_count"] += 1

    vendors = sorted(by_vendor.values(), key=lambda v: v["total_spend_cents"], reverse=True)
    grand_total = sum(v["total_spend_cents"] for v in vendors)

    # Cumulative
    cumulative = 0
    pareto_threshold_idx = None
    for i, v in enumerate(vendors):
        cumulative += v["total_spend_cents"]
        v["cumulative_spend_cents"] = cumulative
        v["pct_of_total"] = round(v["total_spend_cents"] / grand_total, 4) if grand_total else 0
        v["cumulative_pct"] = round(cumulative / grand_total, 4) if grand_total else 0
        if pareto_threshold_idx is None and v["cumulative_pct"] >= 0.80:
            pareto_threshold_idx = i

    return {
        "property_id": property_id,
        "lookback_days": lookback_days,
        "available": True,
        "grand_total_spend_cents": grand_total,
        "vendor_count": len(vendors),
        "pareto_top_vendors": vendors[: (pareto_threshold_idx + 1) if pareto_threshold_idx is not None else len(vendors)],
        "pareto_count": (pareto_threshold_idx + 1) if pareto_threshold_idx is not None else len(vendors),
        "pareto_share_of_total_pct": (
            round((pareto_threshold_idx + 1) / len(vendors), 4)
            if pareto_threshold_idx is not None else 1.0
        ),
        "all_vendors": vendors,
        "narrative": _spend_narrative(grand_total, len(vendors), pareto_threshold_idx),
        "generated_at": _now(),
    }


@router.get("/sku-prices/{property_id}")
async def sku_price_tracker(
    property_id: str,
    lookback_days: int = Query(60, ge=14, le=365),
    vendor_id: Optional[str] = None,
):
    """Per-SKU per-vendor price-over-time tracker. Compares current-week
    average unit price to prior-week average. Flags ≥5% increases."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    invoice_query: Dict = {"property_id": property_id, "received_date": {"$gte": cutoff}}
    if vendor_id:
        invoice_query["vendor_id"] = vendor_id
    invoices = list(db["invoices"].find(invoice_query, {"_id": 0, "invoice_id": 1, "vendor_id": 1, "received_date": 1}))
    if not invoices:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "no_invoices_in_window",
            "generated_at": _now(),
        }
    invoice_ids = [inv["invoice_id"] for inv in invoices]
    invoice_dates = {inv["invoice_id"]: inv["received_date"] for inv in invoices}
    invoice_vendors = {inv["invoice_id"]: inv.get("vendor_id") for inv in invoices}

    lines = list(
        db["invoice_lines"].find(
            {"invoice_id": {"$in": invoice_ids}},
            {"_id": 0, "invoice_id": 1, "sku": 1, "description": 1, "unit_price_cents": 1, "qty": 1, "uom": 1},
        )
    )
    if not lines:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "no_invoice_lines",
            "invoices_in_window": len(invoices),
            "generated_at": _now(),
        }

    # Group by (vendor, sku)
    today = datetime.now(timezone.utc).date()
    cur_week_cutoff = (today - timedelta(days=7)).isoformat()
    prev_week_cutoff = (today - timedelta(days=14)).isoformat()

    by_sku: Dict = {}
    for line in lines:
        date = invoice_dates.get(line["invoice_id"])
        v_id = invoice_vendors.get(line["invoice_id"])
        sku = line.get("sku") or line.get("description") or "unknown"
        if not date or line.get("unit_price_cents") is None:
            continue
        key = (v_id, sku)
        bucket = by_sku.setdefault(key, {
            "vendor_id": v_id,
            "sku": sku,
            "uom": line.get("uom"),
            "description": line.get("description"),
            "history": [],
        })
        bucket["history"].append({
            "date": date,
            "unit_price_cents": line["unit_price_cents"],
            "qty": line.get("qty"),
        })

    # Compute deltas
    alerts: List[Dict] = []
    sku_summaries: List[Dict] = []
    for (v_id, sku), bucket in by_sku.items():
        history = sorted(bucket["history"], key=lambda h: h["date"])
        bucket["history"] = history
        cur_prices = [h["unit_price_cents"] for h in history if h["date"] >= cur_week_cutoff]
        prev_prices = [h["unit_price_cents"] for h in history if prev_week_cutoff <= h["date"] < cur_week_cutoff]
        if not cur_prices or not prev_prices:
            sku_summaries.append({**bucket, "delta_pct": None, "samples": len(history)})
            continue
        cur_avg = mean(cur_prices)
        prev_avg = mean(prev_prices)
        delta = cur_avg - prev_avg
        delta_pct = (delta / prev_avg) if prev_avg > 0 else 0
        summary = {
            "vendor_id": v_id,
            "sku": sku,
            "description": bucket.get("description"),
            "uom": bucket.get("uom"),
            "current_week_avg_cents": int(cur_avg),
            "prior_week_avg_cents": int(prev_avg),
            "delta_cents": int(delta),
            "delta_pct": round(delta_pct, 4),
            "samples_current": len(cur_prices),
            "samples_prior": len(prev_prices),
        }
        if delta_pct >= PRICE_HIKE_ALERT_PCT:
            severity = "red" if delta_pct >= PRICE_HIKE_RED_PCT else "amber"
            alerts.append({
                **summary,
                "severity": severity,
                "summary": f"{sku} from {v_id}: +{delta_pct*100:.1f}% WoW (${cur_avg/100:.2f} vs ${prev_avg/100:.2f})",
            })
        sku_summaries.append(summary)

    sku_summaries.sort(key=lambda s: -(s.get("delta_pct") or 0))

    return {
        "property_id": property_id,
        "lookback_days": lookback_days,
        "vendor_filter": vendor_id,
        "available": True,
        "skus_tracked": len(sku_summaries),
        "alerts_count": len(alerts),
        "alerts": alerts,
        "skus": sku_summaries,
        "generated_at": _now(),
    }


def _spend_narrative(grand_total: int, vendor_count: int, pareto_idx: Optional[int]) -> str:
    if vendor_count == 0:
        return "No vendor invoices in the window."
    if pareto_idx is None:
        return f"${grand_total/100:,.0f} total across {vendor_count} vendors. No vendor concentration above 80% threshold."
    pareto_count = pareto_idx + 1
    return (
        f"${grand_total/100:,.0f} total across {vendor_count} vendors. "
        f"The top {pareto_count} vendor{'s' if pareto_count > 1 else ''} "
        f"({pareto_count/vendor_count:.0%} of vendor count) account for "
        f"~80% of spend. That's the negotiation pool."
    )
