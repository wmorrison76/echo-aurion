"""
iter170 · Daily Standup Board (internal name "The Sailing Yacht" or customizable).

Aggregates every department's morning input into one briefing, lets Front Office
confirm + lock, and distributes via email. Also ingests inbound PDFs (arrivals,
departures, in-house, events, prior standups) to auto-fill the board.

Routes under `/api/standup/*`.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/standup", tags=["daily-standup"])


# ─── Section schema (14 canonical sections based on real briefing) ──────────
SECTION_DEFS: List[Dict[str, Any]] = [
    {"id": "ops_numbers",    "label": "Operational Numbers",   "dept": "front-office", "default_layout": "ops_grid"},
    {"id": "vip_arrivals",   "label": "VIP Arrivals",          "dept": "guest-services", "default_layout": "guest_list"},
    {"id": "vips_in_house",  "label": "VIPs In-House",         "dept": "guest-services", "default_layout": "guest_list"},
    {"id": "gss_goals",      "label": "GSS Goals & Positioning", "dept": "quality", "default_layout": "kpi_grid"},
    {"id": "top_areas",      "label": "Top Areas of Opportunity", "dept": "quality", "default_layout": "topic_list"},
    {"id": "glitches",       "label": "Glitch Guests to Flag", "dept": "guest-services", "default_layout": "guest_list"},
    {"id": "showrooms",      "label": "Showrooms",             "dept": "housekeeping", "default_layout": "room_list"},
    {"id": "fb_covers",      "label": "F&B Covers",            "dept": "fb", "default_layout": "covers_grid"},
    {"id": "leadership",     "label": "Leadership on Duty",    "dept": "front-office", "default_layout": "duty_grid"},
    {"id": "people_services","label": "People Services · Recognition", "dept": "people-services", "default_layout": "free_text"},
    {"id": "hours",          "label": "Hours of Operation",    "dept": "fb", "default_layout": "hours_grid"},
    {"id": "groups",         "label": "Groups In-House",       "dept": "sales", "default_layout": "group_list"},
    {"id": "site_visits",    "label": "Site Visits",           "dept": "sales", "default_layout": "free_text"},
    {"id": "activities",     "label": "Resort Activities",     "dept": "activities", "default_layout": "schedule_list"},
]


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_board(date: str) -> Dict[str, Any]:
    """Lazily create a board for a date if none exists."""
    from database import db as _db
    existing = _db.standup_boards.find_one({"date": date}, {"_id": 0})
    if existing:
        return existing
    board = {
        "id": uuid.uuid4().hex[:12],
        "date": date,
        "internal_name": "The Sailing Yacht",
        "status": "draft",  # draft | confirmed | sent
        "confirmed_by": None,
        "confirmed_at": None,
        "sent_at": None,
        "sections": {s["id"]: {"content": None, "autofilled": False, "edited_by": None, "updated_at": None, "approved": False} for s in SECTION_DEFS},
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    _db.standup_boards.insert_one(board.copy())
    return board


# ─── Get / Create a board for a date ────────────────────────────────────────
@router.get("/today")
async def get_today_board():
    date = _today_iso()
    b = _ensure_board(date)
    return {"ok": True, "board": b, "sections_def": SECTION_DEFS}


@router.get("/date/{date}")
async def get_date_board(date: str):
    b = _ensure_board(date)
    return {"ok": True, "board": b, "sections_def": SECTION_DEFS}


# ─── Edit a single section ──────────────────────────────────────────────────
class SectionUpdate(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    section_id: str
    content: Any  # structured payload specific to the section type
    edited_by: Optional[str] = "concierge"


@router.post("/section")
async def update_section(body: SectionUpdate):
    from database import db as _db
    valid_ids = {s["id"] for s in SECTION_DEFS}
    if body.section_id not in valid_ids:
        raise HTTPException(400, f"unknown section id: {body.section_id}")
    b = _ensure_board(body.date)
    if b.get("status") == "sent":
        raise HTTPException(400, "Board already sent — create a new board to edit")
    _db.standup_boards.update_one(
        {"date": body.date},
        {"$set": {
            f"sections.{body.section_id}.content": body.content,
            f"sections.{body.section_id}.edited_by": body.edited_by,
            f"sections.{body.section_id}.updated_at": _now_iso(),
            f"sections.{body.section_id}.approved": False,
            "updated_at": _now_iso(),
        }}
    )
    return {"ok": True, "board": _db.standup_boards.find_one({"date": body.date}, {"_id": 0})}


class SectionApprove(BaseModel):
    date: str
    section_id: str
    approved_by: str = "front-office"


@router.post("/section/approve")
async def approve_section(body: SectionApprove):
    from database import db as _db
    _ensure_board(body.date)
    _db.standup_boards.update_one(
        {"date": body.date},
        {"$set": {
            f"sections.{body.section_id}.approved": True,
            f"sections.{body.section_id}.approved_by": body.approved_by,
            "updated_at": _now_iso(),
        }}
    )
    return {"ok": True, "board": _db.standup_boards.find_one({"date": body.date}, {"_id": 0})}


# ─── Auto-fill from existing OS collections ────────────────────────────────
@router.post("/autofill")
async def autofill(date: str = Form(...)):
    """Pulls live data from other collections to auto-populate sections."""
    from database import db as _db
    b = _ensure_board(date)
    autofilled: List[str] = []

    # 1. VIP In-House from EchoConcierge v2 guests (anyone with vip_tier != standard)
    try:
        from routes.echo_concierge_v2 import SEED_GUESTS
        vips = [{"name": g["name"], "room": g["room"], "tier": g["vip_tier"]}
                for g in SEED_GUESTS if g["vip_tier"] not in ("standard",)]
        if vips:
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.vips_in_house.content": {"guests": vips},
                "sections.vips_in_house.autofilled": True,
                "sections.vips_in_house.edited_by": "echo-autofill",
                "sections.vips_in_house.updated_at": _now_iso(),
            }})
            autofilled.append("vips_in_house")
    except Exception as e:
        print(f"[standup autofill vip error] {e}")

    # 2. Hours of Operation from concierge outlets
    try:
        outlets = list(_db.concierge_outlets.find({}, {"_id": 0}))
        if outlets:
            rows = [{"outlet": o["name"], "type": o.get("type"), "today_hours": o.get("hours", {}).get(_weekday_key(date), "—"),
                     "phone": o.get("phone"), "reservations_required": o.get("reservations_required", False)}
                    for o in outlets]
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.hours.content": {"outlets": rows},
                "sections.hours.autofilled": True,
                "sections.hours.edited_by": "echo-autofill",
                "sections.hours.updated_at": _now_iso(),
            }})
            autofilled.append("hours")
    except Exception as e:
        print(f"[standup autofill hours error] {e}")

    # 3. Events of the day from events collection
    try:
        day_events = []
        for e in _db.events.find({}, {"_id": 0}).limit(300):
            ed = (e.get("event_date") or e.get("start_date") or e.get("date") or "")[:10]
            if ed == date:
                day_events.append({
                    "name": e.get("title") or e.get("name") or e.get("event_name") or "Event",
                    "time": e.get("start_time") or "",
                    "outlet": e.get("outlet") or e.get("venue"),
                    "guests": e.get("guest_count"),
                })
        # Merge Lifestyle activations into the same activities section (iter173)
        try:
            from routes.lifestyle_dashboard import today as _life_today
            life_res = await _life_today(date_iso=date)
            for a in (life_res.get("activities") or []):
                day_events.append({"name": a["name"], "time": a["time"], "outlet": a.get("outlet"), "source": "lifestyle"})
        except Exception as e2:
            print(f"[standup autofill lifestyle merge err] {e2}")
        if day_events:
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.activities.content": {"activities": day_events},
                "sections.activities.autofilled": True,
                "sections.activities.edited_by": "echo-autofill",
                "sections.activities.updated_at": _now_iso(),
            }})
            autofilled.append("activities")
    except Exception as e:
        print(f"[standup autofill activities error] {e}")

    # 4. Glitches from concierge recovery cases (open only, last 24h)
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        cases = list(_db.concierge_recovery_cases.find(
            {"status": "open", "created_at": {"$gte": cutoff}}, {"_id": 0}
        ).limit(20))
        if cases:
            rows = [{"name": c.get("guest_name"), "room": c.get("room"),
                     "issue": c.get("description"), "severity": c.get("severity")}
                    for c in cases]
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.glitches.content": {"guests": rows},
                "sections.glitches.autofilled": True,
                "sections.glitches.edited_by": "echo-autofill",
                "sections.glitches.updated_at": _now_iso(),
            }})
            autofilled.append("glitches")
    except Exception as e:
        print(f"[standup autofill glitches error] {e}")

    # 5. People Services · birthdays + work anniversaries + promotions from employee directory (iter173-174)
    try:
        from routes.people import celebrations_today as _celeb
        celeb = await _celeb(date_iso=date)
        bdays = celeb.get("birthdays") or []
        annivs = celeb.get("anniversaries") or []
        promos = celeb.get("promotions") or []
        if bdays or annivs or promos:
            lines: List[str] = []
            if bdays:
                names = ", ".join(f"{b['name']} ({b.get('department') or ''})" for b in bdays)
                lines.append(f"🎂 Birthdays today: {names}")
            if annivs:
                names = ", ".join(f"{a['name']} · {a['years']}yr" for a in annivs)
                lines.append(f"🏅 Work anniversaries: {names}")
            if promos:
                names = ", ".join(f"{p['name']} · promoted to {p.get('to_title')} ({p['years']}yr ago)" for p in promos)
                lines.append(f"⭐ Promotion anniversaries: {names}")
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.people_services.content": "\n".join(lines),
                "sections.people_services.autofilled": True,
                "sections.people_services.edited_by": "echo-autofill",
                "sections.people_services.updated_at": _now_iso(),
            }})
            autofilled.append("people_services")
    except Exception as e:
        print(f"[standup autofill people_services error] {e}")

    # 6. Leadership on Duty from leadership_coverage (iter173)
    try:
        coverage = list(_db.leadership_coverage.find({"date": date}, {"_id": 0}))
        if coverage:
            by_dept: Dict[str, List[str]] = {}
            for c in coverage:
                key = c.get("department", "other")
                by_dept.setdefault(key, []).append(f"{c.get('employee_name') or '—'} ({c.get('shift', '')})")
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.leadership.content": {"by_department": by_dept},
                "sections.leadership.autofilled": True,
                "sections.leadership.edited_by": "echo-autofill",
                "sections.leadership.updated_at": _now_iso(),
            }})
            autofilled.append("leadership")
    except Exception as e:
        print(f"[standup autofill leadership error] {e}")

    # 7. Hours of Operation from new hours_of_operation module (overrides old concierge_outlets fallback above if present) (iter173)
    try:
        from routes.hours_of_operation import hours_today as _hrs
        hres = await _hrs(date_iso=date)
        rows = hres.get("outlets") or []
        if rows:
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.hours.content": {"outlets": rows},
                "sections.hours.autofilled": True,
                "sections.hours.edited_by": "echo-autofill",
                "sections.hours.updated_at": _now_iso(),
            }})
            if "hours" not in autofilled: autofilled.append("hours")
    except Exception as e:
        print(f"[standup autofill hours-v2 error] {e}")

    # 8. Showrooms from showrooms module (iter173 Phase 4)
    try:
        from routes.showrooms import today_for_standup as _sr
        sres = await _sr(date_iso=date)
        rows = sres.get("rows") or []
        if rows:
            _db.standup_boards.update_one({"date": date}, {"$set": {
                "sections.showrooms.content": {"rooms": rows},
                "sections.showrooms.autofilled": True,
                "sections.showrooms.edited_by": "echo-autofill",
                "sections.showrooms.updated_at": _now_iso(),
            }})
            autofilled.append("showrooms")
    except Exception as e:
        print(f"[standup autofill showrooms error] {e}")

    return {"ok": True, "autofilled_sections": autofilled,
            "board": _db.standup_boards.find_one({"date": date}, {"_id": 0})}


def _weekday_key(date_str: str) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][d.weekday()]
    except Exception:
        return "mon"


# ─── Publish / Send ─────────────────────────────────────────────────────────
class PublishRequest(BaseModel):
    date: str
    confirmed_by: str = "front-office"


@router.post("/publish")
async def publish_board(body: PublishRequest):
    from database import db as _db
    b = _ensure_board(body.date)
    _db.standup_boards.update_one({"date": body.date}, {"$set": {
        "status": "confirmed",
        "confirmed_by": body.confirmed_by,
        "confirmed_at": _now_iso(),
        "updated_at": _now_iso(),
    }})
    return {"ok": True, "board": _db.standup_boards.find_one({"date": body.date}, {"_id": 0})}


class SendRequest(BaseModel):
    date: str
    to: List[str] = Field(default_factory=list, description="Optional override recipient list")
    subject_prefix: Optional[str] = None


@router.post("/send")
async def send_board(body: SendRequest):
    """Distribute the confirmed board via email. Uses Resend if configured, else returns a dry-run payload."""
    from database import db as _db
    b = _ensure_board(body.date)
    if b.get("status") not in ("confirmed", "sent"):
        raise HTTPException(400, "Board must be confirmed before sending. Call /publish first.")

    recipients = body.to or list(filter(None, (os.environ.get("STANDUP_DEFAULT_RECIPIENTS") or "").split(",")))
    subject = (body.subject_prefix or b.get("internal_name") or "Daily Standup") + f" · {body.date}"

    html = _render_board_html(b)

    resend_key = os.environ.get("RESEND_API_KEY")
    dry_run = not resend_key or not recipients
    send_status = "dry-run" if dry_run else "queued"

    if not dry_run:
        try:
            import resend  # type: ignore
            resend.api_key = resend_key
            from_addr = os.environ.get("RESEND_FROM") or "standup@echoai3.local"
            resend.Emails.send({"from": from_addr, "to": recipients, "subject": subject, "html": html})
            send_status = "sent"
        except Exception as e:
            send_status = f"failed: {str(e)[:120]}"

    _db.standup_boards.update_one({"date": body.date}, {"$set": {
        "status": "sent" if send_status == "sent" else "confirmed",
        "sent_at": _now_iso() if send_status == "sent" else None,
        "last_send_status": send_status,
        "last_send_recipients": recipients,
        "updated_at": _now_iso(),
    }})

    # iter186 · fan out mobile-briefing push notifications to every active token holder
    mobile_push = _fan_out_mobile_briefing(_db, body.date, subject)

    # iter194 · FM-Upgrade 1 — standup.sent TimelineEvent
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import STANDUP_SENT
        _tl(STANDUP_SENT,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=[{"kind": "standup", "id": body.date}],
            payload={"subject": subject, "recipients": recipients, "dry_run": dry_run,
                     "mobile_push": mobile_push, "send_status": send_status},
            idempotency_key=f"standup.sent:{body.date}:{_now_iso()[:16]}")
    except Exception: pass

    return {"ok": True, "status": send_status, "recipients": recipients, "dry_run": dry_run,
            "subject": subject, "html_preview_bytes": len(html),
            "mobile_push": mobile_push}


def _fan_out_mobile_briefing(_db, date: str, subject: str) -> Dict[str, Any]:
    """Notify every active /m/briefing/:token holder that a fresh standup is live."""
    now = datetime.now(timezone.utc)
    tokens = list(_db.briefing_mobile_tokens.find(
        {"active": True, "$or": [{"expires_at": {"$gt": now}}, {"expires_at": None}]},
        {"_id": 0}
    ).limit(500))
    base = (os.environ.get("PUBLIC_BASE_URL") or "").rstrip("/")
    resend_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("RESEND_FROM") or os.environ.get("SENDER_EMAIL") or "briefing@echoai3.local"
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_from = os.environ.get("TWILIO_FROM_NUMBER")
    # iter188 · load admin-editable message template
    from routes.daily_briefing_mobile import render_briefing_template  # local import to avoid cycles
    delivered, queued, failed, sms_sent = 0, 0, 0, 0
    for t in tokens:
        # iter189 · honor per-staff delivery preference
        pref = (t.get("delivery_preference") or "both").lower()
        if pref == "off":
            # Staff opted out entirely — skip, don't log a push record
            continue
        link = f"{base}/m/briefing/{t.get('token')}" if base else f"/m/briefing/{t.get('token')}"
        name_first = ((t.get("staff_name") or "there").split(" ") or ["there"])[0]
        rec = {
            "staff_name": t.get("staff_name"),
            "staff_email": t.get("staff_email"),
            "staff_phone": t.get("staff_phone"),
            "token": t.get("token"),
            "url": link,
            "date": date,
            "subject": subject,
            "created_at": _now_iso(),
            "status": "queued",
            "channel": "none",
            "preference": pref,
        }
        # Decide channel based on preference
        try_email = pref in ("both", "email")
        try_sms = pref in ("both", "sms")
        # Prefer email (when allowed), fall back to SMS when email unavailable / disallowed
        if try_email and resend_key and t.get("staff_email"):
            try:
                import resend  # type: ignore
                resend.api_key = resend_key
                headline = render_briefing_template("email_headline", name=name_first, date=date, link=link, subject=subject)
                intro = render_briefing_template("email_intro", name=name_first, date=date, link=link, subject=subject)
                subj_suffix = render_briefing_template("email_subject_suffix", name=name_first, date=date, link=link, subject=subject)
                html = f"""<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                    <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;text-transform:uppercase;font-weight:700">Luccca · Daily Briefing</div>
                    <h1 style="font-size:28px;font-weight:200;margin:10px 0 6px">{headline}</h1>
                    <p style="font-size:14px;color:#555">{intro}</p>
                    <p><a href="{link}" style="display:inline-block;background:linear-gradient(90deg,#c8a97e,#e9d5a5);color:#0a0e1a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:12px">Open briefing →</a></p>
                    <p style="font-size:11px;color:#888;margin-top:24px">Tap the link to view today's operational numbers, VIP arrivals, leadership on duty, and more.</p>
                </div>"""
                resend.Emails.send({"from": sender, "to": [t["staff_email"]], "subject": f"{subject}{subj_suffix}", "html": html})
                rec["status"] = "delivered"; rec["channel"] = "email"
                delivered += 1
            except Exception as e:
                rec["status"] = f"failed: {str(e)[:100]}"
                failed += 1
        elif try_sms and twilio_sid and twilio_token and twilio_from and t.get("staff_phone"):
            try:
                from twilio.rest import Client as _TwClient  # type: ignore
                sms_body = render_briefing_template("sms_template", name=name_first, date=date, link=link, subject=subject)
                sms = _TwClient(twilio_sid, twilio_token).messages.create(
                    to=t["staff_phone"], from_=twilio_from, body=sms_body,
                )
                rec["status"] = "delivered"; rec["channel"] = "sms"; rec["sms_sid"] = sms.sid
                delivered += 1; sms_sent += 1
            except Exception as e:
                rec["status"] = f"sms_failed: {str(e)[:100]}"
                failed += 1
        else:
            # Queue for later delivery (no channel configured / no contact on file / preference incompatible)
            queued += 1
        _db.briefing_push_log.insert_one(rec.copy())
        # iter192 · also fan-out to registered native devices (APNs/FCM) for this staff token
        try:
            from routes.push_native import send_push_to_staff as _send_push
            _send_push(
                staff_token=t.get("token"),
                title=f"Daily Briefing · {date}",
                body=subject[:120],
                link=link,
            )
        except Exception:
            pass
        # Also drop into the shared email_outbox as a unified queue
        try:
            _db.email_outbox.insert_one({
                "to": t.get("staff_email") or t.get("staff_phone") or "__push_only__",
                "subject": f"{subject} · mobile briefing",
                "body_preview": link,
                "kind": "mobile_briefing",
                "channel": rec["channel"],
                "status": rec["status"],
                "token": t.get("token"),
                "created_at": _now_iso(),
            })
        except Exception:
            pass
    return {"total_tokens": len(tokens), "delivered": delivered, "queued": queued,
            "failed": failed, "sms_sent": sms_sent}


def _render_board_html(board: Dict[str, Any]) -> str:
    """Polished Sailing-Yacht-styled HTML briefing. Matches William's aesthetic."""
    date_str = board.get("date", "")
    try:
        formatted_date = datetime.strptime(date_str, "%Y-%m-%d").strftime("%A · %B %d, %Y")
    except Exception:
        formatted_date = date_str
    label_by_id = {s["id"]: s["label"] for s in SECTION_DEFS}
    dept_by_id = {s["id"]: s["dept"] for s in SECTION_DEFS}
    order = [s["id"] for s in SECTION_DEFS]

    rows: List[str] = []
    for sid in order:
        sec = (board.get("sections") or {}).get(sid, {})
        content = sec.get("content")
        if not content: continue
        label = label_by_id.get(sid, sid)
        dept = dept_by_id.get(sid, "")
        rows.append(_render_section_html(sid, label, dept, content, sec.get("approved", False)))

    body = "\n".join(rows) or "<p style='color:#94a3b8;font-style:italic;text-align:center;padding:40px'>No sections populated for this briefing.</p>"

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{board.get('internal_name') or 'Daily Standup'} · {date_str}</title></head>
<body style="margin:0;padding:28px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:820px;margin:0 auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,0.12)">
    <div style="background:linear-gradient(135deg,#0b1220 0%,#1a2540 100%);padding:32px 36px;color:#f8fafc">
      <div style="font-size:10px;letter-spacing:4px;color:#c8a97e;font-weight:700;text-transform:uppercase;margin-bottom:6px">EchoAi³ · Morning Briefing</div>
      <h1 style="font-family:Georgia,'Playfair Display',serif;margin:0;font-size:32px;color:#f8fafc;font-weight:400;letter-spacing:-0.5px">
        {board.get('internal_name') or 'Daily Standup'}
      </h1>
      <div style="margin-top:8px;color:#cbd5e1;font-size:14px;font-style:italic">{formatted_date}</div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(200,169,126,0.25);font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase">
        Confirmed by {board.get('confirmed_by') or '—'} · Distribution: Front Office
      </div>
    </div>
    <div style="padding:32px 36px">
      {body}
    </div>
    <div style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
      <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;font-weight:700;text-transform:uppercase">EchoAi³</div>
      <div style="margin-top:4px;font-size:11px;color:#94a3b8">Auto-filled from live OS data · Front Office reviewed · Delivered via EchoAi³</div>
    </div>
  </div>
