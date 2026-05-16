"""
Custom Cake Orders
==================
Per-cake unique order handling with:
  - Deterministic alphanumeric order number
    format:  CK-{INIT}-{YYMMDD}-{CHECKSUM}
    Where INIT = first + last customer initials (2 chars, uppercase, padded X),
    YYMMDD = pickup date, CHECKSUM = 3-char hash derived from customer+date+nonce.
  - Quote email generation + send via Resend (optional — gracefully queues to
    an outbox if no RESEND_API_KEY is configured).
  - POS handoff queue: every created order is enqueued to `pos_outbound` so a
    future Micros/Toast adapter can drain it without changing this API surface.
  - Optional Stripe deposit link (uses STRIPE_API_KEY already in env).
"""
import os
import hashlib
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

from database import db

load_dotenv()

router = APIRouter(prefix="/api/cake-orders", tags=["cake-orders"])
logger = logging.getLogger("cake_orders")

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip()
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "").strip()
BRAND_NAME = os.environ.get("BRAND_NAME", "LUCCCA Pastry").strip()

_resend_available = False
try:
    if RESEND_API_KEY:
        import resend
        resend.api_key = RESEND_API_KEY
        _resend_available = True
except Exception as e:
    logger.warning(f"Resend init failed: {e}")

_stripe_available = False
try:
    if STRIPE_API_KEY:
        import stripe
        stripe.api_key = STRIPE_API_KEY
        _stripe_available = True
except Exception as e:
    logger.warning(f"Stripe init failed: {e}")


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class TierSpec(BaseModel):
    tier: int
    shape: Optional[str] = "round"
    diameter: Optional[float] = 8
    height: Optional[float] = 4
    flavor: Optional[str] = None
    filling: Optional[str] = None
    frosting_style: Optional[str] = None
    servings: Optional[int] = None

class Costing(BaseModel):
    food_cost: float = 0
    labor_hours: float = 0
    labor_cost: float = 0
    total_cost: float = 0
    suggested_price: float = 0
    per_serving: float = 0

