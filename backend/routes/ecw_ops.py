"""iter224 · ECW Operations module — Line Check · Menu Builder · Recipes · Food Photos.

William's spec:
- 4 mobile tabs: Waste (exists) + Line Check + Recipes + Food Photos
- Outlet switcher for multi-outlet chefs
- Line Check: station → items → par adjust → temp check on perishable
- Pars driven by EchoAi: sales + occupancy + reservations + weather + DOW + events
- Desktop menu builder: Excel-style + cost/margin rollup + push-to-mobile with version-lock
- Food Photos: capture → Sonnet auto-name → chef confirm → stored with station + menu-item tag
- Recipes: searchable + SMS to cook

Collections:
  menu_stations         · {id, outlet_id, name, sort, active}
  menu_items            · {id, outlet_id, station_id, name, is_perishable, par_default,
                           cost, sell_price, active, photo_url?, sort}
  menu_components       · {id, item_id, ingredient, quantity_g, cost, is_perishable, temp_min_c, temp_max_c}
  menu_recipes          · {id, item_id, yield_qty, yield_unit, prep_steps[], allergens[], tags[]}
  menu_publications     · {id, outlet_id, version, published_at, snapshot{stations, items, ...}}
  line_check_sessions   · {id, outlet_id, station_id, chef_id, started_at, completed_at?,
                           items_checked:int, temp_excursions:int}
  line_check_records    · {id, session_id, item_id, par_observed, par_adjusted, temp_c?,
                           flag_temp_excursion:bool, note?, checked_at}
  food_photos           · {id, outlet_id, station_id?, item_id?, label, auto_name, confirmed,
                           blob_url, media_base64?, created_at, chef_id}
  chef_outlet_access    · {id, chef_id, outlet_ids:[], primary_outlet_id?, role}
"""
from __future__ import annotations
import base64
import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id, strip_ids
from lib.waste_log import log_event

router = APIRouter(prefix="/api/ecw-ops", tags=["ecw-ops"])


