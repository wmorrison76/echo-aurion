"""
Fix My Menu — AI-powered menu item margin analysis and optimization.
Analyzes food cost %, suggests ingredient swaps, portion adjustments, and pricing changes.
Uses GPT-4.1-mini via Emergent LLM Key.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
import json

router = APIRouter(prefix="/api/fix-menu", tags=["fix-menu"])

from database import db as _db
analyses_col = _db["menu_analyses"]
menu_items_col = _db["menu_items"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════════════════════════
# MARGIN SCANNER — analyze entire menu for margin issues
# ═══════════════════════════════════════════════════════════════

@router.get("/scan")
def scan_menu(outlet_id: Optional[str] = None, threshold: float = 0.35):
    """Scan menu items and flag those above the food cost threshold."""
    q: dict = {}
    if outlet_id:
        q["outlet_id"] = outlet_id

    items = list(menu_items_col.find(q, {"_id": 0}).limit(200))

    flagged = []
    healthy = []
    total_revenue_risk = 0

    for item in items:
        food_cost = item.get("food_cost", 0)
        sell_price = item.get("price", item.get("sell_price", 0))
        if sell_price <= 0:
            continue
        cost_pct = food_cost / sell_price
        margin_pct = 1 - cost_pct

        entry = {
            "item_id": item.get("item_id", item.get("name", "")),
            "name": item.get("name", ""),
            "category": item.get("category", ""),
            "food_cost": round(food_cost, 2),
            "sell_price": round(sell_price, 2),
            "cost_pct": round(cost_pct, 4),
            "margin_pct": round(margin_pct, 4),
            "monthly_volume": item.get("monthly_volume", 0),
        }

        if cost_pct > threshold:
            entry["revenue_at_risk"] = round(food_cost * item.get("monthly_volume", 0), 2)
            entry["suggested_price"] = round(food_cost / threshold, 2)
            entry["price_delta"] = round(entry["suggested_price"] - sell_price, 2)
            total_revenue_risk += entry["revenue_at_risk"]
            flagged.append(entry)
        else:
            healthy.append(entry)

    flagged.sort(key=lambda x: x["cost_pct"], reverse=True)

    return {
        "threshold": threshold,
        "total_items_scanned": len(items),
        "flagged_count": len(flagged),
        "healthy_count": len(healthy),
        "total_revenue_at_risk": round(total_revenue_risk, 2),
        "avg_food_cost_pct": round(sum(i["cost_pct"] for i in flagged + healthy) / max(len(flagged) + len(healthy), 1), 4),
        "flagged_items": flagged,
        "top_healthy": sorted(healthy, key=lambda x: x["margin_pct"], reverse=True)[:5],
    }


# ═══════════════════════════════════════════════════════════════
# AI FIX SUGGESTIONS — GPT-powered fix recommendations
# ═══════════════════════════════════════════════════════════════

class FixRequest(BaseModel):
    item_name: str
    food_cost: float
    sell_price: float
    category: str = ""
    ingredients: list[str] = []
    monthly_volume: int = 0

@router.post("/suggest")
async def suggest_fix(data: FixRequest):
    """Use AI to suggest margin fixes for a specific menu item."""
    cost_pct = data.food_cost / max(data.sell_price, 0.01)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_MODEL_API_KEY", "")

        prompt = f"""You are a restaurant menu engineering consultant. Analyze this menu item and provide 3 specific, actionable fixes to improve margin.

Item: {data.item_name}
Category: {data.category}
Food Cost: ${data.food_cost:.2f}
Sell Price: ${data.sell_price:.2f}
Food Cost %: {cost_pct*100:.1f}% (target: <32%)
Ingredients: {', '.join(data.ingredients) if data.ingredients else 'Not specified'}
Monthly Volume: {data.monthly_volume}

Respond ONLY with valid JSON array of 3 fixes:
[
  {{"fix_type": "ingredient_swap|portion_adjust|price_increase|menu_position|bundle_offer", "description": "...", "estimated_savings_pct": 0.05, "difficulty": "easy|medium|hard", "impact": "high|medium|low"}},
  ...
]"""

        llm = LlmChat(api_key=api_key, model="gpt-4.1-mini")
        llm.add_message(UserMessage(content=prompt))
        response = await llm.chat()
        text = response.message.strip()

        # Parse JSON from response
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        fixes = json.loads(text)
    except Exception as e:
        # Deterministic fallback
        fixes = _deterministic_fixes(data.item_name, cost_pct, data.category, data.food_cost, data.sell_price)

    analysis = {
        "analysis_id": f"fix-{_uid()}",
        "item_name": data.item_name,
        "food_cost": data.food_cost,
        "sell_price": data.sell_price,
        "cost_pct": round(cost_pct, 4),
        "target_cost_pct": 0.32,
        "gap_pct": round(cost_pct - 0.32, 4),
        "fixes": fixes,
        "created_at": _now(),
    }
    analyses_col.insert_one(analysis)
    del analysis["_id"]
    return analysis


def _deterministic_fixes(name: str, cost_pct: float, category: str, food_cost: float, sell_price: float):
    """Rule-based fallback when AI is unavailable."""
    fixes = []
    gap = cost_pct - 0.32

    if gap > 0.10:
        fixes.append({
            "fix_type": "price_increase",
            "description": f"Increase price from ${sell_price:.2f} to ${food_cost / 0.30:.2f} to hit 30% food cost target",
            "estimated_savings_pct": round(gap * 0.6, 3),
            "difficulty": "easy",
            "impact": "high",
        })

    if "steak" in name.lower() or "lobster" in name.lower() or "filet" in name.lower():
        fixes.append({
            "fix_type": "portion_adjust",
            "description": "Reduce protein portion by 1oz and add a premium side (roasted vegetables, truffle mash) to maintain perceived value",
            "estimated_savings_pct": 0.04,
            "difficulty": "medium",
            "impact": "high",
        })
    else:
        fixes.append({
            "fix_type": "ingredient_swap",
            "description": "Substitute highest-cost ingredient with seasonal alternative to reduce food cost by 8-12%",
            "estimated_savings_pct": 0.08,
            "difficulty": "medium",
            "impact": "medium",
        })

    fixes.append({
        "fix_type": "bundle_offer",
        "description": f"Create a combo/bundle pairing this item with a high-margin beverage or appetizer to improve blended margin",
        "estimated_savings_pct": 0.05,
        "difficulty": "easy",
        "impact": "medium",
    })

    return fixes[:3]


# ═══════════════════════════════════════════════════════════════
# ANALYSIS HISTORY
# ═══════════════════════════════════════════════════════════════

@router.get("/history")
def fix_history(limit: int = 20):
    items = list(analyses_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"analyses": items, "total": len(items)}
