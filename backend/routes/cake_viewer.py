"""
Cake Viewer (iter151)
======================
Expanded:
- Tilt + offset per tier (Mad Hatter support)
- Finish style per tier (buttercream / fondant / drip / mirror-glaze / naked)
- Toppers (bride, groom, monogram, number, candles)
- Client intake metadata (event, guest count, BEO, delivery)
- Server-side sizing calculator + cut-guide math
- Portion estimator with cost breakdown
- Starter templates (wedding, birthday, mad-hatter, naked)
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Literal
from uuid import uuid4
import math

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/cake-viewer", tags=["cake-viewer"])
SESSIONS_COLL = "cake_viewer_sessions"
_now = lambda: datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class CakeFilling(BaseModel):
    name: str = "Sponge"
    color: str = "#f5d9a7"
    height: float = 0.15
    cost_per_serving_usd: float = 0.0      # for portion estimator
    # iter154 A++ · entremet element kind drives photoreal material
    kind: Optional[Literal["sponge", "genoise", "joconde", "dacquoise",
                           "streusel", "feuilletine", "praline", "financier",
                           "cremeux", "curd", "gelee", "compote",
                           "mousse", "ganache", "glaze"]] = "sponge"
    flavor: Optional[str] = None
    aeration: Optional[float] = None
    inclusions: Optional[List[str]] = None


class CakeTopper(BaseModel):
    kind: Literal["bride", "groom", "monogram", "number", "candle", "flower", "figurine",
                  "crown", "horn", "star", "dinosaur", "tower_spire", "balloon"] = "figurine"
    label: Optional[str] = None             # for monogram/number text
    color: str = "#c8a97e"
    x: float = 0.0                          # offset from center (horizontal)
    z: float = 0.0
    scale: float = 1.0


class CakePiping(BaseModel):
    """iter153 A2 · Piping decoration on a tier band"""
    kind: Literal["bead", "shell", "rope", "rosette", "basket_weave", "drop_strings",
                  "cornelli_lace", "ruffle", "leaf", "star", "scroll", "zigzag"] = "bead"
    band: Literal["top", "bottom", "middle"] = "bottom"
    color: str = "#c8a97e"
    scale: float = 1.0
    density: Optional[int] = None


class CakeTier(BaseModel):
    height: float = Field(default=0.6)
    radius: float = Field(default=1.0)
    color: str = Field(default="#ffffff")
    roughness: float = Field(default=0.7, ge=0, le=1)
    metalness: float = Field(default=0.0, ge=0, le=1)
    texture_url: Optional[str] = None
    texture_repeat_x: float = 1.0
    texture_repeat_y: float = 1.0
    wrap_style: str = "cylinder"
    fillings: Optional[List[CakeFilling]] = None
    # Mad Hatter + finish (iter151)
    tilt_x: float = 0.0                     # radians (-0.3..0.3 typical)
    tilt_z: float = 0.0
    offset_x: float = 0.0                   # horizontal shift in relative units
    offset_z: float = 0.0
    finish: Literal["buttercream", "fondant", "drip", "mirror", "naked", "semi-naked"] = "buttercream"
    # iter153 A1 · 7 tier shapes
    shape: Optional[Literal["round", "square", "heart", "hex", "sheet", "mad_hatter", "topsy_turvy"]] = "round"
    taper: Optional[float] = None           # 0–0.6 · Mad Hatter top-vs-bottom ratio (1-taper)
    wave: Optional[float] = None            # 0–0.25 · Topsy-turvy wave amplitude
    # iter153 A2 · Piping decorations
    piping: Optional[List[CakePiping]] = None


class CakeIntake(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    event_date: Optional[str] = None        # ISO date
    event_type: Optional[Literal["wedding","birthday","anniversary","corporate","baby_shower","other"]] = None
    guest_count: Optional[int] = None
    slice_size: Literal["party","standard","wedding"] = "wedding"   # party=1"×2", standard=1.5"×2", wedding=1"×2" (small)
    allergens: List[str] = Field(default_factory=list)
    theme: Optional[str] = None
    inspiration_image_url: Optional[str] = None
    beo_number: Optional[str] = None
    delivery_required: bool = False
    delivery_address: Optional[str] = None
    delivery_time: Optional[str] = None     # ISO datetime
    delivery_notes: Optional[str] = None
    price_quote_usd: Optional[float] = None


class FlowerDeco(BaseModel):
    """iter153 A3 · Flower arrangement applied at session level"""
    arrangement_id: str                     # matches FLOWER_ARRANGEMENTS[].id
    placement: Literal["top", "cascade", "base", "tier"] = "top"
    tier_index: Optional[int] = None        # for "tier" placement
    palette_override: Optional[List[str]] = None
    scale: Optional[float] = 1.0


class CakeViewerSession(BaseModel):
    order_number: Optional[str] = None
    title: str = "Cake Preview"
    tiers: List[CakeTier] = Field(default_factory=lambda: [
        CakeTier(height=0.6, radius=1.2, color="#fff8f2"),
        CakeTier(height=0.5, radius=0.9, color="#f5e5d3"),
        CakeTier(height=0.4, radius=0.6, color="#e8c9a8"),
    ])
    toppers: List[CakeTopper] = Field(default_factory=list)
    flowers: List[FlowerDeco] = Field(default_factory=list)  # iter153 A3
    intake: Optional[CakeIntake] = None
    background: str = "#0b1628"
    stand_color: str = "#2a2115"
    stand_kind: Optional[str] = None        # iter153 A4 · 10 stand types
    piping_color: str = "#c8a97e"
    author: Optional[str] = None


# ─────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────
@router.post("/sessions")
async def create_session(payload: CakeViewerSession):
    sid = f"cv-{uuid4().hex[:10]}"
    doc = {"id": sid, **payload.model_dump(), "created_at": _now(), "updated_at": _now()}
    db[SESSIONS_COLL].insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "session_id": sid, "session": doc}


@router.get("/sessions/{sid}")
async def get_session(sid: str):
    doc = db[SESSIONS_COLL].find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "cake viewer session not found")
    return doc


@router.put("/sessions/{sid}")
async def update_session(sid: str, payload: CakeViewerSession):
    updates = payload.model_dump()
    updates["updated_at"] = _now()
    res = db[SESSIONS_COLL].update_one({"id": sid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "session not found")
    return {"ok": True}


@router.get("/sessions")
async def list_sessions(limit: int = 50, author: Optional[str] = None):
    q = {}
    if author: q["author"] = author
    items = list(db[SESSIONS_COLL].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"items": items, "count": len(items)}


@router.delete("/sessions/{sid}")
async def delete_session(sid: str):
    res = db[SESSIONS_COLL].delete_one({"id": sid})
    return {"ok": True, "deleted": res.deleted_count}


# ─────────────────────────────────────────────
# Sizing calculator — "how big a cake for N guests?"
# Industry rule of thumb (per Wilton / professional):
#   - Round cake, servings ≈ π·r² / slice_area
#   - Wedding slice: 1"×2" (2 sq in) — smaller, formal
#   - Party slice: 1.5"×2" (3 sq in)
#   - Dessert slice: 2"×2" (4 sq in)
# Industry-standard round cake servings (wedding slice):
#   6" = 12,  8" = 24,  10" = 38,  12" = 56,  14" = 78,  16" = 100
# ─────────────────────────────────────────────
SLICE_AREA = {"wedding": 2.0, "standard": 3.0, "party": 4.0}    # sq inches

STANDARD_TIER_OPTIONS = [
    {"diameter_in": 4,  "radius_in": 2.0,  "typical": "mini top tier"},
    {"diameter_in": 6,  "radius_in": 3.0,  "typical": "top tier / single"},
    {"diameter_in": 8,  "radius_in": 4.0,  "typical": "mid tier"},
    {"diameter_in": 10, "radius_in": 5.0,  "typical": "mid tier"},
    {"diameter_in": 12, "radius_in": 6.0,  "typical": "base tier"},
    {"diameter_in": 14, "radius_in": 7.0,  "typical": "base tier"},
    {"diameter_in": 16, "radius_in": 8.0,  "typical": "grand base tier"},
]

def _servings_for_round(diameter_in: float, slice_size: str) -> int:
    # use industry-standard serving chart (wedding slice)
    if slice_size == "wedding":
        chart = {4: 6, 6: 12, 8: 24, 10: 38, 12: 56, 14: 78, 16: 100}
        nearest = min(chart, key=lambda d: abs(d - diameter_in))
        return chart[nearest]
    # derive from slice area for other sizes
    r = diameter_in / 2
    area = math.pi * r * r
    return int(area / SLICE_AREA.get(slice_size, 3.0))


@router.get("/sizing-calculator")
async def sizing_calculator(guests: int, slice_size: str = "wedding"):
    """Return recommended multi-tier cake configuration for a guest count."""
    if guests <= 0:
        raise HTTPException(400, "guests must be > 0")
    # Build candidate configurations, 1–4 tiers
    best_cfg = None
    candidates = []
    for tier_count in range(1, 5):
        # Distribute top-to-base: smallest 4" or 6" at top, larger at base
        min_top = 4 if tier_count >= 3 else 6
        for base in [8, 10, 12, 14, 16]:
            if tier_count == 1:
                combo = [base]
            elif tier_count == 2:
                combo = [base - 4, base]
            elif tier_count == 3:
                combo = [min_top + (2 if base >= 12 else 0), base - 4, base]
            else:
                combo = [min_top, min_top + 4, base - 4, base]
            combo = [c for c in combo if c >= 4]
            if len(combo) != tier_count:
                continue
            servings = sum(_servings_for_round(d, slice_size) for d in combo)
            if servings >= guests:
                excess = servings - guests
                candidates.append({"tiers_in": combo, "servings": servings, "excess": excess, "tier_count": tier_count})

    if not candidates:
        raise HTTPException(400, "guest count exceeds single-unit cake capacity; suggest multiple cakes")

    # Rank: prefer lowest excess, then fewer tiers (simpler is better)
    candidates.sort(key=lambda x: (x["excess"], x["tier_count"]))
    recommended = candidates[0]

    return {
        "ts": _now(),
        "guests": guests,
        "slice_size": slice_size,
        "slice_area_sq_in": SLICE_AREA.get(slice_size, 3.0),
        "recommended": recommended,
        "alternatives": candidates[1:6],
        "reference_chart": {
            "wedding": {"4": 6, "6": 12, "8": 24, "10": 38, "12": 56, "14": 78, "16": 100},
            "slice_note": "Wedding slice = 1\"×2\" (2 sq in). Party = 1.5\"×2\" (3 sq in). Dessert = 2\"×2\" (4 sq in).",
        },
    }


@router.get("/cut-guide")
async def cut_guide(diameter_in: float, slice_size: str = "wedding"):
    """Return ring/wedge cut pattern to achieve target servings per tier.
    Round cakes are cut with (a) an outer ring-cut 2" in from edge, creating
    an outer ring of 1"×2" slices, (b) then the inner circle is cut into
    1"×2" wedges until the center is too small, then repeat ring-and-wedge.
    Returns the exact rings / cut lines for overlay rendering.
    """
    if diameter_in < 4:
        raise HTTPException(400, "diameter must be >= 4 inches")
    radius = diameter_in / 2
    slice_depth = {"wedding": 1.0, "standard": 1.5, "party": 2.0}.get(slice_size, 1.0)

    rings = []
    remaining_r = radius
    while remaining_r > 1.0:
        ring = {
            "outer_r": remaining_r,
            "inner_r": max(0, remaining_r - slice_depth),
            "circumference_in": 2 * math.pi * remaining_r,
            "slices": int((2 * math.pi * remaining_r) / 2.0),   # 2" slice width at outer edge
        }
        rings.append(ring)
        remaining_r -= slice_depth
    # center small pie
    if remaining_r > 0:
        center_slices = max(4, int(remaining_r * 4))
        rings.append({
            "outer_r": remaining_r, "inner_r": 0,
            "circumference_in": 2 * math.pi * remaining_r,
            "slices": center_slices, "center_pie": True,
        })

    total = sum(r["slices"] for r in rings)
    return {
        "ts": _now(),
        "diameter_in": diameter_in,
        "slice_size": slice_size,
        "rings": rings,
        "total_slices": total,
        "instructions": [
            f"Mark a ring {slice_depth:.1f}\" in from the edge.",
            "Cut radial slices around that outer ring — creates ~1\" wide pieces.",
            "Repeat ring-cuts moving inward until the center is smaller than 2\" radius.",
            "Cut the remaining center like a pie (4–8 wedges).",
        ],
    }


@router.get("/portion-estimator")
async def portion_estimator(session_id: str, slice_size: str = "wedding",
                             price_per_serving_usd: Optional[float] = None):
    """Return portions + cost breakdown for a cake session."""
    doc = db[SESSIONS_COLL].find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "session not found")

    # Our tier.radius is in relative units; assume 1.0 relative unit = 5 inches
    RELATIVE_TO_INCHES = 5.0
    tiers_breakdown = []
    total_servings = 0
    total_cost = 0.0

    for i, tier in enumerate(doc.get("tiers", [])):
        diam_in = round(tier["radius"] * 2 * RELATIVE_TO_INCHES, 1)
        servings = _servings_for_round(diam_in, slice_size)
        # Filling cost: sum per-filling cost_per_serving × servings
        filling_cost = sum(
            (f.get("cost_per_serving_usd") or 0) * servings
            for f in (tier.get("fillings") or [])
        )
        # Icing base cost estimate: $0.25/serving for buttercream, $0.60 for fondant, $0.90 for mirror glaze
        icing_unit = {"buttercream": 0.25, "fondant": 0.60, "mirror": 0.90, "drip": 0.35, "naked": 0.10, "semi-naked": 0.15}.get(tier.get("finish", "buttercream"), 0.25)
        icing_cost = icing_unit * servings
        tier_cost = round(filling_cost + icing_cost, 2)
        total_servings += servings
        total_cost += tier_cost
        tiers_breakdown.append({
            "tier": i + 1,
            "diameter_in": diam_in,
            "servings": servings,
            "filling_cost_usd": round(filling_cost, 2),
            "icing_cost_usd": round(icing_cost, 2),
            "tier_cost_usd": tier_cost,
            "finish": tier.get("finish", "buttercream"),
        })

    # Revenue / margin
    revenue = None
    margin_pct = None
    margin_usd = None
    intake = doc.get("intake") or {}
    # prefer explicit quote, then price_per_serving, then intake.price_quote
    if price_per_serving_usd is not None:
        revenue = round(price_per_serving_usd * total_servings, 2)
    elif intake.get("price_quote_usd"):
        revenue = float(intake["price_quote_usd"])

    if revenue is not None and total_cost > 0:
        margin_usd = round(revenue - total_cost, 2)
        margin_pct = round((margin_usd / revenue) * 100, 1) if revenue else 0

    return {
        "ts": _now(),
        "session_id": session_id,
        "slice_size": slice_size,
        "tiers": tiers_breakdown,
        "total_servings": total_servings,
        "total_cost_usd": round(total_cost, 2),
        "revenue_usd": revenue,
        "margin_usd": margin_usd,
        "margin_pct": margin_pct,
        "cost_per_serving_usd": round(total_cost / max(1, total_servings), 2),
    }


# ─────────────────────────────────────────────
# Starter templates (iter151) — premium presets
# ─────────────────────────────────────────────
TEMPLATES = {
    "classic_wedding": {
        "title": "Classic Wedding — 3 Tier",
        "tiers": [
            {"height": 0.65, "radius": 1.4, "color": "#fffcf5", "finish": "fondant", "fillings": [
                {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.18, "cost_per_serving_usd": 0.55},
                {"name": "Raspberry jam", "color": "#c73a5b", "height": 0.04, "cost_per_serving_usd": 0.22},
                {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.18, "cost_per_serving_usd": 0.55},
                {"name": "Swiss buttercream", "color": "#fff6e0", "height": 0.06, "cost_per_serving_usd": 0.40},
                {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.14, "cost_per_serving_usd": 0.55},
            ]},
            {"height": 0.55, "radius": 1.05, "color": "#fffcf5", "finish": "fondant", "fillings": [
                {"name": "Almond sponge", "color": "#f2e3cf", "height": 0.16, "cost_per_serving_usd": 0.62},
                {"name": "Hazelnut praline", "color": "#a0622a", "height": 0.06, "cost_per_serving_usd": 0.95},
                {"name": "Almond sponge", "color": "#f2e3cf", "height": 0.14, "cost_per_serving_usd": 0.62},
            ]},
            {"height": 0.45, "radius": 0.7, "color": "#fffcf5", "finish": "fondant", "fillings": [
                {"name": "Lemon sponge", "color": "#fce486", "height": 0.14, "cost_per_serving_usd": 0.55},
                {"name": "Lemon curd", "color": "#f6b73c", "height": 0.06, "cost_per_serving_usd": 0.48},
                {"name": "Lemon sponge", "color": "#fce486", "height": 0.14, "cost_per_serving_usd": 0.55},
            ]},
        ],
        "toppers": [{"kind": "monogram", "label": "A&E", "color": "#c8a97e", "x": 0, "z": 0, "scale": 1.0}],
    },
    "mad_hatter": {
        "title": "Mad Hatter — Whimsical Tilted",
        "tiers": [
            {"height": 0.55, "radius": 1.3, "color": "#2a1a6a", "finish": "fondant", "tilt_x": 0.0, "tilt_z": 0.0},
            {"height": 0.5,  "radius": 1.0, "color": "#c73a5b", "finish": "fondant", "tilt_x": 0.12, "tilt_z": -0.08, "offset_x": 0.18},
            {"height": 0.45, "radius": 0.78, "color": "#ffd666", "finish": "fondant", "tilt_x": -0.15, "tilt_z": 0.1, "offset_x": -0.2, "offset_z": 0.12},
            {"height": 0.4, "radius": 0.6, "color": "#4cb5a8", "finish": "fondant", "tilt_x": 0.2, "tilt_z": -0.12, "offset_x": 0.15, "offset_z": -0.14},
            {"height": 0.35, "radius": 0.45, "color": "#f4a261", "finish": "fondant", "tilt_x": -0.1, "tilt_z": 0.15, "offset_x": -0.1, "offset_z": 0.1},
        ],
        "toppers": [
            {"kind": "figurine", "label": "hat", "color": "#2a1a6a", "x": 0, "z": 0, "scale": 1.2},
        ],
        "background": "#1a0938",
    },
    "birthday": {
        "title": "Birthday — Single Tier with Candles",
        "tiers": [
            {"height": 0.55, "radius": 1.0, "color": "#ffe8d4", "finish": "buttercream", "fillings": [
                {"name": "Chocolate sponge", "color": "#3d2414", "height": 0.14, "cost_per_serving_usd": 0.60},
                {"name": "Chocolate ganache", "color": "#2a1408", "height": 0.06, "cost_per_serving_usd": 0.72},
                {"name": "Chocolate sponge", "color": "#3d2414", "height": 0.14, "cost_per_serving_usd": 0.60},
            ]},
        ],
        "toppers": [
            {"kind": "number", "label": "30", "color": "#c8a97e", "x": 0, "z": 0, "scale": 1.0},
            {"kind": "candle", "color": "#ff7e5f", "x": -0.4, "z": 0.2, "scale": 1.0},
            {"kind": "candle", "color": "#feb47b", "x": 0.4, "z": 0.2, "scale": 1.0},
            {"kind": "candle", "color": "#ff7e5f", "x": 0, "z": -0.4, "scale": 1.0},
        ],
    },
    "naked_rustic": {
        "title": "Naked Rustic — Semi-Iced with Fruit",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#f0d9b0", "finish": "naked"},
            {"height": 0.5,  "radius": 0.9, "color": "#f0d9b0", "finish": "naked"},
        ],
        "toppers": [{"kind": "flower", "color": "#ffffff", "x": 0, "z": 0, "scale": 1.2}],
    },

    # ─── iter153 A5 · Kids & Novelty ───
    "dinosaur_adventure": {
        "title": "Dinosaur Adventure",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#65a06b", "finish": "fondant"},
            {"height": 0.50, "radius": 0.9, "color": "#c7723a", "finish": "fondant"},
            {"height": 0.45, "radius": 0.6, "color": "#ffd666", "finish": "fondant"},
        ],
        "toppers": [
            {"kind": "dinosaur", "color": "#5f7d3b", "x": 0,    "z": 0,    "scale": 1.4},
            {"kind": "figurine", "label": "T-Rex",   "color": "#8b3a2e", "x": -0.3, "z": 0.2, "scale": 0.9},
            {"kind": "star",     "color": "#ffe066", "x": 0.35, "z": -0.1, "scale": 0.8},
        ],
        "background": "#4a5d3a",
        "stand_kind": "rustic_wood",
    },
    "unicorn_magic": {
        "title": "Unicorn Magic",
        "tiers": [
            {"height": 0.5, "radius": 1.15, "color": "#ffe4f1", "finish": "buttercream"},
            {"height": 0.45, "radius": 0.85, "color": "#e7d4ff", "finish": "buttercream"},
            {"height": 0.4,  "radius": 0.55, "color": "#d4f1ff", "finish": "buttercream"},
        ],
        "toppers": [
            {"kind": "horn",  "color": "#ffd966", "x": 0, "z": 0, "scale": 1.2},
            {"kind": "star",  "color": "#ff8fae", "x": 0.3, "z": 0.2, "scale": 0.7},
            {"kind": "star",  "color": "#a4d9ff", "x": -0.25, "z": -0.15, "scale": 0.6},
            {"kind": "flower","color": "#ff6bb5", "x": 0.4, "z": -0.3, "scale": 0.8},
            {"kind": "flower","color": "#c29bff", "x": -0.35, "z": 0.25, "scale": 0.8},
        ],
        "background": "#2a1638",
        "stand_kind": "rose_gold_modern",
    },
    "princess_castle": {
        "title": "Princess Castle",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#ffdff0", "finish": "fondant"},
            {"height": 0.55, "radius": 0.9, "color": "#ffc9e2", "finish": "fondant"},
            {"height": 0.8,  "radius": 0.4, "color": "#ff8fbf", "finish": "fondant",
             "shape": "round"},   # tall narrow spire
        ],
        "toppers": [
            {"kind": "tower_spire", "color": "#d46a99", "x": 0,    "z": 0,    "scale": 1.3},
            {"kind": "tower_spire", "color": "#d46a99", "x": 0.35, "z": 0.35, "scale": 0.7},
            {"kind": "tower_spire", "color": "#d46a99", "x": -0.35,"z": 0.35, "scale": 0.7},
            {"kind": "crown",       "color": "#ffd966", "x": 0.5,  "z": 0,    "scale": 0.6},
        ],
        "background": "#2a0a2a",
        "stand_kind": "gold_ornate",
    },
    "number_birthday": {
        "title": "Number / Letter — Single Tier",
        "tiers": [
            {"height": 0.6, "radius": 1.1, "color": "#fff5d6", "finish": "buttercream",
             "fillings": [
                {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.16, "cost_per_serving_usd": 0.55},
                {"name": "Strawberry jam", "color": "#e74c3c", "height": 0.05, "cost_per_serving_usd": 0.25},
                {"name": "Vanilla sponge", "color": "#f5d9a7", "height": 0.16, "cost_per_serving_usd": 0.55},
             ]},
        ],
        "toppers": [
            {"kind": "number", "label": "5", "color": "#c8a97e", "x": 0,   "z": 0,   "scale": 1.6},
            {"kind": "candle", "color": "#ff6b6b", "x": -0.45, "z": 0.35, "scale": 1.0},
            {"kind": "candle", "color": "#4ecdc4", "x": 0.45,  "z": 0.35, "scale": 1.0},
            {"kind": "candle", "color": "#ffe066", "x": -0.45, "z": -0.35,"scale": 1.0},
            {"kind": "candle", "color": "#ff8cc8", "x": 0.45,  "z": -0.35,"scale": 1.0},
            {"kind": "star",   "color": "#c8a97e", "x": 0,     "z": 0.6,  "scale": 0.7},
        ],
    },
    "rainbow_sprinkle": {
        "title": "Rainbow Sprinkle Party",
        "tiers": [
            {"height": 0.45, "radius": 1.15, "color": "#ff6b6b", "finish": "buttercream"},
            {"height": 0.45, "radius": 0.95, "color": "#ffd166", "finish": "buttercream"},
            {"height": 0.45, "radius": 0.75, "color": "#06d6a0", "finish": "buttercream"},
            {"height": 0.45, "radius": 0.55, "color": "#118ab2", "finish": "buttercream"},
        ],
        "toppers": [
            {"kind": "balloon", "color": "#ff6b6b", "x": 0.1,  "z": 0,    "scale": 1.1},
            {"kind": "balloon", "color": "#ffd166", "x": -0.2, "z": 0.1,  "scale": 0.9},
            {"kind": "balloon", "color": "#06d6a0", "x": 0.25, "z": -0.15,"scale": 1.0},
            {"kind": "balloon", "color": "#118ab2", "x": -0.05,"z": -0.25,"scale": 0.85},
            {"kind": "star",    "color": "#c8a97e", "x": 0,    "z": 0,    "scale": 0.6},
        ],
        "background": "#1a1033",
    },

    # ─── Phase C · Designer Signature Presets (iter156) ───
    "signature_ruffle_ombre": {
        "title": "Blush Ruffle Ombré",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#ffe8ef", "finish": "buttercream", "shape": "round",
             "piping": [{"kind": "ruffle", "band": "bottom", "color": "#ffd4e1", "scale": 1.2}]},
            {"height": 0.5,  "radius": 0.9, "color": "#fbc8d4", "finish": "buttercream", "shape": "round",
             "piping": [{"kind": "ruffle", "band": "bottom", "color": "#f5a8bc", "scale": 1.1},
                        {"kind": "ruffle", "band": "top", "color": "#f5a8bc", "scale": 1.0}]},
            {"height": 0.45, "radius": 0.6, "color": "#e78eaa", "finish": "buttercream", "shape": "round",
             "piping": [{"kind": "ruffle", "band": "bottom", "color": "#d66f8e", "scale": 1.0}]},
        ],
        "flowers": [{"arrangement_id": "ranunculus_cluster", "placement": "top", "scale": 1.0}],
        "toppers": [{"kind": "flower", "color": "#fff5f5", "x": 0, "z": 0, "scale": 1.1}],
        "stand_kind": "rose_gold_modern",
        "background": "#2a1825",
    },
    "signature_orchid_cascade": {
        "title": "Ivory Orchid Cascade",
        "tiers": [
            {"height": 0.6, "radius": 1.3, "color": "#faf5ec", "finish": "fondant", "shape": "round"},
            {"height": 0.55, "radius": 1.0, "color": "#faf5ec", "finish": "fondant", "shape": "round"},
            {"height": 0.5, "radius": 0.7, "color": "#faf5ec", "finish": "fondant", "shape": "round"},
            {"height": 0.45, "radius": 0.45, "color": "#faf5ec", "finish": "fondant", "shape": "round"},
        ],
        "flowers": [
            {"arrangement_id": "orchid_spray", "placement": "cascade", "scale": 1.1},
            {"arrangement_id": "orchid_spray", "placement": "tier", "tier_index": 1, "scale": 0.9},
        ],
        "toppers": [],
        "stand_kind": "gold_ornate",
        "background": "#1a1210",
    },
    "signature_pastel_cascade": {
        "title": "Classic Pastel Cascade",
        "tiers": [
            {"height": 0.55, "radius": 1.25, "color": "#fff9f1", "finish": "buttercream", "shape": "round"},
            {"height": 0.5, "radius": 0.95, "color": "#fff4e7", "finish": "buttercream", "shape": "round"},
            {"height": 0.45, "radius": 0.65, "color": "#ffeed8", "finish": "buttercream", "shape": "round"},
        ],
        "flowers": [
            {"arrangement_id": "cascading_roses", "placement": "cascade", "scale": 1.15, "palette_override": ["#ffe1ec", "#fcd1db", "#e8b4c2", "#ffffff", "#6b8e57"]},
            {"arrangement_id": "sugar_peonies", "placement": "top", "scale": 1.0},
        ],
        "stand_kind": "classic_silver",
        "background": "#241a20",
    },
    "signature_couture_architectural": {
        "title": "Couture Architectural",
        "tiers": [
            {"height": 0.7, "radius": 1.2, "color": "#ffffff", "finish": "fondant", "shape": "hex"},
            {"height": 0.6, "radius": 0.9, "color": "#fafafa", "finish": "fondant", "shape": "hex",
             "piping": [{"kind": "scroll", "band": "middle", "color": "#e8c384", "scale": 0.9}]},
            {"height": 0.55, "radius": 0.6, "color": "#ffffff", "finish": "mirror", "shape": "round"},
        ],
        "flowers": [{"arrangement_id": "dahlia_crown", "placement": "top", "scale": 0.85, "palette_override": ["#c8a97e", "#d4b896", "#2a9d8f"]}],
        "stand_kind": "marble_platform",
        "background": "#181820",
    },
    "signature_ethereal_lavender": {
        "title": "Ethereal Lavender",
        "tiers": [
            {"height": 0.5, "radius": 1.15, "color": "#f0e4ff", "finish": "buttercream", "shape": "round"},
            {"height": 0.45, "radius": 0.85, "color": "#e4d4ff", "finish": "buttercream", "shape": "round"},
            {"height": 0.4, "radius": 0.55, "color": "#d6c3ff", "finish": "buttercream", "shape": "round",
             "piping": [{"kind": "bead", "band": "bottom", "color": "#ffffff", "scale": 0.9}]},
        ],
        "flowers": [
            {"arrangement_id": "sugar_peonies", "placement": "crown", "scale": 0.9, "palette_override": ["#ffecd9", "#e8d0ff", "#d6c3ff", "#c8a97e"]},
            {"arrangement_id": "eucalyptus_greenery", "placement": "cascade", "scale": 0.9},
        ],
        "stand_kind": "crystal_pedestal",
        "background": "#1a1428",
    },
    "signature_bold_drip": {
        "title": "Bold Drip & Balloons",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#ff6bb5", "finish": "drip", "shape": "round"},
            {"height": 0.5, "radius": 0.9, "color": "#ffd166", "finish": "drip", "shape": "round"},
            {"height": 0.45, "radius": 0.6, "color": "#06d6a0", "finish": "drip", "shape": "round"},
        ],
        "flowers": [],
        "toppers": [
            {"kind": "balloon", "color": "#ff6bb5", "x": 0.1,  "z": 0.0,  "scale": 1.2},
            {"kind": "balloon", "color": "#ffd166", "x": -0.2, "z": 0.1,  "scale": 1.0},
            {"kind": "balloon", "color": "#06d6a0", "x": 0.25, "z": -0.15,"scale": 1.1},
            {"kind": "star",    "color": "#ffe066", "x": 0.4,  "z": 0.3,  "scale": 0.7},
            {"kind": "star",    "color": "#ff6bb5", "x": -0.35,"z": -0.2, "scale": 0.7},
        ],
        "stand_kind": "black_matte",
        "background": "#0f0a1e",
    },
    "signature_pressed_botanical": {
        "title": "Pressed Botanical Garden",
        "tiers": [
            {"height": 0.6, "radius": 1.2, "color": "#f6ede1", "finish": "semi-naked", "shape": "round"},
        ],
        "flowers": [
            {"arrangement_id": "eucalyptus_greenery", "placement": "tier", "tier_index": 0, "scale": 0.8},
            {"arrangement_id": "garden_mix", "placement": "top", "scale": 0.85, "palette_override": ["#c9d6b5", "#e8d0a0", "#d4a574", "#f4e3c9", "#8b6a4a"]},
        ],
        "stand_kind": "rustic_wood",
        "background": "#1e1812",
    },
    "signature_sculpted_novelty": {
        "title": "Sculpted Novelty",
        "tiers": [
            {"height": 1.1, "radius": 0.85, "color": "#8b4513", "finish": "fondant", "shape": "round"},
        ],
        "flowers": [],
        "toppers": [
            {"kind": "figurine", "label": "book", "color": "#d4af37", "x": 0, "z": 0, "scale": 1.6},
            {"kind": "star", "color": "#d4af37", "x": 0.3, "z": 0.3, "scale": 0.8},
        ],
        "stand_kind": "black_matte",
        "background": "#0e0c08",
    },
    "signature_sculptural_greens": {
        "title": "Sculptural Greens",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#c9d6b5", "finish": "fondant", "shape": "topsy_turvy", "wave": 0.1},
            {"height": 0.5, "radius": 0.85, "color": "#a8c997", "finish": "fondant", "shape": "topsy_turvy", "wave": 0.12},
            {"height": 0.45, "radius": 0.55, "color": "#87a76f", "finish": "fondant", "shape": "round"},
        ],
        "flowers": [{"arrangement_id": "eucalyptus_greenery", "placement": "cascade", "scale": 1.1}],
        "toppers": [{"kind": "flower", "color": "#ffffff", "x": 0, "z": 0, "scale": 1.2}],
        "stand_kind": "rustic_wood",
        "background": "#15201b",
    },
    "signature_geometric_statement": {
        "title": "Geometric Statement",
        "tiers": [
            {"height": 0.55, "radius": 1.2, "color": "#1a1a40", "finish": "fondant", "shape": "square"},
            {"height": 0.5, "radius": 0.9, "color": "#3a5faf", "finish": "fondant", "shape": "round"},
            {"height": 0.45, "radius": 0.6, "color": "#d4af37", "finish": "mirror", "shape": "round"},
        ],
        "flowers": [],
        "toppers": [
            {"kind": "star", "color": "#d4af37", "x": 0, "z": 0, "scale": 1.4},
            {"kind": "star", "color": "#ffd966", "x": 0.3, "z": 0.2, "scale": 0.8},
            {"kind": "star", "color": "#ffd966", "x": -0.3, "z": -0.2, "scale": 0.8},
        ],
        "stand_kind": "gold_ornate",
        "background": "#0a0818",
    },
}

@router.get("/templates")
async def list_templates():
    return {"templates": [{"id": k, **{kk: vv for kk, vv in v.items() if kk != "tiers"}} for k, v in TEMPLATES.items()]}


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    t = TEMPLATES.get(template_id)
    if not t:
        raise HTTPException(404, "template not found")
    return t