# ── Outlets & chef access ───────────────────────────────────────────────
@router.get("/outlets/mine")
def my_outlets(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Return outlets this chef can switch between. If no record exists,
    seeds default single-outlet access for the chef."""
    uid = x_user_id or "chef-william"
    access = db["chef_outlet_access"].find_one({"chef_id": uid}, {"_id": 0})
    if not access:
        access = {
            "id": f"coa-{uuid.uuid4().hex[:10]}",
            "chef_id": uid,
            "outlet_ids": ["outlet-main"],
            "primary_outlet_id": "outlet-main",
            "role": "executive_chef",
            "created_at": utcnow_iso(),
        }
        db["chef_outlet_access"].insert_one(dict(access))
    # Resolve outlet names
    outlets = list(db["outlets_catalog"].find(
        {"id": {"$in": access["outlet_ids"]}}, {"_id": 0}
    ))
    if not outlets:
        outlets = [{"id": "outlet-main", "name": "Main Kitchen"}]
    return {"ok": True, "chef_id": uid, "access": access, "outlets": outlets}


class OutletSwitch(BaseModel):
    outlet_id: str


@router.post("/outlets/switch")
def switch_outlet(body: OutletSwitch,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    uid = x_user_id or "chef-william"
    access = db["chef_outlet_access"].find_one({"chef_id": uid})
    if not access: raise HTTPException(404, "no access record")
    if body.outlet_id not in (access.get("outlet_ids") or []):
        raise HTTPException(403, "outlet not in your access list")
    db["chef_outlet_access"].update_one(
        {"chef_id": uid},
        {"$set": {"primary_outlet_id": body.outlet_id, "updated_at": utcnow_iso()}})
    return {"ok": True, "primary_outlet_id": body.outlet_id}


# ── Menu hierarchy (stations → items → components → recipes) ────────────
class StationIn(BaseModel):
    outlet_id: str = "outlet-main"
    name: str = Field(..., min_length=1, max_length=80)
    sort: int = 0


@router.get("/stations")
def list_stations(outlet_id: str = "outlet-main"):
    rows = list(db["menu_stations"].find(
        {"outlet_id": outlet_id, "active": {"$ne": False}}, {"_id": 0}
    ).sort("sort", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/stations")
def create_station(body: StationIn):
    sid = f"stn-{uuid.uuid4().hex[:10]}"
    doc = {"id": sid, "outlet_id": body.outlet_id, "name": body.name,
            "sort": body.sort, "active": True, "created_at": utcnow_iso()}
    db["menu_stations"].insert_one(dict(doc))
    return {"ok": True, "station": doc}


class MenuItemIn(BaseModel):
    outlet_id: str = "outlet-main"
    station_id: str
    name: str = Field(..., min_length=1, max_length=120)
    is_perishable: bool = False
    par_default: float = Field(0, ge=0)
    cost: float = Field(0, ge=0)
    sell_price: float = Field(0, ge=0)
    sort: int = 0
    temp_min_c: Optional[float] = None
    temp_max_c: Optional[float] = None
    photo_url: Optional[str] = None


@router.get("/items")
def list_items(outlet_id: str = "outlet-main", station_id: Optional[str] = None):
    q: Dict[str, Any] = {"outlet_id": outlet_id, "active": {"$ne": False}}
    if station_id: q["station_id"] = station_id
    rows = list(db["menu_items"].find(q, {"_id": 0}).sort([("station_id", 1), ("sort", 1)]))
    # Enrich with component count
    for r in rows:
        r["component_count"] = db["menu_components"].count_documents({"item_id": r["id"]})
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/items")
def create_item(body: MenuItemIn):
    iid = f"mi-{uuid.uuid4().hex[:10]}"
    margin = 0.0 if body.sell_price == 0 else round(
        (body.sell_price - body.cost) / body.sell_price, 3)
    doc = {"id": iid, **body.model_dump(), "margin": margin, "active": True,
            "created_at": utcnow_iso()}
    db["menu_items"].insert_one(dict(doc))
    return {"ok": True, "item": doc}


class MenuItemPatch(BaseModel):
    name: Optional[str] = None
    is_perishable: Optional[bool] = None
    par_default: Optional[float] = None
    cost: Optional[float] = None
    sell_price: Optional[float] = None
    sort: Optional[int] = None
    temp_min_c: Optional[float] = None
    temp_max_c: Optional[float] = None
    photo_url: Optional[str] = None
    active: Optional[bool] = None


@router.patch("/items/{item_id}")
def patch_item(item_id: str, body: MenuItemPatch):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch: raise HTTPException(400, "no fields to update")
    patch["updated_at"] = utcnow_iso()
    # Recompute margin if price/cost touched
    cur = db["menu_items"].find_one({"id": item_id}, {"_id": 0})
    if not cur: raise HTTPException(404, "item not found")
    cost = patch.get("cost", cur.get("cost", 0))
    sell = patch.get("sell_price", cur.get("sell_price", 0))
    if sell: patch["margin"] = round((sell - cost) / sell, 3)
    r = db["menu_items"].find_one_and_update(
        {"id": item_id}, {"$set": patch}, projection={"_id": 0}, return_document=True)
    return {"ok": True, "item": r}


class ComponentIn(BaseModel):
    item_id: str
    ingredient: str = Field(..., min_length=1, max_length=100)
    quantity_g: float = Field(..., gt=0)
    cost: float = Field(0, ge=0)
    is_perishable: bool = False
    temp_min_c: Optional[float] = None
    temp_max_c: Optional[float] = None


@router.get("/components")
def list_components(item_id: str):
    rows = list(db["menu_components"].find(
        {"item_id": item_id}, {"_id": 0}
    ).sort("ingredient", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/components")
def create_component(body: ComponentIn):
    cid = f"mc-{uuid.uuid4().hex[:10]}"
    doc = {"id": cid, **body.model_dump(), "created_at": utcnow_iso()}
    db["menu_components"].insert_one(dict(doc))
    return {"ok": True, "component": doc}


@router.delete("/components/{component_id}")
def delete_component(component_id: str):
    r = db["menu_components"].delete_one({"id": component_id})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"ok": True}


class RecipeIn(BaseModel):
    item_id: str
    yield_qty: float = 1
    yield_unit: str = "plate"
    prep_steps: List[str] = Field(default_factory=list)
    allergens: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


@router.get("/recipes")
def list_recipes(outlet_id: str = "outlet-main", q: Optional[str] = None, limit: int = 50):
    """Searchable recipe list joined with item name.
    iter234 · Also unions in mobile-imported recipes from the `recipes`
    collection (those saved via /recipes/save-imported carry
    published_from='mobile') so they show on the mobile list.
    iter237 · Resolves ingredient UUID references → real names + costs
    via the ingredients collection. Computes food-cost % from ingredient
    costs × quantities."""
    items = {r["id"]: r for r in db["menu_items"].find(
        {"outlet_id": outlet_id}, {"_id": 0})}
    # Pre-cache all ingredients by id for fast joins
    ing_cache = {r["id"]: r for r in db["ingredients"].find({}, {"_id": 0})}

    def _resolve_ings(raw_ings):
        out = []
        total_cost = 0.0
        for ing in (raw_ings or []):
            if isinstance(ing, str):
                out.append({"name": ing}); continue
            iid = ing.get("ingredient_id")
            master = ing_cache.get(iid) if iid else None
            name = (master or {}).get("name") or ing.get("name") or ing.get("ingredient") or iid or "—"
            qty = float(ing.get("quantity") or ing.get("qty") or 0)
            unit = ing.get("unit") or (master or {}).get("base_unit") or ""
            price_per_unit = float((master or {}).get("cost_per_unit") or ing.get("unit_price") or 0)
            line_cost = round(qty * price_per_unit, 3)
            total_cost += line_cost
            # Allergen pass-through
            allergens = (master or {}).get("allergens") or ing.get("allergens") or []
            out.append({
                "ingredient_id": iid,
                "name": name,
                "quantity": qty or ing.get("quantity"),
                "unit": unit,
                "cost_per_unit": price_per_unit or None,
                "line_cost": line_cost or None,
                "allergens": allergens,
            })
        return out, round(total_cost, 2)

    recipes = list(db["menu_recipes"].find({}, {"_id": 0}))
    out = []
    for r in recipes:
        it = items.get(r.get("item_id"))
        if not it: continue
        resolved_ings, total_cost = _resolve_ings(r.get("ingredients"))
        menu_price = float(it.get("sell_price") or r.get("menu_price") or 0)
        food_cost_pct = round((total_cost / menu_price * 100), 1) if menu_price > 0 else None
        row = {
            **r,
            "item_name": it["name"],
            "station_id": it.get("station_id"),
            "cost": total_cost or it.get("cost", 0),
            "sell_price": menu_price,
            "menu_price": menu_price,
            "food_cost_pct": food_cost_pct,
            "ingredients": resolved_ings,
            "pos_mapped": bool(it.get("pos_item_id") or it.get("pos_mapped")),
        }
        if q:
            blob = (it["name"] + " " + " ".join(r.get("tags") or [])
                    + " " + (r.get("notes") or "")).lower()
            if q.lower() not in blob: continue
        out.append(row)

    imported = list(db["recipes"].find(
        {"$or": [{"outlet_id": outlet_id}, {"outlet_id": {"$exists": False}}]},
        {"_id": 0}
    ))
    for r in imported:
        if q:
            blob = (r.get("item_name", "") + " " + r.get("title", "")).lower()
            if q.lower() not in blob: continue
        resolved_ings, total_cost = _resolve_ings(r.get("ingredients"))
        r["ingredients"] = resolved_ings
        r["cost"] = total_cost or r.get("cost", 0)
        out.append(r)

    out.sort(key=lambda x: x.get("item_name", ""))
    return {"ok": True, "count": len(out), "rows": out[:limit]}


@router.post("/recipes")
def upsert_recipe(body: RecipeIn):
    cur = db["menu_recipes"].find_one({"item_id": body.item_id})
    if cur:
        db["menu_recipes"].update_one(
            {"item_id": body.item_id},
            {"$set": {**body.model_dump(), "updated_at": utcnow_iso()}})
        r = db["menu_recipes"].find_one({"item_id": body.item_id}, {"_id": 0})
        return {"ok": True, "recipe": r, "updated": True}
    rid = f"mr-{uuid.uuid4().hex[:10]}"
    doc = {"id": rid, **body.model_dump(), "created_at": utcnow_iso()}
    db["menu_recipes"].insert_one(dict(doc))
    return {"ok": True, "recipe": doc, "created": True}


class RecipeSmsIn(BaseModel):
    recipe_id: str
    phone: str                    # E.164 format


@router.post("/recipes/sms")
def send_recipe_sms(body: RecipeSmsIn):
    """Format and send a recipe as SMS. Queues to outbound_sms_queue when
    Twilio creds absent (same pattern as waste SMS digest)."""
    r = db["menu_recipes"].find_one({"id": body.recipe_id}, {"_id": 0})
    if not r: raise HTTPException(404, "recipe not found")
    item = db["menu_items"].find_one({"id": r["item_id"]}, {"_id": 0}) or {}
    comps = list(db["menu_components"].find({"item_id": r["item_id"]}, {"_id": 0}))
    lines = [f"🍽 {item.get('name', 'Recipe')}"]
    if comps:
        lines.append("Ingredients:")
        for c in comps[:15]:
            lines.append(f"  • {c['ingredient']} — {c['quantity_g']}g")
    if r.get("prep_steps"):
        lines.append("Prep:")
        for i, s in enumerate(r["prep_steps"][:10]):
            lines.append(f"  {i+1}. {s}")
    if r.get("allergens"):
        lines.append(f"⚠ Allergens: {', '.join(r['allergens'])}")
    body_text = "\n".join(lines)[:1500]

    # Attempt Twilio or queue
    import os
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_num = os.environ.get("TWILIO_FROM_NUMBER")
    if sid and token and from_num:
        try:
            from twilio.rest import Client
            c = Client(sid, token)
            msg = c.messages.create(body=body_text, from_=from_num, to=body.phone)
            return {"ok": True, "mode": "sms_sent", "sms_sid": msg.sid}
        except Exception as e:
            pass  # fall through to queue
    db["outbound_sms_queue"].insert_one({
        "id": f"osq-{uuid.uuid4().hex[:10]}",
        "to": body.phone, "body": body_text,
        "kind": "recipe_card", "recipe_id": body.recipe_id,
        "reason": "no_credentials", "queued_at": utcnow_iso(),
    })
    return {"ok": True, "mode": "queued", "body_preview": body_text[:200]}


# ── Menu publish (version-locked snapshot) ──────────────────────────────
@router.post("/publish")
def publish_menu(outlet_id: str = "outlet-main"):
    """Snapshot the current menu state and push to mobile. Increments version.
    Mobile app pulls the latest published version on outlet-switch."""
    stations = list(db["menu_stations"].find(
        {"outlet_id": outlet_id, "active": {"$ne": False}}, {"_id": 0}))
    items = list(db["menu_items"].find(
        {"outlet_id": outlet_id, "active": {"$ne": False}}, {"_id": 0}))
    for it in items:
        it["components"] = list(db["menu_components"].find(
            {"item_id": it["id"]}, {"_id": 0}))
    prev = db["menu_publications"].find_one(
        {"outlet_id": outlet_id}, sort=[("version", -1)])
    next_version = (prev or {}).get("version", 0) + 1
    pid = f"mp-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": pid, "outlet_id": outlet_id, "version": next_version,
        "published_at": utcnow_iso(),
        "snapshot": {
            "stations": stations, "items": items,
            "station_count": len(stations), "item_count": len(items),
            "perishable_count": sum(1 for i in items if i.get("is_perishable")),
        },
    }
    db["menu_publications"].insert_one(dict(doc))
    return {"ok": True, "publication": {"id": pid, "version": next_version,
                                          "stations": len(stations), "items": len(items)}}


@router.get("/published")
def get_published(outlet_id: str = "outlet-main"):
    """Mobile reads this on load / outlet-switch. Returns the latest
    published snapshot — single round-trip, fully offline-cacheable."""
    pub = db["menu_publications"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0}, sort=[("version", -1)])
    if not pub:
        # Bootstrap: publish whatever's live right now if nothing's ever
        # been published. This avoids "empty state" UX on fresh installs.
        publish_menu(outlet_id)
        pub = db["menu_publications"].find_one(
            {"outlet_id": outlet_id}, {"_id": 0}, sort=[("version", -1)])
    return {"ok": True, "publication": pub}


# ── Line check (daily station walk-through) ─────────────────────────────
class LineCheckStart(BaseModel):
    outlet_id: str = "outlet-main"
    station_id: str


@router.post("/line-check/start")
def start_line_check(body: LineCheckStart,
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    chef_id = x_user_id or "chef-william"
    sid = f"lcs-{uuid.uuid4().hex[:10]}"
    # Include par suggestions in the response so the UI can paint immediately
    station = db["menu_stations"].find_one(
        {"id": body.station_id}, {"_id": 0}) or {}
    items = list(db["menu_items"].find(
        {"outlet_id": body.outlet_id, "station_id": body.station_id,
         "active": {"$ne": False}}, {"_id": 0}).sort("sort", 1))
    # Par suggest per item
    for it in items:
        it["par_suggested"] = _suggest_par(body.outlet_id, it)
    doc = {
        "id": sid, "outlet_id": body.outlet_id, "station_id": body.station_id,
        "chef_id": chef_id, "started_at": utcnow_iso(),
        "items_checked": 0, "temp_excursions": 0, "status": "in_progress",
    }
    db["line_check_sessions"].insert_one(dict(doc))
    return {"ok": True, "session": doc, "station": station, "items": items}


class LineCheckRecord(BaseModel):
    session_id: str
    item_id: str
    par_observed: float = Field(..., ge=0)
    par_adjusted: Optional[float] = Field(None, ge=0)
    temp_c: Optional[float] = None
    note: Optional[str] = None


@router.post("/line-check/record")
def record_line_check(body: LineCheckRecord):
    session = db["line_check_sessions"].find_one({"id": body.session_id})
    if not session: raise HTTPException(404, "session not found")
    item = db["menu_items"].find_one({"id": body.item_id}, {"_id": 0})
    if not item: raise HTTPException(404, "item not found")

    # Auto-flag temp excursion if item is perishable + temp out of range
    flag = False
    if item.get("is_perishable") and body.temp_c is not None:
        tmin = item.get("temp_min_c")
        tmax = item.get("temp_max_c")
        if tmin is not None and body.temp_c < tmin: flag = True
        if tmax is not None and body.temp_c > tmax: flag = True

    rec_id = f"lcr-{uuid.uuid4().hex[:10]}"
    doc = {"id": rec_id, **body.model_dump(), "item_name": item["name"],
            "is_perishable": item.get("is_perishable", False),
            "flag_temp_excursion": flag, "checked_at": utcnow_iso()}
    db["line_check_records"].insert_one(dict(doc))
    # Bump session counters
    inc = {"items_checked": 1}
    if flag: inc["temp_excursions"] = 1
    db["line_check_sessions"].update_one(
        {"id": body.session_id},
        {"$inc": inc, "$set": {"last_record_at": utcnow_iso()}})
    return {"ok": True, "record": doc}


class LineCheckComplete(BaseModel):
    session_id: str


@router.post("/line-check/complete")
def complete_line_check(body: LineCheckComplete):
    session = db["line_check_sessions"].find_one_and_update(
        {"id": body.session_id},
        {"$set": {"status": "complete", "completed_at": utcnow_iso()}},
        projection={"_id": 0}, return_document=True)
    if not session: raise HTTPException(404, "session not found")
    return {"ok": True, "session": session}


@router.get("/line-check/sessions")
def list_sessions(outlet_id: str = "outlet-main", limit: int = 20,
                   x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if x_user_id: q["chef_id"] = x_user_id
    rows = list(db["line_check_sessions"].find(q, {"_id": 0})
                .sort("started_at", -1).limit(min(limit, 100)))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/line-check/sessions/{session_id}")
def get_session_detail(session_id: str):
    session = db["line_check_sessions"].find_one({"id": session_id}, {"_id": 0})
    if not session: raise HTTPException(404)
    records = list(db["line_check_records"].find(
        {"session_id": session_id}, {"_id": 0}).sort("checked_at", 1))
    return {"ok": True, "session": session, "records": records}


# ── EchoAi par-suggest (sales + occupancy + reservations + weather + DOW + events) ──
def _suggest_par(outlet_id: str, item: Dict[str, Any]) -> Dict[str, Any]:
    """Full-stack par suggestion. Gracefully degrades when any signal is
    missing — always returns a baseline from par_default.

    Signals:
      · sales_velocity_30d  — avg units sold per day for this item (last 30d POS)
      · occupancy_today     — hotel occupancy rate (PMS)
      · reservations_today  — covers booked for today (CRM)
      · weather_modifier    — ±10% based on rain/heat
      · dow_modifier        — weekday curve (Sat/Sun +20%, Mon -10%)
      · event_boost         — group event lift (+30% per concurrent event)
    """
    baseline = float(item.get("par_default") or 0)
    # 1. Sales velocity (last 30d)
    sales = 0.0
    try:
        since = utcnow_iso()[:10]
        recent = list(db["pos_sales"].find(
            {"outlet_id": outlet_id, "item_id": item["id"]},
            {"_id": 0, "units": 1}).limit(500))
        if recent:
            sales = sum(r.get("units", 0) for r in recent) / max(1, len(recent))
    except Exception: pass

    # 2. Occupancy (PMS — use dashboard stub if available)
    occ = 0.65
    try:
        snap = db["pms_snapshot"].find_one({}, {"_id": 0, "occupancy_rate": 1})
        if snap and snap.get("occupancy_rate") is not None:
            occ = float(snap["occupancy_rate"])
    except Exception: pass

    # 3. Reservations
    resv = 0
    try:
        today = utcnow_iso()[:10]
        resv = db["reservations"].count_documents(
            {"outlet_id": outlet_id, "date": today})
    except Exception: pass

    # 4. Weather modifier
    weather_mult = 1.0
    try:
        w = db["weather_cache"].find_one({"outlet_id": outlet_id}, {"_id": 0})
        if w:
            if (w.get("condition") or "").lower().startswith("rain"): weather_mult = 0.9
            elif float(w.get("temp_c") or 22) > 30: weather_mult = 1.1
    except Exception: pass

    # 5. Day-of-week
    dow = datetime.now(timezone.utc).weekday()
    dow_mult = {5: 1.2, 6: 1.2, 0: 0.9}.get(dow, 1.0)   # Sat, Sun, Mon

    # 6. Events
    event_boost = 0
    try:
        today = utcnow_iso()[:10]
        event_boost = db["crm_events"].count_documents({"date": today}) * 0.3
    except Exception: pass

    # Compose
    base = baseline if baseline > 0 else (sales or 10)
    suggested = base * (0.7 + 0.4 * occ) * (1 + 0.02 * resv) * weather_mult \
                * dow_mult * (1 + event_boost)

    return {
        "suggested": round(suggested, 1),
        "baseline": baseline,
        "drivers": {
            "sales_velocity_30d": round(sales, 1),
            "occupancy": round(occ, 2),
            "reservations_today": resv,
            "weather_mult": weather_mult,
            "dow_mult": dow_mult,
            "event_boost": round(event_boost, 2),
        },
    }


@router.get("/par-suggest/{item_id}")
def par_suggest_endpoint(item_id: str):
    item = db["menu_items"].find_one({"id": item_id}, {"_id": 0})
    if not item: raise HTTPException(404)
    return {"ok": True, "item_id": item_id, "item_name": item["name"],
            **_suggest_par(item.get("outlet_id", "outlet-main"), item)}


# ── Food Photos tab ─────────────────────────────────────────────────────
class FoodPhotoIn(BaseModel):
    outlet_id: str = "outlet-main"
    station_id: Optional[str] = None
    item_id: Optional[str] = None
    label: Optional[str] = None       # user-provided; else Sonnet auto-names
    media_base64: str = Field(..., min_length=64)


@router.post("/photos")
async def upload_photo(body: FoodPhotoIn,
                        x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Upload, auto-name via Sonnet (if label absent), store blob + metadata."""
    uid = x_user_id or "chef-william"
    raw_b64 = body.media_base64
    if raw_b64.startswith("data:") and "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(raw_b64, validate=False)
    except Exception as e:
        raise HTTPException(400, f"bad media_base64: {e}")
    if len(raw) == 0 or len(raw) > 10_000_000:
        raise HTTPException(400, "media must be 1..10 MB")

    pid = f"fp-{uuid.uuid4().hex[:12]}"
    blob_url = None; backend = None
    try:
        from lib.blob_storage import store_blob
        meta = store_blob("food_photos", raw, content_type="image/jpeg", blob_id=pid)
        blob_url = meta["url"]; backend = meta["backend"]
    except Exception: pass

    # Auto-name via Sonnet if not labeled
    auto_name = None
    confirmed = bool(body.label)
    label = body.label
    if not label:
        try:
            from routes.echowaste import _run_vision_llm
            vr = await _run_vision_llm(raw_b64)
            items = (vr or {}).get("items") or []
            if items:
                auto_name = items[0].get("name")
                label = auto_name
        except Exception: pass
    label = label or "Unlabelled dish"

    doc = {
        "id": pid, "outlet_id": body.outlet_id,
        "station_id": body.station_id, "item_id": body.item_id,
        "label": label, "auto_name": auto_name, "confirmed": confirmed,
        "blob_url": blob_url, "blob_backend": backend,
        "media_base64": raw_b64 if not blob_url else None,
        "size_bytes": len(raw), "chef_id": uid,
        "created_at": utcnow_iso(),
    }
    db["food_photos"].insert_one(dict(doc))
    doc.pop("media_base64", None)
    return {"ok": True, "photo": doc}


@router.get("/photos")
def list_photos(outlet_id: str = "outlet-main", station_id: Optional[str] = None,
                 item_id: Optional[str] = None, limit: int = 50):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if station_id: q["station_id"] = station_id
    if item_id: q["item_id"] = item_id
    rows = list(db["food_photos"].find(q, {"_id": 0, "media_base64": 0})
                .sort("created_at", -1).limit(min(limit, 200)))
    return {"ok": True, "count": len(rows), "rows": rows}


class FoodPhotoPatch(BaseModel):
    label: Optional[str] = None
    station_id: Optional[str] = None
    item_id: Optional[str] = None
    confirmed: Optional[bool] = None


@router.patch("/photos/{photo_id}")
def patch_photo(photo_id: str, body: FoodPhotoPatch):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch: raise HTTPException(400, "no fields to update")
    patch["updated_at"] = utcnow_iso()
    r = db["food_photos"].find_one_and_update(
        {"id": photo_id}, {"$set": patch},
        projection={"_id": 0, "media_base64": 0}, return_document=True)
    if not r: raise HTTPException(404)
    return {"ok": True, "photo": r}


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: str):
    r = db["food_photos"].delete_one({"id": photo_id})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"ok": True}


