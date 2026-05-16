"""Event Lifecycle Engine routes."""
from typing import Optional
from fastapi import HTTPException
from pydantic import BaseModel
import event_lifecycle
import event_bus
import tamper_audit


class EventInput(BaseModel):
    name: str
    event_type: Optional[str] = "other"
    org_id: Optional[str] = "default"
    client_name: Optional[str] = ""
    client_email: Optional[str] = ""
    client_phone: Optional[str] = ""
    client_company: Optional[str] = ""
    event_date: Optional[str] = ""
    start_time: Optional[str] = ""
    end_time: Optional[str] = ""
    guest_count: Optional[int] = 0
    guaranteed_count: Optional[int] = 0
    venue: Optional[str] = ""
    room: Optional[str] = ""
    menu_items: Optional[list] = []
    beo_notes: Optional[str] = ""
    dietary_requirements: Optional[list] = []
    setup_style: Optional[str] = ""
    table_count: Optional[int] = 0
    notes: Optional[list] = []
    tags: Optional[list] = []
    assigned_to: Optional[str] = ""
    created_by: Optional[str] = "system"

class StageAdvanceInput(BaseModel):
    target_stage: str
    by: Optional[str] = "system"
    notes: Optional[str] = ""
    data: Optional[dict] = {}

class RevenueInput(BaseModel):
    food: Optional[float] = None
    beverage: Optional[float] = None
    rental: Optional[float] = None
    av: Optional[float] = None
    service_charge: Optional[float] = None
    other: Optional[float] = None

class CostsInput(BaseModel):
    food: Optional[float] = None
    beverage: Optional[float] = None
    labor: Optional[float] = None
    rental: Optional[float] = None
    overhead: Optional[float] = None


def register(app):
    @app.post("/api/events/lifecycle")
    def create_event(data: EventInput):
        return event_lifecycle.create_event(data.model_dump())

    @app.get("/api/events/lifecycle")
    def list_events(stage: Optional[str] = None, phase: Optional[int] = None,
                    event_type: Optional[str] = None, limit: int = 50):
        return event_lifecycle.list_events(stage, phase, event_type, limit)

    @app.get("/api/events/lifecycle/{event_id}")
    def get_event(event_id: str):
        e = event_lifecycle.get_event(event_id)
        if not e:
            raise HTTPException(404, "Event not found")
        return e

    @app.post("/api/events/lifecycle/{event_id}/advance")
    def advance_stage(event_id: str, data: StageAdvanceInput):
        try:
            result = event_lifecycle.advance_stage(
                event_id, data.target_stage, data.by, data.notes, data.data)
            event_bus.publish("event.stage.advanced", {
                "event_id": event_id, "to_stage": data.target_stage,
                "event_name": result.get("name", ""), "by": data.by,
            }, source="event_lifecycle")
            tamper_audit.log_entry("event.stage_advanced", "event", event_id,
                                   data.by, changes={"stage": data.target_stage})
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.put("/api/events/lifecycle/{event_id}/revenue")
    def update_revenue(event_id: str, data: RevenueInput):
        try:
            d = {k: v for k, v in data.model_dump().items() if v is not None}
            return event_lifecycle.update_event_revenue(event_id, d)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.put("/api/events/lifecycle/{event_id}/costs")
    def update_costs(event_id: str, data: CostsInput):
        try:
            d = {k: v for k, v in data.model_dump().items() if v is not None}
            return event_lifecycle.update_event_costs(event_id, d)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/events/lifecycle/{event_id}/pnl")
    def event_pnl(event_id: str):
        try:
            return event_lifecycle.get_event_pnl(event_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/events/pipeline")
    def event_pipeline():
        return event_lifecycle.get_pipeline()

    @app.get("/api/events/gl-entries")
    def gl_entries(event_id: Optional[str] = None, account_code: Optional[str] = None):
        return event_lifecycle.get_gl_entries(event_id, account_code)

    @app.get("/api/events/aggregate-pnl")
    def aggregate_pnl(date_from: Optional[str] = None, date_to: Optional[str] = None):
        return event_lifecycle.get_aggregate_pnl(date_from, date_to)

    @app.get("/api/events/stats")
    def event_stats():
        return event_lifecycle.get_lifecycle_stats()

    @app.get("/api/events/stages")
    def get_stages():
        return {
            "stages": event_lifecycle.LIFECYCLE_STAGES,
            "phase_map": event_lifecycle.PHASE_MAP,
            "event_types": event_lifecycle.EVENT_TYPES,
        }
