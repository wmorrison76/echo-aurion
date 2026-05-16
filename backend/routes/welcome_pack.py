"""
iter175 · Welcome Pack PDF Generator

Claude composes a personalized 1-page arrival guide per VIP guest. Pulls:
  - guest VIP tier + preferences from concierge_guests
  - outlet hours + reservations required
  - today's lifestyle activations
  - anniversary/birthday/celebration notes

Returns both HTML (for preview) and a print-ready PDF (via reportlab fallback).

Routes under `/api/welcome-pack/*`.
"""
import os
import uuid
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/welcome-pack", tags=["welcome-pack"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _render_welcome_html(guest: Dict[str, Any], today_outlets: List[Dict[str, Any]],
                         today_activations: List[Dict[str, Any]], ai_note: str = "") -> str:
    name = guest.get("display_name") or guest.get("name") or "Valued Guest"
    room = guest.get("room") or "—"
    tier = (guest.get("vip_tier") or "standard").upper()
    prefs = guest.get("preferences") or {}
    pillow = prefs.get("pillow_preference") or "—"
    allergies = prefs.get("allergies") or []
    dining = prefs.get("dining_style") or "—"
    celebration = prefs.get("celebration") or guest.get("celebration")

    outlets_html = "".join(
        f'<tr><td style="padding:8px 0;font-family:Georgia,serif;color:#0f172a;font-weight:600">{o["outlet"]}</td><td style="padding:8px 12px;color:#64748b;font-size:12px">{o.get("type","")}</td><td style="padding:8px 0;text-align:right;color:#c8a97e;font-family:monospace;font-size:13px">{o.get("today_hours","—")}</td></tr>'
        for o in today_outlets[:10]
    ) or '<tr><td colspan="3" style="padding:12px 0;color:#94a3b8;font-style:italic">Outlet hours will be delivered separately.</td></tr>'

    acts_html = "".join(
        f'<li style="padding:6px 0;border-bottom:1px solid #f0ede3"><span style="color:#c8a97e;font-family:monospace;margin-right:8px">{a.get("time","—")}</span><strong style="color:#0f172a">{a.get("name","")}</strong><span style="color:#64748b;margin-left:6px;font-size:12px">{a.get("outlet","")}</span></li>'
        for a in today_activations[:8]
    ) or '<li style="color:#94a3b8;font-style:italic">No resort activations scheduled for today.</li>'

    allergy_block = f'<div style="padding:10px 14px;background:#fff4f0;border-left:3px solid #f97316;margin:12px 0"><strong style="color:#9a3412;font-family:Georgia,serif">Dietary note:</strong> <span style="color:#431407">Allergies flagged — {", ".join(allergies)}. Kitchen has been notified.</span></div>' if allergies else ""
    celeb_block = f'<div style="padding:12px 14px;background:#fef6e4;border-left:3px solid #c8a97e;margin:12px 0"><strong style="color:#c8a97e;font-family:Georgia,serif">Occasion:</strong> <span style="color:#0f172a">{celebration}. We have small touches prepared for you.</span></div>' if celebration else ""
    ai_block = f'<div style="padding:16px;background:#faf8f2;border-radius:4px;margin:18px 0;font-style:italic;color:#334155;font-family:Georgia,serif;line-height:1.6">{ai_note}</div>' if ai_note else ""

    return f"""
<html><body style="margin:0;padding:0;background:#f7f5ef;font-family:Georgia,'Times New Roman',serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;padding:40px 20px">
  <tr><td align="center">
    <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-top:4px solid #c8a97e;border-bottom:4px solid #c8a97e">
      <tr><td style="padding:36px 48px 20px">
        <div style="font-size:10px;letter-spacing:4px;color:#c8a97e;font-weight:700;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">Pier SIXTY-SIX · Welcome Pack</div>
        <h1 style="font-family:Georgia,serif;font-size:32px;line-height:1.1;color:#0f172a;margin:12px 0 4px">Welcome, {name}.</h1>
        <div style="color:#64748b;font-size:13px">Room {room} · {tier} guest · {datetime.now(timezone.utc).strftime('%B %d, %Y')}</div>
        <div style="height:1px;background:#c8a97e;width:60px;margin:16px 0"></div>
        {ai_block}
        {celeb_block}
        {allergy_block}
      </td></tr>
      <tr><td style="padding:0 48px 18px">
        <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;font-weight:700;text-transform:uppercase;margin-bottom:8px;font-family:'Helvetica Neue',Arial,sans-serif">Your preferences</div>
        <div style="font-size:13px;color:#0f172a;line-height:1.7"><strong>Pillow:</strong> {pillow} &nbsp;&nbsp;<strong>Dining:</strong> {dining}</div>
      </td></tr>
      <tr><td style="padding:10px 48px 18px">
        <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;font-weight:700;text-transform:uppercase;margin-bottom:8px;font-family:'Helvetica Neue',Arial,sans-serif">Outlets today</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{outlets_html}</table>
      </td></tr>
      <tr><td style="padding:10px 48px 36px">
        <div style="font-size:10px;letter-spacing:3px;color:#c8a97e;font-weight:700;text-transform:uppercase;margin-bottom:8px;font-family:'Helvetica Neue',Arial,sans-serif">Today's resort experiences</div>
        <ul style="list-style:none;padding:0;margin:0">{acts_html}</ul>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:11px;font-style:italic;font-family:'Helvetica Neue',Arial,sans-serif">Your Concierge team stands ready — dial 0 from your room or text +1-555-WELCOME.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


async def _ai_note(guest: Dict[str, Any]) -> str:
    """Ask Claude for a single warm sentence tailored to the guest's stay."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
        if not key: return ""
        prompt = (
            f"Write ONE warm, hospitable sentence (<= 40 words) welcoming a guest in the voice of a Pier SIXTY-SIX luxury resort. "
            f"Guest name: {guest.get('display_name') or guest.get('name')}. "
            f"VIP tier: {guest.get('vip_tier') or 'standard'}. "
            f"Celebration: {(guest.get('preferences') or {}).get('celebration') or 'none'}. "
            "Avoid cliches, no emoji, no greeting like 'Dear'. Just the sentence."
        )
        chat = LlmChat(api_key=key, session_id=f"welcome-{guest.get('id','x')}",
                       system_message="You write concise, refined hospitality copy.").with_model("anthropic", "claude-sonnet-4-5-20250929")
        res = await chat.send_message(UserMessage(text=prompt))
        return (res or "").strip().strip('"')
    except Exception as e:
        return ""