class ClientInfo(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class CakeOrderCreate(BaseModel):
    design_name: str = Field(..., description="Cake design name")
    version: Optional[str] = "V001"
    client: ClientInfo
    pickup_date: str = Field(..., description="Pickup date YYYY-MM-DD")
    pickup_time: Optional[str] = "10:00"
    tiers: List[TierSpec] = []
    decorations: List[str] = []
    total_servings: int = 0
    costing: Optional[Costing] = None
    notes: Optional[str] = ""
    deposit_amount: Optional[float] = None  # USD
    send_email: bool = True
    create_deposit_link: bool = False


# ─────────────────────────────────────────────
# Order number generator
# ─────────────────────────────────────────────
def _initials(name: str) -> str:
    parts = [p for p in (name or "").strip().split() if p]
    if not parts:
        return "XX"
    if len(parts) == 1:
        c = parts[0][0].upper() if parts[0] else "X"
        return (c + "X").upper()
    return (parts[0][0] + parts[-1][0]).upper()

def _pickup_yymmdd(pickup_iso: str) -> str:
    try:
        d = datetime.fromisoformat(pickup_iso.replace("Z", "+00:00")) if "T" in pickup_iso else datetime.strptime(pickup_iso, "%Y-%m-%d")
        return d.strftime("%y%m%d")
    except Exception:
        return datetime.now().strftime("%y%m%d")

_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I to avoid confusion
def _checksum(parts: list) -> str:
    seed = "|".join(str(p) for p in parts)
    h = hashlib.sha256(seed.encode()).digest()
    out = []
    for i in range(3):
        out.append(_ALPHA[h[i] % len(_ALPHA)])
    return "".join(out)

def generate_order_number(customer_name: str, pickup_date_iso: str) -> str:
    """CK-JM-260425-A7K — guaranteed unique by checking collection."""
    init = _initials(customer_name)
    yymmdd = _pickup_yymmdd(pickup_date_iso)
    # Try up to 10 salts to guarantee uniqueness in the collection
    for attempt in range(10):
        salt = uuid4().hex[:6]
        cs = _checksum([customer_name, pickup_date_iso, salt, attempt])
        order_no = f"CK-{init}-{yymmdd}-{cs}"
        if db["cake_orders"].find_one({"order_number": order_no}) is None:
            return order_no
    # Fallback — extremely unlikely
    return f"CK-{init}-{yymmdd}-{uuid4().hex[:4].upper()}"


# ─────────────────────────────────────────────
# Email template
# ─────────────────────────────────────────────
def build_quote_email_html(order: dict) -> str:
    tiers_html = "".join(
        f"""
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;font-size:12px;color:#333;">
            Tier {t.get('tier')}
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;font-size:12px;color:#333;">
            {t.get('diameter','')}" {t.get('shape','')}
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;font-size:12px;color:#333;">
            {t.get('flavor','—')}
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;font-size:12px;color:#333;">
            {t.get('filling','—')}
          </td>
        </tr>
        """
        for t in (order.get("tiers") or [])
    )
    decorations = ", ".join(order.get("decorations") or []) or "—"
    price = order.get("costing", {}).get("suggested_price", 0)
    deposit_block = ""
    if order.get("deposit_link"):
        deposit_block = f"""
        <tr><td style="padding:18px 20px;">
          <a href="{order['deposit_link']}"
             style="display:inline-block;padding:12px 24px;background:#c8a97e;color:#0b1020;
                    text-decoration:none;border-radius:6px;font-family:Inter,Arial,sans-serif;
                    font-size:13px;font-weight:600;letter-spacing:0.02em;">
            Pay Deposit (${order.get('deposit_amount', 0):.2f})
          </a>
        </td></tr>"""
    notes_html = ""
    if order.get("notes"):
        notes_html = f"""
        <tr><td style="padding:10px 20px;font-family:Inter,Arial,sans-serif;font-size:12px;color:#555;">
          <strong>Notes:</strong> {order['notes']}
        </td></tr>"""

    pickup_str = order.get("pickup_date", "")
    if order.get("pickup_time"):
        pickup_str += f" at {order['pickup_time']}"

    return f"""<!doctype html>
<html><body style="margin:0;background:#f5f4f0;padding:20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
       style="width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;
              box-shadow:0 2px 10px rgba(0,0,0,0.05);font-family:Inter,Arial,sans-serif;">
  <tr>
    <td style="padding:24px 20px;background:#0b1020;color:#c8a97e;">
      <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;opacity:0.7;">
        {BRAND_NAME} · Custom Cake Quote
      </div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;letter-spacing:-0.01em;color:#fff;">
        {order.get('design_name','Custom Cake')}
      </div>
      <div style="font-size:11px;margin-top:6px;opacity:0.75;font-family:'IBM Plex Mono',monospace;">
        Order # {order.get('order_number')}
      </div>
    </td>
  </tr>

  <tr><td style="padding:20px 20px 8px 20px;">
    <div style="font-size:11px;color:#888;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px;">For</div>
    <div style="font-size:15px;color:#0b1020;font-weight:600;">{order.get('client',{}).get('name','')}</div>
    <div style="font-size:11px;color:#666;margin-top:10px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:2px;">Pickup</div>
    <div style="font-size:14px;color:#0b1020;font-weight:500;">{pickup_str}</div>
  </td></tr>

  <tr><td style="padding:8px 20px 0 20px;">
    <div style="font-size:11px;color:#888;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">Design</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Tier</th>
        <th style="text-align:left;padding:6px 10px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Size</th>
        <th style="text-align:left;padding:6px 10px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Flavor</th>
        <th style="text-align:left;padding:6px 10px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Filling</th>
      </tr></thead>
      <tbody>{tiers_html}</tbody>
    </table>
  </td></tr>

  <tr><td style="padding:14px 20px 4px 20px;">
    <div style="font-size:11px;color:#888;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px;">Decorations & Finishing</div>
    <div style="font-size:13px;color:#333;">{decorations}</div>
  </td></tr>

  <tr><td style="padding:16px 20px;border-top:1px solid #eee;margin-top:8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td style="font-size:12px;color:#666;">Total servings</td>
        <td style="text-align:right;font-size:13px;color:#0b1020;font-weight:600;">{order.get('total_servings',0)}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#0b1020;font-weight:600;padding-top:10px;">Quote</td>
        <td style="text-align:right;font-size:22px;color:#c8a97e;font-weight:700;padding-top:10px;">${price:,.2f}</td>
      </tr>
    </table>
  </td></tr>

  {deposit_block}
  {notes_html}

  <tr><td style="padding:18px 20px;background:#fbfaf7;border-top:1px solid #eee;
                 font-family:Inter,Arial,sans-serif;font-size:11px;color:#777;line-height:1.6;">
    Reply to this email to confirm your order or request changes.
    A 50% deposit secures your pickup slot. Quotes are valid for 14 days.
    <br/><br/>
    — {BRAND_NAME}
  </td></tr>
</table>
</body></html>
"""


# ─────────────────────────────────────────────
# Stripe deposit link (optional)
# ─────────────────────────────────────────────
def create_stripe_deposit_link(order_number: str, client_name: str, amount_usd: float) -> Optional[str]:
    if not _stripe_available:
        return None
    try:
        import stripe
        # Create a Product + Price + Payment Link for this one-off deposit
        product = stripe.Product.create(name=f"Cake Deposit · {order_number}", metadata={"order_number": order_number})
        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(round(amount_usd * 100)),
            currency="usd",
        )
        pl = stripe.PaymentLink.create(
            line_items=[{"price": price.id, "quantity": 1}],
            metadata={"order_number": order_number, "client": client_name, "kind": "cake_deposit"},
        )
        return pl.url
    except Exception as e:
        logger.error(f"Stripe deposit link failed: {e}")
        return None


