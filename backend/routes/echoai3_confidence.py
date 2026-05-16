"""
EchoAi3 -- Confidence Visualization Engine
=============================================
Real-time confidence heatmap across all 9 intelligence domains.
Shows data coverage, data freshness, prediction reliability,
and blind spots so operators know exactly where EchoAi3 is
trustworthy and where it needs more data.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter

import database

db = database.db
router = APIRouter(prefix="/api/echoai3/confidence", tags=["echoai3-confidence"])

_now = lambda: datetime.now(timezone.utc).isoformat()

DOMAINS = {
    "finance": {
        "label": "Financial Intelligence",
        "collections": ["gl_entries", "budgets", "invoices", "vendor_orders"],
        "min_records": 50,
        "ideal_records": 500,
    },
    "events": {
        "label": "Event & Banquet Intelligence",
        "collections": ["events", "beos", "calendar_events"],
        "min_records": 10,
        "ideal_records": 100,
    },
    "inventory": {
        "label": "Inventory & Supply Chain",
        "collections": ["ingredients", "waste_tracking"],
        "min_records": 30,
        "ideal_records": 200,
    },
    "labor": {
        "label": "Labor & Workforce Intelligence",
        "collections": ["labor_schedules", "labor_actuals"],
        "min_records": 20,
        "ideal_records": 200,
    },
    "culinary": {
        "label": "Culinary & Menu Intelligence",
        "collections": ["menu_items", "recipes"],
        "min_records": 20,
        "ideal_records": 150,
    },
    "vendor": {
        "label": "Vendor & Procurement Intelligence",
        "collections": ["vendors", "invoices", "vendor_orders"],
        "min_records": 10,
        "ideal_records": 100,
    },
    "guest": {
        "label": "Guest & CRM Intelligence",
        "collections": ["guest_profiles"],
        "min_records": 20,
        "ideal_records": 500,
    },
    "beverage": {
        "label": "Beverage Intelligence",
        "collections": ["beverage_inventory", "pour_logs"],
        "min_records": 15,
        "ideal_records": 200,
    },
    "operations": {
        "label": "Operations Intelligence",
        "collections": ["compliance_checklists", "outlets", "properties"],
        "min_records": 5,
        "ideal_records": 50,
    },
}


def _compute_domain_confidence(domain_key: str, config: dict) -> dict:
    """Compute confidence metrics for a single domain."""
    total_records = 0
    collection_stats = []

    for coll_name in config["collections"]:
        count = db[coll_name].count_documents({})
        total_records += count

        # Freshness: check if any records have timestamps
        latest = None
        for ts_field in ["created_at", "updated_at", "timestamp", "date", "completed_at"]:
            rec = db[coll_name].find_one({ts_field: {"$exists": True}}, {"_id": 0, ts_field: 1}, sort=[(ts_field, -1)])
            if rec and rec.get(ts_field):
                latest = rec[ts_field]
                break

        freshness_status = "unknown"
        hours_since_update = None
        if latest:
            try:
                if isinstance(latest, str):
                    ts = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                elif isinstance(latest, datetime):
                    ts = latest.replace(tzinfo=timezone.utc) if ts.tzinfo is None else latest
                else:
                    ts = None
                if ts:
                    delta = datetime.now(timezone.utc) - ts
                    hours_since_update = round(delta.total_seconds() / 3600, 1)
                    if hours_since_update < 24:
                        freshness_status = "fresh"
                    elif hours_since_update < 168:
                        freshness_status = "recent"
                    elif hours_since_update < 720:
                        freshness_status = "aging"
                    else:
                        freshness_status = "stale"
            except Exception:
                freshness_status = "unknown"

        collection_stats.append({
            "collection": coll_name,
            "record_count": count,
            "freshness": freshness_status,
            "hours_since_update": hours_since_update,
        })

    # Coverage score (0-100)
    coverage = min(100, round(total_records / max(config["ideal_records"], 1) * 100))

    # Freshness score
    fresh_count = sum(1 for c in collection_stats if c["freshness"] in ("fresh", "recent"))
    freshness_score = round(fresh_count / max(len(collection_stats), 1) * 100)

    # Data completeness
    has_data = sum(1 for c in collection_stats if c["record_count"] > 0)
    completeness = round(has_data / max(len(collection_stats), 1) * 100)

    # Overall confidence = weighted average
    confidence = round(coverage * 0.4 + freshness_score * 0.3 + completeness * 0.3)

    # Status classification
    if confidence >= 80:
        status = "high"
    elif confidence >= 50:
        status = "moderate"
    elif confidence >= 20:
        status = "low"
    else:
        status = "blind_spot"

    # Blind spots
    blind_spots = []
    for c in collection_stats:
        if c["record_count"] == 0:
            blind_spots.append(f"No data in {c['collection']}")
        elif c["record_count"] < config["min_records"]:
            blind_spots.append(f"Insufficient data in {c['collection']} ({c['record_count']}/{config['min_records']})")
        if c["freshness"] == "stale":
            blind_spots.append(f"Stale data in {c['collection']}")

    return {
        "domain": domain_key,
        "label": config["label"],
        "confidence": confidence,
        "status": status,
        "coverage_score": coverage,
        "freshness_score": freshness_score,
        "completeness_score": completeness,
        "total_records": total_records,
        "collections": collection_stats,
        "blind_spots": blind_spots,
        "has_blind_spots": len(blind_spots) > 0,
    }


def _compute_ai_usage_confidence() -> dict:
    """Compute confidence based on AI feedback and calibration."""
    # Feedback stats
    feedback_count = db["ai3_feedback"].count_documents({})
    avg_rating = 0
    if feedback_count > 0:
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        result = list(db["ai3_feedback"].aggregate(pipeline))
        avg_rating = round(result[0]["avg"], 1) if result else 0

    # Calibration accuracy
    cal_count = db["ai3_calibrations"].count_documents({})
    avg_accuracy = 0
    if cal_count > 0:
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$accuracy_pct"}}}]
        result = list(db["ai3_calibrations"].aggregate(pipeline))
        avg_accuracy = round(result[0]["avg"], 1) if result else 0

    # Session engagement
    session_count = db["ai3_sessions"].count_documents({})
    recent_sessions = db["ai3_sessions"].count_documents({})

    # Domain query distribution
    domain_freq = {}
    sessions = list(db["ai3_sessions"].find({}, {"_id": 0, "domains_discussed": 1}).limit(100))
    for s in sessions:
        for d in s.get("domains_discussed", []):
            domain_freq[d] = domain_freq.get(d, 0) + 1

    return {
        "feedback_count": feedback_count,
        "avg_rating": avg_rating,
        "satisfaction_score": round(avg_rating / 5 * 100) if avg_rating else 0,
        "calibration_entries": cal_count,
        "avg_prediction_accuracy": avg_accuracy,
        "total_sessions": session_count,
        "domain_query_distribution": domain_freq,
        "most_queried": max(domain_freq, key=domain_freq.get) if domain_freq else "none",
        "least_queried": min(domain_freq, key=domain_freq.get) if domain_freq else "none",
    }


# ─── API Endpoints ───

@router.get("/heatmap")
async def confidence_heatmap():
    """Get real-time confidence heatmap across all 9 domains."""
    domain_scores = []
    for key, config in DOMAINS.items():
        score = _compute_domain_confidence(key, config)
        domain_scores.append(score)

    # Sort by confidence (lowest first = highest priority to address)
    domain_scores.sort(key=lambda x: x["confidence"])

    # Overall platform confidence
    avg_confidence = round(sum(d["confidence"] for d in domain_scores) / max(len(domain_scores), 1))
    high_count = sum(1 for d in domain_scores if d["status"] == "high")
    moderate_count = sum(1 for d in domain_scores if d["status"] == "moderate")
    low_count = sum(1 for d in domain_scores if d["status"] == "low")
    blind_count = sum(1 for d in domain_scores if d["status"] == "blind_spot")
    total_records = sum(d["total_records"] for d in domain_scores)
    all_blind_spots = []
    for d in domain_scores:
        all_blind_spots.extend(d["blind_spots"])

    return {
        "platform_confidence": avg_confidence,
        "platform_status": "high" if avg_confidence >= 80 else "moderate" if avg_confidence >= 50 else "low",
        "domain_count": len(domain_scores),
        "domains": domain_scores,
        "summary": {
            "high_confidence": high_count,
            "moderate_confidence": moderate_count,
            "low_confidence": low_count,
            "blind_spots": blind_count,
        },
        "total_data_points": total_records,
        "critical_blind_spots": all_blind_spots[:10],
        "timestamp": _now(),
    }


@router.get("/domain/{domain_key}")
async def domain_confidence(domain_key: str):
    """Get detailed confidence analysis for a specific domain."""
    config = DOMAINS.get(domain_key)
    if not config:
        return {"error": f"Unknown domain: {domain_key}", "available": list(DOMAINS.keys())}

    score = _compute_domain_confidence(domain_key, config)
    return {**score, "timestamp": _now()}


@router.get("/usage")
async def usage_confidence():
    """Get AI usage and feedback confidence metrics."""
    usage = _compute_ai_usage_confidence()
    return {**usage, "timestamp": _now()}


@router.get("/recommendations")
async def confidence_recommendations():
    """Get actionable recommendations to improve confidence across domains."""
    domain_scores = []
    for key, config in DOMAINS.items():
        domain_scores.append(_compute_domain_confidence(key, config))

    recommendations = []

    for d in sorted(domain_scores, key=lambda x: x["confidence"]):
        if d["status"] == "blind_spot":
            recommendations.append({
                "domain": d["domain"],
                "label": d["label"],
                "priority": "critical",
                "confidence": d["confidence"],
                "action": f"Import data for {d['label']}. Currently {d['total_records']} records — need minimum {DOMAINS[d['domain']]['min_records']}.",
                "impact": "Will unlock AI analysis for this entire domain",
            })
        elif d["status"] == "low":
            recommendations.append({
                "domain": d["domain"],
                "label": d["label"],
                "priority": "high",
                "confidence": d["confidence"],
                "action": f"Increase data coverage for {d['label']}. {d['total_records']} records present, ideal is {DOMAINS[d['domain']]['ideal_records']}.",
                "impact": f"Could raise domain confidence from {d['confidence']}% to ~{min(100, d['confidence'] + 25)}%",
            })
        elif d["has_blind_spots"]:
            recommendations.append({
                "domain": d["domain"],
                "label": d["label"],
                "priority": "medium",
                "confidence": d["confidence"],
                "action": f"Address blind spots: {'; '.join(d['blind_spots'][:3])}",
                "impact": f"Will improve {d['label']} reliability",
            })

    return {
        "recommendations": recommendations,
        "total_recommendations": len(recommendations),
        "highest_priority": recommendations[0]["domain"] if recommendations else "none",
        "timestamp": _now(),
    }
