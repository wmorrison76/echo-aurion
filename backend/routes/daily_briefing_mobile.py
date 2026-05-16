"""iter185 · Daily Briefing Mobile — staff who missed the morning standup can catch up on their phone.

Pattern:
  - Admin mints a per-staff magic token via POST /api/daily-briefing/mint (X-Admin-Token)
  - Staff opens /m/briefing/{token} (frontend) which calls GET /api/daily-briefing/today (X-Briefing-Token)
  - Returns the latest approved standup board in a mobile-compact shape.

Non-goals:
  - Editing (read-only catch-up view)
  - Guest-facing data (staff operational info only)
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/daily-briefing", tags=["daily-briefing-mobile"])


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()
def _today_key() -> str: return _now().strftime("%Y-%m-%d")


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _auth_staff(x_briefing_token: Optional[str]) -> Dict[str, Any]:
    if not x_briefing_token: raise HTTPException(401, "briefing token required")
    from database import db as _db
    sess = _db.briefing_mobile_tokens.find_one({"token": x_briefing_token, "active": True}, {"_id": 0})
    if not sess: raise HTTPException(401, "invalid or revoked briefing token")
    exp = sess.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now(): raise HTTPException(410, "briefing token expired")
    return sess


class MintBody(BaseModel):
    staff_name: str
    staff_role: Optional[str] = None
    staff_email: Optional[str] = None
    staff_phone: Optional[str] = None   # E.164 (e.g. +15551234567) — SMS fallback
    ttl_days: int = 14


@router.post("/mint")
async def mint_token(body: MintBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    tok = secrets.token_urlsafe(18)
    doc = {
        "token": tok,
        "staff_name": body.staff_name,
        "staff_role": body.staff_role,
        "staff_email": body.staff_email,
        "staff_phone": body.staff_phone,
        "active": True,
        "created_at": _now(),
        "expires_at": _now() + timedelta(days=max(1, min(60, body.ttl_days))),
    }
    _db.briefing_mobile_tokens.insert_one(doc.copy())
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    return {
        "ok": True, "token": tok,
        "mobile_url": f"/m/briefing/{tok}",
        "absolute_url": f"{base}/m/briefing/{tok}" if base else None,
        "expires_at": doc["expires_at"].isoformat(),
    }


# ─── Bulk CSV mint ────────────────────────────────────────────────────────
class BulkMintRow(BaseModel):
    staff_name: str
    staff_role: Optional[str] = None
    staff_email: Optional[str] = None
    staff_phone: Optional[str] = None


class BulkMintBody(BaseModel):
    rows: List[BulkMintRow]
    ttl_days: int = 14


@router.post("/mint-bulk")
async def mint_bulk(body: BulkMintBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    if not body.rows: raise HTTPException(400, "rows required")
    if len(body.rows) > 200: raise HTTPException(400, "max 200 rows per bulk import")
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    ttl = max(1, min(60, body.ttl_days))
    created: List[Dict[str, Any]] = []
    for row in body.rows:
        if not row.staff_name.strip(): continue
        tok = secrets.token_urlsafe(18)
        d = {
            "token": tok,
            "staff_name": row.staff_name.strip(),
            "staff_role": (row.staff_role or "").strip() or None,
            "staff_email": (row.staff_email or "").strip() or None,
            "staff_phone": (row.staff_phone or "").strip() or None,
            "active": True,
            "created_at": _now(),
            "expires_at": _now() + timedelta(days=ttl),
        }
        _db.briefing_mobile_tokens.insert_one(d.copy())
        created.append({
            "token": tok,
            "staff_name": d["staff_name"],
            "staff_email": d["staff_email"],
            "staff_phone": d["staff_phone"],
            "mobile_url": f"/m/briefing/{tok}",
            "absolute_url": f"{base}/m/briefing/{tok}" if base else None,
            "expires_at": d["expires_at"].isoformat(),
        })
    return {"ok": True, "count": len(created), "tokens": created}


# ─── Flush queued / replay pushes ──────────────────────────────────────────
@router.post("/flush-queue")
async def flush_queue(x_admin_token: Optional[str] = Header(None)):
    """Replay every queued `mobile_briefing` email_outbox entry. Useful after
    Resend/Twilio keys are newly added — fills in the blackout window."""
    _require_admin(x_admin_token)
    from database import db as _db
    resend_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("RESEND_FROM") or os.environ.get("SENDER_EMAIL") or "briefing@echoai3.local"
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_from = os.environ.get("TWILIO_FROM_NUMBER")
    if not resend_key and not (twilio_sid and twilio_token and twilio_from):
        return {"ok": False, "detail": "No RESEND_API_KEY or Twilio creds set — nothing to flush"}

    queued = list(_db.email_outbox.find(
        {"kind": "mobile_briefing", "status": {"$regex": "^queued"}},
        {"_id": 0}
    ).limit(500))
    email_sent = 0; sms_sent = 0; failed = 0
    for item in queued:
        to = item.get("to")
        link = item.get("body_preview") or ""
        subj = item.get("subject") or "Luccca · Daily Briefing"
        tok = item.get("token")
        # Look up the token for the staff name
        staff = _db.briefing_mobile_tokens.find_one({"token": tok}, {"_id": 0}) if tok else None
        name = (staff or {}).get("staff_name") or "there"
        name_first = name.split(" ")[0] if name else "there"
        date_guess = item.get("date") or (subj.split("·")[0].strip() if "·" in subj else "")
        channel = "none"; status = "failed"
        # Prefer email
        if resend_key and to and "@" in to:
            try:
                import resend  # type: ignore
                resend.api_key = resend_key
                headline = render_briefing_template("email_headline", name=name_first, date=date_guess, link=link, subject=subj)
                intro = render_briefing_template("email_intro", name=name_first, date=date_guess, link=link, subject=subj)
                html = f"""<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                    <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;text-transform:uppercase;font-weight:700">Luccca · Daily Briefing</div>
                    <h1 style="font-size:26px;font-weight:200;margin:10px 0 6px">Replay · catch-up</h1>
                    <p style="font-size:14px;color:#555">{intro}</p>
                    <p><a href="{link}" style="display:inline-block;background:linear-gradient(90deg,#c8a97e,#e9d5a5);color:#0a0e1a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:12px">Open briefing →</a></p>
                    <p style="font-size:10px;color:#aaa;margin-top:14px">{headline}</p>
                </div>"""
                resend.Emails.send({"from": sender, "to": [to], "subject": subj, "html": html})
                channel = "email"; status = "delivered"; email_sent += 1
            except Exception as e:
                status = f"failed: {str(e)[:100]}"; failed += 1
        elif twilio_sid and twilio_token and twilio_from and to and to.startswith("+"):
            try:
                from twilio.rest import Client as _TwClient  # type: ignore
                sms_body = render_briefing_template("sms_template", name=name_first, date=date_guess, link=link, subject=subj)
                _TwClient(twilio_sid, twilio_token).messages.create(
                    to=to, from_=twilio_from, body=sms_body,
                )
                channel = "sms"; status = "delivered"; sms_sent += 1
            except Exception as e:
                status = f"sms_failed: {str(e)[:100]}"; failed += 1
        else:
            status = "skipped_no_channel"; failed += 1
        _db.email_outbox.update_one(
            {"kind": "mobile_briefing", "body_preview": link, "token": tok, "status": item.get("status")},
            {"$set": {"status": status, "channel": channel, "flushed_at": _iso()}}
        )
    return {"ok": True, "considered": len(queued), "email_sent": email_sent, "sms_sent": sms_sent, "failed": failed}


@router.get("/session")
async def session(x_briefing_token: Optional[str] = Header(None)):
    s = _auth_staff(x_briefing_token)
    return {"ok": True, "staff": {"name": s.get("staff_name"), "role": s.get("staff_role")},
            "expires_at": s.get("expires_at").isoformat() if isinstance(s.get("expires_at"), datetime) else s.get("expires_at")}


# ───────────────────────────────────────────────────────────────────────────
# Today's briefing (compact, mobile-friendly)
# ───────────────────────────────────────────────────────────────────────────
def _latest_ready_board(db, date: str) -> Optional[Dict[str, Any]]:
    # Prefer today's board in status ∈ {sent, confirmed, draft-with-approvals}; fall back to most recent.
    b = db.standup_boards.find_one({"date": date}, {"_id": 0})
    if b:
        return b
    # Fall back to most recent up-to-14-days-old
    cutoff = (_now() - timedelta(days=14)).strftime("%Y-%m-%d")
    return db.standup_boards.find_one({"date": {"$gte": cutoff}}, {"_id": 0}, sort=[("date", -1)])


def _compact_sections(board: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Flatten the approved sections of a board into a mobile-friendly list."""
    from routes.daily_standup import SECTION_DEFS
    out: List[Dict[str, Any]] = []
    sections = board.get("sections") or {}
    for s in SECTION_DEFS:
        sid = s["id"]
        sec = sections.get(sid) or {}
        content = sec.get("content")
        approved = bool(sec.get("approved"))
        if content in (None, "", [], {}):
            continue
        out.append({
            "id": sid, "label": s["label"], "dept": s.get("dept"),
            "layout": s.get("default_layout"),
            "approved": approved,
            "content": content,
            "updated_at": sec.get("updated_at"),
        })
    return out


