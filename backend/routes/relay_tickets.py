"""
iter173 · Phase 3 — Relay Ticket System

Standalone ticketing separated from Echo Concierge. Echo Concierge = full guest
orchestration (VIP recognition, itinerary composer, revenue tracking). Relay =
lean ticket intake that any department lead can use without being trained on
the full Concierge surface.

Tickets created here still show up in Concierge Mission Control for the
Concierge team to resolve — Relay is the lean front door, Concierge is the
orchestration back-office.

Routes under `/api/relay/*`.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/relay", tags=["relay-ticket-system"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


TICKET_KINDS = [
    "guest-request", "maintenance", "housekeeping", "food-beverage", "transport",
    "amenity", "complaint", "lost-found", "concierge-handoff", "medical",
    "security", "other",
]

TICKET_STATUSES = ["open", "in_progress", "waiting-guest", "resolved", "cancelled"]

TICKET_PRIORITIES = ["low", "normal", "high", "urgent"]


class Ticket(BaseModel):
    id: Optional[str] = None
    # Who raised it (dept lead quick intake)
    raised_by_name: str
    raised_by_department: str
    raised_by_role: Optional[str] = None
    # Guest context (optional — can be a BOH-only ticket)
    guest_name: Optional[str] = None
    room: Optional[str] = None
    guest_id: Optional[str] = None
    # Ticket
    kind: str = "guest-request"
    summary: str
    details: Optional[str] = None
    priority: str = "normal"
    # Routing
    assigned_to_department: Optional[str] = None  # downstream owner
    assigned_to_name: Optional[str] = None
    needs_concierge: bool = False  # when True, Mission Control will see it
    # Lifecycle
    status: str = "open"
    resolution: Optional[str] = None
    # Tags
    tags: List[str] = Field(default_factory=list)


@router.post("/ticket/create")
async def create_ticket(t: Ticket):
    if t.kind not in TICKET_KINDS:
        raise HTTPException(400, f"unknown kind '{t.kind}'")
    if t.priority not in TICKET_PRIORITIES:
        raise HTTPException(400, f"unknown priority '{t.priority}'")
    from database import db as _db
    doc = t.model_dump()
    doc["id"] = uuid.uuid4().hex[:12]
    doc["ticket_no"] = f"RLY-{datetime.now(timezone.utc).strftime('%y%m%d')}-{doc['id'][:4].upper()}"
    doc["created_at"] = _now_iso()
    doc["updated_at"] = _now_iso()
    doc["history"] = [{"at": doc["created_at"], "actor": t.raised_by_name, "action": "created",
                        "from": None, "to": t.status}]
    _db.relay_tickets.insert_one(doc.copy())

    # If tagged for concierge, create matching echo-concierge request so Mission Control sees it
    if t.needs_concierge and t.guest_id:
        try:
            from database import db as _db2
            _db2.concierge_requests.insert_one({
                "id": uuid.uuid4().hex[:12], "guest_id": t.guest_id,
                "guest_name": t.guest_name or "", "guest_room": t.room or "",
                "vip_tier": "standard", "kind": "other",
                "summary": f"[Relay #{doc['ticket_no']}] {t.summary}",
                "status": "pending", "priority": t.priority,
                "source": "relay", "relay_ticket_id": doc["id"],
                "revenue_estimate": 0, "actual_revenue": 0,
                "created_at": _now_iso(),
            })
        except Exception as e:
            print(f"[relay → concierge mirror err] {e}")

    saved = _db.relay_tickets.find_one({"id": doc["id"]}, {"_id": 0})
    return {"ok": True, "ticket": saved}


@router.patch("/ticket/{ticket_id}")
async def update_ticket(ticket_id: str, body: Dict[str, Any]):
    from database import db as _db
    existing = _db.relay_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not existing: raise HTTPException(404, "ticket not found")
    patch = {k: v for k, v in body.items() if k in {"status", "resolution", "priority", "assigned_to_department", "assigned_to_name", "details", "tags"}}
    if "status" in patch and patch["status"] not in TICKET_STATUSES:
        raise HTTPException(400, f"unknown status '{patch['status']}'")
    patch["updated_at"] = _now_iso()
    # Append history event
    history = existing.get("history") or []
    if "status" in patch and patch["status"] != existing.get("status"):
        history.append({"at": patch["updated_at"], "actor": body.get("actor", "system"),
                        "action": "status_change", "from": existing.get("status"), "to": patch["status"]})
    patch["history"] = history
    _db.relay_tickets.update_one({"id": ticket_id}, {"$set": patch})
    return {"ok": True, "ticket": _db.relay_tickets.find_one({"id": ticket_id}, {"_id": 0})}


@router.get("/tickets")
async def list_tickets(status: Optional[str] = None, department: Optional[str] = None,
                        assigned_to_department: Optional[str] = None, limit: int = 100):
    from database import db as _db
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    if department: q["raised_by_department"] = department
    if assigned_to_department: q["assigned_to_department"] = assigned_to_department
    items = list(_db.relay_tickets.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    # Stats
    stats: Dict[str, int] = {"open": 0, "in_progress": 0, "waiting-guest": 0, "resolved": 0, "urgent": 0}
    for t in items:
        stats[t.get("status", "open")] = stats.get(t.get("status", "open"), 0) + 1
        if t.get("priority") == "urgent": stats["urgent"] += 1
    return {"ok": True, "total": len(items), "tickets": items, "stats": stats,
            "kinds": TICKET_KINDS, "statuses": TICKET_STATUSES, "priorities": TICKET_PRIORITIES}


@router.get("/ticket/{ticket_id}")
async def get_ticket(ticket_id: str):
    from database import db as _db
    t = _db.relay_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t: raise HTTPException(404, "ticket not found")
    return {"ok": True, "ticket": t}


@router.get("/dashboard")
async def dashboard():
    """KPI rollup for Relay dashboard home."""
    from database import db as _db
    now = datetime.now(timezone.utc)
    last_24h = (now - timedelta(hours=24)).isoformat()
    last_7d = (now - timedelta(days=7)).isoformat()

    def _count(q: Dict[str, Any]) -> int:
        return _db.relay_tickets.count_documents(q)

    return {"ok": True,
            "open": _count({"status": "open"}),
            "in_progress": _count({"status": "in_progress"}),
            "resolved_24h": _count({"status": "resolved", "updated_at": {"$gte": last_24h}}),
            "created_24h": _count({"created_at": {"$gte": last_24h}}),
            "urgent_open": _count({"status": "open", "priority": "urgent"}),
            "created_7d": _count({"created_at": {"$gte": last_7d}}),
            }
