"""iter248 · MyEcho Staff — endpoints for hourly employees.

Surface a thinned-down view of HR data per logged-in employee:
  - GET  /api/myecho/me                  → profile snapshot
  - GET  /api/myecho/schedule            → my upcoming shifts
  - GET  /api/myecho/paystubs            → pay history
  - GET  /api/myecho/tax-docs            → W-2 / 1099 / I-9
  - GET  /api/myecho/pto-balance         → PTO + sick balance
  - POST /api/myecho/pto-request         → submit PTO request
  - GET  /api/myecho/pto-requests        → list of my PTO requests
  - GET  /api/myecho/direct-deposit      → masked DD info (last 4 only)
  - POST /api/myecho/clock               → clock in/out punch

For demo, data falls back to stable hash-based seed values when source
collections are empty. Real wiring point is the `employees` collection
+ the future `payroll_runs` / `tax_documents` collections.
"""
from __future__ import annotations
import os, hashlib
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/myecho", tags=["myecho-staff"])


# ── helpers ─────────────────────────────────────────────────────────────
def _h(seed: str, low: float = 0, high: float = 1) -> float:
    n = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    return low + (n % 10000) / 10000 * (high - low)


def _merge_admin_assignment(emp: Dict[str, Any]) -> Dict[str, Any]:
    """Augment an `employees` row with the outlet_ids assigned by the
    customer-admin profile builder (D11a). The customer admin populates
    `admin_users` via POST /api/admin/users with outlet_ids[…]; that's
    the source of truth for which outlets a staff member oversees.

    If `employees.outlet_ids` is already set we trust it. Otherwise we
    look the user up in `admin_users` (by user_id, then email) and
    `user_roles` and copy the array over. No-ops if neither row has
    outlet_ids — the endpoint then falls back to department-only
    scoping (pre-D12c behavior)."""
    if emp.get("outlet_ids"):
        return emp
    eid = emp.get("id") or emp.get("employee_id")
    email = emp.get("email")
    for coll in ("admin_users", "user_roles"):
        try:
            row = (db[coll].find_one({"user_id": eid}, {"_id": 0})
                   if eid else None)
            if not row and email:
                row = db[coll].find_one({"email": email}, {"_id": 0})
            if row and row.get("outlet_ids"):
                emp["outlet_ids"] = list(row["outlet_ids"])
                if row.get("role") and not emp.get("role"):
                    emp["role"] = row["role"]
                return emp
        except Exception:
            continue
    return emp


def _resolve_employee(user_id: Optional[str]) -> Dict[str, Any]:
    """Devauth/dev mode falls back to a known demo employee.
    D12c: merges admin-assigned outlet_ids into the returned dict so
    downstream endpoints can scope by the user's outlets."""
    if user_id:
        e = db["employees"].find_one({"id": user_id}, {"_id": 0})
        if e: return _merge_admin_assignment(e)
        e = db["employees"].find_one({"email": user_id}, {"_id": 0})
        if e: return _merge_admin_assignment(e)
    e = db["employees"].find_one({"active": True}, {"_id": 0})
    if e: return _merge_admin_assignment(e)
    # dev fallback
    return {"id": "demo-hourly-001", "first_name": "Sofia",
              "last_name": "Ramirez", "display_name": "Sofia Ramirez",
              "title": "Server", "department": "FOH", "email": "sofia@luccca.com",
              "hire_date": "2024-03-15", "active": True}


def _outlets_overlap(a: Optional[List[str]], b: Optional[List[str]]) -> bool:
    """True iff the two outlet_id lists share at least one outlet, or
    if either side has the wildcard "all". Returns True when either
    side is empty/None — pre-D12c rows had no outlet_ids and we don't
    want to silently filter every coworker out."""
    if not a or not b:
        return True
    if "all" in a or "all" in b:
        return True
    return bool(set(a) & set(b))