# ─────────────────────────────────────────────
# POS outbox
# ─────────────────────────────────────────────
def enqueue_pos_outbound(order: dict):
    payload = {
        "id": f"pos-{uuid4().hex[:8]}",
        "order_number": order.get("order_number"),
        "kind": "cake_order",
        "amount": order.get("costing", {}).get("suggested_price", 0),
        "client_name": order.get("client", {}).get("name"),
        "pickup_date": order.get("pickup_date"),
        "payload": order,
        "status": "pending",
        "attempts": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "delivered_at": None,
    }
    db["pos_outbound"].insert_one({**payload})
    payload.pop("_id", None)
    return payload


# ─────────────────────────────────────────────
# API
# ─────────────────────────────────────────────
@router.post("/")
async def create_cake_order(body: CakeOrderCreate):
    order_no = generate_order_number(body.client.name, body.pickup_date)

    costing_obj = body.costing.dict() if body.costing else {}
    deposit_amt = body.deposit_amount or round((costing_obj.get("suggested_price", 0) or 0) * 0.5, 2)
    order: dict = {
        "id": f"order-{uuid4().hex[:10]}",
        "order_number": order_no,
        "design_name": body.design_name,
        "version": body.version,
        "client": body.client.dict(),
        "pickup_date": body.pickup_date,
        "pickup_time": body.pickup_time,
        "tiers": [t.dict() for t in body.tiers],
        "decorations": body.decorations,
        "total_servings": body.total_servings,
        "costing": costing_obj,
        "notes": body.notes or "",
        "deposit_amount": deposit_amt,
        "deposit_link": None,
        "email_status": "pending",
        "email_id": None,
        "pos_status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "quoted",
    }

    # Stripe deposit link
    if body.create_deposit_link and deposit_amt > 0 and _stripe_available:
        link = create_stripe_deposit_link(order_no, body.client.name, deposit_amt)
        if link:
            order["deposit_link"] = link

    # POS outbox
    pos_item = enqueue_pos_outbound(order)

    # Auto-create Dashboard production reminder (closes the loop so the banner
    # counts down to the pickup day).
    try:
        reminder = {
            "id": f"sched-{uuid4().hex[:8]}",
            "kind": "cake",
            "priority": "high" if (order.get("costing", {}).get("suggested_price", 0) or 0) > 500 else "medium",
            "title": f"{order['design_name']} — {order['client']['name']}",
            "client_name": order["client"].get("name"),
            "client_phone": order["client"].get("phone"),
            "due_date": f"{order['pickup_date']}T{order.get('pickup_time', '10:00')}:00+00:00",
            "delivery_time": order.get("pickup_time"),
            "venue": order.get("notes", "")[:80] if order.get("notes") else "Pickup",
            "beo_id": order["order_number"],
            "beo_link": f"/cake-orders/{order['order_number']}",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Pastry Lead",
            "flavor_profile": [
                {"tier": t.get("tier"), "flavor": t.get("flavor"), "filling": t.get("filling")}
                for t in order.get("tiers", [])
            ],
            "decorations": order.get("decorations", []),
            "dietary_notes": order.get("notes", ""),
            "prep_stage": "booked",
            "status": "pending",
            "acknowledged": False,
            "acknowledged_at": None,
            "acknowledged_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source_order_number": order["order_number"],
        }
        db["pastry_production_reminders"].insert_one({**reminder})
        order["reminder_id"] = reminder["id"]
    except Exception as e:
        logger.warning(f"Failed to create reminder from order: {e}")
        order["reminder_id"] = None

    # Email
    html = build_quote_email_html(order)
    if body.send_email and body.client.email:
        if _resend_available:
            try:
                import resend
                params = {
                    "from": SENDER_EMAIL,
                    "to": [str(body.client.email)],
                    "subject": f"{BRAND_NAME} · Cake Order Quote · {order_no}",
                    "html": html,
                }
                result = await asyncio.to_thread(resend.Emails.send, params)
                order["email_status"] = "sent"
                order["email_id"] = (result or {}).get("id")
            except Exception as e:
                logger.error(f"Resend send failed: {e}")
                order["email_status"] = "failed"
                order["email_error"] = str(e)
                _queue_outbox(order, html)
        else:
            order["email_status"] = "queued"
            _queue_outbox(order, html)

    db["cake_orders"].insert_one({**order})
    order.pop("_id", None)
    return {
        "success": True,
        "order": order,
        "email_preview_html": html,
        "pos_outbound_id": pos_item["id"],
    }


