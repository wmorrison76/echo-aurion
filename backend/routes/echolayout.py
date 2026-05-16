"""
EchoLayout API
- Room Scanner (Gemini Vision)
- Floor Plan Template CRUD (MongoDB)
"""
import os
import json
import base64
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import database

router = APIRouter(prefix="/api/echolayout", tags=["echolayout"])
templates_col = database.db["floor_templates"]

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_LLM = True
except ImportError:
    HAS_LLM = False


class ScanResult(BaseModel):
    description: str
    room_width: Optional[int] = None
    room_length: Optional[int] = None
    suggested_layout: Optional[str] = None
    max_capacity: Optional[int] = None
    suggestions: list[str] = []


@router.post("/scan-room")
async def scan_room(
    photo: UploadFile = File(...),
    room_width: int = Form(60),
    room_length: int = Form(80),
):
    """Analyze a room photo using Gemini Vision and suggest floor plan configurations."""
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")

    if not HAS_LLM or not api_key:
        return ScanResult(
            description="AI room analysis is not available. Please configure the Emergent LLM key.",
            suggestions=["Use the 2D Floor Plan designer to manually create your layout."],
        ).model_dump()

    # Read and encode the image
    image_data = await photo.read()
    b64_image = base64.b64encode(image_data).decode("utf-8")
    mime_type = photo.content_type or "image/jpeg"

    prompt = f"""Analyze this photo of an event/banquet space. The estimated room dimensions are {room_width}ft x {room_length}ft.

Provide a JSON response with:
1. "description": A brief description of the room (shape, features, windows, doors, pillars)
2. "room_width": Estimated width in feet (use the provided estimate if you can't determine)
3. "room_length": Estimated length in feet
4. "suggested_layout": One of "banquet", "theatre", "classroom", "cocktail", "ushape"
5. "max_capacity": Estimated max seated capacity
6. "suggestions": Array of 3-5 specific suggestions for optimizing this space

Be practical and specific. Focus on fire exits, ADA compliance, traffic flow, and sight lines.
Return ONLY valid JSON, no markdown."""

    try:
        llm = LlmChat(api_key=api_key, model="gemini-2.0-flash")
        llm.add_message(
            UserMessage(
                content=prompt,
                images=[f"data:{mime_type};base64,{b64_image}"],
            )
        )
        response = await llm.chat()

        # Parse the response
        text = response.message.strip()
        # Strip markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        if text.startswith("json"):
            text = text[4:]

        data = json.loads(text.strip())
        return ScanResult(**data).model_dump()

    except json.JSONDecodeError:
        return ScanResult(
            description="AI analyzed the room but couldn't format the response. The room appears suitable for events.",
            room_width=room_width,
            room_length=room_length,
            suggested_layout="banquet",
            suggestions=[
                "Consider round tables for formal dining events",
                "Ensure 36-inch minimum aisle width for ADA compliance",
                "Place the stage/podium where all attendees have clear sight lines",
            ],
        ).model_dump()
    except Exception as e:
        return ScanResult(
            description=f"Room analysis encountered an issue: {str(e)[:100]}",
            room_width=room_width,
            room_length=room_length,
            suggestions=["Try uploading a clearer, well-lit photo of the room."],
        ).model_dump()



# ─── Template Models ────────────────────────────────────────────────

class FloorElementModel(BaseModel):
    id: str
    type: str
    x: float
    y: float
    width: float
    height: float
    rotation: float = 0
    seats: int = 0
    tableNumber: Optional[int] = None
    section: Optional[str] = None
    label: Optional[str] = None
    guests: list[str] = []


class TemplateSaveRequest(BaseModel):
    name: str
    event_name: str = ""
    venue_name: str = ""
    room_width: int = 60
    room_length: int = 80
    elements: list[dict] = []
    beo_contact: str = ""
    beo_date: str = ""
    beo_setup_style: str = ""
    beo_guaranteed_count: int = 0


class TemplateResponse(BaseModel):
    id: str
    name: str
    event_name: str
    venue_name: str
    room_width: int
    room_length: int
    elements: list[dict]
    beo_contact: str
    beo_date: str
    beo_setup_style: str
    beo_guaranteed_count: int
    total_seats: int
    table_count: int
    created_at: str
    updated_at: str


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.post("/templates")
async def save_template(data: TemplateSaveRequest):
    """Save a floor plan template to MongoDB."""
    total_seats = sum(el.get("seats", 0) for el in data.elements)
    table_count = sum(1 for el in data.elements if "table" in el.get("type", ""))
    now = _now()
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "event_name": data.event_name,
        "venue_name": data.venue_name,
        "room_width": data.room_width,
        "room_length": data.room_length,
        "elements": data.elements,
        "beo_contact": data.beo_contact,
        "beo_date": data.beo_date,
        "beo_setup_style": data.beo_setup_style,
        "beo_guaranteed_count": data.beo_guaranteed_count,
        "total_seats": total_seats,
        "table_count": table_count,
        "created_at": now,
        "updated_at": now,
    }
    templates_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/templates")
async def list_templates():
    """List all saved floor plan templates."""
    docs = list(templates_col.find({}, {"_id": 0}).sort("updated_at", -1))
    return docs


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get a single floor plan template."""
    doc = templates_col.find_one({"id": template_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    return doc


@router.put("/templates/{template_id}")
async def update_template(template_id: str, data: TemplateSaveRequest):
    """Update an existing floor plan template."""
    existing = templates_col.find_one({"id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    total_seats = sum(el.get("seats", 0) for el in data.elements)
    table_count = sum(1 for el in data.elements if "table" in el.get("type", ""))
    updates = {
        "name": data.name,
        "event_name": data.event_name,
        "venue_name": data.venue_name,
        "room_width": data.room_width,
        "room_length": data.room_length,
        "elements": data.elements,
        "beo_contact": data.beo_contact,
        "beo_date": data.beo_date,
        "beo_setup_style": data.beo_setup_style,
        "beo_guaranteed_count": data.beo_guaranteed_count,
        "total_seats": total_seats,
        "table_count": table_count,
        "updated_at": _now(),
    }
    templates_col.update_one({"id": template_id}, {"$set": updates})
    doc = templates_col.find_one({"id": template_id}, {"_id": 0})
    return doc


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a floor plan template."""
    result = templates_col.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"deleted": True, "id": template_id}