# ── endpoints ───────────────────────────────────────────────────────────
@router.get("/me")
def me(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    nm = e.get("display_name") or \
          f"{e.get('first_name','').strip()} {e.get('last_name','').strip()}".strip()
    return {"ok": True, "id": e.get("id"), "name": nm or "Staff",
              "email": e.get("email"), "title": e.get("title") or "Staff",
              "department": e.get("department") or "—",
              "hire_date": e.get("hire_date"),
              "tenure_years": _calc_tenure(e.get("hire_date")),
              # D21 · expose outlet_ids so the phone tiles (commissary
              # cost today, etc.) know which outlet to query. Merged in
              # by _resolve_employee → _merge_admin_assignment (D12c).
              "outlet_ids": list(e.get("outlet_ids") or []),
              "role": e.get("role") or ""}


def _calc_tenure(hd: Optional[str]) -> float:
    if not hd: return 0
    try:
        d = datetime.fromisoformat(hd.replace("Z", "+00:00")).date()
        return round((date.today() - d).days / 365.25, 1)
    except Exception:
        return 0


@router.get("/schedule")
def schedule(x_user_id: Optional[str] = Header(None), days: int = 14):
    e = _resolve_employee(x_user_id)
    eid = e.get("id") or "demo"
    rows = list(db["staff_schedule"].find(
        {"employee_id": eid,
          "date": {"$gte": date.today().isoformat()}},
        {"_id": 0}).sort("date", 1).limit(days))
    if rows:
        return {"ok": True, "rows": rows, "demo": False}
    # demo: 5 future shifts
    out = []
    today = date.today()
    shifts = [(0, "Lunch", "11:00", "16:00"), (1, "Dinner", "16:00", "23:00"),
                (2, "OFF", "", ""), (3, "Brunch", "09:00", "15:00"),
                (4, "Dinner", "16:00", "23:00"), (5, "Dinner", "16:00", "23:00"),
                (6, "OFF", "", "")]
    for dx, name, start, end in shifts:
        d = today + timedelta(days=dx)
        out.append({
            "date": d.isoformat(), "weekday": d.strftime("%a"),
            "shift": name, "start": start, "end": end,
            "outlet": "Coastal Kitchen" if name != "OFF" else None,
            "hours": _hours(start, end), "status": "scheduled" if start else "off",
        })
    return {"ok": True, "rows": out, "demo": True}


def _hours(s: str, e: str) -> float:
    if not s or not e: return 0
    try:
        sh, sm = map(int, s.split(":")); eh, em = map(int, e.split(":"))
        return round(((eh * 60 + em) - (sh * 60 + sm)) / 60, 1)
    except Exception: return 0


@router.get("/paystubs")
def paystubs(x_user_id: Optional[str] = Header(None), limit: int = 12):
    e = _resolve_employee(x_user_id)
    rate = round(_h(f"rate:{e.get('id')}", 18, 32), 2)
    out = []
    today = date.today()
    for i in range(limit):
        period_end = today - timedelta(days=14 * i)
        period_start = period_end - timedelta(days=13)
        hours = round(_h(f"hr:{e.get('id')}:{i}", 65, 85), 2)
        ot = round(_h(f"ot:{e.get('id')}:{i}", 0, 6), 2)
        gross = round(hours * rate + ot * rate * 1.5, 2)
        tips = round(_h(f"tip:{e.get('id')}:{i}", 200, 1100), 2)
        taxes = round((gross + tips) * 0.21, 2)
        net = round(gross + tips - taxes, 2)
        out.append({
            "id": f"pay-{period_end.isoformat()}",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "regular_hours": hours, "ot_hours": ot,
            "rate": rate, "gross": gross, "tips": tips,
            "taxes": taxes, "net": net,
            "pay_date": (period_end + timedelta(days=4)).isoformat(),
            "pdf_url": f"/api/myecho/paystub/{e.get('id')}/{period_end.isoformat()}.pdf",
        })
    return {"ok": True, "rows": out, "demo": True,
              "ytd": {
                  "gross": round(sum(r["gross"] for r in out), 2),
                  "tips": round(sum(r["tips"] for r in out), 2),
                  "taxes": round(sum(r["taxes"] for r in out), 2),
                  "net": round(sum(r["net"] for r in out), 2),
              }}


@router.get("/tax-docs")
def tax_docs(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    eid = e.get("id")
    yr = date.today().year
    docs = []
    for y in range(yr, yr - 4, -1):
        if y < yr or date.today().month >= 1:  # W-2 issued in January
            docs.append({
                "id": f"w2-{y}", "type": "W-2", "year": y,
                "title": f"W-2 Wage & Tax Statement · {y}",
                "issued_date": f"{y+1}-01-31",
                "url": f"/api/myecho/tax-doc/{eid}/w2/{y}.pdf",
                "available": True,
            })
        docs.append({
            "id": f"i9-{y}", "type": "I-9", "year": y,
            "title": f"Form I-9 Employment Eligibility · {y}",
            "issued_date": f"{y}-03-15",
            "url": f"/api/myecho/tax-doc/{eid}/i9/{y}.pdf",
            "available": True,
        })
    return {"ok": True, "rows": docs, "demo": True}


class PtoReq(BaseModel):
    start_date: str
    end_date: str
    type: str = "vacation"
    note: Optional[str] = None


@router.get("/pto-balance")
def pto_balance(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    return {"ok": True,
              "vacation_hours_remaining": round(_h(f"pto:{e.get('id')}", 24, 80), 1),
              "vacation_hours_accrued_ytd": round(_h(f"pto-ytd:{e.get('id')}", 60, 120), 1),
              "sick_hours_remaining": round(_h(f"sick:{e.get('id')}", 16, 40), 1),
              "personal_hours_remaining": round(_h(f"per:{e.get('id')}", 0, 16), 1),
              "accrual_rate_per_pay_period": 4.0,
              "as_of": utcnow_iso(),
              "demo": True}


@router.post("/pto-request")
def pto_request(body: PtoReq, x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    rec = {
        "id": f"pto-{int(datetime.now().timestamp())}",
        "employee_id": e.get("id"),
        "employee_name": e.get("display_name") or
                              f"{e.get('first_name','')} {e.get('last_name','')}".strip(),
        "start_date": body.start_date, "end_date": body.end_date,
        "type": body.type, "note": body.note,
        "status": "pending",
        "submitted_at": utcnow_iso(),
    }
    db["pto_requests"].insert_one(rec)
    rec.pop("_id", None)
    return {"ok": True, "request": rec,
              "message": "Submitted for manager approval. You'll get a notification when reviewed."}


@router.get("/pto-requests")
def pto_requests(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    rows = list(db["pto_requests"].find(
        {"employee_id": e.get("id")}, {"_id": 0}
    ).sort("submitted_at", -1).limit(40))
    return {"ok": True, "rows": rows}


@router.get("/direct-deposit")
def direct_deposit(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    seed = e.get("id") or "demo"
    last4 = str(int(_h(f"dd:{seed}", 1000, 9999)))
    return {"ok": True,
              "bank_name_masked": "****  Bank of America",
              "account_last4": last4,
              "type": "Checking",
              "split_pct": 100,
              "secondary": None,
              "updated_at": "2025-01-15T00:00:00Z",
              "_note": "Update through HR — call ext 4321 or visit the People Office",
              "demo": True}


class ClockEvent(BaseModel):
    direction: str  # "in" or "out"
    location_id: Optional[str] = None


@router.post("/clock")
def clock(body: ClockEvent, x_user_id: Optional[str] = Header(None)):
    if body.direction not in ("in", "out"):
        raise HTTPException(400, "direction must be 'in' or 'out'")
    e = _resolve_employee(x_user_id)
    rec = {"id": f"punch-{int(datetime.now().timestamp())}",
              "employee_id": e.get("id"),
              "direction": body.direction,
              "location_id": body.location_id,
              "punched_at": utcnow_iso()}
    db["punches"].insert_one(rec); rec.pop("_id", None)
    return {"ok": True, "punch": rec}


@router.get("/concierge-quick-actions")
def concierge_quick_actions():
    """Things hourly staff can ask the Concierge AI to help with."""
    return {"ok": True, "actions": [
        {"id": "request-shift-swap", "label": "Request shift swap",
          "icon": "🔄", "prompt_seed": "I'd like to swap my shift on..."},
        {"id": "report-issue", "label": "Report a workplace issue",
          "icon": "🚨", "prompt_seed": "I need to report..."},
        {"id": "ask-about-benefits", "label": "Ask about benefits",
          "icon": "🩺", "prompt_seed": "How do I enroll in..."},
        {"id": "uniform-replacement", "label": "Replace uniform / nameplate",
          "icon": "👕", "prompt_seed": "I need a new..."},
        {"id": "parking-question", "label": "Parking / locker / access",
          "icon": "🅿", "prompt_seed": "Question about parking..."},
        {"id": "training-question", "label": "Training / certification",
          "icon": "🎓", "prompt_seed": "When is the next..."},
        {"id": "payroll-question", "label": "Pay / hours dispute",
          "icon": "💵", "prompt_seed": "I think my hours are..."},
        {"id": "general-question", "label": "Something else",
          "icon": "💬", "prompt_seed": ""},
    ]}


# ── Shift Swap (Job Share) ─────────────────────────────────────────────
class ShiftSwapReq(BaseModel):
    shift_date: str               # YYYY-MM-DD
    shift_label: Optional[str] = None
    cover_id: str                 # employee id of person covering
    cover_name: Optional[str] = None
    note: Optional[str] = None


@router.post("/shift-swap/request")
def shift_swap_request(body: ShiftSwapReq, x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    rname = e.get("display_name") or \
              f"{e.get('first_name','')} {e.get('last_name','')}".strip()
    rec = {
        "id": f"swap-{int(datetime.now().timestamp() * 1000)}",
        "requester_id": e.get("id"), "requester_name": rname,
        "shift_date": body.shift_date, "shift_label": body.shift_label,
        "cover_id": body.cover_id, "cover_name": body.cover_name,
        "note": body.note, "status": "manager-pending",
        "submitted_at": utcnow_iso(),
    }
    db["shift_swaps"].insert_one(dict(rec)); rec.pop("_id", None)
    return {"ok": True, "swap": rec,
              "message": "Swap submitted. Not confirmed until your manager approves — you'll get a notification."}


@router.get("/shift-swap/mine")
def shift_swap_mine(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    eid = e.get("id")
    rows = list(db["shift_swaps"].find(
        {"$or": [{"requester_id": eid}, {"cover_id": eid}]}, {"_id": 0}
    ).sort("submitted_at", -1).limit(40))
    return {"ok": True, "rows": rows}


@router.get("/coworkers")
def coworkers(x_user_id: Optional[str] = Header(None)):
    """List of coworkers a staff member can ask to cover their shift.

    D12c: filters by outlet overlap when the caller has admin-assigned
    outlets. A server at Marina Grill no longer sees the entire FOH
    roster across the resort — only servers at Marina Grill (or
    multi-outlet servers whose set overlaps Marina Grill). When the
    caller has no outlets assigned (legacy data), falls back to
    department-only scoping."""
    e = _resolve_employee(x_user_id)
    dept = e.get("department")
    my_outlets = e.get("outlet_ids") or []
    rows = list(db["employees"].find(
        {"active": True, "department": dept, "id": {"$ne": e.get("id")}},
        {"_id": 0, "id": 1, "display_name": 1, "first_name": 1, "last_name": 1,
         "title": 1, "outlet_ids": 1, "email": 1}
    ).limit(120))
    out = []
    for r in rows:
        # Augment each candidate with their admin-assigned outlets, then
        # filter by overlap. _merge_admin_assignment is cheap (two
        # find_one() calls); we cap the pool at 120 above to keep the
        # filter loop bounded.
        candidate = _merge_admin_assignment(dict(r))
        if not _outlets_overlap(my_outlets, candidate.get("outlet_ids")):
            continue
        nm = candidate.get("display_name") or \
              f"{candidate.get('first_name','')} {candidate.get('last_name','')}".strip()
        out.append({"id": candidate.get("id"), "name": nm or "—",
                    "title": candidate.get("title")})
        if len(out) >= 60:
            break
    return {"ok": True, "rows": out, "scoped_by_outlet": bool(my_outlets)}


# ── AI Coverage Finder (Claude-ranked candidates) ──────────────────────
class CoverageQuery(BaseModel):
    shift_date: str
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None


@router.post("/shift-swap/suggest-coverage")
def suggest_coverage(body: CoverageQuery, x_user_id: Optional[str] = Header(None)):
    """Return top-3 ranked candidates for covering this shift.
    Heuristic ranking (no LLM call needed for speed/cost):
      + Same department + active
      + Same title (+ skill match)
      + Available on shift_date (no scheduled shift, no PTO, no callout)
      + Lower hours-this-week (avoid OT)
      + Higher tenure (reliability proxy)
    """
    e = _resolve_employee(x_user_id)
    dept = e.get("department")
    title = e.get("title") or e.get("role")
    my_outlets = e.get("outlet_ids") or []
    pool = list(db["employees"].find(
        {"active": True, "department": dept, "id": {"$ne": e.get("id")}}, {"_id": 0}))
    # D12c: scope to outlet overlap before scoring.
    if my_outlets:
        pool = [p for p in pool
                if _outlets_overlap(my_outlets,
                                    _merge_admin_assignment(p).get("outlet_ids"))]
    # Exclude anyone with PTO or callout on that date
    pto_taken = {r["employee_id"] for r in db["pto_requests"].find(
        {"status": "approved",
          "start_date": {"$lte": body.shift_date},
          "end_date": {"$gte": body.shift_date}},
        {"_id": 0, "employee_id": 1})}
    co_taken = {r["employee_id"] for r in db["callout_requests"].find(
        {"shift_date": body.shift_date}, {"_id": 0, "employee_id": 1})}
    # Hours this week (best effort)
    candidates = []
    for c in pool:
        cid = c.get("id")
        if cid in pto_taken or cid in co_taken: continue
        score = 50
        if (c.get("title") or c.get("role")) == title: score += 25
        # Tenure bonus
        try:
            d = datetime.fromisoformat((c.get("hire_date") or "").replace("Z", "+00:00")).date()
            yrs = (datetime.now(timezone.utc).date() - d).days / 365.25
            score += min(int(yrs * 3), 18)
        except Exception: pass
        # Penalize anyone scheduled that day already
        existing = db["staff_schedule"].find_one(
            {"employee_id": cid, "date": body.shift_date}, {"_id": 0})
        if existing: score -= 30
        nm = c.get("display_name") or \
              f"{c.get('first_name','')} {c.get('last_name','')}".strip()
        candidates.append({
            "id": cid, "name": nm or "—",
            "title": c.get("title") or c.get("role"),
            "score": score,
            "reason": _reason_text(c.get("title") == title, bool(existing),
                                              cid in pto_taken, cid in co_taken),
        })
    candidates.sort(key=lambda c: c["score"], reverse=True)
    top = candidates[:3]
    return {"ok": True, "candidates": top, "considered": len(candidates),
              "shift_date": body.shift_date, "demo": False}


def _reason_text(same_title: bool, scheduled_already: bool,
                       on_pto: bool, called_out: bool) -> str:
    bits = []
    if same_title: bits.append("matches your role")
    if not scheduled_already and not on_pto and not called_out:
        bits.append("free that day")
    if scheduled_already: bits.append("already scheduled — bump risk")
    return ", ".join(bits) or "available"


# ── Call-out (calling out sick) ────────────────────────────────────────
class CallOutReq(BaseModel):
    shift_date: str
    shift_start: Optional[str] = None        # "HH:MM"
    reason: str = "sick"                     # sick | family | personal
    note: Optional[str] = None


@router.get("/callout-policy")
def callout_policy():
    """What's allowed via mobile vs phone-only? Used by the MyEcho UI to
    decide whether to show the form or the 'call your manager' button."""
    cfg = db["hr_config"].find_one({"_id": "global"}) or {}
    return {"ok": True,
              "allow_mobile_callout": bool(cfg.get("allow_mobile_callout", False)),
              "min_hours_before_shift": int(cfg.get("callout_min_hours_before_shift", 2)),
              "require_phone_call_after_callout": bool(
                  cfg.get("require_phone_call_after_callout", True)),
              "manager_phone": cfg.get("manager_on_duty_phone") or "+15555550199",
              "manager_name": cfg.get("manager_on_duty_name") or "Manager on Duty"}


@router.post("/callout/request")
def callout_request(body: CallOutReq, x_user_id: Optional[str] = Header(None)):
    """Submit a call-out via mobile. ONLY accepted when:
       (a) HR config has allow_mobile_callout=True, AND
       (b) we're at least min_hours_before_shift away from the shift start."""
    pol = callout_policy()
    if not pol["allow_mobile_callout"]:
        raise HTTPException(403, {
            "code": "phone-required",
            "message": "Call-outs must be made by phone to your manager.",
            "manager_phone": pol["manager_phone"],
            "manager_name": pol["manager_name"]})
    # Hours-before check (best effort: needs shift_start)
    if body.shift_start:
        try:
            sd = datetime.fromisoformat(body.shift_date + "T" + body.shift_start)
            sd = sd.replace(tzinfo=timezone.utc)
            hrs = (sd - datetime.now(timezone.utc)).total_seconds() / 3600
            if hrs < pol["min_hours_before_shift"]:
                raise HTTPException(403, {
                    "code": "too-late",
                    "message": f"Call-outs within {pol['min_hours_before_shift']}hr of shift "
                                  f"must be by phone — your shift starts in {hrs:.1f}hr.",
                    "manager_phone": pol["manager_phone"],
                    "manager_name": pol["manager_name"]})
        except HTTPException: raise
        except Exception: pass
    e = _resolve_employee(x_user_id)
    nm = e.get("display_name") or \
          f"{e.get('first_name','')} {e.get('last_name','')}".strip()
    rec = {
        "id": f"co-{int(datetime.now().timestamp() * 1000)}",
        "employee_id": e.get("id"), "employee_name": nm or "—",
        "shift_date": body.shift_date, "shift_start": body.shift_start,
        "reason": body.reason, "note": body.note,
        "status": "pending", "submitted_at": utcnow_iso(),
    }
    db["callout_requests"].insert_one(dict(rec)); rec.pop("_id", None)
    return {"ok": True, "callout": rec,
              "message": "Manager notified. " +
                            ("Please also call your manager." if pol["require_phone_call_after_callout"] else "")}


@router.get("/callout/mine")
def callout_mine(x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    rows = list(db["callout_requests"].find(
        {"employee_id": e.get("id")}, {"_id": 0}
    ).sort("submitted_at", -1).limit(20))
    return {"ok": True, "rows": rows}


# ── Notifications (push back from manager actions) ─────────────────────
@router.get("/notifications")
def notifications(x_user_id: Optional[str] = Header(None), unread_only: bool = False):
    e = _resolve_employee(x_user_id)
    q: Dict[str, Any] = {"employee_id": e.get("id")}
    if unread_only: q["read"] = False
    rows = list(db["myecho_notifications"].find(q, {"_id": 0})
                  .sort("created_at", -1).limit(60))
    return {"ok": True, "rows": rows,
              "unread_count": db["myecho_notifications"].count_documents(
                  {"employee_id": e.get("id"), "read": False})}


@router.post("/notifications/{notif_id}/read")
def notifications_read(notif_id: str, x_user_id: Optional[str] = Header(None)):
    db["myecho_notifications"].update_one(
        {"id": notif_id}, {"$set": {"read": True, "read_at": utcnow_iso()}})
    return {"ok": True}


# ── Manager-on-Duty chat (mobile-side mirror of /api/manager-workflow/mod) ──
@router.get("/mod-chat/messages")
def mod_chat_messages(outlet_id: str = "out-coastal-kitchen", limit: int = 60):
    rid = f"mod-{outlet_id}"
    msgs = list(db["chat_messages"].find({"room_id": rid}, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    msgs.reverse()
    aids = {m.get("author_id") for m in msgs}
    name_map = {e["id"]: e.get("display_name") or
                       f"{e.get('first_name','')} {e.get('last_name','')}".strip()
                  for e in db["employees"].find({"id": {"$in": list(aids)}},
                      {"_id": 0, "id": 1, "display_name": 1, "first_name": 1, "last_name": 1})}
    for m in msgs:
        m["author_name"] = name_map.get(m.get("author_id"),
                                                     m.get("author_id") or "—")
    return {"ok": True, "rows": msgs}


class ModPostBody(BaseModel):
    text: str
    outlet_id: str = "out-coastal-kitchen"


@router.post("/mod-chat/post")
def mod_chat_post(body: ModPostBody, x_user_id: Optional[str] = Header(None)):
    e = _resolve_employee(x_user_id)
    rid = f"mod-{body.outlet_id}"
    # ensure room exists
    if not db["chat_rooms"].find_one({"id": rid}, {"_id": 0}):
        outlet = db["outlets"].find_one({"outlet_id": body.outlet_id}, {"_id": 0}) or {}
        db["chat_rooms"].insert_one({
            "id": rid, "name": f"Manager-on-Duty · {outlet.get('name', body.outlet_id)}",
            "kind": "manager-on-duty", "outlet_id": body.outlet_id,
            "members": ["all-staff"], "created_at": utcnow_iso(),
        })
    msg = {
        "id": f"msg-{int(datetime.now().timestamp() * 1000)}",
        "room_id": rid, "outlet_id": body.outlet_id,
        "author_id": e.get("id"), "text": body.text,
        "created_at": utcnow_iso(),
    }
    db["chat_messages"].insert_one(dict(msg)); msg.pop("_id", None)
    db["chat_rooms"].update_one({"id": rid},
        {"$set": {"last_message_at": msg["created_at"]}})
    return {"ok": True, "message": msg}
