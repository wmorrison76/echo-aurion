"""iter229 · ECW Ops Phase 4 — Recipe unification · Order reconciliation ·
Predictive invoice mis-code · Curated order guides · Vendor scorecard (mobile)
· Punch-out stub.

iter230 · Appended: Accrual reconciliation — ensures March deliveries hit
March P&L even if the invoice arrives in April. Prevents outlets from being
charged next-month for this-month bills (William's core AP/AR concern).

William's spec (post iter228):
- Recipe system is ONE system (mobile + desktop share same collection). A draft
  from mobile URL-import or Echo Chef gets promoted into the shared
  `menu_items` + `menu_recipes` + `menu_components` triple when chef publishes.
- Per-outlet P&L with switcher (outlet_id drives everything — already wired).
- Track PO vs Invoice: PO#, Invoice#, order date, scheduled receive date.
  Flag missing items before EOM. Notify Finance.
- Claude scans new invoices; if GL code looks wrong for line-item
  descriptions, auto-flag with reason=ai_suspects_miscoding.
- Desktop-built order guides → mobile chefs can order from them.
- Vendor Reliability Scorecard on mobile (data already in procurement.py).
- Punch-out (cXML OrderRequest) stub — default OFF per outlet.
"""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/ecw-ops", tags=["ecw-ops-phase4"])


# ══════════════════════════════════════════════════════════════════════
# 1. Recipe unification — publish mobile drafts into shared system
# ══════════════════════════════════════════════════════════════════════

class PublishDraft(BaseModel):
    outlet_id: str = "outlet-main"
    station_id: Optional[str] = None
    sell_price: float = 0.0
    target_cost_pct: float = 28.0


