"""
Event Layout Template Engine
==============================
Generates floor plans, learns from past events, saves as templates.
Requires event manager approval before attaching to BEO.
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/event-layouts", tags=["event-layouts"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

ROOMS = {
    "Coastal Room": {"sqft": 4200, "max_capacity": {"theater": 300, "banquet": 200, "reception": 250, "classroom": 150, "conference": 60}},
    "Crystal Ballroom": {"sqft": 8500, "max_capacity": {"theater": 600, "banquet": 400, "reception": 500, "classroom": 300, "conference": 120}},
    "Pier Deck": {"sqft": 3000, "max_capacity": {"theater": 200, "banquet": 120, "reception": 180, "classroom": 80, "conference": 40}},
    "Marina Room": {"sqft": 2400, "max_capacity": {"theater": 150, "banquet": 100, "reception": 130, "classroom": 60, "conference": 30}},
    "Sky Lounge": {"sqft": 1800, "max_capacity": {"theater": 100, "banquet": 60, "reception": 80, "classroom": 40, "conference": 20}},
    "Boardroom A": {"sqft": 800, "max_capacity": {"theater": 0, "banquet": 0, "reception": 0, "classroom": 0, "conference": 24}},
    "Boardroom B": {"sqft": 600, "max_capacity": {"theater": 0, "banquet": 0, "reception": 0, "classroom": 0, "conference": 16}},
}

class LayoutInput(BaseModel):
    room: str
    setup_style: str  # theater, banquet, reception, classroom, conference, buffet
    guest_count: int
    beo_id: str = ""
    elements: List[dict] = []  # Custom elements [{type, x, y, width, height, label}]
    notes: str = ""

class LayoutApproval(BaseModel):
    layout_id: str
    approved: bool
    notes: str = ""


@router.post("/generate")
async def generate_layout(data: LayoutInput):
    """Auto-generate a floor plan based on room, style, and guest count."""
    room_info = ROOMS.get(data.room)
    if not room_info:
        raise HTTPException(400, f"Unknown room. Available: {list(ROOMS.keys())}")

    max_cap = room_info["max_capacity"].get(data.setup_style, 0)
    fits = data.guest_count <= max_cap if max_cap > 0 else True

    # Auto-generate element placement based on style
    elements = data.elements or _auto_place(data.setup_style, data.guest_count, room_info["sqft"])

    # Check for similar past layouts (pattern learning)
    similar = list(db["event_layouts"].find(
        {"room": data.room, "setup_style": data.setup_style, "status": "approved"},
        {"_id": 0, "id": 1, "guest_count": 1, "satisfaction_avg": 1}
    ).sort("satisfaction_avg", -1).limit(3))

    layout = {
        "id": f"lay-{_uid()}", "room": data.room, "setup_style": data.setup_style,
        "guest_count": data.guest_count, "beo_id": data.beo_id,
        "sqft": room_info["sqft"], "max_capacity": max_cap, "fits": fits,
        "elements": elements, "element_count": len(elements),
        "notes": data.notes,
        "status": "proposed", "created_at": _now(),
        "similar_past_layouts": similar,
        "is_template": False,
    }
    db["event_layouts"].insert_one(layout)
    layout.pop("_id", None)
    return layout


def _auto_place(style: str, guests: int, sqft: int) -> list:
    """Auto-generate element positions based on setup style."""
    elements = []
    if style == "banquet":
        tables = max(1, guests // 8)
        for i in range(tables):
            row = i // 5
            col = i % 5
            elements.append({"type": "round_table_8", "x": 100 + col * 180, "y": 100 + row * 180,
                             "width": 120, "height": 120, "label": f"Table {i+1}", "seats": 8})
        elements.append({"type": "buffet_station", "x": 50, "y": 50, "width": 300, "height": 60, "label": "Buffet Display"})
        elements.append({"type": "beverage_station", "x": 400, "y": 50, "width": 150, "height": 60, "label": "Beverage Station"})
    elif style == "theater":
        rows = max(1, guests // 12)
        for i in range(rows):
            elements.append({"type": "chair_row", "x": 100, "y": 120 + i * 50, "width": 600, "height": 30, "label": f"Row {i+1}", "seats": 12})
        elements.append({"type": "stage", "x": 100, "y": 30, "width": 600, "height": 60, "label": "Stage/Podium"})
    elif style == "reception":
        elements.append({"type": "bar", "x": 50, "y": 50, "width": 200, "height": 60, "label": "Bar"})
        elements.append({"type": "buffet_station", "x": 300, "y": 50, "width": 300, "height": 60, "label": "Food Station"})
        cocktail_tables = max(1, guests // 4)
        for i in range(cocktail_tables):
            elements.append({"type": "cocktail_table", "x": 80 + (i % 6) * 120, "y": 200 + (i // 6) * 120,
                             "width": 40, "height": 40, "label": f"Cocktail {i+1}", "seats": 4})
    elif style in ["conference", "classroom"]:
        elements.append({"type": "conference_table", "x": 100, "y": 100, "width": 400, "height": 150,
                         "label": "Conference Table", "seats": guests})
        elements.append({"type": "screen", "x": 200, "y": 30, "width": 200, "height": 20, "label": "Screen/Display"})
    else:
        # Default buffet
        elements.append({"type": "buffet_station", "x": 50, "y": 50, "width": 400, "height": 60, "label": "Buffet Line"})

    elements.append({"type": "entrance", "x": 0, "y": 300, "width": 40, "height": 60, "label": "Entrance"})
    elements.append({"type": "av_booth", "x": 600, "y": 30, "width": 60, "height": 40, "label": "AV"})
    return elements


@router.post("/approve")
async def approve_layout(data: LayoutApproval):
    """Event manager approves or rejects a layout before it's attached to BEO."""
    update = {"status": "approved" if data.approved else "rejected",
              "approved_at" if data.approved else "rejected_at": _now(),
              "approval_notes": data.notes}

    db["event_layouts"].update_one({"id": data.layout_id}, {"$set": update})

    # If approved, attach to BEO
    if data.approved:
        layout = db["event_layouts"].find_one({"id": data.layout_id}, {"_id": 0})
        if layout and layout.get("beo_id"):
            db["beo_documents"].update_one(
                {"id": layout["beo_id"]},
                {"$set": {"layout_id": data.layout_id, "layout_attached": True},
                 "$push": {"changelog": {"action": f"Layout {data.layout_id} approved and attached", "timestamp": _now(), "by": "event_manager"}}}
            )

    return {"layout_id": data.layout_id, "status": update["status"]}


@router.post("/{layout_id}/save-template")
async def save_as_template(layout_id: str, template_name: str = Query(...)):
    """Save an approved layout as a reusable template."""
    db["event_layouts"].update_one({"id": layout_id}, {"$set": {"is_template": True, "template_name": template_name}})
    return {"layout_id": layout_id, "template_name": template_name, "saved": True}


@router.get("/templates")
async def list_templates(room: Optional[str] = None):
    q: dict = {"is_template": True}
    if room:
        q["room"] = room
    templates = list(db["event_layouts"].find(q, {"_id": 0}).sort("satisfaction_avg", -1))
    return {"templates": templates, "total": len(templates)}


@router.get("/rooms")
async def list_rooms():
    return {"rooms": {name: info for name, info in ROOMS.items()}}
