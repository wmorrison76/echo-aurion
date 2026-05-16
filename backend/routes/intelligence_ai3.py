"""
AI^3 Intelligence Insights — module endpoints (D7).

Returns AI-generated operational insights per module. The FOH UI
(FOHCommandDashboard.tsx:51) calls /api/intelligence/ai3/foh and was
404-ing before this PR. The other 4 EMERGENT modules (Spa, Retail,
Security, Engineering) have no AI^3 panel yet but the same shape will
back them when those panels land.

Strategy: deterministic seeded insights driven by hash-of-date so the
chef sees consistent, plausible AI output across reloads. Real AI^3
should subscribe to the unified event bus (POS_CHECK_CLOSED,
INVENTORY_SHORTAGE_DETECTED, etc.) and emit context-grounded insights;
that's the next iteration. For demo + 409A: this proves the surface
exists, returns realistic shape, and is wired into the Echo AI^3
namespace.
"""

from __future__ import annotations
import hashlib
import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/intelligence/ai3", tags=["ai3-intelligence"])


def _rng_today(module: str) -> random.Random:
    today = datetime.now(timezone.utc).date().isoformat()
    h = hashlib.sha256(f"ai3:{module}:{today}".encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


# Per-module insight templates. Each template has a placeholder set
# rendered with deterministic random values so the same date yields
# the same insight on reload.
TEMPLATES = {
    "foh": [
        ("VIP arrival pattern",          "{n} VIPs booked tonight; suggest preferring {server} based on historical satisfaction (4.{score}/5)."),
        ("Beverage attach below target", "Bev attach {pct}% on patio (target 65%). Suggest pushing {drink} pairings; estimated lift +${lift}/cover."),
        ("Allergen risk · table {table}", "Guest at table {table} flagged severe nut allergy. Confirm dish {dish} has been re-validated by chef de cuisine."),
        ("Service drift",                "Wait time crept past 18 min between 7:15–7:30 PM. Open table-15 immediately; pre-position server {server}."),
    ],
    "spa": [
        ("Booking gap",                  "{slot} has 3 open slots tonight. Outreach to top-tier members yields ~32% fill rate historically."),
        ("Therapist productivity",       "{name} averaging 5.{score} svc/shift this week — 14% above peer median. Flag for retention coaching."),
        ("Membership renewal risk",      "{n} memberships expire in 14 days; engagement score below threshold. Prompt concierge outreach."),
        ("Retail attach",                "Retail attach to {treatment} treatments below 22% — bundle product display recommended."),
    ],
    "retail": [
        ("Inventory turn",               "{sku} sold {n} units this week vs forecast {fc}; turn velocity 1.4× expected."),
        ("Stock-out risk",               "{sku} on hand: {oh} units; weekly velocity {vel}. Reorder within {days} days to avoid stock-out."),
        ("Margin opportunity",           "{sku} margin {pct}% — competitive list 28%. Consider price test +$1.50; estimated +${lift}/wk."),
    ],
    "security": [
        ("Door-access anomaly",          "{loc} door opened {n} times outside normal hours last 24h. Review access logs."),
        ("Camera offline",               "Cam-{cam} on {floor} floor offline for {min} min. Engineering ticket auto-created."),
        ("Compliance reminder",          "{n} staff certifications expire within 30 days. Schedule renewal training."),
    ],
    "engineering": [
        ("Predictive maintenance",       "Asset {asset} vibration trending +18% over baseline. Recommend bearing inspection within 72 hr; failure probability 24%."),
        ("Utility variance",             "Kitchen-{n} gas usage 11% above same day-of-week last 4 weeks. Inspect for leak or new equipment."),
        ("PM compliance",                "{n} PM tasks overdue >7 days. Reassign to {tech} based on workload."),
        ("CapEx forecast",               "Asset {asset} cumulative repair cost ${cost} approaching 70% of replacement value; flagging for FY+1 budget."),
    ],
    "housekeeping": [
        ("Linen forecast",               "Tomorrow's RNs {n}; current par for {linen} sets at {par}; {short} short — increase morning order."),
        ("Arrival-risk room",            "Room {room} VIP arrival 4 PM; cleaning slot tight. Reassign attendant {att} to prioritize."),
        ("Lost-and-found pattern",       "Items recovered from room-{room} {n}× in last 90 days; pattern suggests guest behavior, not theft."),
    ],
}


def _build_insights(module: str):
    rng = _rng_today(module)
    pool = TEMPLATES.get(module)
    if not pool:
        return []
    chosen = rng.sample(pool, k=min(len(pool), 4))
    insights = []
    for title_template, body_template in chosen:
        # Fill placeholder set with plausible deterministic values.
        ctx = {
            "n":     rng.randint(2, 18),
            "pct":   round(rng.uniform(45, 75), 1),
            "score": rng.randint(20, 78),
            "server": rng.choice(["Marcus T.", "Priya S.", "Diego R.", "Jana K."]),
            "drink": rng.choice(["Pinot Noir", "Margarita", "Whiskey Sour", "Sauvignon Blanc"]),
            "lift":  rng.randint(2, 9),
            "table": rng.randint(2, 24),
            "dish":  rng.choice(["chicken paillard", "pesto pasta", "almond torte", "Thai curry"]),
            "slot":  rng.choice(["6 PM", "7 PM", "9 PM", "Saturday morning"]),
            "name":  rng.choice(["L. Romero", "J. Chen", "M. Adebayo", "A. Petrova"]),
            "treatment": rng.choice(["facial", "massage", "body scrub", "couples"]),
            "sku":   rng.choice(["LBR-1027", "LBR-2841", "STK-1156", "STK-9923"]),
            "fc":    rng.randint(40, 120),
            "oh":    rng.randint(8, 80),
            "vel":   round(rng.uniform(8, 35), 1),
            "days":  rng.randint(2, 9),
            "loc":   rng.choice(["loading dock", "rear staff entry", "wine cellar", "rooftop access"]),
            "cam":   rng.randint(7, 64),
            "floor": rng.choice(["3rd", "4th", "5th", "6th"]),
            "min":   rng.randint(5, 90),
            "asset": rng.choice(["AHU-3", "RTU-5", "Boiler-2", "Chiller-1", "Range-12"]),
            "tech":  rng.choice(["Tom W.", "Maria L.", "Devon J."]),
            "cost":  rng.randint(8000, 32000),
            "linen": rng.choice(["king sheets", "queen sheets", "pool towels", "bath towels"]),
            "par":   rng.randint(80, 240),
            "short": rng.randint(8, 36),
            "room":  rng.randint(204, 814),
            "att":   rng.choice(["R. Ortiz", "S. Patel", "M. Nguyen"]),
        }
        try:
            title = title_template.format(**ctx)
            body  = body_template.format(**ctx)
        except KeyError:
            title = title_template
            body  = body_template
        insights.append({
            "id": hashlib.sha256(f"{module}:{title}:{body}".encode()).hexdigest()[:12],
            "title": title,
            "message": body,
            "severity": rng.choice(["info", "warning", "critical"]),
            "confidence": round(rng.uniform(0.65, 0.95), 2),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_signals": rng.choice(["pos_transactions", "inventory_items", "shift_postings", "guest_profiles"]),
        })
    return insights


def _module_endpoint(module: str):
    if module not in TEMPLATES:
        raise HTTPException(404, f"AI^3 module '{module}' not registered")
    return {
        "module": module,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "insights": _build_insights(module),
        "_source": "seeded_ai3",
        "_note": "Demo-shape insights. Real AI^3 subscribes to unified event bus and grounds context. See server/services/echo-ai3/ for implementation pipeline.",
    }


@router.get("/foh")
def foh_intelligence():
    return _module_endpoint("foh")


@router.get("/spa")
def spa_intelligence():
    return _module_endpoint("spa")


@router.get("/retail")
def retail_intelligence():
    return _module_endpoint("retail")


@router.get("/security")
def security_intelligence():
    return _module_endpoint("security")


@router.get("/engineering")
def engineering_intelligence():
    return _module_endpoint("engineering")


@router.get("/housekeeping")
def housekeeping_intelligence():
    return _module_endpoint("housekeeping")


@router.get("/{module}")
def generic_module(module: str):
    """Catch-all so any future module just works without a code change."""
    return _module_endpoint(module)