</body></html>"""


def _render_section_html(sid: str, label: str, dept: str, content: Any, approved: bool) -> str:
    """Render one section. Smart templates for known shapes, fallback to list/JSON."""
    dept_colors = {
        "front-office": "#c8a97e", "guest-services": "#38bdf8", "quality": "#a78bfa",
        "housekeeping": "#22c55e", "fb": "#d97706", "people-services": "#ec4899",
        "sales": "#ea580c", "activities": "#0891b2",
    }
    color = dept_colors.get(dept, "#64748b")
    approved_mark = "<span style='margin-left:10px;font-size:9px;letter-spacing:1px;color:#22c55e;font-weight:700'>✓ APPROVED</span>" if approved else ""

    inner = ""
    try:
        # Guest list (VIPs, glitches)
        if isinstance(content, dict) and isinstance(content.get("guests"), list):
            rows = []
            for g in content["guests"][:30]:
                name = g.get("name", "—")
                room = g.get("room", "")
                tier = g.get("tier")
                issue = g.get("issue")
                tier_html = f"<span style='color:{color};font-weight:600;font-size:11px;margin-left:8px;text-transform:uppercase;letter-spacing:1px'>{tier}</span>" if tier else ""
                issue_html = f"<div style='color:#dc2626;font-size:12px;margin-top:2px'>⚠ {issue}</div>" if issue else ""
                rows.append(f"<li style='padding:8px 0;border-bottom:1px solid #f1f5f9'><div><strong>{name}</strong> <span style='color:#94a3b8;font-size:12px'>· room {room}</span>{tier_html}</div>{issue_html}</li>")
            inner = f"<ul style='list-style:none;padding:0;margin:0'>{''.join(rows)}</ul>"
        # Hours grid (outlets)
        elif isinstance(content, dict) and isinstance(content.get("outlets"), list):
            rows = []
            for o in content["outlets"]:
                rows.append(f"<tr><td style='padding:8px 0;font-weight:600'>{o.get('outlet','—')}</td><td style='padding:8px 8px;color:#64748b;font-size:12px'>{o.get('type','')}</td><td style='padding:8px 0;color:{color};font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;text-align:right'>{o.get('today_hours','—')}</td></tr>")
            inner = f"<table style='width:100%;border-collapse:collapse'><tbody>{''.join(rows)}</tbody></table>"
        # Activities schedule
        elif isinstance(content, dict) and isinstance(content.get("activities"), list):
            rows = []
            for a in content["activities"]:
                rows.append(f"<li style='padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;gap:14px;align-items:baseline'><span style='color:{color};font-family:ui-monospace,monospace;font-size:12px;min-width:68px;font-weight:600'>{a.get('time','—')}</span><span style='flex:1'>{a.get('name','')}</span><span style='color:#94a3b8;font-size:11px'>{a.get('outlet','')}</span></li>")
            inner = f"<ul style='list-style:none;padding:0;margin:0'>{''.join(rows)}</ul>"
        # Ops numbers
        elif isinstance(content, dict) and any(k in content for k in ("arrivals", "departures", "occ_pct", "adr")):
            cells = []
            for k, l in [("arrivals", "Arrivals"), ("departures", "Departures"), ("occ_pct", "Occupancy %"), ("adr", "ADR $")]:
                if k in content:
                    cells.append(f"<div style='flex:1;min-width:120px;padding:12px;background:#f8fafc;border-radius:8px;border-left:3px solid {color}'><div style='font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:600'>{l}</div><div style='font-size:22px;color:#0f172a;font-weight:700;margin-top:4px'>{content[k]}</div></div>")
            inner = f"<div style='display:flex;gap:8px;flex-wrap:wrap'>{''.join(cells)}</div>"
        # Leadership by department (iter173)
        elif isinstance(content, dict) and isinstance(content.get("by_department"), dict):
            cells = []
            for dept_name, people in content["by_department"].items():
                lines = "".join(f"<li style='padding:3px 0;font-size:13px'>{p}</li>" for p in people)
                cells.append(f"<div style='padding:10px 14px;background:#f8fafc;border-left:3px solid {color};border-radius:6px;min-width:180px;flex:1'><div style='font-size:10px;letter-spacing:2px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px'>{dept_name.replace('-', ' ')}</div><ul style='list-style:none;padding:0;margin:0;color:#0f172a'>{lines}</ul></div>")
            inner = f"<div style='display:flex;gap:8px;flex-wrap:wrap'>{''.join(cells)}</div>"
        # Showrooms list (iter173)
        elif isinstance(content, dict) and isinstance(content.get("rooms"), list):
            rows = []
            for r in content["rooms"]:
                status_color = {"approved": "#22c55e", "pending-approval": "#fbbf24", "designated": "#94a3b8", "in-prep": "#fbbf24"}.get(r.get("status"), "#94a3b8")
                status_label = (r.get("status") or "—").upper()
                approver = f" · approved by {r.get('approved_by')}" if r.get("approved_by") else ""
                rows.append(f"<tr><td style='padding:8px 0;font-weight:600'>Room {r.get('room','—')}</td><td style='padding:8px 8px;color:#64748b;font-size:12px'>{r.get('room_type') or ''}</td><td style='padding:8px 8px;color:#334155;font-size:12px'>{r.get('purpose','—')} · {r.get('window','—')}</td><td style='padding:8px 0;text-align:right'><span style='color:{status_color};font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase'>{status_label}</span>{approver}</td></tr>")
            inner = f"<table style='width:100%;border-collapse:collapse'><tbody>{''.join(rows)}</tbody></table>"
        # Plain string
        elif isinstance(content, str):
            inner = f"<p style='margin:0;line-height:1.6;color:#334155'>{content}</p>"
        # Fallback
        else:
            import json as _j
            inner = f"<pre style='font-family:ui-monospace,monospace;font-size:12px;color:#475569;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:0;white-space:pre-wrap;word-wrap:break-word'>{_j.dumps(content, indent=2)[:2500]}</pre>"
    except Exception as e:
        inner = f"<p style='color:#dc2626;font-size:12px'>Render error: {e}</p>"

    return f"""<section style='margin-bottom:28px'>
  <h2 style="font-family:Georgia,serif;font-weight:400;font-size:18px;color:{color};margin:0 0 10px 0;padding-bottom:8px;border-bottom:2px solid {color};letter-spacing:-0.3px">
    {label}{approved_mark}
  </h2>
  <div style="color:#334155;font-size:14px">{inner}</div>