def _queue_outbox(order: dict, html: str):
    db["email_outbox"].insert_one({
        "id": f"mail-{uuid4().hex[:8]}",
        "order_number": order.get("order_number"),
        "to": order.get("client", {}).get("email"),
        "subject": f"{BRAND_NAME} · Cake Order Quote · {order.get('order_number')}",
        "html": html,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/")
async def list_orders(status: Optional[str] = None, limit: int = 50):
    q = {} if not status else {"status": status}
    items = list(db["cake_orders"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"orders": items, "total": len(items)}


@router.get("/{order_number}")
async def get_order(order_number: str):
    o = db["cake_orders"].find_one({"order_number": order_number}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@router.get("/pos/outbound")
async def pos_outbound_queue(status: str = "pending", limit: int = 50):
    items = list(db["pos_outbound"].find({"status": status}, {"_id": 0}).sort("created_at", 1).limit(limit))
    return {"items": items, "total": len(items)}


@router.post("/pos/outbound/{item_id}/mark-delivered")
async def mark_pos_delivered(item_id: str):
    res = db["pos_outbound"].update_one(
        {"id": item_id},
        {"$set": {"status": "delivered", "delivered_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"success": True}


@router.get("/email/outbox")
async def email_outbox(status: str = "queued", limit: int = 50):
    items = list(db["email_outbox"].find({"status": status}, {"_id": 0}).sort("created_at", 1).limit(limit))
    return {"items": items, "total": len(items), "resend_configured": _resend_available}


@router.get("/preview/sample")
async def preview_sample():
    """Render a sample quote email without persisting. Used for the frontend preview."""
    sample = {
        "order_number": generate_order_number("Jane Morrison", datetime.now().strftime("%Y-%m-%d")),
        "design_name": "Morrison Wedding · 3-Tier Champagne",
        "client": {"name": "Jane Morrison", "email": "jane@example.com"},
        "pickup_date": datetime.now().strftime("%Y-%m-%d"),
        "pickup_time": "15:00",
        "tiers": [
            {"tier": 1, "diameter": 12, "shape": "round", "flavor": "Champagne", "filling": "Swiss Meringue"},
            {"tier": 2, "diameter": 9, "shape": "round", "flavor": "Vanilla Bean", "filling": "Lemon Curd"},
            {"tier": 3, "diameter": 6, "shape": "round", "flavor": "Almond", "filling": "Raspberry Jam"},
        ],
        "decorations": ["Cascading Roses", "Gold Leaf", "Pearl Cluster"],
        "total_servings": 85,
        "costing": {"suggested_price": 845.00},
        "deposit_amount": 422.50,
        "deposit_link": None,
        "notes": "Nut-free kitchen required.",
    }
    return {"order": sample, "html": build_quote_email_html(sample)}


@router.get("/config/status")
async def config_status():
    return {
        "resend_configured": _resend_available,
        "stripe_configured": _stripe_available,
        "sender_email": SENDER_EMAIL,
        "brand_name": BRAND_NAME,
    }
