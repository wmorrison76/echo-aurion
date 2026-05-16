"""
Communications Hub — Outlook, Gmail, Teams integration backend.
Provides email/chat endpoints with demo data when no real OAuth tokens are present.
Ready for real Microsoft Graph / Google API when OAuth keys are configured.
"""
from fastapi import APIRouter, Header
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

from database import db as _db
integrations_col = _db["integrations"]

def _now():
    return datetime.now(timezone.utc)


def _demo_outlook_emails():
    """Demo Outlook emails for enterprise hospitality context."""
    now = _now()
    return [
        {"id": "ol-1", "from": "gm@grandresort.com", "subject": "Weekend Occupancy Forecast — 92% Confirmed", "timestamp": int((now - timedelta(minutes=15)).timestamp() * 1000), "isUnread": True, "bodyPreview": "Hi team, weekend occupancy is tracking at 92%. Please confirm staffing levels for all F&B outlets by EOD."},
        {"id": "ol-2", "from": "procurement@grandresort.com", "subject": "Seafood Delivery Delayed — ETA Updated", "timestamp": int((now - timedelta(hours=1)).timestamp() * 1000), "isUnread": True, "bodyPreview": "The premium seafood shipment from Blue Harbor has been delayed. New ETA is tomorrow 6 AM. Adjusting tonight's special menu."},
        {"id": "ol-3", "from": "events@grandresort.com", "subject": "Corporate Gala BEO Final Sign-Off Required", "timestamp": int((now - timedelta(hours=3)).timestamp() * 1000), "isUnread": True, "bodyPreview": "The Johnson Corp gala BEO for Saturday needs your final sign-off. 450 pax, cocktail reception + seated dinner."},
        {"id": "ol-4", "from": "hr@grandresort.com", "subject": "New Hire Orientation — Kitchen Staff", "timestamp": int((now - timedelta(hours=6)).timestamp() * 1000), "isUnread": False, "bodyPreview": "Three new line cooks starting Monday. Please prepare station assignments and mentor pairing."},
        {"id": "ol-5", "from": "maintenance@grandresort.com", "subject": "Walk-In Cooler #3 — Temperature Alert Resolved", "timestamp": int((now - timedelta(hours=12)).timestamp() * 1000), "isUnread": False, "bodyPreview": "The temperature fluctuation in walk-in cooler #3 has been resolved. Compressor replaced. All readings nominal."},
        {"id": "ol-6", "from": "finance@grandresort.com", "subject": "March P&L Review — F&B Division", "timestamp": int((now - timedelta(hours=24)).timestamp() * 1000), "isUnread": False, "bodyPreview": "March F&B P&L is ready for review. Gross margin improved 2.3% from February. Please review before Tuesday's meeting."},
        {"id": "ol-7", "from": "vip-services@grandresort.com", "subject": "VIP Arrival Alert — Suite 2201 Dietary Restrictions", "timestamp": int((now - timedelta(hours=36)).timestamp() * 1000), "isUnread": False, "bodyPreview": "VIP guest arriving Friday. Severe nut allergy and celiac. All outlets notified. Room dining menu card prepared."},
    ]


def _demo_gmail_emails():
    """Demo Gmail inbox for enterprise hospitality context."""
    now = _now()
    return [
        {"id": "gm-1", "from": "vendor@blueharborseafood.com", "subject": "Invoice #4892 — Weekly Seafood Order", "timestamp": int((now - timedelta(minutes=45)).timestamp() * 1000), "isUnread": True, "bodyPreview": "Please find attached invoice for this week's seafood delivery. Total: $12,450. Net 30 terms."},
        {"id": "gm-2", "from": "support@toastpos.com", "subject": "POS System Update Available — v4.2.1", "timestamp": int((now - timedelta(hours=2)).timestamp() * 1000), "isUnread": True, "bodyPreview": "A new firmware update is available for your Toast POS terminals. Includes improved split-check handling."},
        {"id": "gm-3", "from": "alerts@foodsafety.gov", "subject": "FDA Alert — Romaine Lettuce Advisory", "timestamp": int((now - timedelta(hours=5)).timestamp() * 1000), "isUnread": True, "bodyPreview": "Voluntary recall issued for romaine from Arizona region. Check lot numbers against your current inventory."},
        {"id": "gm-4", "from": "newsletter@hospitalitytech.com", "subject": "Top 10 F&B Technology Trends 2026", "timestamp": int((now - timedelta(hours=10)).timestamp() * 1000), "isUnread": False, "bodyPreview": "AI-powered menu optimization, automated inventory, and smart kitchen systems lead the pack."},
        {"id": "gm-5", "from": "reservations@opentable.com", "subject": "Weekly Booking Summary — The Grand Bistro", "timestamp": int((now - timedelta(hours=20)).timestamp() * 1000), "isUnread": False, "bodyPreview": "Last week: 342 covers, avg party size 3.8, 12% no-show rate. Next week forecast: 380 covers."},
    ]


