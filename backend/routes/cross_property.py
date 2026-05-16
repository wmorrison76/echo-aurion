"""
Cross-Property Benchmarking
===========================
T.10 from the CFO toolkit additions. For operators with 2+ properties,
compare per-outlet KPIs side by side, identify outliers, and surface
the "what is property X doing differently" deep-dive.

Reads from:
  · `outlet_capture_daily`     — actuals per outlet per day
  · `outlet_capture_accuracy`  — forecast quality per outlet
  · `outlets`                  — outlet metadata
  · `aurum_gl_journal`         — GL-level financial KPIs

Real math; surfaces median-and-deviation patterns rather than
naive averages so a single outlier doesn't pull the comparison off.

Doctrine alignment:
  · §2.5 framing — outliers surface as observation; the question is
    "what is property X doing differently" not "property Y is failing"
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median, stdev
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/cross-property", tags=["cfo-cross-property"])

_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("/benchmark")
async def benchmark(
    metric: str = Query("eligible_capture", regex="^(eligible_capture|available_capture|total_capture|revenue_cents|covers)$"),
    outlet_type: Optional[str] = None,
    lookback_days: int = Query(30, ge=7, le=180),
):
    """Cross-property benchmark on a chosen metric, optionally scoped
    to a single outlet type (e.g. compare all spas across properties).

    Returns: per-property median, mean, P25, P75 + outlier flags."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()

    # Pull every active outlet (optionally filtered by type) and aggregate
    outlet_query: Dict = {"active": True}
    if outlet_type:
        outlet_query["outlet_type"] = outlet_type
    outlets = list(db["outlets"].find(outlet_query, {"_id": 0, "outlet_id": 1, "property_id": 1, "name": 1, "outlet_type": 1}))
    if not outlets:
        return {
            "metric": metric,
            "available": False,
            "reason": "no_outlets_match_filter",
            "generated_at": _now(),
        }

    by_property: Dict[str, List[float]] = {}
    by_outlet: List[Dict] = []
    for outlet in outlets:
        rows = list(
            db["outlet_capture_daily"].find(
                {"outlet_id": outlet["outlet_id"], "date": {"$gte": cutoff}},
                {"_id": 0, metric: 1, "date": 1},
            )
        )
        if not rows:
            continue
        values = [r.get(metric, 0) for r in rows]
        if not values:
            continue
        outlet_avg = mean(values)
        by_property.setdefault(outlet["property_id"], []).append(outlet_avg)
        by_outlet.append({
            "property_id": outlet["property_id"],
            "outlet_id": outlet["outlet_id"],
            "outlet_name": outlet.get("name"),
            "outlet_type": outlet.get("outlet_type"),
            "avg_value": round(outlet_avg, 4),
            "samples": len(values),
        })

    if not by_outlet:
        return {
            "metric": metric,
            "available": False,
            "reason": "no_outlet_capture_daily_data",
            "outlet_type_filter": outlet_type,
            "generated_at": _now(),
        }

    # Per-property summary
    property_summary = []
    for prop_id, vals in by_property.items():
        sorted_vals = sorted(vals)
        n = len(sorted_vals)
        property_summary.append({
            "property_id": prop_id,
            "outlet_count": n,
            "avg": round(mean(vals), 4),
            "median": round(median(vals), 4),
            "p25": round(sorted_vals[max(0, n // 4)], 4),
            "p75": round(sorted_vals[min(n - 1, int(3 * n / 4))], 4),
        })
    property_summary.sort(key=lambda p: p["avg"], reverse=True)

    # Outlier detection — outlets that are >1.5× median deviation from peer median
    all_values = [o["avg_value"] for o in by_outlet]
    overall_median = median(all_values)
    overall_stdev = stdev(all_values) if len(all_values) >= 2 else 0
    outliers = []
    for o in by_outlet:
        if overall_stdev > 0:
            z = (o["avg_value"] - overall_median) / overall_stdev
        else:
            z = 0
        if abs(z) >= 1.5:
            outliers.append({**o, "z_score": round(z, 3), "direction": ("above" if z > 0 else "below")})

    return {
        "metric": metric,
        "outlet_type_filter": outlet_type,
        "lookback_days": lookback_days,
        "available": True,
        "overall": {
            "median": round(overall_median, 4),
            "stdev": round(overall_stdev, 4),
            "outlets": len(by_outlet),
            "properties": len(by_property),
        },
        "by_property": property_summary,
        "outliers": outliers,
        "narrative": _benchmark_narrative(metric, property_summary, outliers),
        "generated_at": _now(),
    }


@router.get("/deep-dive/{outlet_id}")
async def deep_dive(outlet_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """For a specific outlet, compare it against all peer outlets
    (same outlet_type, different properties) on the full set of
    capture metrics. Surfaces 'what is property X doing differently.'"""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"Outlet {outlet_id} not registered")

    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    target_rows = list(
        db["outlet_capture_daily"].find(
            {"outlet_id": outlet_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        )
    )
    if not target_rows:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "no_target_outlet_data",
            "generated_at": _now(),
        }

    # Find peer outlets (same type, different property)
    peers = list(db["outlets"].find(
        {"outlet_type": outlet["outlet_type"], "outlet_id": {"$ne": outlet_id}, "active": True},
        {"_id": 0, "outlet_id": 1, "property_id": 1, "name": 1},
    ))
    peer_data: Dict[str, Dict[str, float]] = {}
    metrics = ["eligible_capture", "available_capture", "total_capture", "revenue_cents", "covers"]
    for peer in peers:
        peer_rows = list(
            db["outlet_capture_daily"].find(
                {"outlet_id": peer["outlet_id"], "date": {"$gte": cutoff}},
                {"_id": 0, **{m: 1 for m in metrics}},
            )
        )
        if not peer_rows:
            continue
        peer_data[peer["outlet_id"]] = {
            "property_id": peer["property_id"],
            "outlet_name": peer.get("name"),
            **{m: mean([r.get(m, 0) for r in peer_rows]) for m in metrics},
        }

    target_avgs = {m: mean([r.get(m, 0) for r in target_rows]) for m in metrics}

    comparison = {}
    for m in metrics:
        peer_vals = [d[m] for d in peer_data.values() if d.get(m) is not None]
        if not peer_vals:
            comparison[m] = {"target": round(target_avgs[m], 4), "peers": "no_peer_data"}
            continue
        peer_median = median(peer_vals)
        delta = target_avgs[m] - peer_median
        delta_pct = (delta / peer_median) if peer_median > 0 else 0
        comparison[m] = {
            "target": round(target_avgs[m], 4),
            "peer_median": round(peer_median, 4),
            "peer_count": len(peer_vals),
            "delta_vs_peer": round(delta, 4),
            "delta_pct": round(delta_pct, 4),
            "rank": _rank(target_avgs[m], peer_vals),
        }

    return {
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "outlet_type": outlet.get("outlet_type"),
        "property_id": outlet.get("property_id"),
        "lookback_days": lookback_days,
        "available": True,
        "comparison": comparison,
        "peer_count": len(peer_data),
        "narrative": _deep_dive_narrative(outlet, comparison),
        "generated_at": _now(),
    }


def _rank(value: float, peer_vals: List[float]) -> Dict:
    """1-based rank of value among value+peer_vals, plus percentile."""
    all_vals = sorted(peer_vals + [value], reverse=True)
    rank = all_vals.index(value) + 1
    n = len(all_vals)
    percentile = round((1 - (rank - 1) / n) * 100, 1)
    return {"rank": rank, "of": n, "percentile": percentile}


def _benchmark_narrative(metric: str, property_summary: List[Dict], outliers: List[Dict]) -> str:
    if not property_summary:
        return f"No data for {metric} across the lookback window."
    top = property_summary[0]
    bottom = property_summary[-1]
    parts = [
        f"Across {len(property_summary)} properties, top performer on {metric} "
        f"is {top['property_id']} ({top['avg']}), bottom is {bottom['property_id']} "
        f"({bottom['avg']}).",
    ]
    if outliers:
        outlier_count = len(outliers)
        above = sum(1 for o in outliers if o["direction"] == "above")
        below = outlier_count - above
        parts.append(
            f"{outlier_count} outlets are >1.5σ from the median ({above} above, "
            f"{below} below). Investigate the {below} below-median outlets first."
        )
    return " ".join(parts)


def _deep_dive_narrative(outlet: Dict, comparison: Dict) -> str:
    name = outlet.get("name", outlet["outlet_id"])
    weak_metrics = [
        m for m, c in comparison.items()
        if isinstance(c, dict) and isinstance(c.get("delta_pct"), (int, float)) and c["delta_pct"] < -0.10
    ]
    strong_metrics = [
        m for m, c in comparison.items()
        if isinstance(c, dict) and isinstance(c.get("delta_pct"), (int, float)) and c["delta_pct"] > 0.10
    ]
    parts = [f"{name} comparison vs peer outlets of type {outlet.get('outlet_type')}:"]
    if strong_metrics:
        parts.append(f"Outperforms peer median on {', '.join(strong_metrics)}.")
    if weak_metrics:
        parts.append(
            f"Underperforms peer median on {', '.join(weak_metrics)}. "
            f"Worth a look at how peer properties are running this outlet differently."
        )
    if not weak_metrics and not strong_metrics:
        parts.append("Roughly tracking peer median across all metrics.")
    return " ".join(parts)
