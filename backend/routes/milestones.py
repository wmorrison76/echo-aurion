"""
iter175 · Milestone Recognition Service

Sends branded recognition emails (Resend) and exposes per-employee feed
(consumed by the Schedule App for in-app recognition banners).

Milestones covered: birthday · work anniversary · promotion anniversary.

Design principles:
  - Same Georgia/gold brand language as the Sailing Yacht email
  - Inline CSS only (email-client friendly)
  - Dry-run safe: if RESEND_API_KEY missing, returns rendered HTML + status=dry-run
  - Idempotent per-day: each milestone fires once per day per employee

Routes under `/api/milestones/*`.
"""
import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/milestones", tags=["milestones"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


# ─── Brand HTML ─────────────────────────────────────────────────────────────
def _render_milestone_html(kind: str, name: str, detail: str, extra: str = "") -> str:
    """Render Pier SIXTY-SIX brand milestone card. Inline CSS. Email-safe tables."""
    icon = {"birthday": "🎂", "anniversary": "🏅", "promotion": "⭐"}.get(kind, "🎉")
    headline = {"birthday": f"Happy Birthday, {name}",
                "anniversary": f"Congratulations, {name}",
                "promotion": f"Well Earned, {name}"}.get(kind, f"Celebrating {name}")
    sub = {"birthday": "From the entire team — wishing you a joy-filled day.",
           "anniversary": "Your dedication shapes this property every day.",
           "promotion": "Your impact made this milestone inevitable."}.get(kind, "")
    return f"""
<html><body style="margin:0;padding:0;background:#f7f5ef;font-family:Georgia,'Times New Roman',serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;padding:40px 20px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #c8a97e;border-bottom:4px solid #c8a97e">
      <tr><td style="padding:40px 48px 24px;text-align:center">
        <div style="font-size:11px;letter-spacing:4px;color:#c8a97e;font-weight:700;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">Pier SIXTY-SIX · Recognition</div>
        <div style="font-size:64px;margin:24px 0 8px">{icon}</div>
        <h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.1;color:#0f172a;margin:0 0 12px">{headline}</h1>
        <div style="height:1px;background:#c8a97e;width:60px;margin:16px auto"></div>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 16px">{sub}</p>
      </td></tr>
      <tr><td style="padding:8px 48px 40px;text-align:center">
        <div style="padding:20px 24px;background:#faf8f2;border-left:3px solid #c8a97e;text-align:left;font-size:14px;line-height:1.6;color:#0f172a">
          <strong style="display:block;font-size:10px;letter-spacing:2px;color:#c8a97e;font-weight:700;text-transform:uppercase;margin-bottom:6px;font-family:'Helvetica Neue',Arial,sans-serif">Today's milestone</strong>
          {detail}
        </div>
        {f'<p style="font-size:13px;color:#64748b;margin:22px 16px 0;line-height:1.6">{extra}</p>' if extra else ''}
        <p style="font-size:11px;color:#94a3b8;margin:32px 16px 0;font-style:italic;font-family:'Helvetica Neue',Arial,sans-serif">Sent with care from LUCCCA · People Services</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


# ─── Celebrations discovery ────────────────────────────────────────────────
def _collect_milestones_for(date_iso: str) -> List[Dict[str, Any]]:
    from database import db as _db
    try:
        d = datetime.strptime(date_iso, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    md = d.strftime("%m-%d")
    yyyy = d.year

    out: List[Dict[str, Any]] = []
    for e in _db.employees.find({"active": True}, {"_id": 0}):
        emp_id = e["id"]
        name = e.get("display_name") or f"{e.get('first_name','')} {(e.get('last_name','') or '')[:1]}."
        # Birthday
        if e.get("birthday") and e["birthday"].endswith(md):
            out.append({"employee_id": emp_id, "kind": "birthday", "name": name,
                        "email": e.get("email"), "department": e.get("department"),
                        "title": e.get("title"), "detail": "A birthday worth celebrating."})
        # Anniversary
        hd = e.get("hire_date") or ""
        if len(hd) >= 10 and hd[5:10] == md:
            try:
                yrs = yyyy - int(hd[:4])
                if yrs > 0:
                    out.append({"employee_id": emp_id, "kind": "anniversary", "name": name,
                                "email": e.get("email"), "department": e.get("department"),
                                "title": e.get("title"), "years": yrs,
                                "detail": f"{yrs} year{'s' if yrs != 1 else ''} with the property.",
                                "extra": f"Hired {hd}"})
            except ValueError:
                pass
        # Promotion anniversary
        for p in (e.get("promotion_history") or []):
            pd = p.get("date") or ""
            if len(pd) >= 10 and pd[5:10] == md:
                try:
                    yrs = yyyy - int(pd[:4])
                    if yrs > 0:
                        detail = f"{yrs} year{'s' if yrs != 1 else ''} ago today you were promoted to <strong>{p.get('to_title')}</strong>."
                        out.append({"employee_id": emp_id, "kind": "promotion", "name": name,
                                    "email": e.get("email"), "department": e.get("department"),
                                    "title": e.get("title"), "years": yrs,
                                    "to_title": p.get("to_title"), "from_title": p.get("from_title"),
                                    "detail": detail, "extra": p.get("note") or ""})
                except ValueError:
                    pass
    return out


# ─── Send (Resend, graceful degrade) ───────────────────────────────────────
class SendRequest(BaseModel):
    date: Optional[str] = None
    dry_run: bool = False
    include_director: bool = True


async def _resend_send(to: List[str], subject: str, html: str) -> Dict[str, Any]:
    """Calls Resend or returns dry-run payload. Non-blocking."""
    key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip() or "onboarding@resend.dev"
    if not key:
        return {"status": "dry-run", "note": "RESEND_API_KEY not set; no email dispatched", "to": to, "subject": subject}
    try:
        import resend
        resend.api_key = key
        params = {"from": sender, "to": to, "subject": subject, "html": html}
        res = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "email_id": (res or {}).get("id"), "to": to, "subject": subject}
    except Exception as e:
        logger.exception("resend send failed")
        return {"status": "error", "error": str(e)[:200], "to": to, "subject": subject}


@router.post("/send-today")
async def send_today(body: SendRequest, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    date_iso = body.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from database import db as _db
    milestones = _collect_milestones_for(date_iso)
    results: List[Dict[str, Any]] = []
    for m in milestones:
        # Idempotent guard: if we've already sent today, skip
        key = f"{m['employee_id']}:{m['kind']}:{date_iso}"
        already = _db.milestone_sends.find_one({"key": key}, {"_id": 0})
        if already and not body.dry_run:
            results.append({"key": key, "skipped": True, "reason": "already sent today"})
            continue

        subject = {"birthday": f"🎂 Happy Birthday, {m['name']}",
                   "anniversary": f"🏅 {m.get('years','')} Year Anniversary — Thank You",
                   "promotion": f"⭐ Promotion Milestone — {m['name']}"}.get(m["kind"], "A milestone today")
        html = _render_milestone_html(m["kind"], m["name"], m["detail"], m.get("extra", ""))
        recipients = [m["email"]] if m.get("email") else []

        # Optional cc the director of the employee's department
        if body.include_director and m.get("department"):
            director = _db.employees.find_one({"department": m["department"], "role": "director", "active": True},
                                              {"_id": 0, "email": 1})
            if director and director.get("email") and director["email"] not in recipients:
                recipients.append(director["email"])

        if body.dry_run or not recipients:
            dispatch = {"status": "dry-run", "to": recipients, "subject": subject,
                        "note": "dry-run requested" if body.dry_run else "no recipient email on file"}
        else:
            dispatch = await _resend_send(recipients, subject, html)

        record = {"key": key, "date": date_iso, "employee_id": m["employee_id"],
                  "kind": m["kind"], "name": m["name"], "subject": subject,
                  "dispatch": dispatch, "created_at": _now_iso()}
        if dispatch.get("status") == "sent":
            _db.milestone_sends.insert_one(record.copy())
        results.append({"key": key, **dispatch, "name": m["name"], "kind": m["kind"]})

    return {"ok": True, "date": date_iso, "total": len(milestones), "results": results}


# ─── Feed (powers Schedule App's in-app recognition banner) ────────────────
@router.get("/feed/{employee_id}")
async def feed(employee_id: str, date_iso: Optional[str] = None):
    """Returns ANY milestones for this employee on a given date (today by default).
    Consumed by the employee Schedule App to show a celebration banner."""
    date_iso = date_iso or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_milestones = _collect_milestones_for(date_iso)
    mine = [m for m in all_milestones if m["employee_id"] == employee_id]
    # Summary text for a mobile banner
    banner = None
    if mine:
        m = mine[0]  # first milestone wins the banner
        banner = {"birthday": f"🎂 Happy Birthday, {m['name']}!",
                  "anniversary": f"🏅 {m.get('years','')} year anniversary today",
                  "promotion": f"⭐ {m.get('years','')} years since your promotion"}.get(m["kind"])
    return {"ok": True, "date": date_iso, "employee_id": employee_id, "milestones": mine, "banner": banner}


@router.get("/preview")
async def preview(kind: str = "birthday", name: str = "Sample Employee",
                   detail: str = "A milestone preview.", extra: str = ""):
    """Renders the HTML preview without sending (useful for design review)."""
    return {"ok": True, "kind": kind, "html": _render_milestone_html(kind, name, detail, extra)}


@router.get("/log")
async def log_sent(days: int = 30):
    from database import db as _db
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    items = list(_db.milestone_sends.find({"created_at": {"$gte": since}}, {"_id": 0})
                 .sort("created_at", -1).limit(500))
    return {"ok": True, "total": len(items), "sends": items}
