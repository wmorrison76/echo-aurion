"""
EchoAi3 -- Layer 5: Adaptive Intelligence & Learning
======================================================
Integrates collective intelligence insights into local forecast overrides.
Tracks prediction accuracy, calibrates models from actuals vs. forecast,
and manages the feedback learning loop.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/adaptive", tags=["echoai3-adaptive"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ─── Learning Metrics ───

class ForecastOverride(BaseModel):
    metric: str
    period: str
    original_forecast: float
    override_value: float
    source: str = "collective"
    reason: Optional[str] = None


class CalibrationEntry(BaseModel):
    metric: str
    period: str
    forecast_value: float
    actual_value: float


# ─── Prediction Accuracy Tracking ───

def compute_accuracy_stats() -> dict:
    """Compute prediction accuracy across all stored calibration entries."""
    entries = list(db["ai3_calibrations"].find({}, {"_id": 0}).limit(200))
    if not entries:
        return {"total_entries": 0, "avg_accuracy_pct": 0, "metrics": {}}

    metrics = {}
    for e in entries:
        m = e.get("metric", "unknown")
        if m not in metrics:
            metrics[m] = {"forecasts": [], "actuals": [], "errors": []}
        forecast = e.get("forecast_value", 0)
        actual = e.get("actual_value", 0)
        if actual > 0:
            error = abs(forecast - actual) / actual * 100
            metrics[m]["forecasts"].append(forecast)
            metrics[m]["actuals"].append(actual)
            metrics[m]["errors"].append(error)

    result = {}
    total_errors = []
    for m, data in metrics.items():
        if data["errors"]:
            avg_err = sum(data["errors"]) / len(data["errors"])
            total_errors.extend(data["errors"])
            result[m] = {
                "entries": len(data["errors"]),
                "avg_error_pct": round(avg_err, 2),
                "accuracy_pct": round(100 - avg_err, 2),
                "best_accuracy": round(100 - min(data["errors"]), 2),
                "worst_accuracy": round(100 - max(data["errors"]), 2),
            }

    return {
        "total_entries": len(entries),
        "avg_accuracy_pct": round(100 - sum(total_errors) / max(len(total_errors), 1), 2),
        "metrics": result,
    }


def get_learning_insights() -> list:
    """Synthesize learning insights from feedback, calibrations, and collective patterns."""
    insights = []

    # Feedback patterns
    feedback = list(db["ai3_feedback"].find({}, {"_id": 0}).sort("timestamp", -1).limit(100))
    if feedback:
        avg_rating = sum(f.get("rating", 3) for f in feedback) / len(feedback)
        low_ratings = [f for f in feedback if f.get("rating", 3) <= 2]
        insights.append({
            "type": "feedback_analysis",
            "insight": f"Average user satisfaction: {round(avg_rating, 1)}/5 across {len(feedback)} responses. {len(low_ratings)} flagged as unsatisfactory.",
            "priority": "high" if avg_rating < 3 else "medium" if avg_rating < 4 else "low",
            "action": "Review flagged responses and adjust domain reasoning rules" if low_ratings else "Maintain current approach",
        })

    # Calibration drift
    accuracy = compute_accuracy_stats()
    for metric, stats in accuracy.get("metrics", {}).items():
        if stats["accuracy_pct"] < 85:
            insights.append({
                "type": "calibration_drift",
                "insight": f"{metric} forecasts averaging {stats['accuracy_pct']}% accuracy — below 85% threshold. {stats['entries']} calibration points.",
                "priority": "high",
                "action": f"Recalibrate {metric} model. Consider seasonal adjustments and vendor cost updates.",
            })
        elif stats["accuracy_pct"] > 95:
            insights.append({
                "type": "calibration_excellent",
                "insight": f"{metric} forecasts at {stats['accuracy_pct']}% accuracy — exceeding target.",
                "priority": "low",
                "action": "No action needed. Model performing well.",
            })

    # Collective intelligence integration
    collective_settings = db["collective_settings"].find_one({}, {"_id": 0}) or {}
    if collective_settings.get("enabled") and collective_settings.get("ingest"):
        patterns = list(db["collective_patterns"].find({"source": "collective"}, {"_id": 0}).limit(20))
        if patterns:
            insights.append({
                "type": "collective_wisdom",
                "insight": f"Ingesting {len(patterns)} collective patterns. Top categories: {', '.join(set(p.get('category','') for p in patterns[:5]))}.",
                "priority": "medium",
                "action": "Review collective patterns for local applicability and forecast adjustments.",
            })
    else:
        insights.append({
            "type": "collective_inactive",
            "insight": "Collective Intelligence mesh is inactive. Enable to benefit from cross-property operational wisdom.",
            "priority": "low",
            "action": "Enable collective ingestion in settings for broader pattern recognition.",
        })

    # Session pattern analysis
    sessions = list(db["ai3_sessions"].find({}, {"_id": 0, "domains_discussed": 1, "turn_count": 1}).sort("updated_at", -1).limit(50))
    if sessions:
        domain_freq = {}
        for s in sessions:
            for d in s.get("domains_discussed", []):
                domain_freq[d] = domain_freq.get(d, 0) + 1
        top_domains = sorted(domain_freq.items(), key=lambda x: x[1], reverse=True)[:3]
        insights.append({
            "type": "usage_pattern",
            "insight": f"Top queried domains: {', '.join(f'{d} ({c}x)' for d,c in top_domains)}. {len(sessions)} sessions analyzed.",
            "priority": "low",
            "action": "Prioritize data quality and rule refinement for most-queried domains.",
        })

    return insights


# ─── API Endpoints ───

@router.get("/accuracy")
async def prediction_accuracy():
    """Get prediction accuracy metrics across all tracked forecasts."""
    stats = compute_accuracy_stats()
    return {"accuracy": stats, "timestamp": _now()}


@router.post("/calibrate")
async def submit_calibration(entry: CalibrationEntry):
    """Submit actual vs. forecast data for model calibration."""
    cal_id = f"cal-{_uid()}"
    error = abs(entry.forecast_value - entry.actual_value) / max(entry.actual_value, 1) * 100

    db["ai3_calibrations"].insert_one({
        "calibration_id": cal_id,
        "metric": entry.metric,
        "period": entry.period,
        "forecast_value": entry.forecast_value,
        "actual_value": entry.actual_value,
        "error_pct": round(error, 2),
        "accuracy_pct": round(100 - error, 2),
        "created_at": _now(),
    })

    trace_log(
        event_type="forecast_calibrated",
        entity_type="echoai3_adaptive",
        entity_id=cal_id,
        actor_id="echoai3",
        metadata={"metric": entry.metric, "error_pct": round(error, 2)},
    )

    return {"calibration_id": cal_id, "error_pct": round(error, 2), "accuracy_pct": round(100 - error, 2)}


@router.post("/override")
async def apply_forecast_override(req: ForecastOverride):
    """Apply a forecast override based on collective intelligence or manual adjustment."""
    override_id = f"ovr-{_uid()}"
    delta = req.override_value - req.original_forecast
    delta_pct = round(delta / max(abs(req.original_forecast), 1) * 100, 2)

    db["ai3_overrides"].insert_one({
        "override_id": override_id,
        "metric": req.metric,
        "period": req.period,
        "original_forecast": req.original_forecast,
        "override_value": req.override_value,
        "delta": round(delta, 2),
        "delta_pct": delta_pct,
        "source": req.source,
        "reason": req.reason,
        "applied_at": _now(),
        "status": "active",
    })

    trace_log(
        event_type="forecast_override_applied",
        entity_type="echoai3_adaptive",
        entity_id=override_id,
        actor_id="echoai3",
        metadata={"metric": req.metric, "delta_pct": delta_pct, "source": req.source},
    )

    return {
        "override_id": override_id,
        "metric": req.metric,
        "delta": round(delta, 2),
        "delta_pct": delta_pct,
        "status": "applied",
    }


@router.get("/overrides")
async def list_overrides(status: str = Query("active"), limit: int = Query(20)):
    """List active forecast overrides."""
    query = {}
    if status:
        query["status"] = status
    overrides = list(db["ai3_overrides"].find(query, {"_id": 0}).sort("applied_at", -1).limit(limit))
    return {"overrides": overrides, "count": len(overrides)}


@router.get("/insights")
async def adaptive_insights():
    """Get synthesized learning insights from all adaptive intelligence sources."""
    insights = get_learning_insights()
    accuracy = compute_accuracy_stats()
    override_count = db["ai3_overrides"].count_documents({"status": "active"})
    feedback_count = db["ai3_feedback"].count_documents({})

    return {
        "insights": insights,
        "summary": {
            "prediction_accuracy": accuracy.get("avg_accuracy_pct", 0),
            "calibration_entries": accuracy.get("total_entries", 0),
            "active_overrides": override_count,
            "feedback_entries": feedback_count,
            "learning_status": "active",
        },
        "timestamp": _now(),
    }


@router.get("/feedback-summary")
async def feedback_summary():
    """Get aggregated feedback analytics."""
    pipeline = [
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total": {"$sum": 1},
            "ratings": {"$push": "$rating"},
        }},
    ]
    result = list(db["ai3_feedback"].aggregate(pipeline))
    if not result:
        return {"avg_rating": 0, "total": 0, "distribution": {}}

    data = result[0]
    ratings = data.get("ratings", [])
    distribution = {str(i): ratings.count(i) for i in range(1, 6)}

    return {
        "avg_rating": round(data.get("avg_rating", 0), 2),
        "total": data.get("total", 0),
        "distribution": distribution,
        "satisfaction_pct": round(len([r for r in ratings if r >= 4]) / max(len(ratings), 1) * 100, 1),
    }
