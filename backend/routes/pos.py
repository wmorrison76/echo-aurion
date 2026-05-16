"""POS Integration routes."""
from typing import Optional
from fastapi import Query
from pydantic import BaseModel
import pos_integration
import event_bus


class MenuItemInput(BaseModel):
    id: Optional[str] = None
    name: str
    pos_item_id: Optional[str] = ""
    pos_provider: Optional[str] = "generic"
    category: Optional[str] = "entree"
    menu_price: Optional[float] = 0
    recipe_id: Optional[str] = None
    ingredient_map: Optional[list] = []
    active: Optional[bool] = True

class POSTransactionInput(BaseModel):
    external_id: Optional[str] = ""
    provider: Optional[str] = "generic"
    transaction_type: Optional[str] = "sale"
    outlet_id: Optional[str] = "main"
    server_name: Optional[str] = ""
    subtotal: Optional[float] = 0
    tax: Optional[float] = 0
    tip: Optional[float] = 0
    total: Optional[float] = 0
    guest_count: Optional[int] = 1
    items: list
    closed_at: Optional[str] = None


def register(app):
    @app.post("/api/pos/menu-item")
    def create_menu_item(data: MenuItemInput):
        return pos_integration.upsert_menu_item(data.model_dump())

    @app.get("/api/pos/menu-items")
    def get_menu_items(provider: Optional[str] = None):
        return pos_integration.get_menu_items(provider)

    @app.post("/api/pos/transaction")
    def process_pos_transaction(data: POSTransactionInput):
        result = pos_integration.process_transaction(data.model_dump())
        event_bus.publish("pos.transaction.processed", {
            "transaction_id": result.get("transaction_id"),
            "revenue": result.get("revenue_total", 0),
            "food_cost": result.get("food_cost_total", 0),
            "food_cost_pct": result.get("food_cost_pct", 0),
            "items": result.get("items_processed", 0),
        }, source="pos_integration")
        return result

    @app.post("/api/pos/webhook/toast")
    def toast_webhook(payload: dict):
        return pos_integration.handle_toast_webhook(payload)

    @app.post("/api/pos/webhook/square")
    def square_webhook(payload: dict):
        return pos_integration.handle_square_webhook(payload)

    @app.get("/api/pos/analytics")
    def pos_analytics(days: int = Query(7, ge=1, le=90), outlet_id: Optional[str] = None):
        return pos_integration.get_sales_analytics(days, outlet_id)

    @app.get("/api/pos/stats")
    def pos_stats():
        return pos_integration.get_pos_stats()
