"""
LUCCCA Operations Core Engine
=============================
Central nervous system connecting:
  Purchasing -> Receiving -> Inventory -> Culinary/Pastry -> Auto-Ordering

Flow: Invoice -> Product Match -> Inventory Update -> Recipe Cost ->
      Production Schedule -> Consume Inventory -> Low Stock Alert -> Auto PO
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
import re
from database import (
    ingredients_col, inventory_col, recipes_col, invoices_col,
    po_suggestions_col, production_col, audit_log_col, consumption_history_col,
)

INGREDIENT_CATEGORIES = [
    "protein", "produce", "dairy", "dry_goods", "frozen",
    "beverage", "bakery", "spice", "seafood", "other"
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


def _audit(action: str, data: dict):
    audit_log_col.insert_one({
        "id": _uid(),
        "engine": "operations_core",
        "action": action,
        "data": data,
        "timestamp": _now(),
    })


# ---------------------------------------------------------------------------
# INGREDIENTS (Canonical Data)
# ---------------------------------------------------------------------------
def upsert_ingredient(data: dict) -> dict:
    iid = data.get("id") or _uid()
    doc = {
        "id": iid,
        "name": data["name"],
        "sku": data.get("sku"),
        "barcode": data.get("barcode"),
        "category": data.get("category", "other"),
        "base_unit": data.get("base_unit", "each"),
        "purchase_unit": data.get("purchase_unit"),
        "purchase_to_base": data.get("purchase_to_base", 1),
        "current_cost": data.get("current_cost", 0),
        "average_cost": data.get("average_cost", 0),
        "last_purchase_cost": data.get("last_purchase_cost", 0),
        "current_stock": data.get("current_stock", 0),
        "par_level": data.get("par_level", 0),
        "reorder_point": data.get("reorder_point", 0),
        "reorder_qty": data.get("reorder_qty", 0),
        "preferred_vendor": data.get("preferred_vendor"),
        "vendor_codes": data.get("vendor_codes", []),
        "allergens": data.get("allergens", []),
        "storage_temp": data.get("storage_temp"),
        "shelf_life_days": data.get("shelf_life_days"),
        "updated_at": _now(),
    }
    ingredients_col.update_one({"id": iid}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    _audit("ingredient_upsert", {"id": iid, "name": doc["name"]})
    return doc


def get_ingredient(ingredient_id: str) -> Optional[dict]:
    return ingredients_col.find_one({"id": ingredient_id}, {"_id": 0})


def list_ingredients(category: Optional[str] = None, low_stock_only: bool = False) -> list:
    query = {}
    if category:
        query["category"] = category
    if low_stock_only:
        query["$expr"] = {"$lte": ["$current_stock", "$reorder_point"]}
    return list(ingredients_col.find(query, {"_id": 0}).sort("name", 1))


def get_low_stock_ingredients() -> list:
    pipeline = [
        {"$match": {"$expr": {"$lte": ["$current_stock", "$reorder_point"]}, "reorder_point": {"$gt": 0}}},
        {"$project": {"_id": 0}},
        {"$sort": {"current_stock": 1}},
    ]
    return list(ingredients_col.aggregate(pipeline))


# ---------------------------------------------------------------------------
# RECEIVING & INVENTORY
# ---------------------------------------------------------------------------
def receive_inventory(ingredient_id: str, qty: float, unit_cost: float,
                      vendor: str = "", po_number: str = "", lot_number: str = "") -> dict:
    ing = ingredients_col.find_one({"id": ingredient_id})
    if not ing:
        raise ValueError(f"Ingredient {ingredient_id} not found")

    old_stock = ing.get("current_stock", 0)
    old_avg = ing.get("average_cost", 0)
    new_stock = old_stock + qty
    new_avg = ((old_avg * old_stock) + (unit_cost * qty)) / new_stock if new_stock > 0 else unit_cost

    ingredients_col.update_one({"id": ingredient_id}, {"$set": {
        "current_stock": round(new_stock, 4),
        "average_cost": round(new_avg, 4),
        "last_purchase_cost": round(unit_cost, 4),
        "current_cost": round(unit_cost, 4),
        "updated_at": _now(),
    }})

    txn = {
        "id": _uid(),
        "ingredient_id": ingredient_id,
        "transaction_type": "receive",
        "quantity": qty,
        "unit_cost": unit_cost,
        "total_cost": round(qty * unit_cost, 2),
        "vendor": vendor,
        "po_number": po_number,
        "lot_number": lot_number,
        "stock_before": old_stock,
        "stock_after": new_stock,
        "timestamp": _now(),
    }
    inventory_col.insert_one(txn)
    del txn["_id"]

    _audit("receive", {"ingredient_id": ingredient_id, "qty": qty, "cost": unit_cost})
    return txn


def consume_inventory(ingredient_id: str, qty: float, reason: str = "production",
                      reference_id: str = "") -> dict:
    ing = ingredients_col.find_one({"id": ingredient_id})
    if not ing:
        raise ValueError(f"Ingredient {ingredient_id} not found")

    old_stock = ing.get("current_stock", 0)
    new_stock = max(0, old_stock - qty)

    ingredients_col.update_one({"id": ingredient_id}, {"$set": {
        "current_stock": round(new_stock, 4),
        "updated_at": _now(),
    }})

    txn = {
        "id": _uid(),
        "ingredient_id": ingredient_id,
        "transaction_type": "consume",
        "quantity": -qty,
        "reason": reason,
        "reference_id": reference_id,
        "stock_before": old_stock,
        "stock_after": new_stock,
        "timestamp": _now(),
    }
    inventory_col.insert_one(txn)
    del txn["_id"]

    # Record consumption for forecasting
    consumption_history_col.insert_one({
        "ingredient_id": ingredient_id,
        "quantity": qty,
        "reason": reason,
        "date": _now()[:10],
        "timestamp": _now(),
    })

    _audit("consume", {"ingredient_id": ingredient_id, "qty": qty, "reason": reason})
    return txn


# ---------------------------------------------------------------------------
# INVOICE PROCESSING (Purchasing -> Inventory -> Costing pipeline)
# ---------------------------------------------------------------------------
def process_invoice(invoice_data: dict) -> dict:
    invoice_id = _uid()
    results = {"invoice_id": invoice_id, "items_processed": 0, "items_created": 0,
               "inventory_updated": 0, "total_cost": 0, "errors": []}

    for item in invoice_data.get("items", []):
        try:
            # Try to match ingredient by SKU or name
            ing = None
            if item.get("sku"):
                ing = ingredients_col.find_one({"sku": item["sku"]}, {"_id": 0})
            if not ing and item.get("name"):
                ing = ingredients_col.find_one({"name": {"$regex": f"^{re.escape(item['name'])}$", "$options": "i"}}, {"_id": 0})

            if not ing:
                # Auto-create ingredient
                ing = upsert_ingredient({
                    "name": item["name"],
                    "sku": item.get("sku"),
                    "category": item.get("category", "other"),
                    "base_unit": item.get("unit", "each"),
                    "current_cost": item.get("unit_cost", 0),
                })
                results["items_created"] += 1

            # Receive into inventory
            qty = item.get("quantity", 0)
            cost = item.get("unit_cost", 0)
            if qty > 0:
                receive_inventory(ing["id"], qty, cost,
                                  vendor=invoice_data.get("vendor_name", ""),
                                  po_number=invoice_data.get("po_number", ""))
                results["inventory_updated"] += 1

            results["total_cost"] += round(qty * cost, 2)
            results["items_processed"] += 1
        except Exception as e:
            results["errors"].append({"item": item.get("name", "unknown"), "error": str(e)})

    # Save invoice record
    invoices_col.insert_one({
        "id": invoice_id,
        "vendor_name": invoice_data.get("vendor_name", ""),
        "po_number": invoice_data.get("po_number", ""),
        "invoice_number": invoice_data.get("invoice_number", ""),
        "items_count": len(invoice_data.get("items", [])),
        "total_cost": results["total_cost"],
        "processed_at": _now(),
        "results": results,
    })

    _audit("invoice_processed", {"invoice_id": invoice_id, "total": results["total_cost"]})
    return results


# ---------------------------------------------------------------------------
# RECIPE COSTING
# ---------------------------------------------------------------------------
def upsert_recipe(data: dict) -> dict:
    rid = data.get("id") or _uid()
    doc = {
        "id": rid,
        "name": data["name"],
        "category": data.get("category", "entree"),
        "yield_qty": data.get("yield_qty", 1),
        "yield_unit": data.get("yield_unit", "portion"),
        "ingredients": data.get("ingredients", []),
        "instructions": data.get("instructions", []),
        "prep_time_min": data.get("prep_time_min", 0),
        "cook_time_min": data.get("cook_time_min", 0),
        "menu_price": data.get("menu_price", 0),
        "target_food_cost_pct": data.get("target_food_cost_pct", 16),
        "portion_size_oz": data.get("portion_size_oz", 0),
        "updated_at": _now(),
    }
    recipes_col.update_one({"id": rid}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    return doc


def calculate_recipe_cost(recipe_id: str) -> dict:
    recipe = recipes_col.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise ValueError(f"Recipe {recipe_id} not found")

    total_cost = 0
    ingredient_costs = []

    for ri in recipe.get("ingredients", []):
        ing = ingredients_col.find_one({"id": ri.get("ingredient_id")}, {"_id": 0})
        if ing:
            qty = ri.get("qty", ri.get("quantity", 0))
            line_cost = round(ing.get("current_cost", 0) * qty, 4)
            total_cost += line_cost
            ingredient_costs.append({
                "ingredient_id": ing["id"],
                "name": ing["name"],
                "quantity": qty,
                "unit": ri.get("unit", ing.get("base_unit", "each")),
                "unit_cost": ing.get("current_cost", 0),
                "line_cost": line_cost,
            })

    yield_qty = recipe.get("yield_qty", 1) or 1
    cost_per_portion = round(total_cost / yield_qty, 4)
    menu_price = recipe.get("menu_price", 0)
    food_cost_pct = round((cost_per_portion / menu_price * 100), 2) if menu_price > 0 else 0
    target = recipe.get("target_food_cost_pct", 30)

    return {
        "recipe_id": recipe_id,
        "recipe_name": recipe["name"],
        "total_ingredient_cost": round(total_cost, 2),
        "yield_qty": yield_qty,
        "cost_per_portion": cost_per_portion,
        "menu_price": menu_price,
        "food_cost_pct": food_cost_pct,
        "target_food_cost_pct": target,
        "on_target": food_cost_pct <= target,
        "margin": round(menu_price - cost_per_portion, 2) if menu_price > 0 else 0,
        "portion_size_oz": recipe.get("portion_size_oz", 0),
        "ingredient_breakdown": ingredient_costs,
        "calculated_at": _now(),
    }


# ---------------------------------------------------------------------------
# PRODUCTION SCHEDULING (consume inventory when cooking)
# ---------------------------------------------------------------------------
def schedule_production(recipe_id: str, portions: int, scheduled_for: str,
                        event_id: str = "") -> dict:
    recipe = recipes_col.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise ValueError(f"Recipe {recipe_id} not found")

    prod_id = _uid()
    ingredient_needs = []
    for ri in recipe.get("ingredients", []):
        needed = ri.get("qty", ri.get("quantity", 0)) * portions / max(recipe.get("yield_qty", 1), 1)
        ing = ingredients_col.find_one({"id": ri.get("ingredient_id")}, {"_id": 0})
        ingredient_needs.append({
            "ingredient_id": ri.get("ingredient_id"),
            "name": ing["name"] if ing else "Unknown",
            "needed_qty": round(needed, 4),
            "available": ing.get("current_stock", 0) if ing else 0,
            "sufficient": (ing.get("current_stock", 0) >= needed) if ing else False,
        })

    doc = {
        "id": prod_id,
        "recipe_id": recipe_id,
        "recipe_name": recipe["name"],
        "portions": portions,
        "scheduled_for": scheduled_for,
        "event_id": event_id,
        "ingredient_needs": ingredient_needs,
        "status": "scheduled",
        "created_at": _now(),
    }
    production_col.insert_one(doc)
    del doc["_id"]
    _audit("production_scheduled", {"id": prod_id, "recipe": recipe["name"], "portions": portions})
    return doc


def execute_production(production_id: str) -> dict:
    prod = production_col.find_one({"id": production_id})
    if not prod:
        raise ValueError(f"Production {production_id} not found")

    consumed = []
    for need in prod.get("ingredient_needs", []):
        try:
            txn = consume_inventory(need["ingredient_id"], need["needed_qty"],
                                    reason="production", reference_id=production_id)
            consumed.append(txn)
        except Exception as e:
            consumed.append({"ingredient_id": need["ingredient_id"], "error": str(e)})

    production_col.update_one({"id": production_id}, {"$set": {
        "status": "executed",
        "executed_at": _now(),
        "consumption_results": consumed,
    }})
    _audit("production_executed", {"id": production_id})
    return {"production_id": production_id, "status": "executed", "consumed": len(consumed)}


# ---------------------------------------------------------------------------
# AUTO PO SUGGESTIONS
# ---------------------------------------------------------------------------
def generate_po_suggestions() -> list:
    low = get_low_stock_ingredients()
    suggestions = []
    for ing in low:
        deficit = max(0, ing.get("par_level", 0) - ing.get("current_stock", 0))
        order_qty = max(deficit, ing.get("reorder_qty", 0))
        if order_qty <= 0:
            order_qty = ing.get("reorder_point", 10)

        s = {
            "id": _uid(),
            "ingredient_id": ing["id"],
            "ingredient_name": ing["name"],
            "current_stock": ing.get("current_stock", 0),
            "par_level": ing.get("par_level", 0),
            "reorder_point": ing.get("reorder_point", 0),
            "suggested_qty": round(order_qty, 2),
            "estimated_cost": round(order_qty * ing.get("current_cost", 0), 2),
            "preferred_vendor": ing.get("preferred_vendor", ""),
            "urgency": "critical" if ing.get("current_stock", 0) <= 0 else "warning",
            "generated_at": _now(),
        }
        po_suggestions_col.insert_one(s)
        del s["_id"]
        suggestions.append(s)

    _audit("po_suggestions_generated", {"count": len(suggestions)})
    return suggestions


# ---------------------------------------------------------------------------
# STATS
# ---------------------------------------------------------------------------
def get_engine_stats() -> dict:
    total_ing = ingredients_col.count_documents({})
    low_stock = len(get_low_stock_ingredients())
    total_recipes = recipes_col.count_documents({})
    total_invoices = invoices_col.count_documents({})
    total_prod = production_col.count_documents({})

    # Total inventory value
    pipeline = [{"$group": {"_id": None, "value": {"$sum": {"$multiply": ["$current_stock", "$current_cost"]}}}}]
    inv_val_result = list(ingredients_col.aggregate(pipeline))
    inv_value = round(inv_val_result[0]["value"], 2) if inv_val_result else 0

    return {
        "total_ingredients": total_ing,
        "low_stock_count": low_stock,
        "total_recipes": total_recipes,
        "total_invoices_processed": total_invoices,
        "total_productions": total_prod,
        "inventory_value": inv_value,
        "engine": "operations_core",
        "status": "healthy",
        "timestamp": _now(),
    }