# ── Inventory (mobile quick-count + low-stock flagging + PO request) ────
# Design: chef does a quick shelf walk, types current counts, system
# compares to par, flags low-stock items, and (optionally) fires a
# "Request Order" → creates a procurement requisition the desktop
# procurement panel can turn into a real PO with approvals/signatures.

class InventoryCountIn(BaseModel):
    outlet_id: str = "outlet-main"
    item_id: str
    on_hand: float = Field(..., ge=0)
    unit: str = "each"
    note: Optional[str] = None


@router.get("/inventory/levels")
def inventory_levels(outlet_id: str = "outlet-main", station_id: Optional[str] = None):
    """Latest on-hand count per item, joined with par_default and EchoAi par
    suggestion. Flags low-stock when on_hand < 0.7 × par_suggested."""
    q: Dict[str, Any] = {"outlet_id": outlet_id, "active": {"$ne": False}}
    if station_id: q["station_id"] = station_id
    items = list(db["menu_items"].find(q, {"_id": 0}).sort([("station_id", 1), ("sort", 1)]))
    out: List[Dict[str, Any]] = []
    for it in items:
        latest = db["inventory_counts"].find_one(
            {"item_id": it["id"]},
            {"_id": 0, "on_hand": 1, "counted_at": 1, "chef_id": 1},
            sort=[("counted_at", -1)])
        on_hand = float((latest or {}).get("on_hand") or 0)
        sug = _suggest_par(outlet_id, it)
        target = sug["suggested"]
        low = on_hand < 0.7 * target
        out.append({
            "item_id": it["id"], "name": it["name"],
            "station_id": it.get("station_id"),
            "unit": it.get("unit", "each"),
            "par_default": it.get("par_default"),
            "par_suggested": target,
            "on_hand": on_hand,
            "last_counted_at": (latest or {}).get("counted_at"),
            "last_counted_by": (latest or {}).get("chef_id"),
            "low_stock": low,
            "gap": round(max(0.0, target - on_hand), 1),
        })
    low_count = sum(1 for r in out if r["low_stock"])
    return {"ok": True, "count": len(out), "low_stock_count": low_count, "rows": out}


