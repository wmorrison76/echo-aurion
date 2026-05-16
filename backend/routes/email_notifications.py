"""
Email Notifications Service — SendGrid Integration
====================================================
Sends transactional emails for guest orders, internal alerts, and management reports.
When SENDGRID_API_KEY is not set, logs emails to DB for demo viewing.
Ready to go live when the key is provided.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from database import db

router = APIRouter(prefix="/api/email", tags=["email"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "notifications@luccca.io")


class EmailInput(BaseModel):
    to: str
    subject: str
    body_html: str
    body_text: str = ""
    template_id: str = ""
    category: str = "general"


def _send_email(to: str, subject: str, html: str, text: str = "", category: str = "general"):
    """Send email via SendGrid or log to DB for demo."""
    email_record = {
        "id": f"em-{_uid()}", "to": to, "from": FROM_EMAIL,
        "subject": subject, "body_html": html, "body_text": text,
        "category": category, "status": "pending",
        "created_at": _now(),
    }

    if SENDGRID_API_KEY:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
            message = Mail(
                from_email=Email(FROM_EMAIL),
                to_emails=To(to),
                subject=subject,
                html_content=Content("text/html", html),
            )
            response = sg.client.mail.send.post(request_body=message.get())
            email_record["status"] = "sent" if response.status_code in (200, 202) else "failed"
            email_record["sendgrid_status"] = response.status_code
        except Exception as e:
            email_record["status"] = "failed"
            email_record["error"] = str(e)
    else:
        email_record["status"] = "demo_logged"
        email_record["note"] = "No SENDGRID_API_KEY set. Email logged for demo."

    db["email_log"].insert_one(email_record)
    email_record.pop("_id", None)
    return email_record


def send_order_confirmation(room: str, guest_name: str, order_id: str, total: float, items: list, eta: int):
    """Send order confirmation email to guest (via room folio email or demo log)."""
    items_html = "".join(
        f'<tr><td style="padding:8px 12px;border-bottom:1px solid #e8e4df">{i.get("name","")}</td>'
        f'<td style="padding:8px 12px;border-bottom:1px solid #e8e4df;text-align:center">{i.get("quantity",1)}</td>'
        f'<td style="padding:8px 12px;border-bottom:1px solid #e8e4df;text-align:right">${i.get("price",0):.2f}</td></tr>'
        for i in items
    )

    html = f"""
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;background:#faf9f7;border-radius:12px;overflow:hidden">
      <div style="background:#1a1a2e;padding:24px 32px;text-align:center">
        <div style="font-size:12px;letter-spacing:0.2em;color:#b8860b;text-transform:uppercase;font-weight:600">In-Room Dining</div>
        <h1 style="font-size:22px;color:#fff;margin:8px 0 0;font-weight:300">Order Confirmed</h1>
      </div>
      <div style="padding:24px 32px">
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Dear {guest_name}, your order has been received and is being prepared.</p>
        <div style="background:#fff;border-radius:8px;border:1px solid #e8e4df;overflow:hidden;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f5f3ef">
              <th style="padding:10px 12px;text-align:left;color:#1a1a2e;font-weight:600">Item</th>
              <th style="padding:10px 12px;text-align:center;color:#1a1a2e;font-weight:600">Qty</th>
              <th style="padding:10px 12px;text-align:right;color:#1a1a2e;font-weight:600">Price</th>
            </tr></thead>
            <tbody>{items_html}</tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#6b7280">Order ID</span>
          <span style="font-size:13px;font-family:monospace;color:#1a1a2e">{order_id}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#6b7280">Room</span>
          <span style="font-size:13px;font-weight:600;color:#1a1a2e">{room}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:16px;font-weight:700;color:#1a1a2e">Total</span>
          <span style="font-size:18px;font-weight:700;color:#b8860b">${total:.2f}</span>
        </div>
        <div style="background:#d4edda;border-radius:8px;padding:12px 16px;text-align:center;margin-top:16px">
          <span style="font-size:13px;font-weight:600;color:#2d6a4f">Estimated delivery: {eta} minutes</span>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:20px;text-align:center">Charges will be applied to your room folio. Tax & gratuity added at checkout.</p>
      </div>
    </div>
    """
    return _send_email(
        to=f"room{room}@guest.luccca.io",
        subject=f"Order Confirmed — Room {room} (${total:.2f})",
        html=html,
        category="guest_order_confirmation",
    )


def send_sold_out_alert(item_name: str, item_id: str, ordered: int, available: int):
    """Send internal alert when a menu item sells out."""
    html = f"""
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#c0392b;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;font-size:16px;margin:0">Sold Out Alert</h2>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #e8e4df;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#1a1a2e;margin:0 0 12px"><strong>{item_name}</strong> has sold out.</p>
        <p style="font-size:13px;color:#6b7280">Ordered: {ordered} / Available: {available}</p>
        <p style="font-size:12px;color:#6b7280;margin-top:16px">Reset the count from the IRD Manager dashboard to make this item available again.</p>
      </div>
    </div>
    """
    return _send_email(
        to="ird-manager@luccca.io",
        subject=f"SOLD OUT: {item_name} ({ordered}/{available})",
        html=html,
        category="sold_out_alert",
    )


# ── API Endpoints ──

@router.get("/log")
async def email_log(limit: int = 20, category: Optional[str] = None):
    """View email log (sent + demo-logged emails)."""
    q = {}
    if category:
        q["category"] = category
    emails = list(db["email_log"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    stats = {
        "total": db["email_log"].count_documents({}),
        "sent": db["email_log"].count_documents({"status": "sent"}),
        "demo": db["email_log"].count_documents({"status": "demo_logged"}),
        "failed": db["email_log"].count_documents({"status": "failed"}),
    }
    return {"emails": emails, "stats": stats, "sendgrid_configured": bool(SENDGRID_API_KEY)}


@router.post("/send")
async def send_email_endpoint(data: EmailInput):
    """Send a custom email."""
    result = _send_email(data.to, data.subject, data.body_html, data.body_text, data.category)
    return result


@router.post("/test")
async def send_test_email():
    """Send a test email to verify SendGrid configuration."""
    result = _send_email(
        "admin@luccca.io",
        "LUCCCA Email Test — SendGrid Connected",
        "<h2>Email integration is working!</h2><p>SendGrid is properly configured.</p>",
        category="test",
    )
    return {"result": result, "sendgrid_configured": bool(SENDGRID_API_KEY)}


@router.get("/status")
async def email_status():
    """Check email integration status."""
    return {
        "sendgrid_configured": bool(SENDGRID_API_KEY),
        "from_email": FROM_EMAIL,
        "total_sent": db["email_log"].count_documents({"status": "sent"}),
        "total_demo": db["email_log"].count_documents({"status": "demo_logged"}),
        "message": "SendGrid is configured and ready!" if SENDGRID_API_KEY else "No SENDGRID_API_KEY set. Emails are logged to database for demo. Add key to .env to enable live sending.",
    }
