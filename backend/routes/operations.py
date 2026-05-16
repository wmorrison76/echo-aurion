"""Operations Core Engine routes."""
from typing import Optional
from fastapi import HTTPException
from pydantic import BaseModel
import operations_core
import event_bus


class IngredientInput(BaseModel):
    id: Optional[str] = None
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = "other"
    base_unit: Optional[str] = "each"
    purchase_unit: Optional[str] = None
    purchase_to_base: Optional[float] = 1
    current_cost: Optional[float] = 0
    current_stock: Optional[float] = 0
    par_level: Optional[float] = 0
    reorder_point: Optional[float] = 0
    reorder_qty: Optional[float] = 0
    preferred_vendor: Optional[str] = None
    allergens: Optional[list] = []
    shelf_life_days: Optional[int] = None

class ReceiveInput(BaseModel):
    ingredient_id: str
    quantity: float
    unit_cost: float
    vendor: Optional[str] = ""
    po_number: Optional[str] = ""
    lot_number: Optional[str] = ""

class ConsumeInput(BaseModel):
    ingredient_id: str
    quantity: float
    reason: Optional[str] = "production"
    reference_id: Optional[str] = ""

class InvoiceInput(BaseModel):
    vendor_name: str
    po_number: Optional[str] = ""
    invoice_number: Optional[str] = ""
    items: list

class RecipeInput(BaseModel):
    id: Optional[str] = None
    name: str
    category: Optional[str] = "entree"
    yield_qty: Optional[int] = 1
    yield_unit: Optional[str] = "portion"
    ingredients: Optional[list] = []
    instructions: Optional[list] = []
    prep_time_min: Optional[int] = 0
    cook_time_min: Optional[int] = 0
    menu_price: Optional[float] = 0
    target_food_cost_pct: Optional[float] = 30

class ProductionInput(BaseModel):
    recipe_id: str
    portions: int
    scheduled_for: str
    event_id: Optional[str] = ""


def register(app):
    @app.post("/api/operations/ingredient")
    def create_ingredient(data: IngredientInput):
        return operations_core.upsert_ingredient(data.model_dump())

    @app.get("/api/operations/ingredients")
    def list_ingredients(category: Optional[str] = None, low_stock: bool = False):
        return operations_core.list_ingredients(category=category, low_stock_only=low_stock)

    @app.get("/api/operations/ingredient/{ingredient_id}")
    def get_ingredient(ingredient_id: str):
        r = operations_core.get_ingredient(ingredient_id)
        if not r:
            raise HTTPException(404, "Ingredient not found")
        return r

    @app.get("/api/operations/low-stock")
    def low_stock():
        return operations_core.get_low_stock_ingredients()

    @app.post("/api/operations/inventory/receive")
    def receive(data: ReceiveInput):
        try:
            result = operations_core.receive_inventory(
                data.ingredient_id, data.quantity, data.unit_cost,
                data.vendor, data.po_number, data.lot_number)
            event_bus.publish("ops.inventory.received", {
                "ingredient_id": data.ingredient_id, "qty": data.quantity,
                "cost": data.unit_cost}, source="operations_core")
            return result
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/operations/inventory/consume")
    def consume(data: ConsumeInput):
        try:
            result = operations_core.consume_inventory(
                data.ingredient_id, data.quantity, data.reason, data.reference_id)
            event_bus.publish("ops.inventory.consumed", {
                "ingredient_id": data.ingredient_id, "qty": data.quantity,
                "reason": data.reason}, source="operations_core")
            return result
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/operations/invoice/process")
    def process_invoice(data: InvoiceInput):
        return operations_core.process_invoice(data.model_dump())

    @app.post("/api/operations/recipe")
    def create_recipe(data: RecipeInput):
        return operations_core.upsert_recipe(data.model_dump())

    @app.get("/api/operations/recipes")
    def list_recipes():
        return list(operations_core.recipes_col.find({}, {"_id": 0}))

    @app.get("/api/operations/recipe/{recipe_id}")
    def get_recipe(recipe_id: str):
        r = operations_core.recipes_col.find_one({"id": recipe_id}, {"_id": 0})
        if not r:
            raise HTTPException(404, "Recipe not found")
        return r

    @app.post("/api/operations/consume")
    def consume_for_recipe(data: ProductionInput):
        """Consume inventory for a recipe (used by PurchRec module)."""
        try:
            return operations_core.schedule_production(
                data.recipe_id, data.portions, data.scheduled_for, data.event_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/operations/recipe/{recipe_id}/cost")
    def recipe_cost(recipe_id: str):
        try:
            return operations_core.calculate_recipe_cost(recipe_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/operations/production/schedule")
    def schedule_production(data: ProductionInput):
        try:
            return operations_core.schedule_production(
                data.recipe_id, data.portions, data.scheduled_for, data.event_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/operations/production/{production_id}/execute")
    def execute_production(production_id: str):
        try:
            return operations_core.execute_production(production_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/operations/po-suggestions")
    def po_suggestions():
        return operations_core.generate_po_suggestions()

    @app.get("/api/operations/stats")
    def ops_stats():
        return operations_core.get_engine_stats()
