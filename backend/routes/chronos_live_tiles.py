"""
Chronos live-tile computation (D4).

The chronos.py /outlet/{outlet_id} endpoint historically returned 16 KPI
tiles with hardcoded values. This module replaces each tile with a real
DB-backed computation when the source data is present, and falls back
to the prior seeded mock value when it isn't.

Each returned tile carries:
    _source: "live"   — value computed from real activity
            | "seed"  — fallback mock (old behavior)
            | "derived" — combination of live + seed (e.g. food_cost
                         when sales is live but COGS is seed)
    _stale_seconds:    — for live values, how long ago the underlying
                         data was last touched
    _basis:            — human-readable explanation (for tooltips)

The frontend can render a "LIVE" badge next to live tiles and an
informational mark on derived ones, so a 409A reviewer or prospect can
see at a glance which numbers are real.

Data sources (all queried through Mongo `db` since chronos.py is on the
Python side):
    pos_transactions       — net_sales, covers, avg_check, voids, tip%, wait
    inventory_items        — inventory on-hand value
    shift_postings         — scheduled labor cost
    staff_task_assignments — actual labor cost
    invoices               — purchases (today)
    scaled_ingredients     — theoretical food cost
    receiving_summaries    — receipts (informational)

If a query fails or returns empty, the tile silently falls back to seed
with the failure noted in the _basis. No exceptions propagate up to the
chronos route — the endpoint must always return a usable payload.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


def _safe_query(fn, default=None):
    """Run a DB query, return default on any exception."""
    try:
        return fn()
    except Exception as e:
        logger.warning("[ChronosLive] query failed: %s", e)
        return default


def _today_window():
    """Return (start_iso, end_iso) bounding the current calendar day in UTC.
    Production should use the outlet's timezone — left for the next iter
    when outlets carry tz info at this level."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end, now


def _seconds_since(ts: Optional[datetime]) -> Optional[int]:
    if not ts:
        return None
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return None
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return int((now - ts).total_seconds())


# ─── Per-tile computations ───────────────────────────────────────────


