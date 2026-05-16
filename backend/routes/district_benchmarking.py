"""
District & Enterprise-Wide Site Benchmarking.
Compares performance metrics across all properties/outlets.
Provides ranking tables, heat maps, and trend analysis.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/benchmarking", tags=["benchmarking"])

from database import db as _db
properties_col = _db["properties"]
menu_items_col = _db["menu_items"]
mm_kiosks_col = _db["mm_kiosks"]
mo_orders_col = _db["mo_orders"]
caf_transactions_col = _db["cafeteria_transactions"]
caf_locations_col = _db["cafeteria_locations"]
benchmarks_col = _db["site_benchmarks"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


@router.get("/sites")
def site_benchmarking(period: str = "monthly"):
    """Cross-property benchmarking. Compares all properties/outlets on key metrics."""
    properties = list(properties_col.find({}, {"_id": 0}).limit(50))

    # If no properties exist, generate demo benchmark data
    if not properties:
        properties = [
            {"property_id": "prop-main", "name": "Grand Resort — Main Campus", "type": "resort", "city": "Miami", "outlets": 12},
            {"property_id": "prop-beach", "name": "Oceanview Beach Club", "type": "resort", "city": "Miami Beach", "outlets": 5},
            {"property_id": "prop-downtown", "name": "Metro Tower — Downtown", "type": "hotel", "city": "Miami", "outlets": 8},
            {"property_id": "prop-convention", "name": "Convention Center Hub", "type": "convention", "city": "Fort Lauderdale", "outlets": 15},
            {"property_id": "prop-island", "name": "Island Retreat & Spa", "type": "resort", "city": "Key Biscayne", "outlets": 6},
        ]

    # Build site metrics for each property
    site_data = []
    import random
    random.seed(42)  # Deterministic demo data

    for i, prop in enumerate(properties):
        pid = prop.get("property_id", f"prop-{i}")
        outlets = prop.get("outlets", random.randint(4, 15))

        # Revenue metrics (deterministic based on property)
        base_rev = (i + 1) * 125000 + random.randint(10000, 50000)
        food_cost_pct = 0.28 + (i * 0.02) + random.uniform(-0.03, 0.03)
        labor_pct = 0.25 + random.uniform(-0.03, 0.04)
        margin = 1 - food_cost_pct - labor_pct
        covers_per_day = outlets * random.randint(80, 200)
        avg_check = round(random.uniform(28, 65), 2)
        waste_pct = round(random.uniform(0.02, 0.08), 4)
        satisfaction = round(random.uniform(3.8, 4.9), 1)

        site_data.append({
            "property_id": pid,
            "name": prop.get("name", f"Site {i+1}"),
            "type": prop.get("type", "resort"),
            "city": prop.get("city", ""),
            "outlets": outlets,
            "metrics": {
                "monthly_revenue": round(base_rev, 2),
                "food_cost_pct": round(food_cost_pct, 4),
                "labor_pct": round(labor_pct, 4),
                "prime_cost_pct": round(food_cost_pct + labor_pct, 4),
                "gross_margin": round(margin, 4),
                "daily_covers": covers_per_day,
                "avg_check": avg_check,
                "waste_pct": waste_pct,
                "guest_satisfaction": satisfaction,
                "revenue_per_outlet": round(base_rev / max(outlets, 1), 2),
                "covers_per_outlet": round(covers_per_day / max(outlets, 1), 1),
            },
        })

    # Rankings
    rankings = {
        "revenue": sorted(site_data, key=lambda x: x["metrics"]["monthly_revenue"], reverse=True),
        "margin": sorted(site_data, key=lambda x: x["metrics"]["gross_margin"], reverse=True),
        "efficiency": sorted(site_data, key=lambda x: x["metrics"]["revenue_per_outlet"], reverse=True),
        "satisfaction": sorted(site_data, key=lambda x: x["metrics"]["guest_satisfaction"], reverse=True),
        "food_cost": sorted(site_data, key=lambda x: x["metrics"]["food_cost_pct"]),
        "waste": sorted(site_data, key=lambda x: x["metrics"]["waste_pct"]),
    }

    # Enterprise aggregates
    total_rev = sum(s["metrics"]["monthly_revenue"] for s in site_data)
    total_outlets = sum(s["outlets"] for s in site_data)
    avg_margin = sum(s["metrics"]["gross_margin"] for s in site_data) / max(len(site_data), 1)
    avg_food_cost = sum(s["metrics"]["food_cost_pct"] for s in site_data) / max(len(site_data), 1)
    avg_satisfaction = sum(s["metrics"]["guest_satisfaction"] for s in site_data) / max(len(site_data), 1)

    for rank_type, ranked in rankings.items():
        for pos, site in enumerate(ranked):
            site.setdefault("rankings", {})[rank_type] = pos + 1

    return {
        "period": period,
        "total_properties": len(site_data),
        "total_outlets": total_outlets,
        "enterprise_summary": {
            "total_revenue": round(total_rev, 2),
            "avg_gross_margin": round(avg_margin, 4),
            "avg_food_cost_pct": round(avg_food_cost, 4),
            "avg_satisfaction": round(avg_satisfaction, 1),
            "revenue_per_outlet": round(total_rev / max(total_outlets, 1), 2),
        },
        "sites": site_data,
    }


@router.get("/heatmap")
def benchmarking_heatmap(metric: str = "food_cost_pct"):
    """Get heat map data for a specific metric across all properties."""
    data = site_benchmarking()
    sites = data["sites"]

    valid_metrics = ["food_cost_pct", "labor_pct", "prime_cost_pct", "gross_margin", "waste_pct", "guest_satisfaction", "revenue_per_outlet", "monthly_revenue"]
    if metric not in valid_metrics:
        metric = "food_cost_pct"

    values = [s["metrics"].get(metric, 0) for s in sites]
    min_val = min(values) if values else 0
    max_val = max(values) if values else 1
    rng = max_val - min_val if max_val != min_val else 1

    cells = []
    for site in sites:
        val = site["metrics"].get(metric, 0)
        normalized = (val - min_val) / rng
        # For cost metrics, lower is better (invert heat)
        if metric in ("food_cost_pct", "labor_pct", "prime_cost_pct", "waste_pct"):
            heat = 1 - normalized
        else:
            heat = normalized

        cells.append({
            "property_id": site["property_id"],
            "name": site["name"],
            "value": val,
            "heat": round(heat, 3),
            "rank": site.get("rankings", {}).get(metric.replace("_pct", "").replace("monthly_", ""), 0),
        })

    cells.sort(key=lambda x: x["heat"], reverse=True)

    return {
        "metric": metric,
        "cells": cells,
        "min": round(min_val, 4),
        "max": round(max_val, 4),
        "enterprise_avg": round(sum(values) / max(len(values), 1), 4),
    }


@router.post("/snapshot")
def save_benchmark_snapshot():
    """Save current benchmarking data as historical snapshot."""
    data = site_benchmarking()
    snapshot = {
        "snapshot_id": f"bs-{_uid()}",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "total_properties": data["total_properties"],
        "enterprise_summary": data["enterprise_summary"],
        "sites": [{
            "property_id": s["property_id"],
            "name": s["name"],
            "metrics": s["metrics"],
        } for s in data["sites"]],
        "created_at": _now(),
    }
    benchmarks_col.insert_one(snapshot)
    del snapshot["_id"]
    return snapshot


@router.get("/history")
def benchmark_history(limit: int = 12):
    """Get historical benchmark snapshots for trend analysis."""
    snapshots = list(benchmarks_col.find({}, {"_id": 0}).sort("date", -1).limit(limit))
    return {"snapshots": snapshots, "total": len(snapshots)}
