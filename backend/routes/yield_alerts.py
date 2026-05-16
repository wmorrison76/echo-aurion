"""
Automated Yield Alerts — Configurable threshold-based alerting system.
Monitors yield variance and triggers alerts when thresholds are exceeded.
Supports daily snapshot scheduling, severity levels, and alert history.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

from database import db as _db
alerts_col = _db["yield_alerts"]
alert_rules_col = _db["alert_rules"]
menu_items_col = _db["menu_items"]
yield_benchmarks_col = _db["yield_benchmarks"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════════════════
# ALERT RULES — configurable thresholds
# ═══════════════════════════════════════════════════════

@router.get("/rules")
def list_alert_rules(property_id: Optional[str] = None):
    """Get all configured alert rules."""
    q = {}
    if property_id:
        q["property_id"] = property_id
    rules = list(alert_rules_col.find(q, {"_id": 0}).sort("created_at", -1))

    # Seed defaults if none exist
    if not rules:
        defaults = [
            {
                "rule_id": f"rule-{_uid()}",
                "name": "High Food Cost Alert",
                "metric": "food_cost_pct",
                "operator": "gt",
                "threshold": 0.40,
                "severity": "critical",
                "enabled": True,
                "description": "Triggers when any item's food cost exceeds 40%",
                "created_at": _now(),
            },
            {
                "rule_id": f"rule-{_uid()}",
                "name": "Negative Yield Variance",
                "metric": "yield_variance_pct",
                "operator": "lt",
                "threshold": -0.15,
                "severity": "warning",
                "enabled": True,
                "description": "Triggers when total yield variance drops below -15%",
                "created_at": _now(),
            },
            {
                "rule_id": f"rule-{_uid()}",
                "name": "Revenue at Risk Threshold",
                "metric": "revenue_at_risk",
                "operator": "gt",
                "threshold": 25000,
                "severity": "warning",
                "enabled": True,
                "description": "Triggers when monthly revenue at risk exceeds $25,000",
                "created_at": _now(),
            },
            {
                "rule_id": f"rule-{_uid()}",
                "name": "Category Yield Drop",
                "metric": "category_variance_pct",
                "operator": "lt",
                "threshold": -0.20,
                "severity": "info",
                "enabled": True,
                "description": "Triggers when any category's yield variance drops below -20%",
                "created_at": _now(),
            },
        ]
        for r in defaults:
            alert_rules_col.insert_one(r)
        rules = list(alert_rules_col.find(q, {"_id": 0}))

    return {"rules": rules, "total": len(rules)}


@router.post("/rules")
def create_alert_rule(body: dict):
    """Create a new alert rule."""
    rule = {
        "rule_id": f"rule-{_uid()}",
        "name": body.get("name", "Custom Alert"),
        "metric": body.get("metric", "food_cost_pct"),
        "operator": body.get("operator", "gt"),
        "threshold": body.get("threshold", 0.35),
        "severity": body.get("severity", "warning"),
        "enabled": body.get("enabled", True),
        "description": body.get("description", ""),
        "property_id": body.get("property_id"),
        "created_at": _now(),
    }
    alert_rules_col.insert_one(rule)
    del rule["_id"]
    return rule


@router.put("/rules/{rule_id}")
def update_alert_rule(rule_id: str, body: dict):
    """Update an alert rule."""
    updates = {k: v for k, v in body.items() if k in ("name", "metric", "operator", "threshold", "severity", "enabled", "description")}
    updates["updated_at"] = _now()
    alert_rules_col.update_one({"rule_id": rule_id}, {"$set": updates})
    rule = alert_rules_col.find_one({"rule_id": rule_id}, {"_id": 0})
    return rule or {"error": "Rule not found"}


@router.delete("/rules/{rule_id}")
def delete_alert_rule(rule_id: str):
    """Delete an alert rule."""
    alert_rules_col.delete_one({"rule_id": rule_id})
    return {"deleted": True}


# ═══════════════════════════════════════════════════════
# ALERT EVALUATION — run checks against current data
# ═══════════════════════════════════════════════════════

@router.post("/evaluate")
def evaluate_alerts():
    """Evaluate all enabled rules against current data. Generates alerts."""
    rules = list(alert_rules_col.find({"enabled": True}, {"_id": 0}))
    items = list(menu_items_col.find({}, {"_id": 0}).limit(300))

    new_alerts = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Compute current metrics
    total_revenue_at_risk = 0
    flagged_items = []
    item_costs = []
    total_projected = 0
    total_actual = 0

    for item in items:
        fc = item.get("food_cost", 0)
        sp = item.get("price", item.get("sell_price", 0))
        vol = item.get("monthly_volume", 0)
        if sp <= 0:
            continue
        cost_pct = fc / sp
        item_costs.append(cost_pct)

        projected_yield = sp * 0.70 * vol
        actual_yield = sp * (1 - cost_pct) * vol
        total_projected += projected_yield
        total_actual += actual_yield

        if cost_pct > 0.35:
            flagged_items.append(item)
            total_revenue_at_risk += fc * vol

    total_variance_pct = (total_actual - total_projected) / max(abs(total_projected), 0.01)

    # Category aggregation
    cat_variances = {}
    for item in items:
        fc = item.get("food_cost", 0)
        sp = item.get("price", item.get("sell_price", 0))
        vol = item.get("monthly_volume", 0)
        cat = item.get("category", "Uncategorized")
        if sp <= 0 or vol <= 0:
            continue
        cost_pct = fc / sp
        projected = sp * 0.70 * vol
        actual = sp * (1 - cost_pct) * vol
        if cat not in cat_variances:
            cat_variances[cat] = {"projected": 0, "actual": 0}
        cat_variances[cat]["projected"] += projected
        cat_variances[cat]["actual"] += actual

    for rule in rules:
        metric = rule.get("metric")
        op = rule.get("operator", "gt")
        threshold = rule.get("threshold", 0)
        triggered = False
        details = {}

        if metric == "food_cost_pct":
            # Check individual items
            for item in items:
                fc = item.get("food_cost", 0)
                sp = item.get("price", item.get("sell_price", 0))
                if sp <= 0:
                    continue
                pct = fc / sp
                if _compare(pct, op, threshold):
                    triggered = True
                    details = {"item": item.get("name"), "food_cost_pct": round(pct, 4), "threshold": threshold}
                    break

        elif metric == "yield_variance_pct":
            if _compare(total_variance_pct, op, threshold):
                triggered = True
                details = {"total_variance_pct": round(total_variance_pct, 4), "threshold": threshold}

        elif metric == "revenue_at_risk":
            if _compare(total_revenue_at_risk, op, threshold):
                triggered = True
                details = {"revenue_at_risk": round(total_revenue_at_risk, 2), "threshold": threshold}

        elif metric == "category_variance_pct":
            for cat, vals in cat_variances.items():
                cat_var_pct = (vals["actual"] - vals["projected"]) / max(abs(vals["projected"]), 0.01)
                if _compare(cat_var_pct, op, threshold):
                    triggered = True
                    details = {"category": cat, "variance_pct": round(cat_var_pct, 4), "threshold": threshold}
                    break

        if triggered:
            alert = {
                "alert_id": f"alert-{_uid()}",
                "rule_id": rule.get("rule_id"),
                "rule_name": rule.get("name"),
                "severity": rule.get("severity", "info"),
                "metric": metric,
                "details": details,
                "date": today,
                "status": "active",
                "created_at": _now(),
            }
            alerts_col.insert_one(alert)
            del alert["_id"]
            new_alerts.append(alert)

    return {"evaluated_rules": len(rules), "alerts_triggered": len(new_alerts), "alerts": new_alerts}


def _compare(value, op, threshold):
    if op == "gt":
        return value > threshold
    elif op == "lt":
        return value < threshold
    elif op == "gte":
        return value >= threshold
    elif op == "lte":
        return value <= threshold
    elif op == "eq":
        return value == threshold
    return False


# ═══════════════════════════════════════════════════════
# ALERT HISTORY
# ═══════════════════════════════════════════════════════

@router.get("/history")
def alert_history(limit: int = 50, severity: Optional[str] = None, status: Optional[str] = None):
    """Get alert history with optional filters."""
    q = {}
    if severity:
        q["severity"] = severity
    if status:
        q["status"] = status
    alerts = list(alerts_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"alerts": alerts, "total": len(alerts)}


@router.put("/history/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    """Acknowledge an alert."""
    alerts_col.update_one({"alert_id": alert_id}, {"$set": {"status": "acknowledged", "acknowledged_at": _now()}})
    return {"acknowledged": True}


@router.put("/history/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    """Resolve an alert."""
    alerts_col.update_one({"alert_id": alert_id}, {"$set": {"status": "resolved", "resolved_at": _now()}})
    return {"resolved": True}


@router.get("/summary")
def alert_summary():
    """Get alert summary stats."""
    total = alerts_col.count_documents({})
    active = alerts_col.count_documents({"status": "active"})
    acknowledged = alerts_col.count_documents({"status": "acknowledged"})
    resolved = alerts_col.count_documents({"status": "resolved"})
    critical = alerts_col.count_documents({"severity": "critical", "status": "active"})
    warning = alerts_col.count_documents({"severity": "warning", "status": "active"})
    info = alerts_col.count_documents({"severity": "info", "status": "active"})
    return {
        "total": total,
        "active": active,
        "acknowledged": acknowledged,
        "resolved": resolved,
        "by_severity": {"critical": critical, "warning": warning, "info": info},
    }
