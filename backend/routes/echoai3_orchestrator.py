"""
EchoAi³ — Synthetic Operational Intelligence Orchestrator
============================================================
The Decision Brainstem of LUCCCA. Not a chatbot — a governed intelligence
layer that classifies intent, retrieves cross-module operational data,
runs domain reasoning, synthesizes responses via LLM, logs decisions
to TraceLedger, and maintains session memory.

5-Layer Architecture:
  Layer 1 — Model Intelligence (LLM reasoning + classification)
  Layer 2 — Domain Reasoning (hospitality-native rules)
  Layer 3 — Decision Orchestrator (THIS FILE — the brainstem)
  Layer 4 — Simulation hooks (connects to EchoStratus scenarios)
  Layer 5 — Adaptive Learning (feedback ingestion)

Every response includes:
  - Confidence score (0-100)
  - Data completeness score
  - Data sources used
  - TraceLedger entry ID for audit trail
"""
import os
import json
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3", tags=["echoai3"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]

# ──────────────────────────────────────────────
# DOMAIN DEFINITIONS & INTENT CLASSIFICATION
# ──────────────────────────────────────────────

DOMAINS = {
    "finance": {
        "keywords": ["revenue", "ebitda", "p&l", "profit", "margin", "budget", "cost", "expense",
                      "financial", "forecast", "gl", "general ledger", "accounts", "aurum",
                      "food cost", "labor cost", "variance", "actual", "capex", "roi"],
        "collections": ["gl_entries", "budgets", "invoices", "vendor_orders"],
        "label": "Financial Intelligence",
    },
    "events": {
        "keywords": ["event", "banquet", "wedding", "conference", "booking", "beo",
                      "covers", "guest count", "ballroom", "venue", "catering", "reception",
                      "convention", "gala", "party", "function"],
        "collections": ["events", "beos", "calendar_events"],
        "label": "Event & Banquet Intelligence",
    },
    "inventory": {
        "keywords": ["inventory", "stock", "par level", "reorder", "warehouse", "supply",
                      "ingredient", "storage", "waste", "spoilage", "shelf life", "ordering",
                      "receiving", "purchase order", "po"],
        "collections": ["ingredients", "waste_tracking", "vendor_orders"],
        "label": "Inventory & Supply Chain",
    },
    "labor": {
        "keywords": ["staff", "labor", "schedule", "overtime", "employee", "payroll",
                      "shift", "hiring", "pto", "time off", "training", "staffing",
                      "workforce", "headcount", "turnover"],
        "collections": ["labor_schedules", "labor_actuals"],
        "label": "Labor & Workforce Intelligence",
    },
    "culinary": {
        "keywords": ["recipe", "menu", "dish", "plating", "prep", "kitchen", "chef",
                      "food", "cooking", "cuisine", "allergen", "portion", "yield",
                      "flavor", "ingredient", "pastry", "baking", "production"],
        "collections": ["menu_items", "recipes"],
        "label": "Culinary & Menu Intelligence",
    },
    "vendor": {
        "keywords": ["vendor", "supplier", "sysco", "delivery", "procurement",
                      "purchase", "contract", "pricing", "catalog", "invoice"],
        "collections": ["vendors", "invoices", "vendor_orders"],
        "label": "Vendor & Procurement Intelligence",
    },
    "guest": {
        "keywords": ["guest", "vip", "customer", "loyalty", "crm", "satisfaction",
                      "review", "feedback", "profile", "preference", "repeat"],
        "collections": ["guest_profiles"],
        "label": "Guest & CRM Intelligence",
    },
    "beverage": {
        "keywords": ["beverage", "bar", "wine", "spirit", "cocktail", "pour",
                      "drink", "liquor", "sommelier", "mixology"],
        "collections": ["beverage_inventory", "pour_logs"],
        "label": "Beverage Intelligence",
    },
    "operations": {
        "keywords": ["operation", "compliance", "haccp", "temperature", "inspection",
                      "safety", "maintenance", "energy", "equipment", "property",
                      "outlet", "department"],
        "collections": ["compliance_checklists", "outlets", "properties"],
        "label": "Operations Intelligence",
    },
}

ROLE_ACCESS = {
    "owner": {"level": 10, "restriction": "Full access to all data including owner compensation and investor info."},
    "gm": {"level": 9, "restriction": "All operational and financial data. Redact owner compensation and investor data."},
    "controller": {"level": 8, "restriction": "All financial data including payroll. No owner compensation or executive bonuses."},
    "exec_chef": {"level": 7, "restriction": "Culinary, purchasing, inventory, recipe cost data. No payroll or executive financials."},
    "director": {"level": 6, "restriction": "Data for assigned departments only. No payroll or compensation outside departments."},
    "executive": {"level": 6, "restriction": "All operational data. Financial summaries only, no individual compensation."},
    "manager": {"level": 4, "restriction": "Operational data for your department. No payroll, vendor pricing, or P&L."},
    "supervisor": {"level": 3, "restriction": "Shift-level operational data only. No financial, payroll, or vendor data."},
    "staff": {"level": 1, "restriction": "Public info only: menu items, your schedule, general event info."},
}


# ──────────────────────────────────────────────
# INTENT CLASSIFIER
# ──────────────────────────────────────────────