</section>"""


# ─── PDF ingest ─────────────────────────────────────────────────────────────
@router.post("/ingest")
async def ingest_pdf(date: str = Form(...), section_hint: str = Form("auto"), file: UploadFile = File(...)):
    """Upload a PDF (arrivals, departures, in-house, events, prior standup). Stores the raw
    bytes + a best-effort text extraction for the Front Office to review. Does NOT auto-merge
    into sections yet — keeps humans in the loop.
    """
    from database import db as _db
    data = await file.read()
    if not data: raise HTTPException(400, "empty file")
    # Best-effort text extraction (try pdfminer if available, else skip)
    text = ""
    try:
        from pdfminer.high_level import extract_text  # type: ignore
        import io as _io
        text = extract_text(_io.BytesIO(data)) or ""
    except Exception as e:
        text = f"[text extraction skipped: {e}]"
    rec = {
        "id": uuid.uuid4().hex[:12],
        "date": date,
        "filename": file.filename,
        "size": len(data),
        "section_hint": section_hint,
        "text_excerpt": text[:8000],
        "ingested_at": _now_iso(),
    }
    _db.standup_ingested_pdfs.insert_one(rec.copy())
    return {"ok": True, "ingest_id": rec["id"], "filename": rec["filename"],
            "size": rec["size"], "text_chars": len(text)}


@router.get("/ingested")
async def list_ingested(date: str):
    from database import db as _db
    items = list(_db.standup_ingested_pdfs.find({"date": date}, {"_id": 0, "text_excerpt": 0}).sort("ingested_at", -1))
    return {"ok": True, "total": len(items), "ingested": items}


# ─── PDF → section proposal (LLM) ──────────────────────────────────────────
MERGE_SYSTEM_PROMPT = """You are the EchoAi³ standup ingest parser. Given the raw text of a hotel operational PDF
(Arrivals, Departures, In-House, Daily Events Report, or prior Sailing Yacht standup), extract structured content
and propose which standup sections to populate.

