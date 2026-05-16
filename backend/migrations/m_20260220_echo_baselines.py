"""iter197 · Echo anomaly-detection baseline computation.

Walks the TimelineEvent stream, groups by (event_type, entity_kind, commodity),
and computes rolling baselines (count/day, mean, p95) stored in
`echo_baselines`. Echo consults this collection to flag deviations.

  python backend/migrations/run_migration.py 20260220_echo_baselines
"""
from __future__ import annotations

ID = "20260220_echo_baselines"
DESCRIPTION = "Compute Echo anomaly-detection baselines from TimelineEvent stream"


def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print):
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict
    import statistics as _stat

    events = list(db.timeline_events.find({}, {"_id": 0, "type": 1, "timestamp": 1, "payload": 1}))

    # Bucket by (type, commodity, day)
    per_type: dict = defaultdict(list)
    per_type_commodity: dict = defaultdict(lambda: defaultdict(int))
    daily_counts: dict = defaultdict(lambda: defaultdict(int))

    for e in events:
        t = e.get("type") or "?"
        p = e.get("payload") or {}
        day = (e.get("timestamp") or "")[:10]
        commodity = p.get("commodity") or "_"
        per_type[t].append(p)
        per_type_commodity[t][commodity] += 1
        daily_counts[t][day] += 1

    baselines = []
    for t, evs in per_type.items():
        daily = list(daily_counts[t].values()) or [0]
        # Numeric payload stats (quantity, temp_c, etc.)
        quantities = [float(p["quantity"]) for p in evs if isinstance(p.get("quantity"), (int, float))]
        temps = [float(p["temp_c"]) for p in evs if isinstance(p.get("temp_c"), (int, float))]

        def _stats(xs):
            if not xs: return None
            return {"n": len(xs), "mean": round(_stat.fmean(xs), 3),
                    "stdev": round(_stat.pstdev(xs), 3) if len(xs) > 1 else 0,
                    "min": round(min(xs), 3), "max": round(max(xs), 3),
                    "p95": round(sorted(xs)[int(len(xs) * 0.95)], 3) if xs else 0}

        baselines.append({
            "event_type": t, "total_events": len(evs),
            "days_seen": len(daily_counts[t]),
            "daily_count_mean": round(_stat.fmean(daily), 3) if daily else 0,
            "daily_count_stdev": round(_stat.pstdev(daily), 3) if len(daily) > 1 else 0,
            "top_commodities": sorted(per_type_commodity[t].items(), key=lambda x: -x[1])[:5],
            "quantity_stats": _stats(quantities),
            "temp_c_stats": _stats(temps),
            "computed_at": datetime.now(timezone.utc).isoformat(),
        })

    if not dry_run:
        db.echo_baselines.delete_many({})
        if baselines: db.echo_baselines.insert_many(baselines)

    logger(f"Computed baselines for {len(baselines)} event types over {len(events)} events")
    return {"counts": {"event_types": len(baselines), "total_events_scanned": len(events)}, "checkpoint": {}}


def rollback(db, *, dry_run=False, logger=print):
    if dry_run: return {"counts": {"would_delete": db.echo_baselines.count_documents({})}}
    r = db.echo_baselines.delete_many({})
    return {"counts": {"deleted": r.deleted_count}}