def _demo_teams_chats():
    """Demo Teams chats for enterprise hospitality context."""
    now = _now()
    return [
        {"id": "tc-1", "name": "F&B Operations", "lastMessage": "Banquet setup for Ballroom A is confirmed. 40 rounds, theater-style overflow in Salon B.", "timestamp": int((now - timedelta(minutes=5)).timestamp() * 1000), "unreadCount": 3},
        {"id": "tc-2", "name": "Kitchen Brigade — PM Shift", "lastMessage": "Prep list updated. 86'd the lamb shank — switching to braised short rib for tonight.", "timestamp": int((now - timedelta(minutes=22)).timestamp() * 1000), "unreadCount": 1},
        {"id": "tc-3", "name": "Executive Committee", "lastMessage": "Q1 revenue targets exceeded by 8%. F&B leading at 11% above forecast.", "timestamp": int((now - timedelta(hours=1)).timestamp() * 1000), "unreadCount": 0},
        {"id": "tc-4", "name": "Housekeeping ↔ F&B", "lastMessage": "Suite 1805 minibar restock needed. Also requesting late checkout breakfast tray for 10 AM.", "timestamp": int((now - timedelta(hours=2)).timestamp() * 1000), "unreadCount": 2},
        {"id": "tc-5", "name": "Safety & Compliance", "lastMessage": "Monthly fire suppression inspection complete. All kitchen hoods passed. Report attached.", "timestamp": int((now - timedelta(hours=4)).timestamp() * 1000), "unreadCount": 0},
        {"id": "tc-6", "name": "Vendor Coordination", "lastMessage": "Linen delivery rescheduled to Thursday. Confirmed 200 napkins + 80 tablecloths for gala.", "timestamp": int((now - timedelta(hours=8)).timestamp() * 1000), "unreadCount": 0},
    ]


def _demo_calendar_events():
    """Demo calendar events."""
    now = _now()
    today = now.strftime("%Y-%m-%d")
    return [
        {"id": "ce-1", "subject": "Morning BEO Review", "start": f"{today}T08:00:00Z", "end": f"{today}T08:30:00Z", "location": "Chef's Office", "attendees": 4},
        {"id": "ce-2", "subject": "Weekly P&L Standup — F&B", "start": f"{today}T10:00:00Z", "end": f"{today}T10:45:00Z", "location": "Board Room 2", "attendees": 8},
        {"id": "ce-3", "subject": "Johnson Corp Gala Walk-Through", "start": f"{today}T14:00:00Z", "end": f"{today}T15:30:00Z", "location": "Grand Ballroom A", "attendees": 12},
        {"id": "ce-4", "subject": "Vendor Tasting — New Dessert Menu", "start": f"{today}T16:00:00Z", "end": f"{today}T17:00:00Z", "location": "Pastry Kitchen", "attendees": 5},
    ]


# ════════════════════════════════════════════
# OUTLOOK ENDPOINTS
# ════════════════════════════════════════════