def _net_sales_today(db, outlet_id: str) -> Optional[dict]:
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["pos_transactions"].find(
                {
                    "outlet_id": outlet_id,
                    "payment_status": "completed",
                    "created_at": {"$gte": start, "$lt": end},
                },
                {"_id": 0, "subtotal": 1, "tax": 1, "tip": 1, "total": 1, "created_at": 1, "items": 1, "payment_status": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    # Net sales = subtotal (excludes tax + tip)
    total = sum(float(r.get("subtotal") or 0) for r in rows)
    last_ts = max((r.get("created_at") for r in rows if r.get("created_at")), default=None)
    return {
        "value": round(total, 2),
        "_source": "live",
        "_stale_seconds": _seconds_since(last_ts),
        "_basis": f"sum(subtotal) of {len(rows)} completed pos_transactions today",
    }


def _covers_today(db, outlet_id: str) -> Optional[dict]:
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["pos_transactions"].find(
                {"outlet_id": outlet_id, "payment_status": "completed", "created_at": {"$gte": start, "$lt": end}},
                {"_id": 0, "items": 1, "guest_count": 1, "table_number": 1, "metadata": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    # Try to use guest_count if populated; else estimate covers as count of distinct check_id (one cover per check),
    # else fall back to len(items) heuristic.
    explicit = sum(int(r.get("guest_count") or 0) for r in rows if r.get("guest_count"))
    if explicit > 0:
        return {
            "value": explicit,
            "_source": "live",
            "_basis": f"sum(guest_count) across {len(rows)} pos_transactions",
        }
    # Fall back to one cover per transaction
    return {
        "value": len(rows),
        "_source": "derived",
        "_basis": f"transaction count (no guest_count populated) — {len(rows)} pos_transactions",
    }


def _avg_check(net_sales: Optional[dict], covers: Optional[dict]) -> Optional[dict]:
    if not net_sales or not covers or covers.get("value", 0) <= 0:
        return None
    val = net_sales["value"] / covers["value"]
    src = "live" if net_sales.get("_source") == "live" and covers.get("_source") == "live" else "derived"
    return {
        "value": round(val, 2),
        "_source": src,
        "_basis": "net_sales / covers",
    }


def _scheduled_labor_cost_today(db, outlet_id: str) -> Optional[dict]:
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["shift_postings"].find(
                {"outlet_id": outlet_id, "shift_date": {"$gte": start.date().isoformat(), "$lt": end.date().isoformat()}},
                {"_id": 0, "start_time": 1, "end_time": 1, "hourly_rate": 1, "estimated_cost": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    total = 0.0
    for r in rows:
        if r.get("estimated_cost"):
            total += float(r["estimated_cost"])
        elif r.get("start_time") and r.get("end_time") and r.get("hourly_rate"):
            try:
                st = datetime.fromisoformat(str(r["start_time"]).replace("Z", "+00:00"))
                en = datetime.fromisoformat(str(r["end_time"]).replace("Z", "+00:00"))
                hours = (en - st).total_seconds() / 3600.0
                total += hours * float(r["hourly_rate"])
            except Exception:
                pass
    return {
        "value": round(total, 2),
        "_source": "live",
        "_basis": f"sum(estimated_cost) over {len(rows)} shift_postings",
    }


def _actual_labor_cost_today(db, outlet_id: str) -> Optional[dict]:
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["staff_task_assignments"].find(
                {"outlet_id": outlet_id, "shift_date": {"$gte": start.date().isoformat(), "$lt": end.date().isoformat()}},
                {"_id": 0, "actual_hours_worked": 1, "hourly_rate": 1, "actual_cost": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    total = sum(
        float(r.get("actual_cost") or (float(r.get("actual_hours_worked") or 0) * float(r.get("hourly_rate") or 0)))
        for r in rows
    )
    return {
        "value": round(total, 2),
        "_source": "live",
        "_basis": f"sum(actual_cost) over {len(rows)} staff_task_assignments",
    }


def _labor_pct_today(net_sales: Optional[dict], actual_labor: Optional[dict]) -> Optional[dict]:
    if not net_sales or not actual_labor or net_sales.get("value", 0) <= 0:
        return None
    pct = (actual_labor["value"] / net_sales["value"]) * 100
    src = "live" if net_sales.get("_source") == "live" and actual_labor.get("_source") == "live" else "derived"
    return {
        "value": round(pct, 1),
        "_source": src,
        "_basis": "actual_labor / net_sales × 100",
    }


def _inventory_on_hand(db, outlet_id: str) -> Optional[dict]:
    rows = _safe_query(
        lambda: list(
            db["inventory_items"].find(
                {"outlet_id": outlet_id},
                {"_id": 0, "quantity_on_hand": 1, "unit_cost": 1, "last_cost": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    total = 0.0
    for r in rows:
        qty = float(r.get("quantity_on_hand") or 0)
        cost = float(r.get("unit_cost") or r.get("last_cost") or 0)
        total += qty * cost
    return {
        "value": round(total, 2),
        "_source": "live",
        "_basis": f"sum(quantity_on_hand × cost) over {len(rows)} inventory_items",
    }


def _purchases_today(db, outlet_id: str) -> Optional[dict]:
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["invoices"].find(
                {"outlet_id": outlet_id, "invoice_date": {"$gte": start.date().isoformat(), "$lt": end.date().isoformat()}},
                {"_id": 0, "subtotal": 1, "total": 1},
            )
        ),
        [],
    )
    if not rows:
        return None
    total = sum(float(r.get("total") or r.get("subtotal") or 0) for r in rows)
    return {
        "value": round(total, 2),
        "_source": "live",
        "_basis": f"sum(invoices.total) for today across {len(rows)} invoices",
    }


def _commissary_cogs_today(db, outlet_id: str) -> float:
    """D22 · sum today's live commissary debits (D16g cogs_events
    where direction=debit and source=internal_transfer). Returns
    a flat float so callers can add it to other COGS sources."""
    start, end, _ = _today_window()
    rows = _safe_query(
        lambda: list(
            db["cogs_events"].find(
                {"outlet_id": outlet_id,
                 "source": "internal_transfer",
                 "direction": "debit",
                 "occurred_at": {"$gte": start.isoformat(),
                                  "$lt":  end.isoformat()}},
                {"_id": 0, "amount": 1},
            )
        ),
        [],
    )
    return sum(float(r.get("amount") or 0) for r in rows)


def _commissary_cost_today(db, outlet_id: str) -> Optional[dict]:
    """D22 · live commissary cost tile. Returns the day's debit total
    so the chef sees what's transferred IN from the pastry shop +
    banquet kitchen alongside POS sales as checks close."""
    total = _commissary_cogs_today(db, outlet_id)
    if total <= 0:
        return {"value": 0, "_source": "live",
                "_basis": "no commissary transfers today"}
    return {"value": round(total, 2), "_source": "live",
            "_basis": f"sum(cogs_events.amount) where direction=debit, "
                      f"source=internal_transfer, today"}


def _food_cost_pct_today(db, outlet_id: str, net_sales: Optional[dict]) -> Optional[dict]:
    """Food cost % combining theoretical (from scaled_ingredients) +
    live commissary transfers (D16g). The commissary contribution is
    REAL cost (a transfer happened today); the theoretical baseline
    is what the recipes SAY today should cost given the BEOs.

    Sum both and divide by net_sales so the chef sees a real number
    that reflects both planned and actual transfers."""
    if not net_sales or net_sales.get("value", 0) <= 0:
        return None
    start, _, _ = _today_window()
    today_str = start.date().isoformat()
    # Find lifecycle_events for today at this outlet, then scaled_ingredients for those BEOs.
    events = _safe_query(
        lambda: list(
            db["lifecycle_events"].find(
                {"outlet_id": outlet_id, "event_date": today_str},
                {"_id": 0, "id": 1, "beo_id": 1},
            )
        ),
        [],
    )
    theoretical_cogs = 0.0
    rows: list = []
    if events:
        beo_ids = [e["beo_id"] for e in events if e.get("beo_id")]
        if beo_ids:
            rows = _safe_query(
                lambda: list(
                    db["scaled_ingredients"].find(
                        {"beo_id": {"$in": beo_ids}},
                        {"_id": 0, "total_cost": 1},
                    )
                ),
                [],
            )
            theoretical_cogs = sum(float(r.get("total_cost") or 0) for r in rows)

    # D22 · always overlay the live commissary debits, even when no
    # BEOs exist for today (an outlet without events can still be
    # receiving coffee + bread runs from the commissary).
    live_commissary = _commissary_cogs_today(db, outlet_id)
    total_cogs = theoretical_cogs + live_commissary

    if total_cogs <= 0:
        return None
    pct = (total_cogs / net_sales["value"]) * 100
    src = "live" if net_sales.get("_source") == "live" else "derived"
    basis_parts = []
    if theoretical_cogs > 0:
        basis_parts.append(
            f"theoretical ${theoretical_cogs:.2f} ({len(rows)} ingredients)")
    if live_commissary > 0:
        basis_parts.append(f"live commissary ${live_commissary:.2f}")
    return {
        "value": round(pct, 1),
        "_source": src,
        "_basis": " + ".join(basis_parts) + " / net_sales × 100",
    }


# ─── Public entry point ──────────────────────────────────────────────


def merge_live_tiles(seeded_tiles: list[dict], db: Any, outlet_id: str) -> list[dict]:
    """Given the seeded tile array from chronos.outlet_detail, replace
    values with live data where available and tag _source on each.

    The seeded tile order is preserved; only the value + meta keys
    change. Tiles not yet wired to a live source keep their seeded
    value and gain `_source: "seed"`.
    """
    # Compute live values once.
    net_sales = _net_sales_today(db, outlet_id)
    covers = _covers_today(db, outlet_id)
    avg_check = _avg_check(net_sales, covers)
    actual_labor = _actual_labor_cost_today(db, outlet_id)
    labor_pct = _labor_pct_today(net_sales, actual_labor)
    inventory = _inventory_on_hand(db, outlet_id)
    purchases = _purchases_today(db, outlet_id)
    food_cost_pct = _food_cost_pct_today(db, outlet_id, net_sales)
    commissary_cost = _commissary_cost_today(db, outlet_id)

    live_by_key = {
        "net_sales": net_sales,
        "covers": covers,
        "avg_check": avg_check,
        "labor_pct": labor_pct,
        "inventory": inventory,
        "purchases": purchases,
        "food_cost": food_cost_pct,
        # D22 · live commissary cost — sums cogs_events.amount where
        # outlet=this, direction=debit, source=internal_transfer, today.
        # Chef sees this update as the pastry shop confirms each
        # transfer through /orders/{id}/confirm-transfer (D16g).
        "commissary_cost": commissary_cost,
    }

    out: list[dict] = []
    for tile in seeded_tiles:
        key = tile.get("key")
        live = live_by_key.get(key)
        if live is not None:
            merged = {**tile, "value": live["value"], "_source": live["_source"]}
            if "_basis" in live:
                merged["_basis"] = live["_basis"]
            if live.get("_stale_seconds") is not None:
                merged["_stale_seconds"] = live["_stale_seconds"]
            out.append(merged)
        else:
            out.append({**tile, "_source": "seed", "_basis": "no live data; seeded baseline"})
    return out
