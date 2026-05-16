"""
Cake Designer v3.0 — Asset Library Backend
==========================================
Templates, textures, decorations, piping patterns, stands, and
order generation for the 3D Cake Designer.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from uuid import uuid4
from database import db
from typing import Optional

router = APIRouter(prefix="/api/cake-assets", tags=["cake-assets"])
_uid = lambda: str(uuid4())[:8]
_now = lambda: datetime.now(timezone.utc).isoformat()

# ═══════════════════════════════════
#  TEXTURE LIBRARY
# ═══════════════════════════════════
TEXTURES = [
    {"id": "tex-buttercream-smooth", "name": "Buttercream Smooth", "category": "frosting", "roughness": 0.55, "metalness": 0.02, "color": "#ffffff", "preview_desc": "Smooth buttercream finish"},
    {"id": "tex-buttercream-ridged", "name": "Buttercream Ridged", "category": "frosting", "roughness": 0.7, "metalness": 0.02, "color": "#fffef5", "preview_desc": "Horizontal ridges from offset spatula"},
    {"id": "tex-fondant-smooth", "name": "Fondant Smooth", "category": "frosting", "roughness": 0.25, "metalness": 0.05, "color": "#ffffff", "preview_desc": "Flawless fondant wrap"},
    {"id": "tex-ganache-mirror", "name": "Mirror Glaze", "category": "frosting", "roughness": 0.08, "metalness": 0.3, "color": "#3d1c0a", "preview_desc": "Ultra-reflective mirror glaze coating"},
    {"id": "tex-ganache-drip", "name": "Ganache Drip", "category": "frosting", "roughness": 0.2, "metalness": 0.15, "color": "#2a1506", "preview_desc": "Chocolate ganache with drip effect"},
    {"id": "tex-naked-crumb", "name": "Naked Crumb Coat", "category": "frosting", "roughness": 0.9, "metalness": 0, "color": "#f5e6c8", "preview_desc": "Thin crumb coat showing cake layers"},
    {"id": "tex-metallic-gold", "name": "Metallic Gold", "category": "frosting", "roughness": 0.12, "metalness": 0.7, "color": "#d4a843", "preview_desc": "Edible gold metallic finish"},
    {"id": "tex-metallic-silver", "name": "Metallic Silver", "category": "frosting", "roughness": 0.12, "metalness": 0.7, "color": "#c0c0c0", "preview_desc": "Edible silver metallic finish"},
    {"id": "tex-metallic-rose", "name": "Rose Gold", "category": "frosting", "roughness": 0.15, "metalness": 0.6, "color": "#b76e79", "preview_desc": "Rose gold metallic finish"},
    {"id": "tex-marble-white", "name": "White Marble", "category": "frosting", "roughness": 0.25, "metalness": 0.08, "color": "#f0ede8", "preview_desc": "Fondant with marble veining effect"},
    {"id": "tex-marble-black", "name": "Black Marble", "category": "frosting", "roughness": 0.2, "metalness": 0.1, "color": "#1a1a2e", "preview_desc": "Dark marble with gold veining"},
    {"id": "tex-watercolor", "name": "Watercolor Wash", "category": "frosting", "roughness": 0.4, "metalness": 0.02, "color": "#e8d5f0", "preview_desc": "Soft watercolor brushstroke effect"},
    {"id": "tex-ombre-sunset", "name": "Ombre Sunset", "category": "frosting", "roughness": 0.5, "metalness": 0.02, "color": "#ff9a56", "preview_desc": "Gradient from peach to coral"},
    {"id": "tex-geode-crystal", "name": "Geode Crystal", "category": "special", "roughness": 0.15, "metalness": 0.4, "color": "#7b68ee", "preview_desc": "Crystal geode breakaway effect"},
    {"id": "tex-concrete", "name": "Concrete Industrial", "category": "special", "roughness": 0.85, "metalness": 0.05, "color": "#8e8e8e", "preview_desc": "Modern concrete texture finish"},
]

# ═══════════════════════════════════
#  PIPING PATTERNS
# ═══════════════════════════════════
PIPING_PATTERNS = [
    {"id": "pipe-shell", "name": "Shell Border", "category": "border", "complexity": 1, "time_min": 15, "tip": "#21"},
    {"id": "pipe-rope", "name": "Rope Border", "category": "border", "complexity": 2, "time_min": 20, "tip": "#18"},
    {"id": "pipe-bead", "name": "Bead Border", "category": "border", "complexity": 1, "time_min": 10, "tip": "#10"},
    {"id": "pipe-rosette", "name": "Rosette Border", "category": "border", "complexity": 2, "time_min": 25, "tip": "#1M"},
    {"id": "pipe-basket", "name": "Basket Weave", "category": "full_coverage", "complexity": 4, "time_min": 90, "tip": "#47"},
    {"id": "pipe-drop-strings", "name": "Drop Strings", "category": "accent", "complexity": 3, "time_min": 45, "tip": "#3"},
    {"id": "pipe-cornelli", "name": "Cornelli Lace", "category": "full_coverage", "complexity": 5, "time_min": 120, "tip": "#1"},
    {"id": "pipe-ruffle", "name": "Ruffle", "category": "accent", "complexity": 3, "time_min": 40, "tip": "#104"},
    {"id": "pipe-leaf", "name": "Leaf Border", "category": "border", "complexity": 2, "time_min": 20, "tip": "#352"},
    {"id": "pipe-star-border", "name": "Star Border", "category": "border", "complexity": 1, "time_min": 12, "tip": "#32"},
    {"id": "pipe-scroll", "name": "Scroll Work", "category": "accent", "complexity": 4, "time_min": 60, "tip": "#5"},
    {"id": "pipe-zigzag", "name": "Zigzag Border", "category": "border", "complexity": 1, "time_min": 10, "tip": "#16"},
]

# ═══════════════════════════════════
#  FLOWER ARRANGEMENTS
# ═══════════════════════════════════
FLOWERS = [
    {"id": "flw-cascade-rose", "name": "Cascading Roses", "style": "cascade", "count": "15-25", "colors": ["#e8555a", "#ff9fb0", "#ffffff"], "time_hr": 4, "cost_per": 3.50},
    {"id": "flw-sugar-peony", "name": "Sugar Peonies", "style": "cluster", "count": "5-8", "colors": ["#f0a0b0", "#fff0f3", "#d4768a"], "time_hr": 6, "cost_per": 8.00},
    {"id": "flw-orchid-spray", "name": "Orchid Spray", "style": "spray", "count": "3-5", "colors": ["#d0a0e0", "#ffffff", "#9b59b6"], "time_hr": 5, "cost_per": 10.00},
    {"id": "flw-tropical", "name": "Tropical Arrangement", "style": "cluster", "count": "8-12", "colors": ["#e74c3c", "#f39c12", "#27ae60"], "time_hr": 3, "cost_per": 4.00},
    {"id": "flw-garden-mix", "name": "Garden Mix", "style": "scattered", "count": "20-30", "colors": ["#e8555a", "#f0a0b0", "#ffffff", "#90ee90", "#dda0dd"], "time_hr": 5, "cost_per": 2.50},
    {"id": "flw-ranunculus", "name": "Ranunculus Cluster", "style": "cluster", "count": "8-12", "colors": ["#ff7f7f", "#ffd700", "#ffffff"], "time_hr": 4, "cost_per": 5.00},
    {"id": "flw-dahlia", "name": "Dahlia Crown", "style": "crown", "count": "5-7", "colors": ["#c0392b", "#e74c3c", "#ff6b6b"], "time_hr": 5, "cost_per": 7.00},
    {"id": "flw-greenery", "name": "Eucalyptus Greenery", "style": "wrap", "count": "10-15", "colors": ["#2d5a27", "#6b8e23", "#8fbc8f"], "time_hr": 1.5, "cost_per": 1.50},
]

# ═══════════════════════════════════
#  CAKE TEMPLATES
# ═══════════════════════════════════
TEMPLATES = [
    {"id": "tpl-classic-wedding-3", "name": "Classic Wedding 3-Tier", "category": "wedding", "tiers": [
        {"shape": "round", "diameter": 12, "height": 5, "frostingStyle": "fondant", "frostingColor": "#ffffff", "flavor": "Vanilla Bean", "fillingFlavor": "Raspberry Jam"},
        {"shape": "round", "diameter": 9, "height": 5, "frostingStyle": "fondant", "frostingColor": "#ffffff", "flavor": "Vanilla Bean", "fillingFlavor": "Lemon Curd"},
        {"shape": "round", "diameter": 6, "height": 5, "frostingStyle": "fondant", "frostingColor": "#ffffff", "flavor": "Champagne", "fillingFlavor": "Swiss Meringue"},
    ], "decorations": ["Cascading Roses", "Pearl Cluster"], "description": "Timeless elegance — white fondant with cascading florals"},
    {"id": "tpl-rustic-naked", "name": "Rustic Naked Cake", "category": "wedding", "tiers": [
        {"shape": "round", "diameter": 10, "height": 4, "frostingStyle": "naked", "frostingColor": "#f5e6c8", "flavor": "Carrot", "fillingFlavor": "Cream Cheese"},
        {"shape": "round", "diameter": 8, "height": 4, "frostingStyle": "naked", "frostingColor": "#f5e6c8", "flavor": "Vanilla Bean", "fillingFlavor": "Strawberry Mousse"},
    ], "decorations": ["Eucalyptus Greenery", "Garden Mix"], "description": "Farm-to-table charm — exposed layers with fresh florals"},
    {"id": "tpl-modern-geometric", "name": "Modern Geometric", "category": "wedding", "tiers": [
        {"shape": "hexagon", "diameter": 10, "height": 5, "frostingStyle": "fondant", "frostingColor": "#1a1a2e", "flavor": "Chocolate", "fillingFlavor": "Hazelnut Praline"},
        {"shape": "hexagon", "diameter": 8, "height": 5, "frostingStyle": "metallic", "frostingColor": "#d4a843", "flavor": "Chocolate", "fillingFlavor": "Salted Caramel"},
    ], "decorations": ["Gold Star", "Gold Leaf"], "description": "Bold geometry — black fondant with gold metallic accents"},
    {"id": "tpl-mad-hatter", "name": "Mad Hatter Tea Party", "category": "novelty", "tiers": [
        {"shape": "round", "diameter": 10, "height": 4, "frostingStyle": "fondant", "frostingColor": "#ff6b6b", "flavor": "Funfetti", "fillingFlavor": "Vanilla Custard", "tiltAngle": 0},
        {"shape": "madHatter", "diameter": 8, "height": 5, "frostingStyle": "fondant", "frostingColor": "#4ecdc4", "flavor": "Vanilla Bean", "fillingFlavor": "Lemon Curd", "tiltAngle": 8},
        {"shape": "madHatter", "diameter": 6, "height": 4, "frostingStyle": "fondant", "frostingColor": "#ffe66d", "flavor": "Lemon", "fillingFlavor": "Passionfruit", "tiltAngle": -10},
    ], "decorations": ["Rainbow", "Custom Text"], "description": "Whimsical tilted layers — Alice in Wonderland inspired"},
    {"id": "tpl-princess-castle", "name": "Princess Castle", "category": "kids", "tiers": [
        {"shape": "round", "diameter": 12, "height": 5, "frostingStyle": "fondant", "frostingColor": "#ffb6c1", "flavor": "Strawberry", "fillingFlavor": "Strawberry Mousse"},
        {"shape": "round", "diameter": 8, "height": 6, "frostingStyle": "fondant", "frostingColor": "#dda0dd", "flavor": "Vanilla Bean", "fillingFlavor": "Vanilla Custard"},
        {"shape": "round", "diameter": 5, "height": 4, "frostingStyle": "fondant", "frostingColor": "#ffb6c1", "flavor": "Vanilla Bean", "fillingFlavor": "Cream Cheese"},
    ], "decorations": ["Gold Star", "Pearl Cluster", "Rose"], "description": "Fairytale princess castle in pink and purple"},
    {"id": "tpl-dinosaur", "name": "Dinosaur Adventure", "category": "kids", "tiers": [
        {"shape": "round", "diameter": 10, "height": 5, "frostingStyle": "buttercream", "frostingColor": "#2ecc71", "flavor": "Chocolate", "fillingFlavor": "Chocolate Ganache"},
    ], "decorations": ["Rainbow", "Custom Text"], "description": "Green jungle cake with dino toppers"},
    {"id": "tpl-unicorn", "name": "Unicorn Magic", "category": "kids", "tiers": [
        {"shape": "round", "diameter": 8, "height": 6, "frostingStyle": "ombre", "frostingColor": "#e8d5f0", "flavor": "Funfetti", "fillingFlavor": "Vanilla Custard"},
    ], "decorations": ["Rainbow", "Gold Star", "Peony"], "description": "Pastel rainbow ombre with gold horn"},
    {"id": "tpl-number-cake", "name": "Number/Letter Cake", "category": "kids", "tiers": [
        {"shape": "sheet", "diameter": 8, "height": 3, "frostingStyle": "buttercream", "frostingColor": "#ff9fb0", "flavor": "Vanilla Bean", "fillingFlavor": "Cream Cheese"},
    ], "decorations": ["Rose", "Peony", "Pearl Cluster"], "description": "Number-shaped cake with macaron and flower decorations"},
    {"id": "tpl-drip-chocolate", "name": "Chocolate Drip", "category": "celebration", "tiers": [
        {"shape": "round", "diameter": 8, "height": 6, "frostingStyle": "drip", "frostingColor": "#3d1c0a", "flavor": "Chocolate", "fillingFlavor": "Chocolate Ganache"},
    ], "decorations": ["Choc Drip", "Gold Leaf"], "description": "Rich chocolate with ganache drip and gold leaf"},
    {"id": "tpl-mirror-glaze", "name": "Mirror Glaze Showpiece", "category": "celebration", "tiers": [
        {"shape": "round", "diameter": 8, "height": 6, "frostingStyle": "ganache", "frostingColor": "#7b68ee", "flavor": "Chocolate", "fillingFlavor": "Passionfruit"},
    ], "decorations": ["Silver Star", "Pearl Cluster"], "description": "Galaxy mirror glaze with iridescent finish"},
    {"id": "tpl-christmas", "name": "Christmas Elegance", "category": "seasonal", "tiers": [
        {"shape": "round", "diameter": 10, "height": 5, "frostingStyle": "buttercream", "frostingColor": "#ffffff", "flavor": "Red Velvet", "fillingFlavor": "Cream Cheese"},
        {"shape": "round", "diameter": 7, "height": 4, "frostingStyle": "fondant", "frostingColor": "#c0392b", "flavor": "Chocolate", "fillingFlavor": "Salted Caramel"},
    ], "decorations": ["Gold Star", "Pearl Cluster"], "description": "Red and white with gold accents"},
    {"id": "tpl-halloween", "name": "Halloween Spooky", "category": "seasonal", "tiers": [
        {"shape": "round", "diameter": 9, "height": 5, "frostingStyle": "fondant", "frostingColor": "#1a1a2e", "flavor": "Chocolate", "fillingFlavor": "Chocolate Ganache"},
    ], "decorations": ["White Drip", "Custom Text"], "description": "Black fondant with white drip — spooky elegance"},
]

# ═══════════════════════════════════
#  STAND GALLERY
# ═══════════════════════════════════
STANDS = [
    {"id": "stand-crystal", "name": "Crystal Pedestal", "color": "#e8e8f0", "metalness": 0.7, "roughness": 0.1, "price": 85},
    {"id": "stand-silver", "name": "Silver Classic", "color": "#c0c0c0", "metalness": 0.6, "roughness": 0.15, "price": 45},
    {"id": "stand-gold", "name": "Gold Ornate", "color": "#d4a843", "metalness": 0.7, "roughness": 0.12, "price": 65},
    {"id": "stand-rose-gold", "name": "Rose Gold Modern", "color": "#b76e79", "metalness": 0.6, "roughness": 0.15, "price": 55},
    {"id": "stand-wood-rustic", "name": "Rustic Wood Slice", "color": "#8b6914", "metalness": 0, "roughness": 0.85, "price": 25},
    {"id": "stand-acrylic-clear", "name": "Clear Acrylic Riser", "color": "#f0f0f0", "metalness": 0.1, "roughness": 0.08, "price": 35},
    {"id": "stand-tiered-metal", "name": "Tiered Metal Stand", "color": "#c0c0c0", "metalness": 0.5, "roughness": 0.2, "price": 95},
    {"id": "stand-floating", "name": "Floating Illusion", "color": "#e0e0e0", "metalness": 0.3, "roughness": 0.1, "price": 120},
    {"id": "stand-marble", "name": "Marble Platform", "color": "#f0ede8", "metalness": 0.1, "roughness": 0.3, "price": 75},
    {"id": "stand-black-matte", "name": "Black Matte Modern", "color": "#1a1a1a", "metalness": 0.05, "roughness": 0.7, "price": 40},
]


# ═══════════════════════════════════
#  ADVANCED TOOLS (10 pro add-ons)
# ═══════════════════════════════════
ADVANCED_TOOLS = [
    {
        "id": "tool-airbrush", "name": "Airbrush System",
        "category": "coloring", "icon": "spray-can", "ui": "airbrush_3d_modal",
        "description": "3D airbrush with interchangeable nozzle tips. Stylus or mouse. Adjustable pressure, flow, opacity.",
        "inputs": ["color", "nozzle", "pressure", "flow", "opacity"],
        "consumables_per_cake": 1.25,  # USD food-safe color cost
        "labor_min": 12,
    },
    {
        "id": "tool-fondant-drape", "name": "Fondant Draping & Impression Mats",
        "category": "sculpting", "icon": "layers",
        "description": "Drape or roll fondant with silicone impression mats — lace, damask, quilt, basketweave, rustic linen.",
        "patterns": ["lace", "damask", "quilt-diamond", "basketweave", "linen", "botanical"],
        "consumables_per_cake": 4.50,
        "labor_min": 35,
    },
    {
        "id": "tool-silicone-molds", "name": "Silicone Detail Molds",
        "category": "sculpting", "icon": "flower",
        "description": "Pre-made molds for hyper-detailed flowers, lace medallions, cameos, jewels, baroque scrolls.",
        "molds": ["peony", "rose-open", "lace-medallion", "cameo-oval", "baroque-scroll", "jewel-cluster", "butterfly", "feather"],
        "consumables_per_cake": 2.25,
        "labor_min": 18,
    },
    {
        "id": "tool-isomalt", "name": "Isomalt Sugar Structures",
        "category": "showpiece", "icon": "gem",
        "description": "Hand-poured isomalt crystals, geodes, shards, ribbons, stained glass, bubble cages.",
        "forms": ["geode-amethyst", "geode-citrine", "crystal-shards", "ribbon-bow", "stained-glass-panel", "bubble-cage"],
        "consumables_per_cake": 6.00,
        "labor_min": 45,
    },
    {
        "id": "tool-stencils", "name": "Pattern Stencils",
        "category": "coloring", "icon": "grid",
        "description": "Royal-icing or airbrush stencil overlays. Monogram, floral, geometric, damask, art-deco, Moroccan.",
        "patterns": ["monogram", "floral-vine", "geometric-hex", "damask", "art-deco", "moroccan-tile", "quatrefoil"],
        "consumables_per_cake": 1.00,
        "labor_min": 10,
    },
    {
        "id": "tool-modeling-chocolate", "name": "Modeling Chocolate Sculpting",
        "category": "sculpting", "icon": "hammer",
        "description": "Sculpt figurines, bows, ruffles, draping with modeling chocolate. Holds fine detail.",
        "forms": ["figurine", "ruffle-drape", "bow", "rose-sculpt", "leaves"],
        "consumables_per_cake": 4.25,
        "labor_min": 40,
    },
    {
        "id": "tool-luster-dust", "name": "Luster & Pearl Metallic Dust",
        "category": "coloring", "icon": "sparkle",
        "description": "Edible metallic dusts — gold, silver, rose-gold, pearl, iridescent, antique bronze.",
        "shades": ["super-gold", "sterling-silver", "rose-gold", "pearl-white", "iridescent", "antique-bronze", "champagne", "platinum"],
        "consumables_per_cake": 2.75,
        "labor_min": 8,
    },
    {
        "id": "tool-edible-image-print", "name": "Edible Image Printing",
        "category": "print", "icon": "image",
        "description": "Upload client photos or logos. Prints on sugar sheet, frosting sheet, or wafer paper with edible inks.",
        "supports": ["client-photo", "logo", "custom-design"],
        "sheet_sizes": ["A4", "A5", "Letter", "Round-8in"],
        "consumables_per_cake": 3.50,
        "labor_min": 5,
    },
    {
        "id": "tool-buttercream-brush", "name": "Buttercream Palette Brushes",
        "category": "painting", "icon": "brush",
        "description": "Palette-knife and brush painting direct on buttercream. Impressionist florals, abstract art, watercolor wash.",
        "brushes": ["palette-knife", "flat-brush", "fan-brush", "round-detail", "stippling"],
        "consumables_per_cake": 0.50,
        "labor_min": 25,
    },
    {
        "id": "tool-drip-control", "name": "Drip Effects (Viscosity Control)",
        "category": "finishing", "icon": "droplet",
        "description": "Fine-tuned drip viscosity. Chocolate, caramel, white-choc, ganache, metallic drip, watercolor drip.",
        "drip_types": ["dark-chocolate", "white-chocolate", "salted-caramel", "ruby-chocolate", "metallic-gold", "watercolor"],
        "viscosity_range": [0.2, 1.0],
        "consumables_per_cake": 1.75,
        "labor_min": 10,
    },
]

AIRBRUSH_NOZZLES = [
    {"id": "noz-fine",     "name": "Fine Detail (0.2mm)",   "spread": 0.04, "falloff": 0.85, "opacity": 0.75, "best_for": "Lettering, fine veining, eye detail"},
    {"id": "noz-medium",   "name": "Medium (0.3mm)",         "spread": 0.09, "falloff": 0.70, "opacity": 0.80, "best_for": "General shading, gradients, watercolor wash"},
    {"id": "noz-broad",    "name": "Broad Coverage (0.5mm)", "spread": 0.16, "falloff": 0.55, "opacity": 0.85, "best_for": "Full-tier color, ombré bases, sunset fades"},
    {"id": "noz-splatter", "name": "Splatter / Stipple",     "spread": 0.14, "falloff": 0.40, "opacity": 0.95, "best_for": "Galaxy effect, speckle, texture overlays", "splatter": True},
]

# ═══════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════

@router.get("/textures")
async def get_textures(category: Optional[str] = None):
    q = [t for t in TEXTURES if not category or t["category"] == category]
    return {"textures": q, "total": len(q), "categories": list(set(t["category"] for t in TEXTURES))}

@router.get("/piping")
async def get_piping(category: Optional[str] = None):
    q = [p for p in PIPING_PATTERNS if not category or p["category"] == category]
    return {"patterns": q, "total": len(q), "categories": list(set(p["category"] for p in PIPING_PATTERNS))}

@router.get("/flowers")
async def get_flowers():
    return {"flowers": FLOWERS, "total": len(FLOWERS), "styles": list(set(f["style"] for f in FLOWERS))}

@router.get("/templates")
async def get_templates(category: Optional[str] = None):
    q = [t for t in TEMPLATES if not category or t["category"] == category]
    return {"templates": q, "total": len(q), "categories": list(set(t["category"] for t in TEMPLATES))}

@router.get("/stands")
async def get_stands():
    return {"stands": STANDS, "total": len(STANDS)}


@router.get("/advanced-tools")
async def get_advanced_tools(category: Optional[str] = None):
    q = [t for t in ADVANCED_TOOLS if not category or t["category"] == category]
    return {"tools": q, "total": len(q), "categories": sorted({t["category"] for t in ADVANCED_TOOLS})}


@router.get("/airbrush-nozzles")
async def get_airbrush_nozzles():
    return {"nozzles": AIRBRUSH_NOZZLES, "total": len(AIRBRUSH_NOZZLES)}

@router.post("/order")
async def create_cake_order(body: dict = {}):
    """Generate a print-ready cake order from a design."""
    design = body.get("design", {})
    client = body.get("client", {})
    tiers = design.get("tiers", [])
    decorations = design.get("decorations", [])

    # Calculate full costing
    total_servings = 0
    total_food = 0
    total_labor_hrs = 0
    tier_details = []
    for i, t in enumerate(tiers):
        vol = 3.14159 * (t.get("diameter", 8) / 2) ** 2 * t.get("height", 4) if t.get("shape") in ("round", "madHatter", "topsy", "hexagon", "heart") else t.get("diameter", 8) ** 2 * t.get("height", 4)
        servings = round(vol / 12)
        total_servings += servings
        fc = {"Chocolate": 0.08, "Red Velvet": 0.09, "Matcha": 0.12}.get(t.get("flavor", ""), 0.06)
        frc = {"fondant": 0.12, "ganache": 0.10, "metallic": 0.15}.get(t.get("frostingStyle", ""), 0.05)
        food = round(vol * (fc + frc), 2)
        labor = servings * 0.04 + t.get("fillingLayers", 1) * 0.25
        if t.get("shape") in ("madHatter", "topsy"):
            labor += 1.5
        total_food += food
        total_labor_hrs += labor
        tier_details.append({
            "tier": i + 1, "shape": t.get("shape"), "diameter": t.get("diameter"),
            "height": t.get("height"), "flavor": t.get("flavor"),
            "frosting": t.get("frostingStyle"), "frosting_color": t.get("frostingColor"),
            "filling": t.get("fillingFlavor"), "servings": servings,
            "food_cost": food, "labor_hrs": round(labor, 1),
        })

    dec_cost = len(decorations) * 2.50
    dec_labor = len(decorations) * 0.15
    total_food += dec_cost
    total_labor_hrs += dec_labor
    labor_cost = round(total_labor_hrs * 28, 2)
    total_cost = round(total_food + labor_cost, 2)
    suggested_price = round(total_cost * 3.2, 2)

    order = {
        "id": f"order-{_uid()}",
        "order_number": f"CK-{_uid().upper()}",
        "client": client,
        "design_name": design.get("name", "Custom Cake"),
        "version": design.get("version", "V001"),
        "tiers": tier_details,
        "decorations": [{"name": d.get("name"), "type": d.get("type"), "color": d.get("color")} for d in decorations],
        "stand": design.get("stand", "pedestal"),
        "total_servings": total_servings,
        "costing": {
            "food_cost": round(total_food, 2),
            "labor_hours": round(total_labor_hrs, 1),
            "labor_cost": labor_cost,
            "total_cost": total_cost,
            "suggested_price": suggested_price,
            "per_serving": round(suggested_price / max(total_servings, 1), 2),
        },
        "production_notes": f"Total assembly time: {round(total_labor_hrs, 1)} hours. Fire time: Day before event. "
                           f"{'Structural dowels required for multi-tier. ' if len(tiers) > 1 else ''}"
                           f"{'Fondant work 2 days ahead. ' if any(t.get('frostingStyle') == 'fondant' for t in tiers) else ''}"
                           f"{'Mirror glaze day of — temperature sensitive. ' if any(t.get('frostingStyle') == 'ganache' for t in tiers) else ''}",
        "created_at": _now(),
        "status": "pending",
    }

    db["cake_orders"].insert_one({**order})
    order.pop("_id", None)
    return order
