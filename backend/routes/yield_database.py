"""
Production Yields & Recipe Ingredient Engine
=============================================
Comprehensive yield database from professional culinary sources.
Supports fuzzy search, yield % calculation by cut type, and
automatic cost calculation based on AP (as-purchased) cost and
yield percentage.

When user types "milk" → fuzzy matches "Milk, Whole", "Milk, 2%",
"Milk, Skim", "Buttermilk", etc. Tab to select → auto-fills yield %
and cost.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import re

router = APIRouter(prefix="/api/yields", tags=["yields"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ══════════════════════════════════════
#  YIELD DATABASE (from Book of Yields)
# ══════════════════════════════════════
# Format: name, category, yield_pct, ap_cost_per_lb, unit_conversions, cut_yields

YIELD_DB = [
    # ─── PROTEINS ───
    {"name": "Beef, Tenderloin (PSMO)", "category": "protein", "yield_pct": 80, "trim_pct": 20, "ap_cost_lb": 28.50, "ep_cost_lb": 35.63, "unit": "lb",
     "cuts": [{"cut": "Whole, cleaned", "yield_pct": 80}, {"cut": "Center cut filet", "yield_pct": 52}, {"cut": "Tournedos", "yield_pct": 45}, {"cut": "Tips & trim", "yield_pct": 28}]},
    {"name": "Beef, Strip Loin", "category": "protein", "yield_pct": 82, "trim_pct": 18, "ap_cost_lb": 18.50, "ep_cost_lb": 22.56, "unit": "lb",
     "cuts": [{"cut": "Boneless strip steak", "yield_pct": 82}, {"cut": "Medallions", "yield_pct": 72}]},
    {"name": "Beef, Short Rib (Bone-In)", "category": "protein", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 12.80, "ep_cost_lb": 25.60, "unit": "lb",
     "cuts": [{"cut": "Braised, boneless", "yield_pct": 50}, {"cut": "English cut", "yield_pct": 65}]},
    {"name": "Beef, Ground (80/20)", "category": "protein", "yield_pct": 75, "trim_pct": 25, "ap_cost_lb": 6.50, "ep_cost_lb": 8.67, "unit": "lb",
     "cuts": [{"cut": "Cooked patty", "yield_pct": 75}]},
    {"name": "Beef, Ribeye", "category": "protein", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 22.00, "ep_cost_lb": 25.88, "unit": "lb"},
    {"name": "Wagyu, Ground", "category": "protein", "yield_pct": 80, "trim_pct": 20, "ap_cost_lb": 22.00, "ep_cost_lb": 27.50, "unit": "lb"},
    {"name": "Chicken, Whole", "category": "protein", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 3.80, "ep_cost_lb": 5.85, "unit": "lb",
     "cuts": [{"cut": "Whole roasted", "yield_pct": 65}, {"cut": "Breast, boneless skinless", "yield_pct": 38}, {"cut": "Thigh, boneless", "yield_pct": 22}, {"cut": "Leg quarter", "yield_pct": 28}]},
    {"name": "Chicken, Breast (Boneless Skinless)", "category": "protein", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 8.50, "ep_cost_lb": 9.66, "unit": "lb",
     "cuts": [{"cut": "Grilled/roasted", "yield_pct": 88}, {"cut": "Pounded cutlet", "yield_pct": 85}, {"cut": "Diced 1\"", "yield_pct": 90}]},
    {"name": "Pork, Shoulder (Bone-In)", "category": "protein", "yield_pct": 55, "trim_pct": 45, "ap_cost_lb": 4.80, "ep_cost_lb": 8.73, "unit": "lb",
     "cuts": [{"cut": "Braised/pulled", "yield_pct": 55}, {"cut": "Cubed for stew", "yield_pct": 62}]},
    {"name": "Pork, Loin (Boneless)", "category": "protein", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 7.20, "ep_cost_lb": 8.47, "unit": "lb"},
    {"name": "Pork, Bacon (Slab)", "category": "protein", "yield_pct": 35, "trim_pct": 65, "ap_cost_lb": 8.50, "ep_cost_lb": 24.29, "unit": "lb",
     "cuts": [{"cut": "Crisp rendered", "yield_pct": 35}, {"cut": "Lardons", "yield_pct": 40}]},
    {"name": "Lamb, Rack (Frenched)", "category": "protein", "yield_pct": 62, "trim_pct": 38, "ap_cost_lb": 32.00, "ep_cost_lb": 51.61, "unit": "lb"},
    {"name": "Lamb, Shoulder", "category": "protein", "yield_pct": 55, "trim_pct": 45, "ap_cost_lb": 12.00, "ep_cost_lb": 21.82, "unit": "lb"},
    {"name": "Salmon, Whole", "category": "seafood", "yield_pct": 55, "trim_pct": 45, "ap_cost_lb": 14.00, "ep_cost_lb": 25.45, "unit": "lb",
     "cuts": [{"cut": "Fillet, skin-on", "yield_pct": 55}, {"cut": "Fillet, skinless", "yield_pct": 48}, {"cut": "Portion 6oz", "yield_pct": 50}]},
    {"name": "Salmon, Fillet (Skin-On)", "category": "seafood", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 18.00, "ep_cost_lb": 20.00, "unit": "lb"},
    {"name": "Tuna, Loin (Sushi Grade)", "category": "seafood", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 28.00, "ep_cost_lb": 32.94, "unit": "lb"},
    {"name": "Shrimp, 16/20 (Head-On)", "category": "seafood", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 12.00, "ep_cost_lb": 24.00, "unit": "lb"},
    {"name": "Shrimp, 16/20 (P&D)", "category": "seafood", "yield_pct": 92, "trim_pct": 8, "ap_cost_lb": 16.50, "ep_cost_lb": 17.93, "unit": "lb"},
    {"name": "Lobster, Whole (1.5lb)", "category": "seafood", "yield_pct": 25, "trim_pct": 75, "ap_cost_lb": 18.00, "ep_cost_lb": 72.00, "unit": "lb",
     "cuts": [{"cut": "Tail meat", "yield_pct": 18}, {"cut": "Claw/knuckle", "yield_pct": 7}]},
    {"name": "Lobster, Tail (6oz)", "category": "seafood", "yield_pct": 72, "trim_pct": 28, "ap_cost_lb": 14.50, "ep_cost_lb": 20.14, "unit": "each"},
    {"name": "Scallop, Dry-Pack U10", "category": "seafood", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 32.00, "ep_cost_lb": 33.68, "unit": "lb"},
    {"name": "Snapper, Whole", "category": "seafood", "yield_pct": 40, "trim_pct": 60, "ap_cost_lb": 9.50, "ep_cost_lb": 23.75, "unit": "lb"},
    {"name": "Snapper, Fillet", "category": "seafood", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 11.50, "ep_cost_lb": 12.78, "unit": "lb"},
    {"name": "Octopus, Whole", "category": "seafood", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 10.00, "ep_cost_lb": 20.00, "unit": "lb"},
    {"name": "Sea Bass, Chilean (Fillet)", "category": "seafood", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 36.00, "ep_cost_lb": 40.91, "unit": "lb"},
    {"name": "Turbot, Fillet", "category": "seafood", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 38.00, "ep_cost_lb": 44.71, "unit": "lb"},

    # ─── VEGETABLES ───
    {"name": "Onion, Yellow", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 1.20, "ep_cost_lb": 1.33, "unit": "lb",
     "cuts": [{"cut": "Peeled whole", "yield_pct": 90}, {"cut": "1/4\" dice (brunoise)", "yield_pct": 87}, {"cut": "1/2\" dice", "yield_pct": 88}, {"cut": "Sliced rings", "yield_pct": 88}, {"cut": "Julienne", "yield_pct": 85}, {"cut": "Minced", "yield_pct": 86}],
     "volume": {"1 medium": "6 oz", "1 cup diced": "5.5 oz", "1 cup sliced": "4 oz"}},
    {"name": "Onion, Red", "category": "vegetable", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 1.80, "ep_cost_lb": 2.05, "unit": "lb",
     "cuts": [{"cut": "Peeled", "yield_pct": 88}, {"cut": "1/4\" dice", "yield_pct": 85}, {"cut": "Rings", "yield_pct": 86}]},
    {"name": "Carrot", "category": "vegetable", "yield_pct": 82, "trim_pct": 18, "ap_cost_lb": 1.40, "ep_cost_lb": 1.71, "unit": "lb",
     "cuts": [{"cut": "Peeled whole", "yield_pct": 82}, {"cut": "1/4\" dice", "yield_pct": 78}, {"cut": "Julienne", "yield_pct": 76}, {"cut": "Coins", "yield_pct": 80}, {"cut": "Batonnet", "yield_pct": 74}, {"cut": "Turned/tourné", "yield_pct": 55}],
     "volume": {"1 medium": "3 oz", "1 cup diced": "5 oz", "1 cup sliced": "4.5 oz"}},
    {"name": "Celery", "category": "vegetable", "yield_pct": 75, "trim_pct": 25, "ap_cost_lb": 1.60, "ep_cost_lb": 2.13, "unit": "lb",
     "cuts": [{"cut": "Trimmed stalks", "yield_pct": 75}, {"cut": "1/4\" dice", "yield_pct": 72}, {"cut": "Sliced", "yield_pct": 73}],
     "volume": {"1 stalk": "2 oz", "1 cup diced": "4 oz", "1 cup sliced": "3.5 oz"}},
    {"name": "Potato, Russet", "category": "vegetable", "yield_pct": 81, "trim_pct": 19, "ap_cost_lb": 1.20, "ep_cost_lb": 1.48, "unit": "lb",
     "cuts": [{"cut": "Peeled whole", "yield_pct": 81}, {"cut": "French fry", "yield_pct": 75}, {"cut": "1/2\" dice", "yield_pct": 78}, {"cut": "Mashed", "yield_pct": 80}, {"cut": "Hashbrown", "yield_pct": 78}],
     "volume": {"1 medium": "6 oz", "1 cup diced": "5.5 oz"}},
    {"name": "Potato, Yukon Gold", "category": "vegetable", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 1.80, "ep_cost_lb": 2.05, "unit": "lb"},
    {"name": "Potato, Fingerling", "category": "vegetable", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 3.50, "ep_cost_lb": 3.68, "unit": "lb"},
    {"name": "Tomato, Beefsteak", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 3.20, "ep_cost_lb": 3.56, "unit": "lb",
     "cuts": [{"cut": "Cored, sliced", "yield_pct": 90}, {"cut": "Concasse (peeled, seeded, diced)", "yield_pct": 62}, {"cut": "1/4\" dice", "yield_pct": 85}],
     "volume": {"1 medium": "6 oz", "1 cup diced": "6 oz", "1 cup sliced": "5 oz"}},
    {"name": "Tomato, Cherry/Grape", "category": "vegetable", "yield_pct": 97, "trim_pct": 3, "ap_cost_lb": 4.50, "ep_cost_lb": 4.64, "unit": "lb"},
    {"name": "Tomato, San Marzano (canned)", "category": "vegetable", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 3.20, "ep_cost_lb": 3.20, "unit": "lb"},
    {"name": "Pepper, Bell (Red)", "category": "vegetable", "yield_pct": 82, "trim_pct": 18, "ap_cost_lb": 3.80, "ep_cost_lb": 4.63, "unit": "lb",
     "cuts": [{"cut": "Seeded, diced", "yield_pct": 82}, {"cut": "Julienne", "yield_pct": 78}, {"cut": "Roasted, peeled", "yield_pct": 55}]},
    {"name": "Pepper, Jalapeno", "category": "vegetable", "yield_pct": 86, "trim_pct": 14, "ap_cost_lb": 3.00, "ep_cost_lb": 3.49, "unit": "lb"},
    {"name": "Lettuce, Romaine", "category": "vegetable", "yield_pct": 75, "trim_pct": 25, "ap_cost_lb": 2.80, "ep_cost_lb": 3.73, "unit": "lb",
     "cuts": [{"cut": "Trimmed leaves", "yield_pct": 75}, {"cut": "Chopped", "yield_pct": 70}, {"cut": "Hearts", "yield_pct": 60}],
     "volume": {"1 head": "12 oz", "1 cup shredded": "2 oz"}},
    {"name": "Lettuce, Butter/Bibb", "category": "vegetable", "yield_pct": 70, "trim_pct": 30, "ap_cost_lb": 6.00, "ep_cost_lb": 8.57, "unit": "lb"},
    {"name": "Arugula", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 8.00, "ep_cost_lb": 8.89, "unit": "lb"},
    {"name": "Kale", "category": "vegetable", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 3.50, "ep_cost_lb": 5.38, "unit": "lb"},
    {"name": "Spinach, Baby", "category": "vegetable", "yield_pct": 92, "trim_pct": 8, "ap_cost_lb": 6.00, "ep_cost_lb": 6.52, "unit": "lb"},
    {"name": "Mushroom, Button/Cremini", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 5.50, "ep_cost_lb": 6.11, "unit": "lb",
     "cuts": [{"cut": "Sliced", "yield_pct": 88}, {"cut": "Quartered", "yield_pct": 90}, {"cut": "Diced", "yield_pct": 85}]},
    {"name": "Mushroom, Wild Mix", "category": "vegetable", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 14.00, "ep_cost_lb": 16.47, "unit": "lb"},
    {"name": "Asparagus", "category": "vegetable", "yield_pct": 56, "trim_pct": 44, "ap_cost_lb": 5.80, "ep_cost_lb": 10.36, "unit": "lb",
     "cuts": [{"cut": "Trimmed spears", "yield_pct": 56}, {"cut": "Tips only", "yield_pct": 35}]},
    {"name": "Zucchini", "category": "vegetable", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 2.40, "ep_cost_lb": 2.53, "unit": "lb"},
    {"name": "Eggplant", "category": "vegetable", "yield_pct": 81, "trim_pct": 19, "ap_cost_lb": 2.80, "ep_cost_lb": 3.46, "unit": "lb"},
    {"name": "Garlic, Head", "category": "vegetable", "yield_pct": 87, "trim_pct": 13, "ap_cost_lb": 6.00, "ep_cost_lb": 6.90, "unit": "lb",
     "volume": {"1 head": "2 oz", "1 clove": "0.2 oz"}},
    {"name": "Shallot", "category": "vegetable", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 8.00, "ep_cost_lb": 9.09, "unit": "lb"},
    {"name": "Leek", "category": "vegetable", "yield_pct": 52, "trim_pct": 48, "ap_cost_lb": 3.80, "ep_cost_lb": 7.31, "unit": "lb"},
    {"name": "Avocado", "category": "fruit", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 4.80, "ep_cost_lb": 7.38, "unit": "lb",
     "volume": {"1 medium": "6 oz", "1 cup mashed": "8 oz"}},
    {"name": "Corn, Ear", "category": "vegetable", "yield_pct": 40, "trim_pct": 60, "ap_cost_lb": 1.50, "ep_cost_lb": 3.75, "unit": "each",
     "volume": {"1 ear": "5 oz (kernels)"}},

    # ─── FRUITS ───
    {"name": "Lemon", "category": "fruit", "yield_pct": 43, "trim_pct": 57, "ap_cost_lb": 2.80, "ep_cost_lb": 6.51, "unit": "lb",
     "volume": {"1 medium": "4 oz", "juice per lemon": "1.5 oz", "zest per lemon": "1 tbsp"}},
    {"name": "Lime", "category": "fruit", "yield_pct": 40, "trim_pct": 60, "ap_cost_lb": 3.00, "ep_cost_lb": 7.50, "unit": "lb",
     "volume": {"1 medium": "2.5 oz", "juice per lime": "1 oz", "zest per lime": "1 tsp"}},
    {"name": "Orange", "category": "fruit", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 2.00, "ep_cost_lb": 3.08, "unit": "lb",
     "volume": {"1 medium": "7 oz", "juice per orange": "3 oz"}},
    {"name": "Strawberry", "category": "fruit", "yield_pct": 92, "trim_pct": 8, "ap_cost_lb": 5.50, "ep_cost_lb": 5.98, "unit": "lb"},
    {"name": "Blueberry", "category": "fruit", "yield_pct": 97, "trim_pct": 3, "ap_cost_lb": 7.00, "ep_cost_lb": 7.22, "unit": "lb"},
    {"name": "Raspberry", "category": "fruit", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 12.00, "ep_cost_lb": 12.63, "unit": "lb"},
    {"name": "Banana", "category": "fruit", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 0.80, "ep_cost_lb": 1.23, "unit": "lb",
     "volume": {"1 medium": "4 oz EP"}},
    {"name": "Mango", "category": "fruit", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 3.50, "ep_cost_lb": 5.38, "unit": "lb"},
    {"name": "Pineapple, Whole", "category": "fruit", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 1.80, "ep_cost_lb": 3.60, "unit": "lb"},
    {"name": "Apple, Granny Smith", "category": "fruit", "yield_pct": 78, "trim_pct": 22, "ap_cost_lb": 2.20, "ep_cost_lb": 2.82, "unit": "lb"},
    {"name": "Coconut, Fresh", "category": "fruit", "yield_pct": 30, "trim_pct": 70, "ap_cost_lb": 2.50, "ep_cost_lb": 8.33, "unit": "lb"},

    # ─── DAIRY & EGGS ───
    {"name": "Milk, Whole", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.55, "ep_cost_lb": 0.55, "unit": "gal",
     "volume": {"1 gallon": "128 oz", "1 cup": "8.6 oz"}},
    {"name": "Milk, 2%", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.50, "ep_cost_lb": 0.50, "unit": "gal"},
    {"name": "Milk, Oat", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.80, "ep_cost_lb": 0.80, "unit": "gal"},
    {"name": "Cream, Heavy", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 4.80, "ep_cost_lb": 4.80, "unit": "qt"},
    {"name": "Butter, Unsalted", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 5.50, "ep_cost_lb": 5.50, "unit": "lb"},
    {"name": "Eggs, Cage Free (Large)", "category": "dairy", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 0.45, "ep_cost_lb": 0.50, "unit": "each",
     "volume": {"1 large egg": "1.75 oz (no shell)", "1 cup": "4 eggs", "1 yolk": "0.6 oz", "1 white": "1.1 oz"}},
    {"name": "Parmesan, Parmigiano Reggiano", "category": "dairy", "yield_pct": 92, "trim_pct": 8, "ap_cost_lb": 22.00, "ep_cost_lb": 23.91, "unit": "lb"},
    {"name": "Mozzarella, Fresh", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 12.00, "ep_cost_lb": 12.00, "unit": "lb"},
    {"name": "Goat Cheese (Chevre)", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 14.00, "ep_cost_lb": 14.00, "unit": "lb"},
    {"name": "Cream Cheese", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 4.50, "ep_cost_lb": 4.50, "unit": "lb"},

    # ─── HERBS ───
    {"name": "Basil, Fresh", "category": "herb", "yield_pct": 56, "trim_pct": 44, "ap_cost_lb": 16.00, "ep_cost_lb": 28.57, "unit": "bunch"},
    {"name": "Cilantro", "category": "herb", "yield_pct": 60, "trim_pct": 40, "ap_cost_lb": 8.00, "ep_cost_lb": 13.33, "unit": "bunch"},
    {"name": "Parsley, Italian", "category": "herb", "yield_pct": 62, "trim_pct": 38, "ap_cost_lb": 7.00, "ep_cost_lb": 11.29, "unit": "bunch"},
    {"name": "Mint, Fresh", "category": "herb", "yield_pct": 55, "trim_pct": 45, "ap_cost_lb": 14.00, "ep_cost_lb": 25.45, "unit": "bunch"},
    {"name": "Rosemary", "category": "herb", "yield_pct": 65, "trim_pct": 35, "ap_cost_lb": 12.00, "ep_cost_lb": 18.46, "unit": "bunch"},
    {"name": "Thyme", "category": "herb", "yield_pct": 45, "trim_pct": 55, "ap_cost_lb": 18.00, "ep_cost_lb": 40.00, "unit": "bunch"},
    {"name": "Dill", "category": "herb", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 12.00, "ep_cost_lb": 24.00, "unit": "bunch"},

    # ─── GRAINS & DRY ───
    {"name": "Rice, Jasmine", "category": "grain", "yield_pct": 250, "trim_pct": 0, "ap_cost_lb": 1.80, "ep_cost_lb": 0.72, "unit": "lb",
     "volume": {"1 cup dry": "7 oz", "1 cup cooked": "6.5 oz", "yield_ratio": "1:2.5"}},
    {"name": "Pasta, Dry (Linguine)", "category": "grain", "yield_pct": 200, "trim_pct": 0, "ap_cost_lb": 2.80, "ep_cost_lb": 1.40, "unit": "lb"},
    {"name": "Pasta, Fresh", "category": "grain", "yield_pct": 180, "trim_pct": 0, "ap_cost_lb": 3.80, "ep_cost_lb": 2.11, "unit": "lb"},
    {"name": "Flour, All Purpose", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.60, "ep_cost_lb": 0.60, "unit": "lb",
     "volume": {"1 cup": "4.5 oz"}},
    {"name": "Polenta (Dry)", "category": "grain", "yield_pct": 350, "trim_pct": 0, "ap_cost_lb": 2.40, "ep_cost_lb": 0.69, "unit": "lb"},
    {"name": "Bread, Brioche", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 6.00, "ep_cost_lb": 6.00, "unit": "loaf"},
    {"name": "Tortilla, Corn 6\"", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.12, "ep_cost_lb": 0.12, "unit": "each"},
    {"name": "Tortilla, Flour 10\"", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.15, "ep_cost_lb": 0.15, "unit": "each"},

    # ─── OUTLET-SPECIFIC INGREDIENTS ───
    {"name": "Foie Gras (Grade A)", "category": "protein", "yield_pct": 75, "trim_pct": 25, "ap_cost_lb": 85.00, "ep_cost_lb": 113.33, "unit": "lb"},
    {"name": "Caviar, Kaluga", "category": "seafood", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 280.00, "ep_cost_lb": 280.00, "unit": "oz"},
    {"name": "Caviar, Royal Osetra", "category": "seafood", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 360.00, "ep_cost_lb": 360.00, "unit": "oz"},
    {"name": "Truffle, Black Winter", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 450.00, "ep_cost_lb": 500.00, "unit": "oz"},
    {"name": "Burrata", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 16.00, "ep_cost_lb": 16.00, "unit": "lb"},
    {"name": "Ricotta, Fresh", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 6.50, "ep_cost_lb": 6.50, "unit": "lb"},
    {"name": "Mascarpone", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 8.00, "ep_cost_lb": 8.00, "unit": "lb"},
    {"name": "Prosciutto di Parma", "category": "protein", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 28.00, "ep_cost_lb": 29.47, "unit": "lb"},
    {"name": "Chorizo, Spanish", "category": "protein", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 12.00, "ep_cost_lb": 12.00, "unit": "lb"},
    {"name": "Duck, Whole", "category": "protein", "yield_pct": 52, "trim_pct": 48, "ap_cost_lb": 7.50, "ep_cost_lb": 14.42, "unit": "lb"},
    {"name": "Duck, Breast (Magret)", "category": "protein", "yield_pct": 78, "trim_pct": 22, "ap_cost_lb": 18.00, "ep_cost_lb": 23.08, "unit": "lb"},
    {"name": "Oyster, East Coast", "category": "seafood", "yield_pct": 15, "trim_pct": 85, "ap_cost_lb": 1.50, "ep_cost_lb": 10.00, "unit": "each"},
    {"name": "Crab, Jumbo Lump", "category": "seafood", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 38.00, "ep_cost_lb": 38.00, "unit": "lb"},
    {"name": "Mahi-Mahi, Fillet", "category": "seafood", "yield_pct": 85, "trim_pct": 15, "ap_cost_lb": 14.00, "ep_cost_lb": 16.47, "unit": "lb"},
    {"name": "Halibut, Fillet", "category": "seafood", "yield_pct": 88, "trim_pct": 12, "ap_cost_lb": 30.00, "ep_cost_lb": 34.09, "unit": "lb"},
    {"name": "Romanesco", "category": "vegetable", "yield_pct": 72, "trim_pct": 28, "ap_cost_lb": 4.50, "ep_cost_lb": 6.25, "unit": "lb"},
    {"name": "Escarole", "category": "vegetable", "yield_pct": 75, "trim_pct": 25, "ap_cost_lb": 3.00, "ep_cost_lb": 4.00, "unit": "lb"},
    {"name": "Endive, Belgian", "category": "vegetable", "yield_pct": 90, "trim_pct": 10, "ap_cost_lb": 8.00, "ep_cost_lb": 8.89, "unit": "lb"},
    {"name": "Broccolini", "category": "vegetable", "yield_pct": 80, "trim_pct": 20, "ap_cost_lb": 6.00, "ep_cost_lb": 7.50, "unit": "lb"},
    {"name": "Fennel Bulb", "category": "vegetable", "yield_pct": 60, "trim_pct": 40, "ap_cost_lb": 3.50, "ep_cost_lb": 5.83, "unit": "lb"},
    {"name": "Beetroot, Red", "category": "vegetable", "yield_pct": 76, "trim_pct": 24, "ap_cost_lb": 2.80, "ep_cost_lb": 3.68, "unit": "lb"},
    {"name": "Sweet Potato", "category": "vegetable", "yield_pct": 80, "trim_pct": 20, "ap_cost_lb": 1.60, "ep_cost_lb": 2.00, "unit": "lb"},
    {"name": "Pumpkin", "category": "vegetable", "yield_pct": 70, "trim_pct": 30, "ap_cost_lb": 1.00, "ep_cost_lb": 1.43, "unit": "lb"},
    {"name": "Walnut", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 12.00, "ep_cost_lb": 12.00, "unit": "lb"},
    {"name": "Hazelnut", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 14.00, "ep_cost_lb": 14.00, "unit": "lb"},
    {"name": "Pistachio", "category": "grain", "yield_pct": 50, "trim_pct": 50, "ap_cost_lb": 18.00, "ep_cost_lb": 36.00, "unit": "lb",
     "cuts": [{"cut": "Shelled", "yield_pct": 50}, {"cut": "Pre-shelled", "yield_pct": 100}]},
    {"name": "Pine Nut", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 28.00, "ep_cost_lb": 28.00, "unit": "lb"},
    {"name": "Chocolate, Dark 70%", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 12.00, "ep_cost_lb": 12.00, "unit": "lb"},
    {"name": "Nutella", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 6.00, "ep_cost_lb": 6.00, "unit": "lb"},
    {"name": "Maple Syrup", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 12.00, "ep_cost_lb": 12.00, "unit": "gal"},
    {"name": "Honey, Local", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 10.00, "ep_cost_lb": 10.00, "unit": "lb"},
    {"name": "Olive Oil, EVOO", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 8.00, "ep_cost_lb": 8.00, "unit": "gal"},
    {"name": "Roquefort Cheese", "category": "dairy", "yield_pct": 95, "trim_pct": 5, "ap_cost_lb": 24.00, "ep_cost_lb": 25.26, "unit": "lb"},
    {"name": "Gruyere", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 18.00, "ep_cost_lb": 18.00, "unit": "lb"},
    {"name": "Feta Cheese", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 8.00, "ep_cost_lb": 8.00, "unit": "lb"},
    {"name": "Chihuahua Cheese", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 7.20, "ep_cost_lb": 7.20, "unit": "lb"},
    {"name": "Pepper Jack Cheese", "category": "dairy", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 6.80, "ep_cost_lb": 6.80, "unit": "lb"},
    {"name": "Quinoa", "category": "grain", "yield_pct": 270, "trim_pct": 0, "ap_cost_lb": 5.50, "ep_cost_lb": 2.04, "unit": "lb"},
    {"name": "Couscous", "category": "grain", "yield_pct": 250, "trim_pct": 0, "ap_cost_lb": 3.00, "ep_cost_lb": 1.20, "unit": "lb"},
    {"name": "Brioche Bun", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.85, "ep_cost_lb": 0.85, "unit": "each"},
    {"name": "Pita Bread", "category": "grain", "yield_pct": 100, "trim_pct": 0, "ap_cost_lb": 0.30, "ep_cost_lb": 0.30, "unit": "each"},
    {"name": "Black Bean (dried)", "category": "grain", "yield_pct": 250, "trim_pct": 0, "ap_cost_lb": 2.20, "ep_cost_lb": 0.88, "unit": "lb"},
    {"name": "Chickpea/Garbanzo (dried)", "category": "grain", "yield_pct": 250, "trim_pct": 0, "ap_cost_lb": 2.50, "ep_cost_lb": 1.00, "unit": "lb"},
]


# ══════════════════════════════════════
#  FUZZY SEARCH
# ══════════════════════════════════════

def _fuzzy_score(query: str, target: str) -> int:
    """Simple fuzzy match score. Higher = better match."""
    q = query.lower().strip()
    t = target.lower()
    if q == t:
        return 100
    if t.startswith(q):
        return 90
    if q in t:
        return 70 + (len(q) / len(t)) * 20
    # Check word-level matching
    q_words = q.split()
    matched = sum(1 for w in q_words if w in t)
    if matched > 0:
        return 40 + (matched / len(q_words)) * 30
    # Character-level subsequence
    qi = 0
    for ch in t:
        if qi < len(q) and ch == q[qi]:
            qi += 1
    if qi == len(q):
        return 20 + (len(q) / len(t)) * 20
    return 0


@router.get("/search")
async def search_ingredients(
    q: str = "",
    category: Optional[str] = None,
    limit: int = 15,
    outlet_id: Optional[str] = None,
):
    """Fuzzy search ingredients. Type 'milk' → matches 'Milk, Whole', 'Milk, 2%', etc.

    C0.3: when outlet_id is supplied, results are filtered to ingredients
    that have appeared on at least one vendor SKU received at this outlet,
    so a pastry chef doesn't see a seafood-only outlet's salmon catalog
    and vice versa. Falls back to the global YIELD_DB when outlet_id is
    omitted (preserves historical behavior).
    """
    if not q.strip():
        results = YIELD_DB[:limit] if not category else [y for y in YIELD_DB if y["category"] == category][:limit]
    else:
        scored = []
        for item in YIELD_DB:
            if category and item["category"] != category:
                continue
            score = _fuzzy_score(q, item["name"])
            if score > 15:
                scored.append({"score": score, **item})

        scored.sort(key=lambda x: x["score"], reverse=True)
        results = scored[:limit]

    # Outlet filter (post-fuzzy so we keep ranking quality). The set of
    # ingredients with outlet activity is built from vendor_skus —
    # ingredient_name from the SKU's _search field intersected with
    # YIELD_DB names. Cheap to compute on demand for current data
    # volumes; can be cached if needed.
    if outlet_id:
        try:
            from database import db as _db
            outlet_skus = _db["vendor_skus"].find(
                {"$or": [
                    {"last_invoice_outlet": outlet_id},
                    {"outlet_destinations": outlet_id},
                ]},
                {"_search": 1, "_id": 0},
            )
            outlet_terms = set()
            for sku in outlet_skus:
                for tok in (sku.get("_search") or "").split():
                    if len(tok) >= 3:
                        outlet_terms.add(tok)
            if outlet_terms:
                def _matches_outlet(item):
                    name = (item.get("name") or "").lower()
                    return any(t in name for t in outlet_terms)
                results = [r for r in results if _matches_outlet(r)]
        except Exception:
            # If the outlet filter can't be computed (e.g. db unavailable
            # in test context), fall through with the global result rather
            # than crash the autocomplete.
            pass

    return {"results": results, "total": len(results), "query": q}


@router.get("/suggest-cuts")
async def suggest_cuts(ingredient: str = "", context: Optional[str] = None):
    """Auto-suggest cuts based on ingredient and menu context.
    Context examples: 'burger', 'salad', 'pasta', 'steak', 'taco', 'soup'."""
    match = None
    best_score = 0
    for item in YIELD_DB:
        score = _fuzzy_score(ingredient, item["name"])
        if score > best_score:
            best_score = score
            match = item

    if not match or best_score < 30:
        return {"error": "Ingredient not found", "query": ingredient}

    cuts = match.get("cuts", [])
    if not cuts:
        cuts = [{"cut": "Whole/as-is", "yield_pct": match["yield_pct"]}]

    # Auto-rank cuts by context
    if context:
        ctx = context.lower()
        CONTEXT_PREFERENCES = {
            "burger": ["patty", "ground", "cooked", "diced"],
            "steak": ["boneless", "filet", "strip", "medallion", "center"],
            "salad": ["sliced", "julienne", "diced", "shredded", "chopped", "leaves", "hearts"],
            "soup": ["dice", "mirepoix", "puree", "cubed"],
            "pasta": ["dice", "julienne", "sliced", "concasse"],
            "taco": ["pulled", "braised", "shredded", "cubed", "diced"],
            "sandwich": ["sliced", "shaved", "pulled"],
            "braise": ["braised", "english", "cubed", "bone-in", "whole"],
            "grill": ["whole", "spears", "trimmed", "boneless", "filet"],
            "fine_dice": ["brunoise", "1/4", "minced"],
            "garnish": ["julienne", "chiffonade", "supremes", "zest", "tips"],
            "roast": ["whole", "cleaned", "rack", "boneless", "trimmed"],
            "fry": ["french fry", "wedge", "crisp", "battered"],
            "raw": ["crudo", "tartare", "sashimi", "carpaccio"],
        }
        prefs = CONTEXT_PREFERENCES.get(ctx, [])
        if prefs:
            def _cut_score(cut_item):
                name = cut_item["cut"].lower()
                for i, pref in enumerate(prefs):
                    if pref in name:
                        return 100 - i * 10
                return 0
            cuts = sorted(cuts, key=_cut_score, reverse=True)

    return {
        "ingredient": match["name"],
        "category": match["category"],
        "context": context,
        "suggested_cuts": cuts,
        "default_yield_pct": match["yield_pct"],
        "volume_conversions": match.get("volume", {}),
    }




@router.get("/calculate")
async def calculate_yield(
    ingredient: str = "",
    quantity: float = 1.0,
    unit: str = "lb",
    cut: Optional[str] = None,
):
    """Calculate yield for a given ingredient, quantity, and cut type.
    Returns EP weight, yield %, cost, and trim weight."""
    # Find the ingredient
    match = None
    best_score = 0
    for item in YIELD_DB:
        score = _fuzzy_score(ingredient, item["name"])
        if score > best_score:
            best_score = score
            match = item

    if not match or best_score < 30:
        return {"error": "Ingredient not found", "query": ingredient}

    # Determine yield % based on cut
    yield_pct = match["yield_pct"]
    if cut and match.get("cuts"):
        for c in match["cuts"]:
            if _fuzzy_score(cut, c["cut"]) > 50:
                yield_pct = c["yield_pct"]
                break

    # Calculate
    ap_weight = quantity
    ep_weight = round(quantity * yield_pct / 100, 3)
    trim_weight = round(quantity - ep_weight, 3) if yield_pct <= 100 else 0
    ap_cost = round(quantity * match["ap_cost_lb"], 2)
    ep_cost = round(ap_cost / max(ep_weight, 0.001) if yield_pct <= 100 else ap_cost / (yield_pct / 100), 2)

    return {
        "ingredient": match["name"],
        "category": match["category"],
        "ap_quantity": quantity,
        "ap_unit": unit,
        "yield_pct": yield_pct,
        "cut": cut,
        "ep_quantity": ep_weight,
        "trim_quantity": trim_weight,
        "ap_cost": ap_cost,
        "ep_cost_per_unit": match["ep_cost_lb"],
        "total_ep_cost": round(ep_weight * match["ep_cost_lb"], 2) if yield_pct <= 100 else round(ep_weight * match["ap_cost_lb"] / (yield_pct / 100), 2),
        "cuts_available": [c["cut"] for c in match.get("cuts", [])],
        "volume_conversions": match.get("volume", {}),
    }


@router.get("/all")
async def get_all_yields(category: Optional[str] = None):
    """Get all yield data, optionally filtered by category."""
    if category:
        results = [y for y in YIELD_DB if y["category"] == category]
    else:
        results = YIELD_DB
    categories = list(set(y["category"] for y in YIELD_DB))
    return {"yields": results, "total": len(results), "categories": sorted(categories)}


@router.get("/categories")
async def get_categories():
    """Get all ingredient categories with counts."""
    cats = {}
    for item in YIELD_DB:
        cats.setdefault(item["category"], 0)
        cats[item["category"]] += 1
    return {"categories": [{"name": k, "count": v} for k, v in sorted(cats.items())]}


@router.post("/seed")
async def seed_yields_to_db():
    """Seed yield data to MongoDB for persistence."""
    if db["yield_database"].count_documents({}) > 0:
        return {"status": "already_seeded", "count": db["yield_database"].count_documents({})}
    for item in YIELD_DB:
        db["yield_database"].insert_one({**item, "created_at": _now()})
    return {"status": "seeded", "count": len(YIELD_DB)}



# ══════════════════════════════════════
#  CULINARY RECIPE STORAGE
# ══════════════════════════════════════

@router.get("/recipes")
async def list_culinary_recipes():
    """List saved culinary recipes — merges manual and EchoAi3-generated recipes."""
    manual = list(db["culinary_recipes"].find({}, {"_id": 0}).sort("created_at", -1))
    # Also pull EchoAi3-generated recipes from the main recipes collection
    ai_recipes_raw = list(db["recipes"].find({"source": "echoai3_generated"}, {"_id": 0}).sort("created_at", -1))
    # Normalize AI recipes to match manual recipe shape
    ai_recipes = []
    for r in ai_recipes_raw:
        ai_recipes.append({
            "recipe_id": r.get("id", ""),
            "name": r.get("name", "Untitled"),
            "portions": r.get("yield_qty", 4),
            "menu_price": r.get("menu_price", 0),
            "ingredients": r.get("ingredients", []),
            "total_cost": r.get("total_food_cost", 0),
            "cost_per_portion": round(r.get("total_food_cost", 0) / max(r.get("yield_qty", 1), 1), 2),
            "food_cost_pct": r.get("food_cost_pct", 0),
            "source": "echoai3_generated",
            "status": r.get("status", "pending_approval"),
            "description": r.get("description", ""),
            "cuisine": r.get("cuisine", ""),
            "category": r.get("category", ""),
            "created_at": r.get("created_at", ""),
        })
    all_recipes = ai_recipes + manual
    all_recipes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"recipes": all_recipes, "total": len(all_recipes)}


@router.post("/recipes")
async def save_culinary_recipe(body: dict = {}):
    """Save a culinary recipe with yield-based costing.
    Calculates total_cost, cost_per_portion, and food_cost_pct server-side
    from ingredient data if not provided."""
    recipe_id = f"cr-{_uid()}"
    ingredients = body.get("ingredients", [])
    portions = body.get("portions", 10)
    menu_price = body.get("menu_price", 0)

    # Calculate total cost from ingredients if not provided
    total_cost = body.get("total_cost", 0)
    if total_cost == 0 and ingredients:
        for ing in ingredients:
            ap_qty = ing.get("ap_quantity", ing.get("quantity", 0))
            ep_cost = ing.get("ep_cost", ing.get("estimated_cost", 0))
            if ep_cost and ap_qty:
                total_cost += ap_qty * ep_cost
            elif ing.get("cost"):
                total_cost += float(ing.get("cost", 0))
        total_cost = round(total_cost, 2)

    cost_per_portion = round(total_cost / max(portions, 1), 2)
    food_cost_pct = round((cost_per_portion / max(menu_price, 0.01)) * 100, 1) if menu_price > 0 else 0

    doc = {
        "recipe_id": recipe_id,
        "name": body.get("name", "Untitled Recipe"),
        "portions": portions,
        "menu_price": menu_price,
        "ingredients": ingredients,
        "total_cost": total_cost,
        "cost_per_portion": cost_per_portion,
        "food_cost_pct": food_cost_pct,
        "category": body.get("category", ""),
        "cuisine": body.get("cuisine", ""),
        "description": body.get("description", ""),
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["culinary_recipes"].insert_one({**doc, "_id": recipe_id})
    return doc


@router.get("/recipes/{recipe_id}")
async def get_culinary_recipe(recipe_id: str):
    """Get a culinary recipe."""
    r = db["culinary_recipes"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Recipe not found")
    return r