@router.get("/today")
async def today_briefing(x_briefing_token: Optional[str] = Header(None)):
    _auth_staff(x_briefing_token)
    from database import db as _db
    date = _today_key()
    board = _latest_ready_board(_db, date)
    if not board:
        return {"ok": True, "board": None, "message": "No standup posted yet today."}
    return {
        "ok": True,
        "date": board.get("date"),
        "internal_name": board.get("internal_name") or "Daily Briefing",
        "status": board.get("status"),
        "confirmed_by": board.get("confirmed_by"),
        "confirmed_at": board.get("confirmed_at"),
        "sent_at": board.get("sent_at"),
        "sections": _compact_sections(board),
    }


@router.post("/revoke")
async def revoke(token: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.briefing_mobile_tokens.update_one({"token": token}, {"$set": {"active": False, "revoked_at": _iso()}})
    if r.matched_count == 0: raise HTTPException(404, "token not found")
    return {"ok": True, "revoked": True}


# ─── Message template editor ──────────────────────────────────────────────
# Placeholders supported in both SMS and email body:
#   {name}     → staff first name
#   {date}     → YYYY-MM-DD of the briefing
#   {link}     → absolute /m/briefing/<token> URL
#   {subject}  → subject of the standup email (date + property)
DEFAULT_SMS_TEMPLATE = "Luccca · Daily Briefing for {date} is live. Open: {link}"
DEFAULT_EMAIL_SUBJECT_SUFFIX = " · mobile briefing"
DEFAULT_EMAIL_HEADLINE = "Today's standup is live"
DEFAULT_EMAIL_INTRO = "Hi {name}, the morning briefing for {date} is ready on your phone."


class TemplateBody(BaseModel):
    sms_template: Optional[str] = None
    email_subject_suffix: Optional[str] = None
    email_headline: Optional[str] = None
    email_intro: Optional[str] = None


@router.get("/template")
async def get_template(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = _db.briefing_templates.find_one({"id": "default"}, {"_id": 0}) or {}
    return {
        "ok": True,
        "template": {
            "sms_template": doc.get("sms_template") or DEFAULT_SMS_TEMPLATE,
            "email_subject_suffix": doc.get("email_subject_suffix") or DEFAULT_EMAIL_SUBJECT_SUFFIX,
            "email_headline": doc.get("email_headline") or DEFAULT_EMAIL_HEADLINE,
            "email_intro": doc.get("email_intro") or DEFAULT_EMAIL_INTRO,
            "updated_at": doc.get("updated_at"),
            "updated_by": doc.get("updated_by"),
        },
        "placeholders": ["{name}", "{date}", "{link}", "{subject}"],
        "defaults": {
            "sms_template": DEFAULT_SMS_TEMPLATE,
            "email_subject_suffix": DEFAULT_EMAIL_SUBJECT_SUFFIX,
            "email_headline": DEFAULT_EMAIL_HEADLINE,
            "email_intro": DEFAULT_EMAIL_INTRO,
        },
    }


@router.post("/template")
async def update_template(body: TemplateBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    # SMS character budget sanity check
    sms = (body.sms_template or "").strip()
    if sms and len(sms) > 500:
        raise HTTPException(400, "SMS template too long (max 500 chars)")
    # Must contain {link} for the SMS to be actionable
    if sms and "{link}" not in sms:
        raise HTTPException(400, "SMS template must include the {link} placeholder")
    patch: Dict[str, Any] = {"updated_at": _iso()}
    if body.sms_template is not None: patch["sms_template"] = sms or None
    if body.email_subject_suffix is not None: patch["email_subject_suffix"] = body.email_subject_suffix.strip() or None
    if body.email_headline is not None: patch["email_headline"] = body.email_headline.strip() or None
    if body.email_intro is not None: patch["email_intro"] = body.email_intro.strip() or None
    _db.briefing_templates.update_one({"id": "default"}, {"$set": patch, "$setOnInsert": {"id": "default"}}, upsert=True)
    return await get_template(x_admin_token)


@router.post("/template/reset")
async def reset_template(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    _db.briefing_templates.delete_one({"id": "default"})
    return {"ok": True, "reset": True}


# ─── Per-staff delivery preference ────────────────────────────────────────
# Default is "both": email preferred, SMS fallback. Staff can pick email/sms/off.
VALID_PREFS = ("both", "email", "sms", "off")


class PrefBody(BaseModel):
    delivery_preference: str


@router.get("/preference")
async def get_preference(x_briefing_token: Optional[str] = Header(None)):
    s = _auth_staff(x_briefing_token)
    from database import db as _db
    doc = _db.briefing_mobile_tokens.find_one({"token": s.get("token")}, {"_id": 0}) or {}
    pref = doc.get("delivery_preference") or "both"
    return {
        "ok": True,
        "delivery_preference": pref,
        "options": list(VALID_PREFS),
        "staff_name": doc.get("staff_name"),
        "has_email": bool(doc.get("staff_email")),
        "has_phone": bool(doc.get("staff_phone")),
    }


@router.post("/preference")
async def set_preference(body: PrefBody, x_briefing_token: Optional[str] = Header(None)):
    s = _auth_staff(x_briefing_token)
    from database import db as _db
    pref = (body.delivery_preference or "").strip().lower()
    if pref not in VALID_PREFS:
        raise HTTPException(400, f"delivery_preference must be one of {VALID_PREFS}")
    _db.briefing_mobile_tokens.update_one(
        {"token": s.get("token")},
        {"$set": {"delivery_preference": pref, "preference_updated_at": _iso()}}
    )
    return {"ok": True, "delivery_preference": pref}


def _load_template() -> Dict[str, str]:
    """Internal helper used by the standup fan-out."""
    from database import db as _db
    doc = _db.briefing_templates.find_one({"id": "default"}, {"_id": 0}) or {}
    return {
        "sms_template": doc.get("sms_template") or DEFAULT_SMS_TEMPLATE,
        "email_subject_suffix": doc.get("email_subject_suffix") or DEFAULT_EMAIL_SUBJECT_SUFFIX,
        "email_headline": doc.get("email_headline") or DEFAULT_EMAIL_HEADLINE,
        "email_intro": doc.get("email_intro") or DEFAULT_EMAIL_INTRO,
    }


def render_briefing_template(tpl_key: str, *, name: str, date: str, link: str, subject: str) -> str:
    tpl = _load_template()
    raw = tpl.get(tpl_key) or ""
    return (raw
            .replace("{name}", name or "there")
            .replace("{date}", date or "")
            .replace("{link}", link or "")
            .replace("{subject}", subject or ""))


@router.get("/tokens")
async def list_tokens(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.briefing_mobile_tokens.find({}, {"_id": 0}).sort("created_at", -1).limit(100))
    for it in items:
        for k in ("created_at", "expires_at", "revoked_at"):
            v = it.get(k)
            if isinstance(v, datetime): it[k] = v.isoformat()
    return {"ok": True, "total": len(items), "tokens": items}
