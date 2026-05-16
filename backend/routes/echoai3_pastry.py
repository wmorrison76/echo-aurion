"""
EchoAi3 — Master Baker & Pastry Intelligence
===============================================
Professional pastry and baking knowledge at master level.
Covers: bread, viennoiserie, laminated doughs, chocolate work,
sugar work, plated desserts, wedding cakes, frozen desserts,
confections, and pastry R&D.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

import database

db = database.db
router = APIRouter(prefix="/api/echoai3/pastry", tags=["echoai3-pastry"])

_now = lambda: datetime.now(timezone.utc).isoformat()

PASTRY_KNOWLEDGE = {
    "bread": {
        "category": "Bread & Rolls",
        "techniques": {
            "autolyse": "Mix flour + water, rest 20-60 min before adding salt/yeast. Develops gluten with less mixing.",
            "bulk_fermentation": "Primary rise. Temperature-dependent: 75°F = 2-3h, 65°F = 8-12h, 40°F = 12-72h (retard).",
            "stretch_and_fold": "Every 30 min during bulk ferment. Builds strength without degassing.",
            "scoring": "Control oven spring direction. Lame at 30-45° angle, 1/4 inch deep.",
            "steam_injection": "First 10 min of bake. Creates crust shine and delays crust formation for maximum rise.",
            "preferment": "Poolish (equal flour:water, 0.1% yeast, 12-16h), Biga (stiff, 50-60% hydration), Levain (sourdough starter).",
        },
        "formulas": {
            "bakers_percentage": "All ingredients as % of flour weight. Flour = 100% always.",
            "standard_bread": "Flour 100%, Water 65-70%, Salt 2%, Yeast 1.5% (instant) or 2.5% (active dry)",
            "enriched_bread": "Add butter 5-15%, sugar 5-10%, eggs 10-20%, milk powder 3-5%",
            "sourdough": "Flour 100%, Water 70-80%, Salt 2%, Levain 20-30% (at 100% hydration)",
            "ciabatta": "Flour 100%, Water 80-85% (high hydration), Salt 2%, Poolish 40%",
            "brioche": "Flour 100%, Butter 50-60%, Eggs 50%, Sugar 12%, Salt 2%, Yeast 3%",
        },
        "temperatures": {
            "desired_dough_temp": "75-78°F (24-26°C) for most breads",
            "friction_factor": "Calculate mixer friction to determine water temperature",
            "water_temp_formula": "Water Temp = (DDT × 3) - Flour Temp - Room Temp - Friction Factor",
            "baking_hearth": "450-500°F (230-260°C) for lean breads",
            "baking_enriched": "350-375°F (175-190°C) for enriched breads",
            "internal_temp_done": "190-210°F (88-99°C) internal",
        },
    },
    "laminated_doughs": {
        "category": "Laminated Doughs (Viennoiserie)",
        "techniques": {
            "detrempe": "Base dough — mix, rest 1h minimum, chill thoroughly before lamination.",
            "beurrage": "Butter block — pound to pliable sheet, same temperature as dough (60°F/15°C).",
            "single_fold": "Letter fold — 3 layers per turn. Standard: 3 single folds = 27 layers.",
            "double_fold": "Book fold — 4 layers per turn. 2 doubles = 16 layers, 1 double + 2 singles = 36 layers.",
            "resting": "30 min minimum between folds. Relaxes gluten, firms butter.",
            "proofing": "78-82°F, 70-75% humidity. DO NOT exceed 82°F or butter melts and layers merge.",
        },
        "products": {
            "croissant": "3 single folds (27 layers), 80-82°F proof, egg wash, 400°F/12-15 min",
            "pain_au_chocolat": "Same dough as croissant, chocolate batons, rectangular shape",
            "danish": "Richer dough (more sugar, eggs), 3 single folds, various shapes and fillings",
            "puff_pastry": "No yeast, 6 single folds (729 layers), used for vol-au-vents, palmiers, mille-feuille",
            "kouign_amann": "Croissant dough laminated with sugar instead of butter between folds",
        },
        "troubleshooting": {
            "butter_breaking_through": "Dough and butter not same temperature. Chill and try again.",
            "flat_croissants": "Over-proofed, butter too warm, or insufficient folds.",
            "dense_layers": "Under-proofed or oven too cool. Need 400°F+ initial blast.",
            "uneven_layers": "Rolling not even. Use guide sticks for consistent thickness.",
        },
    },
    "chocolate": {
        "category": "Chocolate & Confections",
        "techniques": {
            "tempering_tabling": "Melt to 115°F (dark), pour 2/3 on marble, work to 80°F, return to bowl, bring to 88-90°F.",
            "tempering_seeding": "Melt to 115°F, add 25-30% finely chopped couverture, stir until 88-90°F (dark).",
            "tempering_temps": {
                "dark": {"melt": "115-120°F", "cool": "80-82°F", "work": "88-90°F"},
                "milk": {"melt": "110-115°F", "cool": "78-80°F", "work": "86-88°F"},
                "white": {"melt": "105-110°F", "cool": "76-78°F", "work": "84-86°F"},
            },
            "ganache_ratios": {
                "truffles": "1:1 chocolate to cream (by weight)",
                "filling": "2:1 chocolate to cream",
                "glaze": "1:2 chocolate to cream",
                "whipped": "2:1 chocolate to cream, chill, whip",
            },
            "enrobing": "Tempered chocolate at working temp, fork-dip centers, tap excess, set on parchment",
            "molding": "Coat mold with tempered chocolate, chill 2 min, fill, cap, chill until set",
        },
    },
    "sugar_work": {
        "category": "Sugar Work & Showpieces",
        "techniques": {
            "stages": {
                "thread": "230°F — syrups, Italian meringue",
                "soft_ball": "235-240°F — fudge, fondant, praline",
                "firm_ball": "245-250°F — caramels",
                "hard_ball": "250-265°F — nougat, marshmallow",
                "soft_crack": "270-290°F — taffy, butterscotch",
                "hard_crack": "300-310°F — lollipops, spun sugar, pulled sugar",
                "caramel": "320-350°F — caramel sauce, decorations",
            },
            "pulled_sugar": "Cook to 320°F with glucose, pour on silpat, pull under heat lamp until satiny",
            "blown_sugar": "Pulled sugar formed into sphere, inflate with pump, shape while pliable",
            "isomalt": "Sugar substitute for showpieces — more stable, less hygroscopic, melts at 340°F",
            "spun_sugar": "Caramel at 310°F, flick with fork over dowels to create nest/web",
        },
    },
    "plated_desserts": {
        "category": "Plated Desserts",
        "components": {
            "main": "Cake, mousse, soufflé, tart, crème brûlée, panna cotta — the star",
            "sauce": "Crème anglaise, fruit coulis, caramel, chocolate — flavor bridge",
            "garnish": "Tuile, crisp, meringue, sugar work — texture contrast",
            "frozen": "Sorbet, ice cream, semifreddo — temperature contrast",
            "fresh": "Seasonal fruit, microgreens, edible flowers — color and freshness",
        },
        "principles": [
            "Balance 5 elements: main, sauce, crunch, frozen, fresh",
            "Odd numbers (3, 5, 7) of elements on plate",
            "Height and architecture — build UP, not flat",
            "Temperature contrast: warm + frozen components",
            "Texture contrast: creamy + crunchy + silky",
            "Sauce painted or pooled BEFORE main element placed",
            "Garnish should be edible and purposeful — never decorative-only",
            "White space matters — don't overcrowd the plate",
        ],
    },
    "frozen_desserts": {
        "category": "Frozen Desserts",
        "formulas": {
            "ice_cream_base": "Cream 35%, Milk 30%, Sugar 15-18%, Egg yolks 8-10%, Stabilizer 0.3-0.5%",
            "sorbet": "Fruit puree 40-50%, Water 30-40%, Sugar 25-30%, Stabilizer 0.2-0.3%",
            "brix_target": "Ice cream: 28-32°Bx, Sorbet: 28-32°Bx, Granita: 15-20°Bx",
            "overrun": "Ice cream: 25-40% (gelato: 20-25%, commercial: 50-100%)",
            "serving_temp": "Ice cream: 6-10°F (-14 to -12°C), Sorbet: 10-15°F (-12 to -9°C)",
        },
    },
    "wedding_cakes": {
        "category": "Wedding & Specialty Cakes",
        "structure": {
            "doweling": "1/4 inch wooden or plastic dowels, cut flush with cake top, support board above",
            "tier_sizes": "Standard: 6-8-10-12-14 inch tiers (2 inch increments)",
            "servings_per_tier": {"6_inch": 12, "8_inch": 24, "10_inch": 38, "12_inch": 56, "14_inch": 78},
            "fondant_coverage": "Roll to 1/8 inch, drape over buttercream-smooth tier",
            "structural_limit": "6 tiers maximum for buttercream, 8+ requires internal steel structure",
            "delivery": "Transport tiers separately, assemble on-site. Temperature: 65-70°F room.",
        },
        "pricing": {
            "buttercream": "$4-8 per serving",
            "fondant": "$6-12 per serving",
            "sugar_flowers": "$8-15 per serving",
            "specialty": "$12-25+ per serving (sculpted, hand-painted)",
        },
    },
    "production_planning": {
        "category": "Pastry Production Management",
        "par_levels": {
            "bread_rolls": "Calculate per cover: 1.5 rolls per guest for dinner, 2 for lunch buffet",
            "petit_fours": "3-4 pieces per guest for reception, 2 for after-dinner",
            "dessert_plated": "1 per cover + 5% buffer",
            "breakfast_pastry": "2.5 pieces per breakfast cover",
            "amenity_cookies": "2 per occupied room per night",
        },
        "shelf_life": {
            "bread": "Baked: 24h ambient, 3 days frozen par-baked",
            "croissants": "8h ambient, 5 days frozen unbaked (proof from frozen)",
            "cakes": "3-5 days refrigerated, 1 month frozen (unfrosted layers)",
            "mousse": "2-3 days refrigerated",
            "ganache": "2 weeks refrigerated, 2 months frozen",
            "cookies": "5-7 days ambient in sealed container",
            "ice_cream": "2-4 weeks at 0°F",
        },
    },
}


def get_pastry_context(query: str) -> str:
    """Generate pastry knowledge context for EchoAi3 orchestrator."""
    q = query.lower()
    parts = []
    for key, section in PASTRY_KNOWLEDGE.items():
        score = 0
        section_text = str(section).lower()
        for word in q.split():
            if len(word) > 3 and word in section_text:
                score += 1
        if score > 0:
            cat = section.get("category", key)
            if "techniques" in section:
                techs = list(section["techniques"].keys())[:5]
                parts.append(f"MASTER BAKER [{cat}]: Techniques: {', '.join(techs)}.")
            if "formulas" in section:
                forms = list(section["formulas"].items())[:3]
                parts.append(f"PASTRY FORMULAS [{cat}]: " + "; ".join(f"{k}: {v}" for k, v in forms))
            if "products" in section:
                prods = list(section["products"].keys())[:5]
                parts.append(f"PASTRY PRODUCTS [{cat}]: {', '.join(prods)}.")
            if "components" in section:
                parts.append(f"PLATED DESSERT [{cat}]: " + "; ".join(f"{k}: {v}" for k, v in list(section["components"].items())[:3]))
    return "\n".join(parts) if parts else ""


# ─── API Endpoints ───

@router.get("/knowledge")
async def get_pastry_knowledge():
    """Get the complete Master Baker knowledge base."""
    return {"knowledge": PASTRY_KNOWLEDGE, "categories": list(PASTRY_KNOWLEDGE.keys())}


@router.get("/category/{category}")
async def get_pastry_category(category: str):
    """Get detailed knowledge for a specific pastry category."""
    data = PASTRY_KNOWLEDGE.get(category)
    if not data:
        return {"error": f"Unknown category: {category}", "available": list(PASTRY_KNOWLEDGE.keys())}
    return data


@router.get("/tempering")
async def get_tempering_guide():
    """Get chocolate tempering temperatures and techniques."""
    return PASTRY_KNOWLEDGE["chocolate"]["techniques"]


@router.get("/sugar-stages")
async def get_sugar_stages():
    """Get sugar cooking stage temperatures."""
    return PASTRY_KNOWLEDGE["sugar_work"]["techniques"]["stages"]


@router.get("/formulas")
async def get_pastry_formulas():
    """Get key pastry formulas (baker's percentages, ice cream, sorbet)."""
    return {
        "bread": PASTRY_KNOWLEDGE["bread"]["formulas"],
        "laminated": {k: v for k, v in PASTRY_KNOWLEDGE["laminated_doughs"]["products"].items()},
        "chocolate": PASTRY_KNOWLEDGE["chocolate"]["techniques"]["ganache_ratios"],
        "frozen": PASTRY_KNOWLEDGE["frozen_desserts"]["formulas"],
    }


@router.get("/wedding-cakes")
async def get_wedding_cake_guide():
    """Get wedding cake structural and pricing guide."""
    return PASTRY_KNOWLEDGE["wedding_cakes"]


@router.get("/production-pars")
async def get_pastry_production_pars():
    """Get pastry production par levels and shelf life guidelines."""
    return {
        "par_levels": PASTRY_KNOWLEDGE["production_planning"]["par_levels"],
        "shelf_life": PASTRY_KNOWLEDGE["production_planning"]["shelf_life"],
    }