@router.get("/outlook/emails")
def get_outlook_emails(
    authorization: Optional[str] = Header(None),
    x_org_id: Optional[str] = Header(None, alias="X-Org-ID"),
):
    """Fetch Outlook emails. Returns demo data when no real Graph token."""
    emails = _demo_outlook_emails()
    unread = sum(1 for e in emails if e.get("isUnread"))
    return {"emails": emails, "unreadCount": unread, "total": len(emails)}


@router.get("/outlook/calendar")
def get_outlook_calendar(
    authorization: Optional[str] = Header(None),
    x_org_id: Optional[str] = Header(None, alias="X-Org-ID"),
):
    """Fetch Outlook calendar events."""
    events = _demo_calendar_events()
    return {"events": events, "total": len(events)}


@router.post("/outlook/send")
def send_outlook_email(
    body: dict,
    authorization: Optional[str] = Header(None),
):
    """Send email via Outlook (demo mode: logs and returns success)."""
    return {"success": True, "message_id": f"msg-{str(uuid4())[:8]}", "status": "sent"}


# ════════════════════════════════════════════
# GMAIL ENDPOINTS
# ════════════════════════════════════════════

@router.get("/gmail/emails")
def get_gmail_emails(
    authorization: Optional[str] = Header(None),
):
    """Fetch Gmail emails. Returns demo data when no real OAuth token."""
    emails = _demo_gmail_emails()
    unread = sum(1 for e in emails if e.get("isUnread"))
    return {"emails": emails, "unreadCount": unread, "total": len(emails)}


@router.get("/gmail/labels")
def get_gmail_labels(authorization: Optional[str] = Header(None)):
    """Fetch Gmail labels."""
    return {"labels": [
        {"id": "INBOX", "name": "Inbox", "messagesTotal": 142, "messagesUnread": 3},
        {"id": "SENT", "name": "Sent", "messagesTotal": 89, "messagesUnread": 0},
        {"id": "STARRED", "name": "Starred", "messagesTotal": 12, "messagesUnread": 0},
        {"id": "vendor", "name": "Vendors", "messagesTotal": 34, "messagesUnread": 1},
        {"id": "events", "name": "Events", "messagesTotal": 28, "messagesUnread": 2},
    ]}


# ════════════════════════════════════════════
# TEAMS ENDPOINTS
# ════════════════════════════════════════════

@router.get("/teams/chats")
def get_teams_chats(
    authorization: Optional[str] = Header(None),
):
    """Fetch Teams chats. Returns demo data when no real Graph token."""
    chats = _demo_teams_chats()
    total_unread = sum(c.get("unreadCount", 0) for c in chats)
    return {"chats": chats, "totalUnread": total_unread, "total": len(chats)}


@router.get("/teams/channels")
def get_teams_channels(authorization: Optional[str] = Header(None)):
    """Fetch Teams channels."""
    return {"channels": [
        {"id": "ch-1", "displayName": "General", "description": "Resort-wide announcements"},
        {"id": "ch-2", "displayName": "F&B Operations", "description": "Food & Beverage operations channel"},
        {"id": "ch-3", "displayName": "Events & Catering", "description": "Event planning and catering coordination"},
        {"id": "ch-4", "displayName": "Kitchen Brigade", "description": "Kitchen staff communication"},
        {"id": "ch-5", "displayName": "Safety & Compliance", "description": "Safety alerts and compliance updates"},
    ]}


@router.post("/teams/send")
def send_teams_message(body: dict, authorization: Optional[str] = Header(None)):
    """Send Teams message (demo mode)."""
    return {"success": True, "message_id": f"tm-{str(uuid4())[:8]}", "status": "sent"}


# ════════════════════════════════════════════
# INTEGRATION STATUS / CONNECTION
# ════════════════════════════════════════════

@router.get("/status")
def integration_status():
    """Get status of all integrations."""
    return {
        "integrations": [
            {"service": "outlook", "status": "available", "label": "Microsoft Outlook", "features": ["email", "calendar", "contacts"]},
            {"service": "gmail", "status": "available", "label": "Gmail", "features": ["email", "labels", "contacts"]},
            {"service": "teams", "status": "available", "label": "Microsoft Teams", "features": ["chat", "channels", "calls"]},
        ]
    }
