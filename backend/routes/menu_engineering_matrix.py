"""
Menu Engineering Matrix — Stars/Puzzles/Plowhorses/Dogs
========================================================
Plots each outlet menu item by popularity (mix %) vs profitability
(contribution margin) using the classic Kasavana-Smith matrix.

Stars: High popularity + High profit → Promote heavily
Puzzles: Low popularity + High profit → Reposition/market
Plowhorses: High popularity + Low profit → Re-engineer cost
Dogs: Low popularity + Low profit → Remove or replace
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import random

router = APIRouter(prefix="/api/menu-eng-matrix", tags=["menu-eng-matrix"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


def _build_outlet_items_from_pos():
    """Build sales mix from real POS items + yield DB food costs.
    Uses actual POS-routed items and cross-references yield database
    for food cost estimates. Sales volume comes from pos_transactions
    when available, otherwise uses realistic simulated volume."""

    pos_items = list(db["pos_menu_items"].find(
        {"item_type": {"$in": ["entree", "appetizer", "dessert", "side", "salad", "crudo", "warm", "chilled"]}},
        {"_id": 0}
    ))

    if not pos_items:
        return {}

    # Import yield DB for food cost cross-reference
    from routes.yield_database import YIELD_DB, _fuzzy_score

    def _estimate_food_cost(item_name: str, price: float) -> float:
        """Estimate food cost by matching POS item to yield database."""
        best_match = None
        best_score = 0
        for yld in YIELD_DB:
            score = _fuzzy_score(item_name, yld["name"])
            if score > best_score:
                best_score = score
                best_match = yld
        if best_match and best_score > 30:
            # Use EP cost as base for a portion, scaled to typical plate weight
            return round(best_match["ep_cost_lb"] * 0.5, 2)  # ~8oz portion
        # Fallback: estimate from typical food cost percentage (28-32%)
        return round(price * 0.30, 2)

    # Get actual sales data from pos_transactions if available
    txns = list(db["pos_transactions"].find({}, {"_id": 0, "items": 1, "outlet": 1}).limit(5000))
    sales_counts = {}
    for txn in txns:
        for ti in txn.get("items", []):
            key = ti.get("name", "")
            if key:
                sales_counts[key] = sales_counts.get(key, 0) + ti.get("qty", 1)
    has_real_sales = len(sales_counts) > 0

    # Group by outlet/revenue_center
    outlets = {}
    for item in pos_items:
        outlet = item.get("revenue_center", item.get("outlet", "General"))
        if outlet not in outlets:
            outlets[outlet] = []

        price = item.get("price", 0)
        if price <= 0:
            continue

        name = item.get("display_name", item.get("name", "Unknown"))

        # Get real sales count or generate realistic simulated volume
        if has_real_sales and name in sales_counts:
            units = sales_counts[name]
        else:
            # Simulate based on price tier and item type
            base = 120
            if price > 80:
                base = 30
            elif price > 50:
                base = 60
            elif price > 30:
                base = 100
            elif price > 20:
                base = 180
            else:
                base = 220
            # Seed with item name for consistency across calls
            rng = random.Random(hash(name) % 10000)
            units = max(10, base + rng.randint(-40, 40))

        food_cost = _estimate_food_cost(name, price)

        outlets[outlet].append({
            "name": name,
            "price": price,
            "food_cost": food_cost,
            "units_sold": units,
            "category": item.get("category", item.get("item_type", "entree")),
            "pos_item_id": item.get("item_id", ""),
        })

    return outlets


# Fallback simulated data (used only when POS DB is empty)
SALES_MIX_FALLBACK = {
    "Signature Italian": [
        {"name": "Lobster Linguine Arrabbiata", "price": 48, "food_cost": 18.20, "units_sold": 145, "category": "pasta"},
        {"name": "Braised Short Rib", "price": 56, "food_cost": 19.36, "units_sold": 128, "category": "entree"},
        {"name": "Heritage Chicken", "price": 54, "food_cost": 12.80, "units_sold": 118, "category": "entree"},
        {"name": "Caesar Salad", "price": 22, "food_cost": 3.85, "units_sold": 210, "category": "appetizer"},
        {"name": "Grilled Octopus", "price": 30, "food_cost": 8.50, "units_sold": 85, "category": "appetizer"},
        {"name": "Turbot", "price": 55, "food_cost": 16.90, "units_sold": 62, "category": "entree"},
        {"name": "Local Burrata", "price": 24, "food_cost": 5.20, "units_sold": 175, "category": "appetizer"},
        {"name": "Agnolotti Primavera", "price": 36, "food_cost": 8.40, "units_sold": 95, "category": "pasta"},
        {"name": "Grilled Local Catch", "price": 50, "food_cost": 14.20, "units_sold": 78, "category": "entree"},
        {"name": "Dover Sole Meuniere", "price": 95, "food_cost": 28.50, "units_sold": 42, "category": "entree"},
        {"name": "Bisteca alla Fiorentina", "price": 250, "food_cost": 72.00, "units_sold": 18, "category": "entree"},
        {"name": "Foie Gras Torchon", "price": 38, "food_cost": 14.20, "units_sold": 45, "category": "appetizer"},
        {"name": "Beetroot Salad", "price": 26, "food_cost": 4.80, "units_sold": 92, "category": "appetizer"},
        {"name": "Scallop Crudo", "price": 36, "food_cost": 11.40, "units_sold": 68, "category": "crudo"},
    ],
    "Pool Bar & Grill": [
        {"name": "Latin Burger", "price": 25, "food_cost": 7.85, "units_sold": 380, "category": "entree"},
        {"name": "Tacos de Carnitas", "price": 21, "food_cost": 5.60, "units_sold": 290, "category": "entree"},
        {"name": "Baja Tacos", "price": 26, "food_cost": 8.20, "units_sold": 245, "category": "entree"},
        {"name": "Beef Quesadilla", "price": 28, "food_cost": 9.50, "units_sold": 195, "category": "entree"},
        {"name": "Chicken-Avocado Wrap", "price": 22, "food_cost": 6.10, "units_sold": 170, "category": "entree"},
        {"name": "Cheese Quesadilla", "price": 18, "food_cost": 3.20, "units_sold": 145, "category": "entree"},
        {"name": "Veggie Burger", "price": 22, "food_cost": 5.80, "units_sold": 95, "category": "entree"},
        {"name": "Ice Cream Sandwich", "price": 12, "food_cost": 2.50, "units_sold": 120, "category": "dessert"},
        {"name": "Sorbet Frutina", "price": 10, "food_cost": 1.80, "units_sold": 85, "category": "dessert"},
    ],
    "Rooftop Lounge": [
        {"name": "Wagyu Sliders", "price": 30, "food_cost": 12.40, "units_sold": 220, "category": "warm"},
        {"name": "Lobster Roll", "price": 28, "food_cost": 11.50, "units_sold": 185, "category": "warm"},
        {"name": "Cheese + Charcuterie", "price": 32, "food_cost": 10.80, "units_sold": 165, "category": "chilled"},
        {"name": "Shishito Peppers", "price": 16, "food_cost": 3.20, "units_sold": 195, "category": "warm"},
        {"name": "Croquetas de Jamon", "price": 19, "food_cost": 4.50, "units_sold": 140, "category": "warm"},
        {"name": "Jumbo Shrimp Cocktail", "price": 28, "food_cost": 9.80, "units_sold": 115, "category": "chilled"},
        {"name": "Half Dozen Oyster", "price": 30, "food_cost": 12.00, "units_sold": 95, "category": "chilled"},
        {"name": "Red Endives Salad", "price": 16, "food_cost": 3.60, "units_sold": 88, "category": "chilled"},
        {"name": "Cracked Olives", "price": 16, "food_cost": 2.80, "units_sold": 75, "category": "warm"},
        {"name": "Strawberry + Mint Crumble", "price": 14, "food_cost": 3.40, "units_sold": 92, "category": "dessert"},
    ],
}


@router.get("/matrix")
async def get_menu_matrix(outlet: Optional[str] = None):
    """Generate the menu engineering matrix for an outlet.
    Pulls real POS items when available, falls back to sample data."""
    # Try real POS data first
    pos_outlets = _build_outlet_items_from_pos()
    using_pos = len(pos_outlets) > 0
    data_source = pos_outlets if using_pos else SALES_MIX_FALLBACK

    if outlet and outlet in data_source:
        items = data_source[outlet]
        outlet_name = outlet
    else:
        # Pick first available outlet
        first_key = next(iter(data_source), "Signature Italian")
        items = data_source.get(first_key, [])
        outlet_name = first_key

    if not items:
        return {"outlet": outlet_name, "items": [], "summary": {}, "quadrants": {}, "recommendations": [], "data_source": "none"}

    total_units = sum(i["units_sold"] for i in items)
    total_revenue = sum(i["price"] * i["units_sold"] for i in items)
    total_cost = sum(i["food_cost"] * i["units_sold"] for i in items)
    total_margin = total_revenue - total_cost
    avg_cm = total_margin / max(total_units, 1)
    avg_mix = 100 / max(len(items), 1)

    matrix_items = []
    for item in items:
        cm = item["price"] - item["food_cost"]
        mix_pct = (item["units_sold"] / max(total_units, 1)) * 100
        fc_pct = (item["food_cost"] / max(item["price"], 1)) * 100

        high_pop = mix_pct >= avg_mix * 0.7
        high_profit = cm >= avg_cm

        if high_pop and high_profit:
            quadrant = "star"
        elif not high_pop and high_profit:
            quadrant = "puzzle"
        elif high_pop and not high_profit:
            quadrant = "plowhorse"
        else:
            quadrant = "dog"

        matrix_items.append({
            "name": item["name"],
            "category": item["category"],
            "price": item["price"],
            "food_cost": item["food_cost"],
            "food_cost_pct": round(fc_pct, 1),
            "contribution_margin": round(cm, 2),
            "units_sold": item["units_sold"],
            "mix_pct": round(mix_pct, 1),
            "total_revenue": round(item["price"] * item["units_sold"], 2),
            "total_margin": round(cm * item["units_sold"], 2),
            "quadrant": quadrant,
        })

    # Summary by quadrant
    quadrant_summary = {}
    for q in ["star", "puzzle", "plowhorse", "dog"]:
        q_items = [i for i in matrix_items if i["quadrant"] == q]
        quadrant_summary[q] = {
            "count": len(q_items),
            "items": [i["name"] for i in q_items],
            "total_revenue": round(sum(i["total_revenue"] for i in q_items), 2),
            "total_margin": round(sum(i["total_margin"] for i in q_items), 2),
            "avg_food_cost_pct": round(sum(i["food_cost_pct"] for i in q_items) / max(len(q_items), 1), 1),
        }

    # Action recommendations
    recommendations = []
    for item in matrix_items:
        if item["quadrant"] == "star":
            recommendations.append({"item": item["name"], "action": "Maintain & promote", "detail": f"High performer at {item['mix_pct']:.1f}% mix, ${item['contribution_margin']:.2f} margin. Keep prominent on menu.", "priority": "maintain"})
        elif item["quadrant"] == "puzzle":
            recommendations.append({"item": item["name"], "action": "Reposition & market", "detail": f"High margin (${item['contribution_margin']:.2f}) but only {item['mix_pct']:.1f}% mix. Move on menu, add server suggestion, feature as special.", "priority": "high"})
        elif item["quadrant"] == "plowhorse":
            recommendations.append({"item": item["name"], "action": "Re-engineer cost", "detail": f"Popular ({item['mix_pct']:.1f}% mix) but {item['food_cost_pct']:.1f}% food cost. Reduce portion, find cheaper supplier, or raise price.", "priority": "medium"})
        elif item["quadrant"] == "dog":
            recommendations.append({"item": item["name"], "action": "Remove or replace", "detail": f"Low mix ({item['mix_pct']:.1f}%) and low margin (${item['contribution_margin']:.2f}). Consider removing or replacing with higher-margin item.", "priority": "low"})

    return {
        "outlet": outlet_name,
        "items": matrix_items,
        "summary": {
            "total_items": len(matrix_items),
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_margin": round(total_margin, 2),
            "avg_contribution_margin": round(avg_cm, 2),
            "avg_food_cost_pct": round((total_cost / max(total_revenue, 1)) * 100, 1),
            "avg_mix_threshold": round(avg_mix * 0.7, 1),
        },
        "quadrants": quadrant_summary,
        "recommendations": recommendations,
        "data_source": "pos_database" if using_pos else "sample_data",
    }


@router.get("/outlets")
async def list_available_outlets():
    """List outlets with menu engineering data — pulls from POS when available."""
    pos_outlets = _build_outlet_items_from_pos()
    if pos_outlets:
        return {"outlets": list(pos_outlets.keys()), "source": "pos_database"}
    return {"outlets": list(SALES_MIX_FALLBACK.keys()), "source": "sample_data"}



@router.post("/seed-sales")
async def seed_pos_sales():
    """Generate realistic POS transaction history from existing POS menu items.
    Creates 30 days of simulated sales data for menu engineering analysis."""
    if db["pos_transactions"].count_documents({}) > 0:
        count = db["pos_transactions"].count_documents({})
        return {"status": "already_seeded", "transactions": count}

    pos_items = list(db["pos_menu_items"].find(
        {"item_type": {"$in": ["entree", "appetizer", "dessert", "side", "salad", "crudo", "warm", "chilled"]}},
        {"_id": 0}
    ))
    if not pos_items:
        return {"status": "no_pos_items", "transactions": 0}

    from datetime import timedelta
    import random as rng

    txns = []
    base_date = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)

    # Group items by outlet for realistic order composition
    outlet_items = {}
    for item in pos_items:
        rc = item.get("revenue_center", "REST")
        outlet_items.setdefault(rc, []).append(item)

    for day_offset in range(30):
        day = base_date - timedelta(days=day_offset)
        is_weekend = day.weekday() >= 4
        # More transactions on weekends
        daily_txn_count = rng.randint(40, 80) if is_weekend else rng.randint(20, 50)

        for rc, items in outlet_items.items():
            if not items:
                continue
            rc_txn_count = max(3, daily_txn_count // len(outlet_items))

            for _ in range(rc_txn_count):
                # Each transaction has 1-4 items
                num_items = rng.choices([1, 2, 3, 4], weights=[25, 40, 25, 10])[0]
                order_items = rng.sample(items, min(num_items, len(items)))

                txn_items = []
                total = 0
                for oi in order_items:
                    qty = 1
                    price = oi.get("price", 0)
                    txn_items.append({
                        "name": oi.get("display_name", oi.get("name", "")),
                        "item_id": oi.get("item_id", ""),
                        "qty": qty,
                        "price": price,
                    })
                    total += price * qty

                hour = rng.choices([11, 12, 13, 18, 19, 20, 21], weights=[10, 20, 15, 15, 25, 20, 10])[0]
                txn_time = day.replace(hour=hour, minute=rng.randint(0, 59))

                txns.append({
                    "txn_id": f"txn-{_uid()}-{len(txns)}",
                    "outlet": rc,
                    "items": txn_items,
                    "total": round(total, 2),
                    "covers": rng.randint(1, 4),
                    "timestamp": txn_time.isoformat(),
                    "payment_method": rng.choice(["credit", "cash", "room_charge"]),
                })

    if txns:
        db["pos_transactions"].insert_many(txns)

    return {"status": "seeded", "transactions": len(txns), "days": 30, "outlets": list(outlet_items.keys())}
