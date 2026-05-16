"""iter197 · Forecast warm-up — seed per-product daily demand baselines.

Reads pack + order history and computes 7-day/30-day rolling means per
product. Used by `/api/fresh-meals/forecast` (upgraded) and Echo anomaly
detection on demand shifts.
"""
from __future__ import annotations

ID = "20260220_forecast_warmup"
DESCRIPTION = "Compute per-product forecast baselines from pack + order history"


def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print):
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict

    now = datetime.now(timezone.utc)
    cutoff_30 = (now - timedelta(days=30)).isoformat()[:10]
    cutoff_7 = (now - timedelta(days=7)).isoformat()[:10]

    per_day: dict = defaultdict(lambda: defaultdict(int))
    for p in db.fresh_meal_packs.find({}, {"_id": 0, "product_id": 1, "pack_date": 1}):
        pid = p.get("product_id") or "_"
        pd = (p.get("pack_date") or "")[:10]
        if pd: per_day[pid][pd] += 1

    baselines = []
    for pid, days in per_day.items():
        total_30 = sum(v for d, v in days.items() if d >= cutoff_30)
        total_7 = sum(v for d, v in days.items() if d >= cutoff_7)
        daily_7 = total_7 / 7.0
        daily_30 = total_30 / 30.0
        baselines.append({
            "product_id": pid,
            "daily_mean_7d": round(daily_7, 2),
            "daily_mean_30d": round(daily_30, 2),
            "total_30d": total_30, "total_7d": total_7,
            "active_days": len(days),
            "computed_at": now.isoformat(),
        })

    if not dry_run:
        db.forecast_baselines.delete_many({})
        if baselines: db.forecast_baselines.insert_many(baselines)

    logger(f"Forecast warm-up: {len(baselines)} product baselines")
    return {"counts": {"products": len(baselines)}, "checkpoint": {}}


def rollback(db, *, dry_run=False, logger=print):
    if dry_run: return {"counts": {"would_delete": db.forecast_baselines.count_documents({})}}
    r = db.forecast_baselines.delete_many({})
    return {"counts": {"deleted": r.deleted_count}}