@router.get("/preview/{guest_id}")
async def preview(guest_id: str, include_ai_note: bool = True):
    from database import db as _db
    # Lookup from concierge_guests (v2) first, fallback to guests
    g = _db.concierge_guests.find_one({"id": guest_id}, {"_id": 0}) or _db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not g: raise HTTPException(404, "guest not found")
    # Gather today context
    from routes.hours_of_operation import hours_today as _hrs
    hres = await _hrs()
    outlets = hres.get("outlets", [])
    from routes.lifestyle_dashboard import today as _life_today
    lres = await _life_today()
    activations = lres.get("activities", [])
    ai_note = await _ai_note(g) if include_ai_note else ""
    html = _render_welcome_html(g, outlets, activations, ai_note)
    return {"ok": True, "html": html, "ai_note": ai_note, "guest_id": guest_id}


@router.get("/pdf/{guest_id}")
async def pdf(guest_id: str):
    """Return a minimal PDF representation (reportlab). Fallback to HTML if lib missing."""
    prev = await preview(guest_id, include_ai_note=True)
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
    except ImportError:
        from fastapi.responses import HTMLResponse
        return HTMLResponse(prev["html"])
    from database import db as _db
    g = _db.concierge_guests.find_one({"id": guest_id}, {"_id": 0}) or _db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not g: raise HTTPException(404, "guest not found")
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    w, h = letter
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(0.78, 0.66, 0.49)
    c.drawString(48, h - 48, "PIER SIXTY-SIX  ·  WELCOME PACK")
    c.setFont("Times-Roman", 22)
    c.setFillColorRGB(0.06, 0.09, 0.16)
    c.drawString(48, h - 80, f"Welcome, {g.get('display_name') or g.get('name','Guest')}")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.4, 0.45, 0.53)
    c.drawString(48, h - 98, f"Room {g.get('room','—')} · {(g.get('vip_tier') or 'standard').upper()} · {datetime.now(timezone.utc).strftime('%B %d, %Y')}")
    c.line(48, h - 106, 108, h - 106)

    y = h - 140
    if prev.get("ai_note"):
        c.setFont("Times-Italic", 11)
        c.setFillColorRGB(0.2, 0.24, 0.33)
        c.drawString(48, y, prev["ai_note"][:110])
        y -= 22

    c.setFont("Helvetica-Bold", 8)
    c.setFillColorRGB(0.78, 0.66, 0.49)
    c.drawString(48, y, "OUTLETS TODAY")
    y -= 16
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    from routes.hours_of_operation import hours_today as _hrs
    hres = await _hrs()
    for o in (hres.get("outlets", []) or [])[:8]:
        c.drawString(48, y, f"{o['outlet']}")
        c.drawRightString(w - 48, y, f"{o.get('today_hours','—')}")
        y -= 14
    y -= 10

    c.setFont("Helvetica-Bold", 8)
    c.setFillColorRGB(0.78, 0.66, 0.49)
    c.drawString(48, y, "TODAY'S RESORT EXPERIENCES")
    y -= 16
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    from routes.lifestyle_dashboard import today as _life_today
    lres = await _life_today()
    for a in (lres.get("activities", []) or [])[:8]:
        c.drawString(48, y, f"{a.get('time','—')}  ·  {a.get('name','')}")
        c.drawRightString(w - 48, y, f"{a.get('outlet','')}")
        y -= 14

    c.setFont("Helvetica-Oblique", 8)
    c.setFillColorRGB(0.58, 0.64, 0.72)
    c.drawString(48, 40, "Your Concierge team stands ready — dial 0 or text +1-555-WELCOME.")
    c.save()
    buf.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"inline; filename=welcome-{guest_id}.pdf"})
