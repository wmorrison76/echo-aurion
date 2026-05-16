"""
AI Event Brief Generator — Takes a client inquiry and auto-generates a full BEO draft.
Pulls menu recommendations (Fix My Menu), room layout (VR configs), and staffing estimates (Scenario Planner).
Uses GPT-4.1-mini via Emergent LLM Key.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
import json

router = APIRouter(prefix="/api/event-brief", tags=["event-brief"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

from database import db as _db
briefs_col = _db["event_briefs"]
menu_items_col = _db["menu_items"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


def _get_menu_context():
    """Pull top menu items for AI context."""
    items = list(menu_items_col.find({}, {"_id": 0, "name": 1, "category": 1, "price": 1, "sell_price": 1, "food_cost": 1}).limit(25))
    healthy = []
    for item in items:
        sp = item.get("price", item.get("sell_price", 0))
        fc = item.get("food_cost", 0)
        if sp > 0 and fc / sp < 0.35:
            healthy.append(f"- {item['name']} ({item.get('category','')}) — ${sp}")
    return "\n".join(healthy[:12]) if healthy else "No menu data available"


def _get_room_configs():
    """Pull room configuration context."""
    return """Available Room Configurations:
- Grand Ballroom: 500 pax, banquet rounds (40 tables × 10), theater 500, cocktail 350
- Salon B: 200 pax, banquet 20 rounds, classroom 90, boardroom 40
- Oceanview Terrace: 200 pax, cocktail with ocean view, ceremony 150 seated
- Garden Pavilion: 150 pax, ceremony/reception, tented options
- Executive Boardroom: 30 pax, U-shape, hollow square, classroom"""


def _get_staffing_context(guest_count: int):
    """Generate staffing estimates based on guest count."""
    servers = max(1, guest_count // 20)
    bartenders = max(1, guest_count // 75)
    captains = max(1, servers // 5)
    bussers = max(1, guest_count // 40)
    kitchen = max(2, guest_count // 50)
    return {
        "servers": servers,
        "bartenders": bartenders,
        "captains": captains,
        "bussers": bussers,
        "kitchen_staff": kitchen,
        "total_staff": servers + bartenders + captains + bussers + kitchen,
    }


@router.post("/generate")
async def generate_event_brief(body: dict):
    """Generate a full BEO/event brief from a client inquiry using AI."""
    client_name = body.get("client_name", "Client")
    event_type = body.get("event_type", "Corporate Dinner")
    guest_count = body.get("guest_count", 100)
    date = body.get("date", "TBD")
    budget_range = body.get("budget_range", "")
    special_requests = body.get("special_requests", "")
    dietary_notes = body.get("dietary_notes", "")
    inquiry_text = body.get("inquiry_text", "")

    menu_context = _get_menu_context()
    room_context = _get_room_configs()
    staffing = _get_staffing_context(guest_count)

    prompt = f"""You are an expert hospitality event planner for a luxury mega-resort. Generate a comprehensive Banquet Event Order (BEO) draft based on this client inquiry.

CLIENT INQUIRY:
- Client: {client_name}
- Event Type: {event_type}
- Guest Count: {guest_count}
- Date: {date}
- Budget: {budget_range or 'Not specified'}
- Special Requests: {special_requests or 'None'}
- Dietary Notes: {dietary_notes or 'None'}
- Additional Details: {inquiry_text or 'None'}

AVAILABLE MENU ITEMS (margin-healthy):
{menu_context}

{room_context}

STAFFING ESTIMATE: {json.dumps(staffing)}

Generate a complete BEO draft in this JSON structure:
{{
  "event_title": "Event name",
  "event_summary": "2-3 sentence overview",
  "room_recommendation": {{
    "primary_room": "room name",
    "setup_style": "banquet/theater/cocktail/etc",
    "capacity_fit": "how the room fits the guest count",
    "alt_room": "alternative option"
  }},
  "timeline": [
    {{"time": "5:00 PM", "activity": "description"}},
  ],
  "menu_recommendation": {{
    "style": "plated/buffet/stations/family-style",
    "courses": [
      {{"course": "Appetizer", "items": ["item1", "item2"], "notes": "any notes"}}
    ],
    "beverage_package": "description of recommended package",
    "dietary_accommodations": "how dietary needs are handled"
  }},
  "staffing_plan": {{
    "servers": {staffing['servers']},
    "bartenders": {staffing['bartenders']},
    "captains": {staffing['captains']},
    "bussers": {staffing['bussers']},
    "kitchen_staff": {staffing['kitchen_staff']},
    "total": {staffing['total_staff']},
    "notes": "staffing rationale"
  }},
  "av_decor": {{
    "av_needs": ["list of AV equipment"],
    "decor_theme": "suggested theme",
    "special_elements": ["any special decor items"]
  }},
  "estimated_cost": {{
    "food_beverage": 0,
    "room_rental": 0,
    "av_decor": 0,
    "staffing": 0,
    "service_charge_pct": 22,
    "tax_pct": 8.25,
    "estimated_total": 0,
    "per_person": 0
  }},
  "notes_for_client": "personalized notes and recommendations",
  "internal_notes": "notes for the events team"
}}