Canonical standup section IDs:
  ops_numbers, vip_arrivals, vips_in_house, gss_goals, top_areas, glitches, showrooms,
  fb_covers, leadership, people_services, hours, groups, site_visits, activities

Return a single JSON object (no prose, no markdown fences):
{
  "proposed_sections": [
    {
      "section_id": "<one of the canonical IDs>",
      "content": <structured payload — for VIP lists use {"guests":[{"name","room","tier"}]}; for ops numbers use {"arrivals":N,"departures":N,"occ_pct":N,"adr":N}; for events use {"activities":[{"time","name","outlet"}]}; for hours use {"outlets":[{"outlet","today_hours","type"}]}>,
      "confidence": 0.0-1.0,
      "rationale": "<one sentence why this mapping>"
    }
  ],
  "unmapped_notes": "<OPTIONAL short summary of anything you saw but couldn't cleanly map>"
}

Rules:
- Only propose sections you're ≥0.6 confident about.
- Prefer fewer high-quality mappings over many speculative ones.
- Strip page headers / footers / report titles from content.
- For names, preserve exact spelling.
- Never fabricate data — if a number isn't in the text, leave it out."""


@router.post("/ingest/{ingest_id}/propose")
async def propose_from_pdf(ingest_id: str):
    """Run Claude on an ingested PDF's text and return proposed section mergers.
    Front Office reviews each proposal before accepting into the board."""
    from database import db as _db
    import re, json as jsonlib
    rec = _db.standup_ingested_pdfs.find_one({"id": ingest_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "ingest not found")
    text = rec.get("text_excerpt") or ""
    if len(text) < 50: raise HTTPException(400, "text too short to propose merges")

    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key: raise HTTPException(503, "EMERGENT_LLM_KEY not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise HTTPException(503, f"emergentintegrations not installed: {e}")

    session_id = f"standup-ingest-{ingest_id}"
    chat = LlmChat(api_key=key, session_id=session_id, system_message=MERGE_SYSTEM_PROMPT).with_model(
        "anthropic", "claude-sonnet-4-5-20250929")
    ctx = f"FILENAME: {rec.get('filename')}\nSECTION HINT: {rec.get('section_hint','auto')}\n\n=== RAW TEXT ===\n{text[:7000]}"
    try:
        raw = await chat.send_message(UserMessage(text=ctx))
    except Exception as e:
        raise HTTPException(502, f"LLM failed: {str(e)[:140]}")

    txt = (raw or "").strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\n?", "", txt); txt = re.sub(r"\n?```$", "", txt)
    m = re.search(r"(\{.*\})", txt, flags=re.DOTALL)
    parsed: Dict[str, Any] = {}
    if m:
        try: parsed = jsonlib.loads(m.group(1))
        except jsonlib.JSONDecodeError: pass
    if not parsed:
        parsed = {"proposed_sections": [], "unmapped_notes": "Parser couldn't extract structured content."}

    _db.standup_ingested_pdfs.update_one({"id": ingest_id}, {"$set": {"proposal": parsed, "proposed_at": _now_iso()}})
    return {"ok": True, "ingest_id": ingest_id, "proposal": parsed}


class AcceptMerge(BaseModel):
    date: str
    ingest_id: str
    section_ids: List[str] = Field(default_factory=list, description="Which proposed sections to accept; empty = accept all")


@router.post("/ingest/accept")
async def accept_merge(body: AcceptMerge):
    """Merge accepted proposed sections into the board."""
    from database import db as _db
    rec = _db.standup_ingested_pdfs.find_one({"id": body.ingest_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "ingest not found")
    proposal = rec.get("proposal")
    if not proposal: raise HTTPException(400, "call /propose first")

    _ensure_board(body.date)  # guarantee board exists before merging

    proposed = proposal.get("proposed_sections") or []
    merged: List[str] = []
    for p in proposed:
        sid = p.get("section_id")
        if not sid: continue
        if body.section_ids and sid not in body.section_ids: continue
        content = p.get("content")
        _db.standup_boards.update_one({"date": body.date}, {"$set": {
            f"sections.{sid}.content": content,
            f"sections.{sid}.autofilled": True,
            f"sections.{sid}.edited_by": f"pdf-ingest({rec.get('filename','')})",
            f"sections.{sid}.updated_at": _now_iso(),
            f"sections.{sid}.approved": False,
            "updated_at": _now_iso(),
        }})
        merged.append(sid)
    return {"ok": True, "merged_sections": merged, "board": _db.standup_boards.find_one({"date": body.date}, {"_id": 0})}
