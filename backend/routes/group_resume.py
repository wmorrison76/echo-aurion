"""
Group Resume Builder — AI-Powered Event Document Generation
============================================================
Creates group resumes (like the eClinical Works Enterprise Summit)
from notes, conversations, and BEO data. AI-assisted with spell
check, auto-fill, and full document generation.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from typing import Optional
from database import db
import os

router = APIRouter(prefix="/api/group-resume", tags=["group-resume"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

RESUME_TEMPLATE_SECTIONS = [
    "group_info", "meeting_details", "contact_info", "group_profile",
    "pre_conference", "vip_info", "room_blocks", "meeting_rooms",
    "food_beverage", "av_requirements", "transportation", "billing",
    "schedule_of_events", "housekeeping", "security", "special_instructions",
]


@router.get("/templates")
async def list_templates():
    """List resume templates."""
    return {"templates": [
        {"id": "standard", "name": "Standard Group Resume", "sections": RESUME_TEMPLATE_SECTIONS},
        {"id": "corporate", "name": "Corporate Meeting", "sections": RESUME_TEMPLATE_SECTIONS},
        {"id": "social", "name": "Social Event", "sections": ["group_info", "contact_info", "room_blocks", "food_beverage", "schedule_of_events", "billing"]},
    ]}


@router.get("")
async def list_resumes(status: Optional[str] = None):
    """List all group resumes."""
    q: dict = {}
    if status:
        q["status"] = status
    resumes = list(db["group_resumes"].find(q, {"_id": 0}).sort("updated_at", -1))
    return {"resumes": resumes, "total": len(resumes)}


# iter202c · Import-from-events endpoints — MUST be declared BEFORE /{resume_id}
# so FastAPI doesn't swallow 'importable-events' as a resume id.

@router.get("/importable-events")
async def importable_events_for_resume(limit: int = 50):
    """Return events that look like they need a group resume — prefers multi-day
    events with guest_count >= 50, or any contract_signed / beo_issued events."""
    serious_stages = ["contract_signed", "deposit_received", "menu_selected", "beo_issued"]
    already = {r.get("imported_from_event_id") for r in db["group_resumes"].find(
        {"imported_from_event_id": {"$exists": True}}, {"imported_from_event_id": 1}
    )}
    results = []
    for coll_name in ("events", "echo_events", "group_events"):
        if coll_name not in db.list_collection_names():
            continue
        cur = db[coll_name].find({}, {
            "_id": 0, "id": 1, "name": 1, "title": 1, "start_date": 1, "end_date": 1,
            "event_date": 1, "guaranteed_count": 1, "guest_count": 1, "attendee_count": 1,
            "client_name": 1, "venue": 1, "location": 1, "stage": 1,
        }).limit(limit)
        for e in cur:
            if e.get("id") in already:
                continue
            attendance = e.get("guaranteed_count") or e.get("guest_count") or e.get("attendee_count") or 0
            stage = e.get("stage") or ""
            if not (stage in serious_stages or (attendance >= 50)):
                continue
            results.append({**e, "source_collection": coll_name, "attendance": attendance})
    return {"total": len(results), "events": results[:limit]}


@router.post("/import-from-event/{event_id}")
async def import_resume_from_event(event_id: str):
    """Promote an event into a new group resume with pre-filled group_info + meeting_details + schedule_of_events."""
    ev = None
    src = None
    for coll in ("events", "echo_events", "group_events"):
        if coll not in db.list_collection_names():
            continue
        ev = db[coll].find_one({"id": event_id}, {"_id": 0})
        if ev:
            src = coll
            break
    if not ev:
        raise HTTPException(404, "event not found")
    if db["group_resumes"].find_one({"imported_from_event_id": event_id}, {"_id": 0}):
        raise HTTPException(409, "already imported")

    start = ev.get("start_date") or ev.get("event_date") or _now()
    end = ev.get("end_date") or start
    attendance = ev.get("guaranteed_count") or ev.get("guest_count") or ev.get("attendee_count") or 0
    name = ev.get("name") or ev.get("title") or "Imported Event"

    resume_id = f"gr-{_uid()}"
    doc = {
        "resume_id": resume_id,
        "_id": resume_id,
        "status": "draft",
        "imported_from_event_id": event_id,
        "imported_from_collection": src,
        "group_info": {
            "group_name": name,
            "company": ev.get("client_name", ""),
            "arrival_date": str(start)[:10],
            "departure_date": str(end)[:10],
            "estimated_attendance": int(attendance),
            "master_account": f"MA-{event_id[:8].upper()}",
        },
        "meeting_details": {},
        "contact_info": {},
        "group_profile": {},
        "pre_conference": {},
        "vip_info": [],
        "room_blocks": {},
        "meeting_rooms": [],
        "food_beverage": {},
        "av_requirements": {},
        "transportation": {},
        "billing": {},
        "schedule_of_events": [],
        "housekeeping": {},
        "security": {},
        "special_instructions": {},
        "notes": f"Imported from {src} · event {event_id}",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["group_resumes"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/{resume_id}/apply-ai-suggestion")
async def apply_ai_suggestion(resume_id: str, body: dict):
    """Human-gate path: after /ai-assist returns a preview, the user reviews and
    confirms via this endpoint. This is the 'yes-approve' side of the Echo AI³
    confirmation gate for resume edits."""
    section = body.get("section")
    payload = body.get("payload")
    if not section or section not in RESUME_TEMPLATE_SECTIONS:
        raise HTTPException(400, "invalid section")
    if payload is None:
        raise HTTPException(400, "payload required")
    result = db["group_resumes"].update_one(
        {"resume_id": resume_id},
        {"$set": {section: payload, "updated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "resume not found")
    return {"ok": True, "section": section, "applied_at": _now()}


@router.get("/{resume_id}")
async def get_resume(resume_id: str):
    """Get full resume detail."""
    r = db["group_resumes"].find_one({"resume_id": resume_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Resume not found")
    return r


@router.post("")
async def create_resume(body: dict = {}):
    """Create a new group resume from provided data."""
    resume_id = f"gr-{_uid()}"
    doc = {
        "resume_id": resume_id,
        "status": "draft",
        "updated_by": body.get("updated_by", ""),
        "group_info": body.get("group_info", {}),
        "meeting_details": body.get("meeting_details", {}),
        "contact_info": body.get("contact_info", {}),
        "group_profile": body.get("group_profile", {}),
        "pre_conference": body.get("pre_conference", {}),
        "vip_info": body.get("vip_info", []),
        "room_blocks": body.get("room_blocks", {}),
        "meeting_rooms": body.get("meeting_rooms", []),
        "food_beverage": body.get("food_beverage", {}),
        "av_requirements": body.get("av_requirements", {}),
        "transportation": body.get("transportation", {}),
        "billing": body.get("billing", {}),
        "schedule_of_events": body.get("schedule_of_events", []),
        "housekeeping": body.get("housekeeping", {}),
        "security": body.get("security", {}),
        "special_instructions": body.get("special_instructions", {}),
        "notes": body.get("notes", ""),
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["group_resumes"].insert_one({**doc, "_id": resume_id})
    return doc


@router.put("/{resume_id}")
async def update_resume(resume_id: str, body: dict = {}):
    """Update specific sections of a resume."""
    allowed = set(RESUME_TEMPLATE_SECTIONS + ["status", "notes", "updated_by"])
    updates = {k: v for k, v in body.items() if k in allowed}
    updates["updated_at"] = _now()
    result = db["group_resumes"].update_one({"resume_id": resume_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Resume not found")
    return {"resume_id": resume_id, "updated": list(updates.keys())}


@router.post("/{resume_id}/ai-assist")
async def ai_assist_resume(resume_id: str, body: dict = {}):
    """AI-assisted resume building — takes notes/conversation and generates structured content."""
    r = db["group_resumes"].find_one({"resume_id": resume_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Resume not found")

    action = body.get("action", "improve")
    section = body.get("section", "")
    notes = body.get("notes", "")

    if not EMERGENT_KEY:
        return {"error": "AI key not configured", "suggestion": "Manual editing available"}

    try:
        from emergentintegrations.llm.openai import chat_completion, Message

        if action == "generate_from_notes":
            prompt = f"""You are a hospitality Group Resume specialist. Based on these notes, generate structured content for the '{section}' section of a Group Resume.

