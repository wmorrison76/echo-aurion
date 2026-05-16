"""
EchoAi³ Business Analytics & Next-Month Forecast
==================================================
Powered by EchoAi³ orchestrator — analyzes 30-day simulation data
and generates AI-driven operational improvement recommendations
plus a detailed next-month forecast.
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from database import db

router = APIRouter(prefix="/api/echoai3/analytics", tags=["echoai3-analytics"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

SEASONALITY = {1: 0.72, 2: 0.78, 3: 0.88, 4: 0.95, 5: 1.05, 6: 1.12,
               7: 1.08, 8: 0.98, 9: 0.92, 10: 1.02, 11: 1.10, 12: 1.18}
DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class AnalyticsRequest(BaseModel):
    include_ai_narrative: bool = True


class ForecastRequest(BaseModel):
    horizon_days: int = 30
    include_ai: bool = True


@router.post("/business-review")
async def business_review(req: AnalyticsRequest):
    """Run full EchoAi³ business analytics on simulation data."""
    # Gather all data
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    gl_entries = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))
    events = list(db["events"].find({}, {"_id": 0}).limit(200))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))
    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(500))
    outlets = list(db["outlets"].find({}, {"_id": 0}))

    if not pos_txns:
        return {"error": "No simulation data found — run /api/simulation/run-30-days first"}

    # ── Revenue Analysis ──
    total_rev = sum(e["amount"] for e in gl_entries if e.get("entry_type") == "revenue")
    food_rev = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "4000")
    bev_rev = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "4100")
    banquet_rev = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "4200")

    # ── Cost Analysis ──
    food_cogs = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "5100")
    labor_boh = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "6000")
    labor_foh = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "6010")
    labor_mgmt = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "6020")
    labor_benefits = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "6050")
    total_labor_gl = labor_boh + labor_foh + labor_mgmt + labor_benefits
    rent = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "7000")
    utilities = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "7500")
    marketing = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "8000")
    maintenance = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "8500")
    insurance = sum(e["amount"] for e in gl_entries if e.get("gl_code") == "7200")
    total_exp = sum(e["amount"] for e in gl_entries if e.get("entry_type") == "expense")

    gross_profit = total_rev - food_cogs - bev_cogs
    ebitda = total_rev - total_exp

    # ── Day-of-week analysis ──
    dow_revenue = {i: 0 for i in range(7)}
    dow_covers = {i: 0 for i in range(7)}
    dow_count = {i: 0 for i in range(7)}
    for t in pos_txns:
        try:
            dt = datetime.fromisoformat(t["closed_at"].replace("Z", "+00:00"))
            dow = dt.weekday()
            dow_revenue[dow] += t.get("total", 0)
            dow_covers[dow] += t.get("guest_count", 0)
            dow_count[dow] += 1
        except (ValueError, KeyError):
            pass

    dow_analysis = []
    for i in range(7):
        dow_analysis.append({
            "day": DOW_LABELS[i],
            "revenue": round(dow_revenue[i], 2),
            "transactions": dow_count[i],
            "covers": dow_covers[i],
            "avg_check": round(dow_revenue[i] / max(dow_count[i], 1), 2),
        })

    # ── Meal period analysis ──
    meal_stats = {}
    for t in pos_txns:
        mp = t.get("meal_period", "other")
        if mp not in meal_stats:
            meal_stats[mp] = {"revenue": 0, "transactions": 0, "covers": 0, "food_cost": 0}
        meal_stats[mp]["revenue"] += t.get("subtotal", 0)
        meal_stats[mp]["transactions"] += 1
        meal_stats[mp]["covers"] += t.get("guest_count", 0)
        meal_stats[mp]["food_cost"] += t.get("food_cost_total", 0)
    for mp in meal_stats:
        s = meal_stats[mp]
        s["avg_check"] = round(s["revenue"] / max(s["transactions"], 1), 2)
        s["food_cost_pct"] = round(s["food_cost"] / max(s["revenue"], 1) * 100, 1)
        s["revenue"] = round(s["revenue"], 2)
        s["food_cost"] = round(s["food_cost"], 2)

    # ── Top menu items ──
    item_sales = {}
    for t in pos_txns:
        for item in t.get("items", []):
            name = item.get("name", "Unknown")
            if name not in item_sales:
                item_sales[name] = {"name": name, "qty": 0, "revenue": 0, "food_cost": 0}
            item_sales[name]["qty"] += item.get("quantity", 0)
            item_sales[name]["revenue"] += item.get("revenue", 0)
            item_sales[name]["food_cost"] += item.get("food_cost", 0)
    top_items = sorted(item_sales.values(), key=lambda x: x["revenue"], reverse=True)[:15]
    for item in top_items:
        item["margin"] = round(item["revenue"] - item["food_cost"], 2)
        item["food_cost_pct"] = round(item["food_cost"] / max(item["revenue"], 1) * 100, 1)
        item["revenue"] = round(item["revenue"], 2)
        item["food_cost"] = round(item["food_cost"], 2)

    # ── Vendor spend analysis ──
    vendor_spend = {}
    for inv in invoices:
        vn = inv.get("vendor_name", "Unknown")
        if vn not in vendor_spend:
            vendor_spend[vn] = {"vendor": vn, "invoice_count": 0, "total_spend": 0, "category": inv.get("vendor_category", "")}
        vendor_spend[vn]["invoice_count"] += 1
        vendor_spend[vn]["total_spend"] += inv.get("total", 0)
    top_vendors = sorted(vendor_spend.values(), key=lambda x: x["total_spend"], reverse=True)
    for v in top_vendors:
        v["total_spend"] = round(v["total_spend"], 2)
        v["pct_of_total"] = round(v["total_spend"] / max(sum(vv["total_spend"] for vv in top_vendors), 1) * 100, 1)

    # ── Waste analysis ──
    waste_by_reason = {}
    for w in waste:
        r = w.get("reason", "other")
        waste_by_reason[r] = round(waste_by_reason.get(r, 0) + w.get("cost", 0), 2)
    total_waste = sum(waste_by_reason.values())

    # ── Labor efficiency ──
    labor_by_dept = {}
    for s in labor:
        dept = s.get("department", "Other")
        if dept not in labor_by_dept:
            labor_by_dept[dept] = {"department": dept, "total_cost": 0, "total_hours": 0, "overtime_hours": 0, "days": 0}
        labor_by_dept[dept]["total_cost"] += s.get("total_cost", 0)
        labor_by_dept[dept]["total_hours"] += s.get("hours_scheduled", 0)
        labor_by_dept[dept]["overtime_hours"] += s.get("overtime_hours", 0)
        labor_by_dept[dept]["days"] += 1
    for dept in labor_by_dept.values():
        dept["total_cost"] = round(dept["total_cost"], 2)
        dept["total_hours"] = round(dept["total_hours"], 1)
        dept["overtime_hours"] = round(dept["overtime_hours"], 1)
        dept["ot_pct"] = round(dept["overtime_hours"] / max(dept["total_hours"], 1) * 100, 1)
        dept["cost_per_hour"] = round(dept["total_cost"] / max(dept["total_hours"], 1), 2)

    # ── Build improvement recommendations ──
    recommendations = []
    food_pct = (food_cogs / total_rev * 100) if total_rev > 0 else 0
    labor_pct = (total_labor_gl / total_rev * 100) if total_rev > 0 else 0
    waste_pct = (total_waste / total_rev * 100) if total_rev > 0 else 0

    if food_pct > 28:
        recommendations.append({
            "area": "Food Cost Control",
            "priority": "critical",
            "current": f"{food_pct:.1f}%",
            "target": "25-28%",
            "impact": f"Savings of ${(food_pct - 28) / 100 * total_rev:,.0f}/period",
            "actions": [
                "Review top 5 highest food-cost menu items for re-engineering",
                "Negotiate bulk pricing with Premium Meats Direct and Blue Harbor Seafood",
                "Implement strict portioning standards with scale checks",
                "Run menu engineering analysis — eliminate bottom-performing items",
            ],
        })

    if labor_pct > 32:
        recommendations.append({
            "area": "Labor Optimization",
            "priority": "high",
            "current": f"{labor_pct:.1f}%",
            "target": "28-30%",
            "impact": f"Savings of ${(labor_pct - 30) / 100 * total_rev:,.0f}/period",
            "actions": [
                "Cross-train FOH and BOH staff to reduce headcount on slow days",
                "Implement demand-based scheduling using POS sales velocity",
                "Reduce overtime — target <5% OT hours across all departments",
                "Consolidate management shifts during slow periods",
            ],
        })

    if waste_pct > 1.5:
        recommendations.append({
            "area": "Waste Reduction",
            "priority": "medium",
            "current": f"{waste_pct:.1f}%",
            "target": "<1%",
            "impact": f"Savings of ${(waste_pct - 1) / 100 * total_rev:,.0f}/period",
            "actions": [
                f"Address top waste driver: {max(waste_by_reason, key=waste_by_reason.get) if waste_by_reason else 'N/A'}",
                "Reduce batch sizes during weekday service",
                "Implement FIFO compliance checks in walk-in",
                "Use Echo Never Sleeps predictions to optimize par levels",
            ],
        })

    # Check if weekend revenue is being maximized
    weekend_rev = dow_revenue.get(5, 0) + dow_revenue.get(6, 0)
    weekday_avg = sum(dow_revenue[i] for i in range(5)) / 5
    if weekend_rev / 2 < weekday_avg * 1.15:
        recommendations.append({
            "area": "Weekend Revenue",
            "priority": "medium",
            "current": f"Weekend avg ${weekend_rev/2:,.0f}/day",
            "target": f">${weekday_avg*1.3:,.0f}/day",
            "impact": f"Potential +${(weekday_avg*1.3 - weekend_rev/2)*8:,.0f}/month",
            "actions": [
                "Launch Saturday/Sunday brunch with premium pricing",
                "Add live entertainment package on Friday/Saturday evenings",
                "Create family dining promotions for Sunday",
                "Increase bar happy hour offerings on Friday evenings",
            ],
        })

    # Beverage upselling
    bev_pct_of_rev = (bev_rev / total_rev * 100) if total_rev > 0 else 0
    if bev_pct_of_rev < 25:
        recommendations.append({
            "area": "Beverage Program",
            "priority": "medium",
            "current": f"{bev_pct_of_rev:.1f}% of revenue",
            "target": "25-30%",
            "impact": f"Potential +${(0.25 - bev_pct_of_rev/100) * total_rev:,.0f}/period",
            "actions": [
                "Train FOH on wine pairing suggestions with dinner entrees",
                "Introduce signature cocktail menu with higher margins",
                "Add tableside mixology experience for premium tables",
                "Launch happy hour specials at SkyBar during 4-6pm",
            ],
        })

    # Banquet optimization
    if banquet_rev < total_rev * 0.2:
        recommendations.append({
            "area": "Banquet Revenue",
            "priority": "low",
            "current": f"${banquet_rev:,.0f} ({banquet_rev/total_rev*100:.1f}%)",
            "target": "20-25% of total revenue",
            "impact": f"Potential +${total_rev * 0.20 - banquet_rev:,.0f}/period",
            "actions": [
                "Increase corporate outreach — target 3 new corporate accounts/month",
                "Launch wedding packages with premium add-ons",
                "Create midweek meeting packages at competitive rates",
                "Leverage Crystal Ballroom availability on Tuesday/Wednesday",
            ],
        })

    # ── AI Narrative ──
    ai_narrative = ""
    if req.include_ai_narrative:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            prompt = f"""You are EchoAi³, the synthetic intelligence engine for a luxury hospitality operation.
