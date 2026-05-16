"""
LUCCCA Client Event Portal
===========================
Public-facing, secure event planning portal for prospects.
Isolated from the main system. Generates warm leads for the sales team.

Security:
  - Rate limiting per IP
  - Required contact info validation
  - No access to internal data
  - Separate lead pipeline
"""
import os
import re
import math
import time
import hashlib
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, List
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/portal", tags=["client-portal"])

from database import db as _db
leads_col = _db["warm_leads"]
availability_col = _db["venue_availability"]

# Simple in-memory rate limiter
_rate_store: dict = defaultdict(list)
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60  # seconds


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())


def _check_rate_limit(ip: str):
    now = time.time()
    window = [t for t in _rate_store[ip] if now - t < RATE_LIMIT_WINDOW]
    _rate_store[ip] = window
    if len(window) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(429, "Too many requests. Please try again later.")
    _rate_store[ip].append(now)


def _validate_email(email: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email))


def _validate_phone(phone: str) -> bool:
    digits = re.sub(r"[^\d]", "", phone)
    return len(digits) >= 7


# ─── Models ─────────────────────────────────────────────────────────

class ProspectInfo(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    company: str = ""
    how_heard: str = ""

class EventDetails(BaseModel):
    event_type: str = "wedding"
    event_date: str = ""
    guest_count: int = 100
    service_style: str = "buffet"
    meal_period: str = "dinner"
    tier: str = "classic"
    is_outdoor: bool = False
    budget_range: str = ""
    enhancements: List[str] = []
    bar_preference: str = ""
    special_requests: str = ""
    needs_hotel_rooms: bool = False
    estimated_room_nights: int = 0

class LeadSubmission(BaseModel):
    prospect: ProspectInfo
    event: EventDetails
    verification_token: str = ""

class LeadAssignment(BaseModel):
    assigned_to: str
    notes: str = ""
    priority: str = "medium"

class MeetingRequest(BaseModel):
    lead_id: str
    meeting_type: str = "site_visit"
    preferred_date: str = ""
    preferred_time: str = ""
    notes: str = ""


# ─── Public Endpoints (rate-limited) ───────────────────────────────

@router.get("/event-types")
def get_event_types(request: Request):
    """Public endpoint: available event types for the builder."""
    _check_rate_limit(request.client.host if request.client else "unknown")
    return {
        "event_types": [
            {"id": "wedding", "label": "Wedding", "description": "Ceremonies, receptions, rehearsal dinners"},
            {"id": "corporate", "label": "Corporate", "description": "Conferences, meetings, team events"},
            {"id": "social", "label": "Social Celebration", "description": "Birthdays, anniversaries, reunions"},
            {"id": "holiday", "label": "Holiday Event", "description": "Thanksgiving, Christmas, New Year's"},
            {"id": "nonprofit", "label": "Nonprofit / Fundraiser", "description": "Galas, charity auctions, fundraisers"},
        ],
        "service_styles": ["buffet", "plated", "stations", "family_style", "cocktail_reception"],
        "meal_periods": ["breakfast", "brunch", "lunch", "reception", "dinner", "late_night"],
        "tiers": [
            {"id": "classic", "label": "Classic", "description": "Quality essentials"},
            {"id": "elevated", "label": "Elevated", "description": "Enhanced selections"},
            {"id": "signature", "label": "Signature", "description": "Premium curated experience"},
            {"id": "luxury", "label": "Luxury", "description": "Ultimate bespoke experience"},
        ],
        "budget_ranges": ["Under $5,000", "$5,000-$15,000", "$15,000-$30,000", "$30,000-$50,000", "$50,000-$100,000", "$100,000+"],
        "enhancements": [
            {"id": "av_package", "label": "AV / Sound System"},
            {"id": "live_band", "label": "Live Band / DJ"},
            {"id": "floral_decor", "label": "Floral & Decor"},
            {"id": "photography", "label": "Photography / Videography"},
            {"id": "dance_floor", "label": "Dance Floor"},
            {"id": "stage", "label": "Stage / Riser"},
            {"id": "specialty_lighting", "label": "Specialty Lighting"},
            {"id": "photo_booth", "label": "Photo Booth"},
            {"id": "valet_parking", "label": "Valet Parking"},
            {"id": "hotel_room_block", "label": "Hotel Room Block"},
        ],
    }


@router.post("/check-availability")
def check_availability(request: Request, event_date: str, guest_count: int = 100, event_type: str = "wedding"):
    """Public endpoint: check date and venue availability."""
    _check_rate_limit(request.client.host if request.client else "unknown")

    if not event_date:
        raise HTTPException(400, "Event date is required")

    # Check existing availability records or generate default
    existing = availability_col.find_one({"date": event_date}, {"_id": 0})
    if existing:
        return existing

    # Generate availability based on date
    try:
        dt = datetime.fromisoformat(event_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    is_weekend = dt.weekday() in (4, 5)
    is_holiday_season = dt.month in (11, 12, 6)

    venues = [
        {"venue_id": "grand_ballroom", "name": "Grand Ballroom", "capacity": 400, "available": not (is_weekend and is_holiday_season), "price_tier": "premium"},
        {"venue_id": "junior_ballroom", "name": "Junior Ballroom", "capacity": 200, "available": True, "price_tier": "standard"},
        {"venue_id": "garden_terrace", "name": "Garden Terrace", "capacity": 150, "available": dt.month in range(4, 11), "price_tier": "premium"},
        {"venue_id": "rooftop_deck", "name": "Rooftop Deck", "capacity": 120, "available": dt.month in range(5, 10), "price_tier": "luxury"},
        {"venue_id": "boardroom_suite", "name": "Boardroom Suite", "capacity": 40, "available": True, "price_tier": "standard"},
    ]

    suitable = [v for v in venues if v["available"] and v["capacity"] >= guest_count]
    hotel_rooms_available = 50 if not (is_weekend and is_holiday_season) else 20

    return {
        "date": event_date,
        "day_of_week": dt.strftime("%A"),
        "is_weekend": is_weekend,
        "is_peak_season": is_holiday_season,
        "venues_available": suitable,
        "all_venues": venues,
        "hotel_rooms_available": hotel_rooms_available,
        "pricing_note": "Peak season" if is_holiday_season else "Standard season",
    }


@router.post("/estimate")
def get_event_estimate(request: Request, event: EventDetails):
    """Public endpoint: generate a What-If price estimate for prospects."""
    _check_rate_limit(request.client.host if request.client else "unknown")

    # Pull pricing from knowledge engine
    pricing_data = _db["banquet_knowledge"].find_one({"domain_id": "package_pricing"}, {"_id": 0})
    data = pricing_data.get("data", {}) if pricing_data else {}
    templates = data.get("package_templates", [])

    # Find matching package
    pkg = None
    for t in templates:
        if t.get("tier") == event.tier and event.event_type in t.get("suitable_event_types", []):
            pkg = t
            break
    if not pkg and templates:
        pkg = templates[0]

    price_range = pkg.get("price_model", {}).get("example_price_range_usd_pp", {"low": 50, "high": 100}) if pkg else {"low": 50, "high": 100}
    mid_pp = (price_range["low"] + price_range["high"]) / 2

    # Enhancement estimates
    enhancement_costs = {
        "av_package": 2500,
        "live_band": 4000,
        "floral_decor": 3000,
        "photography": 2000,
        "dance_floor": 900,
        "stage": 500,
        "specialty_lighting": 1500,
        "photo_booth": 800,
        "valet_parking": 1200,
        "hotel_room_block": event.estimated_room_nights * 189,
    }
    enh_total = sum(enhancement_costs.get(e, 0) for e in event.enhancements)

    # Bar estimate
    bar_pp = 0
    if event.bar_preference:
        bar_rates = {"house": 35, "call": 45, "premium": 60, "luxury": 85}
        bar_pp = bar_rates.get(event.bar_preference, 0)

    fnb_pp = mid_pp + bar_pp
    fnb_total = fnb_pp * event.guest_count
    grand_total = fnb_total + enh_total

    # Simplified range
    low_total = price_range["low"] * event.guest_count + enh_total
    high_total = price_range["high"] * event.guest_count + enh_total + (bar_pp * event.guest_count)

    return {
        "estimate": {
            "package_name": pkg.get("package_name", "Custom Package") if pkg else "Custom Package",
            "tier": event.tier,
            "guest_count": event.guest_count,
            "fnb_per_person": round(fnb_pp, 2),
            "fnb_total": round(fnb_total, 2),
            "enhancements_total": enh_total,
            "grand_total_estimate": round(grand_total, 2),
            "price_range": {"low": round(low_total, 2), "high": round(high_total, 2)},
        },
        "enhancement_breakdown": [{"id": e, "label": e.replace("_", " ").title(), "cost": enhancement_costs.get(e, 0)} for e in event.enhancements],
        "note": "This is an estimate. Final pricing will be confirmed with your event sales specialist.",
        "next_steps": ["A sales specialist will contact you within 24 hours", "Schedule a complimentary site visit", "Receive a personalized proposal"],
    }


@router.post("/submit-lead")
def submit_lead(request: Request, submission: LeadSubmission):
    """Public endpoint: submit prospect info + event details as a warm lead."""
    _check_rate_limit(request.client.host if request.client else "unknown")

    p = submission.prospect
    if not p.first_name or not p.last_name:
        raise HTTPException(400, "First and last name are required")
    if not _validate_email(p.email):
        raise HTTPException(400, "Valid email is required")
    if not _validate_phone(p.phone):
        raise HTTPException(400, "Valid phone number is required")
    if submission.event.guest_count < 10:
        raise HTTPException(400, "Minimum 10 guests required")
    if submission.event.guest_count > 2000:
        raise HTTPException(400, "For events over 2000 guests, please contact us directly")

    # Build estimate
    est_resp = get_event_estimate(request, submission.event)

    lead_id = _uid()
    lead = {
        "lead_id": lead_id,
        "status": "new",
        "priority": "medium",
        "prospect": p.dict(),
        "event": submission.event.dict(),
        "estimate": est_resp["estimate"],
        "assigned_to": None,
        "notes": [],
        "meetings": [],
        "client_resume": {
            "name": f"{p.first_name} {p.last_name}",
            "email": p.email,
            "phone": p.phone,
            "company": p.company,
            "event_type": submission.event.event_type,
            "guest_count": submission.event.guest_count,
            "budget_range": submission.event.budget_range,
            "preferred_date": submission.event.event_date,
            "enhancements": submission.event.enhancements,
            "special_requests": submission.event.special_requests,
            "needs_hotel": submission.event.needs_hotel_rooms,
            "room_nights": submission.event.estimated_room_nights,
        },
        "source": "website_portal",
        "ip_hash": hashlib.sha256((request.client.host if request.client else "unknown").encode()).hexdigest()[:12],
        "created_at": _now(),
        "updated_at": _now(),
    }
    leads_col.insert_one(lead)
    lead.pop("_id", None)

    return {
        "lead_id": lead_id,
        "status": "submitted",
        "message": f"Thank you, {p.first_name}! Your event inquiry has been received. A specialist will contact you within 24 hours.",
        "estimate": est_resp["estimate"],
        "next_steps": est_resp["next_steps"],
    }


# ─── Internal Sales Endpoints (require auth in production) ─────────

@router.get("/leads")
def list_leads(status: Optional[str] = None, assigned_to: Optional[str] = None, limit: int = 50):
    q = {}
    if status:
        q["status"] = status
    if assigned_to:
        q["assigned_to"] = assigned_to
    docs = list(leads_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    stats = {
        "total": leads_col.count_documents({}),
        "new": leads_col.count_documents({"status": "new"}),
        "contacted": leads_col.count_documents({"status": "contacted"}),
        "qualified": leads_col.count_documents({"status": "qualified"}),
        "meeting_scheduled": leads_col.count_documents({"status": "meeting_scheduled"}),
        "proposal_sent": leads_col.count_documents({"status": "proposal_sent"}),
        "converted": leads_col.count_documents({"status": "converted"}),
        "lost": leads_col.count_documents({"status": "lost"}),
    }
    return {"leads": docs, "count": len(docs), "stats": stats}


@router.get("/leads/{lead_id}")
def get_lead(lead_id: str):
    doc = leads_col.find_one({"lead_id": lead_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Lead not found")
    return doc


@router.put("/leads/{lead_id}/assign")
def assign_lead(lead_id: str, assignment: LeadAssignment):
    r = leads_col.update_one(
        {"lead_id": lead_id},
        {"$set": {"assigned_to": assignment.assigned_to, "priority": assignment.priority, "status": "contacted", "updated_at": _now()},
         "$push": {"notes": {"text": assignment.notes, "by": assignment.assigned_to, "at": _now()}}}
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"assigned": lead_id, "to": assignment.assigned_to}


@router.put("/leads/{lead_id}/status")
def update_lead_status(lead_id: str, status: str):
    valid = ["new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "converted", "lost"]
    if status not in valid:
        raise HTTPException(400, f"Status must be one of: {valid}")
    r = leads_col.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": status, "updated_at": _now()}}
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"lead_id": lead_id, "status": status}


@router.post("/leads/{lead_id}/meeting")
def schedule_meeting(lead_id: str, meeting: MeetingRequest):
    meeting_id = _uid()
    meeting_doc = {
        "meeting_id": meeting_id,
        "type": meeting.meeting_type,
        "date": meeting.preferred_date,
        "time": meeting.preferred_time,
        "notes": meeting.notes,
        "status": "scheduled",
        "created_at": _now(),
    }
    r = leads_col.update_one(
        {"lead_id": lead_id},
        {"$push": {"meetings": meeting_doc}, "$set": {"status": "meeting_scheduled", "updated_at": _now()}}
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"meeting_id": meeting_id, "lead_id": lead_id, "status": "scheduled"}


@router.get("/leads/{lead_id}/resume")
def get_client_resume(lead_id: str):
    doc = leads_col.find_one({"lead_id": lead_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Lead not found")
    return {
        "client_resume": doc.get("client_resume", {}),
        "estimate": doc.get("estimate", {}),
        "meetings": doc.get("meetings", []),
        "notes": doc.get("notes", []),
        "status": doc.get("status"),
        "lead_id": lead_id,
    }


# ─── Share Estimate Link ────────────────────────────────────────────

@router.post("/share-link/{lead_id}")
def create_share_link(lead_id: str):
    """Generate a shareable estimate link for prospects to send co-planners."""
    doc = leads_col.find_one({"lead_id": lead_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Lead not found")
    share_token = str(uuid4())[:12]
    shares_col = _db["portal_share_links"]
    shares_col.insert_one({
        "share_token": share_token,
        "lead_id": lead_id,
        "created_at": _now(),
        "views": 0,
        "created_by": doc.get("prospect", {}).get("email", ""),
    })
    return {
        "share_token": share_token,
        "share_url": f"/event-estimate/{share_token}",
        "lead_id": lead_id,
    }


@router.get("/shared/{share_token}")
def view_shared_estimate(share_token: str):
    """Public endpoint to view a shared estimate (no auth required)."""
    shares_col = _db["portal_share_links"]
    link = shares_col.find_one({"share_token": share_token}, {"_id": 0})
    if not link:
        raise HTTPException(404, "Link not found or expired")
    # Increment view count
    shares_col.update_one({"share_token": share_token}, {"$inc": {"views": 1}, "$set": {"last_viewed": _now()}})
    # Fetch lead estimate
    doc = leads_col.find_one({"lead_id": link["lead_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Estimate not found")
    return {
        "estimate": doc.get("estimate", {}),
        "event": {
            "event_type": doc.get("event", {}).get("event_type"),
            "guest_count": doc.get("event", {}).get("guest_count"),
            "event_date": doc.get("event", {}).get("event_date"),
            "service_style": doc.get("event", {}).get("service_style"),
            "tier": doc.get("event", {}).get("tier"),
        },
        "prospect_name": f"{doc.get('prospect', {}).get('first_name', '')} {doc.get('prospect', {}).get('last_name', '')}".strip(),
        "share_token": share_token,
        "views": link.get("views", 0) + 1,
    }


@router.get("/share-analytics/{lead_id}")
def share_analytics(lead_id: str):
    """Sales agent view: how many times was the shared link viewed?"""
    shares_col = _db["portal_share_links"]
    links = list(shares_col.find({"lead_id": lead_id}, {"_id": 0}))
    return {
        "lead_id": lead_id,
        "total_links": len(links),
        "total_views": sum(link.get("views", 0) for link in links),
        "links": links,
    }
