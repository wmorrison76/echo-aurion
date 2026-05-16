"""iter235 · Shift Notes + Team Chat stubs for the mobile quick-launch.

Shift notes:
  POST /api/ecw-ops/shift-notes
  GET  /api/ecw-ops/shift-notes?outlet_id=X&limit=N

Team chat rooms (read-only mirror of desktop — full port in a later iter):
  GET  /api/team-chat/rooms?user_id=X
"""
from __future__ import annotations
import uuid
from typing import Optional, List

from fastapi import APIRouter, Header
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["ecw-ops-iter235"])


# ── Shift notes ────────────────────────────────────────────────────────
class ShiftNoteIn(BaseModel):
    outlet_id: str
    shift: str = "pm"               # am | pm | overnight
    text: str
    authored_by: str = "chef-william"


@router.post("/api/ecw-ops/shift-notes")
def create_shift_note(body: ShiftNoteIn,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    nid = f"sn-{uuid.uuid4().hex[:10]}"
    note = {
        "id": nid,
        "outlet_id": body.outlet_id,
        "shift": body.shift,
        "text": body.text,
        "authored_by": x_user_id or body.authored_by,
        "created_at": utcnow_iso(),
    }
    db["shift_notes"].insert_one(dict(note))
    return {"ok": True, "note": note}


@router.get("/api/ecw-ops/shift-notes")
def list_shift_notes(outlet_id: str, limit: int = 10):
    rows = list(db["shift_notes"].find({"outlet_id": outlet_id}, {"_id": 0})
                    .sort([("created_at", -1)]).limit(limit))
    return {"ok": True, "count": len(rows), "rows": rows}


# ── Team chat rooms (stub — reads desktop chat collection if present) ──
@router.get("/api/team-chat/rooms")
def list_team_chat_rooms(user_id: str = "chef-william"):
    """Returns chat rooms the user is a member of. Reads from the existing
    `chat_rooms` collection if the desktop module seeded it; otherwise
    returns empty list so the mobile panel shows the empty state."""
    try:
        q = {"$or": [{"members": user_id}, {"created_by": user_id}]}
        rows = list(db["chat_rooms"].find(q, {"_id": 0})
                        .sort([("updated_at", -1)]).limit(50))
    except Exception:
        rows = []
    return {"ok": True, "count": len(rows), "rows": rows}



# ── iter237 · Tickets (maintenance + guest complaints) ─────────────────
class TicketIn(BaseModel):
    kind: str = "maintenance"               # maintenance | guest
    title: str
    detail: Optional[str] = ""
    priority: str = "medium"
    location: Optional[str] = ""
    problem_type: Optional[str] = ""
    photo_data_url: Optional[str] = None
    category: Optional[str] = None


@router.post("/api/ecw-ops/tickets")
def create_ticket(body: TicketIn,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    import uuid as _u
    tid = f"tkt-{_u.uuid4().hex[:10]}"
    # Route based on kind
    assign_group = "engineering" if body.kind == "maintenance" else "foh-manager"
    tkt = {
        "id": tid,
        "kind": body.kind,
        "title": body.title.strip(),
        "detail": (body.detail or "").strip(),
        "priority": body.priority,
        "location": body.location,
        "problem_type": body.problem_type,
        "photo_data_url": body.photo_data_url,   # base64 data: URL — tiny inline thumbnail for now
        "category": body.category or body.kind,
        "status": "open",
        "assign_group": assign_group,
        "created_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["support_tickets"].insert_one(dict(tkt))
    db["ecw_activity_events"].insert_one({
        "id": f"evt-{_u.uuid4().hex[:10]}",
        "outlet_id": None,
        "kind": f"ticket.created.{body.kind}",
        "title": f"{'Guest complaint' if body.kind == 'guest' else 'Ticket'}: {body.title}",
        "detail": f"{body.location or ''} · {body.problem_type or ''}".strip(" ·"),
        "actor": x_user_id or "chef-william",
        "meta": {"ticket_id": tid, "priority": body.priority},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "ticket": {k: v for k, v in tkt.items() if k != "photo_data_url"},
             "ticket_id": tid}


@router.get("/api/ecw-ops/tickets")
def list_tickets(kind: Optional[str] = None, limit: int = 50):
    q = {"kind": kind} if kind else {}
    rows = list(db["support_tickets"].find(q, {"_id": 0, "photo_data_url": 0})
                    .sort([("created_at", -1)]).limit(min(limit, 200)))
    return {"ok": True, "count": len(rows), "rows": rows}


# ── iter237 · Audit v2: finance gate + auditor name + spot-check mode ──
class AuditStartIn(BaseModel):
    outlet_id: str
    mode: str = "full"                       # full | spot-check
    auditor_name: str                        # WHO is taking the audit
    auditor_role: str = "chef"               # chef | foh | finance | retail
    dept: str = "bar"                         # bar | kitchen | retail | alcohol
    is_finance_present: bool = False         # required if mode='alcohol'


@router.post("/api/ecw-ops/inventory/audit/start")
def start_inventory_audit(body: AuditStartIn,
                            x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Start or resume an inventory audit. Enforces: (1) a spot-check and a
    full audit cannot run simultaneously for the same outlet+dept; (2) we
    capture auditor name + role + finance-presence flag; (3) alcohol
    inventory hints that finance should be present (not enforced yet)."""
    from fastapi import HTTPException
    import uuid as _u
    # Check for conflicting in-progress audit on the same outlet+dept
    existing = db["inventory_audits"].find_one({
        "outlet_id": body.outlet_id,
        "dept": body.dept,
        "status": {"$in": ["in_progress"]},
    }, {"_id": 0})
    if existing:
        other_mode = existing.get("mode", "full")
        if other_mode != body.mode:
            raise HTTPException(409,
                f"Cannot start {body.mode} — a {other_mode} audit is already in progress for {body.dept}.")
        # Same mode → resume it
        return {"ok": True, "audit_id": existing["id"], "resumed": True}

    audit_id = f"audit-{_u.uuid4().hex[:10]}"
    doc = {
        "id": audit_id,
        "outlet_id": body.outlet_id,
        "mode": body.mode,
        "dept": body.dept,
        "auditor_name": body.auditor_name,
        "auditor_role": body.auditor_role,
        "is_finance_present": body.is_finance_present,
        "started_by": x_user_id or "chef-william",
        "status": "in_progress",
        "started_at": utcnow_iso(),
        "created_at": utcnow_iso(),
    }
    db["inventory_audits"].insert_one(dict(doc))
    return {"ok": True, "audit_id": audit_id, "resumed": False}


class AuditCompleteIn(BaseModel):
    audit_id: str
    finance_notified: bool = True
    spot_check_reminder_next_day: bool = True


@router.post("/api/ecw-ops/inventory/audit/complete")
def complete_inventory_audit(body: AuditCompleteIn,
                                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    import uuid as _u
    from fastapi import HTTPException
    audit = db["inventory_audits"].find_one({"id": body.audit_id}, {"_id": 0})
    if not audit: raise HTTPException(404, "audit not found")
    db["inventory_audits"].update_one(
        {"id": body.audit_id},
        {"$set": {"status": "complete", "completed_at": utcnow_iso(),
                   "completed_by": x_user_id or "chef-william",
                   "finance_notified": body.finance_notified,
                   "spot_check_reminder_next_day": body.spot_check_reminder_next_day}},
    )
    # Queue reminder for spot-check next day (FOH)
    reminders: List[Dict[str, Any]] = []
    if body.spot_check_reminder_next_day and audit.get("dept") in ("bar", "alcohol", "foh"):
        from datetime import datetime as _dt, timedelta as _td
        next_day = (_dt.utcnow() + _td(days=1)).isoformat() + "Z"
        reminder = {
            "id": f"rem-{_u.uuid4().hex[:10]}",
            "kind": "spot_check",
            "outlet_id": audit.get("outlet_id"),
            "dept": audit.get("dept"),
            "for_role": "foh-manager",
            "due_at": next_day,
            "note": f"Spot check follow-up for {audit.get('auditor_name')} audit ({audit.get('dept')})",
            "status": "pending",
            "created_at": utcnow_iso(),
        }
        db["reminders"].insert_one(dict(reminder))
        reminders.append({k: v for k, v in reminder.items() if k != "_id"})
    # Finance hand-off event
    db["ecw_activity_events"].insert_one({
        "id": f"evt-{_u.uuid4().hex[:10]}",
        "outlet_id": audit.get("outlet_id"),
        "kind": "audit.completed",
        "title": f"Audit complete: {audit.get('dept')} · {audit.get('auditor_name')}",
        "detail": "Sent to Finance",
        "actor": x_user_id or "chef-william",
        "meta": {"audit_id": body.audit_id, "mode": audit.get("mode")},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "audit_id": body.audit_id, "finance_notified": body.finance_notified,
             "reminders": reminders}


class AuditEditEntryIn(BaseModel):
    new_qty: Optional[float] = None
    new_item_name: Optional[str] = None
    new_unit: Optional[str] = None
    reason: str


@router.patch("/api/ecw-ops/inventory/entry/{entry_id}")
def edit_audit_entry(entry_id: str, body: AuditEditEntryIn,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Edit an audit entry post-scan — flags the change so Finance can see it
    deviated from the original. William's spec: 'a physical change has been
    made. This needs to be flagged when making a change from what the
    original scans has ensure there's a confirm to the change.'"""
    from fastapi import HTTPException
    import uuid as _u
    entry = db["inventory_count_entries"].find_one({"id": entry_id}, {"_id": 0})
    if not entry: raise HTTPException(404, "entry not found")
    history = entry.get("edit_history") or []
    history.append({
        "at": utcnow_iso(),
        "by": x_user_id or "chef-william",
        "before": {"qty": entry.get("qty"), "item_name": entry.get("item_name"),
                    "unit": entry.get("unit")},
        "after": {
            "qty": body.new_qty if body.new_qty is not None else entry.get("qty"),
            "item_name": body.new_item_name or entry.get("item_name"),
            "unit": body.new_unit or entry.get("unit"),
        },
        "reason": body.reason,
    })
    update = {"edited": True, "edit_history": history, "updated_at": utcnow_iso()}
    if body.new_qty is not None: update["qty"] = body.new_qty
    if body.new_item_name: update["item_name"] = body.new_item_name
    if body.new_unit: update["unit"] = body.new_unit
    db["inventory_count_entries"].update_one({"id": entry_id}, {"$set": update})
    return {"ok": True, "entry_id": entry_id, "edit_count": len(history)}


# ── Bottle scan stub (camera frame + item → logged for CV processing) ──
class BottleScanIn(BaseModel):
    outlet_id: str
    audit_id: Optional[str] = None
    item_name: str                           # e.g. "Grey Goose 750ml"
    unopened_count: int = 0
    open_bottle_photo_data_url: Optional[str] = None
    estimated_remaining_pct: Optional[float] = None


@router.post("/api/ecw-ops/inventory/bottle-scan")
def log_bottle_scan(body: BottleScanIn,
                     x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Logs a bottle count: unopened bottles + an open-bottle photo for
    future CV volume estimation. Stores the scan image for audit trail."""
    import uuid as _u
    sid = f"scan-{_u.uuid4().hex[:10]}"
    scan = {
        "id": sid,
        "outlet_id": body.outlet_id,
        "audit_id": body.audit_id,
        "item_name": body.item_name,
        "unopened_count": body.unopened_count,
        "open_bottle_photo_data_url": body.open_bottle_photo_data_url,
        "estimated_remaining_pct": body.estimated_remaining_pct,
        "scanned_by": x_user_id or "chef-william",
        "cv_processed": False,
        "scanned_at": utcnow_iso(),
    }
    db["bottle_scans"].insert_one(dict(scan))
    return {"ok": True, "scan_id": sid, "note": "Scan logged. CV volume estimation queued."}



# ── Quick Place-Order (mobile one-tap — skips desktop req/approve chain) ─
class QuickOrderItem(BaseModel):
    item_id: Optional[str] = None
    name: str
    qty: float
    unit: str = "ea"
    unit_price: float = 0.0
    notes: Optional[str] = None


class QuickOrderIn(BaseModel):
    outlet_id: str
    vendor_id: str = "vendor-default"
    vendor_name: str = "Default Supplier"
    items: List[QuickOrderItem] = []
    expected_delivery_date: Optional[str] = None
    note: Optional[str] = None


@router.post("/api/ecw-ops/orders/place")
def place_quick_order(body: QuickOrderIn,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Mobile one-tap order creation. Bypasses the desktop requisition/approval
    chain — the chef speaks or taps items directly and the PO is cut in one call."""
    import uuid as _u
    from fastapi import HTTPException
    if not body.items:
        raise HTTPException(400, "at least one item is required")
    po_id = f"po-{_u.uuid4().hex[:10]}"
    items = [{
        "item_id": it.item_id or f"item-{_u.uuid4().hex[:6]}",
        "name": it.name,
        "qty": it.qty,
        "unit": it.unit,
        "unit_price": it.unit_price,
        "line_total": round(it.qty * it.unit_price, 2),
        "notes": it.notes,
    } for it in body.items]
    total = round(sum(i["line_total"] for i in items), 2)
    po = {
        "id": po_id,
        "outlet_id": body.outlet_id,
        "vendor_id": body.vendor_id,
        "vendor_name": body.vendor_name,
        "items": items,
        "item_count": len(items),
        "total": total,
        "status": "ordered",
        "expected_delivery_date": body.expected_delivery_date,
        "note": body.note,
        "source": "mobile-quick",
        "created_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["procurement_orders"].insert_one(dict(po))
    db["ecw_activity_events"].insert_one({
        "id": f"evt-{_u.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "kind": "po.placed_from_mobile",
        "title": f"PO placed from mobile — {body.vendor_name}",
        "detail": f"{len(items)} items · ${total:,.2f}",
        "actor": x_user_id or "chef-william",
        "meta": {"po_id": po_id, "total": total},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "po": po}


# ── Inventory count ingest (offline-first: accepts batched shelf entries) ─
class InventoryCountEntry(BaseModel):
    shelf: str
    item_name: str
    qty: float
    unit: str = "cs"
    location_id: Optional[str] = None
    spoken_raw: Optional[str] = None


class InventoryAuditBatchIn(BaseModel):
    outlet_id: str
    audit_id: Optional[str] = None
    entries: List[InventoryCountEntry] = []
    started_at: Optional[str] = None
    device_id: Optional[str] = None


@router.post("/api/ecw-ops/inventory/audit-batch")
def ingest_inventory_audit_batch(body: InventoryAuditBatchIn,
                                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Offline-first ingestion. Mobile queues counts in IndexedDB while chef
    walks the cooler. When reception returns, POSTs the batch."""
    import uuid as _u
    audit_id = body.audit_id or f"audit-{_u.uuid4().hex[:10]}"
    db["inventory_audits"].update_one(
        {"id": audit_id},
        {"$set": {
            "outlet_id": body.outlet_id,
            "started_at": body.started_at or utcnow_iso(),
            "device_id": body.device_id,
            "audited_by": x_user_id or "chef-william",
            "updated_at": utcnow_iso(),
        }, "$setOnInsert": {"id": audit_id, "created_at": utcnow_iso()}},
        upsert=True,
    )
    saved = 0
    for e in body.entries:
        row = {
            "id": f"ic-{_u.uuid4().hex[:10]}",
            "audit_id": audit_id,
            "outlet_id": body.outlet_id,
            "shelf": e.shelf,
            "item_name": e.item_name,
            "qty": e.qty,
            "unit": e.unit,
            "location_id": e.location_id,
            "spoken_raw": e.spoken_raw,
            "audited_by": x_user_id or "chef-william",
            "created_at": utcnow_iso(),
        }
        db["inventory_count_entries"].insert_one(dict(row))
        saved += 1
    return {"ok": True, "audit_id": audit_id, "saved": saved}


@router.get("/api/ecw-ops/inventory/audit/{audit_id}")
def get_inventory_audit(audit_id: str):
    from fastapi import HTTPException
    header = db["inventory_audits"].find_one({"id": audit_id}, {"_id": 0})
    if not header:
        raise HTTPException(404, "audit not found")
    entries = list(db["inventory_count_entries"].find({"audit_id": audit_id}, {"_id": 0})
                        .sort([("created_at", 1)]))
    return {"ok": True, "audit": header, "entries": entries, "count": len(entries)}


# ── Team chat: send + read + create-room (mobile compose) ─────────────
class ChatMessageIn(BaseModel):
    text: str
    author_id: str = "chef-william"


@router.post("/api/team-chat/rooms/{room_id}/send")
def send_chat_message(room_id: str, body: ChatMessageIn,
                        x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    import uuid as _u
    mid = f"msg-{_u.uuid4().hex[:10]}"
    msg = {
        "id": mid,
        "room_id": room_id,
        "author_id": x_user_id or body.author_id,
        "text": body.text,
        "created_at": utcnow_iso(),
    }
    db["chat_messages"].insert_one(dict(msg))
    db["chat_rooms"].update_one(
        {"id": room_id},
        {"$set": {"last_message": body.text[:120], "updated_at": utcnow_iso()},
         "$setOnInsert": {"id": room_id, "name": "Direct",
                           "members": [x_user_id or body.author_id],
                           "created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "message": msg}


@router.get("/api/team-chat/rooms/{room_id}/messages")
def list_chat_messages(room_id: str, limit: int = 50):
    rows = list(db["chat_messages"].find({"room_id": room_id}, {"_id": 0})
                    .sort([("created_at", -1)]).limit(min(limit, 200)))
    rows.reverse()
    return {"ok": True, "count": len(rows), "rows": rows}


class ChatRoomIn(BaseModel):
    name: str = "New room"
    kind: str = "group"             # direct | group
    members: List[str] = []


@router.post("/api/team-chat/rooms")
def create_chat_room(body: ChatRoomIn,
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    import uuid as _u
    rid = f"room-{_u.uuid4().hex[:10]}"
    members = body.members[:]
    me = x_user_id or "chef-william"
    if me not in members: members.append(me)
    room = {
        "id": rid,
        "name": body.name.strip() or "New room",
        "kind": body.kind,
        "members": members,
        "created_by": me,
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
        "last_message": None,
    }
    db["chat_rooms"].insert_one(dict(room))
    return {"ok": True, "room": room}