Analyze this 30-day operational data and provide an executive business intelligence briefing:

FINANCIAL PERFORMANCE:
- Revenue: ${total_rev:,.0f} (Food: ${food_rev:,.0f}, Beverage: ${bev_rev:,.0f}, Banquet: ${banquet_rev:,.0f})
- EBITDA: ${ebitda:,.0f} ({ebitda/total_rev*100:.1f}% margin)
- Food Cost: {food_pct:.1f}%, Labor: {labor_pct:.1f}%, Waste: {waste_pct:.1f}%

OPERATIONS:
- {len(pos_txns)} POS transactions, {sum(t.get('guest_count',0) for t in pos_txns)} total covers
- {len(events)} banquet events
- Top day: {DOW_LABELS[max(dow_revenue, key=dow_revenue.get)]} (${max(dow_revenue.values()):,.0f})
- Slowest day: {DOW_LABELS[min(dow_revenue, key=dow_revenue.get)]} (${min(dow_revenue.values()):,.0f})

VENDOR SPEND: {len(invoices)} invoices, ${sum(i.get('total',0) for i in invoices):,.0f} total AP
TOP ITEMS: {', '.join(i['name'] for i in top_items[:5])}

Provide:
1. Overall assessment (2 sentences)
2. Three specific operational improvements with projected dollar impact
3. Revenue growth opportunities
4. Risk areas to monitor
5. One-sentence forward outlook

