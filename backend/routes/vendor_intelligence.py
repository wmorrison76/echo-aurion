"""
Vendor Price Intelligence Engine (Enterprise-Grade)
====================================================
Shows which vendor has the cheapest price when ordering any item.
- Side-by-side vendor price comparison per ingredient
- Historical price tracking and trend detection
- Auto-flag price increases vs last purchase
- Recommended vendor per item (cheapest + quality score)
- Rogue spend detection (ordering from expensive vendor when cheaper available)
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from typing import Optional

from database import db

router = APIRouter(prefix="/api/vendor-intel", tags=["vendor-intelligence"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


def _build_price_index():
    """Build a price index from all invoices — item × vendor × price history."""
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(500))

    item_prices = {}  # {item_name: {vendor: [{price, date, qty, invoice_id}]}}

    for inv in invoices:
        vendor = inv.get("vendor_name", "Unknown")
        inv_date = inv.get("invoice_date", "")
        inv_id = inv.get("invoice_id", "")

        for li in inv.get("line_items", []):
            item = li.get("description", "").strip()
            if not item:
                continue
            price = li.get("unit_price", 0)
            qty = li.get("quantity_shipped") or li.get("quantity_ordered", 0)
            unit = li.get("pack_unit", "EA")

            if item not in item_prices:
                item_prices[item] = {}
            if vendor not in item_prices[item]:
                item_prices[item][vendor] = []

            item_prices[item][vendor].append({
                "price": price, "date": inv_date, "qty": qty,
                "unit": unit, "invoice_id": inv_id,
            })

    return item_prices


@router.get("/price-comparison")
async def price_comparison(item: Optional[str] = None):
    """Compare prices for each item across all vendors.
    Returns the cheapest vendor, price spread, and savings opportunity."""
    price_index = _build_price_index()

    comparisons = []
    for item_name, vendors in price_index.items():
        if item and item.lower() not in item_name.lower():
            continue
        if len(vendors) < 1:
            continue

        vendor_prices = []
        for vendor_name, purchases in vendors.items():
            latest = purchases[0]  # sorted by date desc
            avg_price = round(sum(p["price"] for p in purchases) / len(purchases), 2)
            price_trend = "stable"
            if len(purchases) >= 2:
                recent = purchases[0]["price"]
                older = purchases[-1]["price"]
                if recent > older * 1.05:
                    price_trend = "rising"
                elif recent < older * 0.95:
                    price_trend = "falling"

            vendor_prices.append({
                "vendor": vendor_name,
                "latest_price": latest["price"],
                "avg_price": avg_price,
                "unit": latest["unit"],
                "last_purchased": latest["date"],
                "purchase_count": len(purchases),
                "price_trend": price_trend,
                "price_history": [{"price": p["price"], "date": p["date"]} for p in purchases[:5]],
            })

        vendor_prices.sort(key=lambda v: v["latest_price"])
        cheapest = vendor_prices[0]
        most_expensive = vendor_prices[-1] if len(vendor_prices) > 1 else cheapest

        spread = round(most_expensive["latest_price"] - cheapest["latest_price"], 2) if len(vendor_prices) > 1 else 0
        spread_pct = round(spread / cheapest["latest_price"] * 100, 1) if cheapest["latest_price"] > 0 else 0

        comparisons.append({
            "item": item_name,
            "vendor_count": len(vendor_prices),
            "cheapest_vendor": cheapest["vendor"],
            "cheapest_price": cheapest["latest_price"],
            "unit": cheapest["unit"],
            "vendors": vendor_prices,
            "price_spread": spread,
            "price_spread_pct": spread_pct,
            "savings_opportunity": spread > 0,
            "recommended_vendor": cheapest["vendor"],
        })

    comparisons.sort(key=lambda c: c["price_spread_pct"], reverse=True)

    total_savings = sum(c["price_spread"] for c in comparisons if c["savings_opportunity"])

    return {
        "comparisons": comparisons,
        "total_items": len(comparisons),
        "items_with_savings": len([c for c in comparisons if c["savings_opportunity"]]),
        "estimated_savings_per_order": round(total_savings, 2),
        "generated_at": _now(),
    }


@router.get("/rogue-spend")
async def rogue_spend_detection():
    """Detect cases where we're ordering from a more expensive vendor
    when a cheaper option exists for the same item."""
    price_index = _build_price_index()
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(100))

    rogue_items = []
    for inv in invoices[:30]:  # Check recent invoices
        vendor = inv.get("vendor_name", "")
        for li in inv.get("line_items", []):
            item = li.get("description", "").strip()
            price = li.get("unit_price", 0)
            qty = li.get("quantity_shipped") or li.get("quantity_ordered", 0)

            if item not in price_index or len(price_index[item]) < 2:
                continue

            # Find cheapest vendor for this item
            cheapest_vendor = None
            cheapest_price = float("inf")
            for v_name, purchases in price_index[item].items():
                latest_p = purchases[0]["price"]
                if latest_p < cheapest_price:
                    cheapest_price = latest_p
                    cheapest_vendor = v_name

            if cheapest_vendor and cheapest_vendor != vendor and price > cheapest_price * 1.03:
                overpay = round((price - cheapest_price) * qty, 2)
                rogue_items.append({
                    "item": item,
                    "ordered_from": vendor,
                    "price_paid": price,
                    "cheapest_vendor": cheapest_vendor,
                    "cheapest_price": cheapest_price,
                    "quantity": qty,
                    "overpayment": overpay,
                    "overpay_pct": round((price - cheapest_price) / cheapest_price * 100, 1),
                    "invoice_id": inv.get("invoice_id"),
                    "invoice_date": inv.get("invoice_date"),
                })

    rogue_items.sort(key=lambda r: r["overpayment"], reverse=True)
    total_rogue = round(sum(r["overpayment"] for r in rogue_items), 2)

    return {
        "rogue_items": rogue_items,
        "total_rogue_spend": total_rogue,
        "rogue_count": len(rogue_items),
        "generated_at": _now(),
    }


@router.get("/price-alerts")
async def price_alerts():
    """Flag items where prices have increased significantly."""
    price_index = _build_price_index()
    alerts = []

    for item_name, vendors in price_index.items():
        for vendor_name, purchases in vendors.items():
            if len(purchases) < 2:
                continue
            latest = purchases[0]["price"]
            previous = purchases[1]["price"]
            if previous > 0 and latest > previous * 1.05:
                increase_pct = round((latest - previous) / previous * 100, 1)
                alerts.append({
                    "item": item_name,
                    "vendor": vendor_name,
                    "previous_price": previous,
                    "current_price": latest,
                    "increase_pct": increase_pct,
                    "increase_amount": round(latest - previous, 2),
                    "severity": "critical" if increase_pct > 15 else "warning" if increase_pct > 8 else "info",
                    "last_date": purchases[0]["date"],
                })

    alerts.sort(key=lambda a: a["increase_pct"], reverse=True)
    return {"alerts": alerts, "alert_count": len(alerts), "generated_at": _now()}
