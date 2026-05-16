"""Seed baseline feature flags for Fresh Meal upgrades."""
from __future__ import annotations

ID = "20260220_seed_fm_flags"
DESCRIPTION = "Seed feature flags for FM-Upgrade 0..7 (all OFF by default)"

FLAGS = [
    ("fm_upgrade_0_enabled", "FM-Upgrade 0 — feature flags + migration runner + release notes"),
    ("fm_upgrade_1_timeline", "FM-Upgrade 1 — TimelineEvent primitive + Activity feed"),
    ("fm_upgrade_2_recipe_graph", "FM-Upgrade 2 — RecipeNode graph + nutrition/allergen/cost cascade"),
    ("fm_upgrade_3_pack_primitive", "FM-Upgrade 3 — Pack as atomic unit + Fresh Meal backend revival"),
    ("fm_upgrade_4_channel_calendar", "FM-Upgrade 4 — Channel entity + Kitchen Calendar"),
    ("fm_upgrade_5_echo_ladder", "FM-Upgrade 5 — Echo permission ladder (0-4)"),
    ("fm_upgrade_6_glass_box_benchmarks", "FM-Upgrade 6 — Glass-box benchmark UX contract"),
    ("fm_upgrade_7_floor_route_surfaces", "FM-Upgrade 7 — Floor + Route surfaces"),
    # Mobile Build 4 flags
    ("mobile_build_4_hiring", "Mobile Build 4 — HR hiring on /m/staff/:token"),
    ("mobile_build_4_finance", "Mobile Build 4 — Finance roll-up tiles on /m/staff/:token"),
]


def forward(db, *, dry_run=False, batch_size=500, resume=True, logger=print):
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    seeded = 0
    for name, desc in FLAGS:
        existing = db.feature_flags.find_one({"name": name})
        if existing:
            # Keep existing rollout state; just update description if changed
            if existing.get("description") != desc and not dry_run:
                db.feature_flags.update_one({"name": name}, {"$set": {"description": desc, "updated_at": now}})
            continue
        doc = {
            "name": name, "description": desc,
            "enabled": False, "rollout_pct": 0,
            "allow_list": [], "deny_list": [],
            "created_at": now, "updated_at": now,
            "updated_by": "migration:seed_fm_flags",
        }
        if not dry_run:
            db.feature_flags.insert_one(doc)
        seeded += 1
        logger(f"  seeded flag: {name}")
    return {"counts": {"seeded": seeded, "total_targeted": len(FLAGS)}, "checkpoint": {}}


def rollback(db, *, dry_run=False, logger=print):
    names = [n for n, _ in FLAGS]
    if dry_run:
        logger(f"would delete flags: {names}")
        return {"counts": {"would_delete": len(names)}}
    r = db.feature_flags.delete_many({"name": {"$in": names}})
    return {"counts": {"deleted": r.deleted_count}}