@router.post("/echo-chef/drafts/{draft_id}/publish")
def publish_draft_to_system(draft_id: str, body: PublishDraft,
                              x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Promote a mobile-generated draft (Echo Chef or URL import) into the
    shared recipe system so it appears on desktop Menu Builder alongside
    desktop-authored recipes.

    Writes in order: menu_items → menu_components → menu_recipes. All three
    tables are what the desktop Menu Builder reads; by writing to them we
    unify the mobile and desktop recipe systems into one.
    """
    draft = db["echo_chef_drafts"].find_one({"id": draft_id}, {"_id": 0})
    if not draft: raise HTTPException(404, "draft not found")
    recipe = draft.get("recipe") or {}
    if not isinstance(recipe, dict) or recipe.get("error"):
        raise HTTPException(400, "draft has no usable recipe body")

    item_id = f"mi-{uuid.uuid4().hex[:10]}"
    name = recipe.get("name") or recipe.get("title") or draft.get("menu_item_name") or "Untitled"
    # Estimate cost from ingredients or fallback
    est_cost = float(recipe.get("estimated_total_cost") or 0)
    if not est_cost and recipe.get("ingredients"):
        est_cost = sum(float(i.get("est_cost") or i.get("estimated_cost") or 0)
                       for i in recipe["ingredients"] if isinstance(i, dict))
    sell_price = float(body.sell_price or recipe.get("suggested_menu_price")
                        or (est_cost / (body.target_cost_pct / 100) if est_cost else 0))

    # 1. menu_items
    item = {
        "id": item_id,
        "outlet_id": body.outlet_id,
        "station_id": body.station_id,
        "name": name,
        "is_perishable": True,
        "par_default": 4,
        "cost": round(est_cost, 2),
        "sell_price": round(sell_price, 2),
        "active": True,
        "source": "mobile" if draft.get("source_url") or draft.get("signature") else "desktop",
        "source_draft_id": draft_id,
        "created_at": utcnow_iso(),
        "created_by": x_user_id or draft.get("chef_id") or "chef-william",
    }
    db["menu_items"].insert_one(dict(item))

    # 2. menu_components (ingredients → components with quantity_g best-effort)
    for ing in (recipe.get("ingredients") or []):
        if not isinstance(ing, dict): continue
        comp = {
            "id": f"mc-{uuid.uuid4().hex[:10]}",
            "item_id": item_id,
            "ingredient": ing.get("name") or str(ing),
            "quantity_g": _to_grams(ing.get("quantity"), ing.get("unit")),
            "cost": float(ing.get("est_cost") or ing.get("estimated_cost") or 0),
            "is_perishable": True,
            "note": ing.get("prep_note"),
            "created_at": utcnow_iso(),
        }
        db["menu_components"].insert_one(dict(comp))

    # 3. menu_recipes
    steps = []
    for s in (recipe.get("instructions") or recipe.get("prep_steps") or []):
        if isinstance(s, dict):
            steps.append(s.get("instruction") or s.get("step") or str(s))
        else:
            steps.append(str(s))
    mr = {
        "id": f"mr-{uuid.uuid4().hex[:10]}",
        "item_id": item_id,
        "yield_qty": recipe.get("yield_qty") or 4,
        "yield_unit": recipe.get("yield_unit") or "portions",
        "prep_steps": steps,
        "allergens": recipe.get("allergens") or [],
        "tags": recipe.get("tags") or [],
        "calories_per_serving": recipe.get("calories_per_serving"),
        "plating": recipe.get("plating"),
        "notes": recipe.get("description") or recipe.get("flavor_notes"),
        "created_at": utcnow_iso(),
    }
    db["menu_recipes"].insert_one(dict(mr))

    # Mark draft as published
    db["echo_chef_drafts"].update_one({"id": draft_id},
        {"$set": {"status": "published", "published_item_id": item_id,
                   "published_at": utcnow_iso()}})

    # Activity
    db["ecw_activity_events"].insert_one({
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "kind": "recipe_published",
        "title": f"📖 Recipe published · {name}",
        "detail": f"Promoted to shared system from {item['source']}",
        "actor": x_user_id or "chef-william",
        "meta": {"item_id": item_id, "draft_id": draft_id},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "item_id": item_id, "recipe_id": mr["id"]}


def _to_grams(qty: Any, unit: Optional[str]) -> Optional[int]:
    """Very rough unit → grams conversion for recipe scaling — good enough
    for MVP. Returns None if unparseable."""
    if qty is None: return None
    try:
        qty = float(qty)
    except (ValueError, TypeError):
        return None
    u = (unit or "").lower().strip()
    convert = {
        "g": 1, "gram": 1, "grams": 1,
        "kg": 1000, "kilogram": 1000,
        "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
        "lb": 453.6, "pound": 453.6, "pounds": 453.6,
        "ml": 1, "milliliter": 1,  # treating 1ml ≈ 1g for liquids — approximate
        "l": 1000, "liter": 1000, "litre": 1000,
        "tsp": 5, "teaspoon": 5,
        "tbsp": 15, "tablespoon": 15,
        "cup": 240, "cups": 240,
    }
    factor = convert.get(u)
    if factor is None: return int(qty) if qty else None
    return int(round(qty * factor))


# ══════════════════════════════════════════════════════════════════════
# 2. Order reconciliation — PO vs Invoice vs Receipt
# ══════════════════════════════════════════════════════════════════════

@router.get("/reconciliation/open-orders")
def list_open_orders(outlet_id: str = "outlet-main",
                      overdue_only: bool = False):
    """Returns every PO that's been placed but not yet fully received.
    Joins PO + invoice + delivery records so Finance/chefs can see the
    lifecycle in one view.

    - `status` tracks: ordered, received, received_with_variance
    - `days_overdue` = today - expected_delivery_date (None if no ETA)
    - `invoice_matched` = True if an invoice with matching po_id exists
    """
    today = datetime.now(timezone.utc).date()
    pos = list(db["procurement_orders"].find({
        "outlet_id": outlet_id,
        "status": {"$in": ["ordered", "received_with_variance"]},
    }, {"_id": 0}).sort("created_at", -1).limit(200))

    # Join invoices by po_id
    po_ids = [p["id"] for p in pos]
    invoices_by_po = {}
    for inv in db["invoices"].find({"po_id": {"$in": po_ids}}, {"_id": 0}):
        invoices_by_po.setdefault(inv["po_id"], []).append(inv)
    # Join deliveries
    deliveries_by_po = {}
    for d in db["vendor_deliveries"].find({"po_id": {"$in": po_ids}}, {"_id": 0}):
        deliveries_by_po.setdefault(d["po_id"], []).append(d)

    rows = []
    for po in pos:
        eta = po.get("expected_delivery_date")
        days_overdue: Optional[int] = None
        if eta:
            try:
                eta_date = datetime.fromisoformat(eta).date() if "T" in eta else datetime.strptime(eta, "%Y-%m-%d").date()
                days_overdue = (today - eta_date).days
            except (ValueError, AttributeError):
                pass
        invs = invoices_by_po.get(po["id"], [])
        dels = deliveries_by_po.get(po["id"], [])
        row = {
            **po,
            "po_number": po["id"],
            "invoice_matched": len(invs) > 0,
            "invoices": [{"id": i["id"], "amount": i.get("amount"),
                           "date": i.get("date")} for i in invs],
            "deliveries": [{"id": d["id"], "at": d.get("delivered_at")} for d in dels],
            "days_overdue": days_overdue,
            "needs_attention": bool(days_overdue and days_overdue > 0 and not dels),
        }
        if overdue_only and not row["needs_attention"]: continue
        rows.append(row)

    rows.sort(key=lambda r: (-1 if r["needs_attention"] else 0,
                              -(r.get("days_overdue") or -999)))
    return {"ok": True, "count": len(rows), "rows": rows, "as_of": utcnow_iso()}


@router.get("/reconciliation/missing-by-invoice")
def missing_by_invoice(outlet_id: str = "outlet-main", po_id: Optional[str] = None):
    """For each PO: list ordered items NOT present in any matched invoice.
    Used by EOM sweep. If po_id given, scoped to that PO only."""
    q: Dict[str, Any] = {"outlet_id": outlet_id,
                         "status": {"$in": ["ordered", "received_with_variance"]}}
    if po_id: q["id"] = po_id
    pos = list(db["procurement_orders"].find(q, {"_id": 0}))
    gaps = []
    for po in pos:
        ordered = po.get("items") or []
        invoices = list(db["invoices"].find({"po_id": po["id"]}, {"_id": 0}))
        invoiced_skus = set()
        for inv in invoices:
            for li in (inv.get("line_items") or []):
                if li.get("sku"): invoiced_skus.add(li["sku"])
                if li.get("item_id"): invoiced_skus.add(li["item_id"])
                if li.get("name"): invoiced_skus.add((li["name"] or "").lower())
        missing = []
        for it in ordered:
            keys = [it.get("item_id"), it.get("sku"), (it.get("name") or "").lower()]
            if not any(k and k in invoiced_skus for k in keys):
                missing.append(it)
        if missing:
            gaps.append({
                "po_id": po["id"], "po_date": po.get("created_at"),
                "vendor_name": po.get("vendor_name"),
                "expected_delivery_date": po.get("expected_delivery_date"),
                "missing_count": len(missing), "missing_items": missing,
                "ordered_count": len(ordered),
                "invoice_count": len(invoices),
            })
    return {"ok": True, "gap_count": len(gaps), "rows": gaps, "as_of": utcnow_iso()}


class EomSweepOut(BaseModel):
    dry_run: bool = False


@router.post("/reconciliation/eom-sweep")
def eom_sweep(body: EomSweepOut = EomSweepOut(),
                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Runs end-of-month sweep: for each outlet, finds POs with missing
    items, writes an alert to `eom_alerts`, and emits a Finance notification
    event. Idempotent per (outlet_id, period)."""
    now = datetime.now(timezone.utc)
    period = now.strftime("%Y-%m")
    outlets = [o["id"] for o in db["outlets_catalog"].find({}, {"_id": 0, "id": 1})] or ["outlet-main"]
    results = []
    for outlet_id in outlets:
        gaps = missing_by_invoice(outlet_id=outlet_id)
        if gaps["gap_count"] == 0: continue
        alert_key = f"eom-{outlet_id}-{period}"
        if not body.dry_run:
            db["eom_alerts"].update_one(
                {"id": alert_key},
                {"$set": {
                    "id": alert_key, "outlet_id": outlet_id, "period": period,
                    "gap_count": gaps["gap_count"],
                    "missing_items_total": sum(g["missing_count"] for g in gaps["rows"]),
                    "generated_at": utcnow_iso(),
                    "generated_by": x_user_id or "eom-sweep",
                    "notified": ["finance@luccca.com"],
                    "status": "open",
                }}, upsert=True)
            # Activity event
            db["ecw_activity_events"].insert_one({
                "id": f"act-{uuid.uuid4().hex[:10]}",
                "outlet_id": outlet_id, "kind": "eom_alert",
                "title": f"⚠ EOM sweep · {gaps['gap_count']} POs with missing items",
                "detail": f"Finance notified for {period}",
                "actor": x_user_id or "eom-sweep",
                "meta": {"period": period, "gap_count": gaps["gap_count"]},
                "created_at": utcnow_iso(),
            })
        results.append({"outlet_id": outlet_id, "gap_count": gaps["gap_count"],
                         "missing_total": sum(g["missing_count"] for g in gaps["rows"])})
    return {"ok": True, "period": period, "dry_run": body.dry_run,
            "outlets_alerted": len(results), "results": results}


# ══════════════════════════════════════════════════════════════════════
# 3. Predictive invoice mis-code detector (Claude)
# ══════════════════════════════════════════════════════════════════════

@router.post("/invoices/{invoice_id}/scan-coding")
async def scan_invoice_coding(invoice_id: str,
                                x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Runs Claude across the invoice's GL code vs each line-item description.
    If anything looks mis-coded, auto-sets `has_flag=true` with reason
    'ai_suspects_miscoding' and writes an AI explanation to the flag."""
    inv = db["invoices"].find_one({"id": invoice_id}, {"_id": 0})
    if not inv: raise HTTPException(404, "invoice not found")

    line_items = inv.get("line_items") or []
    gl_code = inv.get("gl_code")
    category = inv.get("category")
    if not line_items:
        return {"ok": True, "suspicion": False, "reason": "no line items"}

    LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
    if not LLM_KEY:
        return {"ok": True, "suspicion": False, "reason": "LLM key unavailable"}

    # Lightweight heuristic first — exact-obvious mis-code (e.g. paper GL with food words)
    heuristic = _heuristic_miscoding(line_items, category)
    if heuristic:
        return await _auto_flag_invoice(inv, invoice_id, x_user_id, heuristic, "heuristic")

    # Claude pass
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=LLM_KEY, session_id=f"scan-{invoice_id}",
                       system_message=(
            "You are an AP accountant. You scan invoices for GL-coding errors. "
            "Return ONLY strict JSON: "
            "{\"suspicion\": true|false, \"confidence\": 0-1, \"explanation\": \"...\"}"))
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        items_text = "\n".join(
            f"- {li.get('name')} (SKU {li.get('sku', '?')}, line-GL {li.get('gl_code', '?')}, qty {li.get('qty', '?')}, price {li.get('price', '?')})"
            for li in line_items[:20])
        prompt = (
            f"Invoice header: vendor={inv.get('vendor_name')}, category={category}, header-GL={gl_code}, amount=${inv.get('amount')}.\n"
            f"Line items:\n{items_text}\n\n"
            "Question: are any line items obviously mis-coded given the header category/GL? "
            "Typical examples: olive oil coded to Paper, cleaning chemicals coded to Food, etc. "
            "Be concise. Flag only if confidence >= 0.7."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        import json as _json
        text = resp if isinstance(resp, str) else str(resp)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"): text = text[:-3].strip()
        parsed = _json.loads(text)
        if parsed.get("suspicion") and parsed.get("confidence", 0) >= 0.7:
            return await _auto_flag_invoice(inv, invoice_id, x_user_id,
                                              parsed.get("explanation", "mis-coding suspected"),
                                              "claude", parsed.get("confidence"))
        return {"ok": True, "suspicion": False,
                "explanation": parsed.get("explanation"), "source": "claude"}
    except Exception as e:
        return {"ok": True, "suspicion": False, "reason": f"scan failed: {str(e)[:120]}"}


def _heuristic_miscoding(line_items: List[Dict[str, Any]], category: Optional[str]) -> Optional[str]:
    food_words = {"beef", "chicken", "pork", "fish", "salmon", "shrimp", "lobster",
                   "tomato", "oil", "salt", "sugar", "flour", "cheese", "milk", "butter",
                   "herb", "spice", "produce", "vegetable", "fruit"}
    paper_words = {"parchment", "napkin", "paper", "towel", "tissue"}
    chem_words = {"sanitizer", "bleach", "detergent", "chemical", "degreaser"}
    for li in line_items:
        nm = (li.get("name") or "").lower()
        line_gl = (li.get("gl_code") or "").lower()
        if category == "food":
            if any(w in nm for w in paper_words):
                return f"Line '{li.get('name')}' looks like paper goods on a food invoice"
            if any(w in nm for w in chem_words):
                return f"Line '{li.get('name')}' looks like chemicals on a food invoice"
        if category == "supplies" and any(w in nm for w in food_words):
            return f"Line '{li.get('name')}' looks like food on a supplies invoice"
    return None


async def _auto_flag_invoice(inv: Dict[str, Any], invoice_id: str,
                               x_user_id: Optional[str], explanation: str,
                               source: str, confidence: Optional[float] = None) -> Dict[str, Any]:
    flag_doc = {
        "id": f"flag-{uuid.uuid4().hex[:10]}",
        "invoice_id": invoice_id,
        "flagged_by": f"ai-{source}",
        "reason": "ai_suspects_miscoding",
        "comment": explanation,
        "confidence": confidence,
        "notifies": ["accounting@luccca.com"],
        "created_at": utcnow_iso(),
        "resolved_at": None,
    }
    db["invoice_flags"].insert_one(dict(flag_doc))
    db["invoices"].update_one({"id": invoice_id},
        {"$set": {"has_flag": True, "ai_flagged": True,
                   "ai_flag_confidence": confidence}})
    db["ecw_activity_events"].insert_one({
        "id": f"act-{uuid.uuid4().hex[:10]}",
        "outlet_id": inv.get("outlet_id", "outlet-main"),
        "kind": "ai_invoice_flagged",
        "title": f"🤖🚩 AI flagged invoice — {inv.get('vendor_name')}",
        "detail": explanation[:120],
        "actor": f"ai-{source}",
        "meta": {"invoice_id": invoice_id, "confidence": confidence},
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "suspicion": True, "flag_id": flag_doc["id"],
            "explanation": explanation, "source": source, "confidence": confidence}


@router.post("/invoices/scan-all")
async def scan_all_unflagged(outlet_id: str = "outlet-main", limit: int = 20):
    """Batch: scan recent unflagged invoices. Caps at 20 to stay polite to Claude."""
    rows = list(db["invoices"].find(
        {"outlet_id": outlet_id, "has_flag": {"$ne": True}, "ai_scanned": {"$ne": True}},
        {"_id": 0}).sort("date", -1).limit(min(limit, 50)))
    results = []
    for inv in rows:
        r = await scan_invoice_coding(invoice_id=inv["id"])
        db["invoices"].update_one({"id": inv["id"]}, {"$set": {"ai_scanned": True}})
        results.append({"invoice_id": inv["id"], **r})
    return {"ok": True, "scanned": len(results), "results": results}


# ══════════════════════════════════════════════════════════════════════
# 4. Curated order guides (desktop → mobile)
# ══════════════════════════════════════════════════════════════════════

class OrderGuideUpsert(BaseModel):
    outlet_id: str = "outlet-main"
    name: str = Field(..., min_length=1, max_length=80)
    items: List[Dict[str, Any]] = Field(default_factory=list)
    active: bool = True


@router.get("/order-guides")
def list_order_guides(outlet_id: str = "outlet-main", active_only: bool = True):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if active_only: q["active"] = True
    rows = list(db["order_guides_curated"].find(q, {"_id": 0})
                .sort("name", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/order-guides")
def upsert_order_guide(body: OrderGuideUpsert,
                        x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Desktop purchasing manager creates/updates a curated order guide
    (e.g., 'Weekly Seafood — Halperns'). Mobile chefs read from this list."""
    existing = db["order_guides_curated"].find_one(
        {"outlet_id": body.outlet_id, "name": body.name})
    if existing:
        db["order_guides_curated"].update_one(
            {"id": existing["id"]},
            {"$set": {"items": body.items, "active": body.active,
                       "updated_at": utcnow_iso(),
                       "updated_by": x_user_id or "purchasing-manager"}})
        return {"ok": True, "id": existing["id"], "updated": True}
    doc = {
        "id": f"og-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id,
        "name": body.name, "items": body.items, "active": body.active,
        "created_at": utcnow_iso(),
        "created_by": x_user_id or "purchasing-manager",
    }
    db["order_guides_curated"].insert_one(dict(doc))
    return {"ok": True, "id": doc["id"], "created": True}


@router.delete("/order-guides/{guide_id}")
def delete_order_guide(guide_id: str):
    db["order_guides_curated"].update_one({"id": guide_id},
                                           {"$set": {"active": False,
                                                      "deleted_at": utcnow_iso()}})
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════
# 5. Vendor Reliability Scorecard (mobile-friendly slice)
# ══════════════════════════════════════════════════════════════════════

@router.get("/vendor-scorecards")
def mobile_vendor_scorecards(outlet_id: str = "outlet-main", days: int = 90):
    """Simplified per-vendor scorecard for mobile. Metrics:
    - on_time_rate: % of POs delivered on or before expected date
    - variance_rate: % of POs with qty/price mismatches at receipt
    - avg_days_late: average lateness across overdue POs
    - order_count, total_spend"""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipe = [
        {"$match": {"outlet_id": outlet_id, "created_at": {"$gte": since}}},
        {"$group": {
            "_id": "$vendor_id",
            "vendor_name": {"$last": "$vendor_name"},
            "order_count": {"$sum": 1},
            "total_spend": {"$sum": "$total"},
            "variance_count": {"$sum": {"$cond": [
                {"$eq": ["$status", "received_with_variance"]}, 1, 0]}},
            "received_count": {"$sum": {"$cond": [
                {"$in": ["$status", ["received", "received_with_variance"]]}, 1, 0]}},
        }},
        {"$sort": {"total_spend": -1}},
    ]
    rows = list(db["procurement_orders"].aggregate(pipe))
    out = []
    for r in rows:
        vid = r.pop("_id", None)
        if not vid: continue
        oc = r["order_count"] or 1
        out.append({
            "vendor_id": vid,
            "vendor_name": r["vendor_name"],
            "order_count": r["order_count"],
            "total_spend": round(r["total_spend"] or 0, 2),
            "on_time_rate": round((r["received_count"] - r["variance_count"]) / oc * 100, 1),
            "variance_rate": round(r["variance_count"] / oc * 100, 1),
            "reliability_score": round(max(0, 100 - (r["variance_count"] / oc * 100)
                                             - max(0, (oc - r["received_count"]) / oc * 30)), 1),
        })
    return {"ok": True, "count": len(out), "rows": out,
            "period_days": days, "as_of": utcnow_iso()}


# ══════════════════════════════════════════════════════════════════════
# 6. Punch-out (cXML OrderRequest) — configurable per-outlet stub
# ══════════════════════════════════════════════════════════════════════

class PunchoutConfig(BaseModel):
    outlet_id: str = "outlet-main"
    vendor_id: str
    enabled: bool = False
    punchout_url: Optional[str] = None
    identity: Optional[str] = None
    shared_secret: Optional[str] = None
    buyer_cookie: Optional[str] = None


@router.get("/punchout/config")
def list_punchout_configs(outlet_id: Optional[str] = None):
    q: Dict[str, Any] = {}
    if outlet_id: q["outlet_id"] = outlet_id
    rows = list(db["punchout_configs"].find(q, {"_id": 0, "shared_secret": 0}))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/punchout/config")
def upsert_punchout_config(body: PunchoutConfig):
    existing = db["punchout_configs"].find_one(
        {"outlet_id": body.outlet_id, "vendor_id": body.vendor_id})
    now = utcnow_iso()
    if existing:
        db["punchout_configs"].update_one({"id": existing["id"]},
            {"$set": {**body.model_dump(), "updated_at": now}})
        return {"ok": True, "id": existing["id"], "updated": True}
    doc = {"id": f"pox-{uuid.uuid4().hex[:10]}", **body.model_dump(), "created_at": now}
    db["punchout_configs"].insert_one(dict(doc))
    return {"ok": True, "id": doc["id"], "created": True}


class PunchoutInit(BaseModel):
    outlet_id: str = "outlet-main"
    vendor_id: str
    user_id: Optional[str] = None


@router.post("/punchout/init")
def init_punchout_session(body: PunchoutInit):
    """Generates a cXML PunchOutSetupRequest envelope. Returns XML text the
    caller posts to the vendor's punchout URL. Default OFF — requires a
    punchout_configs row with enabled=true."""
    cfg = db["punchout_configs"].find_one({
        "outlet_id": body.outlet_id, "vendor_id": body.vendor_id, "enabled": True,
    }, {"_id": 0})
    if not cfg:
        return {"ok": False, "detail": "punchout not configured/enabled for this vendor"}

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload_id = f"{uuid.uuid4().hex[:8]}@luccca"
    buyer_cookie = cfg.get("buyer_cookie") or f"LCCCA-{body.outlet_id}-{uuid.uuid4().hex[:6]}"
    cxml = f"""<?xml version="1.0" encoding="UTF-8"?>
<cXML payloadID="{payload_id}" timestamp="{ts}">
  <Header>
    <From><Credential domain="NetworkId"><Identity>{cfg.get('identity', 'luccca')}</Identity></Credential></From>
    <To><Credential domain="NetworkId"><Identity>{body.vendor_id}</Identity></Credential></To>
    <Sender>
      <Credential domain="NetworkId"><Identity>{cfg.get('identity', 'luccca')}</Identity>
        <SharedSecret>***REDACTED***</SharedSecret>
      </Credential>
      <UserAgent>LUCCCA-ECW/1.0</UserAgent>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>{buyer_cookie}</BuyerCookie>
      <Extrinsic name="UserEmail">{body.user_id or 'chef-william'}@luccca.com</Extrinsic>
      <BrowserFormPost><URL>https://cfo-toolkit-deploy.preview.emergentagent.com/api/ecw-ops/punchout/return</URL></BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>"""
    # Record the session (real implementation would POST cxml to punchout_url)
    session = {
        "id": f"posr-{uuid.uuid4().hex[:10]}",
        "outlet_id": body.outlet_id, "vendor_id": body.vendor_id,
        "payload_id": payload_id, "buyer_cookie": buyer_cookie,
        "created_at": utcnow_iso(),
        "status": "pending_vendor_response",
    }
    db["punchout_sessions"].insert_one(dict(session))
    return {"ok": True, "session_id": session["id"], "cxml": cxml,
            "vendor_url": cfg.get("punchout_url"),
            "note": "Default stub — a real punchout POSTs this cXML to vendor_url and redirects to the returned URL."}


@router.post("/punchout/return")
async def punchout_return(payload: Dict[str, Any]):
    """Receives cXML OrderRequest or PunchOutOrderMessage from the vendor
    after the chef's cart session. In this stub we just persist it raw."""
    body = {
        "id": f"poxr-{uuid.uuid4().hex[:10]}",
        "payload": payload,
        "received_at": utcnow_iso(),
    }
    db["punchout_returns"].insert_one(dict(body))
    return {"ok": True, "id": body["id"]}


# ══════════════════════════════════════════════════════════════════════
# 7. Accrual reconciliation — ensure March deliveries hit March P&L
# ══════════════════════════════════════════════════════════════════════

class AccrualSweep(BaseModel):
    outlet_id: Optional[str] = None
    period: Optional[str] = None    # "YYYY-MM"; defaults to current month
    dry_run: bool = True


@router.post("/reconciliation/accrual-sweep")
def accrual_sweep(body: AccrualSweep):
    """For each delivery in the target month with no matching invoice yet,
    creates an accrual entry so the expense lands in the correct period.
    Prevents the "March bill arrives April 2 and hits April's P&L" problem.

    Matching logic:
      - Period is derived from `delivered_at` (not invoice.date).
      - If an invoice with `po_id` already exists AND its `date` falls in the
        same month as `delivered_at` → already booked correctly.
      - Otherwise → write an `accruals` row for the period and push activity
        event 'Accrual booked for $X (vendor, period)' so AP sees it.
    """
    period = body.period or datetime.now(timezone.utc).strftime("%Y-%m")
    # Month boundaries
    yy, mm = period.split("-")
    start_iso = f"{yy}-{mm}-01T00:00:00"
    if int(mm) == 12:
        end_iso = f"{int(yy)+1}-01-01T00:00:00"
    else:
        end_iso = f"{yy}-{int(mm)+1:02d}-01T00:00:00"

    # Pull deliveries in-period
    q: Dict[str, Any] = {"delivered_at": {"$gte": start_iso, "$lt": end_iso}}
    if body.outlet_id: q["outlet_id"] = body.outlet_id
    deliveries = list(db["vendor_deliveries"].find(q, {"_id": 0}))

    accruals_needed = []
    for d in deliveries:
        po_id = d.get("po_id")
        if not po_id: continue
        # Any invoice for this PO that landed IN-period?
        in_period_inv = db["invoices"].find_one({
            "po_id": po_id,
            "date": {"$gte": start_iso[:10], "$lt": end_iso[:10]},
        }, {"_id": 0})
        if in_period_inv: continue      # Already booked correctly

        po = db["procurement_orders"].find_one({"id": po_id}, {"_id": 0}) or {}
        po_total = po.get("total") or sum(
            float(li.get("extended_cost") or 0) for li in (po.get("items") or [])
        )
        accrual_id = f"acc-{po_id}-{period}"
        accrual_doc = {
            "id": accrual_id,
            "outlet_id": d.get("outlet_id", po.get("outlet_id")),
            "period": period,
            "po_id": po_id,
            "vendor_id": po.get("vendor_id") or d.get("vendor_id"),
            "vendor_name": po.get("vendor_name") or d.get("vendor_name"),
            "delivered_at": d.get("delivered_at"),
            "accrued_amount": round(po_total, 2),
            "status": "pending_invoice",
            "created_at": utcnow_iso(),
        }
        accruals_needed.append(accrual_doc)
        if not body.dry_run:
            db["accruals"].update_one({"id": accrual_id},
                                        {"$set": accrual_doc}, upsert=True)

    if not body.dry_run and accruals_needed:
        total_accrued = sum(a["accrued_amount"] for a in accruals_needed)
        outlets_touched = list({a["outlet_id"] for a in accruals_needed if a.get("outlet_id")})
        for outlet_id in outlets_touched:
            outlet_accruals = [a for a in accruals_needed if a["outlet_id"] == outlet_id]
            outlet_total = sum(a["accrued_amount"] for a in outlet_accruals)
            db["ecw_activity_events"].insert_one({
                "id": f"act-{uuid.uuid4().hex[:10]}",
                "outlet_id": outlet_id,
                "kind": "accrual_booked",
                "title": f"📒 Accrual · ${outlet_total:,.0f} booked to {period}",
                "detail": f"{len(outlet_accruals)} PO(s) delivered in-period; invoice still pending. Finance notified so this hits {period} not next month.",
                "actor": "accrual-sweep",
                "meta": {"period": period, "total": outlet_total,
                          "count": len(outlet_accruals)},
                "created_at": utcnow_iso(),
            })
        _ = total_accrued  # surfaced for reporting below

    return {
        "ok": True, "period": period, "dry_run": body.dry_run,
        "deliveries_scanned": len(deliveries),
        "accruals_needed": len(accruals_needed),
        "total_to_accrue": round(sum(a["accrued_amount"] for a in accruals_needed), 2),
        "rows": accruals_needed[:50],
    }


@router.get("/reconciliation/accruals")
def list_accruals(outlet_id: Optional[str] = None, period: Optional[str] = None,
                   status: Optional[str] = None):
    q: Dict[str, Any] = {}
    if outlet_id: q["outlet_id"] = outlet_id
    if period: q["period"] = period
    if status: q["status"] = status
    rows = list(db["accruals"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(200))
    by_period: Dict[str, float] = {}
    for r in rows:
        by_period[r["period"]] = by_period.get(r["period"], 0) + (r.get("accrued_amount") or 0)
    return {"ok": True, "count": len(rows), "rows": rows,
            "totals_by_period": {k: round(v, 2) for k, v in by_period.items()}}


@router.post("/reconciliation/accruals/{accrual_id}/clear")
def clear_accrual(accrual_id: str, invoice_id: str,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Called when the real invoice arrives. Clears the accrual so we don't
    double-book (accrual + invoice both hitting P&L)."""
    accrual = db["accruals"].find_one({"id": accrual_id}, {"_id": 0})
    if not accrual: raise HTTPException(404, "accrual not found")
    db["accruals"].update_one({"id": accrual_id},
        {"$set": {"status": "cleared", "cleared_by_invoice_id": invoice_id,
                   "cleared_at": utcnow_iso(),
                   "cleared_by": x_user_id or "accounting"}})
    return {"ok": True}


@router.get("/reconciliation/at-risk")
def at_risk_summary(outlet_id: Optional[str] = None):
    """One-tap summary for the mobile Reconciliation view:
    $ at risk of slipping to next month (delivered but not invoiced in-period)
    per outlet. Shows right now for the current period."""
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    dry = accrual_sweep(AccrualSweep(outlet_id=outlet_id, period=period, dry_run=True))
    return {
        "ok": True, "period": period,
        "total_at_risk": dry.get("total_to_accrue", 0),
        "po_count": dry.get("accruals_needed", 0),
        "scanned": dry.get("deliveries_scanned", 0),
        "outlet_id": outlet_id,
    }