@router.post("/inventory/count")
def record_count(body: InventoryCountIn,
                  x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    chef_id = x_user_id or "chef-william"
    cid = f"inv-{uuid.uuid4().hex[:10]}"
    doc = {"id": cid, **body.model_dump(), "chef_id": chef_id,
            "counted_at": utcnow_iso()}
    db["inventory_counts"].insert_one(dict(doc))
    return {"ok": True, "count": doc}


class OrderRequestIn(BaseModel):
    outlet_id: str = "outlet-main"
    items: List[Dict[str, Any]] = Field(..., min_length=1)   # [{item_id, qty, unit, note?}]
    priority: str = "normal"      # "normal" | "urgent"
    note: Optional[str] = None


@router.post("/inventory/order-request")
def create_order_request(body: OrderRequestIn,
                          x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Mobile chef flags a basket of items to order. Creates a procurement
    REQUISITION (not a PO yet) — desktop procurement panel picks it up for
    vendor selection, approval, and final PO creation."""
    chef_id = x_user_id or "chef-william"
    rid = f"req-{uuid.uuid4().hex[:10]}"
    # Resolve item names for the snapshot so desktop doesn't have to re-join
    item_ids = [it.get("item_id") for it in body.items if it.get("item_id")]
    items_catalog = {r["id"]: r for r in db["menu_items"].find(
        {"id": {"$in": item_ids}}, {"_id": 0})}
    enriched = []
    for it in body.items:
        m = items_catalog.get(it.get("item_id"))
        enriched.append({
            **it,
            "name": m["name"] if m else it.get("name", "?"),
            "cost_per_unit": m.get("cost") if m else None,
            "estimated_total": (float(it.get("qty") or 0) * float((m or {}).get("cost") or 0)),
        })
    total_est = sum(e["estimated_total"] for e in enriched)
    doc = {
        "id": rid, "outlet_id": body.outlet_id,
        "chef_id": chef_id, "priority": body.priority,
        "status": "pending_approval",
        "items": enriched, "item_count": len(enriched),
        "estimated_total": round(total_est, 2),
        "note": body.note,
        "created_at": utcnow_iso(),
    }
    db["procurement_requisitions"].insert_one(dict(doc))
    log_event("ecw_order_request_created",
              inputs={"outlet": body.outlet_id, "chef": chef_id},
              outputs={"id": rid, "item_count": len(enriched),
                        "estimated_total": total_est})
    return {"ok": True, "requisition": doc}


@router.get("/inventory/order-requests")
def list_order_requests(outlet_id: str = "outlet-main", limit: int = 20,
                         status: Optional[str] = None):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if status: q["status"] = status
    rows = list(db["procurement_requisitions"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(min(limit, 100)))
    return {"ok": True, "count": len(rows), "rows": rows}


# ── iter224·phase2 · Procurement requisition lifecycle ──────────────────
#
# Workflow: chef submits requisition from mobile Inventory → desktop
# purchasing manager reviews → approves (→ pending_po) → creates PO
# (→ ordered) → supplier delivers → chef receives on mobile
# (→ received / received_with_variance).

class RequisitionApprove(BaseModel):
    approved_by: Optional[str] = None
    note: Optional[str] = None


@router.post("/inventory/requisitions/{req_id}/approve")
def approve_requisition(req_id: str, body: RequisitionApprove,
                         x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    approver = body.approved_by or x_user_id or "purchasing-manager"
    r = db["procurement_requisitions"].find_one_and_update(
        {"id": req_id, "status": "pending_approval"},
        {"$set": {"status": "approved", "approved_by": approver,
                   "approved_at": utcnow_iso(),
                   "approval_note": body.note}},
        projection={"_id": 0}, return_document=True)
    if not r:
        raise HTTPException(404, "requisition not found OR not pending_approval")
    return {"ok": True, "requisition": r}


class RequisitionReject(BaseModel):
    reason: str = Field(..., min_length=1, max_length=240)


@router.post("/inventory/requisitions/{req_id}/reject")
def reject_requisition(req_id: str, body: RequisitionReject,
                        x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    r = db["procurement_requisitions"].find_one_and_update(
        {"id": req_id},
        {"$set": {"status": "rejected",
                   "rejected_by": x_user_id or "purchasing-manager",
                   "rejected_at": utcnow_iso(),
                   "rejection_reason": body.reason}},
        projection={"_id": 0}, return_document=True)
    if not r: raise HTTPException(404)
    return {"ok": True, "requisition": r}


class PurchaseOrderCreate(BaseModel):
    requisition_id: str
    vendor_id: str = "vendor-default"
    vendor_name: str = "Default Supplier"
    expected_delivery_date: Optional[str] = None     # ISO date
    unit_prices: Optional[Dict[str, float]] = None   # {item_id: price_per_unit}
    note: Optional[str] = None


@router.post("/inventory/purchase-orders")
def create_purchase_order(body: PurchaseOrderCreate,
                           x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Desktop purchasing manager cuts a PO from an approved requisition."""
    req = db["procurement_requisitions"].find_one({"id": body.requisition_id})
    if not req: raise HTTPException(404, "requisition not found")
    if req.get("status") != "approved":
        raise HTTPException(409, f"requisition status is {req.get('status')} (need approved)")
    po_id = f"po-{uuid.uuid4().hex[:10]}"
    # Re-compute totals with vendor prices if provided
    items: List[Dict[str, Any]] = []
    for it in (req.get("items") or []):
        price = (body.unit_prices or {}).get(it.get("item_id")) \
                or it.get("cost_per_unit") or 0
        qty = float(it.get("qty") or 0)
        items.append({**it, "unit_price": price, "line_total": round(qty * price, 2)})
    total = round(sum(it["line_total"] for it in items), 2)
    po = {
        "id": po_id, "requisition_id": body.requisition_id,
        "outlet_id": req.get("outlet_id"),
        "vendor_id": body.vendor_id, "vendor_name": body.vendor_name,
        "items": items, "item_count": len(items), "total": total,
        "status": "ordered",        # ordered → received / received_with_variance
        "expected_delivery_date": body.expected_delivery_date,
        "note": body.note,
        "created_by": x_user_id or "purchasing-manager",
        "created_at": utcnow_iso(),
    }
    db["procurement_orders"].insert_one(dict(po))
    # Flip requisition status
    db["procurement_requisitions"].update_one(
        {"id": body.requisition_id},
        {"$set": {"status": "ordered", "po_id": po_id, "po_created_at": utcnow_iso()}})
    log_event("ecw_po_created",
              inputs={"req_id": body.requisition_id, "vendor": body.vendor_name},
              outputs={"po_id": po_id, "total": total, "items": len(items)})
    return {"ok": True, "po": po}


@router.get("/inventory/purchase-orders")
def list_purchase_orders(outlet_id: str = "outlet-main", status: Optional[str] = None,
                          limit: int = 30):
    q: Dict[str, Any] = {"outlet_id": outlet_id}
    if status: q["status"] = status
    rows = list(db["procurement_orders"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(min(limit, 100)))
    return {"ok": True, "count": len(rows), "rows": rows}


class POReceiveItem(BaseModel):
    item_id: str
    qty_received: float = Field(..., ge=0)
    variance_note: Optional[str] = None


class POReceive(BaseModel):
    items: List[POReceiveItem] = Field(..., min_length=1)
    receiver: Optional[str] = None
    note: Optional[str] = None


@router.post("/inventory/purchase-orders/{po_id}/receive")
def receive_purchase_order(po_id: str, body: POReceive,
                            x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Chef on mobile confirms receipt. Compares qty_received vs qty_ordered;
    any non-zero variance flips status to received_with_variance."""
    po = db["procurement_orders"].find_one({"id": po_id})
    if not po: raise HTTPException(404, "po not found")
    if po.get("status") not in ("ordered", "received_with_variance"):
        raise HTTPException(409, f"po status is {po.get('status')} (need ordered)")

    receipt_map = {r.item_id: r for r in body.items}
    variance = False
    updated_items: List[Dict[str, Any]] = []
    for it in (po.get("items") or []):
        r = receipt_map.get(it.get("item_id"))
        qty_ord = float(it.get("qty") or 0)
        qty_rec = float(r.qty_received) if r else qty_ord   # assume full if not provided
        delta = qty_rec - qty_ord
        if abs(delta) > 0.01: variance = True
        updated_items.append({**it,
            "qty_received": qty_rec,
            "qty_delta": round(delta, 2),
            "variance_note": r.variance_note if r else None,
        })

    new_status = "received_with_variance" if variance else "received"
    receipt = {
        "id": f"rec-{uuid.uuid4().hex[:10]}",
        "po_id": po_id, "received_by": body.receiver or x_user_id or "chef-william",
        "items": [i.model_dump() for i in body.items],
        "note": body.note, "variance": variance,
        "received_at": utcnow_iso(),
    }
    db["procurement_receipts"].insert_one(dict(receipt))
    db["procurement_orders"].update_one(
        {"id": po_id},
        {"$set": {"items": updated_items, "status": new_status,
                   "received_at": utcnow_iso(),
                   "received_by": receipt["received_by"],
                   "variance": variance}})
    log_event("ecw_po_received",
              inputs={"po_id": po_id, "variance": variance},
              outputs={"status": new_status, "receipt_id": receipt["id"]})
    # Bump inventory_counts for received items (feeds the Inventory tab)
    for it in updated_items:
        if not it.get("item_id"): continue
        db["inventory_counts"].insert_one({
            "id": f"inv-{uuid.uuid4().hex[:10]}",
            "outlet_id": po.get("outlet_id"), "item_id": it["item_id"],
            "on_hand": float(it.get("qty_received") or 0),
            "unit": it.get("unit", "each"),
            "chef_id": receipt["received_by"],
            "source": "po_received", "po_id": po_id,
            "counted_at": utcnow_iso(),
        })
    return {"ok": True, "po_status": new_status, "receipt_id": receipt["id"],
             "variance": variance}


# ── iter225 · Vendor catalog + Order guide ──────────────────────────────
#
# Vendor catalog: each vendor's product line with unit price + pack size.
# Order guide: chef's favorites — items ordered most often + last-price +
# preferred vendor. Powers the "quick reorder" flow on mobile.

class VendorIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    lead_time_days: int = Field(1, ge=0, le=30)
    active: bool = True
    notes: Optional[str] = None


@router.get("/vendors")
def list_vendors(active_only: bool = True):
    q: Dict[str, Any] = {}
    if active_only: q["active"] = True
    rows = list(db["vendors_catalog"].find(q, {"_id": 0}).sort("name", 1))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/vendors")
def create_vendor(body: VendorIn):
    vid = f"vnd-{uuid.uuid4().hex[:10]}"
    doc = {"id": vid, **body.model_dump(), "created_at": utcnow_iso()}
    db["vendors_catalog"].insert_one(dict(doc))
    return {"ok": True, "vendor": doc}


class VendorItemIn(BaseModel):
    vendor_id: str
    item_id: Optional[str] = None          # FK to menu_items (optional — may be raw ingredient)
    sku: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=160)
    pack_size: str = "1 each"
    unit_price: float = Field(..., ge=0)
    category: Optional[str] = None


@router.get("/vendor-catalog")
def list_vendor_catalog(vendor_id: Optional[str] = None, q: Optional[str] = None, limit: int = 100):
    qry: Dict[str, Any] = {}
    if vendor_id: qry["vendor_id"] = vendor_id
    if q: qry["name"] = {"$regex": q, "$options": "i"}
    rows = list(db["vendor_catalog_items"].find(qry, {"_id": 0})
                .sort([("vendor_id", 1), ("name", 1)]).limit(min(limit, 500)))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.post("/vendor-catalog")
def create_vendor_catalog_item(body: VendorItemIn):
    vid = f"vci-{uuid.uuid4().hex[:10]}"
    doc = {"id": vid, **body.model_dump(), "created_at": utcnow_iso()}
    db["vendor_catalog_items"].insert_one(dict(doc))
    return {"ok": True, "item": doc}


@router.get("/order-guide")
def order_guide(outlet_id: str = "outlet-main", q: Optional[str] = None):
    """Aggregate of items most often ordered in past 90 days — with last
    unit price + preferred vendor. Primary order-entry shortcut for chefs
    who re-order the same 20-30 items weekly."""
    pipe = [
        {"$match": {"outlet_id": outlet_id, "status": {"$in": ["ordered", "received", "received_with_variance"]}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.item_id",
            "name": {"$last": "$items.name"},
            "order_count": {"$sum": 1},
            "total_qty": {"$sum": {"$ifNull": ["$items.qty", 0]}},
            "last_unit_price": {"$last": "$items.unit_price"},
            "last_vendor": {"$last": "$vendor_name"},
            "last_ordered_at": {"$max": "$created_at"},
        }},
        {"$sort": {"order_count": -1}},
        {"$limit": 80},
    ]
    rows = list(db["procurement_orders"].aggregate(pipe))
    # Normalize _id → item_id and strip the _id field
    out = []
    for r in rows:
        item_id = r.pop("_id", None)
        if not item_id: continue
        if q and q.lower() not in (r.get("name") or "").lower(): continue
        out.append({"item_id": item_id, **r})
    return {"ok": True, "count": len(out), "rows": out}


# ── iter225 · Offline-queue flush ───────────────────────────────────────
# When iOS Safari loses network in the walk-in cooler, mobile queues
# order-requests to localStorage. On reconnect, mobile POSTs the queued
# payloads to this idempotent endpoint (uses client-generated idempotency_key
# to prevent duplicates from multiple retries).

class OrderRequestOffline(BaseModel):
    idempotency_key: str = Field(..., min_length=8, max_length=64)
    outlet_id: str = "outlet-main"
    items: List[Dict[str, Any]] = Field(..., min_length=1)
    priority: str = "normal"
    note: Optional[str] = None


@router.post("/inventory/order-request-offline")
def order_request_offline(body: OrderRequestOffline,
                           x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Idempotent offline-safe variant. If the idempotency_key was already
    seen, returns the previous requisition (no duplicate write)."""
    existing = db["procurement_requisitions"].find_one(
        {"idempotency_key": body.idempotency_key}, {"_id": 0})
    if existing:
        return {"ok": True, "requisition": existing, "duplicate": True}
    # Enrich items from menu_items catalog (same as /order-request)
    item_ids = [it.get("item_id") for it in body.items if it.get("item_id")]
    catalog = {r["id"]: r for r in db["menu_items"].find({"id": {"$in": item_ids}}, {"_id": 0})}
    enriched = []
    for it in body.items:
        m = catalog.get(it.get("item_id"))
        enriched.append({
            **it, "name": m["name"] if m else it.get("name", "?"),
            "cost_per_unit": m.get("cost") if m else None,
            "estimated_total": float(it.get("qty") or 0) * float((m or {}).get("cost") or 0),
        })
    total = sum(e["estimated_total"] for e in enriched)
    rid = f"req-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": rid, "idempotency_key": body.idempotency_key,
        "outlet_id": body.outlet_id,
        "chef_id": x_user_id or "chef-william",
        "priority": body.priority, "status": "pending_approval",
        "items": enriched, "item_count": len(enriched),
        "estimated_total": round(total, 2), "note": body.note,
        "source": "offline_flush",
        "created_at": utcnow_iso(),
    }
    db["procurement_requisitions"].insert_one(dict(doc))
    log_event("ecw_order_request_offline_flushed",
              inputs={"idempotency_key": body.idempotency_key},
              outputs={"id": rid, "items": len(enriched)})
    return {"ok": True, "requisition": doc, "duplicate": False}


# ── Convenience: ops-dashboard summary (for home badges) ────────────────
@router.get("/summary")
def ops_summary(outlet_id: str = "outlet-main",
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    today = utcnow_iso()[:10]
    today_start = today + "T00:00:00"
    station_count = db["menu_stations"].count_documents(
        {"outlet_id": outlet_id, "active": {"$ne": False}})
    item_count = db["menu_items"].count_documents(
        {"outlet_id": outlet_id, "active": {"$ne": False}})
    photos_today = db["food_photos"].count_documents(
        {"outlet_id": outlet_id, "created_at": {"$gte": today_start}})
    sessions_today = db["line_check_sessions"].count_documents(
        {"outlet_id": outlet_id, "started_at": {"$gte": today_start}})
    temp_excursions_today = db["line_check_sessions"].aggregate([
        {"$match": {"outlet_id": outlet_id, "started_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$temp_excursions"}}},
    ])
    temp_excursions = next(iter(list(temp_excursions_today)), {}).get("total", 0)
    pub = db["menu_publications"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0, "version": 1, "published_at": 1},
        sort=[("version", -1)])
    return {
        "ok": True, "outlet_id": outlet_id, "date": today,
        "stations": station_count, "items": item_count,
        "photos_today": photos_today, "sessions_today": sessions_today,
        "temp_excursions_today": temp_excursions,
        "menu_version": (pub or {}).get("version", 0),
        "menu_published_at": (pub or {}).get("published_at"),
    }