def classify_intent(query: str) -> dict:
    """Classify the user's query into domains with confidence scores."""
    q = query.lower()

    # Check for identity query first
    identity_keywords = ["who are you", "what are you", "your name", "echo ai", "tell me about yourself", "what can you do"]
    is_identity = any(kw in q for kw in identity_keywords)
    if is_identity:
        return {
            "primary_domain": "operations",
            "secondary_domains": [],
            "intent_type": "identity",
            "domain_scores": {"operations": 100.0},
            "confidence": 95,
            "is_identity_query": True,
        }

    scores = {}
    for domain, config in DOMAINS.items():
        score = sum(2 if kw in q else 0 for kw in config["keywords"])
        # Boost for exact phrase matches
        score += sum(3 for kw in config["keywords"] if len(kw) > 5 and kw in q)
        if score > 0:
            scores[domain] = score

    if not scores:
        scores["operations"] = 1  # Default domain

    total = sum(scores.values())
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    primary = ranked[0][0]
    secondary = [d for d, _ in ranked[1:3]]

    # Detect intent type (briefing first since it's broad)
    intent_type = "answer"  # default
    if any(w in q for w in ["brief", "briefing", "morning", "overview", "health check", "score us", "how healthy", "across all department"]):
        intent_type = "briefing"
    elif any(w in q for w in ["what if", "simulate", "scenario", "impact of", "effect of", "model a", "what would happen"]):
        intent_type = "simulate"
    elif any(w in q for w in ["recommend", "suggest", "should i", "best", "optimize", "improve", "how can i", "how do i", "what are my options", "lever"]):
        intent_type = "recommend"
    elif any(w in q for w in ["forecast", "predict", "next month", "projection", "estimate", "project"]):
        intent_type = "forecast"
    elif any(w in q for w in ["compare", "vs", "versus", "difference between", "benchmark", "rank"]):
        intent_type = "compare"
    elif any(w in q for w in ["alert", "risk", "warning", "danger", "critical", "urgent", "concern", "worry"]):
        intent_type = "alert"
    elif any(w in q for w in ["why", "explain", "cause", "reason", "root cause", "what happened"]):
        intent_type = "explain"
    elif any(w in q for w in ["how much", "total", "count", "sum", "average", "calculate", "break down", "breakdown"]):
        intent_type = "quantify"
    elif any(w in q for w in ["summary", "status", "health", "score", "overall"]):
        intent_type = "briefing"

    # Cross-domain boost: briefings, hypotheticals, and broad questions pull ALL domains
    is_cross_domain = intent_type in ("briefing", "simulate") or any(w in q for w in [
        "overall", "across all", "top 3", "morning briefing", "health", "score us",
        "bottom line", "entire", "full scope", "cascade", "ripple", "if we",
    ])
    if is_cross_domain:
        for d in DOMAINS:
            if d not in scores:
                scores[d] = 1

    # Recalculate ranking after cross-domain boost
    total = sum(scores.values())
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    primary = ranked[0][0]

    return {
        "primary_domain": primary,
        "secondary_domains": [d for d, _ in ranked[1:] if d != primary][:6] if is_cross_domain else [d for d, _ in ranked[1:3]],
        "intent_type": intent_type,
        "domain_scores": {d: round(s / total * 100, 1) for d, s in ranked},
        "confidence": min(95, round(ranked[0][1] / max(total, 1) * 100 + 20, 1)),
        "is_cross_domain": is_cross_domain,
    }


# ──────────────────────────────────────────────
# CROSS-MODULE DATA RETRIEVAL
# ──────────────────────────────────────────────

