"""
Mixology R&D Lab — Flavor Profiling, Taste Science, Recipe Knowledge Base
=========================================================================
Maps flavor profiles to taste buds (sweet, sour, bitter, salty, umami).
Preloaded with 50+ top-selling cocktails and non-alcoholic drinks.
Full ingredient-level costing linked to inventory.
Mirrors culinary-side logic: BeverageFlavorEngine (ABV, sugar, acid, bitterness).
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import math

router = APIRouter(prefix="/api/mixology-rd", tags=["mixology-rd"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ══════════════════════════════════════
#  INGREDIENT LIBRARY (Spirits, Mixers, Syrups, Garnishes)
# ══════════════════════════════════════

INGREDIENTS = {
    # Spirits
    "vodka": {"name": "Vodka (Premium)", "category": "spirit", "abv": 40, "cost_per_oz": 0.85, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["neutral", "clean", "crisp"]},
    "gin": {"name": "London Dry Gin", "category": "spirit", "abv": 44, "cost_per_oz": 0.95, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 2, "flavor_tags": ["juniper", "botanical", "citrus", "herbal"]},
    "tequila_blanco": {"name": "Tequila Blanco", "category": "spirit", "abv": 40, "cost_per_oz": 0.95, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["agave", "pepper", "citrus", "earthy"]},
    "tequila_reposado": {"name": "Tequila Reposado", "category": "spirit", "abv": 40, "cost_per_oz": 1.20, "sugar_g_per_oz": 0.3, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["agave", "vanilla", "caramel", "oak"]},
    "bourbon": {"name": "Bourbon Whiskey", "category": "spirit", "abv": 45, "cost_per_oz": 1.10, "sugar_g_per_oz": 0.2, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["vanilla", "caramel", "oak", "spice", "sweet"]},
    "rye": {"name": "Rye Whiskey", "category": "spirit", "abv": 45, "cost_per_oz": 1.10, "sugar_g_per_oz": 0.1, "acid_g_per_oz": 0, "bitterness": 2, "flavor_tags": ["spice", "pepper", "cinnamon", "dill"]},
    "scotch": {"name": "Scotch Whisky (Blended)", "category": "spirit", "abv": 40, "cost_per_oz": 1.00, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["smoky", "malty", "honey", "peat"]},
    "white_rum": {"name": "White Rum", "category": "spirit", "abv": 40, "cost_per_oz": 0.75, "sugar_g_per_oz": 0.5, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["sugarcane", "tropical", "light", "clean"]},
    "dark_rum": {"name": "Dark Rum", "category": "spirit", "abv": 40, "cost_per_oz": 0.90, "sugar_g_per_oz": 1.0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["molasses", "caramel", "spice", "oak", "rich"]},
    "cognac": {"name": "Cognac VS", "category": "spirit", "abv": 40, "cost_per_oz": 1.50, "sugar_g_per_oz": 0.3, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["grape", "oak", "vanilla", "dried_fruit"]},
    "mezcal": {"name": "Mezcal Joven", "category": "spirit", "abv": 42, "cost_per_oz": 1.40, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["smoke", "agave", "earthy", "mineral"]},
    # Liqueurs
    "triple_sec": {"name": "Triple Sec", "category": "liqueur", "abv": 30, "cost_per_oz": 0.50, "sugar_g_per_oz": 8, "acid_g_per_oz": 0.5, "bitterness": 1, "flavor_tags": ["orange", "sweet", "citrus"]},
    "coffee_liqueur": {"name": "Coffee Liqueur (Kahlua)", "category": "liqueur", "abv": 20, "cost_per_oz": 0.65, "sugar_g_per_oz": 12, "acid_g_per_oz": 0, "bitterness": 3, "flavor_tags": ["coffee", "chocolate", "sweet", "bitter"]},
    "campari": {"name": "Campari", "category": "liqueur", "abv": 25, "cost_per_oz": 0.80, "sugar_g_per_oz": 6, "acid_g_per_oz": 0, "bitterness": 25, "flavor_tags": ["bitter", "herbal", "orange", "complex"]},
    "sweet_vermouth": {"name": "Sweet Vermouth", "category": "fortified", "abv": 16, "cost_per_oz": 0.40, "sugar_g_per_oz": 5, "acid_g_per_oz": 0.3, "bitterness": 5, "flavor_tags": ["herbal", "sweet", "spice", "dried_fruit"]},
    "dry_vermouth": {"name": "Dry Vermouth", "category": "fortified", "abv": 18, "cost_per_oz": 0.35, "sugar_g_per_oz": 1, "acid_g_per_oz": 0.5, "bitterness": 3, "flavor_tags": ["herbal", "floral", "dry", "crisp"]},
    "chambord": {"name": "Chambord", "category": "liqueur", "abv": 16.5, "cost_per_oz": 1.00, "sugar_g_per_oz": 14, "acid_g_per_oz": 0.3, "bitterness": 0, "flavor_tags": ["raspberry", "sweet", "berry"]},
    "st_germain": {"name": "St-Germain Elderflower", "category": "liqueur", "abv": 20, "cost_per_oz": 0.90, "sugar_g_per_oz": 10, "acid_g_per_oz": 0.2, "bitterness": 0, "flavor_tags": ["elderflower", "floral", "sweet", "pear"]},
    "amaretto": {"name": "Amaretto", "category": "liqueur", "abv": 28, "cost_per_oz": 0.55, "sugar_g_per_oz": 10, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["almond", "sweet", "cherry", "marzipan"]},
    # Mixers & Juices
    "lime_juice": {"name": "Fresh Lime Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.20, "sugar_g_per_oz": 0.5, "acid_g_per_oz": 2.5, "bitterness": 0, "flavor_tags": ["sour", "citrus", "bright"]},
    "lemon_juice": {"name": "Fresh Lemon Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.18, "sugar_g_per_oz": 0.6, "acid_g_per_oz": 2.2, "bitterness": 0, "flavor_tags": ["sour", "citrus", "tart"]},
    "orange_juice": {"name": "Fresh Orange Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.15, "sugar_g_per_oz": 3.0, "acid_g_per_oz": 0.8, "bitterness": 0, "flavor_tags": ["sweet", "citrus", "fruity"]},
    "cranberry_juice": {"name": "Cranberry Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.10, "sugar_g_per_oz": 3.5, "acid_g_per_oz": 1.0, "bitterness": 2, "flavor_tags": ["tart", "berry", "bitter"]},
    "pineapple_juice": {"name": "Pineapple Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.12, "sugar_g_per_oz": 4.0, "acid_g_per_oz": 0.6, "bitterness": 0, "flavor_tags": ["sweet", "tropical", "fruity"]},
    "grapefruit_juice": {"name": "Fresh Grapefruit Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.18, "sugar_g_per_oz": 2.5, "acid_g_per_oz": 1.5, "bitterness": 3, "flavor_tags": ["bitter", "citrus", "tart"]},
    "simple_syrup": {"name": "Simple Syrup (1:1)", "category": "syrup", "abv": 0, "cost_per_oz": 0.10, "sugar_g_per_oz": 14, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["sweet"]},
    "rich_syrup": {"name": "Rich Demerara Syrup (2:1)", "category": "syrup", "abv": 0, "cost_per_oz": 0.12, "sugar_g_per_oz": 20, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["sweet", "molasses", "caramel"]},
    "honey_syrup": {"name": "Honey Syrup", "category": "syrup", "abv": 0, "cost_per_oz": 0.18, "sugar_g_per_oz": 16, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["honey", "sweet", "floral"]},
    "ginger_syrup": {"name": "Ginger Syrup", "category": "syrup", "abv": 0, "cost_per_oz": 0.22, "sugar_g_per_oz": 12, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["ginger", "spicy", "sweet"]},
    "passion_fruit_puree": {"name": "Passion Fruit Puree", "category": "puree", "abv": 0, "cost_per_oz": 0.60, "sugar_g_per_oz": 4, "acid_g_per_oz": 1.5, "bitterness": 0, "flavor_tags": ["tropical", "tart", "sweet", "exotic"]},
    "soda_water": {"name": "Soda Water", "category": "mixer", "abv": 0, "cost_per_oz": 0.05, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["neutral", "effervescent"]},
    "tonic_water": {"name": "Tonic Water", "category": "mixer", "abv": 0, "cost_per_oz": 0.08, "sugar_g_per_oz": 3, "acid_g_per_oz": 0, "bitterness": 10, "flavor_tags": ["bitter", "quinine", "sweet"]},
    "ginger_beer": {"name": "Ginger Beer", "category": "mixer", "abv": 0, "cost_per_oz": 0.10, "sugar_g_per_oz": 4, "acid_g_per_oz": 0.3, "bitterness": 2, "flavor_tags": ["ginger", "spicy", "sweet", "fizzy"]},
    "cola": {"name": "Cola", "category": "mixer", "abv": 0, "cost_per_oz": 0.06, "sugar_g_per_oz": 3.5, "acid_g_per_oz": 0.3, "bitterness": 1, "flavor_tags": ["sweet", "caramel", "vanilla", "spice"]},
    "prosecco": {"name": "Prosecco", "category": "wine", "abv": 11, "cost_per_oz": 0.60, "sugar_g_per_oz": 1.5, "acid_g_per_oz": 0.6, "bitterness": 0, "flavor_tags": ["apple", "pear", "floral", "crisp"]},
    "champagne": {"name": "Champagne", "category": "wine", "abv": 12, "cost_per_oz": 1.10, "sugar_g_per_oz": 0.8, "acid_g_per_oz": 0.7, "bitterness": 0, "flavor_tags": ["toast", "apple", "citrus", "yeast", "mineral"]},
    "espresso": {"name": "Espresso Shot", "category": "coffee", "abv": 0, "cost_per_oz": 0.30, "sugar_g_per_oz": 0, "acid_g_per_oz": 0.5, "bitterness": 15, "flavor_tags": ["coffee", "bitter", "roast", "chocolate"]},
    # Bitters & Garnishes
    "angostura": {"name": "Angostura Bitters", "category": "bitters", "abv": 44.7, "cost_per_dash": 0.05, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 40, "flavor_tags": ["bitter", "cinnamon", "clove", "warm_spice"], "unit": "dash"},
    "orange_bitters": {"name": "Orange Bitters", "category": "bitters", "abv": 28, "cost_per_dash": 0.06, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 30, "flavor_tags": ["orange", "bitter", "aromatic"], "unit": "dash"},
    "peychauds": {"name": "Peychaud's Bitters", "category": "bitters", "abv": 35, "cost_per_dash": 0.05, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 35, "flavor_tags": ["anise", "cherry", "floral"], "unit": "dash"},
    "mint": {"name": "Fresh Mint Leaves", "category": "garnish", "abv": 0, "cost_each": 0.03, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["mint", "herbal", "cool", "fresh"], "unit": "each"},
    "orange_peel": {"name": "Orange Peel", "category": "garnish", "abv": 0, "cost_each": 0.15, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["orange", "citrus_oil", "aromatic"], "unit": "each"},
    "cherry": {"name": "Luxardo Cherry", "category": "garnish", "abv": 0, "cost_each": 0.35, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["cherry", "sweet", "rich"], "unit": "each"},
    # Additional Ingredients for 50+ recipes
    "absinthe": {"name": "Absinthe", "category": "spirit", "abv": 68, "cost_per_oz": 1.60, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 15, "flavor_tags": ["anise", "herbal", "wormwood", "intense"]},
    "green_chartreuse": {"name": "Green Chartreuse", "category": "liqueur", "abv": 55, "cost_per_oz": 1.80, "sugar_g_per_oz": 7, "acid_g_per_oz": 0, "bitterness": 8, "flavor_tags": ["herbal", "complex", "mint", "anise"]},
    "maraschino": {"name": "Maraschino Liqueur", "category": "liqueur", "abv": 32, "cost_per_oz": 0.85, "sugar_g_per_oz": 8, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["cherry", "almond", "floral", "nutty"]},
    "cachaca": {"name": "Cachaca", "category": "spirit", "abv": 40, "cost_per_oz": 0.80, "sugar_g_per_oz": 0.5, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["sugarcane", "grassy", "funky", "tropical"]},
    "cream_of_coconut": {"name": "Cream of Coconut", "category": "syrup", "abv": 0, "cost_per_oz": 0.25, "sugar_g_per_oz": 12, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["coconut", "sweet", "tropical", "creamy"]},
    "tomato_juice": {"name": "Tomato Juice", "category": "juice", "abv": 0, "cost_per_oz": 0.08, "sugar_g_per_oz": 1.5, "acid_g_per_oz": 0.5, "bitterness": 0, "flavor_tags": ["savory", "umami", "tomato", "earthy"]},
    "tabasco": {"name": "Tabasco Hot Sauce", "category": "condiment", "abv": 0, "cost_per_dash": 0.02, "sugar_g_per_oz": 0, "acid_g_per_oz": 1, "bitterness": 0, "flavor_tags": ["spicy", "vinegar", "pepper"], "unit": "dash"},
    "worcestershire": {"name": "Worcestershire Sauce", "category": "condiment", "abv": 0, "cost_per_dash": 0.03, "sugar_g_per_oz": 2, "acid_g_per_oz": 0.5, "bitterness": 1, "flavor_tags": ["umami", "savory", "anchovy", "tamarind"], "unit": "dash"},
    "creme_de_cacao": {"name": "Creme de Cacao (Dark)", "category": "liqueur", "abv": 25, "cost_per_oz": 0.55, "sugar_g_per_oz": 14, "acid_g_per_oz": 0, "bitterness": 2, "flavor_tags": ["chocolate", "sweet", "vanilla"]},
    "benedictine": {"name": "Benedictine D.O.M.", "category": "liqueur", "abv": 40, "cost_per_oz": 1.20, "sugar_g_per_oz": 10, "acid_g_per_oz": 0, "bitterness": 3, "flavor_tags": ["herbal", "honey", "spice", "saffron"]},
    "blackberry_liqueur": {"name": "Creme de Mure (Blackberry)", "category": "liqueur", "abv": 16, "cost_per_oz": 0.75, "sugar_g_per_oz": 14, "acid_g_per_oz": 0.2, "bitterness": 0, "flavor_tags": ["blackberry", "sweet", "berry"]},
    "irish_whiskey": {"name": "Irish Whiskey", "category": "spirit", "abv": 40, "cost_per_oz": 0.95, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["smooth", "malty", "honey", "vanilla"]},
    "orgeat": {"name": "Orgeat Syrup", "category": "syrup", "abv": 0, "cost_per_oz": 0.30, "sugar_g_per_oz": 14, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["almond", "sweet", "floral", "orange_blossom"]},
    "cream": {"name": "Heavy Cream", "category": "dairy", "abv": 0, "cost_per_oz": 0.12, "sugar_g_per_oz": 0.5, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["creamy", "rich", "smooth"]},
    "celery_salt": {"name": "Celery Salt", "category": "condiment", "abv": 0, "cost_per_dash": 0.01, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["salty", "celery", "savory"], "unit": "dash"},
    "cinnamon_syrup": {"name": "Cinnamon Syrup", "category": "syrup", "abv": 0, "cost_per_oz": 0.20, "sugar_g_per_oz": 14, "acid_g_per_oz": 0, "bitterness": 0, "flavor_tags": ["cinnamon", "warm_spice", "sweet"]},
    "falernum": {"name": "Falernum", "category": "liqueur", "abv": 11, "cost_per_oz": 0.50, "sugar_g_per_oz": 10, "acid_g_per_oz": 0.3, "bitterness": 0, "flavor_tags": ["lime", "almond", "clove", "ginger"]},
    "lemon_peel": {"name": "Lemon Peel", "category": "garnish", "abv": 0, "cost_each": 0.10, "sugar_g_per_oz": 0, "acid_g_per_oz": 0, "bitterness": 1, "flavor_tags": ["lemon", "citrus_oil", "bright"], "unit": "each"},
}

# Taste bud mapping
TASTE_MAP = {
    "sweet": {"receptors": "Tip of tongue", "threshold": "Low — humans detect easily", "in_cocktails": "Sugar, syrups, liqueurs, fruit juices, honey"},
    "sour": {"receptors": "Sides of tongue", "threshold": "Medium", "in_cocktails": "Citrus juice, vinegar shrubs, fermented ingredients"},
    "bitter": {"receptors": "Back of tongue", "threshold": "Very low — detected in tiny amounts", "in_cocktails": "Bitters (Angostura, Campari), tonic water, amaro, grapefruit"},
    "salty": {"receptors": "Front-sides of tongue", "threshold": "Medium", "in_cocktails": "Salt rim, saline solution, olive brine (dirty martini)"},
    "umami": {"receptors": "Broadly distributed", "threshold": "Medium", "in_cocktails": "Tomato (Bloody Mary), mushroom-infused spirits, miso, soy"},
}


# ══════════════════════════════════════
#  TOP 50 COCKTAIL + NON-ALCOHOLIC RECIPES
# ══════════════════════════════════════

RECIPE_DB = [
    # ─── Top 25 Alcoholic Cocktails ───
    {"name": "Old Fashioned", "category": "whiskey", "type": "alcoholic", "method": "stirred", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("bourbon", 2.0, "oz"), ("simple_syrup", 0.25, "oz"), ("angostura", 3, "dash"), ("orange_peel", 1, "each")],
     "menu_price": 24.00, "taste_profile": {"sweet": 2, "sour": 0, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Margarita", "category": "tequila", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None (up)",
     "ingredients": [("tequila_blanco", 2.0, "oz"), ("lime_juice", 1.0, "oz"), ("triple_sec", 0.75, "oz"), ("simple_syrup", 0.5, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 5, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Espresso Martini", "category": "vodka", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None (up)",
     "ingredients": [("vodka", 1.5, "oz"), ("coffee_liqueur", 1.0, "oz"), ("espresso", 1.0, "oz"), ("simple_syrup", 0.5, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 1, "bitter": 5, "salty": 0, "umami": 0}},
    {"name": "Mojito", "category": "rum", "type": "alcoholic", "method": "muddled", "glass": "Collins", "ice": "Crushed",
     "ingredients": [("white_rum", 2.0, "oz"), ("lime_juice", 1.0, "oz"), ("simple_syrup", 0.75, "oz"), ("mint", 8, "each"), ("soda_water", 2.0, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "Negroni", "category": "gin", "type": "alcoholic", "method": "stirred", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("gin", 1.0, "oz"), ("campari", 1.0, "oz"), ("sweet_vermouth", 1.0, "oz"), ("orange_peel", 1, "each")],
     "menu_price": 24.00, "taste_profile": {"sweet": 2, "sour": 0, "bitter": 5, "salty": 0, "umami": 0}},
    {"name": "Whiskey Sour", "category": "whiskey", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Fresh",
     "ingredients": [("bourbon", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("simple_syrup", 0.75, "oz"), ("angostura", 2, "dash")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Daiquiri", "category": "rum", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("white_rum", 2.0, "oz"), ("lime_juice", 1.0, "oz"), ("simple_syrup", 0.75, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "Manhattan", "category": "whiskey", "type": "alcoholic", "method": "stirred", "glass": "Coupe", "ice": "None",
     "ingredients": [("rye", 2.0, "oz"), ("sweet_vermouth", 1.0, "oz"), ("angostura", 2, "dash"), ("cherry", 1, "each")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 0, "bitter": 3, "salty": 0, "umami": 0}},
    {"name": "Moscow Mule", "category": "vodka", "type": "alcoholic", "method": "built", "glass": "Copper Mug", "ice": "Fresh",
     "ingredients": [("vodka", 2.0, "oz"), ("lime_juice", 0.75, "oz"), ("ginger_beer", 4.0, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Paloma", "category": "tequila", "type": "alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("tequila_blanco", 2.0, "oz"), ("grapefruit_juice", 2.0, "oz"), ("lime_juice", 0.5, "oz"), ("simple_syrup", 0.5, "oz"), ("soda_water", 1.0, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 3, "salty": 0, "umami": 0}},
    {"name": "Gin & Tonic", "category": "gin", "type": "alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("gin", 2.0, "oz"), ("tonic_water", 4.0, "oz"), ("lime_juice", 0.25, "oz")],
     "menu_price": 20.00, "taste_profile": {"sweet": 1, "sour": 1, "bitter": 5, "salty": 0, "umami": 0}},
    {"name": "Aperol Spritz", "category": "wine", "type": "alcoholic", "method": "built", "glass": "Wine", "ice": "Fresh",
     "ingredients": [("prosecco", 3.0, "oz"), ("campari", 2.0, "oz"), ("soda_water", 1.0, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 3, "sour": 1, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Cosmopolitan", "category": "vodka", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("vodka", 1.5, "oz"), ("triple_sec", 1.0, "oz"), ("cranberry_juice", 1.0, "oz"), ("lime_juice", 0.5, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Mai Tai", "category": "rum", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Crushed",
     "ingredients": [("white_rum", 1.0, "oz"), ("dark_rum", 1.0, "oz"), ("lime_juice", 1.0, "oz"), ("triple_sec", 0.5, "oz"), ("simple_syrup", 0.5, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "French 75", "category": "gin", "type": "alcoholic", "method": "shaken_topped", "glass": "Flute", "ice": "None",
     "ingredients": [("gin", 1.0, "oz"), ("lemon_juice", 0.75, "oz"), ("simple_syrup", 0.5, "oz"), ("champagne", 3.0, "oz")],
     "menu_price": 28.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Sidecar", "category": "brandy", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("cognac", 2.0, "oz"), ("triple_sec", 0.75, "oz"), ("lemon_juice", 0.75, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Dark & Stormy", "category": "rum", "type": "alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("dark_rum", 2.0, "oz"), ("ginger_beer", 4.0, "oz"), ("lime_juice", 0.5, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 3, "sour": 2, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Sazerac", "category": "whiskey", "type": "alcoholic", "method": "stirred", "glass": "Rocks", "ice": "None",
     "ingredients": [("rye", 2.0, "oz"), ("rich_syrup", 0.25, "oz"), ("peychauds", 4, "dash"), ("lemon_peel", 1, "each")],
     "menu_price": 26.00, "taste_profile": {"sweet": 1, "sour": 0, "bitter": 5, "salty": 0, "umami": 0}},
    {"name": "Amaretto Sour", "category": "liqueur", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Fresh",
     "ingredients": [("amaretto", 1.5, "oz"), ("bourbon", 0.75, "oz"), ("lemon_juice", 1.0, "oz"), ("simple_syrup", 0.25, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 4, "sour": 4, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Pier Two Signature", "category": "specialty", "type": "alcoholic", "method": "shaken_topped", "glass": "Coupe", "ice": "None",
     "ingredients": [("vodka", 1.5, "oz"), ("passion_fruit_puree", 1.0, "oz"), ("lime_juice", 0.75, "oz"), ("simple_syrup", 0.5, "oz"), ("prosecco", 1.0, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 4, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}},
    # ─── Top Non-Alcoholic Drinks ───
    {"name": "Virgin Mojito", "category": "mocktail", "type": "non_alcoholic", "method": "muddled", "glass": "Collins", "ice": "Crushed",
     "ingredients": [("lime_juice", 1.0, "oz"), ("simple_syrup", 1.0, "oz"), ("mint", 8, "each"), ("soda_water", 4.0, "oz")],
     "menu_price": 12.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Shirley Temple", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("ginger_beer", 4.0, "oz"), ("simple_syrup", 0.5, "oz"), ("lime_juice", 0.25, "oz"), ("cherry", 1, "each")],
     "menu_price": 10.00, "taste_profile": {"sweet": 5, "sour": 1, "bitter": 1, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Arnold Palmer", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Collins", "ice": "Fresh",
     "ingredients": [("lemon_juice", 2.0, "oz"), ("simple_syrup", 1.5, "oz"), ("soda_water", 4.0, "oz")],
     "menu_price": 10.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Passion Fruit Spritz (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Wine", "ice": "Fresh",
     "ingredients": [("passion_fruit_puree", 1.5, "oz"), ("simple_syrup", 0.5, "oz"), ("lime_juice", 0.5, "oz"), ("soda_water", 4.0, "oz")],
     "menu_price": 12.00, "taste_profile": {"sweet": 4, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Espresso Tonic", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("espresso", 2.0, "oz"), ("tonic_water", 4.0, "oz"), ("simple_syrup", 0.25, "oz")],
     "menu_price": 12.00, "taste_profile": {"sweet": 1, "sour": 0, "bitter": 5, "salty": 0, "umami": 0}, "gl_account": "4100"},
    # ─── Additional Alcoholic (25 more) ───
    {"name": "Bloody Mary", "category": "vodka", "type": "alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("vodka", 1.5, "oz"), ("tomato_juice", 4.0, "oz"), ("lemon_juice", 0.5, "oz"), ("tabasco", 3, "dash"), ("worcestershire", 3, "dash"), ("celery_salt", 2, "dash")],
     "menu_price": 22.00, "taste_profile": {"sweet": 1, "sour": 2, "bitter": 1, "salty": 3, "umami": 5}},
    {"name": "Pina Colada", "category": "rum", "type": "alcoholic", "method": "blended", "glass": "Hurricane", "ice": "Crushed",
     "ingredients": [("white_rum", 2.0, "oz"), ("cream_of_coconut", 1.5, "oz"), ("pineapple_juice", 3.0, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 5, "sour": 1, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "Mint Julep", "category": "whiskey", "type": "alcoholic", "method": "muddled", "glass": "Julep Cup", "ice": "Crushed",
     "ingredients": [("bourbon", 2.5, "oz"), ("simple_syrup", 0.5, "oz"), ("mint", 10, "each")],
     "menu_price": 24.00, "taste_profile": {"sweet": 2, "sour": 0, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Tom Collins", "category": "gin", "type": "alcoholic", "method": "shaken_topped", "glass": "Collins", "ice": "Fresh",
     "ingredients": [("gin", 2.0, "oz"), ("lemon_juice", 1.0, "oz"), ("simple_syrup", 0.5, "oz"), ("soda_water", 2.0, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Vesper", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 2.0, "oz"), ("vodka", 0.5, "oz"), ("dry_vermouth", 0.5, "oz"), ("lemon_peel", 1, "each")],
     "menu_price": 26.00, "taste_profile": {"sweet": 0, "sour": 0, "bitter": 3, "salty": 0, "umami": 0}},
    {"name": "Penicillin", "category": "whiskey", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("scotch", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("honey_syrup", 0.75, "oz"), ("ginger_syrup", 0.25, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Last Word", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 0.75, "oz"), ("green_chartreuse", 0.75, "oz"), ("maraschino", 0.75, "oz"), ("lime_juice", 0.75, "oz")],
     "menu_price": 28.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 3, "salty": 0, "umami": 0}},
    {"name": "Bramble", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Crushed",
     "ingredients": [("gin", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("simple_syrup", 0.5, "oz"), ("blackberry_liqueur", 0.5, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Caipirinha", "category": "specialty", "type": "alcoholic", "method": "muddled", "glass": "Rocks", "ice": "Crushed",
     "ingredients": [("cachaca", 2.0, "oz"), ("lime_juice", 1.0, "oz"), ("simple_syrup", 0.75, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 3, "sour": 5, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "Irish Coffee", "category": "whiskey", "type": "alcoholic", "method": "built", "glass": "Irish Coffee Mug", "ice": "None",
     "ingredients": [("irish_whiskey", 1.5, "oz"), ("espresso", 2.0, "oz"), ("rich_syrup", 0.5, "oz"), ("cream", 1.0, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 0, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Corpse Reviver No. 2", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 0.75, "oz"), ("triple_sec", 0.75, "oz"), ("lemon_juice", 0.75, "oz"), ("dry_vermouth", 0.75, "oz"), ("absinthe", 0.1, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 3, "salty": 0, "umami": 0}},
    {"name": "Vieux Carre", "category": "whiskey", "type": "alcoholic", "method": "stirred", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("rye", 0.75, "oz"), ("cognac", 0.75, "oz"), ("sweet_vermouth", 0.75, "oz"), ("benedictine", 0.25, "oz"), ("peychauds", 2, "dash"), ("angostura", 1, "dash")],
     "menu_price": 28.00, "taste_profile": {"sweet": 3, "sour": 0, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Gimlet", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 2.0, "oz"), ("lime_juice", 0.75, "oz"), ("simple_syrup", 0.75, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 2, "sour": 4, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Bee's Knees", "category": "gin", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("honey_syrup", 0.75, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Jungle Bird", "category": "rum", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Fresh",
     "ingredients": [("dark_rum", 1.5, "oz"), ("campari", 0.75, "oz"), ("pineapple_juice", 1.5, "oz"), ("lime_juice", 0.5, "oz"), ("simple_syrup", 0.5, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 2, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Paper Plane", "category": "whiskey", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("bourbon", 0.75, "oz"), ("campari", 0.75, "oz"), ("amaretto", 0.75, "oz"), ("lemon_juice", 0.75, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Naked and Famous", "category": "specialty", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("mezcal", 0.75, "oz"), ("campari", 0.75, "oz"), ("st_germain", 0.75, "oz"), ("lime_juice", 0.75, "oz")],
     "menu_price": 28.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 4, "salty": 0, "umami": 0}},
    {"name": "Hemingway Daiquiri", "category": "rum", "type": "alcoholic", "method": "shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("white_rum", 2.0, "oz"), ("lime_juice", 0.75, "oz"), ("grapefruit_juice", 0.5, "oz"), ("maraschino", 0.5, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 1, "sour": 4, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Clover Club", "category": "gin", "type": "alcoholic", "method": "dry_shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("gin", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("chambord", 0.5, "oz"), ("simple_syrup", 0.25, "oz")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Mezcal Mule", "category": "specialty", "type": "alcoholic", "method": "built", "glass": "Copper Mug", "ice": "Fresh",
     "ingredients": [("mezcal", 2.0, "oz"), ("lime_juice", 0.75, "oz"), ("ginger_beer", 4.0, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 1, "salty": 0, "umami": 1}},
    {"name": "Boulevardier", "category": "whiskey", "type": "alcoholic", "method": "stirred", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("bourbon", 1.5, "oz"), ("campari", 1.0, "oz"), ("sweet_vermouth", 1.0, "oz"), ("orange_peel", 1, "each")],
     "menu_price": 26.00, "taste_profile": {"sweet": 2, "sour": 0, "bitter": 5, "salty": 0, "umami": 0}},
    {"name": "Gold Rush", "category": "whiskey", "type": "alcoholic", "method": "shaken", "glass": "Rocks", "ice": "Large cube",
     "ingredients": [("bourbon", 2.0, "oz"), ("lemon_juice", 0.75, "oz"), ("honey_syrup", 0.75, "oz")],
     "menu_price": 24.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 1, "salty": 0, "umami": 0}},
    {"name": "Tequila Sunrise", "category": "tequila", "type": "alcoholic", "method": "built", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("tequila_blanco", 2.0, "oz"), ("orange_juice", 4.0, "oz"), ("simple_syrup", 0.25, "oz")],
     "menu_price": 20.00, "taste_profile": {"sweet": 4, "sour": 2, "bitter": 0, "salty": 0, "umami": 0}},
    {"name": "Pisco Sour", "category": "specialty", "type": "alcoholic", "method": "dry_shaken", "glass": "Coupe", "ice": "None",
     "ingredients": [("cognac", 2.0, "oz"), ("lime_juice", 1.0, "oz"), ("simple_syrup", 0.75, "oz"), ("angostura", 3, "dash")],
     "menu_price": 26.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 2, "salty": 0, "umami": 0}},
    {"name": "Rum Punch", "category": "rum", "type": "alcoholic", "method": "shaken", "glass": "Hurricane", "ice": "Fresh",
     "ingredients": [("dark_rum", 1.5, "oz"), ("white_rum", 0.5, "oz"), ("orange_juice", 1.5, "oz"), ("pineapple_juice", 1.5, "oz"), ("lime_juice", 0.5, "oz"), ("simple_syrup", 0.5, "oz")],
     "menu_price": 22.00, "taste_profile": {"sweet": 4, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}},
    # ─── Additional Non-Alcoholic (5 more) ───
    {"name": "Cucumber Cooler (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "muddled", "glass": "Highball", "ice": "Fresh",
     "ingredients": [("lime_juice", 1.0, "oz"), ("simple_syrup", 0.75, "oz"), ("mint", 4, "each"), ("soda_water", 4.0, "oz")],
     "menu_price": 12.00, "taste_profile": {"sweet": 2, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Ginger Mule (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Copper Mug", "ice": "Fresh",
     "ingredients": [("lime_juice", 0.75, "oz"), ("ginger_syrup", 0.5, "oz"), ("ginger_beer", 5.0, "oz")],
     "menu_price": 10.00, "taste_profile": {"sweet": 3, "sour": 2, "bitter": 1, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Tropical Punch (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "shaken", "glass": "Hurricane", "ice": "Fresh",
     "ingredients": [("pineapple_juice", 2.0, "oz"), ("orange_juice", 2.0, "oz"), ("passion_fruit_puree", 1.0, "oz"), ("lime_juice", 0.5, "oz")],
     "menu_price": 12.00, "taste_profile": {"sweet": 4, "sour": 3, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Lavender Lemonade (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "shaken", "glass": "Collins", "ice": "Fresh",
     "ingredients": [("lemon_juice", 1.5, "oz"), ("simple_syrup", 1.0, "oz"), ("soda_water", 4.0, "oz")],
     "menu_price": 10.00, "taste_profile": {"sweet": 3, "sour": 4, "bitter": 0, "salty": 0, "umami": 0}, "gl_account": "4100"},
    {"name": "Cranberry Spritz (NA)", "category": "mocktail", "type": "non_alcoholic", "method": "built", "glass": "Wine", "ice": "Fresh",
     "ingredients": [("cranberry_juice", 2.0, "oz"), ("lime_juice", 0.5, "oz"), ("simple_syrup", 0.5, "oz"), ("soda_water", 3.0, "oz")],
     "menu_price": 10.00, "taste_profile": {"sweet": 3, "sour": 3, "bitter": 2, "salty": 0, "umami": 0}, "gl_account": "4100"},
]


@router.get("/ingredients")
async def list_ingredients(category: Optional[str] = None):
    """Full ingredient library with flavor tags, costs, and chemistry."""
    filtered = {k: v for k, v in INGREDIENTS.items() if not category or v["category"] == category}
    categories = sorted(set(v["category"] for v in INGREDIENTS.values()))
    return {"ingredients": filtered, "categories": categories, "total": len(filtered)}


@router.get("/taste-map")
async def get_taste_map():
    """Taste bud science — how flavors map to receptors."""
    return {"taste_buds": TASTE_MAP, "balance_rules": [
        {"rule": "Sweet + Sour = Balance", "detail": "The foundation of most cocktails. Sugar tames acid, acid cuts sweetness."},
        {"rule": "Bitter needs Sweet", "detail": "Bitter ingredients (Campari, bitters) need sweetness to be palatable. Negroni = bitter + sweet vermouth."},
        {"rule": "Salt amplifies flavor", "detail": "Saline solution (2-3 drops) opens up aromas and rounds out sweetness without tasting salty."},
        {"rule": "Acid brightens", "detail": "Citrus juice adds freshness and perceived lightness. Essential in shaken cocktails."},
        {"rule": "Dilution is an ingredient", "detail": "Ice melt (typically 25-30% dilution) softens ABV and integrates flavors. Stirred drinks dilute less than shaken."},
    ]}


# ══════════════════════════════════════
#  RECIPE DATABASE & COSTING
# ══════════════════════════════════════

@router.get("/recipes")
async def list_recipes(type_filter: Optional[str] = None, category: Optional[str] = None):
    """List all preloaded recipes with full costing and flavor profiles."""
    recipes = RECIPE_DB
    if type_filter:
        recipes = [r for r in recipes if r["type"] == type_filter]
    if category:
        recipes = [r for r in recipes if r["category"] == category]

    results = []
    for recipe in recipes:
        costed = _cost_recipe(recipe)
        results.append(costed)

    results.sort(key=lambda x: x["name"])
    categories = sorted(set(r["category"] for r in RECIPE_DB))
    return {
        "recipes": results,
        "total": len(results),
        "categories": categories,
        "summary": {
            "alcoholic": len([r for r in results if r["type"] == "alcoholic"]),
            "non_alcoholic": len([r for r in results if r["type"] == "non_alcoholic"]),
            "avg_cost": round(sum(r["total_cost"] for r in results) / max(len(results), 1), 2),
            "avg_price": round(sum(r["menu_price"] for r in results) / max(len(results), 1), 2),
            "avg_margin_pct": round(sum(r["margin_pct"] for r in results) / max(len(results), 1), 1),
        },
    }


@router.get("/recipes/{recipe_name}")
async def get_recipe_detail(recipe_name: str):
    """Get full recipe detail with flavor profile and costing."""
    recipe = next((r for r in RECIPE_DB if r["name"].lower().replace(" ", "-") == recipe_name.lower().replace(" ", "-")), None)
    if not recipe:
        recipe = next((r for r in RECIPE_DB if recipe_name.lower() in r["name"].lower()), None)
    if not recipe:
        raise HTTPException(404, f"Recipe '{recipe_name}' not found")
    return _cost_recipe(recipe)


@router.get("/search/by-taste")
async def find_recipes_by_taste(
    sweet: int = Query(0, ge=0, le=5),
    sour: int = Query(0, ge=0, le=5),
    bitter: int = Query(0, ge=0, le=5),
):
    """Find recipes matching a taste preference profile."""
    scored = []
    for recipe in RECIPE_DB:
        tp = recipe["taste_profile"]
        dist = math.sqrt(
            (tp["sweet"] - sweet) ** 2 +
            (tp["sour"] - sour) ** 2 +
            (tp["bitter"] - bitter) ** 2
        )
        scored.append((_cost_recipe(recipe), dist))
    scored.sort(key=lambda x: x[1])
    return {"query": {"sweet": sweet, "sour": sour, "bitter": bitter},
            "matches": [{"recipe": s[0], "taste_distance": round(s[1], 2)} for s in scored[:10]]}


@router.post("/recipes/analyze")
async def analyze_custom_recipe(body: dict = {}):
    """Analyze a custom recipe — calculate cost, ABV, flavor profile, balance score."""
    name = body.get("name", "Custom Cocktail")
    ingredients = body.get("ingredients", [])
    menu_price = body.get("menu_price", 24.00)

    total_vol = 0
    alcohol_vol = 0
    sugar_g = 0
    acid_g = 0
    bitterness = 0
    total_cost = 0
    processed = []

    for ing in ingredients:
        ing_id = ing.get("ingredient_id", "")
        qty = ing.get("quantity", 0)
        unit = ing.get("unit", "oz")
        spec = INGREDIENTS.get(ing_id, {})

        if unit == "oz":
            cost = qty * spec.get("cost_per_oz", 0.50)
            vol_ml = qty * 29.57
            total_vol += vol_ml
            alcohol_vol += vol_ml * spec.get("abv", 0) / 100
            sugar_g += qty * spec.get("sugar_g_per_oz", 0)
            acid_g += qty * spec.get("acid_g_per_oz", 0)
            bitterness += spec.get("bitterness", 0) * qty / 2
        elif unit == "dash":
            cost = qty * spec.get("cost_per_dash", 0.05)
            bitterness += spec.get("bitterness", 0) * qty * 0.1
        elif unit == "each":
            cost = qty * spec.get("cost_each", 0.10)
        else:
            cost = 0.10

        total_cost += cost
        processed.append({
            "ingredient": spec.get("name", ing_id),
            "quantity": qty, "unit": unit,
            "cost": round(cost, 2),
            "flavor_tags": spec.get("flavor_tags", []),
        })

    abv = round(alcohol_vol / max(total_vol, 1) * 100, 1) if total_vol > 0 else 0
    sugar_per_l = round(sugar_g / max(total_vol / 1000, 0.01), 1) if total_vol > 0 else 0
    acid_per_l = round(acid_g / max(total_vol / 1000, 0.01), 1) if total_vol > 0 else 0

    # Balance scoring
    balance = 100
    if sugar_per_l > 60 and acid_per_l < 3:
        balance -= 20  # Too sweet without acid
    if bitterness > 15 and sugar_per_l < 5:
        balance -= 20  # Bitter without sweetener
    if abv > 25:
        balance -= 10  # Very strong
    if total_vol < 60:
        balance -= 10  # Too small
    balance = max(0, min(100, balance))

    sweetness = "dry" if sugar_per_l < 5 else "off_dry" if sugar_per_l < 20 else "medium" if sugar_per_l < 60 else "sweet"
    profit = round(menu_price - total_cost, 2)
    margin = round(profit / max(menu_price, 1) * 100, 1)

    return {
        "name": name,
        "ingredients": processed,
        "chemistry": {
            "total_volume_ml": round(total_vol, 1),
            "abv_pct": abv,
            "sugar_g_per_l": sugar_per_l,
            "acid_g_per_l": acid_per_l,
            "bitterness_index": round(bitterness, 1),
            "sweetness": sweetness,
        },
        "balance_score": balance,
        "costing": {
            "total_cost": round(total_cost, 2),
            "menu_price": menu_price,
            "profit": profit,
            "margin_pct": margin,
            "cost_pct": round(total_cost / max(menu_price, 1) * 100, 1),
        },
        "gl_account": "4200 - Beverage Cost" if abv > 0 else "4100 - Food Cost",
    }


def _cost_recipe(recipe):
    """Cost a recipe from the DB."""
    total_cost = 0
    total_vol = 0
    alcohol_vol = 0
    sugar_g = 0
    acid_g = 0
    bitterness_total = 0
    costed_ingredients = []

    for ing_tuple in recipe["ingredients"]:
        ing_id, qty, unit = ing_tuple
        spec = INGREDIENTS.get(ing_id, {})

        if unit == "oz":
            cost = round(qty * spec.get("cost_per_oz", 0.50), 2)
            vol_ml = qty * 29.57
            total_vol += vol_ml
            alcohol_vol += vol_ml * spec.get("abv", 0) / 100
            sugar_g += qty * spec.get("sugar_g_per_oz", 0)
            acid_g += qty * spec.get("acid_g_per_oz", 0)
            bitterness_total += spec.get("bitterness", 0) * qty / 2
        elif unit == "dash":
            cost = round(qty * spec.get("cost_per_dash", 0.05), 2)
            bitterness_total += spec.get("bitterness", 0) * qty * 0.1
        elif unit == "each":
            cost = round(qty * spec.get("cost_each", 0.10), 2)
        else:
            cost = 0.10

        total_cost += cost
        costed_ingredients.append({
            "ingredient": spec.get("name", ing_id), "id": ing_id,
            "quantity": qty, "unit": unit, "cost": cost,
            "flavor_tags": spec.get("flavor_tags", []),
        })

    abv = round(alcohol_vol / max(total_vol, 1) * 100, 1) if total_vol > 0 else 0
    profit = round(recipe["menu_price"] - total_cost, 2)
    margin = round(profit / max(recipe["menu_price"], 1) * 100, 1)

    return {
        **recipe,
        "ingredients": costed_ingredients,
        "total_cost": round(total_cost, 2),
        "profit": profit,
        "margin_pct": margin,
        "cost_pct": round(total_cost / max(recipe["menu_price"], 1) * 100, 1),
        "abv_pct": abv,
        "total_volume_oz": round(total_vol / 29.57, 1),
        "gl_account": recipe.get("gl_account", "4200 - Beverage Cost" if abv > 0 else "4100 - Food Cost"),
    }