Be concise, data-driven, and specific with numbers."""

            llm = LlmChat(
                api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                session_id=f"echoai3-analytics-{_uid()}",
                system_message="You are EchoAi³, a synthetic intelligence engine providing hospitality business analytics.",
            )
            llm.with_model("openai", "gpt-4.1-mini")
            response = await llm.send_message(UserMessage(text=prompt))
            ai_narrative = response
        except Exception as e:
            ai_narrative = f"AI analysis unavailable: {str(e)}"

    return {
        "generated_at": _now(),
        "engine": "EchoAi³ Business Analytics",
        "period_summary": {
            "total_revenue": round(total_rev, 2),
            "food_revenue": round(food_rev, 2),
            "beverage_revenue": round(bev_rev, 2),
            "banquet_revenue": round(banquet_rev, 2),
            "gross_profit": round(gross_profit, 2),
            "ebitda": round(ebitda, 2),
            "ebitda_margin_pct": round(ebitda / total_rev * 100, 1) if total_rev > 0 else 0,
        },
        "cost_structure": {
            "food_cogs": round(food_cogs, 2),
            "food_cost_pct": round(food_pct, 1),
            "beverage_cogs": round(bev_cogs, 2),
            "labor_total": round(total_labor_gl, 2),
            "labor_pct": round(labor_pct, 1),
            "labor_breakdown": list(labor_by_dept.values()),
            "rent": round(rent, 2),
            "utilities": round(utilities, 2),
            "marketing": round(marketing, 2),
            "maintenance": round(maintenance, 2),
            "insurance": round(insurance, 2),
        },
        "operations": {
            "total_transactions": len(pos_txns),
            "total_covers": sum(t.get("guest_count", 0) for t in pos_txns),
            "avg_check": round(sum(t.get("total", 0) for t in pos_txns) / max(len(pos_txns), 1), 2),
            "banquet_events": len(events),
            "banquet_covers": sum(e.get("guest_count", 0) for e in events),
        },
        "day_of_week_analysis": dow_analysis,
        "meal_period_analysis": meal_stats,
        "top_menu_items": top_items,
        "vendor_analysis": top_vendors,
        "waste_analysis": {
            "total_waste": round(total_waste, 2),
            "waste_pct": round(waste_pct, 2),
            "by_reason": waste_by_reason,
        },
        "recommendations": recommendations,
        "ai_narrative": ai_narrative,
    }


@router.post("/next-month-forecast")
async def next_month_forecast(req: ForecastRequest):
    """Generate AI-powered next-month forecast based on simulation data."""
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    gl_entries = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    events = list(db["events"].find({}, {"_id": 0}).limit(200))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))

    if not pos_txns:
        return {"error": "No historical data — run simulation first"}

    # Calculate daily averages from simulation
    dates = set()
    daily_rev = {}
    daily_covers = {}
    daily_food_cost = {}
    for t in pos_txns:
        try:
            dt = datetime.fromisoformat(t["closed_at"].replace("Z", "+00:00"))
            d = dt.strftime("%Y-%m-%d")
            dates.add(d)
            daily_rev[d] = daily_rev.get(d, 0) + t.get("total", 0)
            daily_covers[d] = daily_covers.get(d, 0) + t.get("guest_count", 0)
            daily_food_cost[d] = daily_food_cost.get(d, 0) + t.get("food_cost_total", 0)
        except (ValueError, KeyError):
            pass

    num_days = max(len(dates), 1)
    avg_daily_rev = sum(daily_rev.values()) / num_days
    avg_daily_covers = sum(daily_covers.values()) / num_days
    avg_daily_food_cost = sum(daily_food_cost.values()) / num_days

    # Day-of-week patterns
    dow_avg_rev = {i: 0 for i in range(7)}
    dow_count = {i: 0 for i in range(7)}
    for d_str, rev in daily_rev.items():
        dt = datetime.strptime(d_str, "%Y-%m-%d")
        dow = dt.weekday()
        dow_avg_rev[dow] += rev
        dow_count[dow] += 1
    for i in range(7):
        if dow_count[i] > 0:
            dow_avg_rev[i] /= dow_count[i]

    # Generate next month forecast
    now = datetime.now(timezone.utc)
    forecast_start = now.replace(day=1) + timedelta(days=32)
    forecast_start = forecast_start.replace(day=1)  # first day of next month
    next_month = forecast_start.month
    season_mult = SEASONALITY.get(next_month, 1.0)
    current_month = now.month
    current_season = SEASONALITY.get(current_month, 1.0)
    season_change = season_mult / current_season

    # Labor from GL
    total_labor = sum(e["amount"] for e in gl_entries if e.get("gl_code") in ("6000", "6010", "6020", "6050"))
    daily_labor = total_labor / num_days

    # Generate daily forecast
    daily_forecast = []
    total_forecast_rev = 0
    total_forecast_cost = 0
    total_forecast_covers = 0

    days_in_month = 28 if next_month == 2 else 30 if next_month in (4, 6, 9, 11) else 31
    for d in range(min(req.horizon_days, days_in_month)):
        forecast_day = forecast_start + timedelta(days=d)
        dow = forecast_day.weekday()

        # Base from historical pattern
        base_rev = dow_avg_rev.get(dow, avg_daily_rev)
        # Apply seasonal adjustment
        rev = round(base_rev * season_change * (1 + 0.02), 2)  # 2% growth
        food_cost = round(rev * (avg_daily_food_cost / max(avg_daily_rev, 1)), 2)
        bev_cost = round(rev * 0.06, 2)
        labor_cost = round(daily_labor * season_change, 2)
        opex = round(rev * 0.08, 2)
        total_cost = round(food_cost + bev_cost + labor_cost + opex, 2)

        covers = round(avg_daily_covers * season_change * (1 + 0.02))

        confidence = max(0.55, 0.90 - (d / days_in_month) * 0.35)

        daily_forecast.append({
            "date": forecast_day.strftime("%Y-%m-%d"),
            "day_name": DOW_LABELS[dow],
            "revenue": rev,
            "food_cost": food_cost,
            "beverage_cost": bev_cost,
            "labor_cost": labor_cost,
            "opex": opex,
            "total_cost": total_cost,
            "profit": round(rev - total_cost, 2),
            "covers": int(covers),
            "confidence": round(confidence, 2),
            "confidence_low": round(rev * (1 - (1 - confidence)), 2),
            "confidence_high": round(rev * (1 + (1 - confidence)), 2),
        })

        total_forecast_rev += rev
        total_forecast_cost += total_cost
        total_forecast_covers += covers

    # Weekly aggregation
    weekly = []
    for w in range(0, len(daily_forecast), 7):
        week_days = daily_forecast[w:w+7]
        weekly.append({
            "week": f"Week {w//7 + 1}",
            "revenue": round(sum(d["revenue"] for d in week_days), 2),
            "cost": round(sum(d["total_cost"] for d in week_days), 2),
            "profit": round(sum(d["profit"] for d in week_days), 2),
            "covers": sum(d["covers"] for d in week_days),
            "avg_confidence": round(sum(d["confidence"] for d in week_days) / len(week_days), 2),
        })

    # AI narrative
    ai_forecast = ""
    if req.include_ai:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            month_name = forecast_start.strftime("%B %Y")
            prompt = f"""You are EchoAi³ predictive intelligence. Generate a next-month forecast briefing for {month_name}.

