"""
D63 · Onboarding wizard v2 — Apple-style first-run setup.

User direction: "build from the initial purchase an onboarding
guide for self-install that walks through the steps and sets up
similar to what Apple does with a new computer / iPhone."

Approach

  Multi-step wizard with progress bar, per-step persistence
  (resume from where you left off across sessions), minimal
  questions (mostly defaults), can-skip-finish-later for
  non-blocking steps.

  This is one of the few exception-class flows where multi-step
  wizards are explicitly OK per the doctrine (`§"When 3 clicks
  isn't enough" → onboarding is a documented exception).

Steps (ordered)

  1. property_identity         Property name, address, brand
  2. outlets                   At least one outlet to start
  3. user_creation             First admin / GM user (you)
  4. team_invite               Optional: invite first team
                               members (managers, sous chef)
  5. payroll_basics            Tax filing entity, pay frequency,
                               state — auto-loads tax tables
  6. integrations              Optional: connect POS, OTAs, banks
                               (skip for later if needed)
  7. atlas_connection          Verify MONGO_URI is configured
  8. echo_doctrine_intro       3-screen tour of Privacy Tenets
                               + 3-click rule (the soul of the
                               product)
  9. first_face_id             Enroll Face ID for the first user
  10. ready                    "Hello — your property is set up.
                               Here's what to try first."

Each step has:
  · a state row in `onboarding_progress` (per tenant)
  · a "skip" flag if optional
  · a "blocking" flag for steps that gate downstream functionality
  · resume support — user can close the app and come back

Endpoints (all /api/onboarding/v2)

  POST /start                       Initialize tenant, return
                                    progress + first step
  GET  /progress/{tenant_id}        Resume the wizard
  POST /step/{tenant_id}/{step}     Submit step data; advance
  POST /step/{tenant_id}/{step}/skip   Skip optional step
  GET  /complete/{tenant_id}        Mark wizard complete
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

logger = logging.getLogger("echo.onboarding_v2")

router = APIRouter(prefix="/api/onboarding/v2",
                   tags=["onboarding-wizard-v2"])


STEPS: List[Dict[str, Any]] = [
    {"id": "property_identity",  "blocking": True,  "skippable": False,
     "title": "Tell us about your property",
     "description": "We need the basics — name, address, brand."},
    {"id": "outlets",            "blocking": True,  "skippable": False,
     "title": "Add your first outlet",
     "description": "An outlet is a revenue surface (a restaurant, bar, spa). Add at least one. You can add more later."},
    {"id": "user_creation",      "blocking": True,  "skippable": False,
     "title": "Create your admin account",
     "description": "This will be the first user. You can invite others next."},
    {"id": "team_invite",        "blocking": False, "skippable": True,
     "title": "Invite your team",
     "description": "Send enrollment QRs to managers, sous chef, etc. Skip to do later."},
    {"id": "payroll_basics",     "blocking": False, "skippable": True,
     "title": "Payroll basics",
     "description": "Filing entity, pay frequency, state. Skip to set up later."},
    {"id": "integrations",       "blocking": False, "skippable": True,
     "title": "Connect your tools",
     "description": "POS, OTAs, banks. Skip to do later."},
    {"id": "atlas_connection",   "blocking": True,  "skippable": False,
     "title": "Verify your database connection",
     "description": "We make sure Echo can talk to MongoDB Atlas."},
    {"id": "echo_doctrine_intro","blocking": False, "skippable": True,
     "title": "Meet Echo",
     "description": "A 60-second tour of the Privacy Tenets and the 3-click rule. Skip if you've seen it."},
    {"id": "first_face_id",      "blocking": False, "skippable": True,
     "title": "Enroll Face ID",
     "description": "Set up biometric login. Skip to use a password for now."},
    {"id": "ready",              "blocking": False, "skippable": False,
     "title": "You're ready",
     "description": "Welcome to Echo / LUCCCA. Here's what to try first."},
]


# ─── Models ────────────────────────────────────────────────────────────

class StartBody(BaseModel):
    intended_brand_name: str = Field(..., min_length=2)
    contact_email: str
    invite_code: Optional[str] = None    # purchase / partnership code


class PropertyIdentityBody(BaseModel):
    property_name: str = Field(..., min_length=2)
    address_line_1: str
    city: str
    state: str
    zip_code: str
    country: str = "US"
    brand_id: Optional[str] = None       # if part of a brand group
    timezone: str = "America/New_York"


class OutletBody(BaseModel):
    name: str
    type: str = Field(...,
        pattern="^(restaurant|bar|spa|ird|retail|banquet|other)$")
    seat_count: int = Field(0, ge=0)
    operating_hours: Optional[Dict[str, Any]] = None


class UserCreationBody(BaseModel):
    first_name: str
    last_name: str
    email: str
    role: str = "owner"


class TeamInviteBody(BaseModel):
    invites: List[Dict[str, str]]   # [{first_name, last_name, email, role}]


class PayrollBasicsBody(BaseModel):
    filing_entity: str = Field(...,
        pattern="^(LLC|S_Corp|C_Corp|sole_prop|partnership)$")
    pay_frequency: str = Field(...,
        pattern="^(weekly|bi_weekly|semi_monthly|monthly)$")
    states: List[str] = Field(default_factory=lambda: ["FL"])
    ein: Optional[str] = None


class IntegrationBody(BaseModel):
    pos_provider: Optional[str] = None
    ota_providers: List[str] = Field(default_factory=list)
    bank_provider: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit_audit(tenant_id: str, kind: str, payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"onboarding.{kind}",
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


def _step_index(step_id: str) -> int:
    for i, s in enumerate(STEPS):
        if s["id"] == step_id:
            return i
    return -1


def _next_step(current: str) -> Optional[Dict[str, Any]]:
    idx = _step_index(current)
    if idx < 0 or idx + 1 >= len(STEPS):
        return None
    return STEPS[idx + 1]


def _progress_summary(progress: Dict[str, Any]) -> Dict[str, Any]:
    completed = progress.get("completed_steps", [])
    return {
        "current_step": progress.get("current_step"),
        "completed_count": len(completed),
        "total_count": len(STEPS),
        "completion_pct": round(100 * len(completed) / len(STEPS), 1),
        "blocking_remaining": [
            s["id"] for s in STEPS
            if s["blocking"] and s["id"] not in completed
        ],
    }


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/start")
def start(body: StartBody):
    """Initialize a new tenant and onboarding progress row.
    Returns the tenant_id (which the frontend uses for all
    subsequent calls)."""
    tenant_id = uuid.uuid4().hex[:16]
    db["tenants"].insert_one({
        "id": tenant_id,
        "intended_brand_name": body.intended_brand_name,
        "contact_email": body.contact_email,
        "invite_code": body.invite_code,
        "active": True,
        "onboarding_complete": False,
        "created_at": _now_iso(),
    })
    progress = {
        "tenant_id": tenant_id,
        "current_step": STEPS[0]["id"],
        "completed_steps": [],
        "skipped_steps": [],
        "step_data": {},
        "started_at": _now_iso(),
        "completed_at": None,
    }
    db["onboarding_progress"].insert_one(progress.copy())
    _emit_audit(tenant_id, "start", {
        "intended_brand_name": body.intended_brand_name,
        "contact_email": body.contact_email,
    })
    return {
        "ok": True,
        "tenant_id": tenant_id,
        "current_step": STEPS[0],
        "progress": _progress_summary(progress),
    }


@router.get("/progress/{tenant_id}")
def get_progress(tenant_id: str):
    progress = db["onboarding_progress"].find_one(
        {"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    progress.pop("_id", None)
    cur = progress.get("current_step")
    return {
        "ok": True,
        "current_step": next(
            (s for s in STEPS if s["id"] == cur), None),
        "progress": _progress_summary(progress),
        "step_data": progress.get("step_data", {}),
        "completed_steps": progress.get("completed_steps", []),
        "skipped_steps": progress.get("skipped_steps", []),
    }


@router.post("/step/{tenant_id}/property_identity")
def submit_property_identity(
    tenant_id: str, body: PropertyIdentityBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    db["tenants"].update_one(
        {"id": tenant_id},
        {"$set": {**body.dict(), "updated_at": _now_iso()}})
    return _advance(tenant_id, "property_identity", body.dict())


@router.post("/step/{tenant_id}/outlets")
def submit_first_outlet(tenant_id: str, body: OutletBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    outlet_id = uuid.uuid4().hex[:16]
    db["outlets"].insert_one({
        "id": outlet_id,
        "tenant_id": tenant_id,
        **body.dict(),
        "created_at": _now_iso(),
    })
    return _advance(tenant_id, "outlets",
        {"first_outlet_id": outlet_id, **body.dict()})


@router.post("/step/{tenant_id}/user_creation")
def submit_user_creation(tenant_id: str, body: UserCreationBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    user_id = uuid.uuid4().hex[:16]
    db["employees"].insert_one({
        "id": user_id,
        "tenant_id": tenant_id,
        **body.dict(),
        "active": True,
        "ytd_gross": 0,
        "created_at": _now_iso(),
    })
    return _advance(tenant_id, "user_creation",
        {"first_user_id": user_id, **body.dict()})


@router.post("/step/{tenant_id}/team_invite")
def submit_team_invite(tenant_id: str, body: TeamInviteBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    invited = []
    for inv in body.invites:
        eid = uuid.uuid4().hex[:16]
        db["employees"].insert_one({
            "id": eid, "tenant_id": tenant_id, "active": True,
            "invited": True, "invite_status": "pending",
            **inv,
            "created_at": _now_iso(),
        })
        invited.append(eid)
    return _advance(tenant_id, "team_invite", {"invited_ids": invited})


@router.post("/step/{tenant_id}/payroll_basics")
def submit_payroll_basics(tenant_id: str, body: PayrollBasicsBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    db["payroll_config"].insert_one({
        "tenant_id": tenant_id,
        **body.dict(),
        "created_at": _now_iso(),
    })
    # Trigger tax-table seed for the requested states (D59)
    try:
        from jobs.seed_tax_tables import build_seed_rows
        rows = build_seed_rows()
        for r in rows:
            if r.get("jurisdiction") in body.states + ["FEDERAL", "_DEFAULT"]:
                db["tax_tables"].insert_one(r)
    except Exception as e:
        logger.warning(f"tax seed during onboarding skipped: {e}")
    return _advance(tenant_id, "payroll_basics", body.dict())


@router.post("/step/{tenant_id}/integrations")
def submit_integrations(tenant_id: str, body: IntegrationBody):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    # Just record the choices; the actual API key entry happens
    # later via the per-vendor admin surfaces (D17 fuse-box)
    db["integration_intents"].insert_one({
        "tenant_id": tenant_id,
        **body.dict(),
        "configured": False,
        "created_at": _now_iso(),
    })
    return _advance(tenant_id, "integrations", body.dict())


@router.post("/step/{tenant_id}/atlas_connection")
def verify_atlas_connection(tenant_id: str):
    """Simply confirms the app's Mongo handle is reachable.
    Real verification happens in /readyz; this just confirms the
    user got to this point with a working DB."""
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    try:
        # If we can write, we can read — good enough verification
        db["onboarding_progress"].find_one({"tenant_id": tenant_id})
        verified = True
    except Exception:
        verified = False
    if not verified:
        raise HTTPException(503,
            "Database not reachable. Set MONGO_URI in your "
            "secrets manager and redeploy.")
    return _advance(tenant_id, "atlas_connection", {"verified": True})


@router.post("/step/{tenant_id}/echo_doctrine_intro")
def confirm_doctrine_intro(tenant_id: str):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    return _advance(tenant_id, "echo_doctrine_intro", {"viewed": True})


@router.post("/step/{tenant_id}/first_face_id")
def confirm_face_id(tenant_id: str,
                     credential_id: Optional[str] = None):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    return _advance(tenant_id, "first_face_id",
        {"credential_id": credential_id, "enrolled": bool(credential_id)})


@router.post("/step/{tenant_id}/{step_id}/skip")
def skip_step(tenant_id: str, step_id: str):
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    step = next((s for s in STEPS if s["id"] == step_id), None)
    if not step:
        raise HTTPException(404, "step not found")
    if not step["skippable"]:
        raise HTTPException(400,
            f"step '{step_id}' is required and cannot be skipped")
    skipped = progress.get("skipped_steps", [])
    skipped.append(step_id)
    db["onboarding_progress"].update_one(
        {"tenant_id": tenant_id},
        {"$set": {"skipped_steps": skipped}})
    return _advance(tenant_id, step_id, {"skipped": True})


@router.get("/complete/{tenant_id}")
def complete_onboarding(tenant_id: str):
    progress = db["onboarding_progress"].find_one(
        {"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    summary = _progress_summary(progress)
    if summary["blocking_remaining"]:
        raise HTTPException(400, {
            "error": "blocking_steps_remaining",
            "remaining": summary["blocking_remaining"],
        })
    db["onboarding_progress"].update_one(
        {"tenant_id": tenant_id},
        {"$set": {"completed_at": _now_iso(),
                  "current_step": "ready"}})
    db["tenants"].update_one(
        {"id": tenant_id},
        {"$set": {"onboarding_complete": True,
                  "onboarding_completed_at": _now_iso()}})
    _emit_audit(tenant_id, "complete", {})
    return {
        "ok": True,
        "completed_at": _now_iso(),
        "first_actions": [
            "Tap 'Generate enrollment QR' to onboard your team",
            "Open the activity drawer to see Echo's first observations",
            "Try voice: \"Echo, what's my schedule for next week?\"",
        ],
    }


# ─── Internal helpers ────────────────────────────────────────────────

def _advance(tenant_id: str, completed_step_id: str,
              step_data: Dict[str, Any]) -> Dict[str, Any]:
    """Mark step complete, return next step + summary."""
    progress = db["onboarding_progress"].find_one({"tenant_id": tenant_id})
    if not progress:
        raise HTTPException(404, "no progress for this tenant")
    completed = progress.get("completed_steps", [])
    if completed_step_id not in completed:
        completed.append(completed_step_id)
    sd = progress.get("step_data", {})
    sd[completed_step_id] = step_data
    next_step = _next_step(completed_step_id)
    update: Dict[str, Any] = {
        "completed_steps": completed,
        "step_data": sd,
        "updated_at": _now_iso(),
    }
    if next_step:
        update["current_step"] = next_step["id"]
    db["onboarding_progress"].update_one(
        {"tenant_id": tenant_id}, {"$set": update})
    _emit_audit(tenant_id, f"step_complete.{completed_step_id}",
                {"step": completed_step_id})
    return {
        "ok": True,
        "completed_step": completed_step_id,
        "next_step": next_step,
        "progress": _progress_summary({**progress, **update}),
    }
