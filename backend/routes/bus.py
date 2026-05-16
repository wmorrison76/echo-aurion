"""Event Bus routes."""
from typing import Optional
from fastapi import HTTPException
from pydantic import BaseModel
import event_bus


class EventBusPublish(BaseModel):
    event_type: str
    payload: dict
    source: Optional[str] = "api"
    correlation_id: Optional[str] = None
    idempotency_key: Optional[str] = None


def register(app):
    @app.post("/api/bus/publish")
    def bus_publish(data: EventBusPublish):
        return event_bus.publish(data.event_type, data.payload, data.source,
                                 data.correlation_id, data.idempotency_key)

    @app.get("/api/bus/events")
    def bus_events(event_type: Optional[str] = None, source: Optional[str] = None,
                   correlation_id: Optional[str] = None, limit: int = 50):
        return event_bus.query_events(event_type, source, correlation_id, limit)

    @app.get("/api/bus/event/{event_id}")
    def bus_event(event_id: str):
        e = event_bus.get_event(event_id)
        if not e:
            raise HTTPException(404, "Event not found")
        return e

    @app.post("/api/bus/replay")
    def bus_replay(event_type: Optional[str] = None, since: Optional[str] = None):
        return event_bus.replay_events(event_type, since)

    @app.get("/api/bus/dead-letters")
    def bus_dead_letters(limit: int = 50):
        return event_bus.get_dead_letters(limit)

    @app.post("/api/bus/dead-letters/{dl_id}/retry")
    def bus_retry_dl(dl_id: str):
        try:
            return event_bus.retry_dead_letter(dl_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.get("/api/bus/stats")
    def bus_stats():
        return event_bus.get_bus_stats()

    @app.get("/api/bus/event-types")
    def bus_event_types():
        return event_bus.EVENT_TYPES