HISTORICAL (past 30 days): Revenue ${sum(daily_rev.values()):,.0f}, Avg daily ${avg_daily_rev:,.0f}, Covers {sum(daily_covers.values()):.0f}
FORECAST: Revenue ${total_forecast_rev:,.0f}, Cost ${total_forecast_cost:,.0f}, Profit ${total_forecast_rev-total_forecast_cost:,.0f}, Covers {total_forecast_covers}
SEASONAL FACTOR: {season_mult:.2f} ({'peak' if season_mult > 1.05 else 'slow' if season_mult < 0.85 else 'moderate'} season)

Provide:
1. Revenue outlook (1 sentence)
2. Key assumptions and risks (2-3 bullets)
3. Staffing recommendation
4. Purchasing guidance (order volumes)
5. One action item to maximize profit

Be specific with dollar amounts."""

            llm = LlmChat(
                api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                session_id=f"echoai3-forecast-{_uid()}",
                system_message="You are EchoAi³ predictive intelligence for hospitality.",
            )
            llm.with_model("openai", "gpt-4.1-mini")
            response = await llm.send_message(UserMessage(text=prompt))
            ai_forecast = response
        except Exception as e:
            ai_forecast = f"AI forecast unavailable: {str(e)}"

    return {
        "generated_at": _now(),
        "engine": "EchoAi³ Next-Month Forecast",
        "forecast_period": {
            "start": forecast_start.strftime("%Y-%m-%d"),
            "end": (forecast_start + timedelta(days=days_in_month - 1)).strftime("%Y-%m-%d"),
            "month": forecast_start.strftime("%B %Y"),
            "days": days_in_month,
        },
        "summary": {
            "forecast_revenue": round(total_forecast_rev, 2),
            "forecast_cost": round(total_forecast_cost, 2),
            "forecast_profit": round(total_forecast_rev - total_forecast_cost, 2),
            "forecast_margin_pct": round((total_forecast_rev - total_forecast_cost) / max(total_forecast_rev, 1) * 100, 1),
            "forecast_covers": int(total_forecast_covers),
            "forecast_avg_check": round(total_forecast_rev / max(total_forecast_covers, 1), 2),
            "seasonality_factor": season_mult,
            "growth_factor": 1.02,
        },
        "comparison_to_current": {
            "revenue_change": round(total_forecast_rev - sum(daily_rev.values()), 2),
            "revenue_change_pct": round((total_forecast_rev / max(sum(daily_rev.values()), 1) - 1) * 100, 1),
            "season_impact": f"{'Favorable' if season_change > 1 else 'Unfavorable'} ({(season_change-1)*100:+.1f}%)",
        },
        "daily_forecast": daily_forecast,
        "weekly_forecast": weekly,
        "ai_forecast": ai_forecast,
        "model_inputs": {
            "historical_days": num_days,
            "pos_transactions_analyzed": len(pos_txns),
            "gl_entries_analyzed": len(gl_entries),
            "events_analyzed": len(events),
            "engines": ["historical_baseline", "day_of_week_pattern", "seasonality", "growth_trend", "echoai3_intelligence"],
        },
    }