Notes: {notes}

Current resume data: {str(r.get(section, {}))[:500]}

Generate professional, properly formatted content for this section. Return as a JSON object matching the section structure. Be concise and professional. Use hotel industry standard terminology."""

        elif action == "spell_check":
            prompt = f"""Review and correct any spelling, grammar, or formatting issues in this Group Resume section. Return the corrected version.

Section: {section}
Content: {str(r.get(section, {}))}

Return only the corrected content as JSON."""

        elif action == "improve":
            prompt = f"""Improve the content quality and completeness of this Group Resume section. Add any missing standard items and improve language.

Section: {section}
Content: {str(r.get(section, {}))}
Additional notes: {notes}

Return the improved content as JSON."""
        else:
            prompt = notes

        messages = [Message(role="user", content=prompt)]
        response = await chat_completion(
            api_key=EMERGENT_KEY,
            model="gpt-4.1",
            messages=messages,
        )
        return {"action": action, "section": section, "suggestion": response.message}

    except Exception as e:
        return {"error": str(e)[:200], "action": action}


@router.get("/{resume_id}/pdf")
async def export_resume_pdf(resume_id: str):
    """Export group resume as PDF."""
    from fastapi.responses import Response
    r = db["group_resumes"].find_one({"resume_id": resume_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Resume not found")

    try:
        from fpdf import FPDF

        def _clean(text):
            """Clean text for PDF - replace unicode chars."""
            if not text:
                return ""
            return str(text).replace("\u2014", "-").replace("\u2013", "-").replace("\u2018", "'").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2026", "...").replace("\u00a0", " ").replace("&", "&")

        pdf = FPDF(orientation="P", unit="mm", format="letter")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(0, 12, "GROUP RESUME", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, _clean(f"Updated: {r.get('updated_at', '')[:10]}"), ln=True, align="C")
        pdf.ln(4)

        gi = r.get("group_info", {})
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 8, _clean(gi.get("group_name", "")), ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, _clean(f"{gi.get('company', '')} | {gi.get('arrival_date', '')} to {gi.get('departure_date', '')}"), ln=True, align="C")
        pdf.cell(0, 6, _clean(f"Est. Attendance: {gi.get('estimated_attendance', '')} | Master Account: #{gi.get('master_account', '')}"), ln=True, align="C")
        pdf.ln(6)

        def _section_header(title):
            pdf.set_fill_color(40, 40, 60)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 7, f"  {title}", ln=True, fill=True)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("Helvetica", "", 9)
            pdf.ln(2)

        def _kv(key, val):
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(40, 5, _clean(f"{key}:"))
            pdf.set_font("Helvetica", "", 9)
            w = pdf.w - pdf.l_margin - pdf.r_margin - 40
            pdf.multi_cell(w, 5, _clean(str(val)[:150] if val else ""))

        # Contact Info
        ci = r.get("contact_info", {})
        if ci:
            _section_header("CONTACT INFORMATION")
            oc = ci.get("onsite_contact", {})
            if oc:
                _kv("Onsite Contact", f"{oc.get('name', '')} - {oc.get('title', '')}")
                _kv("Phone", oc.get("phone", ""))
                _kv("Email", oc.get("email", ""))
            _kv("CS Manager", ci.get("cs_manager", ""))
            _kv("Sales Manager", ci.get("sales_manager", ""))
            pdf.ln(3)

        # VIPs
        vips = r.get("vip_info", [])
        if vips:
            _section_header("VIP INFORMATION")
            for vip in vips:
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(0, 5, _clean(f"{vip.get('name', '')} - {vip.get('title', '')}"), ln=True)
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 4, _clean(f"  Room: {vip.get('room_type', '')} @ ${vip.get('rate', 0):,.2f}/night | {vip.get('arrival', '')} - {vip.get('departure', '')}"), ln=True)
                if vip.get("amenity"):
                    pdf.cell(0, 4, _clean(f"  Amenity: {vip['amenity']}"), ln=True)
                pdf.ln(1)
            pdf.ln(2)

        # Room Blocks
        rb = r.get("room_blocks", {})
        if rb:
            _section_header("ROOM BLOCKS")
            contracted = rb.get("contracted", {})
            if contracted:
                _kv("Total Room Nights", str(contracted.get("total_nights", "")))
                _kv("Total Revenue", f"${contracted.get('total_revenue', 0):,.2f}")
                for b in contracted.get("blocks", []):
                    pdf.cell(0, 4, _clean(f"  {b.get('type', '')} - {b.get('total', 0)} nights @ ${b.get('rate', 0):,.2f}"), ln=True)
            picked = rb.get("picked_up", {})
            if picked:
                _kv("Picked Up", f"{picked.get('total', 0)} (as of {picked.get('as_of', '')})")
            pdf.ln(3)

        # F&B
        fb = r.get("food_beverage", {})
        if fb:
            _section_header("FOOD & BEVERAGE")
            for note in fb.get("outlet_notes", []):
                pdf.cell(0, 4, _clean(f"  - {note}"), ln=True)
            if fb.get("outdoor_events"):
                pdf.ln(1)
                _kv("Outdoor Events", fb["outdoor_events"])
            pdf.ln(3)

        # Schedule
        soe = r.get("schedule_of_events", [])
        if soe:
            _section_header("SCHEDULE OF EVENTS")
            pdf.set_font("Helvetica", "B", 7)
            pdf.cell(25, 5, "Date", border=1)
            pdf.cell(35, 5, "Time", border=1)
            pdf.cell(50, 5, "Event", border=1)
            pdf.cell(50, 5, "Location", border=1)
            pdf.cell(15, 5, "Count", border=1, ln=True)
            pdf.set_font("Helvetica", "", 7)
            for evt in soe:
                pdf.cell(25, 4, _clean(str(evt.get("date", ""))), border=1)
                pdf.cell(35, 4, _clean(str(evt.get("time", ""))[:18]), border=1)
                pdf.cell(50, 4, _clean(str(evt.get("event", ""))[:28]), border=1)
                pdf.cell(50, 4, _clean(str(evt.get("location", ""))[:28]), border=1)
                pdf.cell(15, 4, _clean(str(evt.get("count", ""))), border=1, ln=True)
            pdf.ln(3)

        # Billing
        billing = r.get("billing", {})
        if billing:
            _section_header("BILLING & FINANCE")
            _kv("Master Account Estimate", f"${billing.get('master_account_estimate', 0):,.2f}")
            _kv("Tax Exempt", "No" if not billing.get("tax_exempt") else "Yes")
            _kv("Deposit Status", billing.get("deposit_status", ""))
            for c in billing.get("concessions", []):
                pdf.cell(0, 4, _clean(f"  - {c}"), ln=True)
            pdf.ln(3)

        pdf_bytes = pdf.output()
        return Response(
            content=bytes(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="group_resume_{resume_id}.pdf"'},
        )
    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {str(e)[:200]}")



@router.post("/seed-sample")
async def seed_sample_resume():
    """Seed the eClinical Works resume as a sample template."""
    existing = db["group_resumes"].find_one({"resume_id": "gr-eclinical-sample"})
    if existing:
        return {"status": "already_seeded", "resume_id": "gr-eclinical-sample"}

    doc = _build_eclinical_resume()
    db["group_resumes"].insert_one({**doc, "_id": doc["resume_id"]})
    return {"status": "seeded", "resume_id": doc["resume_id"]}


def _build_eclinical_resume():
    return {
        "resume_id": "gr-eclinical-sample",
        "status": "confirmed",
        "updated_by": "Michelle Mayor",
        "group_info": {
            "group_name": "Enterprise Summit & Sales Meeting",
            "company": "eClinicalWorks, LLC",
            "arrival_date": "2026-04-12",
            "departure_date": "2026-04-15",
            "master_account": "1000088",
            "block_account": "4741603",
            "estimated_attendance": 325,
            "post_as": "Enterprise Summit & Sales Meeting",
        },
        "meeting_details": {
            "meeting_name": "Enterprise Summit & Sales Meeting",
            "main_arrival": "Sunday, April 12, 2026 | 43 arrivals",
            "main_departure": "Wednesday, April 15, 2026 | 235 departures",
            "purpose": "To present innovative and responsible AI solutions for medical practice, from efficient patient intake and on-demand record gathering to improving the efficiency of Revenue Cycle Management.",
        },
        "contact_info": {
            "onsite_contact": {"name": "Meagan Berglund", "title": "Event Producer", "phone": "978-502-8796", "email": "meagan.berglund@eclinicalworks.com"},
            "cs_manager": "Michelle Mayor",
            "rooms_coordinator": "Narika Cean",
            "sales_manager": "Jim Bishop",
        },
        "group_profile": {
            "company_description": "eClinicalWorks is a privately held leader in healthcare IT, providing comprehensive EHR and Practice Management solutions used by more than 850,000 medical professionals in more than 20 countries.",
            "hot_buttons": ["VIP Recognition", "Service Levels", "Arrival Experience", "Banquet & Culinary Experience"],
            "notes": ["First time on property", "Medical Group"],
            "demographics": {
                "age_range": "Late 30s - mid/late 50s",
                "gender_ratio": "50/50",
                "traveling_with_families": "Not many",
                "geographic": "All over the US",
            },
        },
        "pre_conference": {
            "date": "Monday, April 13, 2026",
            "time": "11:00 AM",
            "location": "ABACO",
            "note": "Marina Grill Team, please join 15 mins prior",
            "client_attendees": ["Meagan Berglund (Event Producer)", "Jessica Crandall (Event Producer)", "Mandy Williamson (Event Producer)", "Maggie Grendell (EA to CEO)", "Jay Perry (Director of Marketing)", "Kevin Nolan (AV Manager)", "Alicia Burkey (Event Coordinator)"],
            "property_attendees": ["Michelle Mayor (CSM)", "Jim Bishop (Sales)", "Susan Wesselhoft (DOC)", "Banquet Rep", "Culinary Rep", "F&B Rep", "Front Desk Rep", "Housekeeping Rep", "Pinnacle Live Rep", "Security Rep", "Finance Rep"],
        },
        "vip_info": [
            {"name": "Mr. Girish Kumar Navani", "title": "CEO", "arrival": "Mon 4/13/26", "departure": "Wed 4/15/26", "room_type": "VILCV", "rate": 1472.00, "billing": "RMTX to Master / IPO incidentals", "amenity": "Small Fruit Plate + 2 bottled waters"},
            {"name": "Dr. Rajesh Dharampuriya", "title": "CMO", "nickname": "Dr. Raj", "arrival": "Mon 4/13/26", "departure": "Wed 4/15/26", "room_type": "VILK", "rate": 1262.00, "billing": "RMTX to Master / IPO incidentals", "amenity": "Small Fruit Plate + 2 bottled waters"},
            {"name": "Mr. Mahesh Navani", "title": "COO", "arrival": "Mon 4/13/26", "departure": "Wed 4/15/26", "room_type": "RSTKS", "rate": 429.00, "billing": "RMTX to Master / IPO incidentals", "amenity": "Small Fruit Plate + 2 bottled waters"},
            {"name": "Mr. Sameer Bhat", "title": "VP of Sales", "nickname": "Sam", "arrival": "Mon 4/13/26", "departure": "Wed 4/15/26", "room_type": "OVRKS", "rate": 1227.00, "billing": "RMTX to Master / IPO incidentals", "amenity": "Small Fruit Plate + 2 bottled waters"},
        ],
        "room_blocks": {
            "contracted": {
                "total_nights": 575,
                "total_revenue": 239175.00,
                "blocks": [
                    {"type": "Run of House Rooms", "sun": 42, "mon": 217, "tue": 217, "total": 476, "rate": 429.00},
                    {"type": "One Bedroom King Suites", "sun": 8, "mon": 8, "tue": 8, "total": 24, "rate": 429.00},
                    {"type": "Staff Rooms", "sun": 25, "mon": 25, "tue": 25, "total": 75, "rate": 329.00},
                ],
            },
            "picked_up": {"total": 564, "as_of": "04/01/26"},
            "front_desk_notes": {
                "booking_method": "Rooming List",
                "cutoff_date": "3/19/2026",
                "routing": ["RMTX to Master", "IPO"],
                "early_checkin": "Based on availability",
                "late_checkout": "Based on availability",
                "upselling": "Yes at guest expense",
                "porterage": "$7.00 per room round trip",
            },
        },
        "food_beverage": {
            "meal_schedule": [
                {"date": "Mon 04/13", "breakfast": "GAL", "lunch": "GAL", "reception": "BQT", "dinner": "BQT"},
                {"date": "Tue 04/14", "breakfast": "BQT", "lunch": "BQT", "reception": "BQT", "dinner": "BQT"},
                {"date": "Wed 04/15", "breakfast": "BQT", "lunch": "GAL", "reception": "-", "dinner": "-"},
            ],
            "outlet_notes": [
                "Monday 04/13: Private Dinner at Signature Italian for 30 attendees 7:00-10:00 PM",
                "Group will be utilizing all open bars at the property",
                "Anticipate LIGHT In-Room Dining usage",
                "Anticipate LIGHT pool usage",
            ],
            "outdoor_events": "Tuesday 04/14: Adult Pool Deck & Living Room 6:30PM-10:00PM. Moving company removes furniture at 2:00PM. Weather call Monday 04/13 at 12 noon.",
        },
        "av_requirements": {
            "provider": "Pinnacle Live",
            "cost": 39256.12,
            "wifi": "Complimentary basic (4mb/s) in rooms and meeting space",
            "discount": "20% on in-stock equipment (excludes labor, power, Wi-Fi)",
            "load_schedule": [
                {"date": "Sun 04/12 2:00PM", "vendor": "OPAV Production", "location": "Tavistock Ballroom", "action": "AV push load-in"},
                {"date": "Mon 04/13 7:30AM", "vendor": "OPAV Production + Fast Signs", "location": "Events Center", "action": "Remaining AV + Decals"},
                {"date": "Tue 04/14 2:00PM", "vendor": "2J Logistics", "location": "Adult Pool Deck", "action": "Furniture removal + event setup"},
                {"date": "Tue 04/14 4:30PM", "vendor": "Hello! DMC - DJ Lanka", "location": "Adult Pool Deck", "action": "Entertainment setup"},
            ],
        },
        "transportation": {
            "arrival_method": "2% Drive / 98% Fly + Uber/Car Service",
            "overnight_parking": "2-5 cars @ $60/night",
            "rideshare": "Large amount expected — group has Ride Share Vouchers",
            "complimentary_passes": 5,
            "parking_discount": "20% on daily valet",
        },
        "billing": {
            "master_account_estimate": 250000,
            "tax_exempt": False,
            "deposit_status": "Paid in full",
            "commission": {"agency": "ALHI", "contact": "Suzy Symons", "rate": "10%", "iata": "1292"},
            "concessions": [
                "1 comp room per 35 occupied nights",
                "8 upgrades to 1BR King Suites at ROH rate",
                "25 Staff Rooms at discounted rate",
                "Complimentary indoor meeting space with F&B minimum",
                "10% discount on banquet menus (excludes alcohol)",
                "No Resort Fee",
                "8 Complimentary VIP Amenities",
                "15% allowable attrition up to 30 days prior",
            ],
            "authorized_signatures": ["Meagan Berglund", "Jay Perry", "Jessica Crandall", "Maggie Grendell"],
        },
        "schedule_of_events": [
            {"date": "Sun 04/12", "time": "4:00PM-11:45PM", "event": "Exhibitor Move-In", "location": "North Foyer", "setup": "See Diagram", "count": 11},
            {"date": "Mon 04/13", "time": "4:00PM-7:00PM", "event": "Registration", "location": "North Foyer", "setup": "Registration", "count": 4},
            {"date": "Mon 04/13", "time": "5:00PM-7:00PM", "event": "Welcome Reception + Consumption Bar", "location": "Aviva Lawn", "setup": "Reception", "count": 225},
            {"date": "Tue 04/14", "time": "8:00AM-9:00AM", "event": "Breakfast Buffet", "location": "South Foyer + Coral Ballroom", "setup": "See BEO", "count": 325},
            {"date": "Tue 04/14", "time": "8:00AM-5:00PM", "event": "General Session", "location": "Tavistock Ballroom", "setup": "Crescent Rounds", "count": 322},
            {"date": "Tue 04/14", "time": "10:00AM-11:00AM", "event": "AM Break", "location": "North Foyer", "setup": "Beverage/Coffee", "count": 275},
            {"date": "Tue 04/14", "time": "12:00PM-1:30PM", "event": "Lunch Buffet", "location": "South Foyer + Coral Ballroom", "setup": "See BEO", "count": 325},
            {"date": "Tue 04/14", "time": "3:00PM-3:15PM", "event": "PM Break", "location": "North Foyer", "setup": "Beverage/Coffee", "count": 275},
            {"date": "Tue 04/14", "time": "6:30PM-10:00PM", "event": "Dinner Buffet + Consumption Bar", "location": "Adult Pool Deck + Living Room", "setup": "Rounds of 10", "count": 275},
            {"date": "Wed 04/15", "time": "7:30AM-9:00AM", "event": "Breakfast Buffet", "location": "South Foyer + Coral Ballroom", "setup": "See BEO", "count": 325},
            {"date": "Wed 04/15", "time": "9:00AM-12:00PM", "event": "General Session", "location": "Tavistock Ballroom", "setup": "Crescent Rounds", "count": 322},
            {"date": "Wed 04/15", "time": "10:30AM-10:45AM", "event": "AM Break", "location": "North Foyer", "setup": "Beverage/Coffee", "count": 275},
            {"date": "Wed 04/15", "time": "12:00PM-5:00PM", "event": "Teardown", "location": "Tavistock + North Foyer + Coral", "setup": "", "count": 0},
        ],
        "security": {
            "officers": [
                {"date": "04/13", "count": 2, "hours": "4:00PM-8:00PM", "provider": "Ft Lauderdale Police Off Duty"},
                {"date": "04/14", "count": 2, "hours": "8:00AM-8:00PM", "provider": "Ft Lauderdale Police Off Duty"},
                {"date": "04/15", "count": 2, "hours": "8:00AM-12:00PM", "provider": "Ft Lauderdale Police Off Duty"},
            ],
            "meeting_room_keys": "$75.00 per key, $200 fee for unreturned keys",
        },
        "housekeeping": {
            "restrooms": "Monitor and refresh meeting floor restrooms per schedule",
            "room_attendant": "At guest discretion",
            "day_service": "8:30AM-4:30PM daily",
            "turndown": "5:00PM-9:30PM daily",
        },
        "special_instructions": {
            "packages": {"office": "Staniel", "start": "Sun 04/12 7:00AM", "end": "Wed 04/15 5:00PM", "labeling": "ECW/Enterprise Summit/Meagan Berglund/Michelle Mayor"},
            "group_chat": "WhatsApp - created Sunday 04/12 with Group Contacts, CSM Team, Banquet Leaders, AV, Front Desk",
            "banquet_hot_buttons": "White glove service expected. Attentiveness on group chat.",
            "spa": "Anticipate LIGHT usage. Zenova Spa: Mon-Sun 10AM-8PM.",
            "pool": "Anticipate LIGHT usage.",
        },
        "notes": "Updated 04/09/26. First time on property. Medical group. Outdoor event weather backup: Aviva Ballroom & Lawn.",
        "created_at": _now(),
        "updated_at": _now(),
    }
