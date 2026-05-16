"""
Email service wrapper — Resend SDK with graceful no-op fallback.
If RESEND_API_KEY is missing, emails are logged + persisted to email_outbox collection
so the flow stays unblocked and emails can be flushed later when the key is added.
"""
import os
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

_resend = None
if RESEND_API_KEY:
    try:
        import resend as _resend  # type: ignore
        _resend.api_key = RESEND_API_KEY
    except ImportError:
        logger.warning("resend package not installed — install with `pip install resend>=2.0.0`")
        _resend = None


async def send_email(
    to: str,
    subject: str,
    html: str,
    *,
    tags: Optional[List[str]] = None,
    db=None,
) -> dict:
    """Send a transactional email. Always persists an outbox record.

    Returns {status, email_id, reason}.
    """
    outbox_id = uuid.uuid4().hex[:16]
    record = {
        "id": outbox_id,
        "to": to,
        "subject": subject,
        "html": html,
        "tags": tags or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "provider": "resend",
    }

    if not _resend or not RESEND_API_KEY:
        record["status"] = "queued_no_provider"
        record["reason"] = "RESEND_API_KEY not configured — email queued in email_outbox for later delivery"
        if db is not None:
            db.email_outbox.insert_one(record.copy())
        logger.info(f"[email] queued (no key): to={to} subject={subject[:50]}")
        return {"status": "queued", "email_id": outbox_id, "reason": record["reason"]}

    params = {
        "from": SENDER_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(_resend.Emails.send, params)
        record["status"] = "sent"
        record["provider_id"] = result.get("id") if isinstance(result, dict) else str(result)
        if db is not None:
            db.email_outbox.insert_one(record.copy())
        return {"status": "sent", "email_id": record.get("provider_id", outbox_id)}
    except Exception as e:
        record["status"] = "failed"
        record["reason"] = str(e)[:300]
        if db is not None:
            db.email_outbox.insert_one(record.copy())
        logger.error(f"[email] send failed: {e}")
        return {"status": "failed", "email_id": outbox_id, "reason": record["reason"]}


# ─── HTML template helpers ───
def _shell(title: str, body_html: str, cta_url: Optional[str] = None, cta_label: Optional[str] = None) -> str:
    """Minimal inline-CSS email shell (table layout for client compatibility)."""
    cta = ""
    if cta_url and cta_label:
        cta = f"""
        <tr><td style="padding:20px 0 0;">
          <a href="{cta_url}" style="display:inline-block;padding:14px 24px;background:#c8a97e;color:#0b1020;
             text-decoration:none;border-radius:10px;font-weight:700;font-family:system-ui,sans-serif;">
            {cta_label}
          </a>
        </td></tr>"""
    return f"""<!doctype html><html><body style="margin:0;padding:24px;background:#f4f0e8;font-family:system-ui,Georgia,sans-serif;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
      <tr><td style="color:#c8a97e;font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">EchoAi³ · Pastry</td></tr>
      <tr><td style="font-size:28px;color:#0b1020;padding:10px 0 14px;font-family:Georgia,serif;">{title}</td></tr>
      <tr><td style="color:#334155;font-size:15px;line-height:1.6;">{body_html}</td></tr>
      {cta}
      <tr><td style="padding-top:32px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;">
        Sent by EchoAi³. Reply to this email with any questions.
      </td></tr>
    </table>
    </body></html>"""


def tpl_monthly_invoice(bakery_name: str, checkout_url: str) -> tuple[str, str]:
    subject = f"Your EchoAi³ monthly invoice — $49 · {bakery_name}"
    html = _shell(
        title=f"Hi {bakery_name} team,",
        body_html=(
            "<p>Your monthly EchoAi³ Pastry subscription ($49) is due. "
            "Click below to securely pay via Stripe — your studio keeps running without interruption.</p>"
            "<p style='color:#64748b;font-size:13px;'>This link is valid for 24 hours. No auto-charge until you confirm.</p>"
        ),
        cta_url=checkout_url,
        cta_label="Pay $49 securely",
    )
    return subject, html


def tpl_welcome(bakery_name: str) -> tuple[str, str]:
    subject = f"Welcome to EchoAi³, {bakery_name} 🎂"
    html = _shell(
        title=f"You're all set, {bakery_name}.",
        body_html=(
            "<p>Your bakery is activated. Here's what to do first:</p>"
            "<ol style='line-height:1.8;color:#334155;padding-left:20px;'>"
            "<li>Open the <b>3D Cake Designer</b> and build your first cake.</li>"
            "<li>Click <b>Photoreal Render</b> to watch it become magazine-quality.</li>"
            "<li>Save the render to your <b>Gallery</b>, then send it to a client.</li>"
            "</ol>"
            "<p style='color:#64748b;font-size:13px;'>Next bill: $49 in 30 days.</p>"
        ),
        cta_url="https://cfo-toolkit-deploy.preview.emergentagent.com/",
        cta_label="Enter the Studio",
    )
    return subject, html


def tpl_assignment(assignee: str, title: str, detail: str, deep_link: str) -> tuple[str, str]:
    subject = f"Assigned to you: {title}"
    html = _shell(
        title=f"Hi {assignee},",
        body_html=(
            f"<p>You've been assigned:</p>"
            f"<p style='padding:14px 16px;background:#f8fafc;border-left:3px solid #c8a97e;border-radius:4px;'>"
            f"<b>{title}</b><br><span style='color:#64748b;font-size:14px;'>{detail}</span></p>"
        ),
        cta_url=deep_link,
        cta_label="Open task",
    )
    return subject, html