Return ONLY valid JSON. Be specific with menu items, timing, and costs. Make it feel personalized and premium."""

    # Try AI generation first
    ai_generated = False
    brief_data = None

    if LLM_KEY:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=LLM_KEY,
                session_id=f"event-brief-{_uid()}",
                system_message="You are a luxury hospitality event planning AI. Always return valid JSON."
            )
            chat.with_model("openai", "gpt-4.1-mini")
            response = await chat.send_message(UserMessage(text=prompt))

            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

            brief_data = json.loads(cleaned)
            ai_generated = True
        except Exception as e:
            print(f"[EventBrief] AI generation failed: {e}, using deterministic fallback")

    # Deterministic fallback
    if not brief_data:
        per_person = 85 + (guest_count // 100) * 10
        food_bev = guest_count * per_person
        room_rental = 2500 if guest_count <= 100 else 5000 if guest_count <= 300 else 8000
        av_cost = 1500 if guest_count <= 100 else 3000
        staff_cost = staffing["total_staff"] * 250
        subtotal = food_bev + room_rental + av_cost + staff_cost
        service_charge = subtotal * 0.22
        tax = (subtotal + service_charge) * 0.0825
        total = subtotal + service_charge + tax

        brief_data = {
            "event_title": f"{client_name} — {event_type}",
            "event_summary": f"A {event_type.lower()} for {guest_count} guests at our luxury resort. This event features premium dining, professional service, and elegant decor tailored to the client's vision.",
            "room_recommendation": {
                "primary_room": "Grand Ballroom" if guest_count > 200 else "Salon B" if guest_count > 50 else "Executive Boardroom",
                "setup_style": "banquet rounds" if "dinner" in event_type.lower() else "cocktail" if "cocktail" in event_type.lower() else "theater",
                "capacity_fit": f"Comfortably accommodates {guest_count} guests with room for AV and service stations",
                "alt_room": "Oceanview Terrace (weather permitting)",
            },
            "timeline": [
                {"time": "5:00 PM", "activity": "Venue access — AV and decor setup begins"},
                {"time": "6:00 PM", "activity": "Cocktail reception with passed appetizers"},
                {"time": "7:00 PM", "activity": "Guests seated — Welcome remarks"},
                {"time": "7:15 PM", "activity": "First course served"},
                {"time": "8:00 PM", "activity": "Main course service"},
                {"time": "8:45 PM", "activity": "Dessert and coffee service"},
                {"time": "9:30 PM", "activity": "After-dinner program / entertainment"},
                {"time": "10:30 PM", "activity": "Event concludes"},
            ],
            "menu_recommendation": {
                "style": "plated" if guest_count <= 200 else "buffet stations",
                "courses": [
                    {"course": "Appetizer", "items": ["Caesar Salad", "French Onion Soup"], "notes": "Choice of one"},
                    {"course": "Entree", "items": ["Pan-Seared Salmon", "Grilled Chicken Breast", "Truffle Risotto (V)"], "notes": "Guest pre-select or plated choice"},
                    {"course": "Dessert", "items": ["Chocolate Lava Cake", "Tiramisu"], "notes": "Duo plate presentation"},
                ],
                "beverage_package": "Premium open bar (4 hours) with signature cocktail, house wine, craft beer selection",
                "dietary_accommodations": dietary_notes or "Vegetarian, vegan, gluten-free, and nut-free options available upon request",
            },
            "staffing_plan": {**staffing, "total": staffing["total_staff"], "notes": f"Based on {guest_count} guests with premium service ratio. 1 server per 20 guests, 1 bartender per 75."},
            "av_decor": {
                "av_needs": ["Wireless microphone system", "Projector + 12ft screen", "House sound system", "Uplighting (16 fixtures)"],
                "decor_theme": "Classic elegance with seasonal florals",
                "special_elements": ["Custom table centerpieces", "Welcome signage", "Photo opportunity backdrop"],
            },
            "estimated_cost": {
                "food_beverage": round(food_bev, 2),
                "room_rental": room_rental,
                "av_decor": av_cost,
                "staffing": staff_cost,
                "service_charge_pct": 22,
                "tax_pct": 8.25,
                "estimated_total": round(total, 2),
                "per_person": round(total / max(guest_count, 1), 2),
            },
            "notes_for_client": f"We're excited to host your {event_type.lower()}! Our team will ensure every detail is perfect. We recommend a site visit to finalize room selection and decor details.",
            "internal_notes": f"Budget {budget_range or 'not specified'}. {special_requests or 'No special requests noted.'}",
        }

    # Save to DB
    brief = {
        "brief_id": f"brief-{_uid()}",
        "client_name": client_name,
        "event_type": event_type,
        "guest_count": guest_count,
        "date": date,
        "ai_generated": ai_generated,
        "brief": brief_data,
        "status": "draft",
        "created_at": _now(),
    }
    briefs_col.insert_one(brief)
    del brief["_id"]
    return brief


@router.get("/briefs")
def list_briefs(limit: int = 20):
    """List all generated event briefs."""
    briefs = list(briefs_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"briefs": briefs, "total": len(briefs)}


@router.get("/briefs/{brief_id}")
def get_brief(brief_id: str):
    """Get a specific event brief."""
    brief = briefs_col.find_one({"brief_id": brief_id}, {"_id": 0})
    return brief or {"error": "Brief not found"}


@router.put("/briefs/{brief_id}")
def update_brief(brief_id: str, body: dict):
    """Update brief status or content."""
    updates = {}
    if "status" in body:
        updates["status"] = body["status"]
    if "brief" in body:
        updates["brief"] = body["brief"]
    updates["updated_at"] = _now()
    briefs_col.update_one({"brief_id": brief_id}, {"$set": updates})
    return briefs_col.find_one({"brief_id": brief_id}, {"_id": 0}) or {"error": "Not found"}
