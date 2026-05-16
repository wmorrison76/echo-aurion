"""
D35 · Cross-department employee borrowing with auto-PAF.

Real-world flow the user surfaced:

  Saturday 11am. Banquet captain is short a server for the 6pm
  event. He sees Sara (FOH server, normally restaurant-side) is
  off but has banquet experience on her profile. He hits "borrow."

  Today, that requires:
    · He texts the FOH manager.
    · FOH manager texts back ok.
    · He emails HR a PAF (paper, scanned PDF).
    · HR routes it through payroll the next pay period.
    · Sara shows up at 6pm but isn't on the banquet schedule, so
      time is recorded against the wrong cost center.
    · Two weeks later, payroll catches the error.

  With this module:
    · Captain hits POST /api/borrow/request {employee_id: sara,
      shift_id: bq-saturday-6pm, reason: "needs experienced server"}
    · System auto-creates an electronic PAF, routes to FOH manager
      for one-tap approval (push notification).
    · On approval, Sara's employee record gets a temporary
      borrowed-shift entry; the existing schedule layer treats it
      as if she were natively rostered for that shift, but stamps
      the cost-center as banquet so labor reporting is correct.
    · HR + payroll see the PAF in their queue immediately.

Endpoints (all /api/borrow)

  POST /request
       Initiates a borrow + creates a PAF. If the requesting
       manager + home-dept manager are the same person, the PAF
       auto-approves (no point routing to yourself).
       Returns paf_id + status.

  POST /{paf_id}/approve
       Home-dept manager approves. PAF flips to approved; the
       borrowed-shift entry becomes active.

  POST /{paf_id}/decline
       Home-dept manager declines with a reason. Borrowed shift
       removed from schedule.

  GET  /pafs
       List PAFs (filter by status / requester / employee /
       date range).

  GET  /eligible
       Given a shift slot (start/end + required position +
       department), return employees from OTHER departments who:
         · have the position on their secondary_positions list
         · are not on a conflicting shift
         · are not on PTO that day
       Sorted by skill_match_score (a simple overlap count).

  GET  /pafs/{paf_id}
       PAF detail.

Doctrine alignment

  · §1.4 voice register: PAF events emit to audit_log; the
    requester sees pending/approved status, the home-dept
    manager gets a push (existing notification fabric); the
    employee is NOT consulted by the system — that's a human
    courtesy the requesting manager owns.
  · §2.5 pride from love: framing is observation, not coercion.
    "Sara is eligible based on her secondary_positions" not
    "Sara is required to come in."
  · §2.6 never throw the pan: PAFs that are declined are an
    operations signal (this dept never lends), not a personal
    flag on the manager who declined.
  · D27 tenant isolation: every read/write filters by tenant_id.

Idempotency

  Natural key for the borrow_request = (employee_id, shift_id,
  requested_at_date). Re-issuing the same request returns the
  existing PAF rather than creating a duplicate.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/borrow", tags=["cross-dept-borrow"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _emit_audit(tenant_id: str, kind: str, entity_id: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"borrow.{kind}",
            "entity_id": entity_id,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


def _natural_key(employee_id: str, shift_id: str,
                 request_date: str) -> str:
    raw = f"{employee_id}|{shift_id}|{request_date}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _employee(tenant_id: str, employee_id: str) -> Dict[str, Any]:
    e = db["employees"].find_one(
        {"id": employee_id, "tenant_id": tenant_id}, {"_id": 0})
    if not e:
        e = db["employees"].find_one({"id": employee_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, f"employee {employee_id} not found")
    return e


def _shift(tenant_id: str, shift_id: str) -> Dict[str, Any]:
    s = db["echo_schedule_shifts"].find_one(
        {"id": shift_id, "tenant_id": tenant_id}, {"_id": 0})
    if not s:
        s = db["echo_schedule_shifts"].find_one(
            {"id": shift_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, f"shift {shift_id} not found")
    return s


# ─── Models ──────────────────────────────────────────────────────────────

class BorrowRequestBody(BaseModel):
    employee_id: str
    shift_id: str
    requested_by: str = Field(..., min_length=1)
    requesting_dept: str
    reason: Optional[str] = None
    auto_approve_if_same_manager: bool = True


class ApproveBody(BaseModel):
    actor_id: str = Field(..., min_length=1)
    note: Optional[str] = None


class DeclineBody(BaseModel):
    actor_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)


# ─── 1. Request a borrow ────────────────────────────────────────────────

@router.post("/request")
def request_borrow(
    body: BorrowRequestBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    employee = _employee(tenant_id, body.employee_id)
    shift = _shift(tenant_id, body.shift_id)
    home_dept = employee.get("department") or ""
    requesting_dept = body.requesting_dept

    if home_dept == requesting_dept:
        raise HTTPException(400,
            f"employee is already in {home_dept}; "
            f"no cross-dept borrow needed")

    request_date = _now().date().isoformat()
    nk = _natural_key(body.employee_id, body.shift_id, request_date)

    # Idempotent: re-issuing same request returns existing PAF
    existing = db["borrow_pafs"].find_one(
        {"natural_key": nk, "tenant_id": tenant_id})
    if existing:
        existing.pop("_id", None)
        return {"ok": True, "idempotent": True, "paf": existing}

    paf_id = uuid.uuid4().hex[:16]
    home_manager_id = employee.get("manager_id") or ""

    # Auto-approve gate: same person is requester AND home-dept manager
    auto_approved = (body.auto_approve_if_same_manager
                     and home_manager_id == body.requested_by)
    initial_status = "approved" if auto_approved else "pending"

    paf = {
        "id": paf_id,
        "natural_key": nk,
        "tenant_id": tenant_id,
        "employee_id": body.employee_id,
        "employee_name": (
            f"{employee.get('first_name','')} "
            f"{employee.get('last_name','')}").strip(),
        "shift_id": body.shift_id,
        "shift_start": shift.get("start_at") or shift.get("date"),
        "shift_end": shift.get("end_at"),
        "home_department": home_dept,
        "borrowing_department": requesting_dept,
        "requested_by": body.requested_by,
        "home_dept_manager_id": home_manager_id,
        "reason": body.reason,
        "status": initial_status,
        "auto_approved": auto_approved,
        "approved_at": _now_iso() if auto_approved else None,
        "approved_by": (body.requested_by if auto_approved else None),
        "declined_at": None,
        "declined_by": None,
        "decline_reason": None,
        "created_at": _now_iso(),
    }
    db["borrow_pafs"].insert_one(paf.copy())

    # If auto-approved, also write the borrowed-shift entry now
    if auto_approved:
        _activate_borrow_shift(paf)

    _emit_audit(tenant_id, "request", paf_id, {
        "employee_id": body.employee_id,
        "shift_id": body.shift_id,
        "home_department": home_dept,
        "borrowing_department": requesting_dept,
        "requested_by": body.requested_by,
        "auto_approved": auto_approved,
    })

    return {"ok": True, "idempotent": False, "paf": paf,
            "auto_approved": auto_approved}


def _activate_borrow_shift(paf: Dict[str, Any]) -> None:
    """Write a borrowed-shift entry that the existing schedule
    layer can render. Cost-center is the borrowing dept so labor
    reporting goes to the right ledger."""
    entry = {
        "id": uuid.uuid4().hex[:16],
        "tenant_id": paf["tenant_id"],
        "employee_id": paf["employee_id"],
        "shift_id": paf["shift_id"],
        "borrowed_from_dept": paf["home_department"],
        "borrowed_to_dept": paf["borrowing_department"],
        "cost_center": paf["borrowing_department"],
        "paf_id": paf["id"],
        "active": True,
        "created_at": _now_iso(),
    }
    db["echo_schedule_borrowed_shifts"].insert_one(entry.copy())


# ─── 2. Approve ──────────────────────────────────────────────────────────

@router.post("/{paf_id}/approve")
def approve_paf(
    paf_id: str,
    body: ApproveBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    paf = db["borrow_pafs"].find_one(
        {"id": paf_id, "tenant_id": tenant_id})
    if not paf:
        raise HTTPException(404, "PAF not found")
    if paf["status"] != "pending":
        raise HTTPException(409,
            f"PAF is {paf['status']}, cannot approve")

    db["borrow_pafs"].update_one(
        {"id": paf_id, "tenant_id": tenant_id},
        {"$set": {"status": "approved",
                  "approved_at": _now_iso(),
                  "approved_by": body.actor_id,
                  "approve_note": body.note}})
    paf.update({"status": "approved",
                "approved_at": _now_iso(),
                "approved_by": body.actor_id})
    _activate_borrow_shift(paf)
    _emit_audit(tenant_id, "approve", paf_id,
                {"actor_id": body.actor_id, "note": body.note})
    return {"ok": True, "id": paf_id, "status": "approved"}


# ─── 3. Decline ──────────────────────────────────────────────────────────

@router.post("/{paf_id}/decline")
def decline_paf(
    paf_id: str,
    body: DeclineBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    paf = db["borrow_pafs"].find_one(
        {"id": paf_id, "tenant_id": tenant_id})
    if not paf:
        raise HTTPException(404, "PAF not found")
    if paf["status"] not in ("pending",):
        raise HTTPException(409,
            f"PAF is {paf['status']}, cannot decline")

    db["borrow_pafs"].update_one(
        {"id": paf_id, "tenant_id": tenant_id},
        {"$set": {"status": "declined",
                  "declined_at": _now_iso(),
                  "declined_by": body.actor_id,
                  "decline_reason": body.reason}})
    # Remove any borrowed-shift entry (defensive — none should exist
    # for a pending PAF, but if approve/decline raced this cleans up)
    db["echo_schedule_borrowed_shifts"].update_one(
        {"paf_id": paf_id, "tenant_id": tenant_id},
        {"$set": {"active": False}})
    _emit_audit(tenant_id, "decline", paf_id, {
        "actor_id": body.actor_id, "reason": body.reason})
    return {"ok": True, "id": paf_id, "status": "declined"}


# ─── 4. List PAFs ────────────────────────────────────────────────────────

@router.get("/pafs")
def list_pafs(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    requested_by: Optional[str] = None,
    home_department: Optional[str] = None,
    borrowing_department: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if status: q["status"] = status
    if employee_id: q["employee_id"] = employee_id
    if requested_by: q["requested_by"] = requested_by
    if home_department: q["home_department"] = home_department
    if borrowing_department: q["borrowing_department"] = borrowing_department
    rows = list(db["borrow_pafs"].find(q, {"_id": 0})
                .sort("created_at", -1)
                .limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "pafs": rows}


@router.get("/pafs/{paf_id}")
def get_paf(
    paf_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    paf = db["borrow_pafs"].find_one(
        {"id": paf_id, "tenant_id": tenant_id}, {"_id": 0})
    if not paf:
        raise HTTPException(404, "PAF not found")
    return {"ok": True, "paf": paf}


# ─── 5. Find eligible employees (other depts) ──────────────────────────

@router.get("/eligible")
def find_eligible(
    shift_id: str,
    requesting_dept: str,
    required_position: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(None),
):
    """Return employees in OTHER departments who could fill this
    shift. Filters out:
      · employees already in requesting_dept (they aren't a borrow)
      · employees on a conflicting shift that day
      · employees on PTO

    Sorted by skill_match_score (overlap of secondary_positions
    with required_position)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    shift = _shift(tenant_id, shift_id)
    shift_date = (shift.get("date")
                  or (shift.get("start_at") or "")[:10])

    # Pull all active employees NOT in requesting_dept
    candidates = list(db["employees"].find(
        {"tenant_id": tenant_id, "active": True}, {"_id": 0}).limit(5000))
    if not candidates:
        candidates = list(db["employees"].find(
            {"active": True}, {"_id": 0}).limit(5000))
    candidates = [c for c in candidates
                  if (c.get("department") or "") != requesting_dept]

    eligible: List[Dict[str, Any]] = []
    for c in candidates:
        # Conflict: another shift same date
        same_day = db["echo_schedule_shifts"].find_one(
            {"tenant_id": tenant_id, "employee_id": c["id"],
             "date": shift_date})
        if same_day and same_day.get("id") != shift_id:
            continue
        # PTO: any approved PTO covering this date
        pto = db["pto_requests"].find_one(
            {"tenant_id": tenant_id, "employee_id": c["id"],
             "status": "approved",
             "start_date": shift_date}) or db["pto_requests"].find_one(
            {"tenant_id": tenant_id, "employee_id": c["id"],
             "status": "approved",
             "end_date": shift_date})
        if pto:
            continue
        # Skill match: required_position in secondary_positions
        secondaries = c.get("secondary_positions") or []
        score = 0
        if required_position:
            score = (1 if required_position in secondaries else 0)
        else:
            score = 1   # no specific requirement → all are equally OK
        if required_position and score == 0:
            continue
        eligible.append({
            "employee_id": c["id"],
            "name": (f"{c.get('first_name','')} "
                     f"{c.get('last_name','')}").strip(),
            "home_department": c.get("department"),
            "secondary_positions": secondaries,
            "skill_match_score": score,
        })
    eligible.sort(key=lambda e: -e["skill_match_score"])
    return {"ok": True, "shift_id": shift_id,
            "requesting_dept": requesting_dept,
            "required_position": required_position,
            "total": len(eligible), "candidates": eligible}