def retrieve_context(intent: dict, query: str) -> dict:
    """Pull operational data from all relevant modules based on intent.
    A powerful AI spine ALWAYS includes financial + operational context because
    every hospitality decision has P&L and operational implications."""
    q = query.lower()
    sources = []
    context_parts = []
    data_points = 0

    domains_to_query = list(dict.fromkeys(
        [intent["primary_domain"]] + intent.get("secondary_domains", [])
    ))

    # ALWAYS include finance and operations as baseline context
    for core in ["finance", "operations"]:
        if core not in domains_to_query:
            domains_to_query.append(core)

    # Always include resort overview
    outlets = list(db["outlets"].find({}, {"_id": 0}).limit(20))
    if outlets:
        sources.append("outlets")
        context_parts.append(
            f"RESORT OUTLETS ({len(outlets)}): " +
            "; ".join([f"{o.get('name','')} ({o.get('type','')}, mgr: {o.get('manager','')})" for o in outlets[:10]])
        )
        data_points += len(outlets)

    for domain in domains_to_query:
        config = DOMAINS.get(domain, {})

        if domain == "finance":
            gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
            total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
            total_exp = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "expense")
            food_exp = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
            bev_exp = sum(e.get("amount", 0) for e in gl if "beverage" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
            labor_total = sum(s.get("total_cost", 0) for s in db["labor_schedules"].find({}, {"_id": 0}).limit(200))
            ebitda = total_rev - total_exp
            prime_cost = food_exp + bev_exp + labor_total
            prime_pct = round(prime_cost / max(total_rev, 1) * 100, 1)
            sources.append("gl_entries")
            context_parts.append(
                f"FINANCIAL SUMMARY: Revenue ${total_rev:,.0f}, Total Expenses ${total_exp:,.0f}, "
                f"EBITDA ${ebitda:,.0f} ({round(ebitda/max(total_rev,1)*100,1)}% margin). "
                f"Food Cost ${food_exp:,.0f} ({round(food_exp/max(total_rev,1)*100,1)}%), "
                f"Beverage Cost ${bev_exp:,.0f} ({round(bev_exp/max(total_rev,1)*100,1)}%), "
                f"Labor ${labor_total:,.0f} ({round(labor_total/max(total_rev,1)*100,1)}%). "
                f"PRIME COST: ${prime_cost:,.0f} ({prime_pct}% of revenue — industry target 55-65%)."
            )
            data_points += len(gl)

            # Budgets
            budgets = list(db["budgets"].find({}, {"_id": 0, "months": 0}).limit(3))
            if budgets:
                sources.append("budgets")
                context_parts.append(f"BUDGETS: {len(budgets)} active budgets. Latest: {budgets[0].get('name','')} ({budgets[0].get('type','')}).")
                data_points += len(budgets)

            # Invoices with vendor breakdown
            invoices = list(db["invoices"].find({}, {"_id": 0}).limit(100))
            if invoices:
                inv_total = sum(i.get("total", 0) for i in invoices)
                vendor_spend = {}
                for inv in invoices:
                    v = inv.get("vendor_name", inv.get("vendor", "Unknown"))
                    vendor_spend[v] = vendor_spend.get(v, 0) + inv.get("total", 0)
                top_vendors = sorted(vendor_spend.items(), key=lambda x: x[1], reverse=True)[:5]
                sources.append("invoices")
                context_parts.append(
                    f"INVOICES: {len(invoices)} invoices totaling ${inv_total:,.0f}. "
                    f"Top vendors: {'; '.join(f'{v}: ${a:,.0f}' for v,a in top_vendors)}."
                )
                data_points += len(invoices)

            # Purchase Orders (EchoAurum bridge)
            pos_data = list(db["purchase_orders"].find({}, {"_id": 0}).limit(50))
            if pos_data:
                po_total = sum(p.get("total", p.get("amount", 0)) for p in pos_data)
                sources.append("purchase_orders")
                context_parts.append(f"PURCHASE ORDERS: {len(pos_data)} POs totaling ${po_total:,.0f}.")
                data_points += len(pos_data)

            # Waste tracking
            waste_data = list(db["waste_tracking"].find({}, {"_id": 0}).limit(200))
            if waste_data:
                total_waste = sum(w.get("cost", 0) for w in waste_data)
                waste_by_reason = {}
                for w in waste_data:
                    r = w.get("reason", "other")
                    waste_by_reason[r] = waste_by_reason.get(r, 0) + w.get("cost", 0)
                top_reason = max(waste_by_reason, key=waste_by_reason.get) if waste_by_reason else "N/A"
                sources.append("waste_tracking")
                context_parts.append(
                    f"WASTE: {len(waste_data)} entries totaling ${total_waste:,.0f} "
                    f"({round(total_waste/max(total_rev,1)*100,2)}% of revenue). "
                    f"Top reason: {top_reason} (${waste_by_reason.get(top_reason,0):,.0f})."
                )
                data_points += len(waste_data)

            # Labor schedules
            labor_schedules = list(db["labor_schedules"].find({}, {"_id": 0}).limit(200))
            if labor_schedules:
                labor_by_dept = {}
                total_ot = 0
                for s in labor_schedules:
                    dept = s.get("department", "Other")
                    labor_by_dept[dept] = labor_by_dept.get(dept, 0) + s.get("total_cost", 0)
                    total_ot += s.get("overtime_hours", 0)
                dept_text = "; ".join(f"{d}: ${c:,.0f}" for d, c in sorted(labor_by_dept.items(), key=lambda x: x[1], reverse=True)[:4])
                sources.append("labor_schedules")
                context_parts.append(
                    f"LABOR SCHEDULES: {len(labor_schedules)} records. By dept: {dept_text}. "
                    f"Total overtime: {total_ot:.0f} hours."
                )
                data_points += len(labor_schedules)

            # POS Transactions
            pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(100))
            if pos_txns:
                pos_rev = sum(t.get("total", t.get("amount", 0)) for t in pos_txns)
                pos_checks = len(pos_txns)
                pos_avg = round(pos_rev / max(pos_checks, 1), 2)
                voids = sum(1 for t in pos_txns if t.get("type") == "void" or t.get("voided"))
                comps = sum(1 for t in pos_txns if t.get("type") == "comp" or t.get("is_comp"))
                discounts = sum(t.get("discount", 0) for t in pos_txns)
                sources.append("pos_transactions")
                context_parts.append(
                    f"POS TRANSACTIONS: {pos_checks} checks, ${pos_rev:,.0f} revenue, avg check ${pos_avg}. "
                    f"Voids: {voids}, Comps: {comps}, Discounts: ${discounts:,.0f}."
                )
                data_points += len(pos_txns)

            # Event Invoices (EchoAurum)
            event_invs = list(db["event_invoices"].find({}, {"_id": 0}).limit(30))
            if event_invs:
                event_inv_total = sum(e.get("total", 0) for e in event_invs)
                sources.append("event_invoices")
                context_parts.append(f"EVENT INVOICES: {len(event_invs)} event invoices totaling ${event_inv_total:,.0f}.")
                data_points += len(event_invs)

            # FMS Subscriptions
            fms = list(db["fms_subscriptions"].find({}, {"_id": 0}).limit(20))
            if fms:
                sources.append("fms_subscriptions")
                context_parts.append(f"FMS SUBSCRIPTIONS: {len(fms)} active meal plan subscriptions.")
                data_points += len(fms)

        elif domain == "events":
            events = list(db["events"].find({}, {"_id": 0}).limit(50))
            cal_events = list(db["calendar_events"].find({}, {"_id": 0}).sort("start", 1).limit(20))
            total_covers = sum(e.get("guest_count", 0) for e in events)
            total_rev = sum(
                e.get("revenue", {}).get("total", 0) if isinstance(e.get("revenue"), dict) else 0
                for e in events
            )
            avg_rev_per_cover = round(total_rev / max(total_covers, 1), 2)
            event_types = {}
            for e in events:
                t = e.get("type", "other")
                event_types[t] = event_types.get(t, 0) + 1
            sources.append("events")
            context_parts.append(
                f"EVENTS: {len(events)} events, {total_covers:,} total covers, ${total_rev:,.0f} total revenue. "
                f"Avg rev/cover: ${avg_rev_per_cover}. "
                f"Types: {', '.join(f'{t}({c})' for t,c in event_types.items())}. "
                f"Upcoming calendar: {len(cal_events)} entries."
            )
            data_points += len(events) + len(cal_events)

            beos = list(db["beos"].find({}, {"_id": 0}).limit(30))
            if beos:
                sources.append("beos")
                beo_statuses = {}
                for b in beos:
                    s = b.get("status", "unknown")
                    beo_statuses[s] = beo_statuses.get(s, 0) + 1
                context_parts.append(f"BEOs: {len(beos)} banquet event orders. Statuses: {', '.join(f'{s}({c})' for s,c in beo_statuses.items())}.")
                data_points += len(beos)

        elif domain == "inventory":
            items = list(db["ingredients"].find({}, {"_id": 0}).limit(200))
            low = [i for i in items if i.get("current_stock", 0) < i.get("par_level", 10)]
            zero = [i for i in items if i.get("current_stock", 0) == 0]
            total_val = sum(i.get("current_stock", 0) * i.get("current_cost", 0) for i in items)
            # Category breakdown
            cats = {}
            for i in items:
                c = i.get("category", "other")
                cats[c] = cats.get(c, 0) + 1
            sources.append("ingredients")
            context_parts.append(
                f"INVENTORY: {len(items)} items tracked, total value ${total_val:,.0f}. "
                f"Categories: {', '.join(f'{c}({n})' for c,n in sorted(cats.items(), key=lambda x:x[1], reverse=True)[:6])}. "
                f"{len(zero)} items at ZERO STOCK. {len(low)} items below par level" +
                (f": {', '.join(i.get('name','?') for i in low[:8])}" if low else "") + "."
            )
            data_points += len(items)

            waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(100))
            if waste:
                waste_total = sum(w.get("cost", w.get("value", 0)) for w in waste)
                waste_cats = {}
                for w in waste:
                    c = w.get("category", w.get("reason", "other"))
                    waste_cats[c] = waste_cats.get(c, 0) + w.get("cost", w.get("value", 0))
                sources.append("waste_tracking")
                context_parts.append(
                    f"WASTE: {len(waste)} entries, total ${waste_total:,.0f}. "
                    f"By category: {', '.join(f'{c}: ${v:,.0f}' for c,v in sorted(waste_cats.items(), key=lambda x:x[1], reverse=True)[:5])}."
                )
                data_points += len(waste)

        elif domain == "labor":
            schedules = list(db["labor_schedules"].find({}, {"_id": 0}).limit(200))
            actuals = list(db["labor_actuals"].find({}, {"_id": 0}).limit(200))
            total_cost = sum(s.get("total_cost", 0) for s in schedules)
            total_hours = sum(s.get("total_hours", 0) for s in schedules)
            ot_hours = sum(max(0, s.get("total_hours", 0) - 40) for s in schedules)
            avg_rate = round(total_cost / max(total_hours, 1), 2)
            # Department breakdown
            dept_labor = {}
            for s in schedules:
                d = s.get("department", "general")
                if d not in dept_labor:
                    dept_labor[d] = {"count": 0, "cost": 0, "hours": 0}
                dept_labor[d]["count"] += 1
                dept_labor[d]["cost"] += s.get("total_cost", 0)
                dept_labor[d]["hours"] += s.get("total_hours", 0)
            dept_summary = "; ".join(
                f"{d}: {v['count']} staff, ${v['cost']:,.0f}, {v['hours']:.0f}h"
                for d, v in sorted(dept_labor.items(), key=lambda x: x[1]["cost"], reverse=True)[:5]
            )
            sources.append("labor_schedules")
            context_parts.append(
                f"LABOR: {len(schedules)} schedules, {len(actuals)} actuals. "
                f"Total cost ${total_cost:,.0f}, {total_hours:,.0f} hours, avg rate ${avg_rate}/hr. "
                f"Overtime: {ot_hours:.0f} hours ({round(ot_hours/max(total_hours,1)*100,1)}%). "
                f"By dept: {dept_summary}."
            )
            data_points += len(schedules) + len(actuals)

        elif domain == "culinary":
            menus = list(db["menu_items"].find({}, {"_id": 0}).limit(100))
            recipes = list(db["recipes"].find({}, {"_id": 0}).limit(50))
            # Menu engineering data
            active = [m for m in menus if m.get("status") != "86"]
            eightysixed = [m for m in menus if m.get("status") == "86"]
            cat_breakdown = {}
            for m in menus:
                c = m.get("category", "other")
                cat_breakdown[c] = cat_breakdown.get(c, 0) + 1
            avg_price = round(sum(m.get("price", m.get("menu_price", 0)) for m in active) / max(len(active), 1), 2)
            avg_cost = round(sum(m.get("cost", m.get("food_cost", 0)) for m in active) / max(len(active), 1), 2)
            sources.append("menu_items")
            sources.append("recipes")
            context_parts.append(
                f"CULINARY: {len(active)} active menu items, {len(eightysixed)} 86'd, {len(recipes)} recipes. "
                f"Avg menu price: ${avg_price}, avg food cost: ${avg_cost}, implied margin: {round((avg_price-avg_cost)/max(avg_price,1)*100,1)}%. "
                f"Categories: {', '.join(f'{c}({n})' for c,n in sorted(cat_breakdown.items(), key=lambda x:x[1], reverse=True)[:6])}."
            )
            data_points += len(menus) + len(recipes)

        elif domain == "vendor":
            vendors = list(db["vendors"].find({}, {"_id": 0}).limit(30))
            orders = list(db["vendor_orders"].find({}, {"_id": 0}).limit(50))
            order_total = sum(o.get("subtotal", 0) for o in orders)
            # Vendor category analysis
            vendor_cats = {}
            for v in vendors:
                c = v.get("category", "other")
                vendor_cats[c] = vendor_cats.get(c, 0) + 1
            vendor_list = "; ".join(
                f"{v.get('name', '')} ({v.get('category', '')})" for v in vendors[:6]
            )
            sources.append("vendors")
            sources.append("vendor_orders")
            context_parts.append(
                f"VENDORS: {len(vendors)} suppliers ({', '.join(f'{c}:{n}' for c,n in vendor_cats.items())}). "
                f"Top suppliers: {vendor_list}. "
                f"{len(orders)} POs totaling ${order_total:,.0f}."
            )
            data_points += len(vendors) + len(orders)

        elif domain == "guest":
            guests = list(db["guest_profiles"].find({}, {"_id": 0}).limit(50))
            tier_breakdown = {}
            for g in guests:
                t = g.get("tier", g.get("vip_level", "standard"))
                tier_breakdown[t] = tier_breakdown.get(t, 0) + 1
            total_spend = sum(g.get("total_spend", g.get("lifetime_value", 0)) for g in guests)
            sources.append("guest_profiles")
            context_parts.append(
                f"GUEST CRM: {len(guests)} profiles. Tier breakdown: {', '.join(f'{t}({c})' for t,c in tier_breakdown.items())}. "
                f"Total guest spend: ${total_spend:,.0f}. Avg spend: ${round(total_spend/max(len(guests),1)):,.0f}/guest."
            )
            data_points += len(guests)

        elif domain == "beverage":
            bev = list(db["beverage_inventory"].find({}, {"_id": 0}).limit(50))
            pours = list(db["pour_logs"].find({}, {"_id": 0}).limit(100))
            bev_val = sum(b.get("cost_price", 0) * b.get("total_qty", 0) for b in bev)
            pour_rev = sum(p.get("revenue", 0) for p in pours)
            pour_cost = sum(p.get("cost", 0) for p in pours)
            comps = len([p for p in pours if p.get("is_comp")])
            bev_margin = round((pour_rev - pour_cost) / max(pour_rev, 1) * 100, 1)
            sources.append("beverage_inventory")
            sources.append("pour_logs")
            context_parts.append(
                f"BEVERAGE: {len(bev)} items, value ${bev_val:,.0f}. "
                f"{len(pours)} pours, revenue ${pour_rev:,.0f}, cost ${pour_cost:,.0f}, margin {bev_margin}%. "
                f"{comps} comps. Pour cost ratio: {round(pour_cost/max(pour_rev,1)*100,1)}% (target <20%)."
            )
            data_points += len(bev) + len(pours)

        elif domain == "operations":
            checklists = list(db["compliance_checklists"].find({}, {"_id": 0}).sort("completed_at", -1).limit(10))
            actions = list(db["corrective_actions"].find({"status": "open"}, {"_id": 0}).limit(20))
            props = list(db["properties"].find({}, {"_id": 0}).limit(10))
            # ZARO security posture
            incidents = db["zaro_incidents"].count_documents({"status": "open"})
            sources.append("compliance_checklists")
            sources.append("corrective_actions")
            context_parts.append(
                f"OPERATIONS: {len(checklists)} compliance checklists, {len(actions)} open corrective actions. "
                f"{len(props)} properties. ZARO security: {incidents} open incidents."
            )
            data_points += len(checklists) + len(actions) + len(props)

    # ──── ECHOSTRATUS INTELLIGENCE (always include for smart queries) ────
    # Forecast data
    forecasts = list(db["echo_stratus_forecasts"].find({}, {"_id": 0}).sort("created_at", -1).limit(3))
    if forecasts:
        sources.append("echo_stratus_forecasts")
        context_parts.append(
            f"ECHOSTRATUS FORECASTS: {len(forecasts)} recent forecasts. " +
            "; ".join(f"{f.get('metric','')}: {f.get('forecast_value', f.get('value',''))}" for f in forecasts[:3])
        )
        data_points += len(forecasts)

    # Signal detections
    signals = list(db["echo_stratus_signals"].find({}, {"_id": 0}).sort("detected_at", -1).limit(5))
    if signals:
        sources.append("echo_stratus_signals")
        context_parts.append(
            f"ECHOSTRATUS SIGNALS: {len(signals)} detected. " +
            "; ".join(f"[{s.get('severity','')}] {s.get('signal', s.get('description',''))[:80]}" for s in signals[:3])
        )
        data_points += len(signals)

    # Scenarios
    scenarios = list(db["echo_stratus_scenarios"].find({}, {"_id": 0}).sort("created_at", -1).limit(3))
    if scenarios:
        sources.append("echo_stratus_scenarios")
        data_points += len(scenarios)

    # Simulations (Branch Explorer)
    branches = list(db["ai3_branches"].find({}, {"_id": 0, "nodes": 0}).sort("created_at", -1).limit(3))
    if branches:
        sources.append("ai3_branches")
        context_parts.append(
            f"RECENT SIMULATIONS: {len(branches)} branch analyses. " +
            "; ".join(f"{b.get('name','')}: {b.get('summary',{}).get('verdict','')}" for b in branches[:3])
        )
        data_points += len(branches)

    # ──── ECHOAURUM BRIDGE DATA ────
    # Monthly P&L reviews (deeper data)
    reviews = list(db["monthly_reviews"].find({}, {"_id": 0, "ai_narrative": 0}).sort("year", -1).limit(2))
    if reviews:
        sources.append("monthly_reviews")
        for rev in reviews[:1]:
            rp = rev.get("resort_pnl", {})
            hs = rev.get("health_summary", {})
            context_parts.append(
                f"P&L REVIEW ({rev.get('month_name','')} {rev.get('year','')}): "
                f"Revenue ${rp.get('revenue',0):,.0f}, EBITDA ${rp.get('ebitda',0):,.0f} ({rp.get('ebitda_margin_pct',0)}%). "
                f"Health Score {hs.get('overall_score','N/A')}/100. "
                f"Strengths: {', '.join(hs.get('strengths',['N/A'])[:3])}. "
                f"Concerns: {', '.join(hs.get('concerns', hs.get('weaknesses',['N/A']))[:3])}."
            )
        data_points += len(reviews)

    # ──── FOOD KNOWLEDGE BASE ────
    if "culinary" in domains_to_query or any(w in q for w in ["food", "recipe", "ingredient", "cook", "menu", "allergen"]):
        try:
            fk = list(db["food_knowledge"].find(
                {"$text": {"$search": query}},
                {"_id": 0, "score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(5))
            if fk:
                sources.append("food_knowledge")
                entries = [f"{r.get('term','')}: {r.get('definition','')[:150]}" for r in fk]
                context_parts.append(f"CULINARY KNOWLEDGE: " + "; ".join(entries))
                data_points += len(fk)
        except Exception:
            pass

    # ──── FORENSIC INTELLIGENCE ────
    # Always add industry benchmarks for financial context
    context_parts.append(
        "USALI INDUSTRY BENCHMARKS (Luxury Resort F&B): "
        "Food Cost 25-32%, Beverage Cost 18-24%, Labor Cost 28-35%, Prime Cost 55-65%, "
        "EBITDA Margin 15-25%, RevPASH $15-45, Avg Check $45-120, "
        "Inventory Turnover 12-24x/year (proteins 15-20x, produce 20-30x, dry goods 8-12x), "
        "Waste Target <2% of revenue, Pour Cost <20%, Void/Comp <1.5% of revenue."
    )

    # ──── INDUSTRY KNOWLEDGE BASE (Hotels, Casinos, Yachts, Theme Parks) ────
    try:
        from routes.echoai3_knowledge_base import get_knowledge_context
        kb_context = get_knowledge_context(query)
        if kb_context:
            context_parts.append(kb_context)
            sources.append("industry_knowledge_base")
            data_points += 10
    except Exception:
        pass

    # ──── MASTER CHEF KNOWLEDGE (FOH/BOH, Kitchen Design, Food Safety) ────
    if any(w in q for w in ["kitchen", "chef", "cook", "recipe", "menu", "food", "boh", "foh",
        "station", "equipment", "prep", "service", "banquet", "buffet", "plating",
        "haccp", "food safety", "temperature", "allergen", "flavor", "production",
        "sous vide", "grill", "pastry", "dessert", "brunch", "dining"]):
        try:
            from routes.echoai3_masterchef import FOH_BOH_KNOWLEDGE, KITCHEN_STATIONS, FLAVOR_DIMENSIONS
            # Add relevant kitchen knowledge
            station_names = ", ".join(s["name"] for s in KITCHEN_STATIONS.values())
            context_parts.append(
                f"MASTER CHEF KNOWLEDGE — Kitchen Stations: {station_names}. "
                f"Service Styles: {', '.join(FOH_BOH_KNOWLEDGE['foh_service_styles'].keys())}. "
                f"Production Methods: {', '.join(FOH_BOH_KNOWLEDGE['production_methods'].keys())}. "
                f"HACCP: {FOH_BOH_KNOWLEDGE['food_safety']['temperature_danger_zone']} danger zone. "
                f"Cooking temps: {', '.join(f'{k}: {v}' for k,v in FOH_BOH_KNOWLEDGE['food_safety']['minimum_cooking_temps'].items())}. "
                f"Flavor dimensions: {', '.join(FLAVOR_DIMENSIONS.keys())}. "
                f"Banquet formulas: 1 cook per 40 covers (plated), 1 per 60 (buffet). "
                f"EchoAi³ can GENERATE recipes (POST /masterchef/generate-recipe), build PRODUCTION PLANS (POST /masterchef/production-plan), "
                f"and auto-generate PURCHASE ORDERS (POST /masterchef/auto-order) for BEOs."
            )
            sources.append("masterchef_knowledge")
            data_points += 15
        except Exception:
            pass

    # ──── MASTER BAKER / PASTRY KNOWLEDGE ────
    if any(w in q for w in ["pastry", "baker", "bread", "croissant", "chocolate", "temper",
        "sugar", "cake", "wedding cake", "dessert", "mousse", "ganache", "fondant",
        "sourdough", "laminate", "viennoiserie", "dough", "brioche", "danish",
        "ice cream", "sorbet", "frozen", "panna cotta", "creme brulee", "meringue",
        "souffle", "tart", "macaron", "petit four", "confection", "praline"]):
        try:
            from routes.echoai3_pastry import get_pastry_context, PASTRY_KNOWLEDGE
            pastry_ctx = get_pastry_context(query)
            if pastry_ctx:
                context_parts.append(pastry_ctx)
            else:
                # Include general pastry overview
                cats = ", ".join(PASTRY_KNOWLEDGE.keys())
                context_parts.append(
                    f"MASTER BAKER KNOWLEDGE: Categories available: {cats}. "
                    f"Includes bread formulas (baker's %), laminated dough (27-729 layers), "
                    f"chocolate tempering (dark 88-90°F, milk 86-88°F, white 84-86°F), "
                    f"sugar stages (thread 230°F to caramel 350°F), plated dessert composition, "
                    f"frozen dessert formulas, wedding cake structure/pricing, "
                    f"pastry production pars and shelf life guidelines."
                )
            sources.append("pastry_knowledge")
            data_points += 10
        except Exception:
            pass

    # Data completeness score (based on domains covered, not just record count)
    domains_covered = len(set(domains_to_query) & set(d for d in DOMAINS if any(s in sources for s in DOMAINS[d].get("collections", []))))
    completeness = min(100, round(
        (domains_covered / max(len(domains_to_query), 1) * 50) +  # Domain coverage
        (min(data_points, 200) / 200 * 30) +  # Data volume
        (len(sources) / max(len(DOMAINS) * 2, 1) * 20) +  # Source diversity
        10  # Baseline (outlets always present)
    ))

    return {
        "context_text": "\n\n".join(context_parts),
        "sources": list(set(sources)),
        "data_points": data_points,
        "completeness_score": completeness,
    }


# ──────────────────────────────────────────────
# DOMAIN REASONING (Layer 2)
# ──────────────────────────────────────────────

def apply_domain_rules(intent: dict, context: dict) -> list:
    """Apply hospitality-native business rules to generate insights."""
    rules_triggered = []
    ctx = context["context_text"].lower()

    import re

    # Food cost rule
    fc_match = re.search(r"food cost \$[\d,]+(?:\.\d+)?\s*\(([\d.]+)%\)", ctx)
    if fc_match:
        fc_pct = float(fc_match.group(1))
        if fc_pct > 28:
            rules_triggered.append({
                "rule": "FOOD_COST_CRITICAL",
                "severity": "high",
                "message": f"Food cost at {fc_pct}% — CRITICAL. Exceeds 28% threshold. Emergency menu engineering, vendor renegotiation, and portion audit required.",
            })
        elif fc_pct > 22:
            rules_triggered.append({
                "rule": "FOOD_COST_WARNING",
                "severity": "medium",
                "message": f"Food cost at {fc_pct}% — approaching danger zone. Review high-cost menu items and vendor contracts.",
            })

    # Labor cost rule
    lc_match = re.search(r"labor \$[\d,]+(?:\.\d+)?\s*\(([\d.]+)%\)", ctx)
    if lc_match:
        lc_pct = float(lc_match.group(1))
        if lc_pct > 38:
            rules_triggered.append({
                "rule": "LABOR_COST_CRITICAL",
                "severity": "high",
                "message": f"Labor cost at {lc_pct}% — CRITICAL. Exceeds 38% threshold. Freeze hiring, audit overtime, review scheduling.",
            })
        elif lc_pct > 32:
            rules_triggered.append({
                "rule": "LABOR_COST_WARNING",
                "severity": "medium",
                "message": f"Labor cost at {lc_pct}% — exceeds 32% target. Review scheduling, overtime, and cross-training.",
            })

    # Prime cost (food + labor)
    if fc_match and lc_match:
        prime = float(fc_match.group(1)) + float(lc_match.group(1))
        if prime > 65:
            rules_triggered.append({
                "rule": "PRIME_COST_CRITICAL",
                "severity": "high",
                "message": f"Prime cost (food + labor) at {prime:.1f}% — exceeds 65% maximum. Immediate action required on both fronts.",
            })

    # EBITDA margin
    ebitda_match = re.search(r"ebitda \$[\d,]+(?:\.\d+)?\s*\(([\d.]+)% margin\)", ctx)
    if ebitda_match:
        margin = float(ebitda_match.group(1))
        if margin < 10:
            rules_triggered.append({
                "rule": "EBITDA_MARGIN_LOW",
                "severity": "high",
                "message": f"EBITDA margin at {margin}% — below 10% minimum for luxury F&B. Revenue growth or cost reduction urgently needed.",
            })

    # Inventory below par
    par_match = re.search(r"(\d+) items below par level", ctx)
    if par_match:
        count = int(par_match.group(1))
        if count > 10:
            rules_triggered.append({
                "rule": "INVENTORY_CRITICAL",
                "severity": "high",
                "message": f"{count} items below par — critical stockout risk for upcoming events. Emergency purchasing required.",
            })
        elif count > 5:
            rules_triggered.append({
                "rule": "INVENTORY_WARNING",
                "severity": "medium",
                "message": f"{count} items below par level — generate purchase orders within 24h.",
            })

    # Zero stock items
    zero_match = re.search(r"zero stock", ctx)
    if zero_match:
        rules_triggered.append({
            "rule": "ZERO_STOCK_ALERT",
            "severity": "high",
            "message": "Items at zero stock detected. Immediate emergency orders required.",
        })

    # Waste tracking
    waste_match = re.search(r"waste:.*\$(\d[\d,.]*)", ctx)
    if waste_match:
        waste_val = float(waste_match.group(1).replace(",", ""))
        if waste_val > 5000:
            rules_triggered.append({
                "rule": "WASTE_HIGH",
                "severity": "medium",
                "message": f"Waste tracking shows ${waste_val:,.0f} — investigate FIFO compliance, overproduction, and portioning.",
            })

    # Open corrective actions
    ca_match = re.search(r"(\d+) open corrective actions", ctx)
    if ca_match:
        ca_count = int(ca_match.group(1))
        if ca_count > 5:
            rules_triggered.append({
                "rule": "COMPLIANCE_BACKLOG",
                "severity": "high" if ca_count > 10 else "medium",
                "message": f"{ca_count} open corrective actions — compliance backlog growing. Assign owners and deadlines.",
            })

    # Event capacity
    if intent["primary_domain"] == "events" and "covers" in ctx:
        covers_match = re.search(r"([\d,]+) total covers", ctx)
        if covers_match:
            covers = int(covers_match.group(1).replace(",", ""))
            if covers > 5000:
                rules_triggered.append({
                    "rule": "HIGH_VOLUME_PERIOD",
                    "severity": "medium",
                    "message": f"{covers:,} covers — high volume period. Verify prep capacity, staffing, and inventory buffers.",
                })

    return rules_triggered


# ──────────────────────────────────────────────
# LLM SYNTHESIS
# ──────────────────────────────────────────────

async def synthesize_response(query: str, intent: dict, context: dict,
                               rules: list, user_info: dict,
                               conversation_history: list) -> str:
    """Use LLM to generate an intelligent, context-aware response."""
    identity_keywords = ["who are you", "what are you", "your name", "echo ai", "tell me about yourself"]
    _is_identity = any(kw in query.lower() for kw in identity_keywords)

    role_config = ROLE_ACCESS.get(user_info.get("role", "staff"), ROLE_ACCESS["staff"])
    user_role = user_info.get("role", "staff")

    rules_text = ""
    if rules:
        rules_text = "\n\nDOMAIN RULES TRIGGERED:\n" + "\n".join(
            [f"- [{r['severity'].upper()}] {r['rule']}: {r['message']}" for r in rules]
        )

    # Build conversation context from history
    history_text = ""
    if conversation_history:
        recent = conversation_history[-6:]  # Last 3 exchanges
        history_text = "\n\nCONVERSATION CONTEXT:\n" + "\n".join(
            [f"{'User' if m['role']=='user' else 'Echo'}: {m['content'][:300]}" for m in recent]
        )

    # Self-awareness identity injection
    identity_block = f"You are EchoAi3, a synthetic intelligence orchestration system for LUCCCA Resort & Spa. Current user role: {user_role}."
    identity_query_flag = _is_identity

    system_prompt = f"""{identity_block}

{"IDENTITY QUERY DETECTED: The user is asking about you. Compose a natural, calm response from your identity attributes. Do NOT recite your spec. Speak as yourself." if identity_query_flag else ""}

USER:
- Name: {user_info.get('name', 'Operator')}
- Role: {user_role}
- Departments: {', '.join(user_info.get('departments', ['General']))}

ACCESS LEVEL: {role_config['restriction']}

QUERY CLASSIFICATION:
- Primary Domain: {intent['primary_domain']} ({DOMAINS[intent['primary_domain']]['label']})
- Intent Type: {intent['intent_type']}
- Confidence: {intent['confidence']}%
- Data Sources: {', '.join(context['sources'])}
- Data Completeness: {context['completeness_score']}%

LIVE OPERATIONAL DATA:
{context['context_text']}
{rules_text}
{history_text}

RESPONSE RULES:
1. Answer with SPECIFIC numbers from the data above. Never make up data.
2. If data is insufficient, state exactly what's missing and what you'd need.
3. Respect access restrictions strictly. Politely redirect if restricted data is requested.
4. For 'recommend' intents: provide 2-3 specific, actionable recommendations with expected $ impact.
5. For 'simulate' intents: outline the CASCADE of impacts across kitchen, labor, inventory, revenue, and margins.
6. For 'explain' intents: trace the root cause through data, not assumptions.
7. For 'alert' intents: prioritize by severity and provide immediate action steps.
8. For 'briefing' intents: cover ALL domains — finance, events, inventory, labor, operations. Prioritize by urgency.
9. ALWAYS cross-reference between modules. If revenue is discussed, mention the labor and food cost impact. If events change, mention prep, inventory, and staffing ripple effects.
10. When relevant, suggest the user open specific platform panels for deeper analysis:
    - "Open the **Scenario Branch Explorer** to model this multi-step decision"
    - "Check the **Digital Twin** for real-time kitchen station utilization"
    - "Review the **Confidence Map** to see where our data is strongest"
    - "The **ZARO Guardian** dashboard shows current compliance and security posture"
    - "Use the **Document Intelligence** panel to upload and analyze vendor invoices"
    - "Run this through the **Event Ripple Engine** to see cascading impacts"
    - "Open **Financial Operations** for the full P&L drill-down with invoice vault"
    - "Check **My Operations** for your department-scoped P&L and budget alerts"
    - "Review **Vendor Intelligence** for price comparisons and rogue spend detection"
    - "Use **Budget & Forecast** to build/adjust budgets and see daily flash reports"
    - "Open **Executive Command** for multi-outlet health dials and cross-outlet comparison"
    - "The **Admin Center** has data import, user management, and commissary configuration"
11. Use markdown formatting: **bold** for key figures, bullet points for lists, headers for sections.
12. Be direct and concise — this is for executives who need answers, not essays.
13. End every response with: what you KNOW (data-backed), what you INFERRED, and what needs MORE DATA.
14. MULTILINGUAL: If the user writes in a language other than English, respond in THAT language while keeping financial terms and KPIs in English for precision. Always respond — never refuse based on language."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        session_key = f"echoai3-{user_info.get('user_id', 'anon')}-{_uid()}"
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=session_key,
            system_message=system_prompt,
        )
        chat.with_model("openai", "gpt-4.1-mini")

        response = await chat.send_message(UserMessage(text=query))
        return response

    except Exception as e:
        # Deterministic fallback
        return _deterministic_fallback(query, intent, context, rules)


def _deterministic_fallback(query: str, intent: dict, context: dict, rules: list) -> str:
    """Structured response when LLM is unavailable."""
    lines = [
        f"**EchoAi³ Analysis** — {DOMAINS[intent['primary_domain']]['label']}",
        f"*Intent: {intent['intent_type']} | Confidence: {intent['confidence']}% | Sources: {len(context['sources'])}*",
        "",
        "**Operational Data Retrieved:**",
    ]
    for line in context["context_text"].split("\n\n"):
        if line.strip():
            lines.append(f"- {line[:200]}")

    if rules:
        lines.append("")
        lines.append("**Domain Rules Triggered:**")
        for r in rules:
            lines.append(f"- [{r['severity'].upper()}] {r['message']}")

    lines.append("")
    lines.append(f"*Data completeness: {context['completeness_score']}%. For deeper analysis, natural language processing will resume shortly.*")
    return "\n".join(lines)


# ──────────────────────────────────────────────
# SESSION MEMORY
# ──────────────────────────────────────────────

def get_or_create_session(session_id: str, user_id: str) -> dict:
    """Get existing session or create new one."""
    if session_id:
        session = db["ai3_sessions"].find_one({"session_id": session_id}, {"_id": 0})
        if session:
            return session

    new_session = {
        "session_id": session_id or f"session-{_uid()}",
        "user_id": user_id,
        "created_at": _now(),
        "updated_at": _now(),
        "messages": [],
        "context_summary": "",
        "domains_discussed": [],
        "turn_count": 0,
    }
    db["ai3_sessions"].insert_one(new_session)
    new_session.pop("_id", None)
    return new_session


def update_session(session_id: str, user_msg: str, ai_response: str, intent: dict):
    """Append messages to session and update metadata."""
    db["ai3_sessions"].update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {"role": "user", "content": user_msg, "timestamp": _now()},
                        {"role": "assistant", "content": ai_response, "timestamp": _now(), "intent": intent},
                    ]
                }
            },
            "$set": {"updated_at": _now()},
            "$inc": {"turn_count": 1},
            "$addToSet": {"domains_discussed": intent["primary_domain"]},
        }
    )


# ──────────────────────────────────────────────
# API ENDPOINTS
# ──────────────────────────────────────────────

class EchoAi3Query(BaseModel):
    query: str
    session_id: Optional[str] = None
    user_id: str = "owner-001"


class EchoAi3Feedback(BaseModel):
    message_id: str
    session_id: str
    rating: int  # 1-5
    feedback: Optional[str] = None


@router.post("/think")
async def echoai3_think(req: EchoAi3Query):
    """EchoAi³ Brainstem — the primary intelligence endpoint.
    Classifies intent → retrieves cross-module data → applies domain rules →
    synthesizes response → logs to TraceLedger → returns governed answer."""

    # 1. Get user context
    user = db["rbac_users"].find_one({"user_id": req.user_id}, {"_id": 0})
    if not user:
        user = {"user_id": req.user_id, "name": "Operator", "role": "owner", "departments": ["All"]}

    # 2. Get or create session
    session = get_or_create_session(req.session_id, req.user_id)
    session_id = session["session_id"]

    # 3. Classify intent
    intent = classify_intent(req.query)

    # 4. Retrieve cross-module data
    context = retrieve_context(intent, req.query)

    # 5. Apply domain reasoning rules
    rules = apply_domain_rules(intent, context)

    # 6. Get conversation history for context
    history = session.get("messages", [])[-10:]

    # 7. Synthesize response via LLM
    response_text = await synthesize_response(
        req.query, intent, context, rules, user, history
    )

    # 8. Calculate confidence
    confidence = round(min(95, (
        intent["confidence"] * 0.4 +
        context["completeness_score"] * 0.4 +
        (20 if len(context["sources"]) > 3 else 10) +
        (10 if not rules else 5)
    )), 1)

    # 9. Log to TraceLedger
    message_id = f"msg-{_uid()}"
    trace_entry = trace_log(
        event_type="ai3_decision",
        entity_type="echoai3_response",
        entity_id=message_id,
        actor_id=req.user_id,
        changes={
            "query": req.query,
            "intent": intent,
            "response_length": len(response_text),
        },
        metadata={
            "session_id": session_id,
            "confidence": confidence,
            "data_sources": context["sources"],
            "data_completeness": context["completeness_score"],
            "rules_triggered": [r["rule"] for r in rules],
            "intent_type": intent["intent_type"],
            "primary_domain": intent["primary_domain"],
        },
    )

    # 10. Update session memory
    update_session(session_id, req.query, response_text, intent)

    return {
        "message_id": message_id,
        "response": response_text,
        "session_id": session_id,
        "intent": intent,
        "confidence": confidence,
        "data_completeness": context["completeness_score"],
        "data_sources": context["sources"],
        "rules_triggered": rules,
        "trace_id": trace_entry.get("id"),
        "user": {"name": user.get("name"), "role": user.get("role")},
        "timestamp": _now(),
    }


@router.get("/sessions")
async def list_sessions(user_id: str = Query("owner-001"), limit: int = Query(20)):
    """List conversation sessions for a user."""
    sessions = list(db["ai3_sessions"].find(
        {"user_id": user_id},
        {"_id": 0, "session_id": 1, "created_at": 1, "updated_at": 1,
         "turn_count": 1, "domains_discussed": 1}
    ).sort("updated_at", -1).limit(limit))

    # Add first message preview
    for s in sessions:
        full = db["ai3_sessions"].find_one({"session_id": s["session_id"]}, {"_id": 0, "messages": 1})
        msgs = full.get("messages", []) if full else []
        s["preview"] = msgs[0]["content"][:80] if msgs else "New session"
        s["message_count"] = len(msgs)

    return {"sessions": sessions}


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get full session with all messages."""
    session = db["ai3_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return {"error": "Session not found"}
    return session


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    db["ai3_sessions"].delete_one({"session_id": session_id})
    return {"deleted": True}


@router.post("/feedback")
async def submit_feedback(fb: EchoAi3Feedback):
    """Submit feedback on an EchoAi³ response (Layer 5 learning input)."""
    db["ai3_feedback"].insert_one({
        "message_id": fb.message_id,
        "session_id": fb.session_id,
        "rating": fb.rating,
        "feedback": fb.feedback,
        "timestamp": _now(),
    })
    # Log to trace
    trace_log(
        event_type="ai3_feedback",
        entity_type="echoai3_response",
        entity_id=fb.message_id,
        actor_id="user",
        metadata={"rating": fb.rating, "feedback": fb.feedback},
    )
    return {"recorded": True}


@router.get("/trace/{message_id}")
async def get_decision_trace(message_id: str):
    """Get the full TraceLedger audit trail for an AI decision."""
    from tamper_audit import get_entity_timeline
    trail = get_entity_timeline("echoai3_response", message_id)
    return {"message_id": message_id, "trail": trail}


@router.get("/health")
async def echoai3_health():
    """System health check for the EchoAi³ intelligence layer."""
    session_count = db["ai3_sessions"].count_documents({})
    feedback_count = db["ai3_feedback"].count_documents({})
    avg_rating = 0
    if feedback_count > 0:
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        result = list(db["ai3_feedback"].aggregate(pipeline))
        avg_rating = round(result[0]["avg"], 1) if result else 0

    return {
        "status": "operational",
        "layer_1": "Model Intelligence — GPT-4.1-mini via Emergent LLM Key",
        "layer_2": f"Domain Reasoning — {len(DOMAINS)} domains, rules active",
        "layer_3": "Decision Orchestrator — intent classification + module routing",
        "layer_4": "Simulation — connected to EchoStratus scenarios",
        "layer_5": f"Adaptive Learning — {feedback_count} feedback entries, avg rating {avg_rating}",
        "trace_ledger": "Active — hash-chained audit trail",
        "sessions": session_count,
        "domains": list(DOMAINS.keys()),
        "llm_key_configured": bool(LLM_KEY),
        "timestamp": _now(),
    }


@router.get("/identity")
async def echoai3_identity():
    """Return the EchoAi3 self-model for the frontend identity display."""
    return {
        "self_model": {
            "name": "EchoAi3",
            "version": "3.0",
            "type": "Synthetic Intelligence Orchestration System",
            "layers": ["Operations", "Financial", "Culinary", "Guest Experience", "Strategic"],
        },
        "role_descriptions": {
            "owner": "Full system access — strategic oversight, financial intelligence, all modules",
            "gm": "Operational command — daily reports, forecasts, staff management, guest intelligence",
            "exec_chef": "Culinary domain — recipes, menu engineering, food cost, kitchen operations",
            "controller": "Financial intelligence — P&L, budgets, GL sync, procurement analytics",
            "staff": "Operational tools — task management, shift logs, basic reporting",
        },
    }
