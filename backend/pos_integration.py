"""
LUCCCA POS Integration Service
===============================
Real-time POS integration for:
- Auto-decrement inventory when items are sold
- Feed consumption data to AI forecasting
- Real-time food cost tracking per menu item
- Sales mix analysis for menu engineering

Supports: Toast, Square, Resy, OpenTable, Aloha, Micros, Generic
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import re
from database import (
    pos_transactions_col, menu_items_col, pos_sales_col,
    ingredients_col, audit_log_col,
)
import operations_core
import ai_forecasting

POS_PROVIDERS = ["toast", "square", "resy", "opentable", "aloha", "micros", "generic"]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


def _audit(action: str, data: dict):
    audit_log_col.insert_one({
        "id": _uid(), "engine": "pos_integration",
        "action": action, "data": data, "timestamp": _now(),
    })


# ---------------------------------------------------------------------------
# MENU ITEM MAPPING (Menu -> Recipe -> Ingredients)
# ---------------------------------------------------------------------------
def upsert_menu_item(data: dict) -> dict:
    mid = data.get("id") or _uid()
    doc = {
        "id": mid,
        "name": data["name"],
        "pos_item_id": data.get("pos_item_id", ""),
        "pos_provider": data.get("pos_provider", "generic"),
        "category": data.get("category", "entree"),
        "menu_price": data.get("menu_price", 0),
        "recipe_id": data.get("recipe_id"),
        "ingredient_map": data.get("ingredient_map", []),
        "active": data.get("active", True),
        "updated_at": _now(),
    }
    menu_items_col.update_one({"id": mid}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    return doc


def get_menu_items(provider: Optional[str] = None) -> list:
    query = {}
    if provider:
        query["pos_provider"] = provider
    return list(menu_items_col.find(query, {"_id": 0}))


# ---------------------------------------------------------------------------
# POS TRANSACTION PROCESSING
# ---------------------------------------------------------------------------
def process_transaction(txn_data: dict) -> dict:
    txn_id = _uid()
    provider = txn_data.get("provider", "generic")

    result = {
        "transaction_id": txn_id,
        "items_processed": 0,
        "inventory_decremented": 0,
        "food_cost_total": 0,
        "revenue_total": 0,
        "errors": [],
    }

    items_detail = []
    for item in txn_data.get("items", []):
        item_result = _process_pos_item(item, provider)
        items_detail.append(item_result)
        result["items_processed"] += 1
        if item_result.get("inventory_decremented"):
            result["inventory_decremented"] += 1
        result["food_cost_total"] += item_result.get("food_cost", 0)
        result["revenue_total"] += item_result.get("revenue", 0)
        if item_result.get("error"):
            result["errors"].append(item_result["error"])

    # Calculate food cost percentage
    result["food_cost_pct"] = round(
        result["food_cost_total"] / max(result["revenue_total"], 0.01) * 100, 2
    )

    # Save transaction
    doc = {
        "id": txn_id,
        "external_id": txn_data.get("external_id", ""),
        "provider": provider,
        "transaction_type": txn_data.get("transaction_type", "sale"),
        "outlet_id": txn_data.get("outlet_id", "main"),
        "server_name": txn_data.get("server_name", ""),
        "subtotal": txn_data.get("subtotal", 0),
        "tax": txn_data.get("tax", 0),
        "tip": txn_data.get("tip", 0),
        "total": txn_data.get("total", 0),
        "guest_count": txn_data.get("guest_count", 1),
        "items": items_detail,
        "food_cost_total": result["food_cost_total"],
        "food_cost_pct": result["food_cost_pct"],
        "closed_at": txn_data.get("closed_at", _now()),
        "processed_at": _now(),
    }
    pos_transactions_col.insert_one(doc)

    _audit("transaction_processed", {
        "id": txn_id, "provider": provider,
        "revenue": result["revenue_total"], "food_cost": result["food_cost_total"],
    })
    return result


def _process_pos_item(item: dict, provider: str) -> dict:
    qty = item.get("quantity", 1)
    price = item.get("price", 0) or item.get("unit_price", 0)
    revenue = round(qty * price, 2)

    result = {
        "name": item.get("name", "Unknown"),
        "quantity": qty,
        "price": price,
        "revenue": revenue,
        "food_cost": 0,
        "food_cost_pct": 0,
        "inventory_decremented": False,
        "error": None,
    }

    # Find menu item mapping
    menu_item = None
    if item.get("pos_item_id"):
        menu_item = menu_items_col.find_one({"pos_item_id": item["pos_item_id"]}, {"_id": 0})
    if not menu_item and item.get("name"):
        menu_item = menu_items_col.find_one(
            {"name": {"$regex": f"^{re.escape(item['name'])}$", "$options": "i"}}, {"_id": 0}
        )

    if not menu_item:
        return result

    # Decrement inventory for each mapped ingredient
    for ing_map in menu_item.get("ingredient_map", []):
        try:
            consume_qty = ing_map.get("quantity_per_item", 0) * qty
            if consume_qty > 0:
                operations_core.consume_inventory(
                    ing_map["ingredient_id"], consume_qty,
                    reason="pos_sale", reference_id=item.get("pos_item_id", "")
                )
                # Feed to forecasting
                ai_forecasting.record_consumption(
                    ing_map["ingredient_id"], consume_qty, reason="pos_sale"
                )
                result["inventory_decremented"] = True

                # Calculate food cost
                ing = ingredients_col.find_one({"id": ing_map["ingredient_id"]}, {"_id": 0})
                if ing:
                    result["food_cost"] += round(consume_qty * ing.get("current_cost", 0), 4)
        except Exception as e:
            result["error"] = str(e)

    result["food_cost"] = round(result["food_cost"], 2)
    result["food_cost_pct"] = round(result["food_cost"] / max(revenue, 0.01) * 100, 2)
    return result


# ---------------------------------------------------------------------------
# SALES ANALYTICS
# ---------------------------------------------------------------------------
def get_sales_analytics(days: int = 7, outlet_id: Optional[str] = None) -> dict:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query = {"closed_at": {"$gte": cutoff}}
    if outlet_id:
        query["outlet_id"] = outlet_id

    txns = list(pos_transactions_col.find(query, {"_id": 0}))

    total_revenue = sum(t.get("total", 0) for t in txns)
    total_food_cost = sum(t.get("food_cost_total", 0) for t in txns)
    total_guests = sum(t.get("guest_count", 0) for t in txns)

    # Sales mix (item popularity)
    item_sales = {}
    for t in txns:
        for item in t.get("items", []):
            name = item.get("name", "Unknown")
            if name not in item_sales:
                item_sales[name] = {"name": name, "qty_sold": 0, "revenue": 0, "food_cost": 0}
            item_sales[name]["qty_sold"] += item.get("quantity", 0)
            item_sales[name]["revenue"] += item.get("revenue", 0)
            item_sales[name]["food_cost"] += item.get("food_cost", 0)

    sales_mix = sorted(item_sales.values(), key=lambda x: x["revenue"], reverse=True)
    for s in sales_mix:
        s["food_cost_pct"] = round(s["food_cost"] / max(s["revenue"], 0.01) * 100, 2)
        s["margin"] = round(s["revenue"] - s["food_cost"], 2)

    return {
        "period_days": days,
        "total_transactions": len(txns),
        "total_revenue": round(total_revenue, 2),
        "total_food_cost": round(total_food_cost, 2),
        "food_cost_pct": round(total_food_cost / max(total_revenue, 0.01) * 100, 2),
        "total_guests": total_guests,
        "avg_check": round(total_revenue / max(len(txns), 1), 2),
        "avg_per_guest": round(total_revenue / max(total_guests, 1), 2),
        "sales_mix": sales_mix[:20],
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# WEBHOOK HANDLERS (POS Provider Adapters)
# ---------------------------------------------------------------------------
def handle_toast_webhook(payload: dict) -> dict:
    """Normalize Toast webhook to unified format"""
    items = []
    for item in payload.get("orderItems", payload.get("items", [])):
        items.append({
            "pos_item_id": item.get("guid", item.get("id", "")),
            "name": item.get("name", ""),
            "quantity": item.get("quantity", 1),
            "price": item.get("price", 0),
        })

    return process_transaction({
        "external_id": payload.get("guid", payload.get("orderId", "")),
        "provider": "toast",
        "transaction_type": "sale",
        "outlet_id": payload.get("restaurantGuid", payload.get("locationId", "main")),
        "server_name": payload.get("server", {}).get("firstName", ""),
        "subtotal": payload.get("subtotal", 0),
        "tax": payload.get("tax", 0),
        "tip": payload.get("tip", 0),
        "total": payload.get("total", 0),
        "guest_count": payload.get("guestCount", 1),
        "items": items,
        "closed_at": payload.get("closedDate", _now()),
    })


def handle_square_webhook(payload: dict) -> dict:
    """Normalize Square webhook to unified format"""
    order = payload.get("data", {}).get("object", {}).get("order", payload)
    items = []
    for item in order.get("line_items", []):
        items.append({
            "pos_item_id": item.get("catalog_object_id", ""),
            "name": item.get("name", ""),
            "quantity": int(item.get("quantity", "1")),
            "price": int(item.get("base_price_money", {}).get("amount", 0)) / 100,
        })

    total_money = order.get("total_money", {})
    return process_transaction({
        "external_id": order.get("id", ""),
        "provider": "square",
        "transaction_type": "sale",
        "outlet_id": order.get("location_id", "main"),
        "subtotal": int(total_money.get("amount", 0)) / 100,
        "total": int(total_money.get("amount", 0)) / 100,
        "items": items,
    })


def get_pos_stats() -> dict:
    total_txn = pos_transactions_col.count_documents({})
    total_items = menu_items_col.count_documents({})
    providers = pos_transactions_col.distinct("provider")

    # Aggregate total revenue from transactions
    pipeline = [{"$group": {"_id": None, "total_revenue": {"$sum": "$total"}, "total_food_cost": {"$sum": "$food_cost_total"}}}]
    agg = list(pos_transactions_col.aggregate(pipeline))
    total_revenue = agg[0]["total_revenue"] if agg else 0
    total_food_cost = agg[0]["total_food_cost"] if agg else 0

    return {
        "total_transactions": total_txn,
        "total_revenue": round(total_revenue, 2),
        "total_food_cost": round(total_food_cost, 2),
        "avg_food_cost_pct": round(total_food_cost / max(total_revenue, 0.01) * 100, 2) if total_revenue > 0 else 0,
        "total_menu_items": total_items,
        "active_providers": providers,
        "engine": "pos_integration",
        "status": "healthy",
        "timestamp": _now(),
    }
