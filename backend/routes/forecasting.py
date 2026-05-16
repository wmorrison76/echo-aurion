"""AI Forecasting Engine routes."""
from typing import Optional
from fastapi import HTTPException, Query
from pydantic import BaseModel
import ai_forecasting


class ForecastEventInput(BaseModel):
    name: str
    event_type: Optional[str] = "banquet"
    date: str
    guest_count: Optional[int] = 0
    menu_items: Optional[list] = []
    impact_multiplier: Optional[float] = 1.5

class ConsumptionImportInput(BaseModel):
    records: list


def register(app):
    @app.get("/api/forecasting/ingredient/{ingredient_id}")
    def forecast_ingredient(ingredient_id: str, days: int = Query(7, ge=1, le=90)):
        try:
            return ai_forecasting.forecast_ingredient(ingredient_id, days)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/forecasting/all")
    def forecast_all():
        return ai_forecasting.forecast_all()

    @app.get("/api/forecasting/order-schedule")
    def order_schedule(days: int = Query(7, ge=1, le=30)):
        return ai_forecasting.generate_order_schedule(days)

    @app.get("/api/forecasting/alerts")
    def stock_alerts():
        return ai_forecasting.get_stock_alerts()

    @app.post("/api/forecasting/events")
    def add_forecast_event(data: ForecastEventInput):
        return ai_forecasting.add_forecast_event(data.model_dump())

    @app.get("/api/forecasting/events")
    def get_forecast_events(days: int = Query(14, ge=1, le=90)):
        return ai_forecasting.get_upcoming_events(days)

    @app.post("/api/forecasting/import")
    def import_consumption(data: ConsumptionImportInput):
        return ai_forecasting.import_consumption_data(data.records)
